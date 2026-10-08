import { verifiedUser, accountResponse, accountClient } from '../../../../../lib/socialu-account';
import { feedRpc } from '../../../../../lib/feed';
import { shapeFeedPosts, type RawFeedRow } from '../../../../../lib/posts';

// SRS-302.1/302.2/302.3 — Friends Feed: Friends Only posts from the current
// student's accepted friends. See supabase/migrations/20261008000200_feed_functions.sql.
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const rows = await feedRpc<RawFeedRow[]>('socialu_friends_feed', { p_auth_id: user.id });
    const posts = await shapeFeedPosts(accountClient(), rows);
    return Response.json({ posts }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}
