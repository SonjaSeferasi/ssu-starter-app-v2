import { AccountError, accountClient, accountResponse, jsonBody, textField, verifiedUser } from '../../../../../../lib/socialu-account';
import { feedRpc } from '../../../../../../lib/feed';
import { shapeWhisperComment, type RawWhisperCommentRow } from '../../../../../../lib/whisper';

// The Whisper Wall -- edit the caller's own anonymous comment. Ownership
// enforcement, the Campus Crush mention re-sync, and the alias/label
// recomputation live in socialu_whisper_update_comment.
export async function PATCH(request: Request, { params }: { params: Promise<{ confessionId: string; commentId: string }> }) {
  try {
    const user = await verifiedUser(request);
    const { commentId: commentIdParam } = await params;
    const commentId = Number(commentIdParam);
    if (!Number.isInteger(commentId)) throw new AccountError('Invalid comment id.', 400);

    const body = await jsonBody(request);
    const row = await feedRpc<RawWhisperCommentRow>('socialu_whisper_update_comment', {
      p_auth_id: user.id, p_comment_id: commentId, p_text: textField(body.textContent),
    });
    const comment = await shapeWhisperComment(accountClient(), row);
    return Response.json({ comment }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}

// Delete the caller's own anonymous comment. Tombstoned (not removed) if
// it has replies, so the thread survives -- same pattern as regular post
// comments. Ownership enforcement lives in socialu_whisper_delete_comment.
export async function DELETE(request: Request, { params }: { params: Promise<{ confessionId: string; commentId: string }> }) {
  try {
    const user = await verifiedUser(request);
    const { commentId: commentIdParam } = await params;
    const commentId = Number(commentIdParam);
    if (!Number.isInteger(commentId)) throw new AccountError('Invalid comment id.', 400);

    const result = await feedRpc<{ deleted: boolean; tombstoned: boolean }>('socialu_whisper_delete_comment', {
      p_auth_id: user.id, p_comment_id: commentId,
    });
    return Response.json({ deleted: result.deleted, tombstoned: result.tombstoned }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}
