// @vitest-environment node
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {accessToken,clearSession,saveSession} from '../lib/account/session';
import {accountSwitchDetector} from '../lib/world-explorer/progress-client';

// Issue #1232 (SRS-628.2): a routine token refresh for the same student emits
// socialu-session-changed, and World Explorer treated it as an account switch
// and closed the running adventure and its result screen.
const accountA='00000000-0000-4000-8000-00000000000a',accountB='00000000-0000-4000-8000-00000000000b';
const jwt=(sub:string,salt='')=>`header.${Buffer.from(JSON.stringify({sub,salt})).toString('base64url')}.signature`;
function memoryStorage(){const values=new Map<string,string>();return{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>void values.set(key,value),removeItem:(key:string)=>void values.delete(key)};}
let events:EventTarget;
beforeEach(()=>{events=new EventTarget();vi.stubGlobal('localStorage',memoryStorage());vi.stubGlobal('sessionStorage',memoryStorage());vi.stubGlobal('window',events);});
afterEach(()=>vi.unstubAllGlobals());

/** The same wiring World Explorer uses: close the run only for a new account. */
function openWorldExplorer(){
 const page={playing:'JPN' as string|null,hydrateCalls:0},account=accountSwitchDetector();
 events.addEventListener('socialu-session-changed',()=>{if(!account.changed())return;page.playing=null;page.hydrateCalls++;});
 return page;
}

describe('Issue #1232: token refresh keeps the World Explorer run open',()=>{
 it('keeps the run and result screen when the same student token is refreshed',async()=>{
  saveSession({access_token:jwt(accountA,'old'),refresh_token:'refresh',expires_at:Math.floor(Date.now()/1000)+10},true);
  const page=openWorldExplorer();
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({session:{access_token:jwt(accountA,'new'),refresh_token:'refresh-2',expires_at:Math.floor(Date.now()/1000)+3600}}),{status:200})));
  expect(await accessToken()).toBe(jwt(accountA,'new'));
  expect(page).toEqual({playing:'JPN',hydrateCalls:0});
 });
 it('still closes the run when a different student signs in',()=>{
  saveSession({access_token:jwt(accountA)},true);const page=openWorldExplorer();
  saveSession({access_token:jwt(accountB)},true);
  expect(page).toEqual({playing:null,hydrateCalls:1});
 });
 it('still closes the run on sign-out, and again when the student signs back in',()=>{
  saveSession({access_token:jwt(accountA)},true);const page=openWorldExplorer();
  clearSession();expect(page).toEqual({playing:null,hydrateCalls:1});
  page.playing='JPN';saveSession({access_token:jwt(accountA)},true);expect(page).toEqual({playing:null,hydrateCalls:2});
 });
 it('treats a guest who signs in as an account change',()=>{
  const page=openWorldExplorer();saveSession({access_token:jwt(accountA)},false);
  expect(page).toEqual({playing:null,hydrateCalls:1});
 });
});
