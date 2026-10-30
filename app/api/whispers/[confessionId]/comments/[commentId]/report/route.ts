import { AccountError, accountResponse, jsonBody, textField, verifiedUser } from '../../../../../../../lib/socialu-account';
import { feedRpc } from '../../../../../../../lib/feed';

// The Whisper Wall -- report an anonymous comment. Same enforcement model
// as confession reports (self-report blocked, severity-tiered threshold,
// reporter identity never returned), living in
// socialu_whisper_report_comment. A removed comment is tombstoned, not
// deleted, so the thread survives.
export async function POST(request: Request, { params }: { params: Promise<{ confessionId: string; commentId: string }> }) {
  try {
    const user = await verifiedUser(request);
    const { commentId: commentIdParam } = await params;
    const commentId = Number(commentIdParam);
    if (!Number.isInteger(commentId)) throw new AccountError('Invalid comment id.', 400);

    const body = await jsonBody(request);
    const result = await feedRpc<{ reported: boolean; comment_removed: boolean }>('socialu_whisper_report_comment', {
      p_auth_id: user.id, p_comment_id: commentId, p_reason: textField(body.reason),
    });
    return Response.json({ reported: result.reported, commentRemoved: result.comment_removed }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}
