import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {closeFollowScale,closeViewHaze,japanCloseCamera,referenceCameraFrame} from '../lib/world-explorer/game-camera';
import {isAuthoredLevel,levelDefinitionFor} from '../lib/world-explorer/level-manifest';
import {countries} from '../lib/world-explorer/catalog';
import {readFileSync} from 'node:fs';

const codes=countries.map(country=>country.code);
function view(code:string,aspect:number){
 const level=levelDefinitionFor(code),spawn=level.platforms.find(platform=>platform.id===level.spawn.platformId)!,x=spawn.x+level.spawn.offset,y=spawn.y;
 const frame=referenceCameraFrame(level,x,y,aspect),camera=new T.PerspectiveCamera(44,aspect,.1,190);
 camera.position.set(frame.x,frame.y,frame.z);camera.lookAt(frame.x,frame.lookY,-1);camera.updateMatrixWorld();camera.updateProjectionMatrix();
 const feet=new T.Vector3(x,y,.2).project(camera),head=new T.Vector3(x,y+level.physics.playerHeight,.2).project(camera);
 const jump=level.physics.runSpeed*2*level.physics.jumpSpeed/level.physics.gravity;
 return{level,frame,size:(head.y-feet.y)/2,screenX:(feet.x+1)/2,head:head.y,feet:feet.y,ahead:new T.Vector3(x+jump*1.5,y,.2).project(camera).x};
}

// SRS-631.7: every country is followed from the same close range as Japan.
describe('close follow camera in every country',()=>{
 it('covers all 193 countries, each with a complete level',()=>{expect(codes).toHaveLength(193);expect(codes.every(isAuthoredLevel)).toBe(true);});
 it('shows the explorer at 14–19% of a landscape screen, on the left third and fully in frame',()=>{
  for(const code of codes)for(const aspect of [4/3,16/9,2.33]){
   const shot=view(code,aspect);
   expect(shot.size,code).toBeGreaterThanOrEqual(.14);expect(shot.size,code).toBeLessThanOrEqual(.19);
   expect(shot.screenX,code).toBeGreaterThan(.26);expect(shot.screenX,code).toBeLessThan(.38);
   expect(shot.head,code).toBeLessThan(.7);expect(shot.feet,code).toBeGreaterThan(-.8);
  }
 });
 it('keeps one and a half full jumps of the route visible ahead in every country',()=>{
  for(const code of codes)for(const aspect of [4/3,16/9,2.33])expect(view(code,aspect).ahead,code).toBeLessThan(1);
 });
 it('stays a little farther back on a portrait screen so the lead is not lost',()=>{
  for(const code of codes){const wide=view(code,16/9),tall=view(code,.6);expect(tall.frame.z,code).toBeGreaterThan(wide.frame.z);expect(tall.size,code).toBeGreaterThanOrEqual(.11);}
 });
 it('scales the common authored distance to the Japan distance',()=>{expect(20.5*closeFollowScale).toBeCloseTo(japanCloseCamera.distance,10);expect(view('EGY',16/9).frame.z).toBeLessThan(15);});
 it('opens every complete level with the sweep, not only Japan',()=>{
  const scene=readFileSync('components/world-explorer/country-scene.ts','utf8');
  expect(scene).toContain('const sweeps=authored;');expect(scene).not.toContain("const sweeps=level.countryId==='JP'");
 });
});

// SRS-631.8: each country's own haze starts nearer in the close view.
describe('depth haze for the close view',()=>{
 it('starts the haze nearer but never in front of the route',()=>{
  for(const [near,far] of [[35,170],[50,200],[60,230],[80,300],[180,360]]){
   const haze=closeViewHaze(near,far);
   expect(haze.near).toBeLessThan(near);expect(haze.near).toBeGreaterThanOrEqual(20);
   expect(haze.far).toBeLessThanOrEqual(far);expect(haze.far).toBeGreaterThanOrEqual(haze.near+60);
  }
  expect(closeViewHaze(10,40)).toEqual({near:20,far:80});
 });
 it('is applied by the level scene in gameplay only, leaves Japan to its own range and is not applied twice',()=>{
  const scene=readFileSync('components/world-explorer/country-scene.ts','utf8');
  expect(scene).toContain("if(view!=='gameplay'||level.countryId==='JP'||!(fog instanceof T.Fog))return;");
  expect(scene).toContain('if(hazed&&fog.near===hazed.near&&fog.far===hazed.far)return;');
  expect(scene).toContain("scenery.setView?.('gameplay');depthHaze('gameplay');");
 });
});
