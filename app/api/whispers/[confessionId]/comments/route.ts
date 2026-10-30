import { AccountError, accountClient, accountResponse, jsonBody, textField, verifiedUser } from '../../../../../lib/socialu-account';
import { feedRpc } from '../../../../../lib/feed';
import { shapeWhisperComment, shapeWhisperComments, type RawWhisperCommentRow } from '../../../../../lib/whisper';

// The Whisper Wall -- list anonymous comments/replies on a confession the
// caller can access. Same-school scoping and per-thread alias resolution
// (stable per confession, "Original Poster" for the author) live in
// socialu_whisper_list_comments.
export async function GET(request: Request, { params }: { params: Promise<{ confessionId: string }> }) {
  try {
    const user = await verifiedUser(request);
    const { confessionId: confessionIdParam } = await params;
    const confessionId = Number(confessionIdParam);
    if (!Number.isInteger(confessionId)) throw new AccountError('Invalid confession id.', 400);

    const rows = await feedRpc<RawWhisperCommentRow[]>('socialu_whisper_list_comments', { p_auth_id: user.id, p_confession_id: confessionId });
    const comments = await shapeWhisperComments(accountClient(), rows);
    return Response.json({ comments }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}

// Post a comment or reply. author_id always comes from the verified
// session. Alias assignment, one-level reply flattening, the Campus Crush
// mention sync (opt-out enforced server-side), the commenting cooldown,
// and the whisper_comment notification to the real confession author
// (which never reveals who commented) all live in
// socialu_whisper_create_comment.
export async function POST(request: Request, { params }: { params: Promise<{ confessionId: string }> }) {
  try {
    const user = await verifiedUser(request);
    const { confessionId: confessionIdParam } = await params;
    const confessionId = Number(confessionIdParam);
    if (!Number.isInteger(confessionId)) throw new AccountError('Invalid confession id.', 400);

    const body = await jsonBody(request);
    const parentCommentId = Number(body.parentCommentId);
    const row = await feedRpc<RawWhisperCommentRow>('socialu_whisper_create_comment', {
      p_auth_id: user.id,
      p_confession_id: confessionId,
      p_text: textField(body.textContent),
      p_parent_comment_id: Number.isInteger(parentCommentId) ? parentCommentId : null,
    });

    const comment = await shapeWhisperComment(accountClient(), row);
    return Response.json({ comment }, { status: 201 });
  } catch (error) {
    return accountResponse(error);
  }
}
