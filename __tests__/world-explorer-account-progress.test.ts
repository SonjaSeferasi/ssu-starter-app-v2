import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {accessToken} from '../lib/account/session';
import {loadAccountProgress,saveAccountResult} from '../lib/world-explorer/progress-client';
import {STORAGE_KEY,discoveryIdFor,emptyExplorerProgress,loadExplorerProgress,mergeExplorerProgress,recordCountryResult,sanitizeExplorerProgress,saveExplorerProgress} from '../lib/world-explorer-progress';

vi.mock('../lib/account/session',()=>({accessToken:vi.fn()}));
const owner='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
let values:Map<string,string>;
beforeEach(()=>{values=new Map();vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)});vi.mocked(accessToken).mockReset();});
afterEach(()=>vi.unstubAllGlobals());

describe('Extended Explorer passport compatibility and merge',()=>{
 it('migrates the v1 record in place without losing coins, attempts or completion',()=>{
  const old=sanitizeExplorerProgress({version:1,countries:{JPN:{completed:true,bestCoins:7,attempts:3}}});
  expect(old.countries.JPN).toEqual({completed:true,bestCoins:7,attempts:3,starsEarned:0,discoveredFactIds:[]});
  const success=recordCountryResult(old,'JPN',{completed:true,coins:12,stars:2,elapsedMs:85000,discoveryFound:true});
  const retry=recordCountryResult(success,'JPN',{completed:false,coins:3,stars:1,elapsedMs:500});
  expect(retry.countries.JPN).toMatchObject({completed:true,bestCoins:12,attempts:5,starsEarned:2,bestTimeMs:85000,discoveredFactIds:['mount-fuji']});
  expect(retry.countries.JPN.completedAt).toBe(success.countries.JPN.completedAt);expect(old.countries.JPN.attempts).toBe(3);
 });
 it('merges best results and discoveries without adding the same snapshot attempts repeatedly',()=>{
  const local=recordCountryResult(emptyExplorerProgress(),'JPN',{completed:true,coins:18,stars:1,elapsedMs:90000,discoveryFound:true});
  const remote={...recordCountryResult(emptyExplorerProgress(),'JPN',{completed:true,coins:10,stars:3,elapsedMs:80000}),accountId:owner};
  const once=mergeExplorerProgress(local,remote),again=mergeExplorerProgress(once,remote);
  expect(again).toEqual(once);expect(again.countries.JPN).toMatchObject({bestCoins:18,starsEarned:3,bestTimeMs:80000,attempts:1,discoveredFactIds:['mount-fuji']});expect(again.accountId).toBe(owner);
 });
 it('rejects unapproved fact IDs, malformed timing and unknown destination records',()=>{
  const safe=sanitizeExplorerProgress({version:1,countries:{JPN:{completed:false,bestCoins:9,starsEarned:99,attempts:2,discoveredFactIds:['sushi','mount-fuji','other'],bestTimeMs:90,completedAt:'2026-10-27'},VAT:{completed:true},ZZZ:{completed:true}}});
  expect(safe.countries.JPN).toEqual({completed:false,bestCoins:9,starsEarned:3,attempts:2,discoveredFactIds:['mount-fuji']});expect(Object.keys(safe.countries)).toEqual(['JPN']);expect(discoveryIdFor('ZZZ')).toBeUndefined();
  const forged=recordCountryResult(emptyExplorerProgress(),'JPN',{completed:'yes',coins:1,elapsedMs:20,discoveryFound:'yes'} as never);expect(forged.countries.JPN.completed).toBe(false);expect(forged.countries.JPN.discoveredFactIds).toEqual([]);expect(forged.countries.JPN).not.toHaveProperty('completedAt');expect(forged.countries.JPN).not.toHaveProperty('bestTimeMs');
 });
 it('keeps account caches out of the anonymous passport and excludes another known owner during hydration',()=>{
  const guest=recordCountryResult(emptyExplorerProgress(),'KEN',{completed:true,coins:4});saveExplorerProgress(guest);
  const account={...recordCountryResult(emptyExplorerProgress(),'JPN',{completed:true,coins:9}),accountId:owner};saveExplorerProgress(account);
  expect(loadExplorerProgress()).toEqual(guest);expect(values.has(`${STORAGE_KEY}:account:${owner}`)).toBe(true);
  const different=mergeExplorerProgress(account,{...emptyExplorerProgress(),accountId:other});expect(different.countries).toEqual({});expect(different.accountId).toBe(other);
 });
});

describe('Explorer account sync and device fallback',()=>{
 it('does not contact the account endpoint for a guest or claim account saving',async()=>{
  vi.mocked(accessToken).mockResolvedValue(null);const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  expect((await loadAccountProgress(emptyExplorerProgress())).storage).toBe('device');expect((await saveAccountResult('JPN',{completed:true,coins:3},owner)).storage).toBe('device');expect(fetcher).not.toHaveBeenCalled();
 });
 it('loads the verified account, merges the guest snapshot and sends no client-chosen owner',async()=>{
  vi.mocked(accessToken).mockResolvedValue('verified-session');const guest=recordCountryResult(emptyExplorerProgress(),'KEN',{completed:true,coins:4});
  const remote={...recordCountryResult(emptyExplorerProgress(),'JPN',{completed:true,coins:12,stars:2}),accountId:owner};
  const fetcher=vi.fn().mockImplementation(async()=>new Response(JSON.stringify({progress:remote,storage:'account'}),{status:200}));vi.stubGlobal('fetch',fetcher);
  const loaded=await loadAccountProgress(guest);expect(loaded.storage).toBe('account');expect(loaded.progress.accountId).toBe(owner);expect(loaded.progress.countries.KEN.completed).toBe(true);
  const body=JSON.parse(fetcher.mock.calls[1][1].body);expect(body.action).toBe('merge');expect(body.progress).not.toHaveProperty('accountId');expect(body.progress.countries.KEN.bestCoins).toBe(4);
 });
 it('reports a missing migration truthfully and preserves device progress during a network failure',async()=>{
  vi.mocked(accessToken).mockResolvedValue('token');const local=recordCountryResult(emptyExplorerProgress(),'JPN',{completed:true,coins:4});
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({error:'Setup needed',code:'EXPLORER_SETUP_REQUIRED'}),{status:503})));
  const response=await loadAccountProgress(local);expect(response.storage).toBe('device');expect(response.progress).toEqual(local);expect(response.message).toContain('database update');
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));const failed=await saveAccountResult('JPN',{completed:true,coins:4},owner);expect(failed.storage).toBe('device');expect(failed.message).toContain('Account sync is unavailable');
 });
});
