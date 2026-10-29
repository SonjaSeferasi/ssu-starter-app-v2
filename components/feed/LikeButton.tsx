'use client';

import { ReactionPicker } from '../shared/ReactionPicker';
import type { Reaction } from '../../lib/reactions';
import type { FeedPost } from './types';

// Facebook-style reaction control for a post (including a repost -- a
// repost has its own post_id, so this always reacts to the correct post,
// never the embedded original). Thin wrapper around the shared picker
// (see components/shared/ReactionPicker.tsx) translating FeedPost's
// shape into the picker's generic reactUrl/counts/onChanged interface.
export function LikeButton({
  post,
  accessToken,
  onUpdated,
}: {
  post: FeedPost;
  accessToken: string;
  onUpdated: (updated: FeedPost) => void;
}) {
  function handleChanged(reactionCounts: Record<Reaction, number>, myReaction: Reaction | null) {
    const total = Object.values(reactionCounts).reduce((sum, n) => sum + n, 0);
    onUpdated({ ...post, reactionCounts, myReaction, likeCount: total, isLikedByViewer: myReaction !== null });
  }

  return (
    <ReactionPicker
      reactUrl={`/api/posts/${post.postId}/reactions`}
      accessToken={accessToken}
      reactionCounts={post.reactionCounts}
      myReaction={post.myReaction}
      onChanged={handleChanged}
    />
  );
}
