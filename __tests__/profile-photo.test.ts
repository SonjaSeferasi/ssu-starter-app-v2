import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareProfilePhoto } from '../lib/account/profile-photo';
afterEach(() => vi.unstubAllGlobals());
const photo = (size: number, name = 'photo.png') => new File([new Uint8Array(size)], name, { type: 'image/png' });
describe('Profile photo preparation', () => {
  it('rejects unsupported and empty files', async () => {
    await expect(prepareProfilePhoto(photo(1, 'photo.exe'))).rejects.toThrow('Choose a JPG');
    await expect(prepareProfilePhoto(photo(0))).rejects.toThrow('empty');
  });
  it('preserves a small photo and releases its bitmap', async () => {
    const close = vi.fn(); vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 400, height: 600, close }));
    const file = photo(100);
    expect(await prepareProfilePhoto(file)).toBe(file);
    expect(close).toHaveBeenCalled();
  });
  it('resizes a large photo with its aspect ratio preserved', async () => {
    const close = vi.fn(); const drawImage = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 6000, height: 4000, close }));
    const canvas = { width: 0, height: 0, getContext: () => ({ fillRect: vi.fn(), drawImage }), toBlob: (cb: (blob: Blob) => void) => cb(new Blob(['compressed'], { type: 'image/jpeg' })) };
    vi.stubGlobal('document', { createElement: () => canvas });
    const prepared = await prepareProfilePhoto(photo(11_000_000));
    expect(prepared.type).toBe('image/jpeg'); expect(prepared.name).toBe('photo.jpg');
    expect(prepared.size).toBeLessThan(10_000_000);
    expect([canvas.width, canvas.height]).toEqual([1600, 1067]);
    expect(close).toHaveBeenCalled();
  });
  it('accepts a small HEIC when the browser cannot decode it', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('unsupported')));
    const file=photo(100,'photo.heic'); expect(await prepareProfilePhoto(file)).toBe(file);
  });
  it('explains how to handle an undecodable large HEIC', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('unsupported')));
    await expect(prepareProfilePhoto(photo(11_000_000,'photo.heic'))).rejects.toThrow('Export it as JPG or PNG');
  });
  it('releases the bitmap if conversion fails', async () => {
    const close = vi.fn(); vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 3000, height: 3000, close }));
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => null }) });
    await expect(prepareProfilePhoto(photo(100))).rejects.toThrow('Unable to prepare');
    expect(close).toHaveBeenCalled();
  });
});
