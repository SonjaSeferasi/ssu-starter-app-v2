import { verifiedUser, accountResponse, accountClient, jsonBody, textField, AccountError } from '../../../../lib/socialu-account';
import { feedRpc } from '../../../../lib/feed';
import { shapeFeedPosts, type RawFeedRow } from '../../../../lib/posts';

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
