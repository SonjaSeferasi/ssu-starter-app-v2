import { AccountError, accountClient, accountResponse, verifiedUser } from '../../../../lib/socialu-account';
import { profileRpc } from '../../../../lib/profile';
import { resolveMediaUrl } from '../../../../lib/media';

export const dynamic = 'force-dynamic';

type RawFriend = { username: string; name: string; photo_key: string | null; is_me: boolean; is_friend: boolean; friend_request: 'sent' | 'received' | null };
const LISTS = ['friends', 'followers', 'following'];

// SRS-111.4, SRS-113.9: a student's friends, followers, or following (?list=, default friends).
// Without ?username= it returns the caller's own lists.
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const params = new URL(request.url).searchParams;
    const username = params.get('username')?.trim() || null;
    const list = params.get('list') ?? 'friends';
    if (!LISTS.includes(list)) throw new AccountError('Choose friends, followers, or following.', 400);
    const rows = await profileRpc<RawFriend[]>('socialu_profile_people', { p_auth_id: user.id, p_username: username, p_list: list });
    const friends = await Promise.all(rows.map(async ({ photo_key, ...friend }) => ({
      ...friend, photo_url: await resolveMediaUrl(accountClient(), photo_key),
    })));
    return Response.json({ friends }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
