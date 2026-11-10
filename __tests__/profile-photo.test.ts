import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareProfilePhoto, PROFILE_UPLOAD_MAX_BYTES } from '../lib/account/profile-photo';
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
    expect(prepared.size).toBeLessThanOrEqual(PROFILE_UPLOAD_MAX_BYTES);
    expect([canvas.width, canvas.height]).toEqual([1200, 800]);
    expect(close).toHaveBeenCalled();
  });
  it('accepts a small HEIC when the browser cannot decode it', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('unsupported')));
    const file=photo(100,'photo.heic'); expect(await prepareProfilePhoto(file)).toBe(file);
  });
  it('uses the image decoder when bitmap decoding is unavailable and releases the temporary URL', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('unsupported')));
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:photo', revokeObjectURL: revoke });
    vi.stubGlobal('Image', class {
      naturalWidth = 400; naturalHeight = 600;
      onload = () => {};
      set src(value: string) { this.onload(); }
    });
    const file = photo(100);
    expect(await prepareProfilePhoto(file)).toBe(file);
    expect(revoke).toHaveBeenCalledWith('blob:photo');
  });
  it('converts a decodable HEIC to JPG even when it is small', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 400, height: 600, close }));
    vi.stubGlobal('document', { createElement: () => ({
      getContext: () => ({ fillRect: vi.fn(), drawImage: vi.fn() }),
      toBlob: (callback: (blob: Blob) => void) => callback(new Blob(['jpg'], { type: 'image/jpeg' })),
    }) });
    const result = await prepareProfilePhoto(photo(100, 'portrait.heic'));
    expect(result.name).toBe('portrait.jpg');
    expect(result.type).toBe('image/jpeg');
    expect(close).toHaveBeenCalledOnce();
  });
  it('re-encodes a small-dimension photo that is too large for the upload limit', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 1200, height: 1200, close }));
    vi.stubGlobal('document', { createElement: () => ({
      getContext: () => ({ fillRect: vi.fn(), drawImage: vi.fn() }),
      toBlob: (callback: (blob: Blob) => void) => callback(new Blob(['jpg'], { type: 'image/jpeg' })),
    }) });
    const result = await prepareProfilePhoto(photo(6_000_000, 'screenshot.png'));
    expect(result.name).toBe('screenshot.jpg');
    expect(result.size).toBeLessThanOrEqual(PROFILE_UPLOAD_MAX_BYTES);
  });
  it('rejects an undecodable HEIC that is too large to upload', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('unsupported')));
    await expect(prepareProfilePhoto(photo(6_000_000, 'photo.heic'))).rejects.toThrow('Export it as JPG or PNG');
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
  it('compresses a 2 MB photo and lowers quality when the first JPEG remains too large', async () => {
    const close=vi.fn();
    vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:1200,height:800,close}));
    const toBlob=vi.fn((callback:(blob:Blob)=>void,_type:string,quality:number)=>callback(
      new Blob([new Uint8Array(quality>0.7?1_100_000:800_000)],{type:'image/jpeg'})
    ));
    vi.stubGlobal('document',{createElement:()=>({getContext:()=>({fillRect:vi.fn(),drawImage:vi.fn()}),toBlob})});
    const result=await prepareProfilePhoto(photo(2_000_000,'camera.png'));
    expect(result.size).toBe(800_000);expect(result.name).toBe('camera.jpg');
    expect(toBlob.mock.calls.map(call=>call[2])).toEqual([0.85,0.7]);
    expect(close).toHaveBeenCalledOnce();
  });
  it('reduces dimensions after quality attempts and preserves the original aspect ratio', async () => {
    const bitmap={width:2400,height:1200,close:vi.fn()};
    vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue(bitmap));
    const drawImage=vi.fn();let attempt=0;
    const canvas={width:0,height:0,getContext:()=>({fillRect:vi.fn(),drawImage}),
      toBlob:(callback:(blob:Blob)=>void)=>callback(new Blob([new Uint8Array(++attempt<=3?1_100_000:600_000)],{type:'image/jpeg'}))};
    vi.stubGlobal('document',{createElement:()=>canvas});
    const result=await prepareProfilePhoto(photo(8_000_000));
    expect(result.size).toBe(600_000);
    expect([canvas.width,canvas.height]).toEqual([900,450]);
    expect(drawImage.mock.calls).toEqual([[bitmap,0,0,1200,600],[bitmap,0,0,900,450]]);
  });
  it('never returns an oversized file if the browser cannot compress it enough', async () => {
    const close=vi.fn();vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:2000,height:2000,close}));
    const toBlob=vi.fn((callback:(blob:Blob)=>void)=>callback(new Blob([new Uint8Array(1_000_001)],{type:'image/jpeg'})));
    vi.stubGlobal('document',{createElement:()=>({getContext:()=>({fillRect:vi.fn(),drawImage:vi.fn()}),toBlob})});
    await expect(prepareProfilePhoto(photo(2_000_000))).rejects.toThrow('smaller JPG');
    expect(toBlob).toHaveBeenCalledTimes(15);expect(close).toHaveBeenCalledOnce();
  });
  it('does not upscale small images or label a browser PNG result as a JPEG', async () => {
    const close=vi.fn();vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:200,height:100,close}));
    const canvas={width:0,height:0,getContext:()=>({fillRect:vi.fn(),drawImage:vi.fn()}),
      toBlob:(callback:(blob:Blob)=>void)=>callback(new Blob(['png'],{type:'image/png'}))};
    vi.stubGlobal('document',{createElement:()=>canvas});
    await expect(prepareProfilePhoto(photo(2_000_000))).rejects.toThrow('could not prepare a JPG');
    expect([canvas.width,canvas.height]).toEqual([200,100]);expect(close).toHaveBeenCalledOnce();
  });
});
