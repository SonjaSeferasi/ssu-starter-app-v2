import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LOOK, profileLookInput, helloText } from '../../lib/profile-space';
import { findStickers, STICKER_CATALOG } from '../../lib/profile-stickers';
const { getClient,getUser,rpc }=vi.hoisted(()=>({getClient:vi.fn(),getUser:vi.fn(),rpc:vi.fn()}));
vi.mock('../../lib/supabase',()=>({getSupabaseClient:getClient}));
import { GET,PUT,POST,DELETE,PATCH } from '../../app/api/profiles/space/route';
const user={id:'auth-1',email_confirmed_at:'2026-10-08T12:00:00Z'};
const token='header.'+Buffer.from(JSON.stringify({iat:1791849600,session_id:'11111111-1111-4111-8111-111111111111'})).toString('base64url')+'.signature';
let result:{data:unknown;error:unknown};
const request=(method='GET',body?:unknown)=>new Request('http://localhost/api/profiles/space?username=alex',{
  method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),
});
beforeEach(()=>{
  vi.resetAllMocks();vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','test-key');
  getClient.mockReturnValue({auth:{getUser},rpc});getUser.mockResolvedValue({data:{user},error:null});
  result={data:{look:DEFAULT_LOOK,notes:[]},error:null};
  rpc.mockImplementation(async(fn:string)=>fn==='socialu_session_guard'?{data:true,error:null}:result);
});
describe('profile space API',()=>{
  it('reads the selected profile without caching',async()=>{
    const response=await GET(request());expect(response.status).toBe(200);expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(rpc).toHaveBeenCalledWith('socialu_profile_space',{p_auth_id:user.id,p_action:'read',p_username:'alex'});
  });
  it('saves decorations only for the verified caller and strips extra fields',async()=>{
    expect((await PUT(request('PUT',{look:{...DEFAULT_LOOK,unsafe:'<script>'},username:'not-me'}))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_profile_space',{p_auth_id:user.id,p_action:'save_look',p_look:DEFAULT_LOOK});
  });
  it('accepts a classmate hello and trims it',async()=>{
    expect((await POST(request('POST',{username:'alex',text:' Good luck today! ',authorId:'forged'}))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_profile_space',{p_auth_id:user.id,p_action:'add_note',p_username:'alex',p_text:'Good luck today!',p_color:'yellow',p_doodle:'none'});
  });
  it('passes the chosen note color and doodle, and rejects unknown ones',async()=>{
    expect((await POST(request('POST',{username:'alex',text:'Study crew soon?',color:'green',doodle:'smile'}))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_profile_space',{p_auth_id:user.id,p_action:'add_note',p_username:'alex',p_text:'Study crew soon?',p_color:'green',p_doodle:'smile'});
    expect((await POST(request('POST',{username:'alex',text:'Hi',color:'url(evil)'}))).status).toBe(400);
    expect((await POST(request('POST',{username:'alex',text:'Hi',doodle:'skull'}))).status).toBe(400);
  });
  it.each(['','   ','x'.repeat(161),null])('rejects invalid notes before writing: %j',async text=>{
    expect((await POST(request('POST',{username:'alex',text}))).status).toBe(400);
    expect(rpc.mock.calls.some(([fn])=>fn==='socialu_profile_space')).toBe(false);
  });
  it('validates note ids and delegates removal permissions to storage',async()=>{
    expect((await DELETE(request('DELETE',{username:'alex',noteId:-1}))).status).toBe(400);
    expect((await DELETE(request('DELETE',{username:'alex',noteId:2}))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_profile_space',{p_auth_id:user.id,p_action:'remove_note',p_username:'alex',p_note_id:2});
  });
  it('keeps local migrations in honest preview mode',async()=>{
    result={data:null,error:{code:'PGRST202'}};
    expect(await(await GET(request())).json()).toEqual({look:DEFAULT_LOOK,notes:[],available:false});
    for(const response of [await PUT(request('PUT',{look:DEFAULT_LOOK})),await POST(request('POST',{username:'alex',text:'Hi'})),await DELETE(request('DELETE',{username:'alex',noteId:2}))]) {
      expect(response.status).toBe(503);expect((await response.json()).code).toBe('SPACE_PREVIEW');
    }
  });
  it.each([['P0002',404],['42501',403],['P0001',429]])('maps %s to %i',async(code,status)=>{
    result={data:null,error:{code}};expect((await POST(request('POST',{username:'alex',text:'Hi'}))).status).toBe(status);
  });
  it('rejects signed-out reads',async()=>expect((await GET(new Request('http://localhost/api/profiles/space'))).status).toBe(401));
});
describe('profile look validation',()=>{
  const sticker={id:'one',kind:'coffee',x:50,y:50,rotation:0};
  it('keeps a resized sticker and drops the default size so older looks stay identical',()=>{
    expect(profileLookInput({...DEFAULT_LOOK,stickers:[{...sticker,scale:1.5}]}).stickers[0].scale).toBe(1.5);
    expect(profileLookInput({...DEFAULT_LOOK,stickers:[{...sticker,scale:1}]}).stickers[0]).not.toHaveProperty('scale');
  });
  it('accepts a look and strips unknown properties',()=>{
    expect(profileLookInput({...DEFAULT_LOOK,stickers:[{...sticker,extra:'unused'}],extra:1})).toEqual({...DEFAULT_LOOK,stickers:[sticker]});
  });
  it.each([
    {...DEFAULT_LOOK,palette:'neon'}, {...DEFAULT_LOOK,frame:'arbitrary'}, {...DEFAULT_LOOK,stickers:null},
    {...DEFAULT_LOOK,stickers:Array(9).fill(sticker)}, {...DEFAULT_LOOK,stickers:[sticker,sticker]},
    {...DEFAULT_LOOK,stickers:[{...sticker,x:0}]}, {...DEFAULT_LOOK,stickers:[{...sticker,y:99}]},
    {...DEFAULT_LOOK,stickers:[{...sticker,x:'50'}]}, {...DEFAULT_LOOK,stickers:[{...sticker,rotation:Infinity}]},
    {...DEFAULT_LOOK,stickers:[{...sticker,kind:'<img>'}]},
    {...DEFAULT_LOOK,stickers:[{...sticker,scale:0.2}]}, {...DEFAULT_LOOK,stickers:[{...sticker,scale:3}]}, {...DEFAULT_LOOK,stickers:[{...sticker,scale:'2'}]},
  ])('rejects unsafe or out-of-bounds decoration: %j',look=>expect(()=>profileLookInput(look)).toThrow());
  it('keeps hello text plain text for React to escape',()=>expect(helloText('<b>Hello</b>')).toBe('<b>Hello</b>'));
  it('finds stickers by category and case-insensitive names or aliases',()=>{
    expect(findStickers('animals','').map(sticker=>sticker.kind)).toEqual(['cat','puppy','frog','bunny','dragon','dinosaur','wolf']);
    expect(findStickers('food','BOBA').map(sticker=>sticker.kind)).toEqual(['bubble_tea']);
    expect(findStickers('all','  roller skate ').map(sticker=>sticker.kind)).toEqual(['roller_skate']);
    expect(findStickers('animals','ramen')).toEqual([]);
    expect(findStickers('all','')).toHaveLength(90);
    expect(new Set(STICKER_CATALOG.map(sticker=>sticker.kind)).size).toBe(90);
    expect(findStickers('tech','controller').map(sticker=>sticker.kind)).toEqual(['navy_controller']);
    expect(findStickers('outdoors','camp').map(sticker=>sticker.kind)).toEqual(['campfire','camping_tent']);
  });
});

describe('Board publishing',()=>{
 const board={items:[{id:'note-one',kind:'note',x:20,y:22,width:28,rotation:-3,text:'Small wins',color:'pink'}]};
 it('merges the board into the latest owner look and confirms the persisted value',async()=>{
  let latest:any={...DEFAULT_LOOK,hometown:'Salem'};
  rpc.mockImplementation(async(fn,args)=>{
   if(fn==='socialu_session_guard')return {data:true,error:null};
   if(args.p_action==='save_look')latest=args.p_look;
   // Simulate JSONB key ordering in the database response.
   return {data:{look:{...latest,...(latest.board?{board:{items:latest.board.items.map((item:any)=>Object.fromEntries(Object.entries(item).reverse()))}}:{})},notes:[]},error:null};
  });
  const response=await PATCH(request('PATCH',{field:'board',value:board,username:'not-the-owner'}));
  expect(response.status).toBe(200);expect(latest.hometown).toBe('Salem');expect(latest.board).toEqual(board);
  expect(rpc).toHaveBeenCalledWith('socialu_profile_space',{p_auth_id:user.id,p_action:'save_look',p_look:latest});
 });
 it('does not claim success if storage drops the board',async()=>{
  const response=await PATCH(request('PATCH',{field:'board',value:board}));expect(response.status).toBe(503);
 });
 it('rejects invalid board content before any space write',async()=>{
  const response=await PATCH(request('PATCH',{field:'board',value:{items:[{...board.items[0],kind:'project',url:'javascript:alert(1)'}]}}));
  expect(response.status).toBe(400);expect(rpc.mock.calls.some(([fn,args])=>fn==='socialu_profile_space'&&args.p_action==='save_look')).toBe(false);
 });
});
