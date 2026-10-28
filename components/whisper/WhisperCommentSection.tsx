'use client';

import { useEffect, useMemo, useState } from 'react';
import { WhisperCommentComposer } from './WhisperCommentComposer';
import { WhisperCommentItem } from './WhisperCommentItem';
import type { WhisperComment } from './types';

export function WhisperCommentSection({
  confessionId,
  accessToken,
  allowMentions,
  onCountChange,
}: {
  confessionId: number;
  accessToken: string;
  /** Only the Campus Crush category allows @mentions -- see sync_whisper_mentions. */
  allowMentions: boolean;
  onCountChange: (count: number) => void;
}) {
  const [comments, setComments] = useState<WhisperComment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(`/api/whispers/${confessionId}/comments`, { headers: { Authorization: `Bearer ${accessToken}` } })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confessionId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (comments !== null) onCountChange(comments.filter((c) => !c.isDeleted).length);
  }, [comments]);

  const { topLevel, repliesByParent } = useMemo(() => {
    const all = comments ?? [];
    const topLevel = all.filter((c) => c.parentCommentId === null);
    const repliesByParent = new Map<number, WhisperComment[]>();
    for (const c of all) {
      if (c.parentCommentId !== null) {
        const list = repliesByParent.get(c.parentCommentId) ?? [];
        list.push(c);
        repliesByParent.set(c.parentCommentId, list);
      }
    }
    return { topLevel, repliesByParent };
  }, [comments]);

  function handlePosted(comment: WhisperComment) {
    setComments((prev) => [...(prev ?? []), comment]);
  }

  function handleUpdated(updated: WhisperComment) {
    setComments((prev) => (prev ?? []).map((c) => (c.commentId === updated.commentId ? updated : c)));
  }

  function handleDeleted(commentId: number, tombstoned: boolean) {
    setComments((prev) => {
      const list = prev ?? [];
      if (tombstoned) {
        return list.map((c) => (c.commentId === commentId ? { ...c, textContent: '[deleted]', isDeleted: true } : c));
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
          <WhisperCommentItem
            key={comment.commentId}
            comment={comment}
            confessionId={confessionId}
            accessToken={accessToken}
            allowMentions={allowMentions}
            replies={repliesByParent.get(comment.commentId) ?? []}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
            onPosted={handlePosted}
          />
        ))
      )}

      <WhisperCommentComposer confessionId={confessionId} accessToken={accessToken} allowMentions={allowMentions} onPosted={handlePosted} />
    </div>
  );
}
