import { accountClient } from './socialu-account';
import { PHOTO_LINK_TTL_MS, photoKeyToShow, photoLinksExpireAt } from './chat-photo-links';

// SRS-201.7 (#1029, #1030): turning the storage keys the history returns into links the browser can use.
// Server-only: signing needs the service credentials, which is the whole reason the database returns keys
// rather than links (see 20261103130000_chat_photo_in_history.sql).

const MEDIA_BUCKET = 'media';

type HistoryPhoto = { storage_key: string; mime_type?: string; display_storage_key?: string | null };
type History = { messages?: { id: string; photo_url?: string | null }[]; photos?: Record<string, HistoryPhoto> };

// Add a signed link to each photo message, and say when those links stop working.
//
// Every key is signed in one request rather than one request each: a conversation can hold fifty photos, and
// fifty round trips before the history is returned would be felt.
//
// A key that cannot be signed leaves its message without a link rather than failing the whole history. One
// photo that will not load is a gap in a conversation; an error is the conversation not loading at all.
export async function withPhotoUrls<T extends History>(history: T): Promise<T> {
  const photos = history?.photos;
  if (!photos || !history.messages?.length) return history;

  // The key actually shown: the smaller copy when SRS-201.6 stored one, the original otherwise.
  const wanted = new Map<string, string>();
  for (const [messageId, photo] of Object.entries(photos)) {
    const key = photoKeyToShow(photo);
    if (key) wanted.set(messageId, key);
  }
  if (wanted.size === 0) return history;

  // Distinct keys, because the same photo could in principle be referenced twice and signing it twice is waste.
  const keys = [...new Set(wanted.values())];
  const signed = new Map<string, string>();
  try {
    const { data, error } = await accountClient().storage.from(MEDIA_BUCKET)
      .createSignedUrls(keys, Math.floor(PHOTO_LINK_TTL_MS / 1000));
    if (!error && data) {
      for (const row of data) {
        if (row.path && row.signedUrl && !row.error) signed.set(row.path, row.signedUrl);
      }
    }
  } catch {
    // Reported by its absence: the messages come back without links and the page says so per photo.
  }

  for (const message of history.messages) {
    const key = wanted.get(message.id);
    if (key) message.photo_url = signed.get(key) ?? null;
  }
  // The page refreshes shortly before this, so the links it is holding never expire while it is open.
  return { ...history, photo_links_expire_at: photoLinksExpireAt(Date.now()) };
}
