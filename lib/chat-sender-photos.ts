// SRS-211.2 (#1282): turning each sender's profile photo key into a link the browser can use.
//
// Server-only, for the same reason as the chat photos in chat-photo-urls.ts: the media bucket is private and
// signing needs the service credentials, which is why 20261117050000 returns keys rather than links.
//
// The key never reaches the browser. It is replaced by photo_url on the way out -- not added alongside --
// so a response cannot leak the private object path even if the page ignores it.

import { accountClient } from './socialu-account';

const MEDIA_BUCKET = 'media';
// Profile photos sit beside the chat photos in the same response, so they expire together.
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type SenderIn = { name: string; username: string; photo_key?: string | null };
export type SenderOut = { name: string; username: string; photo_url: string | null };

// Exported for its own test: the mapping is the part worth pinning down, separately from the network call.
export function applySenderPhotoUrls(
  senders: Record<string, SenderIn>,
  signed: Map<string, string>,
): Record<string, SenderOut> {
  const out: Record<string, SenderOut> = {};
  for (const [id, sender] of Object.entries(senders ?? {})) {
    // photo_key is destructured out, so it cannot survive into the response by accident.
    const { photo_key, ...rest } = sender;
    out[id] = { ...rest, photo_url: (photo_key && signed.get(photo_key)) || null };
  }
  return out;
}

// Sign every sender's photo in one request rather than one request each: a group conversation can hold a
// dozen senders, and a dozen round trips before the history returns would be felt.
//
// A key that cannot be signed leaves that sender without a photo rather than failing the whole history. One
// missing avatar is a placeholder; an error is the conversation not loading at all.
export async function withSenderPhotoUrls<T extends { senders?: Record<string, SenderIn> }>(history: T): Promise<T> {
  const senders = history?.senders;
  if (!senders || Object.keys(senders).length === 0) return history;

  const keys = [...new Set(Object.values(senders).map((s) => s?.photo_key).filter((k): k is string => Boolean(k)))];
  const signed = new Map<string, string>();
  if (keys.length > 0) {
    try {
      const { data, error } = await accountClient().storage.from(MEDIA_BUCKET)
        .createSignedUrls(keys, SIGNED_URL_TTL_SECONDS);
      if (!error && data) {
        for (const row of data) {
          if (row.path && row.signedUrl && !row.error) signed.set(row.path, row.signedUrl);
        }
      }
    } catch {
      // Reported by its absence: those senders come back without a photo and the page shows its placeholder.
    }
  }
  return { ...history, senders: applySenderPhotoUrls(senders, signed) };
}
