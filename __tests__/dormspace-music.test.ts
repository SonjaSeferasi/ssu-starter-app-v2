import { expect, it } from 'vitest';
import { isMp3 } from '../lib/dormspace-music';

it('accepts MPEG Layer III frames and skips bounded ID3 metadata', () => {
  const frame = new Uint8Array(128); frame.set([0xff, 0xfb, 0x90, 0]);
  expect(isMp3(frame)).toBe(true);
  const tagged = new Uint8Array(160); tagged.set([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 10]);
  tagged.set(frame, 20); expect(isMp3(tagged)).toBe(true);
});
it('rejects empty, renamed documents, invalid ID3 lengths and non-MP3 frames', () => {
  expect(isMp3(new Uint8Array(0))).toBe(false);
  expect(isMp3(new TextEncoder().encode('<html>This is not a music file even if renamed as music.mp3</html>'))).toBe(false);
  const bad = new Uint8Array(128); bad.set([0x49, 0x44, 0x33, 4, 0, 0, 255, 0, 0, 0]);
  expect(isMp3(bad)).toBe(false);
  bad.set([0xff, 0xfb, 0xf0, 0]); expect(isMp3(bad)).toBe(false);
});
