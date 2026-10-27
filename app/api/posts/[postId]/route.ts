import { verifiedUser, accountResponse, accountClient, jsonBody, textField, AccountError } from '../../../../lib/socialu-account';
import { feedRpc } from '../../../../lib/feed';
import { shapeFeedPosts, type RawFeedRow } from '../../../../lib/posts';

// Share (additional functionality, not SRS-numbered): fetch a single post
// by id for a direct link (/posts/:id). socialu_get_post
// (20261026000500_share_post.sql) enforces the exact same authorization
// as the feeds -- public to anyone, friends_only to the author/a current
// friend, never a blocked pair -- and collapses "doesn't exist", "deleted",
// and "not authorized" into one identical 404, so this route can never be
// used to probe which post ids exist.
export async function GET(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const user = await verifiedUser(request);
    const { postId: postIdParam } = await params;
    const postId = Number(postIdParam);
    if (!Number.isInteger(postId)) throw new AccountError('Invalid post id.', 400);

    const row = await feedRpc<RawFeedRow>('socialu_get_post', { p_auth_id: user.id, p_post_id: postId });
    const [post] = await shapeFeedPosts(accountClient(), [row]);
    return Response.json({ post }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}

// SRS-306.1/306.2/306.4/306.5 — edit the text of a post the caller authored.
// Ownership and the Edited timestamp are enforced in socialu_update_post
// (supabase/migrations/20261015000100_edit_post.sql), never trusted from the client.
export async function PATCH(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const user = await verifiedUser(request);
    const { postId: postIdParam } = await params;
    const postId = Number(postIdParam);
    if (!Number.isInteger(postId)) throw new AccountError('Invalid post id.', 400);

    const body = await jsonBody(request);
    const row = await feedRpc<RawFeedRow>('socialu_update_post', {
      p_auth_id: user.id,
      p_post_id: postId,
      p_text: textField(body.textContent),
    });

    const [post] = await shapeFeedPosts(accountClient(), [row]);
    return Response.json({ post }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}

// SRS-307.1/307.3/307.5 — delete a post the caller authored. Ownership and
// the actual row removal (with its cascades) live in socialu_delete_post
// (supabase/migrations/20261015120100_delete_post.sql); this just also
// clears any now-orphaned photo files from Storage, since SQL can't do that.
export async function DELETE(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const user = await verifiedUser(request);
    const { postId: postIdParam } = await params;
    const postId = Number(postIdParam);
    if (!Number.isInteger(postId)) throw new AccountError('Invalid post id.', 400);

    const freedKeys = await feedRpc<string[]>('socialu_delete_post', { p_auth_id: user.id, p_post_id: postId });
    if (freedKeys.length > 0) {
      await accountClient().storage.from('media').remove(freedKeys);
    }

    return Response.json({ deleted: true }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}
