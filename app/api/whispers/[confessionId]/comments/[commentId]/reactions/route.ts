import { AccountError, accountResponse, jsonBody, verifiedUser } from '../../../../../../../lib/socialu-account';
import { feedRpc } from '../../../../../../../lib/feed';
import type { WhisperReaction } from '../../../../../../../lib/whisper';

const REACTIONS: WhisperReaction[] = ['like', 'love', 'haha', 'wow', 'sad', 'care'];

// The Whisper Wall -- set, change, or remove the caller's own reaction on
// an anonymous comment/reply. A null/missing reaction in the body removes
// it. Counts only are ever returned; who reacted is never exposed.
// Enforcement (same_school, tombstoned-comment rejection) lives in
// socialu_whisper_react_comment.
export async function POST(request: Request, { params }: { params: Promise<{ confessionId: string; commentId: string }> }) {
  try {
    const user = await verifiedUser(request);
    const { commentId: commentIdParam } = await params;
    const commentId = Number(commentIdParam);
    if (!Number.isInteger(commentId)) throw new AccountError('Invalid comment id.', 400);

    const body = await jsonBody(request);
    const reaction = typeof body.reaction === 'string' && REACTIONS.includes(body.reaction as WhisperReaction) ? body.reaction : null;

    const result = await feedRpc<{ reaction_counts: Record<WhisperReaction, number>; my_reaction: WhisperReaction | null }>('socialu_whisper_react_comment', {
      p_auth_id: user.id, p_comment_id: commentId, p_reaction: reaction,
    });
    return Response.json({ reactionCounts: result.reaction_counts, myReaction: result.my_reaction }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}
