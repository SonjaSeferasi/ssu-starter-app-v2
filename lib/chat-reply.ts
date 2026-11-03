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

// SRS-209.5 (#997, #998): the message a reply answers, as the page shows it above the reply.
export type ReplyQuote = { id: string; sender: string; text: string; kind?: string };
// What the history returns for each reply, keyed by the replying message's id.
export type ReplyTargets = Record<string, { id: string; sender_id: string; sender_name: string; text: string; kind?: string }>;

// The quote to show above a message, or null when there is nothing to show.
// Two sources, because a reply can arrive either way:
//   - history sends a 'replies' entry with the target's own sender name, which works even when the target is
//     older than the fifty messages loaded;
//   - a live reply arrives carrying only reply_to_id, so the target is looked up among the messages on screen.
// A reply whose target is out of reach (sent before this student joined) appears in neither, and the reply is
// shown on its own rather than quoting something the student may not see.
export function replyQuote(
  message: { id: string; reply_to_id?: string | null },
  targets: ReplyTargets,
  shown: readonly { id: string; sender_id: string; text: string; kind?: string }[],
  senders: Record<string, { name: string }>,
  myStudentId: string | null,
): ReplyQuote | null {
  const named = (senderId: string, fallback: string) =>
    senderId === myStudentId ? 'You' : senders[senderId]?.name ?? fallback;

  const fromHistory = targets[message.id];
  if (fromHistory) {
    return { id: fromHistory.id, sender: named(fromHistory.sender_id, fromHistory.sender_name),
      text: fromHistory.text, kind: fromHistory.kind };
  }
  if (!message.reply_to_id) return null;
  const onScreen = shown.find((m) => m.id === message.reply_to_id);
  if (!onScreen) return null;
  return { id: onScreen.id, sender: named(onScreen.sender_id, 'A member'), text: onScreen.text, kind: onScreen.kind };
}

// SRS-209.6 (#1000, #1001): what the page shows above a message, given whatever quote could be resolved.
//   'quote'       - the target is available and is shown;
//   'unavailable' - the message is a reply, but its target cannot be shown to this student;
//   'none'        - the message is not a reply at all.
// The stored relationship is never changed by any of this: a target that cannot be shown is still recorded on
// the row, so the reply keeps pointing at it for anyone who can see it.
export function replyIndication(
  message: { reply_to_id?: string | null },
  quote: ReplyQuote | null,
): 'quote' | 'unavailable' | 'none' {
  if (quote) return 'quote';
  return message.reply_to_id ? 'unavailable' : 'none';
}

// How the chosen message is named to screen readers, so the choice is announced rather than only outlined.
export function describeReplyTarget(sender: string, message: ReplyCandidate | null | undefined): string {
  return message ? `Replying to ${sender}: ${message.text}` : '';
}
