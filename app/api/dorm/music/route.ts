import { randomUUID } from 'node:crypto';
import { AccountError, accountClient, accountResponse, jsonBody, verifiedUser } from '../../../../lib/socialu-account';
import { uuid } from '../../../../lib/dormspace-multiplayer';
import { isMp3, MAX_MUSIC_BYTES, MUSIC_BUCKET } from '../../../../lib/dormspace-music';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
type Scope = { authId: string; session: string; connection: string; owner: string };
type State = { isOwner: boolean; oldKey: string | null; track: { storageKey: string; title: string; version: string } | null };

async function scope(request: Request): Promise<Scope> {
  const user = await verifiedUser(request);
  const query = new URL(request.url).searchParams;
  const owner = query.get('owner'), connection = query.get('connection');
  let session: unknown;
  try { session = JSON.parse(Buffer.from(request.headers.get('Authorization')!.slice(7).trim().split('.')[1], 'base64url').toString('utf8')).session_id; }
  catch { throw new AccountError('Please sign in again.', 401); }
  if (!uuid(session) || !uuid(connection) || !owner || owner.length > 40) throw new AccountError('Open a dorm room before using music.', 400);
  return { authId: user.id, session, connection, owner };
}
async function operate(s: Scope, action: string, payload: object = {}): Promise<State> {
  const { data, error } = await accountClient().rpc('socialu_dorm_music', {
    p_auth_id: s.authId, p_session: s.session, p_connection: s.connection, p_owner: s.owner, p_action: action, p_payload: payload,
  });
  if (error) throw new AccountError(error.code === '42501' ? 'This room’s music is not available to you.' : 'Dorm music could not be saved. Please retry.', error.code === '42501' ? 403 : 503);
  if (!data || typeof data.isOwner !== 'boolean') throw new AccountError('Dorm music is temporarily unavailable.', 503);
  return data;
}
async function response(state: State) {
  let track = null;
  if (state.track) {
    const { data, error } = await accountClient().storage.from(MUSIC_BUCKET).createSignedUrl(state.track.storageKey, 30);
    if (error || !data) throw new AccountError('The soundtrack could not load. Please retry.', 503);
    track = { title: state.track.title, version: state.track.version, url: data.signedUrl };
  }
  return Response.json({ isOwner: state.isOwner, track }, { headers });
}
export async function GET(request: Request) {
  try { return await response(await operate(await scope(request), 'read')); }
  catch (error) { return accountResponse(error); }
}
export async function POST(request: Request) {
  try {
    const s = await scope(request), body = await jsonBody(request);
    const current = await operate(s, 'read');
    if (!current.isOwner) throw new AccountError('Only the room owner can change its soundtrack.', 403);
    const storage = accountClient().storage.from(MUSIC_BUCKET);
    if (body.action === 'upload') {
      if (!Number.isInteger(body.size) || Number(body.size) < 32 || Number(body.size) > MAX_MUSIC_BYTES)
        throw new AccountError('Choose an MP3 up to 20 MB.', 400);
      const storageKey = `${s.authId}/${randomUUID()}.mp3`;
      const { data, error } = await storage.createSignedUploadUrl(storageKey);
      if (error || !data) throw new AccountError('The upload could not start. Please retry.', 503);
      return Response.json({ storageKey, uploadUrl: data.signedUrl }, { headers });
    }
    if (body.action === 'save') {
      const key = body.storageKey;
      if (typeof key !== 'string' || !key.startsWith(`${s.authId}/`) || !uuid(key.slice(s.authId.length + 1, -4)) || !key.endsWith('.mp3') ||
          typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 120)
        throw new AccountError('Choose a valid MP3 soundtrack.', 400);
      const info = await storage.info(key);
      if (info.error || !info.data || typeof info.data.size !== 'number' || info.data.size > MAX_MUSIC_BYTES || info.data.size < 32)
        throw new AccountError('The MP3 upload is missing or too large. Please retry.', 400);
      const file = await storage.download(key);
      if (file.error || !file.data) throw new AccountError('The upload could not be checked. Please retry.', 503);
      if (!isMp3(new Uint8Array(await file.data.arrayBuffer()))) {
        await storage.remove([key]);
        throw new AccountError('This file is not a supported MP3. Your previous soundtrack is unchanged.', 400);
      }
      const state = await operate(s, 'save', { storageKey: key, title: body.title.trim() });
      if (state.oldKey && state.oldKey !== key) await storage.remove([state.oldKey]);
      return await response(state);
    }
    if (body.action === 'remove') {
      const state = await operate(s, 'remove');
      if (state.oldKey) await storage.remove([state.oldKey]);
      return await response(state);
    }
    throw new AccountError('Choose a music action.', 400);
  } catch (error) { return accountResponse(error); }
}
