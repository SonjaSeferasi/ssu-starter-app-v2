import { verifiedUser, accountResponse, AccountError } from '../../../../../lib/socialu-account';
import { feedRpc } from '../../../../../lib/feed';

// SRS-308.1/308.2 — like a post the caller is authorized to view. Ownership/
// visibility checks and the actual insert (idempotent via post_likes' own
// (post_id, student_id) primary key) live in socialu_like_post
// (supabase/migrations/20261016000100_like_post.sql).
export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const user = await verifiedUser(request);
    const { postId: postIdParam } = await params;
    const postId = Number(postIdParam);
    if (!Number.isInteger(postId)) throw new AccountError('Invalid post id.', 400);

    const result = await feedRpc<{ like_count: number; is_liked_by_viewer: boolean }>('socialu_like_post', {
      p_auth_id: user.id,
      p_post_id: postId,
    });

    return Response.json({ likeCount: result.like_count, isLikedByViewer: result.is_liked_by_viewer }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}

// SRS-309.1/309.2 — remove the caller's own like from a post. Same
// authorization rules as POST (socialu_unlike_post mirrors socialu_like_post's
// checks exactly); the delete is scoped to (post_id, the caller's student id),
// so it can only ever remove the caller's own like, never another student's.
// Idempotent: unliking an already-unliked post just returns the unchanged count.
export async function DELETE(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const user = await verifiedUser(request);
    const { postId: postIdParam } = await params;
    const postId = Number(postIdParam);
    if (!Number.isInteger(postId)) throw new AccountError('Invalid post id.', 400);

    const result = await feedRpc<{ like_count: number; is_liked_by_viewer: boolean }>('socialu_unlike_post', {
      p_auth_id: user.id,
      p_post_id: postId,
    });

    return Response.json({ likeCount: result.like_count, isLikedByViewer: result.is_liked_by_viewer }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}
