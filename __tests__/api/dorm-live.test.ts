import {beforeEach,expect,it,vi} from 'vitest';
const {client,user,rpc}=vi.hoisted(()=>({client:vi.fn(),user:vi.fn(),rpc:vi.fn()}));
vi.mock('../../lib/supabase',()=>({getSupabaseClient:client}));
import {POST} from '../../app/api/dorm/live/route';
const session='11111111-1111-4111-8111-111111111111',connection='22222222-2222-4222-8222-222222222222';
const token='header.'+Buffer.from(JSON.stringify({iat:1792470000,session_id:session})).toString('base64url')+'.signature';
const state={x:20,y:20,facing:'down',moving:false,sprinting:false,restItemId:null};
const request=(body:object,authenticated=true)=>new Request('http://localhost/api/dorm/live',{method:'POST',headers:{'content-type':'application/json',...(authenticated?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','local-test');client.mockReturnValue({auth:{getUser:user},rpc});
  user.mockResolvedValue({data:{user:{id:'verified-account',email_confirmed_at:'2026-10-19'}},error:null});
  rpc.mockImplementation(async(name:string)=>({data:name==='socialu_session_guard'?true:{space:'hall:1'},error:null}));});
it('uses only the verified user and session and discards forged identity and avatar fields',async()=>{
  expect((await POST(request({action:'join',connectionId:connection,location:{kind:'hall',floor:1},state,username:'Impersonated',p_auth_id:'victim',look:{},sessionId:'fake'}))).status).toBe(200);
  expect(rpc).toHaveBeenCalledWith('socialu_dormspace_live',{p_auth_id:'verified-account',p_session:session,p_connection:connection,p_action:'join',p_location:{kind:'hall',floor:1},p_data:{state,sequence:0,snapshot:false}});
});
it.each([{x:Infinity},{y:-1},{facing:'front'},{moving:'true'},{sprinting:null},{restItemId:'bad'},{username:'spoof'}])('rejects malformed player state %j',async patch=>{
  expect((await POST(request({action:'update',connectionId:connection,state:{...state,...patch},sequence:1}))).status).toBe(400);
  expect(rpc.mock.calls.some(([name])=>name==='socialu_dormspace_live')).toBe(false);
});
it.each([{kind:'hall',floor:0},{kind:'hall',floor:1.5},{kind:'hall',floor:1000},{kind:'room',owner:''},{kind:'other'}])('rejects an invalid location %j',async location=>{
  expect((await POST(request({action:'join',connectionId:connection,location,state}))).status).toBe(400);
});
it.each(['','   ','a'.repeat(201)])('rejects empty or oversized chat',async text=>{
  expect((await POST(request({action:'say',connectionId:connection,messageId:connection,text}))).status).toBe(400);
});
it.each([['42501',403],['DS409',409],['DS410',409],['DS429',429],['DS400',400],['PGRST202',503]])('reports %s without claiming an unsent message succeeded',async(code,status)=>{
  rpc.mockImplementation(async(name:string)=>name==='socialu_session_guard'?{data:true,error:null}:{data:null,error:{code,message:'Student-facing error'}});
  const response=await POST(request({action:'say',connectionId:connection,messageId:connection,text:'Hello'}));expect(response.status).toBe(status);
  expect(response.headers.get('cache-control')).toBe('no-store');
});
it('requires a verified session before joining',async()=>{expect((await POST(request({action:'join',connectionId:connection,state,location:{kind:'hall',floor:1}},false))).status).toBe(401);});
