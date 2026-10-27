import {beforeEach,expect,it,vi} from 'vitest';
import {DEFAULT_LOOK} from '../../lib/profile-space';
const {getClient,getUser,rpc}=vi.hoisted(()=>({getClient:vi.fn(),getUser:vi.fn(),rpc:vi.fn()}));
vi.mock('../../lib/supabase',()=>({getSupabaseClient:getClient}));
import {PATCH} from '../../app/api/profiles/space/route';
const user={id:'auth-1',email_confirmed_at:'2026-10-08T12:00:00Z'};
const token='header.'+Buffer.from(JSON.stringify({iat:1791849600,session_id:'11111111-1111-4111-8111-111111111111'})).toString('base64url')+'.signature';
const request=(body:unknown)=>new Request('http://localhost/api/profiles/space',{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
let stored:any;
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','test-key');stored={...DEFAULT_LOOK,theme:'pixel',frame:'circle',cardFinishes:{about:'paper',notes:'sticky'},cornerArtwork:{poll:['coffee','books'],plan:'gamepad'}};getClient.mockReturnValue({auth:{getUser},rpc});getUser.mockResolvedValue({data:{user},error:null});rpc.mockImplementation(async(fn,args)=>{if(fn==='socialu_session_guard')return {data:true,error:null};if(args.p_action==='save_look')stored=args.p_look;return {data:{look:stored,notes:[]},error:null};});});
it('changes only the verified owner’s poll stickers, preserving the latest theme, frames and plan sticker',async()=>{
  const response=await PATCH(request({card:'poll',stickers:['cat','planet'],username:'victim',authId:'forged'}));
  expect(response.status).toBe(200);expect((await response.json()).look).toEqual({...stored,cornerArtwork:{poll:['cat','planet'],plan:'gamepad'}});
  expect(stored.theme).toBe('pixel');expect(stored.frame).toBe('circle');expect(stored.cardFinishes).toEqual({about:'paper',notes:'sticky'});
  for(const [fn,args] of rpc.mock.calls.filter(([fn])=>fn!=='socialu_session_guard')){expect(fn).toBe('socialu_profile_space');expect(args.p_auth_id).toBe(user.id);expect(args.p_username).toBeUndefined();}
});
it('changes the plan sticker without changing poll stickers',async()=>{
  expect((await PATCH(request({card:'plan',sticker:'camera'}))).status).toBe(200);expect(stored.cornerArtwork).toEqual({poll:['coffee','books'],plan:'camera'});
});
it.each([{card:'poll',stickers:['cat']},{card:'poll',stickers:['cat','script']},{card:'plan',sticker:'<img>'},{card:'other',sticker:'cat'}])('rejects malformed sticker choices before storage',async body=>{
  expect((await PATCH(request(body))).status).toBe(400);expect(rpc.mock.calls.some(([fn])=>fn==='socialu_profile_space')).toBe(false);
});
it('does not report success if storage drops the selected stickers',async()=>{
  rpc.mockImplementation(async(fn)=>fn==='socialu_session_guard'?{data:true,error:null}:{data:{look:stored,notes:[]},error:null});
  const response=await PATCH(request({card:'plan',sticker:'cat'}));expect(response.status).toBe(503);
});
it('requires sign-in',async()=>{expect((await PATCH(new Request('http://localhost/api/profiles/space',{method:'PATCH',body:'{}'}))).status).toBe(401);});

it('saves and clears the caller’s hometown while preserving stickers and themes',async()=>{
  expect((await PATCH(request({field:'hometown',value:' Hanoi, Vietnam ',username:'victim'}))).status).toBe(200);
  expect(stored.hometown).toBe('Hanoi, Vietnam');expect(stored.theme).toBe('pixel');expect(stored.cornerArtwork.plan).toBe('gamepad');
  expect((await PATCH(request({field:'hometown',value:'   '}))).status).toBe(200);expect(stored.hometown).toBe('');
});
it.each([null,123,'x'.repeat(81)])('rejects an invalid hometown before writing',async value=>{
  expect((await PATCH(request({field:'hometown',value}))).status).toBe(400);expect(rpc.mock.calls.some(([fn])=>fn==='socialu_profile_space')).toBe(false);
});

it('saves and clears the selected country flag with the hometown',async()=>{
  expect((await PATCH(request({field:'hometown',value:' Hanoi ',countryCode:'vn'}))).status).toBe(200);expect(stored.hometown).toBe('Hanoi');expect(stored.homeCountry).toBe('VN');
  expect((await PATCH(request({field:'hometown',value:'',countryCode:''}))).status).toBe(200);expect(stored.hometown).toBe('');expect(stored.homeCountry).toBe('');
});
it.each(['ZZ','<script>',123,null])('rejects unsupported country flags before storage',async countryCode=>{
  expect((await PATCH(request({field:'hometown',value:'Hanoi',countryCode}))).status).toBe(400);expect(rpc.mock.calls.some(([fn])=>fn==='socialu_profile_space')).toBe(false);
});
