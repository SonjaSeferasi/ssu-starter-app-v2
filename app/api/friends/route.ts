import { accountResponse, jsonBody, textField, verifiedUser, AccountError } from '../../../lib/socialu-account';
import { profileRpc, shapeProfile, type RawProfile } from '../../../lib/profile';

export const dynamic = 'force-dynamic';

const ACTIONS = ['send', 'cancel', 'accept', 'decline', 'unfriend'];

// SRS-114, SRS-116: friend request actions on another student's profile. Returns their refreshed profile.
export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request);
    const body = await jsonBody(request);
    const username = textField(body.username);
    const action = textField(body.action);
    if (!username || !ACTIONS.includes(action)) throw new AccountError('Choose a student and a friend action.', 400);
    const raw = await profileRpc<RawProfile>('socialu_friend_action', { p_auth_id: user.id, p_username: username, p_action: action });
    return Response.json({ profile: await shapeProfile(raw) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
