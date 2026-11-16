// #1217 (SRS-212.9): what the Messages list and the notification bell show for a message that is a photo.
//
// A photo message carries no text at all -- socialu.messages requires text_content IS NULL for kind 'photo' --
// so neither place can show a snippet, and the database should not be deciding the wording. Both surfaces now
// receive the message's kind and ask these functions what to display.
//
// Everything here is pure so it can be tested: vitest runs with environment 'node' and there is no React
// testing library in this project, so any rule that lives inside a component cannot be covered.

export const PHOTO_PREVIEW = 'Photo';

// 'text' and 'emoji' are the kinds that existed before photos; a message from before this change, or from a
// server that has not applied 20261112120000 yet, arrives with no kind at all and is treated as text.
export type PreviewKind = 'text' | 'emoji' | 'photo' | undefined;

// The body of a preview, without any prefix or quoting: the message's own text, or a word standing in for a
// photograph. Never returns null, so no caller has to guard before measuring or slicing it.
export function previewBody(kind: PreviewKind, text: string | null | undefined): string {
  if (kind === 'photo') return PHOTO_PREVIEW;
  return typeof text === 'string' ? text : '';
}

// The Messages list line. The student's own latest message is marked, as it was before photos existed.
export function conversationPreview(
  last: { kind?: PreviewKind; text: string | null; sender_id: string },
  meId: string | null,
): string {
  const body = previewBody(last.kind, last.text);
  return last.sender_id === meId ? `You: ${body}` : body;
}

// The notification bell line. Text is quoted and clipped so a long message cannot push the row out of shape;
// an emoji stands on its own, and a photo is named rather than quoted -- there is nothing to quote.
export function notificationPreview(kind: PreviewKind, text: string | null | undefined, limit = 80): string {
  if (kind === 'photo') return PHOTO_PREVIEW;
  const body = previewBody(kind, text);
  const clipped = body.length > limit ? `${body.slice(0, limit)}…` : body;
  return kind === 'emoji' ? clipped : `“${clipped}”`;
}
