import { describe, expect, it } from 'vitest';
import { applySenderPhotoUrls } from '../lib/chat-sender-photos';

const signed = new Map([
  ['profile/7/face.jpg', 'https://example.test/signed/face?token=abc'],
]);

describe('#1282 (SRS-211.2) turning a sender photo key into a link', () => {
  it('gives a sender with a photo its signed link', () => {
    const out = applySenderPhotoUrls({ '7': { name: 'Test1', username: 'test1', photo_key: 'profile/7/face.jpg' } }, signed);
    expect(out['7']).toEqual({ name: 'Test1', username: 'test1', photo_url: 'https://example.test/signed/face?token=abc' });
  });

  it('never lets the storage key reach the response', () => {
    // The bucket is private. A key in the browser is useless at best and a leak at worst, so it is replaced
    // rather than added beside -- which is why this asserts the absence of the property, not its value.
    const out = applySenderPhotoUrls({ '7': { name: 'Test1', username: 'test1', photo_key: 'profile/7/face.jpg' } }, signed);
    expect(out['7']).not.toHaveProperty('photo_key');
    expect(JSON.stringify(out)).not.toContain('profile/7/face.jpg');
  });

  it('gives a sender with no photo a null, so the page can show its placeholder', () => {
    const out = applySenderPhotoUrls({ '8': { name: 'Test 2', username: 'test2', photo_key: null } }, signed);
    expect(out['8']).toEqual({ name: 'Test 2', username: 'test2', photo_url: null });
  });

  it('treats a key that could not be signed as no photo rather than failing', () => {
    // One missing avatar is a placeholder. An error would be the whole conversation not loading.
    const out = applySenderPhotoUrls({ '9': { name: 'Gone', username: 'gone', photo_key: 'profile/9/missing.jpg' } }, signed);
    expect(out['9'].photo_url).toBeNull();
  });

  it('keeps every sender, so nobody loses their name over a photo', () => {
    const out = applySenderPhotoUrls({
      '7': { name: 'Test1', username: 'test1', photo_key: 'profile/7/face.jpg' },
      '8': { name: 'Test 2', username: 'test2' },
      '9': { name: 'Gone', username: 'gone', photo_key: 'profile/9/missing.jpg' },
    }, signed);
    expect(Object.keys(out).sort()).toEqual(['7', '8', '9']);
    expect(out['8'].photo_url).toBeNull();
  });

  it('handles an empty map without inventing anything', () => {
    expect(applySenderPhotoUrls({}, signed)).toEqual({});
  });
});
