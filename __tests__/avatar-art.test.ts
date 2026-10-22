import {readFileSync,existsSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {headStyles,topStyles,bottomStyles,skinTones,topColors,bottomColors,layoutAvatar,parseAvatarManifest,LAYOUT} from '../lib/avatar-layers';

const manifest=parseAvatarManifest(JSON.parse(readFileSync('public/avatars/v2/manifest.json','utf8')))!;
describe('imported avatar collection',()=>{
 it('includes six painted variants for every promised head and clothing style',()=>{
  expect(manifest).not.toBeNull();
  for(const [group,styles] of [['heads',headStyles],['tops',topStyles],['bottoms',bottomStyles]] as const){
   expect(Object.keys(manifest[group]).length).toBe(styles.length);
   for(const style of styles)for(const cell of manifest[group][style.id]){
    expect(existsSync('public'+cell.file)).toBe(true);
    const png=readFileSync('public'+cell.file);
    expect(png.subarray(1,4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(cell.width);expect(png.readUInt32BE(20)).toBe(cell.height);
    expect(png[25]).toBe(6); // RGBA: source magenta is not a runtime background.
    if(group==='heads'){expect(cell.eyes).toHaveLength(4);expect(cell.faceWidth).toBeGreaterThan(0);}
   }
  }
 });
 it('keeps every head, tone and clothing-style combination inside the avatar canvas',()=>{
  for(const [h,head] of headStyles.entries())for(const [i,tone] of skinTones.entries())for(const [t,top] of topStyles.entries())for(const [b,bottom] of bottomStyles.entries()){
   const look={headStyle:head.id,skinTone:tone.id,topStyle:top.id,topColor:topColors[(i+t)%6].id,bottomStyle:bottom.id,bottomColor:bottomColors[(h+b+i)%6].id};
   const layout=layoutAvatar(manifest,look)!;expect(layout,JSON.stringify(look)).not.toBeNull();
   for(const layer of layout.layers){expect(layer.x).toBeGreaterThanOrEqual(0);expect(layer.x+layer.width).toBeLessThanOrEqual(LAYOUT.canvas.width);expect(layer.y).toBeGreaterThanOrEqual(9.99);expect(layer.y+layer.height).toBeLessThanOrEqual(502.01);}
   expect(layout.eyes).toHaveLength(4);
  }
 });
});
