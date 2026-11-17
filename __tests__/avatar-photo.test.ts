import { describe,expect,it } from 'vitest';
import { faceCrop,validFaceCrop,validatePhotoFile } from '../lib/avatar-photo';
describe('SRS-609 input and crop',()=>{
  it.each(['jpg','jpeg','png','webp','heic'])('accepts %s at exactly 10 MB',extension=>{
    expect(()=>validatePhotoFile({name:`photo.${extension}`,size:10_000_000})).not.toThrow();
  });
  it('rejects one byte above the limit, empty and unsupported files',()=>{
    expect(()=>validatePhotoFile({name:'photo.jpg',size:10_000_001})).toThrow('10 MB');
    expect(()=>validatePhotoFile({name:'photo.png',size:0})).toThrow('empty');
    expect(()=>validatePhotoFile({name:'photo.svg',size:100})).toThrow('JPG');
  });
  it('keeps resized/repositioned square crops inside portrait and landscape photos',()=>{
    for(const [w,h] of [[1200,800],[800,1200]]) for(const zoom of [1,2,4]) for(const x of [0,.5,1]) for(const y of [0,.5,1]) {
      const c=faceCrop(w,h,zoom,x,y);expect(validFaceCrop(c)).toBe(true);expect(c.width*w).toBeCloseTo(c.height*h);
    }
  });
  it.each([null,{}, {x:0,y:0,width:0,height:1},{x:.5,y:0,width:1,height:1},{x:NaN,y:0,width:1,height:1}])('rejects malformed crops %j',crop=>expect(validFaceCrop(crop)).toBe(false));
});
