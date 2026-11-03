import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {createEastAsiaEnvironment} from '../components/world-explorer/countries/east-asia';
import {levelDefinitionFor} from '../lib/world-explorer/level-manifest';

describe.each([false,true])('Mongolia decorative bank seam, low=%s',low=>{
 it('covers the exposed strip at the bank foot while staying outside the player lane',()=>{
  const level=levelDefinitionFor('MNG'),original=structuredClone(level),scene=new T.Scene();
  const mounted=createEastAsiaEnvironment('MNG').mount({scene,level,finish:92,low,reducedMotion:true});mounted.root.updateMatrixWorld(true);
  const apron=mounted.root.getObjectByName('orkhon-foreground-ground-transition')!;
  const bounds=new T.Box3().setFromObject(apron);
  expect(bounds.min.z).toBeGreaterThan(level.physics.playerRadius+.3);
  // Old geometry began at z=3, leaving these rays exposed to the background.
  for(const x of [2,8,20,40,60,80])for(const z of [1.25,1.75,2.25,2.75,3.25]){
   const hits=new T.Raycaster(new T.Vector3(x,-2,z),new T.Vector3(0,-1,0)).intersectObject(apron);
   expect(hits.length,`uncovered apron at ${x},${z}`).toBeGreaterThan(0);
   expect(hits[0].point.y).toBeGreaterThan(-2.95);
  }
  expect(level).toEqual(original);mounted.dispose();
 });
});
