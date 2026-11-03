import {afterEach,describe,expect,it,vi} from 'vitest';
const {rpc}=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('../lib/socialu-account',()=>({accountClient:()=>({rpc})}));
import {loginContext,recordLoginContext} from '../lib/login-context';
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
const request=(headers:Record<string,string>={})=>new Request('https://socialu.example/api/auth/login',{headers});
describe('Sign-in context',()=>{
 it('identifies a device without keeping the raw browser fingerprint',()=>{
  expect(loginContext(request({'user-agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537 Chrome/130.0 Safari/537'}))).toEqual({device:'Chrome on macOS',location:null});
 });
 it('does not trust location headers on an unconfigured host',()=>{
  vi.stubEnv('VERCEL','');expect(loginContext(request({'x-vercel-ip-country':'US','x-vercel-ip-city':'Salem'})).location).toBeNull();
 });
 it('records only approximate city/region/country supplied by Vercel',()=>{
  vi.stubEnv('VERCEL','1');expect(loginContext(request({'x-vercel-ip-country':'US','x-vercel-ip-country-region':'MA','x-vercel-ip-city':'New%20York','x-vercel-ip-latitude':'42.1'})).location).toBe('New York, MA, US');
 });
 it('handles malformed location encoding and missing locations',()=>{
  vi.stubEnv('VERCEL','1');expect(loginContext(request({'x-vercel-ip-country':'US','x-vercel-ip-city':'%ZZ'})).location).toBe('US');
  expect(loginContext(request()).location).toBeNull();
 });
 it('records authenticated session metadata without persisting passwords or tokens',async()=>{
  rpc.mockResolvedValue({data:true,error:null});const id='10000000-0000-0000-0000-000000000001';
  const token='header.'+Buffer.from(JSON.stringify({session_id:id})).toString('base64url')+'.signature';
  await recordLoginContext(request(), 'owner',token);
  expect(rpc).toHaveBeenCalledWith('socialu_record_login_context',{p_auth_id:'owner',p_session:id,p_device:'Unknown browser',p_location:null});
 });
});
