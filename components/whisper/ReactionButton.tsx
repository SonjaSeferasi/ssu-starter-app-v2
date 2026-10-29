// The Whisper Wall now reuses the exact same Facebook-style picker as
// regular posts/comments (see components/shared/ReactionPicker.tsx) --
// re-exported under this name so ConfessionReactions.tsx/
// WhisperCommentItem.tsx need no import changes. Anonymity is untouched:
// the picker itself has no identity coupling, it only ever reads/writes
// counts and the viewer's own reaction via whatever reactUrl is passed in.
export { ReactionPicker as ReactionButton } from '../shared/ReactionPicker';
