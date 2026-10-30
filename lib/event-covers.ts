import { AccountError, accountClient, accountOperation } from './socialu-account';
import { eventOperation } from './event-engagement';

// Server-only. Event cover photos live in the same private `media` bucket as post photos (see lib/media.ts),
// one object per event at event_cover/<event id>, shown through short-lived signed URLs.
const MEDIA_BUCKET = 'media';
const COVER_FOLDER = 'event_cover';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export const COVER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const COVER_MAX_BYTES = 10_000_000;

export const coverKey = (eventId: string) => `${COVER_FOLDER}/${eventId}`;

// Adds `cover_url` to each event that has a cover photo. A storage problem never breaks the event list.
export async function withCoverUrls<T extends { event_id: string }>(events: T[]): Promise<(T & { cover_url: string | null })[]> {
  const plain = events.map((event) => ({ ...event, cover_url: null as string | null }));
  if (events.length === 0) return plain;
  try {
    const storage = accountClient().storage.from(MEDIA_BUCKET);
    const { data: files, error } = await storage.list(COVER_FOLDER, { limit: 1000 });
    if (error || !files) return plain;
    const present = new Set(files.map((file) => file.name));
    const paths = events.filter((event) => present.has(event.event_id)).map((event) => coverKey(event.event_id));
    if (paths.length === 0) return plain;
    const { data: signed } = await storage.createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    const urls = new Map((signed ?? []).filter((item) => item.signedUrl && item.path).map((item) => [item.path as string, item.signedUrl]));
    return plain.map((event) => ({ ...event, cover_url: urls.get(coverKey(event.event_id)) ?? null }));
  } catch {
    return plain;
  }
}

// Only the event's host may change its cover. Uses the event list and the student's own profile,
// so it works with the event functions already applied to the database.
export async function requireEventHost(authId: string, eventId: string) {
  const events = ((await eventOperation('socialu_list_events', { p_auth_id: authId })) ?? []) as { event_id: string; creator_id: string }[];
  const event = events.find((item) => item.event_id === eventId);
  if (!event) throw new AccountError('This event is not available.', 404);
  const profile = (await accountOperation('read', { p_auth_id: authId })) as { id?: string } | null;
  if (!profile?.id || profile.id !== event.creator_id) throw new AccountError('Only the event’s host can change its cover photo.', 403);
}

export async function saveCover(eventId: string, file: File) {
  if (!COVER_TYPES.has(file.type)) throw new AccountError('Choose a JPEG, PNG or WebP photo.', 400);
  if (file.size > COVER_MAX_BYTES) throw new AccountError('Cover photos must be 10 MB or smaller.', 400);
  const { error } = await accountClient().storage.from(MEDIA_BUCKET)
    .upload(coverKey(eventId), file, { upsert: true, contentType: file.type, cacheControl: '3600' });
  if (error) throw new AccountError('The cover photo could not be saved. Please try again.', 503);
}

export async function removeCover(eventId: string) {
  const { error } = await accountClient().storage.from(MEDIA_BUCKET).remove([coverKey(eventId)]);
  if (error) throw new AccountError('The cover photo could not be removed. Please try again.', 503);
}
