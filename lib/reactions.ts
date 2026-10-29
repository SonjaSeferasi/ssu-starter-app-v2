// Shared across the whole app: regular posts/comments AND the Whisper
// Wall's confessions/comments all use this exact same 6-reaction
// vocabulary and order, per "reuse shared components rather than
// implementing separate inconsistent reaction systems." Anonymity for
// Whisper Wall content is unaffected -- these are just the reaction
// kinds/labels/emoji, never tied to who reacted.
export type Reaction = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'care';

export const REACTIONS: { id: Reaction; label: string; emoji: string }[] = [
  { id: 'like', label: 'Like', emoji: '👍' },
  { id: 'love', label: 'Love', emoji: '❤️' },
  { id: 'haha', label: 'Haha', emoji: '😂' },
  { id: 'wow', label: 'Wow', emoji: '😮' },
  { id: 'sad', label: 'Sad', emoji: '😢' },
  { id: 'care', label: 'Care', emoji: '🙏' },
];

export function zeroReactionCounts(): Record<Reaction, number> {
  return { like: 0, love: 0, haha: 0, wow: 0, sad: 0, care: 0 };
}
