import { AccountError, accountClient, accountResponse, jsonBody, verifiedUser } from '../../../../lib/socialu-account';
import { cornerInput, EMPTY_CORNER, VIBE_ICONS } from '../../../../lib/profile-corner';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
async function call(args: Record<string, unknown>) {
  const { data, error } = await accountClient().rpc('socialu_profile_corner', args);
  if (error) {
    if (['PGRST202', '42883'].includes(error.code)) return null;
    if (error.code === 'P0002') throw new AccountError('This profile or card is no longer available. Refresh and try again.', 404);
    if (error.code === '42501') throw new AccountError('You can only edit your own cards.', 403);
    if (['22023', '22007', '22008'].includes(error.code)) throw new AccountError(error.message, 400);
    if (error.code === 'P0001') throw new AccountError(error.message, 409);
    throw new AccountError('Your campus cards couldn’t load. Please try again.', 503);
  }
  return data;
}
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const username = new URL(request.url).searchParams.get('username')?.trim() || null;
    if (username && username.length > 50) throw new AccountError('Choose a valid profile.', 400);
    const data = await call({ p_auth_id: user.id, p_action: 'read', p_username: username });
    return Response.json({ corner: data ?? EMPTY_CORNER, available: data !== null, ...(data?.stickerVibes ? {vibeIcons:VIBE_ICONS} : {}) }, { headers });
  } catch (error) { return accountResponse(error); }
}
export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request);
    let input;
    try { input = cornerInput(await jsonBody(request)); }
    catch (error) { throw new AccountError((error as Error).message, 400); }
    const data = await call({ p_auth_id: user.id, p_action: input.action, p_username: input.username, p_payload: input.payload });
    if (data === null) throw new AccountError('Campus cards are in preview. Saving isn’t available yet.', 503, 'CORNER_PREVIEW');
    return Response.json({ corner: data, available: true, ...(data.stickerVibes ? {vibeIcons:VIBE_ICONS} : {}) }, { headers });
  } catch (error) { return accountResponse(error); }
}
