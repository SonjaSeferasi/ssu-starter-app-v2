import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LOOK } from '../lib/profile-space';
import { clearProfileLookDraft, readProfileLookDraft, sameProfileLook, saveProfileLook, writeProfileLookDraft } from '../lib/profile-look-save';

const result=(data:unknown,status=200)=>({response:new Response(null,{status}),data});
const key='profile-covers/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.png';
afterEach(()=>vi.useRealTimers());
describe('confirmed profile saves',()=>{
  it('reads storage again before reporting success',async()=>{
    const request=vi.fn().mockResolvedValueOnce(result({look:DEFAULT_LOOK})).mockResolvedValueOnce(result({look:{stickers:[],layout:'about-first',cover:'meadow',frame:'rounded',palette:'sage'},available:true}));
    expect(await saveProfileLook(DEFAULT_LOOK,request)).toEqual(DEFAULT_LOOK);
    expect(request.mock.calls[0][1].method).toBe('PUT');expect(request.mock.calls[1][1].method).toBeUndefined();
  });
  it('keeps server validation errors and does not claim success',async()=>{
    const request=vi.fn().mockResolvedValue(result({error:'Choose a valid profile look.'},400));
    await expect(saveProfileLook(DEFAULT_LOOK,request)).rejects.toThrow('Choose a valid profile look.');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('detects stale or mismatched persistence',async()=>{
    const request=vi.fn().mockResolvedValueOnce(result({})).mockResolvedValueOnce(result({look:{...DEFAULT_LOOK,palette:'rose'},available:true}));
    await expect(saveProfileLook(DEFAULT_LOOK,request)).rejects.toThrow('didn’t match');
  });
  it('aborts a stalled save while preserving an actionable error',async()=>{
    vi.useFakeTimers();const request=vi.fn((_path:string,_init?:RequestInit)=>new Promise<any>(()=>{}));
    const pending=expect(saveProfileLook(DEFAULT_LOOK,request,100)).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(100);await pending;
    expect(request.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
  it('sends cover photo and decorations together, then verifies the stored key',async()=>{
    const look={...DEFAULT_LOOK,coverKey:key};
    const request=vi.fn().mockResolvedValueOnce(result({look})).mockResolvedValueOnce(result({look,available:true,coverUrl:'https://example.test/signed'}));
    expect(await saveProfileLook(DEFAULT_LOOK,request,1000,new File(['photo'],'photo.png',{type:'image/png'}))).toEqual(look);
    expect(request.mock.calls[0][1].body).toBeInstanceOf(FormData);
    expect(request.mock.calls[0][1].body.get('coverPhoto').name).toBe('photo.png');
  });
  it('compares cover replacements and sticker resizing as real edits',()=>{
    expect(sameProfileLook(DEFAULT_LOOK,{...DEFAULT_LOOK,coverKey:key})).toBe(false);
    const sticker={id:'one',kind:'coffee' as const,x:50,y:50,rotation:0};
    expect(sameProfileLook({...DEFAULT_LOOK,stickers:[sticker]},{...DEFAULT_LOOK,stickers:[{...sticker,scale:1.5}]})).toBe(false);
  });
});
it('recovers drafts per student and clears them after saving or discarding',()=>{
  const store=new Map<string,string>();const storage={getItem:(key:string)=>store.get(key)??null,setItem:(key:string,value:string)=>{store.set(key,value);},removeItem:(key:string)=>{store.delete(key);}};
  writeProfileLookDraft(storage,'linh',DEFAULT_LOOK);
  expect(readProfileLookDraft(storage,'linh')).toEqual(DEFAULT_LOOK);expect(readProfileLookDraft(storage,'alex')).toBeNull();
  clearProfileLookDraft(storage,'linh');expect(readProfileLookDraft(storage,'linh')).toBeNull();
  writeProfileLookDraft(storage,'linh',DEFAULT_LOOK);vi.useFakeTimers();vi.setSystemTime(Date.now()+8*86400000);expect(readProfileLookDraft(storage,'linh')).toBeNull();
});
