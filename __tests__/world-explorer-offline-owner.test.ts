import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {accessToken} from '../lib/account/session';
import {loadAccountProgress,sessionDeviceProgress} from '../lib/world-explorer/progress-client';
import {STORAGE_KEY,emptyExplorerProgress,loadAccountDeviceProgress,loadExplorerProgress,recordCountryResult,saveExplorerProgress} from '../lib/world-explorer-progress';

// Issue #1231 (SRS-628.3): a signed-in student's offline result was written to
// the shared anonymous key and later imported by the next account to sign in.
vi.mock('../lib/account/session',()=>({accessToken:vi.fn(),storedAccessToken:vi.fn()}));
import {storedAccessToken} from '../lib/account/session';
const accountA='00000000-0000-4000-8000-00000000000a',accountB='00000000-0000-4000-8000-00000000000b';
const jwt=(sub:string)=>`header.${Buffer.from(JSON.stringify({sub})).toString('base64url')}.signature`;
const signIn=(sub:string|null)=>{vi.mocked(accessToken).mockResolvedValue(sub?jwt(sub):null);vi.mocked(storedAccessToken).mockReturnValue(sub?jwt(sub):null);};
const remoteFor=(accountId:string,countries={})=>new Response(JSON.stringify({progress:{version:1,countries,accountId},storage:'account'}),{status:200});
let values:Map<string,string>;
beforeEach(()=>{values=new Map();vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)});vi.mocked(accessToken).mockReset();vi.mocked(storedAccessToken).mockReset();});
afterEach(()=>vi.unstubAllGlobals());

/** Mirrors the component: hydrate, then record a finished country on device. */
async function playOffline(code:string){
 const loaded=await loadAccountProgress(loadExplorerProgress());
 const next=recordCountryResult(loaded.progress,code,{completed:true,coins:5});
 saveExplorerProgress(next);
 return{loaded,next};
}

describe('Issue #1231: offline World Explorer progress stays with its account',()=>{
 it('stores a signed-in offline result under that account, not the anonymous key',async()=>{
  signIn(accountA);vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));
  const {loaded,next}=await playOffline('JPN');
  expect(loaded.storage).toBe('device');expect(next.accountId).toBe(accountA);
  expect(values.has(STORAGE_KEY)).toBe(false);
  expect(loadAccountDeviceProgress(accountA).countries.JPN.completed).toBe(true);
 });
 it('does not import account A offline progress when account B signs in next',async()=>{
  signIn(accountA);vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));
  await playOffline('JPN');
  signIn(accountB);const fetcher=vi.fn().mockImplementation(async()=>remoteFor(accountB));vi.stubGlobal('fetch',fetcher);
  const loadedB=await loadAccountProgress(loadExplorerProgress());
  expect(loadedB.storage).toBe('account');expect(loadedB.progress.accountId).toBe(accountB);
  expect(loadedB.progress.countries).toEqual({});
  expect(fetcher.mock.calls.some(call=>call[1]?.method==='POST')).toBe(false);
 });
 it('syncs account A offline progress back to account A on the next successful visit',async()=>{
  signIn(accountA);vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));
  await playOffline('JPN');
  const fetcher=vi.fn().mockImplementation(async(_url:string,init:RequestInit)=>remoteFor(accountA,init.method==='POST'?JSON.parse(String(init.body)).progress.countries:{}));vi.stubGlobal('fetch',fetcher);
  const again=await loadAccountProgress(loadExplorerProgress());
  expect(again.storage).toBe('account');expect(again.progress.countries.JPN.completed).toBe(true);
  expect(JSON.parse(fetcher.mock.calls[1][1].body).progress.countries.JPN.bestCoins).toBe(5);
 });
 it('gives a guest passport to the first account only, then clears the anonymous copy',async()=>{
  saveExplorerProgress(recordCountryResult(emptyExplorerProgress(),'KEN',{completed:true,coins:4}));
  signIn(accountA);vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>remoteFor(accountA)));
  expect((await loadAccountProgress(loadExplorerProgress())).progress.countries.KEN.completed).toBe(true);
  expect(values.has(STORAGE_KEY)).toBe(false);
  signIn(accountB);vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>remoteFor(accountB)));
  expect((await loadAccountProgress(loadExplorerProgress())).progress.countries).toEqual({});
 });
 it('starts a signed-in session from that account device cache before the network answers',()=>{
  saveExplorerProgress({...recordCountryResult(emptyExplorerProgress(),'JPN',{completed:true,coins:5}),accountId:accountA});
  signIn(accountA);expect(sessionDeviceProgress().accountId).toBe(accountA);expect(sessionDeviceProgress().countries.JPN.completed).toBe(true);
  signIn(accountB);expect(sessionDeviceProgress()).toEqual({...emptyExplorerProgress(),accountId:accountB});
  signIn(null);expect(sessionDeviceProgress()).toEqual(emptyExplorerProgress());
 });
});
