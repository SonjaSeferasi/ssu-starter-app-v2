import { verifiedUser, accountResponse, accountClient, jsonBody, textField, AccountError } from '../../../../../lib/socialu-account';
import { feedRpc } from '../../../../../lib/feed';
import { shapeComments, type RawCommentRow } from '../../../../../lib/comments';

// SRS-310.1 -- list the comments on a post the caller is authorized to view.
// Visibility (Public vs Friends Only) is enforced in socialu_list_comments
// (supabase/migrations/20261018000100_post_comments.sql), never trusted from
// the client.
export async function GET(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const user = await verifiedUser(request);
    const { postId: postIdParam } = await params;
    const postId = Number(postIdParam);
    if (!Number.isInteger(postId)) throw new AccountError('Invalid post id.', 400);

    const rows = await feedRpc<RawCommentRow[]>('socialu_list_comments', { p_auth_id: user.id, p_post_id: postId });
    const comments = await shapeComments(accountClient(), rows);
    return Response.json({ comments }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}

// SRS-310.1/310.2/310.3 -- submit a comment on a post the caller is
// authorized to view. author_id always comes from the verified session
// (never a client-supplied value); ownership/visibility enforcement and the
// actual insert live in socialu_create_comment.
//
// Replying to Comments (separate feature, not SRS-310): an optional
// parentCommentId in the body targets an existing comment to reply to;
// socialu_create_comment flattens it to one level of nesting automatically
// (see 20261021000100_comment_replies.sql), so this route doesn't need to
// know or care whether the client clicked Reply on a top-level comment or
// on another reply.
export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const user = await verifiedUser(request);
    const { postId: postIdParam } = await params;
    const postId = Number(postIdParam);
    if (!Number.isInteger(postId)) throw new AccountError('Invalid post id.', 400);

    const body = await jsonBody(request);
    const parentCommentId = Number(body.parentCommentId);
    const row = await feedRpc<RawCommentRow>('socialu_create_comment', {
      p_auth_id: user.id,
      p_post_id: postId,
      p_text: textField(body.textContent),
      p_parent_comment_id: Number.isInteger(parentCommentId) ? parentCommentId : null,
    });

    const [comment] = await shapeComments(accountClient(), [row]);
    return Response.json({ comment }, { status: 201 });
  } catch (error) {
    return accountResponse(error);
  }
}
