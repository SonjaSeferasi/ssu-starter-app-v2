import { verifiedUser, accountResponse, accountClient } from '../../../../../lib/socialu-account';
import { feedRpc } from '../../../../../lib/feed';
import { shapeFeedPosts, type RawFeedRow } from '../../../../../lib/posts';

// SRS-301.1/301.2/301.3 — Campus Feed: every published Public post, regardless
// of friendship. See supabase/migrations/20261008000200_feed_functions.sql.
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const rows = await feedRpc<RawFeedRow[]>('socialu_campus_feed', { p_auth_id: user.id });
    const posts = await shapeFeedPosts(accountClient(), rows);
    return Response.json({ posts }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}
