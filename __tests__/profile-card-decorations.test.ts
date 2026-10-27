import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK, areaStickers, positionedSticker, profileLookInput, stickerPosition, withAreaStickers, type ProfileLook } from '../lib/profile-space';
import { sameProfileLook, saveProfileLook, readProfileLookDraft, writeProfileLookDraft } from '../lib/profile-look-save';
const sticker=(id:string,x=50,y=50)=>({id,kind:'flower' as const,...positionedSticker({x,y}),rotation:-15,scale:1.4});
const look:ProfileLook={...DEFAULT_LOOK,stickers:[sticker('cover',0,100)],cardStickers:{about:[sticker('about',100,0)],notes:[sticker('notes',4.25,92.5)]},cardFinishes:{about:'paper',notes:'sticky'}};
describe('card decoration persistence',()=>{
  it('accepts edge positions with safe anchors for the existing storage schema',()=>{
    expect(profileLookInput(look)).toEqual(look);
    expect(stickerPosition(look.stickers[0])).toEqual({x:0,y:100});
    expect(look.stickers[0].x).toBe(10);expect(look.stickers[0].y).toBe(80);
    expect(stickerPosition({id:'legacy',kind:'coffee',x:30,y:40,rotation:0})).toEqual({x:30,y:40});
  });
  it('moves a sticker between areas without changing the rest of the look',()=>{
    const moved=withAreaStickers(withAreaStickers(look,'about',[]),'notes',[...areaStickers(look,'notes'),look.cardStickers!.about[0]]);
    expect(profileLookInput(moved).cardStickers?.notes).toHaveLength(2);expect(moved.stickers).toEqual(look.stickers);expect(look.cardStickers?.about).toHaveLength(1);
  });
  it('allows eight per area and rejects excess, duplicate ids, invalid positions and card finishes',()=>{
    expect(profileLookInput({...look,stickers:Array.from({length:8},(_,i)=>sticker(`cover-${i}`)),cardStickers:{about:Array.from({length:8},(_,i)=>sticker(`about-${i}`)),notes:Array.from({length:8},(_,i)=>sticker(`notes-${i}`))}}).cardStickers?.notes).toHaveLength(8);
    for(const bad of [
      {...look,cardStickers:{about:[sticker('cover')],notes:[]}},
      {...look,cardStickers:{about:Array.from({length:9},(_,i)=>sticker(`about-${i}`)),notes:[]}},
      {...look,cardStickers:{about:[sticker('bad',101,50)],notes:[]}},
      {...look,cardStickers:{about:[sticker('bad',50,NaN)],notes:[]}},
      {...look,cardStickers:{about:[sticker('bad',-1,50)],notes:[]}},
      {...look,cardStickers:{about:[],notes:null}},
      {...look,cardFinishes:{about:'javascript',notes:'paper'}},
    ])expect(()=>profileLookInput(bad)).toThrow();
  });
  it('detects card-only movement, resizing, stacking order and finish changes as unsaved edits',()=>{
    expect(sameProfileLook(look,{...look,cardFinishes:{about:'clean',notes:'sticky'}})).toBe(false);
    expect(sameProfileLook(look,{...look,cardStickers:{...look.cardStickers!,about:[sticker('about',90,0)]}})).toBe(false);
    expect(sameProfileLook(look,JSON.parse(JSON.stringify(look)))).toBe(true);
    expect(sameProfileLook(DEFAULT_LOOK,{...DEFAULT_LOOK,cardStickers:{about:[],notes:[]},cardFinishes:{about:'clean',notes:'clean'}})).toBe(true);
  });
  it('confirms card positions after saving and rejects a response that dropped them',async()=>{
    const request=async()=>({response:new Response(),data:{look,available:true}});
    expect(await saveProfileLook(look,request)).toEqual(look);
    await expect(saveProfileLook(look,async()=>({response:new Response(),data:{look:DEFAULT_LOOK,available:true}}))).rejects.toThrow('didn’t match');
  });
  it('restores unsaved card positions from a recovered draft',()=>{
    const data=new Map<string,string>();const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},removeItem:(key:string)=>{data.delete(key);}};
    writeProfileLookDraft(storage,'linh',look);expect(readProfileLookDraft(storage,'linh')).toEqual(look);
  });
});
