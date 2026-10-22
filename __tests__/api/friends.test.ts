import { beforeEach,describe,expect,it,vi } from 'vitest';
const {verified,rpc,shape,signIn}=vi.hoisted(()=>({verified:vi.fn(),rpc:vi.fn(),shape:vi.fn(),signIn:vi.fn()}));
vi.mock('../../lib/socialu-account',async original=>({...await original<typeof import('../../lib/socialu-account')>(),verifiedUser:verified,authClient:()=>({auth:{signInWithPassword:signIn}})}));
vi.mock('../../lib/friendships',()=>({friendshipRpc:rpc,shapeStudents:shape}));
import {AccountError} from '../../lib/socialu-account';
import {GET,POST} from '../../app/api/friends/route';
import {POST as deactivate} from '../../app/api/account/deactivate/route';
const req=(body?:unknown,query='')=>new Request('http://localhost/api/friends'+query,{method:body?'POST':'GET',...(body?{body:JSON.stringify(body),headers:{'Content-Type':'application/json'}}:{})});
beforeEach(()=>{vi.resetAllMocks();verified.mockResolvedValue({id:'verified-user',email:'me@salemstate.edu'});rpc.mockResolvedValue({state:'sent',request_id:'1'});shape.mockImplementation(async rows=>rows);signIn.mockResolvedValue({data:{user:{id:'verified-user'}},error:null});});
describe('Friendship API boundaries',()=>{
  it.each(['none','sent','received','friends','blocked'])('returns %s eligibility for the verified viewer',async state=>{
    const relation={state,request_id:state==='none'||state==='blocked'?null:'123'};
    rpc.mockResolvedValue(relation);
    const response=await GET(req(undefined,'?view=relation&username=alex&auth_user_id=victim'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(relation);
    expect(rpc).toHaveBeenCalledWith('socialu_friendships',{
      p_auth_id:'verified-user',p_action:'relation',p_username:'alex',p_query:'',p_offset:0,
    });
    expect(shape).not.toHaveBeenCalled();
  });

  it.each(['send','block','unblock','message'])('%s uses the authenticated identity',async action=>{
    expect((await POST(req({action,username:'alex',auth_user_id:'victim',student_id:99}))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_friendships',{p_auth_id:'verified-user',p_action:action,p_username:'alex',p_request_id:null});
  });
  it.each(['accept','decline','cancel','remove'])('%s requires a request id and passes it without trusting student ids',async action=>{
    expect((await POST(req({action,username:'alex'}))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
    expect((await POST(req({action,username:'alex',requestId:'123'}))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_friendships',expect.objectContaining({p_request_id:'123',p_auth_id:'verified-user'}));
  });
  it('paginates and signs only the 20 returned profiles',async()=>{
    rpc.mockResolvedValue(Array.from({length:21},(_,id)=>({id})));
    const response=await GET(req(undefined,'?view=incoming&offset=20&q=Alex'));
    const data=await response.json(); expect(data.students).toHaveLength(20);expect(data.hasMore).toBe(true);
    expect(shape.mock.calls[0][0]).toHaveLength(20);expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(rpc).toHaveBeenCalledWith('socialu_friendships',expect.objectContaining({p_action:'incoming',p_offset:20,p_query:'Alex'}));
  });
  it.each(['?view=delete','?offset=-1','?offset=1.2','?offset=10001','?view=relation'])('rejects invalid read %s',async query=>{
    expect((await GET(req(undefined,query))).status).toBe(400);expect(rpc).not.toHaveBeenCalled();
  });
  it('rejects unsupported mutations',async()=>{expect((await POST(req({action:'deactivate',username:'alex'}))).status).toBe(400);expect(rpc).not.toHaveBeenCalled();});
  it.each([403,404,409])('preserves authorization and conflict error %s',async status=>{rpc.mockRejectedValue(new AccountError('Unavailable',status));expect((await POST(req({action:'send',username:'alex'}))).status).toBe(status);});
  it('requires a verified session for reads and writes',async()=>{verified.mockRejectedValue(new AccountError('Sign in',401));expect((await GET(req())).status).toBe(401);expect((await POST(req({action:'send',username:'alex'}))).status).toBe(401);expect(rpc).not.toHaveBeenCalled();});
});
describe('Account deactivation',()=>{
  it('requires explicit typed confirmation',async()=>{expect((await deactivate(req({password:'Secret123!'}))).status).toBe(400);expect(signIn).not.toHaveBeenCalled();expect(rpc).not.toHaveBeenCalled();});
  it('rejects the wrong current password',async()=>{signIn.mockResolvedValue({data:{},error:{message:'wrong'}});expect((await deactivate(req({password:'bad',confirm:'DEACTIVATE'}))).status).toBe(403);expect(rpc).not.toHaveBeenCalled();});
  it('rejects a mismatched provider identity',async()=>{signIn.mockResolvedValue({data:{user:{id:'someone-else'}},error:null});expect((await deactivate(req({password:'Secret123!',confirm:'DEACTIVATE'}))).status).toBe(403);expect(rpc).not.toHaveBeenCalled();});
  it('deactivates only the current account after password verification',async()=>{const response=await deactivate(req({password:'Secret123!',confirm:'DEACTIVATE',auth_user_id:'victim'}));expect(response.status).toBe(200);expect(signIn).toHaveBeenCalledWith({email:'me@salemstate.edu',password:'Secret123!'});expect(rpc).toHaveBeenCalledWith('socialu_account_lifecycle',{p_auth_id:'verified-user',p_action:'deactivate'});});
});
