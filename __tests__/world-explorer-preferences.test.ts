import {describe,it,expect} from 'vitest';
import {PREFERENCES_KEY,loadExplorerPreferences,saveExplorerPreferences,sanitizeExplorerPreferences} from '../lib/world-explorer/preferences';

describe('Explorer accessibility and audio preferences',()=>{
 it('bounds audio gain and rejects malformed persisted options',()=>{
  expect(sanitizeExplorerPreferences({musicVolume:20,effectsVolume:-8,graphicsQuality:'untrusted',reducedMotion:true})).toMatchObject({musicVolume:1,effectsVolume:0,graphicsQuality:'standard',reducedMotion:true});
  expect(sanitizeExplorerPreferences({musicVolume:NaN,effectsVolume:Infinity})).toMatchObject({musicVolume:.12,effectsVolume:.45});
 });
 it('preserves mute, reduced motion and lightweight graphics after a reload',()=>{
  const values=new Map<string,string>(),storage={getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>{values.set(key,value);}},settings={musicVolume:0,effectsVolume:0,reducedMotion:true,graphicsQuality:'low' as const,touchControls:true,debugMode:true,explorerAssist:true};
  expect(saveExplorerPreferences(settings,storage)).toBe(true);expect(values.has(PREFERENCES_KEY)).toBe(true);expect(loadExplorerPreferences(storage)).toEqual(settings);
 });
 it('migrates older settings without enabling desktop touch or debug overlays',()=>{
  expect(sanitizeExplorerPreferences({musicVolume:0,graphicsQuality:'low'})).toMatchObject({musicVolume:0,graphicsQuality:'low',touchControls:false,debugMode:false});
  expect(sanitizeExplorerPreferences({touchControls:'yes',debugMode:1})).toMatchObject({touchControls:false,debugMode:false});
 });
 it('keeps the game usable when storage is blocked or corrupted',()=>{
  const unavailable={getItem:()=>{throw new Error('blocked');},setItem:()=>{throw new Error('blocked');}};
  expect(()=>loadExplorerPreferences(unavailable)).not.toThrow();expect(loadExplorerPreferences({getItem:()=>'{broken',setItem:()=>{}}).graphicsQuality).toBe('standard');expect(saveExplorerPreferences(sanitizeExplorerPreferences({}),unavailable)).toBe(false);
 });
});
