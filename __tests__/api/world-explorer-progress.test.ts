import {beforeEach,describe,expect,it,vi} from 'vitest';
import {AccountError,accountClient,verifiedUser} from '../../lib/socialu-account';
import {GET,POST} from '../../app/api/world-explorer/progress/route';
vi.mock('../../lib/socialu-account',async original=>({...await original<typeof import('../../lib/socialu-account')>(),verifiedUser:vi.fn(),accountClient:vi.fn()}));
const owner='00000000-0000-4000-8000-000000000001',runId='00000000-0000-4000-8000-000000000003';
const rpc=vi.fn(),body={action:'result',code:'JPN',runId,completed:true,coins:12,stars:2,elapsedMs:90000,discoveryFound:true};
const request=(data:unknown)=>new Request('http://localhost/api/world-explorer/progress',{method:'POST',body:JSON.stringify(data),headers:{'Content-Type':'application/json'}});
beforeEach(()=>{rpc.mockReset().mockResolvedValue({data:{version:1,countries:{}},error:null});vi.mocked(accountClient).mockReturnValue({rpc} as never);vi.mocked(verifiedUser).mockReset().mockResolvedValue({id:owner} as never);});
describe('World Explorer authenticated passport API',()=>{
 it('requires existing verified account auth and never exposes anonymous passport data',async()=>{
  vi.mocked(verifiedUser).mockRejectedValue(new AccountError('Please sign in.',401));const response=await GET(new Request('http://localhost/api/world-explorer/progress'));expect(response.status).toBe(401);expect(rpc).not.toHaveBeenCalled();
 });
 it('derives its owner from the verified user and returns no-store account progress',async()=>{
  const response=await POST(request(body));expect(response.status).toBe(200);expect(response.headers.get('Cache-Control')).toBe('no-store');expect(rpc).toHaveBeenCalledWith('socialu_world_explorer',{p_action:'result',p_auth_id:owner,p_payload:{code:'JPN',runId,completed:true,coins:12,stars:2,elapsedMs:90000,discoveryFound:true}});expect((await response.json()).progress.accountId).toBe(owner);
 });
 it('rejects forged owners, unsupported codes and invalid result bounds before storage',async()=>{
  for(const changes of [{accountId:owner},{code:'VAT'},{code:'jp'},{stars:4},{coins:-1},{coins:2.2},{elapsedMs:Infinity},{runId:'bad'},{discoveryFound:'yes'}]){expect((await POST(request({...body,...changes}))).status).toBe(400);}expect(rpc).not.toHaveBeenCalled();
 });
 it('normalizes an old device snapshot without accepting an owner from the client',async()=>{
  const response=await POST(request({action:'merge',progress:{version:1,countries:{JPN:{completed:true,bestCoins:8,attempts:3}}}}));expect(response.status).toBe(200);expect(rpc.mock.calls[0][1].p_payload.countries.JPN).toMatchObject({bestCoins:8,attempts:3,starsEarned:0,discoveredFactIds:[]});
  expect((await POST(request({action:'merge',progress:{version:1,countries:{},accountId:owner}}))).status).toBe(400);
 });
 it('names missing setup and storage failures without falsely claiming a save',async()=>{
  rpc.mockResolvedValue({data:null,error:{code:'PGRST202'}});const response=await POST(request(body));expect(response.status).toBe(503);expect((await response.json()).code).toBe('EXPLORER_SETUP_REQUIRED');
  rpc.mockResolvedValue({data:{bad:true},error:null});expect((await GET(new Request('http://localhost/api/world-explorer/progress'))).status).toBe(503);
 });
});
