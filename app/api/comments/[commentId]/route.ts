import { verifiedUser, accountResponse, accountClient, jsonBody, textField, AccountError } from '../../../../lib/socialu-account';
import { feedRpc } from '../../../../lib/feed';
import { shapeComments, type RawCommentRow } from '../../../../lib/comments';

// Not an SRS-310 requirement (no numbered sub-requirement covers editing a
// comment -- see the implementation report), built for parity with SRS-306's
// Edit Post. Ownership and visibility re-checks live in socialu_update_comment
// (supabase/migrations/20261018000100_post_comments.sql).
export async function PATCH(request: Request, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const user = await verifiedUser(request);
    const { commentId: commentIdParam } = await params;
    const commentId = Number(commentIdParam);
    if (!Number.isInteger(commentId)) throw new AccountError('Invalid comment id.', 400);

    const body = await jsonBody(request);
    const row = await feedRpc<RawCommentRow>('socialu_update_comment', {
      p_auth_id: user.id,
      p_comment_id: commentId,
      p_text: textField(body.textContent),
    });

    const [comment] = await shapeComments(accountClient(), [row]);
    return Response.json({ comment }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}

// Not an SRS-310 requirement either (see PATCH's comment above), built for
// parity with SRS-307's Delete Post. Deletes only the caller's own comment;
// ownership/visibility enforcement lives in socialu_delete_comment.
export async function DELETE(request: Request, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const user = await verifiedUser(request);
    const { commentId: commentIdParam } = await params;
    const commentId = Number(commentIdParam);
    if (!Number.isInteger(commentId)) throw new AccountError('Invalid comment id.', 400);

    await feedRpc<{ deleted: boolean }>('socialu_delete_comment', { p_auth_id: user.id, p_comment_id: commentId });
    return Response.json({ deleted: true }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}
