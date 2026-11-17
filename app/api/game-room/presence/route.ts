import { AccountError, accountClient, accountResponse, jsonBody, verifiedUser } from '../../../../lib/socialu-account';
import { presenceLabels, validPresence } from '../../../../lib/game-presence';
export const dynamic = 'force-dynamic';
async function perform(request: Request, action: string, args: Record<string, unknown> = {}) {
  const user = await verifiedUser(request);
  const { data, error } = await accountClient().rpc('socialu_game_presence', { p_auth_id: user.id, p_action: action, ...args });
  if (error) throw new AccountError(error.code === 'PGRST202' ? 'Friends playing now needs its database update. Please try again after the update.' : 'Presence could not be loaded or saved. Please try again.', error.code === '42501' ? 403 : error.code === '22023' ? 400 : 503);
  if (typeof data?.visible !== 'boolean' || (action === 'read' && !validPresence(data))) throw new AccountError('Presence is temporarily unavailable.', 503);
  return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
export async function GET(request: Request) {
  try { return await perform(request, 'read'); } catch (e) { return accountResponse(e); }
}
export async function PUT(request: Request) {
  try {
    const body = await jsonBody(request);
    if (typeof body.visible !== 'boolean') throw new AccountError('Choose whether to show your presence.', 400);
    return await perform(request, 'visibility', { p_visible: body.visible });
  } catch (e) { return accountResponse(e); }
}
async function session(request: Request, action: 'heartbeat' | 'leave') {
  try {
    const body = await jsonBody(request);
    if (typeof body.sessionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.sessionId)) throw new AccountError('Invalid presence session.', 400);
    if (action === 'heartbeat' && (typeof body.location !== 'string' || !Object.prototype.hasOwnProperty.call(presenceLabels, body.location))) throw new AccountError('Choose a supported game.', 400);
    return await perform(request, action, { p_session: body.sessionId, ...(action === 'heartbeat' ? { p_location: body.location } : {}) });
  } catch (e) { return accountResponse(e); }
}
export const POST = (request: Request) => session(request, 'heartbeat');
export const DELETE = (request: Request) => session(request, 'leave');
