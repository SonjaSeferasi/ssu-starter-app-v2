import { boardInput } from '../../../../lib/profile-board';
import { AccountError, accountClient, accountResponse, jsonBody, verifiedUser } from '../../../../lib/socialu-account';
import { applyCornerArtwork, cornerArtworkPatch } from '../../../../lib/profile-corner-artwork';
import { countryInput } from '../../../../lib/profile-countries';
import { coverPhotoType } from '../../../../lib/profile-cover-upload';
import { resolveMediaUrl } from '../../../../lib/media';
import { DEFAULT_LOOK, hometownInput, helloStyle, helloText, profileLookInput } from '../../../../lib/profile-space';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
async function call(args: Record<string, unknown>) {
  const { data, error } = await accountClient().rpc('socialu_profile_space', args);
  if (error) {
    if (['PGRST202','42883'].includes(error.code)) return null;
    if (error.code === 'P0002') throw new AccountError('This profile or note is not available.',404);
    if (error.code === '42501') throw new AccountError('You can only change your own space or notes.',403);
    if (error.code === '22023') throw new AccountError(error.message,400);
    if (error.code === 'P0001') throw new AccountError('Please wait a minute before leaving another note.',429);
    throw new AccountError('Unable to load this space. Please try again.',503);
  }
  return data;
}
function ready(data: unknown) {
  if (data === null) throw new AccountError('Profile spaces are in preview. Saving and notes aren’t available yet.',503,'SPACE_PREVIEW');
  return Response.json({ ...data as object, available: true }, { headers });
}
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const data = await call({ p_auth_id: user.id, p_action:'read',p_username:new URL(request.url).searchParams.get('username')?.trim() || null });
    const value = data || { look:DEFAULT_LOOK,notes:[] };
    const key = value.look?.coverKey;
    const validKey = typeof key === 'string' && /^profile-covers\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(key);
    const coverUrl = validKey ? await resolveMediaUrl(accountClient(), key) : null;
    return Response.json({ ...value, ...(validKey ? { coverUrl } : {}), available:data !== null },{ headers });
  } catch (error) { return accountResponse(error); }
}
export async function PUT(request: Request) {
  let uploadedKey: string | null = null;
  try {
    const user = await verifiedUser(request);
    let input: unknown; let photo: File | null = null;
    if (request.headers.get('Content-Type')?.includes('multipart/form-data')) {
      let form: FormData;
      try { form = await request.formData(); input = JSON.parse(String(form.get('look'))); }
      catch { throw new AccountError('Choose a valid profile look and photo.',400); }
      const file = form.get('coverPhoto');
      if (!(file instanceof File)) throw new AccountError('Choose a cover photo.',400);
      photo = file;
    } else { input = (await jsonBody(request)).look; }
    let look; try { look = profileLookInput(input); } catch (error) { throw new AccountError((error as Error).message,400); }
    if (look.coverKey && !look.coverKey.startsWith(`profile-covers/${user.id}/`)) throw new AccountError('Choose your own cover photo.',403);
    // Check profile access before uploading; only the verified owner can save.
    if (photo) {
      const current = await call({p_auth_id:user.id,p_action:'read'});
      if (current === null) return ready(null);
      const { type, extension } = await coverPhotoType(photo);
      const key = `profile-covers/${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error } = await accountClient().storage.from('media').upload(key,photo,{contentType:type,upsert:false});
      if (error) throw new AccountError('Your cover photo could not be uploaded. Please try again.',502);
      uploadedKey = key; look = {...look,coverKey:key};
    }
    const response = ready(await call({ p_auth_id:user.id,p_action:'save_look',p_look:look }));
    uploadedKey = null;
    return response;
  } catch (error) {
    if (uploadedKey) await accountClient().storage.from('media').remove([uploadedKey]).catch(()=>undefined);
    return accountResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request); const body = await jsonBody(request);
    let text,style; try { text = helloText(body.text); style = helloStyle(body.color,body.doodle); } catch (error) { throw new AccountError((error as Error).message,400); }
    if (typeof body.username !== 'string' || !body.username.trim() || body.username.length > 50) throw new AccountError('Choose a profile.',400);
    return ready(await call({ p_auth_id:user.id,p_action:'add_note',p_username:body.username.trim(),p_text:text,p_color:style.color,p_doodle:style.doodle }));
  } catch (error) { return accountResponse(error); }
}
export async function DELETE(request: Request) {
  try {
    const user = await verifiedUser(request); const body = await jsonBody(request);
    if (!Number.isSafeInteger(body.noteId) || (body.noteId as number) < 1) throw new AccountError('Choose a valid note.',400);
    if (typeof body.username !== 'string' || !body.username.trim() || body.username.length > 50) throw new AccountError('Choose a profile.',400);
    return ready(await call({ p_auth_id:user.id,p_action:'remove_note',p_username:body.username.trim(),p_note_id:body.noteId }));
  } catch (error) { return accountResponse(error); }
}

// Apply a small owner-only profile update while preserving the latest decorations.
export async function PATCH(request:Request) {
  try {
    const user=await verifiedUser(request);
    const body=await jsonBody(request),isHometown=body.field==='hometown';
    if(body.field==='board'){
      let board;try{board=boardInput(body.value);}catch(error){throw new AccountError((error as Error).message,400);}
      const current=await call({p_auth_id:user.id,p_action:'read'});
      if(current===null)return ready(null);
      const look=profileLookInput({...current.look,board});
      if(await call({p_auth_id:user.id,p_action:'save_look',p_look:look})===null)return ready(null);
      const confirmed=await call({p_auth_id:user.id,p_action:'read'});
      if(JSON.stringify(confirmed?.look?.board?boardInput(confirmed.look.board):null)!==JSON.stringify(board))throw new AccountError('Your board could not be confirmed. Please try again.',503);
      return ready(confirmed);
    }
    let patch;let hometown:string|undefined;let homeCountry:string|undefined;
    try{if(isHometown){hometown=hometownInput(body.value);if(body.countryCode!==undefined)homeCountry=countryInput(body.countryCode);}else patch=cornerArtworkPatch(body);}catch(error){throw new AccountError((error as Error).message,400);}
    const current=await call({p_auth_id:user.id,p_action:'read'});
    if(current===null)return ready(null);
    const look=profileLookInput(isHometown?{...current.look,hometown,...(homeCountry!==undefined?{homeCountry}:{})}:applyCornerArtwork(current.look,patch!));
    const saved=await call({p_auth_id:user.id,p_action:'save_look',p_look:look});
    if(saved===null)return ready(null);
    const confirmed=await call({p_auth_id:user.id,p_action:'read'});
    const actual=confirmed?.look?.cornerArtwork;
    const mismatch=isHometown?((confirmed?.look?.hometown??'')!==hometown||(homeCountry!==undefined&&(confirmed?.look?.homeCountry??'')!==homeCountry)):patch!.card==='poll'?JSON.stringify(actual?.poll)!==JSON.stringify(patch!.stickers):actual?.plan!==patch!.sticker;
    if(mismatch)throw new AccountError('Your profile changes couldn’t be confirmed. Please try again.',503);
    return ready(confirmed);
  }catch(error){return accountResponse(error);}
}
