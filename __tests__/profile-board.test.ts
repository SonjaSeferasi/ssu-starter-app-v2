import {describe,expect,it} from 'vitest';
import {boardInput} from '../lib/profile-board';
import {DEFAULT_LOOK,profileLookInput} from '../lib/profile-space';
import {profileCategories} from '../components/profile/profile-content-tabs';
const note={id:'note-1',kind:'note' as const,x:12.5,y:30,width:28,rotation:-4,text:'One step at a time',color:'pink' as const};
describe('Profile scrapbook board',()=>{
 it('keeps fractional positions, rotation and content through look validation',()=>{
  expect(profileLookInput({...DEFAULT_LOOK,board:{items:[note]}}).board).toEqual({items:[note]});
 });
 it('preserves all existing content tabs and exposes boards to visitors',()=>{
  expect(profileCategories(true)).toEqual(['posts','board','tagged','saved']);
  expect(profileCategories(false)).toEqual(['posts','board','tagged']);
 });
 it.each([{x:-1},{x:90},{y:99},{width:45},{rotation:Infinity},{sticker:'unsafe',kind:'sticker'},{memoryId:-1,kind:'photo'}])('rejects invalid placement and content %j',patch=>{
  expect(()=>boardInput({items:[{...note,...patch}]})).toThrow();
 });
 it('limits item counts, duplicate IDs and oversized notes',()=>{
  expect(()=>boardInput({items:Array.from({length:21},(_,i)=>({...note,id:`n-${i}`}))})).toThrow();
  expect(()=>boardInput({items:[note,note]})).toThrow();
  expect(()=>boardInput({items:[{...note,text:'x'.repeat(161)}]})).toThrow();
 });
 it('rejects executable project links and validates Spotify destinations',()=>{
  expect(()=>boardInput({items:[{...note,kind:'project',url:'javascript:alert(1)'}]})).toThrow();
  expect(()=>boardInput({items:[{...note,kind:'music',url:'https://evil.example/track/123'}]})).toThrow();
  expect(boardInput({items:[{...note,kind:'music',url:'https://open.spotify.com/track/1234567890123456789012?si=test'}]}).items[0].url).toBe('https://open.spotify.com/track/1234567890123456789012');
 });
});
