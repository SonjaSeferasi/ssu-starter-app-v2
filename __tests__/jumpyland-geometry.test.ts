import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {courses} from '../components/jumpyland/levels';
import {landingHeight,landingBottom,safeRespawn} from '../components/jumpyland/landing-geometry';
import {cliffGeometry} from '../components/jumpyland/terrain-model';

describe('Visible Jumpyland terrain and collision clearance',()=>{
 it('places every cap vertex in the walking corridor on the collision profile',()=>{
  for(const course of courses)for(const p of [...course.platforms,...course.ledges].filter(p=>p.kind==='rock')){
   const geometry=cliffGeometry(p,landingBottom(course,p),7),position=geometry.cap.getAttribute('position');
   for(let i=0;i<position.count;i++)if(Math.abs(position.getZ(i))<.001)expect(position.getY(i)*-100).toBeCloseTo(landingHeight(p,p.x+position.getX(i)*100),3);
   geometry.cap.dispose();geometry.rock.dispose();
  }
 });
 it('has solid raycastable tops and closes rocks at the collision underside',()=>{
  const course=courses[1],p=course.platforms[3],bottom=landingBottom(course,p),geometry=cliffGeometry(p,bottom,19);
  const cap=new T.Mesh(geometry.cap,new T.MeshBasicMaterial());cap.updateMatrixWorld();
  for(let x=.1;x<p.width/100-.1;x+=.1){const ray=new T.Raycaster(new T.Vector3(x,20,0),new T.Vector3(0,-1,0));const hit=ray.intersectObject(cap)[0];expect(hit).toBeDefined();expect(Math.abs(hit.point.y*-100-landingHeight(p,p.x+x*100))).toBeLessThan(.2);}
  const positions=geometry.rock.getAttribute('position');let min=Infinity;for(let i=0;i<positions.count;i++)min=Math.min(min,positions.getY(i));expect(min*-100).toBeCloseTo(bottom,3);
  geometry.cap.dispose();geometry.rock.dispose();(cap.material as T.Material).dispose();
 });
 it('translates moving rock profiles without changing their shape',()=>{
  const original=courses[1].platforms[3],moving={...original,x:original.x+37,y:original.y-21,profileX:original.x};
  for(let x=0;x<=original.width;x+=5)expect(landingHeight(moving,moving.x+x)-landingHeight(original,original.x+x)).toBeCloseTo(-21,5);
 });
 it('matches the bridge sag and mushroom crown rather than treating either as a flat box',()=>{
  const bridge=courses[2].platforms.find(p=>p.kind==='bridge')!,mushroom=courses[0].ledges.find(p=>p.kind==='mushroom')!;
  expect(landingHeight(bridge,bridge.x+bridge.width/2)).toBe(bridge.y+22);
  expect(landingHeight(mushroom,mushroom.x+mushroom.width/2)).toBe(mushroom.y);
  expect(landingHeight(mushroom,mushroom.x)).toBeGreaterThan(mushroom.y+45);
 });
 it('finds a clear respawn beside an overhead platform and refuses a completely blocked one',()=>{
  const base=courses[0].platforms[0],blocker={left:0,right:190,top:280,bottom:410};
  const spawn=safeRespawn(base,90,[blocker]);expect(spawn).not.toBeNull();expect(spawn!.x-21).toBeGreaterThanOrEqual(190);expect(spawn!.y).toBe(landingHeight(base,spawn!.x));
  expect(safeRespawn(base,90,[{left:0,right:520,top:250,bottom:490}])).toBeNull();
 });
});
