import {readFileSync,existsSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {avatarStyleGroup,headStyles,topStyles,bottomStyles,skinTones,topColors,bottomColors,layoutAvatar,parseAvatarManifest,LAYOUT} from '../lib/avatar-layers';

const manifest=parseAvatarManifest(JSON.parse(readFileSync('public/avatars/v2/manifest.json','utf8')))!;
describe('imported avatar collection',()=>{
 it('separates male and female styles without adding account identity fields',()=>{
  expect(headStyles.filter(h=>avatarStyleGroup(h.id)==='male').map(h=>h.id)).toEqual(['short-waves','curls','coils','locs','fade']);
  expect(headStyles.filter(h=>avatarStyleGroup(h.id)==='female'&&h.kind==='hair')).toHaveLength(6);
  expect(headStyles.filter(h=>h.kind==='hijab').every(h=>avatarStyleGroup(h.id)==='female')).toBe(true);
 });
 it('keeps the head, waist and feet stable when changing clothing styles',()=>{
  for(const head of headStyles)for(const tone of skinTones){
   let baseline:ReturnType<typeof layoutAvatar>=null;
   for(const top of topStyles)for(const bottom of bottomStyles){
    const layout=layoutAvatar(manifest,{headStyle:head.id,skinTone:tone.id,topStyle:top.id,topColor:'navy',bottomStyle:bottom.id,bottomColor:'light-denim'})!;
    if(!baseline)baseline=layout;
    expect(layout.head).toEqual(baseline.head);expect(layout.eyes).toEqual(baseline.eyes);
    const pants=layout.layers[0],before=baseline.layers[0];
    expect(pants.y+pants.height).toBeCloseTo(before.y+before.height,6);
    // Legs may be wide, but must not become longer simply because of the cut.
    expect(pants.height).toBeLessThan(260);
   }
  }
 });
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
