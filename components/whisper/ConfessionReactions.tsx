'use client';

import { ReactionButton } from './ReactionButton';
import type { WhisperReaction } from './types';

// Confession-specific wrapper around the shared ReactionButton (see
// ReactionButton.tsx) -- keeps ConfessionCard's existing prop shape
// (confessionId rather than a raw URL) unchanged.
export function ConfessionReactions({
  confessionId,
  accessToken,
  reactionCounts,
  myReaction,
  onChanged,
}: {
  confessionId: number;
  accessToken: string;
  reactionCounts: Record<WhisperReaction, number>;
  myReaction: WhisperReaction | null;
  onChanged: (reactionCounts: Record<WhisperReaction, number>, myReaction: WhisperReaction | null) => void;
}) {
  return (
    <ReactionButton
      reactUrl={`/api/whispers/${confessionId}/reactions`}
      accessToken={accessToken}
      reactionCounts={reactionCounts}
      myReaction={myReaction}
      onChanged={onChanged}
    />
  );
}
