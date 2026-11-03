import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  PHOTO_LINK_MARGIN_MS, PHOTO_LINK_MIN_DELAY_MS, PHOTO_LINK_TTL_MS, PHOTO_UNAVAILABLE,
  mergePhotoUrl, photoKeyToShow, photoLinkRefreshDelay, photoLinksExpireAt, photoLinksExpired,
} from '../lib/chat-photo-links';

describe('SRS-201.7 which stored copy is shown', () => {
  it('prefers the smaller copy SRS-201.6 stored', () => {
    expect(photoKeyToShow({ storage_key: 'chat_photo/a/1/x.jpg', display_storage_key: 'chat_photo/a/1/x-display.jpg' }))
      .toBe('chat_photo/a/1/x-display.jpg');
  });

  it('falls back to the original when no copy was stored', () => {
    // A photo already small enough never got a copy. Showing nothing would be worse than showing the file
    // that was judged not worth shrinking.
    expect(photoKeyToShow({ storage_key: 'chat_photo/a/1/small.png' })).toBe('chat_photo/a/1/small.png');
    expect(photoKeyToShow({ storage_key: 'chat_photo/a/1/small.png', display_storage_key: null })).toBe('chat_photo/a/1/small.png');
    expect(photoKeyToShow({ storage_key: 'chat_photo/a/1/small.png', display_storage_key: '' })).toBe('chat_photo/a/1/small.png');
  });

  it('reports nothing to show rather than an empty key', () => {
    expect(photoKeyToShow(null)).toBe(null);
    expect(photoKeyToShow(undefined)).toBe(null);
    expect(photoKeyToShow({ storage_key: '   ' })).toBe(null);
  });
});

describe('SRS-201.7 refreshing links before they expire', () => {
  it('counts an hour from when the links were issued', () => {
    expect(photoLinksExpireAt(1_000_000)).toBe(1_000_000 + 60 * 60 * 1000);
  });

  it('asks for new links before the ones it holds stop working', () => {
    const now = 1_000_000;
    const expires = photoLinksExpireAt(now);
    const delay = photoLinkRefreshDelay(expires, now, true)!;
    // The whole point: the refresh lands before expiry, with room to spare.
    expect(now + delay).toBeLessThan(expires);
    expect(expires - (now + delay)).toBe(PHOTO_LINK_MARGIN_MS);
  });

  it('sets no timer for a conversation with no photos', () => {
    // A conversation of plain text must not reload itself on a timer.
    expect(photoLinkRefreshDelay(photoLinksExpireAt(0), 0, false)).toBe(null);
  });

  it('sets no timer when the server said nothing about expiry', () => {
    expect(photoLinkRefreshDelay(null, 0, true)).toBe(null);
    expect(photoLinkRefreshDelay(undefined, 0, true)).toBe(null);
    expect(photoLinkRefreshDelay(Number.NaN, 0, true)).toBe(null);
  });

  it('never reloads in a tight loop, even for links that are already stale', () => {
    // A wrong clock, or links that arrive expired, must not turn the refresh into a reload every tick.
    const expires = photoLinksExpireAt(0);
    expect(photoLinkRefreshDelay(expires, expires + 10_000_000, true)).toBe(PHOTO_LINK_MIN_DELAY_MS);
    expect(photoLinkRefreshDelay(expires, expires, true)).toBe(PHOTO_LINK_MIN_DELAY_MS);
  });

  it('knows when the links it is holding have already died', () => {
    const expires = photoLinksExpireAt(1_000_000);
    expect(photoLinksExpired(expires, expires - 1)).toBe(false);
    expect(photoLinksExpired(expires, expires)).toBe(true);
    expect(photoLinksExpired(expires, expires + 60_000)).toBe(true);
    // Nothing known means nothing to act on, not "expired".
    expect(photoLinksExpired(null, Date.now())).toBe(false);
  });

  it('matches the lifetime lib/media.ts actually signs with', () => {
    // These are two different files, and a value too large here would mean refreshing after the links had
    // already died -- the exact failure this card exists to prevent. Read the signer and compare.
    const media = readFileSync(process.cwd() + '/lib/media.ts', 'utf8');
    const seconds = media.match(/SIGNED_URL_TTL_SECONDS\s*=\s*([^;]+);/);
    expect(seconds).not.toBe(null);
    // eslint-disable-next-line no-eval
    expect(eval(seconds![1]) * 1000).toBe(PHOTO_LINK_TTL_MS);
  });

  it('leaves room for a reload that is slow or briefly fails', () => {
    expect(PHOTO_LINK_MARGIN_MS).toBeGreaterThanOrEqual(60_000);
    expect(PHOTO_LINK_MARGIN_MS).toBeLessThan(PHOTO_LINK_TTL_MS);
  });
});

describe('SRS-201.7 keeping a link when the same message arrives again', () => {
  type Shown = { id: string; photo_url?: string | null };
  const withUrl: Shown = { id: '1', photo_url: 'https://signed/one' };
  const withoutUrl: Shown = { id: '1', photo_url: undefined };

  it('keeps the known link when the live copy carries none', () => {
    // The live broadcast carries no link: realtime reaches the browser with no server in between to sign one.
    // Without this the live copy would blank out a photo the student is looking at.
    expect(mergePhotoUrl(withUrl, withoutUrl).photo_url).toBe('https://signed/one');
  });

  it('lets a newer link win, so a refresh really replaces the old one', () => {
    expect(mergePhotoUrl(withUrl, { id: '1', photo_url: 'https://signed/two' }).photo_url).toBe('https://signed/two');
  });

  it('invents nothing when neither copy has a link', () => {
    expect(mergePhotoUrl(undefined, withoutUrl).photo_url).toBe(undefined);
    expect(mergePhotoUrl({ id: '1', photo_url: null }, withoutUrl).photo_url).toBe(undefined);
  });

  it('does not disturb a message that is not a photo', () => {
    const text = { id: '2', text: 'hello' } as { id: string; text: string; photo_url?: string | null };
    expect(mergePhotoUrl(undefined, text)).toBe(text);
  });
});

describe('SRS-201.7 what a photo with no link says', () => {
  it('says the photo is unavailable rather than pretending it is still loading', () => {
    expect(PHOTO_UNAVAILABLE).toMatch(/unavailable/i);
    // It must not blame the student or suggest something they cannot do about it.
    expect(PHOTO_UNAVAILABLE).not.toMatch(/you|your|retry|refresh/i);
  });
});
