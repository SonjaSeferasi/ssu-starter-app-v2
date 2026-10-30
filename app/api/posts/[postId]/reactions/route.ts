import { verifiedUser, accountResponse, jsonBody, AccountError } from '../../../../../lib/socialu-account';
import { feedRpc } from '../../../../../lib/feed';
import type { Reaction } from '../../../../../lib/reactions';

const REACTIONS: Reaction[] = ['like', 'love', 'haha', 'wow', 'sad', 'care'];

// Facebook-style react on a post the caller is authorized to view -- set,
// change, or remove the caller's own reaction. A null/missing reaction in
// the body removes it. This supersedes /likes as the primary entry point
// (that route is left untouched, just unused by the frontend now).
// Authorization, notification semantics, and the UPSERT itself all live
// in socialu_react_post. Works identically for a repost: reactions are
// already keyed by post_id, and a repost has its own post_id independent
// of the original it embeds.
export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const user = await verifiedUser(request);
    const { postId: postIdParam } = await params;
    const postId = Number(postIdParam);
    if (!Number.isInteger(postId)) throw new AccountError('Invalid post id.', 400);

    const body = await jsonBody(request);
    const reaction = typeof body.reaction === 'string' && REACTIONS.includes(body.reaction as Reaction) ? body.reaction : null;

    const result = await feedRpc<{
      like_count: number;
      is_liked_by_viewer: boolean;
      reaction_counts: Record<Reaction, number>;
      my_reaction: Reaction | null;
    }>('socialu_react_post', { p_auth_id: user.id, p_post_id: postId, p_reaction: reaction });

    return Response.json(
      {
        likeCount: result.like_count,
        isLikedByViewer: result.is_liked_by_viewer,
        reactionCounts: result.reaction_counts,
        myReaction: result.my_reaction,
      },
      { status: 200 }
    );
  } catch (error) {
    return accountResponse(error);
  }
}
