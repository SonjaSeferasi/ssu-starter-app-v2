import { describe, expect, it } from 'vitest';
import { choosePhoto, describeChosenPhoto, formatPhotoSize } from '../lib/chat-photo';

const photo = (name: string, size: number, type = 'image/jpeg') => ({ name, size, type });

describe('SRS-201.3 select a photo for sending', () => {
  it('takes the chosen file from the picker', () => {
    const chosen = choosePhoto([photo('sunset.jpg', 1_200_000)]);
    expect(chosen?.name).toBe('sunset.jpg');
  });

  it('chooses nothing when the picker is cancelled', () => {
    // An <input type="file"> reports an empty list when the student closes the dialog.
    expect(choosePhoto([])).toBe(null);
    expect(choosePhoto(null)).toBe(null);
    expect(choosePhoto(undefined)).toBe(null);
  });

  it('takes only the first file when a picker returns several', () => {
    // A conversation message carries one photo; the picker is single-file, but the list shape
    // allows more, so the rule is stated rather than assumed.
    const chosen = choosePhoto([photo('first.png', 10), photo('second.png', 20)]);
    expect(chosen?.name).toBe('first.png');
  });

  it('reports the size in the same MB the 15 MB limit counts', () => {
    // SRS-201.5 counts 1 MB as 1,000,000 bytes, so what the student reads matches the limit.
    expect(formatPhotoSize(1_200_000)).toBe('1.2 MB');
    expect(formatPhotoSize(15_000_000)).toBe('15 MB');
    expect(formatPhotoSize(999_999)).toBe('1000 KB');
    expect(formatPhotoSize(2_400)).toBe('2 KB');
    expect(formatPhotoSize(512)).toBe('512 B');
  });

  it('does not report a size for a nonsensical byte count', () => {
    expect(formatPhotoSize(-1)).toBe('');
    expect(formatPhotoSize(Number.NaN)).toBe('');
  });

  it('names the chosen photo with its size', () => {
    expect(describeChosenPhoto(photo('sunset.jpg', 1_200_000))).toBe('sunset.jpg, 1.2 MB');
    expect(describeChosenPhoto(null)).toBe('');
  });

  it('falls back to a plain name when the file has none', () => {
    expect(describeChosenPhoto(photo('   ', 2_000_000))).toBe('Photo, 2.0 MB');
  });

  it('accepts a file of any type or size, because that is not this card', () => {
    // SRS-201.4 decides the formats and SRS-201.5 the limit; choosing must not pre-empt either.
    expect(choosePhoto([photo('huge.heic', 90_000_000, 'image/heic')])?.name).toBe('huge.heic');
  });
});
