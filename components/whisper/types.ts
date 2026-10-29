// The Whisper Wall, additional functionality not in the official SRS.
// Deliberately separate from components/feed/types.ts -- no shared
// FeedPost/Mention coupling, matching the approved plan's "keep Whisper
// Wall activity structurally separate from regular posts" requirement.
import type { WhisperCategory } from '../../lib/whisper';
export type { WhisperCategory, WhisperReaction, WhisperSort, Confession, WhisperComment } from '../../lib/whisper';
export type { Mention } from '../../lib/posts';
// Whisper Wall reactions use the exact same global vocabulary/order as
// regular posts/comments -- see lib/reactions.ts and ReactionPicker.tsx.
export { REACTIONS } from '../../lib/reactions';

// Each category gets its own color identity (chip, badge, and the
// confession's ghost-avatar circle all share it) -- the Whisper Wall's
// "distinctive but not clashing" look comes from this plus the banner,
// not from swapping the whole app's accent color; everyday buttons/active
// states below still reuse the app's existing emerald, same as everywhere else.
//
// CATEGORIES stays the FULL set, including the three retired categories
// (funny/embarrassing/rant) -- historical confessions already created in
// those categories still need their badge/color/emoji resolved correctly
// (ConfessionCard looks itself up here by confession.category). Only
// SELECTABLE_CATEGORIES (below) is shown for NEW confessions/filtering.
export const CATEGORIES: { id: WhisperCategory; label: string; emoji: string; bg: string; text: string }[] = [
  { id: 'funny', label: 'Funny', emoji: '😂', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  { id: 'campus_crush', label: 'Campus Crush', emoji: '💕', bg: 'bg-pink-100', text: 'text-pink-800' },
  { id: 'embarrassing', label: 'Embarrassing', emoji: '😳', bg: 'bg-orange-100', text: 'text-orange-800' },
  { id: 'rant', label: 'Rant', emoji: '💬', bg: 'bg-blue-100', text: 'text-blue-800' },
  { id: 'advice', label: 'Advice', emoji: '🙏', bg: 'bg-amber-100', text: 'text-amber-800' },
  { id: 'unpopular_opinion', label: 'Unpopular Opinion', emoji: '🔥', bg: 'bg-red-100', text: 'text-red-800' },
];

// The three active categories -- used by the confession composer (what a
// student can pick when posting) and the category filter dropdown (what
// can be filtered FOR; "All Categories" still includes historical posts
// in retired categories, since that's just p_category = NULL server-side).
const SELECTABLE_IDS: WhisperCategory[] = ['campus_crush', 'unpopular_opinion', 'advice'];
export const SELECTABLE_CATEGORIES = SELECTABLE_IDS.map((id) => CATEGORIES.find((c) => c.id === id)!);
