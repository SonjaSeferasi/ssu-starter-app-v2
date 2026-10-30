import {beforeEach,describe,expect,it,vi} from 'vitest';
const {verified,rpc}=vi.hoisted(()=>({verified:vi.fn(),rpc:vi.fn()}));
vi.mock('../../lib/socialu-account',async original=>({...await original<typeof import('../../lib/socialu-account')>(),verifiedUser:verified,accountClient:()=>({rpc})}));
import {AccountError} from '../../lib/socialu-account';
import {GET} from '../../app/api/account/login-activity/route';
beforeEach(()=>{vi.resetAllMocks();verified.mockResolvedValue({id:'owner'});rpc.mockResolvedValue({data:{entries:[]},error:null});});
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
