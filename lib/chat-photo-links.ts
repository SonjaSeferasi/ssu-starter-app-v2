// SRS-201.7 (#1029, #1030): the links that let a conversation show its photos, and when to ask for new ones.
//
// The bucket is private, so a photo is shown through a signed URL the server makes. A signed URL stops working
// after an hour. That is not a problem for a page someone opens and closes, but a conversation is exactly the
// kind of page a student leaves open all afternoon -- and the photos in it would quietly turn into broken
// images with nothing on screen to explain why.
//
// So the page asks for fresh links before the ones it has expire. The rules live here, away from the timers and
// the fetching, so they can be tested: vitest runs with environment: 'node' and there is no React testing
// library, so anything left inline in the page would have nothing real behind it.

// How long a signed URL lasts. This is SIGNED_URL_TTL_SECONDS in lib/media.ts, which is what actually signs
// them; a test reads that file and fails if the two ever disagree, because a value too large here would mean
// refreshing after the links had already died.
export const PHOTO_LINK_TTL_MS = 60 * 60 * 1000;

// How long before expiry to ask for new links. Ten minutes is enough to cover a slow or briefly failed reload
// and still leave the student looking at working photos the whole time.
export const PHOTO_LINK_MARGIN_MS = 10 * 60 * 1000;

// Never sooner than this, so a clock that is wrong, or links that arrive already stale, cannot turn the
// refresh into a reload every few milliseconds.
export const PHOTO_LINK_MIN_DELAY_MS = 30 * 1000;

// When the links a page is holding stop working.
export function photoLinksExpireAt(issuedAt: number, ttlMs = PHOTO_LINK_TTL_MS): number {
  return issuedAt + ttlMs;
}

// How long to wait before asking for fresh links, or null when there is nothing to refresh.
// Null rather than zero for "no photos": a conversation of plain text should not reload itself on a timer.
export function photoLinkRefreshDelay(
  expiresAt: number | null | undefined,
  now: number,
  hasPhotos: boolean,
): number | null {
  if (!hasPhotos || !expiresAt || !Number.isFinite(expiresAt)) return null;
  return Math.max(PHOTO_LINK_MIN_DELAY_MS, expiresAt - PHOTO_LINK_MARGIN_MS - now);
}

// Whether links issued at this moment should already be treated as unusable. A page restored from the back
// button, or a laptop opened after being shut, can come back holding links that expired while it was away.
export function photoLinksExpired(expiresAt: number | null | undefined, now: number): boolean {
  if (!expiresAt || !Number.isFinite(expiresAt)) return false;
  return now >= expiresAt;
}

// SRS-201.7 (#1029): which stored object to show. The smaller copy when SRS-201.6 stored one, and the original
// otherwise -- a photo already small enough never got a copy, and showing nothing would be worse than showing
// the full-size file it was deemed not worth shrinking.
export function photoKeyToShow(
  photo: { storage_key: string; display_storage_key?: string | null } | null | undefined,
): string | null {
  if (!photo) return null;
  const chosen = photo.display_storage_key || photo.storage_key;
  return chosen && chosen.trim() ? chosen : null;
}

// What a student is told when a photo message has no usable link. The message is still shown in its place --
// knowing a photo is there, and who sent it, is worth more than an empty gap -- but it does not pretend the
// photo is loading forever.
export const PHOTO_UNAVAILABLE = 'Photo unavailable';

// Keep a link that is already known when the same message arrives again without one.
//
// A photo message can reach the page twice: once from the history, carrying a signed link, and once from the
// live broadcast, which carries none because realtime reaches the browser with no server in between to sign
// anything. Merging by ID replaces the message wholesale, so without this the live copy would silently blank
// out a photo the student was already looking at.
//
// A newer link always wins, so a refresh (SRS-201.7, #1030) really does replace the links being held.
export function mergePhotoUrl<T extends { photo_url?: string | null }>(previous: T | undefined, incoming: T): T {
  if (incoming.photo_url || !previous?.photo_url) return incoming;
  return { ...incoming, photo_url: previous.photo_url };
}
