import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {STORAGE_KEY,emptyExplorerProgress,loadAccountDeviceProgress,loadExplorerProgress,recordCountryResult,saveExplorerProgress,type ExplorerProgress} from '../lib/world-explorer-progress';

// Issue #1237 (SRS-628.3): two tabs each saved their own in-memory snapshot
// over the shared device passport, so the later save erased the other result.
const owner='00000000-0000-4000-8000-00000000000a';
let values:Map<string,string>;
beforeEach(()=>{values=new Map();vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)});});
afterEach(()=>vi.unstubAllGlobals());

describe('Issue #1237: device passport saves from two tabs',()=>{
 it('keeps both results when two tabs of one account save from the same starting snapshot',()=>{
  const start:ExplorerProgress={...emptyExplorerProgress(),accountId:owner};
  const tabA=recordCountryResult(start,'JPN',{completed:true,coins:5,stars:2});
  const tabB=recordCountryResult(start,'BRA',{completed:true,coins:7,stars:3});
  expect(saveExplorerProgress(tabA)).toBe(true);expect(saveExplorerProgress(tabB)).toBe(true);
  const stored=loadAccountDeviceProgress(owner);
  expect(stored.countries.JPN).toMatchObject({completed:true,bestCoins:5,starsEarned:2});
  expect(stored.countries.BRA).toMatchObject({completed:true,bestCoins:7,starsEarned:3});
 });
 it('keeps both results for a guest passport as well',()=>{
  saveExplorerProgress(recordCountryResult(emptyExplorerProgress(),'JPN',{completed:true,coins:5}));
  saveExplorerProgress(recordCountryResult(emptyExplorerProgress(),'BRA',{completed:true,coins:7}));
  expect(Object.keys(loadExplorerProgress().countries).sort()).toEqual(['BRA','JPN']);
 });
 it('never lowers a stored best result when a stale tab saves a weaker one',()=>{
  const start:ExplorerProgress={...emptyExplorerProgress(),accountId:owner};
  saveExplorerProgress(recordCountryResult(start,'JPN',{completed:true,coins:9,stars:3,elapsedMs:60000}));
  saveExplorerProgress(recordCountryResult(start,'JPN',{completed:false,coins:2,stars:1}));
  expect(loadAccountDeviceProgress(owner).countries.JPN).toMatchObject({completed:true,bestCoins:9,starsEarned:3,bestTimeMs:60000});
 });
 it('does not merge another account or the guest passport into an account save',()=>{
  const other='00000000-0000-4000-8000-00000000000b';
  saveExplorerProgress(recordCountryResult(emptyExplorerProgress(),'KEN',{completed:true,coins:4}));
  saveExplorerProgress({...recordCountryResult(emptyExplorerProgress(),'BRA',{completed:true,coins:7}),accountId:other});
  saveExplorerProgress({...recordCountryResult(emptyExplorerProgress(),'JPN',{completed:true,coins:5}),accountId:owner});
  expect(Object.keys(loadAccountDeviceProgress(owner).countries)).toEqual(['JPN']);
  expect(values.has(STORAGE_KEY)).toBe(true);
 });
 it('still saves when the stored passport is corrupt or cannot be read',()=>{
  values.set(STORAGE_KEY,'{broken');
  expect(saveExplorerProgress(recordCountryResult(emptyExplorerProgress(),'JPN',{completed:true,coins:5}))).toBe(true);
  expect(loadExplorerProgress().countries.JPN.completed).toBe(true);
  expect(saveExplorerProgress(recordCountryResult(emptyExplorerProgress(),'KEN',{completed:true,coins:4}),{setItem:(key:string,value:string)=>values.set(key,value)})).toBe(true);
 });
});
