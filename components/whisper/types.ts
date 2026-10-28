// The Whisper Wall, additional functionality not in the official SRS.
// Deliberately separate from components/feed/types.ts -- no shared
// FeedPost/Mention coupling, matching the approved plan's "keep Whisper
// Wall activity structurally separate from regular posts" requirement.
import type { WhisperCategory, WhisperReaction } from '../../lib/whisper';
export type { WhisperCategory, WhisperReaction, WhisperSort, Confession, WhisperComment } from '../../lib/whisper';
export type { Mention } from '../../lib/posts';

// Each category gets its own color identity (chip, badge, and the
// confession's ghost-avatar circle all share it) -- the Whisper Wall's
// "distinctive but not clashing" look comes from this plus the banner,
// not from swapping the whole app's accent color; everyday buttons/active
// states below still reuse the app's existing emerald, same as everywhere else.
export const CATEGORIES: { id: WhisperCategory; label: string; emoji: string; bg: string; text: string }[] = [
  { id: 'funny', label: 'Funny', emoji: '😂', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  { id: 'campus_crush', label: 'Campus Crush', emoji: '💕', bg: 'bg-pink-100', text: 'text-pink-800' },
  { id: 'embarrassing', label: 'Embarrassing', emoji: '😳', bg: 'bg-orange-100', text: 'text-orange-800' },
  { id: 'rant', label: 'Rant', emoji: '💬', bg: 'bg-blue-100', text: 'text-blue-800' },
  { id: 'advice', label: 'Advice', emoji: '🙏', bg: 'bg-amber-100', text: 'text-amber-800' },
  { id: 'unpopular_opinion', label: 'Unpopular Opinion', emoji: '🔥', bg: 'bg-red-100', text: 'text-red-800' },
];

export const REACTIONS: { id: WhisperReaction; label: string; emoji: string }[] = [
  { id: 'funny', label: 'Funny', emoji: '😂' },
  { id: 'support', label: 'Support', emoji: '💚' },
  { id: 'shocked', label: 'Shocked', emoji: '😮' },
  { id: 'love', label: 'Love', emoji: '❤️' },
  { id: 'sad', label: 'Sad', emoji: '😢' },
  { id: 'fire', label: 'Fire', emoji: '🔥' },
];
