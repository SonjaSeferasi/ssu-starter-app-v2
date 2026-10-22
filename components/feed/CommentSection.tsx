'use client';

import { useEffect, useMemo, useState } from 'react';
import { CommentComposer } from './CommentComposer';
import { CommentItem } from './CommentItem';
import type { Comment } from './types';

export function CommentSection({
  postId,
  accessToken,
  authorInitial,
  currentStudentId,
  targetCommentId,
  onCountChange,
}: {
  postId: number;
  accessToken: string;
  authorInitial: string;
  currentStudentId: number | null;
  /** SRS-313/312.10: a clicked comment/reply notification's ?comment=<id>. */
  targetCommentId?: number;
  onCountChange: (count: number) => void;
}) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(`/api/posts/${postId}/comments`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load comments.');
        if (!cancelled) setComments(body.comments);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load comments.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Fetch once per post when the section is first expanded (CommentSection
    // only mounts while expanded -- see PostCard).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  // Reports the count to the parent (PostCard -> FeedPage) in its own effect,
  // separate from the fetch above -- see the git history for why (a React
  // StrictMode dev-only warning, resolved by not calling it inline inside
  // the fetch's .then()). Excludes tombstoned (soft-deleted) comments, same
  // as the server's comment_count -- Replying to Comments' safe-delete
  // keeps a tombstone's row around for its replies' sake, but it was still
  // "deleted" as far as the visible count goes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (comments !== null) onCountChange(comments.filter((c) => c.deletedAt === null).length);
  }, [comments]);

  // Top-level comments + a parentCommentId -> replies[] map, recomputed
  // whenever the flat list changes. Only one level deep by construction --
  // every reply's parentCommentId already points at a top-level comment's
  // id (socialu_create_comment flattens "reply to a reply" server-side),
  // so this never needs to recurse.
  const { topLevel, repliesByParent } = useMemo(() => {
    const all = comments ?? [];
    const topLevel = all.filter((c) => c.parentCommentId === null);
    const repliesByParent = new Map<number, Comment[]>();
    for (const c of all) {
      if (c.parentCommentId !== null) {
        const list = repliesByParent.get(c.parentCommentId) ?? [];
        list.push(c);
        repliesByParent.set(c.parentCommentId, list);
      }
    }
    return { topLevel, repliesByParent };
  }, [comments]);

  function handlePosted(comment: Comment) {
    setComments((prev) => [...(prev ?? []), comment]);
  }

  function handleUpdated(updated: Comment) {
    setComments((prev) => (prev ?? []).map((c) => (c.commentId === updated.commentId ? updated : c)));
    // SRS-310 DoD: editing does not change the comment count -- confirmed
    // below, since .map() never changes the array's length.
  }

  // tombstoned comments stay in the array (updated in place to render as
  // "[deleted]") so their replies -- written by other students -- are
  // never pulled out from under them; a true removal still filters as before.
  function handleDeleted(commentId: number, tombstoned: boolean) {
    setComments((prev) => {
      const list = prev ?? [];
      if (tombstoned) {
        return list.map((c) => (c.commentId === commentId ? { ...c, textContent: '[deleted]', deletedAt: new Date().toISOString() } : c));
      }
      return list.filter((c) => c.commentId !== commentId);
    });
  }

  return (
    <div className="mt-3 space-y-3 border-t border-stone-100 pt-3">
      {loading ? (
        <p className="text-xs text-stone-400">Loading comments…</p>
      ) : error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : comments !== null && comments.length === 0 ? (
        <p className="text-xs text-stone-400">No comments yet. Be the first to say something.</p>
      ) : (
        topLevel.map((comment) => (
          <CommentItem
            key={comment.commentId}
            comment={comment}
            postId={postId}
            accessToken={accessToken}
            authorInitial={authorInitial}
            isOwnComment={currentStudentId !== null && currentStudentId === comment.authorId}
            replies={repliesByParent.get(comment.commentId) ?? []}
            isReplyOwn={(reply) => currentStudentId !== null && currentStudentId === reply.authorId}
            targetCommentId={targetCommentId}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
            onPosted={handlePosted}
          />
        ))
      )}

      <CommentComposer postId={postId} accessToken={accessToken} authorInitial={authorInitial} onPosted={handlePosted} />
    </div>
  );
}
