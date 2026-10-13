import { AccountError, accountClient, accountResponse, verifiedUser } from '../../../../lib/socialu-account';
import { profileRpc } from '../../../../lib/profile';
import { shapeFeedPosts, type RawFeedRow } from '../../../../lib/posts';

export const dynamic = 'force-dynamic';

// SRS-112, SRS-113.11-113.14: Posts or Tagged content the viewer is allowed to see.
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const params = new URL(request.url).searchParams;
    const category = params.get('category') ?? 'posts';
    if (category !== 'posts' && category !== 'tagged') throw new AccountError('Choose Posts or Tagged.', 400);
    const rows = await profileRpc<RawFeedRow[]>('socialu_profile_content', {
      p_auth_id: user.id, p_username: params.get('username')?.trim() || null, p_category: category,
    });
    return Response.json({ posts: await shapeFeedPosts(accountClient(), rows) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
