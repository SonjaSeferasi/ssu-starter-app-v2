import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {eastAsiaTerrain} from '../components/world-explorer/countries/east-asia-terrain';
import {levelDefinitionFor} from '../lib/world-explorer/level-manifest';
import {platformSurfaceY} from '../lib/world-explorer/platform-surface';
import {disposeTree} from '../components/world-explorer/kit/common';
import {createEastAsiaEnvironment} from '../components/world-explorer/countries/east-asia';
import type {NewEastAsiaCode} from '../lib/world-explorer/east-asia';

describe.each(['CHN','MNG','PRK','KOR'] as NewEastAsiaCode[])('%s country-specific art and collision agreement',code=>{
 it('keeps every static central walking surface at the authored collision height',()=>{
  const level=levelDefinitionFor(code);
  for(const p of level.platforms.filter(p=>!p.motion)){
   const original=structuredClone(p),root=new T.Group();eastAsiaTerrain(root,p,code,true);root.updateMatrixWorld(true);
   for(let i=1;i<31;i++){
    const x=-p.width/2+p.width*i/31,expected=platformSurfaceY({...p,x:-p.width/2,y:0},x);
    const ray=new T.Raycaster(new T.Vector3(x,12,0),new T.Vector3(0,-1,0)),hits=ray.intersectObject(root,true);
    expect(hits.length,`${p.id} x=${x}`).toBeGreaterThan(0);expect(Math.abs(hits[0].point.y-expected),`${p.id} x=${x}`).toBeLessThan(.04);
   }
   expect(p).toEqual(original);disposeTree(root);
  }
 });
 it('uses low irregular banks for Mongolia and a real closed terrain volume for natural ledges',()=>{
  const p=levelDefinitionFor(code).platforms[0],root=new T.Group();eastAsiaTerrain(root,p,code,true);root.updateMatrixWorld(true);
  if(code!=='KOR'){
   const body=root.getObjectByName('organic-country-terrain-body') as T.Mesh;expect(body).toBeDefined();expect(body.geometry.index?.count).toBeGreaterThan(500);
   const box=new T.Box3().setFromObject(body);expect(box.max.y-box.min.y).toBeLessThan(code==='MNG'?4:12);expect(box.max.z-box.min.z).toBeGreaterThan(3);
  }else expect(root.getObjectByName('seoul-recessed-facade-and-rooftop-services')).toBeDefined();
  disposeTree(root);
 });
});
describe('Paektu scenic reveal',()=>{
 it('models an oval caldera lake and lowers only the near scenic rim to expose its water',()=>{
  const level=levelDefinitionFor('PRK'),scene=new T.Scene(),mounted=createEastAsiaEnvironment('PRK').mount({scene,level,finish:98,low:true,reducedMotion:true});
  const lake=mounted.root.getObjectByName('paektu-caldera-lake') as T.Mesh;expect(lake.geometry.type).toBe('CircleGeometry');
  const rim=mounted.root.getObjectByName('paektu-caldera-rim') as T.Mesh,positions=rim.geometry.getAttribute('position');let front=-Infinity,back=-Infinity;
  for(let i=0;i<positions.count;i++){if(positions.getZ(i)>20)front=Math.max(front,positions.getY(i));if(positions.getZ(i)<-12)back=Math.max(back,positions.getY(i));}
  expect(back-front).toBeGreaterThan(8);mounted.dispose();
 });
});
