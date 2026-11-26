import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  GIF_LIBRARY, GIF_LIBRARY_PREFIX, isLibraryReference, libraryGifFromReference, libraryGifReference,
  libraryGifSrc, searchLibraryGifs,
} from '../lib/chat-gif-library';

// SRS-201.10 (UR-201): "The system shall allow a conversation participant to access the available GIF
// library while preparing a message." The library is the bundled set; this file checks that the set and
// the files on disk agree, that a reference can only ever name one of them, and that the panel that
// shows them is built the way the requirement describes.
const root = process.cwd();
const dir = root + '/public/gif-library';
const picker = readFileSync(root + '/app/messages/message-picker.tsx', 'utf8');
const page = readFileSync(root + '/app/messages/[conversationId]/page.tsx', 'utf8');

describe('SRS-201.10 the bundled library is really there', () => {
  it('has a file for every entry', () => {
    for (const gif of GIF_LIBRARY) {
      expect(existsSync(`${dir}/${gif.id}.gif`), `${gif.id}.gif is missing`).toBe(true);
    }
  });

  it('has an entry for every file, so nothing is served that the catalogue does not describe', () => {
    const files = readdirSync(dir).filter((name) => name.endsWith('.gif')).map((name) => name.slice(0, -4));
    expect(files.sort()).toEqual(GIF_LIBRARY.map((gif) => gif.id).sort());
  });

  it('ships GIFs that actually move', () => {
    // A still image would be a picture, not a GIF worth having a library for. Every frame in a GIF is
    // introduced by a Graphic Control Extension (21 F9 04), so more than one means more than one frame.
    for (const gif of GIF_LIBRARY) {
      const bytes = readFileSync(`${dir}/${gif.id}.gif`);
      expect(bytes.subarray(0, 6).toString('latin1'), `${gif.id} is not a GIF`).toMatch(/^GIF8[79]a$/);
      let frames = 0;
      for (let i = 0; i < bytes.length - 3; i += 1) {
        if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9 && bytes[i + 2] === 0x04) frames += 1;
      }
      expect(frames, `${gif.id} has ${frames} frame(s)`).toBeGreaterThan(1);
    }
  });

  it('keeps every file small enough to send under the GIF limit', async () => {
    const { GIF_MAX_BYTES } = await import('../lib/chat-gif');
    for (const gif of GIF_LIBRARY) {
      expect(readFileSync(`${dir}/${gif.id}.gif`).byteLength).toBeLessThan(GIF_MAX_BYTES);
    }
  });
});

describe('SRS-201.10 a reference can only name a GIF in the library', () => {
  it('round-trips an id', () => {
    expect(libraryGifReference('heart')).toBe('/gif-library/heart.gif');
    expect(libraryGifFromReference('/gif-library/heart.gif')?.name).toBe('Heart');
    expect(libraryGifSrc('lol')).toBe(`${GIF_LIBRARY_PREFIX}lol.gif`);
  });

  it('refuses anything that is not one of ours', () => {
    // A reference reaches the database, so the only safe answer to an unknown one is no. The traversal
    // and absolute-URL cases matter most: both would otherwise end up in an <img> in someone's chat.
    for (const bad of [
      '/gif-library/../../etc/passwd.gif', '/gif-library/nope.gif', '/gif-library/heart.png',
      'https://example.com/evil.gif', 'gif-library/heart.gif', '', '  ', null, undefined, 42,
      '/gif-library/heart.gif/../../x.gif',
    ]) {
      expect(isLibraryReference(bad as unknown), `${String(bad)} was accepted`).toBe(false);
    }
  });
});

describe('SRS-201.10 searching the library', () => {
  it('shows everything before a word is typed', () => {
    // An empty search showing nothing would mean the student has to guess a word to see the library at
    // all, which is the opposite of "access the available GIF library".
    expect(searchLibraryGifs('')).toHaveLength(GIF_LIBRARY.length);
    expect(searchLibraryGifs('   ')).toHaveLength(GIF_LIBRARY.length);
  });

  it('matches a name or a keyword, ignoring case', () => {
    expect(searchLibraryGifs('LOL').map((gif) => gif.id)).toContain('lol');
    expect(searchLibraryGifs('laugh').map((gif) => gif.id)).toContain('lol');
    expect(searchLibraryGifs('omw').map((gif) => gif.id)).toContain('on-my-way');
    expect(searchLibraryGifs('celebrate').map((gif) => gif.id)).toContain('confetti');
  });

  it('says nothing rather than everything when no GIF matches', () => {
    expect(searchLibraryGifs('xyzzy')).toEqual([]);
  });
});

describe('SRS-201.10 the library opens from the message picker', () => {
  it('is a second tab beside the emoji list', () => {
    expect(picker).toContain('role="tablist"');
    expect(picker).toContain('>Emoji</button>');
    expect(picker).toContain('>GIF</button>');
  });

  it('lists the library through the same search the tests above cover', () => {
    expect(picker).toContain('searchLibraryGifs(query)');
    expect(picker).toContain('libraryGifSrc(gif.id)');
  });

  it('shows each GIF as an image, so it animates in the grid', () => {
    expect(picker).toMatch(/<img className=\{styles\.gifThumb\}/);
  });

  it('keeps the device upload reachable from the GIF tab', () => {
    // SRS-201.12 lost its icon in the composer when the two were merged; it has to live somewhere.
    expect(picker).toContain('Upload a GIF from this device');
    expect(picker).toContain('onClick={onUploadGif}');
  });
});

describe('SRS-201.10 the composer has one button for both', () => {
  it('names emoji and GIFs on the one toggle', () => {
    expect(page).toContain('aria-label="Choose an emoji or a GIF"');
  });

  it('no longer has a separate GIF icon', () => {
    expect(page).not.toContain('htmlFor="message-gif"');
    expect(page).not.toContain('>Choose a GIF<');
  });

  it('still has the hidden GIF input the upload line clicks', () => {
    expect(page).toContain('id="message-gif"');
    expect(page).toContain('gifInput.current?.click()');
  });
});
