'use client';

import { useState } from 'react';
import type { FeedPost } from './types';

export function LikeButton({
  post,
  accessToken,
  onUpdated,
}: {
  post: FeedPost;
  accessToken: string;
  onUpdated: (updated: FeedPost) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    if (pending) return; // SRS-308/309: prevent repeated clicks while a request is pending.
    setPending(true);
    setError('');
    // SRS-309: the same button drives both directions -- DELETE unlikes an
    // already-liked post, POST likes an unliked one.
    const res = await fetch(`/api/posts/${post.postId}/likes`, {
      method: post.isLikedByViewer ? 'DELETE' : 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await res.json();
    setPending(false);
    if (!res.ok) {
      // Previous state is untouched since this never updates optimistically.
      setError(body.error || (post.isLikedByViewer ? 'Failed to unlike post.' : 'Failed to like post.'));
      return;
    }
    onUpdated({ ...post, likeCount: body.likeCount, isLikedByViewer: body.isLikedByViewer });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={post.isLikedByViewer}
        aria-label={post.isLikedByViewer ? 'Unlike post' : 'Like post'}
        className={`flex items-center gap-1.5 text-sm transition disabled:opacity-60 ${
          post.isLikedByViewer ? 'text-rose-600' : 'text-stone-400 hover:text-stone-600'
        }`}
      >
        <span aria-hidden="true">{post.isLikedByViewer ? '♥' : '♡'}</span>
        <span>{post.likeCount}</span>
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </span>
  );
}
