import { verifiedUser, accountResponse, accountClient } from '../../../../lib/socialu-account';
import { feedRpc } from '../../../../lib/feed';
import { shapeTrendingPosts, type RawTrendingRow } from '../../../../lib/trending';
export const dynamic = 'force-dynamic';

// SRS-405.1-405.8: Campus Feed posts ranked by likes in the last 168 hours, for the signed-in student.
// Recalculated on every request (SRS-405.8), never cached; see 20261113150000_trending_posts.sql.
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const rows = await feedRpc<RawTrendingRow[]>('socialu_trending_posts', { p_auth_id: user.id, p_limit: 10 });
    const posts = await shapeTrendingPosts(accountClient(), rows ?? []);
    return Response.json({ posts }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return accountResponse(error);
  }
}
