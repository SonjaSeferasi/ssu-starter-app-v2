import { verifiedUser, accountResponse, jsonBody, AccountError } from '../../../../../lib/socialu-account';
import { feedRpc } from '../../../../../lib/feed';
import type { Reaction } from '../../../../../lib/reactions';

const REACTIONS: Reaction[] = ['like', 'love', 'haha', 'wow', 'sad', 'care'];

// Facebook-style react on a regular (non-anonymous) comment or reply --
// brand new, comments had no engagement mechanism before this. Same
// shape as the post reactions route. Visibility re-check (via the owning
// post) and tombstoned-comment rejection live in socialu_react_comment.
export async function POST(request: Request, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const user = await verifiedUser(request);
    const { commentId: commentIdParam } = await params;
    const commentId = Number(commentIdParam);
    if (!Number.isInteger(commentId)) throw new AccountError('Invalid comment id.', 400);

    const body = await jsonBody(request);
    const reaction = typeof body.reaction === 'string' && REACTIONS.includes(body.reaction as Reaction) ? body.reaction : null;

    const result = await feedRpc<{ reaction_counts: Record<Reaction, number>; my_reaction: Reaction | null }>('socialu_react_comment', {
      p_auth_id: user.id, p_comment_id: commentId, p_reaction: reaction,
    });
    return Response.json({ reactionCounts: result.reaction_counts, myReaction: result.my_reaction }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}
