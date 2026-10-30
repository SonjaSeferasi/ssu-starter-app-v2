import { AccountError, accountResponse, jsonBody, verifiedUser } from '../../../../../lib/socialu-account';
import { feedRpc } from '../../../../../lib/feed';
import type { WhisperReaction } from '../../../../../lib/whisper';

const REACTIONS: WhisperReaction[] = ['like', 'love', 'haha', 'wow', 'sad', 'care'];

// The Whisper Wall -- set, change, or remove the caller's own reaction.
// A null/missing reaction in the body removes it. Counts only are ever
// returned; who reacted is never exposed. Enforcement lives in
// socialu_whisper_react.
export async function POST(request: Request, { params }: { params: Promise<{ confessionId: string }> }) {
  try {
    const user = await verifiedUser(request);
    const { confessionId: confessionIdParam } = await params;
    const confessionId = Number(confessionIdParam);
    if (!Number.isInteger(confessionId)) throw new AccountError('Invalid confession id.', 400);

    const body = await jsonBody(request);
    const reaction = typeof body.reaction === 'string' && REACTIONS.includes(body.reaction as WhisperReaction) ? body.reaction : null;

    const result = await feedRpc<{ reaction_counts: Record<WhisperReaction, number>; my_reaction: WhisperReaction | null }>('socialu_whisper_react', {
      p_auth_id: user.id, p_confession_id: confessionId, p_reaction: reaction,
    });
    return Response.json({ reactionCounts: result.reaction_counts, myReaction: result.my_reaction }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}
