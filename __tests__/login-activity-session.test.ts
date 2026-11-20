import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
vi.mock('../lib/account/session',()=>({accessToken:vi.fn(),storedAccessToken:vi.fn()}));
import {accessToken,storedAccessToken} from '../lib/account/session';
import {loginActivityIdentity,currentLoginActivityIdentity,loginActivityRequest} from '../lib/account/login-activity-session';
const token=(sub='A',session_id='session-A',extra={})=>'e30.'+Buffer.from(JSON.stringify({sub,session_id,...extra})).toString('base64url')+'.test';
beforeEach(()=>{vi.stubGlobal('window',{});vi.mocked(storedAccessToken).mockReturnValue(token());vi.mocked(accessToken).mockResolvedValue(token());});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.clearAllMocks();});
describe('Login Activity account boundary',()=>{
 it('keeps the same key on refresh but changes it for another account or session',()=>{
  const key=loginActivityIdentity(token());
  expect(loginActivityIdentity(token('A','session-A',{exp:999}))).toBe(key);
  expect(loginActivityIdentity(token('B','session-B'))).not.toBe(key);
  expect(loginActivityIdentity(token('A','another-session'))).not.toBe(key);
 });
 it.each([null,'broken','e30.e30.test',token('', 'session')])('rejects missing identity %s',value=>expect(loginActivityIdentity(value)).toBeNull());
 it('uses the effective token selected by the session storage helper',()=>expect(currentLoginActivityIdentity()).toBe(loginActivityIdentity(token())));
 it('does not send an old cursor with a new account token',async()=>{
  vi.mocked(accessToken).mockResolvedValue(token('B','session-B'));const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
  await expect(loginActivityRequest(loginActivityIdentity(token()),'/api/account/login-activity?cursor=25')).rejects.toThrow('account changed');
  expect(fetch).not.toHaveBeenCalled();
 });
 it('rejects an old response even if fetch ignores cancellation',async()=>{
  let finish!:(value:Response)=>void;vi.stubGlobal('fetch',vi.fn(()=>new Promise(resolve=>finish=resolve)));
  const pending=loginActivityRequest(loginActivityIdentity(token()),'/api/account/login-activity');
  await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));
  vi.mocked(storedAccessToken).mockReturnValue(token('B','session-B'));
  finish(Response.json({entries:[{id:'old-account'}]}));
  await expect(pending).rejects.toThrow('account changed');
 });
 it('preserves caller headers and sends the bound token',async()=>{
  const fetch=vi.fn().mockResolvedValue(Response.json({entries:[]}));vi.stubGlobal('fetch',fetch);
  await loginActivityRequest(loginActivityIdentity(token()),'/api/account/login-activity',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  const init=fetch.mock.calls[0][1];expect(init.headers.get('Authorization')).toBe('Bearer '+token());expect(init.headers.get('Content-Type')).toBe('application/json');
 });
});

describe('Login Activity request recovery',()=>{
 it('bounds a logout when the transport ignores cancellation',async()=>{
  vi.useFakeTimers();vi.stubGlobal('fetch',vi.fn(()=>new Promise(()=>{})));
  let outcome='pending',message='';
  const pending=loginActivityRequest(loginActivityIdentity(token()),'/api/account/login-activity',{method:'POST',body:'{}'}).then(()=>{outcome='success';},error=>{outcome='rejected';message=error.message;});
  await vi.advanceTimersByTimeAsync(12000);
  expect(outcome).toBe('rejected');expect(message).toMatch(/not confirmed/i);await pending;
 });
 it('does not send a logout after a timed-out token refresh resolves',async()=>{
  vi.useFakeTimers();let finish!:(value:string)=>void;
  vi.mocked(accessToken).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  const fetch=vi.fn();vi.stubGlobal('fetch',fetch);let outcome='pending';
  const pending=loginActivityRequest(loginActivityIdentity(token()),'/api/account/login-activity',{method:'POST',body:'{}'}).then(()=>{outcome='success';},()=>{outcome='rejected';});
  await vi.advanceTimersByTimeAsync(12000);expect(outcome).toBe('rejected');
  finish(token());await pending;await Promise.resolve();expect(fetch).not.toHaveBeenCalled();
 });
});

describe('Login Activity decoding and cancellation recovery',()=>{
 it('bounds a stalled response body',async()=>{
  vi.useFakeTimers();vi.stubGlobal('fetch',vi.fn().mockResolvedValue({json:()=>new Promise(()=>{})}));
  let message='';const pending=loginActivityRequest(loginActivityIdentity(token()),'/api/account/login-activity').catch(error=>{message=error.message;});
  await vi.advanceTimersByTimeAsync(10001);await pending;expect(message).toContain('took too long');
 });
 it('settles caller cancellation even when fetch ignores its signal',async()=>{
  const controller=new AbortController();vi.stubGlobal('fetch',vi.fn(()=>new Promise(()=>{})));
  const pending=loginActivityRequest(loginActivityIdentity(token()),'/api/account/login-activity',{signal:controller.signal});
  const rejected=expect(pending).rejects.toThrow('cancelled');controller.abort();await rejected;
 });
});
