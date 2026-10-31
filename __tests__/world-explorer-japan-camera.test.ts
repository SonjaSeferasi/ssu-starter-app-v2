import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {cameraTrackingHeight,referenceCameraFrame} from '../lib/world-explorer/game-camera';
import {levelDefinitionFor} from '../lib/world-explorer/level-manifest';

describe('Japan gameplay camera readability',()=>{
 it('projects the player at 9–12% of the screen with usable forward landing space',()=>{
  const level=levelDefinitionFor('JPN'),x=level.platforms[0].x+level.spawn.offset;
  for(const aspect of [.55,.75,4/3,16/9,2.33]){
   const frame=referenceCameraFrame(level,x,0,aspect),camera=new T.PerspectiveCamera(44,aspect,.1,190);
   camera.position.set(frame.x,frame.y,frame.z);camera.lookAt(frame.x,frame.lookY,-1);camera.updateMatrixWorld();camera.updateProjectionMatrix();
   const feet=new T.Vector3(x,0,.2).project(camera),head=new T.Vector3(x,level.physics.playerHeight,.2).project(camera);
   const screenHeight=(head.y-feet.y)/2,screenX=(feet.x+1)/2;
   expect(screenHeight).toBeGreaterThanOrEqual(.09);expect(screenHeight).toBeLessThanOrEqual(.12);
   expect(screenX).toBeGreaterThan(.28);expect(screenX).toBeLessThan(.36);
   expect(head.y).toBeLessThan(.65);expect(feet.y).toBeGreaterThan(-.75);
   if(aspect>1){
    const upcoming=aspect<1.6?['jp-upper-01','jp-upper-02']:['jp-upper-01','jp-upper-02','jp-star-terrace'];
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
});
