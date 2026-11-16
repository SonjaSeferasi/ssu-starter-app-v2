import {beforeEach,describe,expect,it,vi} from 'vitest';
const {verified,rpc}=vi.hoisted(()=>({verified:vi.fn(),rpc:vi.fn()}));
vi.mock('../../lib/socialu-account',async original=>({...await original<typeof import('../../lib/socialu-account')>(),verifiedUser:verified,accountClient:()=>({rpc})}));
import {AccountError} from '../../lib/socialu-account';
import {GET,POST} from '../../app/api/account/login-activity/route';
import {loginHistory} from '../../lib/login-activity';
beforeEach(()=>{vi.resetAllMocks();verified.mockResolvedValue({id:'owner'});rpc.mockResolvedValue({data:{entries:[]},error:null});});
it('authorizes options only with a known caller session and other active rows',async()=>{
 const entries=[{id:'1',active:true,is_current:true},{id:'2',active:true,is_current:false},{id:'3',active:false,is_current:false}];
 rpc.mockResolvedValue({data:{entries},error:null});
 expect((await loginHistory('owner',null,'current')).entries.map(e=>e.can_end)).toEqual([false,true,false]);
 expect((await loginHistory('owner',null,null)).entries.every(e=>e.can_end===false)).toBe(true);
});
describe('SRS-107.1 Login Activity',()=>{
 it('uses verified identity and never accepts an owner from the URL',async()=>{
  const response=await GET(new Request('http://localhost/api/account/login-activity?auth_user_id=other'));
  expect(response.status).toBe(200);expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(rpc).toHaveBeenCalledWith('socialu_login_history',{p_auth_id:'owner',p_before_at:null,p_before_id:null,p_current_session:null});
 });
 it.each([401,403])('rejects unauthorized access (%s)',async status=>{verified.mockRejectedValue(new AccountError('Denied',status));expect((await GET(new Request('http://localhost/api/account/login-activity'))).status).toBe(status);expect(rpc).not.toHaveBeenCalled();});
 it('reports missing storage as an error, never an empty history',async()=>{rpc.mockResolvedValue({error:{code:'PGRST202'}});const r=await GET(new Request('http://localhost/api/account/login-activity'));expect(r.status).toBe(503);expect(await r.json()).toEqual({error:expect.stringContaining('unavailable')});});
});

it('rejects malformed pagination before querying history',async()=>{const response=await GET(new Request('http://localhost/api/account/login-activity?cursor=invalid'));expect(response.status).toBe(400);expect(rpc).not.toHaveBeenCalled();});
it('passes the keyset cursor while still using the verified owner',async()=>{const cursor={at:'2026-10-28T12:00:00.000Z',id:'123'};await GET(new Request('http://localhost/api/account/login-activity?cursor='+Buffer.from(JSON.stringify(cursor)).toString('base64url')));expect(rpc).toHaveBeenCalledWith('socialu_login_history',{p_auth_id:'owner',p_before_at:cursor.at,p_before_id:'123',p_current_session:null});});

it('uses the verified token session rather than a query-supplied session',async()=>{const id='10000000-0000-0000-0000-000000000001';const token='header.'+Buffer.from(JSON.stringify({session_id:id})).toString('base64url')+'.signature';await GET(new Request('http://localhost/api/account/login-activity?session_id=other',{headers:{Authorization:'Bearer '+token}}));expect(rpc).toHaveBeenCalledWith('socialu_login_history',expect.objectContaining({p_current_session:id,p_auth_id:'owner'}));});

const sessionId='10000000-0000-0000-0000-000000000001';
function endRequest(body:unknown={id:'42',confirm:true}){
 const token='header.'+Buffer.from(JSON.stringify({session_id:sessionId})).toString('base64url')+'.signature';
 return new Request('http://localhost/api/account/login-activity',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
}
describe('Selected-device logout',()=>{
 it('takes owner and current session from verified authentication',async()=>{
  rpc.mockResolvedValue({data:{ended:true,current_session_active:true},error:null});
  const response=await POST(endRequest({id:'42',confirm:true,auth_user_id:'someone-else',session_id:'forged'}));
  expect(response.status).toBe(200);expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(rpc).toHaveBeenCalledWith('socialu_end_other_session',{p_auth_id:'owner',p_current_session:sessionId,p_history_id:'42'});
 });
 it.each([{id:'42'},{id:'0',confirm:true},{id:'9223372036854775808',confirm:true},{id:42,confirm:true}])('requires explicit confirmation and a valid record: %j',async body=>{
  expect((await POST(endRequest(body))).status).toBe(400);expect(rpc).not.toHaveBeenCalled();
 });
 it('prevents unauthenticated logout actions',async()=>{verified.mockRejectedValue(new AccountError('Denied',401));expect((await POST(endRequest())).status).toBe(401);expect(rpc).not.toHaveBeenCalled();});
 it.each([['42501',401],['P0002',404],['22023',400],['PGRST202',503]])('handles database failure %s without reporting success',async(code,status)=>{
  rpc.mockResolvedValue({error:{code}});const response=await POST(endRequest());expect(response.status).toBe(status);expect(await response.text()).not.toContain('ended');
 });
});

it.each([true,null,{ended:true},{ended:true,current_session_active:false}])('does not report success without confirmed current-session preservation: %j',async data=>{
 rpc.mockResolvedValue({data,error:null});
 const response=await POST(endRequest());expect(response.status).toBe(503);expect(await response.text()).not.toContain('currentSessionActive');
});
