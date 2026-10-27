// SRS-210.2 (#804, #805): the approved fixed reaction set, in the order the page shows it. The database keeps the
// same set in socialu.reaction_options (20261027120000_chat_reaction_set.sql) and refuses anything else.
export const REACTIONS = [
  { emoji: '👍', name: 'Thumbs up' },
  { emoji: '❤️', name: 'Heart' },
  { emoji: '😂', name: 'Laughing' },
  { emoji: '😮', name: 'Surprised' },
  { emoji: '😢', name: 'Sad' },
  { emoji: '🙏', name: 'Thank you' },
] as const;

export type ReactionEmoji = (typeof REACTIONS)[number]['emoji'];
// One entry per emoji on a message: how many students chose it, and whether the signed-in student is one of them.
export type ChatReaction = { emoji: string; count: number; mine: boolean };

export const REACTION_REQUIRED = 'Choose a reaction from the list.';

export function isReaction(value: unknown): value is ReactionEmoji {
  return REACTIONS.some((reaction) => reaction.emoji === value);
}

// Chips keep the set's order, so they don't jump around as counts change.
export function sortReactions(reactions: ChatReaction[]) {
  const place = (emoji: string) => { const index = REACTIONS.findIndex((reaction) => reaction.emoji === emoji); return index < 0 ? REACTIONS.length : index; };
  return [...reactions].filter((reaction) => reaction.count > 0).sort((a, b) => place(a.emoji) - place(b.emoji));
}
