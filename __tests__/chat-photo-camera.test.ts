import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PHOTO_ACCEPT, choosePhoto, photoError } from '../lib/chat-photo';

// SRS-201.19 / SRS-201.20 (#1393): the composer offers a second way to put a photo in a message -- take one
// with the camera -- and what comes back is judged by the same rules as a file chosen from the device.
//
// The camera lives in the conversation page's JSX, which is a client component full of hooks and fetches, so
// there is nothing to render here without a browser. This reads the page instead, the way
// chat-photo-formats.test.ts reads the migration: the point is that the two cannot disagree silently. The
// behaviour the captured file then goes through is exercised for real, against lib/chat-photo.
const page = readFileSync(process.cwd() + '/app/messages/[conversationId]/page.tsx', 'utf8');

// The <input> elements, each flattened onto one line with its attributes. A plain scan beats a regular
// expression here: the onChange arrow contains '>', which any [^>]* pattern would stop at.
const flat = page.replace(/\s+/g, ' ');
function inputTag(id: string): string {
  for (const part of flat.split('<input').slice(1)) {
    const end = part.indexOf('/>');
    if (end === -1) continue;
    const tag = part.slice(0, end + 2);
    if (tag.includes(`id="${id}"`)) return '<input' + tag;
  }
  return '';
}
const cameraInput = inputTag('message-camera');
const photoPickerInput = inputTag('message-photo');

describe('SRS-201.19 open the camera to take a photo', () => {
  it('offers a camera input beside the device picker', () => {
    expect(cameraInput, 'no input with id="message-camera" in the conversation composer').not.toBe('');
    expect(photoPickerInput, 'no input with id="message-photo" in the conversation composer').not.toBe('');
  });

  it('asks the device for its camera', () => {
    // capture="environment" asks a phone for the rear camera directly. A browser without one ignores the
    // hint and opens the picker, which is a reasonable thing for this button to do rather than an error.
    expect(cameraInput).toMatch(/capture="environment"/);
    // The device picker must NOT carry it, or choosing an existing photo would open the camera instead.
    expect(photoPickerInput).not.toMatch(/capture=/);
  });

  it('gives the button a name a screen reader can read', () => {
    expect(page).toMatch(/htmlFor="message-camera"/);
    expect(page).toMatch(/Take a photo/);
  });
});

describe('SRS-201.20 use a photo taken with the camera', () => {
  it('sends the captured file through the same handler as the device picker', () => {
    // Both inputs call reviewPhoto, so a captured photo is judged by SRS-201.4 and SRS-201.5 unchanged.
    expect(cameraInput).toMatch(/onChange=\{\(event\) => reviewPhoto\(event\.target\.files\)\}/);
    expect(photoPickerInput).toMatch(/onChange=\{\(event\) => reviewPhoto\(event\.target\.files\)\}/);
  });

  it('offers the camera the same formats as the picker', () => {
    expect(cameraInput).toMatch(/accept=\{PHOTO_ACCEPT\}/);
    expect(photoPickerInput).toMatch(/accept=\{PHOTO_ACCEPT\}/);
    expect(PHOTO_ACCEPT).toBe('image/png,image/jpeg,image/webp');
  });

  it('clears the camera input as well, so the same photo can be taken again', () => {
    // Without resetting value, re-taking the same photo fires no change event and the composer looks stuck.
    // Both clearPhoto and the refusal path in reviewPhoto have to reach both inputs.
    const resets = [...page.matchAll(/if \(cameraInput\.current\) cameraInput\.current\.value = '';/g)];
    expect(resets.length, 'cameraInput is not reset everywhere photoInput is').toBeGreaterThanOrEqual(2);
    const photoResets = [...page.matchAll(/if \(photoInput\.current\) photoInput\.current\.value = '';/g)];
    expect(resets.length).toBe(photoResets.length);
  });

  it('is disabled while a message is sending, like the picker', () => {
    expect(cameraInput).toMatch(/disabled=\{sending\}/);
  });
});

// The rules a captured photo then meets. These run the real functions, not the page source.
describe('SRS-201.20 a captured photo meets the same rules as a chosen one', () => {
  const captured = (name: string, size: number, type: string) => ({ name, size, type });

  it('accepts a photo the camera produces', () => {
    // A phone camera hands back a JPEG with a generated name; nothing about it is special.
    const file = captured('image.jpg', 2_400_000, 'image/jpeg');
    expect(choosePhoto([file])).toBe(file);
    expect(photoError(file)).toBe(null);
  });

  it('refuses a captured photo over the size limit', () => {
    expect(photoError(captured('image.jpg', 15_000_001, 'image/jpeg'))).toBe('Photos must be 15 MB or smaller.');
  });

  it('refuses a captured format the conversation does not take', () => {
    // Some cameras hand back HEIC; the refusal has to happen whatever the accept hint offered.
    expect(photoError(captured('image.heic', 1_000_000, 'image/heic'))).toBe('Photos must be PNG, JPEG or WebP.');
  });

  it('chooses nothing when the camera is closed without taking a photo', () => {
    expect(choosePhoto([])).toBe(null);
    expect(choosePhoto(null)).toBe(null);
  });
});
