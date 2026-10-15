'use client';

import { useEffect, useState } from 'react';
import { CommentComposer } from './CommentComposer';
import { CommentItem } from './CommentItem';
import type { Comment } from './types';

export function CommentSection({
  postId,
  accessToken,
  authorInitial,
  currentStudentId,
  onCountChange,
}: {
  postId: number;
  accessToken: string;
  authorInitial: string;
  currentStudentId: number | null;
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
  // separate from the fetch above. Calling onCountChange directly inside the
  // fetch's .then() lifted a different component's state from inside this
  // component's mount-phase effect, which React's StrictMode (enabled in
  // next.config.js) flags in dev as a "setState while rendering a different
  // component" warning -- harmless (it never reproduced against a production
  // build), but a dedicated effect keyed on `comments` is the idiomatic fix:
  // it reports the count on its own render pass, never nested inside the
  // fetch callback that produced it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (comments !== null) onCountChange(comments.length);
  }, [comments]);

  // All three just update the local comments array -- the effect above
  // reports the resulting count to the parent whenever that array changes,
  // so none of these need to call onCountChange themselves.
  function handlePosted(comment: Comment) {
    setComments((prev) => [...(prev ?? []), comment]);
  }

  function handleUpdated(updated: Comment) {
    setComments((prev) => (prev ?? []).map((c) => (c.commentId === updated.commentId ? updated : c)));
    // SRS-310 DoD: editing does not change the comment count -- confirmed
    // below, since .map() never changes the array's length.
  }

  function handleDeleted(commentId: number) {
    setComments((prev) => (prev ?? []).filter((c) => c.commentId !== commentId));
  }

  return (
    <div className="mt-3 space-y-3 border-t border-stone-100 pt-3">
      {loading ? (
        <p className="text-xs text-stone-400">Loading comments…</p>
      ) : error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : (
        (comments ?? []).map((comment) => (
          <CommentItem
            key={comment.commentId}
            comment={comment}
            accessToken={accessToken}
            isOwnComment={currentStudentId !== null && currentStudentId === comment.authorId}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
          />
        ))
      )}

      <CommentComposer postId={postId} accessToken={accessToken} authorInitial={authorInitial} onPosted={handlePosted} />
    </div>
  );
}
