import { AccountError, accountClient, accountResponse, jsonBody, verifiedUser } from '../../../../lib/socialu-account';
import { coverPhotoType } from '../../../../lib/profile-cover-upload';
import { resolveMediaUrl } from '../../../../lib/media';
import { memoryInput } from '../../../../lib/profile-memories';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
type StoredMemory = { id: number; key: string; caption: string; doodle: string; createdAt: string };

async function call(args: Record<string, unknown>) {
  const { data, error } = await accountClient().rpc('socialu_profile_memories', args);
  if (error) {
    if (['PGRST202','42883'].includes(error.code)) return null;
    if (error.code === 'P0002') throw new AccountError('This profile or memory is not available.',404);
    if (error.code === '42501') throw new AccountError('You can only change your own memories.',403);
    if (['22023','P0001'].includes(error.code)) throw new AccountError(error.message,400);
    throw new AccountError('Pinned memories couldn’t load. Please try again.',503);
  }
  return data as { memories: StoredMemory[]; removedKey: string | null };
}
// Storage keys stay on the server; viewers get short-lived signed photo links.
async function respond(data: Awaited<ReturnType<typeof call>>) {
  if (data === null) return Response.json({ memories: [], available: false }, { headers });
  const memories = await Promise.all(data.memories.map(async ({ key, ...memory }) => ({ ...memory, url: await resolveMediaUrl(accountClient(), key) })));
  return Response.json({ memories, available: true }, { headers });
}
function preview(): never { throw new AccountError('Pinned memories are in preview. Saving isn’t available yet.',503,'MEMORIES_PREVIEW'); }

export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const username = new URL(request.url).searchParams.get('username')?.trim() || null;
    if (username && username.length > 50) throw new AccountError('Choose a valid profile.',400);
    return await respond(await call({ p_auth_id:user.id,p_action:'read',p_username:username }));
  } catch (error) { return accountResponse(error); }
}
export async function POST(request: Request) {
  let uploadedKey: string | null = null;
  try {
    const user = await verifiedUser(request);
    let form: FormData;
    try { form = await request.formData(); } catch { throw new AccountError('Choose a photo to pin.',400); }
    const photo = form.get('photo');
    if (!(photo instanceof File)) throw new AccountError('Choose a photo to pin.',400);
    let values; try { values = memoryInput(form.get('caption') ?? '', form.get('doodle') ?? 'none'); } catch (error) { throw new AccountError((error as Error).message,400); }
    const { type, extension } = await coverPhotoType(photo,'photo');
    // Check the profile and the six-memory limit before uploading anything.
    const current = await call({ p_auth_id:user.id,p_action:'read' });
    if (current === null) preview();
    if (current.memories.length >= 6) throw new AccountError('You can pin up to six memories. Remove one first.',400);
    const key = `profile-memories/${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error } = await accountClient().storage.from('media').upload(key,photo,{contentType:type,upsert:false});
    if (error) throw new AccountError('Your photo could not be uploaded. Please try again.',502);
    uploadedKey = key;
    const saved = await call({ p_auth_id:user.id,p_action:'add',p_storage_key:key,p_caption:values.caption,p_doodle:values.doodle });
    if (saved === null) preview();
    uploadedKey = null;
    return await respond(saved);
  } catch (error) {
    if (uploadedKey) await accountClient().storage.from('media').remove([uploadedKey]).catch(()=>undefined);
    return accountResponse(error);
  }
}
export async function DELETE(request: Request) {
  try {
    const user = await verifiedUser(request); const body = await jsonBody(request);
    if (!Number.isSafeInteger(body.memoryId) || (body.memoryId as number) < 1) throw new AccountError('Choose a valid memory.',400);
    const data = await call({ p_auth_id:user.id,p_action:'remove',p_memory_id:body.memoryId });
    if (data === null) preview();
    if (data.removedKey) await accountClient().storage.from('media').remove([data.removedKey]).catch(()=>undefined);
    return await respond(data);
  } catch (error) { return accountResponse(error); }
}
