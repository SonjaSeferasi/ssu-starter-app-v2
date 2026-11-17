import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {cameraTrackingHeight,openingSweepFrame,openingSweepSeconds,referenceCameraFrame} from '../lib/world-explorer/game-camera';
import {levelDefinitionFor} from '../lib/world-explorer/level-manifest';

// SRS-631.1: the close follow camera. The player is about half again as large
// as in the earlier wide framing, and the next landings stay in view.
describe('Japan gameplay camera readability',()=>{
 it('projects the player at 15–19% of a landscape screen (12–14% in portrait) with usable forward landing space',()=>{
  const level=levelDefinitionFor('JPN'),x=level.platforms[0].x+level.spawn.offset;
  for(const aspect of [.55,.75,4/3,16/9,2.33]){
   const frame=referenceCameraFrame(level,x,0,aspect),camera=new T.PerspectiveCamera(44,aspect,.1,190);
   camera.position.set(frame.x,frame.y,frame.z);camera.lookAt(frame.x,frame.lookY,-1);camera.updateMatrixWorld();camera.updateProjectionMatrix();
   const feet=new T.Vector3(x,0,.2).project(camera),head=new T.Vector3(x,level.physics.playerHeight,.2).project(camera);
   const screenHeight=(head.y-feet.y)/2,screenX=(feet.x+1)/2;
   if(aspect>1){expect(screenHeight).toBeGreaterThanOrEqual(.15);expect(screenHeight).toBeLessThanOrEqual(.19);}else{expect(screenHeight).toBeGreaterThanOrEqual(.12);expect(screenHeight).toBeLessThanOrEqual(.14);}
   expect(screenX).toBeGreaterThan(.28);expect(screenX).toBeLessThan(.36);
   expect(head.y).toBeLessThan(.65);expect(feet.y).toBeGreaterThan(-.75);
   if(aspect>1){
    // The first climbing ledge is always in view; a wide screen also shows the second.
    const upcoming=aspect<1.6?['jp-upper-01']:['jp-upper-01','jp-upper-02'];
    for(const id of upcoming){
     const rock=level.platforms.find(p=>p.id===id)!,point=new T.Vector3(rock.x+rock.width/2,rock.y,0).project(camera);
     expect(point.x).toBeGreaterThan(-1);expect(point.x).toBeLessThan(1);expect(point.y).toBeLessThan(.75);
    }
   }
  }
 });
 it('holds the horizon through a normal jump and follows elevated landings without zooming out',()=>{
  const level=levelDefinitionFor('JPN');let anchor=0;
  for(const y of [.1,.9,1.8,1.2,.2]){anchor=cameraTrackingHeight(anchor,y,false);expect(anchor).toBe(0);}
  anchor=cameraTrackingHeight(anchor,3.4,true);
  const start=referenceCameraFrame(level,24,0,16/9),high=referenceCameraFrame(level,24,anchor,16/9);
  expect(high.y).toBeGreaterThan(start.y+1.8);expect(high.lookY).toBeGreaterThan(start.lookY+1.8);expect(high.z).toBe(start.z);
  expect(cameraTrackingHeight(anchor,-2,false)).toBeLessThan(anchor);
 });
 it('keeps at least one and a half full jumps of route visible ahead of the player',()=>{
  const level=levelDefinitionFor('JPN'),x=level.platforms[0].x+level.spawn.offset,jump=level.physics.runSpeed*2*level.physics.jumpSpeed/level.physics.gravity;
  for(const aspect of [4/3,16/9,2.33]){
   const frame=referenceCameraFrame(level,x,0,aspect),camera=new T.PerspectiveCamera(44,aspect,.1,190);
   camera.position.set(frame.x,frame.y,frame.z);camera.lookAt(frame.x,frame.lookY,-1);camera.updateMatrixWorld();camera.updateProjectionMatrix();
   expect(new T.Vector3(x+jump*1.5,0,.2).project(camera).x).toBeLessThan(1);
  }
 });
 it('opens high and far back on the vista and settles exactly on the gameplay framing',()=>{
  const level=levelDefinitionFor('JPN'),frame=referenceCameraFrame(level,2,0,16/9),start=openingSweepFrame(frame,0),middle=openingSweepFrame(frame,openingSweepSeconds/2);
  expect(start.z).toBeGreaterThan(frame.z+10);expect(start.y).toBeGreaterThan(frame.y+4);
  expect(middle.z).toBeLessThan(start.z);expect(middle.z).toBeGreaterThan(frame.z);expect(middle.y).toBeLessThan(start.y);
  expect(openingSweepFrame(frame,openingSweepSeconds)).toEqual(frame);expect(openingSweepFrame(frame,openingSweepSeconds+5)).toEqual(frame);
 });
});
