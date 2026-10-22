import { accountClient, accountResponse, verifiedUser } from '../../../../lib/socialu-account';
import { profileRpc } from '../../../../lib/profile';
import { resolveMediaUrl } from '../../../../lib/media';

export const dynamic = 'force-dynamic';

type RawFriend = { username: string; name: string; photo_key: string | null; is_me: boolean; is_friend: boolean; friend_request: 'sent' | 'received' | null };

// SRS-111.4, SRS-113.9: a student's current friends. Without ?username= it returns the caller's own friends.
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const username = new URL(request.url).searchParams.get('username')?.trim() || null;
    const rows = await profileRpc<RawFriend[]>('socialu_profile_friends', { p_auth_id: user.id, p_username: username });
    const friends = await Promise.all(rows.map(async ({ photo_key, ...friend }) => ({
      ...friend, photo_url: await resolveMediaUrl(accountClient(), photo_key),
    })));
    return Response.json({ friends }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
