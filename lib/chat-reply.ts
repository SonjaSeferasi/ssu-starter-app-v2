// SRS-209.1 (#986): choosing an existing group message as the target of a reply.
// The rule lives here rather than in the page so it can be tested on its own: the page keeps the chosen message's
// id in state and asks these helpers what that choice means. Nothing is sent yet — composing the reply is
// SRS-209.2 and sending it is SRS-209.3.

// What these helpers need of a message while the student is choosing one. Kept to the two fields actually used,
// so a ChatMessageEvent (whose `kind` is optional) satisfies it without widening anything.
export type ReplyCandidate = { id: string; text: string };

// SRS-209.1: only a message in a group conversation can be the target of a reply. A private conversation is a
// fixed pair where a reply adds nothing, and UR-209 asks for this in groups. Reaching the page at all means the
// student is a current participant: socialu_conversation_messages refuses everyone else, so there is no extra
// membership check to make here.
export function canSelectForReply(conversationKind: string | null | undefined, message: ReplyCandidate | null | undefined): boolean {
  if (conversationKind !== 'group') return false;
  return Boolean(message && message.id);
}

// Choosing the message that is already chosen clears the choice; choosing another moves it. This mirrors the
// reaction picker, where pressing the same button again closes it.
export function toggleReplyTarget(current: string | null, messageId: string): string | null {
  return current === messageId ? null : messageId;
}

// A chosen message can leave the conversation under the student while they are still choosing — history reloads,
// or they scroll into a window that no longer holds it. Keeping an id that names nothing would leave the page
// pointing at a message it cannot show, so the choice is dropped. This is selection hygiene, not the stored
// reply relationship (SRS-209.6), which does not exist until a reply is sent.
export function keepReplyTarget(current: string | null, messages: readonly { id: string }[]): string | null {
  if (!current) return null;
  return messages.some((message) => message.id === current) ? current : null;
}

// SRS-209.2 (#988): once a message is chosen, the composer shows which message the reply answers while the
// student writes it.

export const REPLY_PREVIEW_LIMIT = 80;

// A one-line summary of the chosen message for the bar above the composer. Runs of whitespace collapse so a
// multi-line message stays one line, and a long message is cut so the bar never grows and push the conversation
// off screen.
export function replyPreview(text: string | null | undefined, limit = REPLY_PREVIEW_LIMIT): string {
  const flat = (text ?? '').replace(/\s+/g, ' ').trim();
  if (flat.length <= limit) return flat;
  return flat.slice(0, limit - 1).trimEnd() + '…';
}

// The chosen message itself, or null when the choice names nothing the page is currently showing. The page uses
// this to decide whether to show the bar at all, so a stale choice shows nothing rather than an empty bar.
export function findReplyTarget<T extends { id: string }>(messages: readonly T[], current: string | null): T | null {
  if (!current) return null;
  return messages.find((message) => message.id === current) ?? null;
}

// How the chosen message is named to screen readers, so the choice is announced rather than only outlined.
export function describeReplyTarget(sender: string, message: ReplyCandidate | null | undefined): string {
  return message ? `Replying to ${sender}: ${message.text}` : '';
}
