// SRS-201.21 (UR-201) send a GIF from a link.
// "The system shall allow a conversation participant to send a GIF by giving a link to it, subject to
//  the same supported-format and file-size requirements as a GIF uploaded from the participant's device."
//
// This file is the half both sides share: what a link has to look like before anyone goes near the
// network. It imports nothing from node, because the composer imports it too. Opening the link, deciding
// where it is allowed to point and reading the bytes is lib/chat-gif-link-server.ts, which is only ever
// imported by the route.
//
// The point of the card is that a student can send any GIF on the web without an account anywhere: paste
// the address of the one they found and it arrives in the conversation. What is stored is a copy, not the
// link -- see the server file for why.

export const GIF_LINK_MAX_LENGTH = 2048;

export const GIF_LINK_EMPTY = 'Paste the link to a GIF.';
export const GIF_LINK_NOT_HTTPS = 'A GIF link has to start with https://.';
export const GIF_LINK_MALFORMED = 'That does not look like a link. Copy the whole address.';
export const GIF_LINK_TOO_LONG = 'That link is too long.';
export const GIF_LINK_NOT_GIF = 'That link is not a GIF.';
export const GIF_LINK_UNREACHABLE = 'That link could not be opened. Check it and try again.';
export const GIF_LINK_SEND_FAILED = 'That GIF could not be sent. Please try again.';

/**
 * The syntax rules, in the order a student would want to be told about them. Returns a sentence to show,
 * or null when the link is worth trying. Saying "worth trying" is as far as this can honestly go: whether
 * the address answers, and with what, is the server's business.
 */
export function gifLinkError(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.trim() === '') return GIF_LINK_EMPTY;
  const value = raw.trim();
  if (value.length > GIF_LINK_MAX_LENGTH) return GIF_LINK_TOO_LONG;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return GIF_LINK_MALFORMED;
  }
  // http: is refused rather than upgraded. An upgrade would be a guess about someone else's server, and
  // a plain-http fetch would put the campus network between the student and what they are sending.
  // Every other scheme -- data:, file:, javascript: -- is refused here and never reaches the server.
  if (url.protocol !== 'https:') return GIF_LINK_NOT_HTTPS;
  // Credentials in a link are either a mistake or an attempt to make the server sign in as someone.
  if (url.username || url.password) return GIF_LINK_MALFORMED;
  if (!url.hostname || !url.hostname.includes('.')) return GIF_LINK_MALFORMED;
  return null;
}

/** The trimmed URL when gifLinkError accepts it, otherwise null. */
export function parseGifLink(raw: unknown): URL | null {
  if (gifLinkError(raw)) return null;
  return new URL((raw as string).trim());
}

/**
 * A name for the stored copy, taken from the link's own path when it has one. Only used to make the
 * object in storage recognisable; nothing is trusted from it.
 */
export function gifLinkLabel(url: URL) {
  const last = url.pathname.split('/').filter(Boolean).pop() ?? '';
  const name = last.replace(/[^a-zA-Z0-9._-]/g, '').slice(-40);
  return name.toLowerCase().endsWith('.gif') ? name : 'linked.gif';
}
