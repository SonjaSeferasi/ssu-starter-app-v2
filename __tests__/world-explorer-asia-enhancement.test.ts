import {describe,it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import * as T from 'three';
import {levelDefinitionFor} from '../lib/world-explorer/level-manifest';
import {irregularBasin,contourBench,organicCave} from '../components/world-explorer/countries/asia-enhancement-kit';

const baseline=JSON.parse(readFileSync('documentation/world-explorer/review/asia/enhancement/baseline-levels.json','utf8'));
describe('Asia enhancement preservation and new art geometry',()=>{
 it('preserves the complete authored gameplay definitions for all 47 countries at all runtime settings during the visual pass',()=>{
  for(const [code,levels]of Object.entries(baseline) as [string,unknown[]][])for(let d=1;d<=4;d++)expect(levelDefinitionFor(code,d as 1|2|3|4),code+'/'+d).toEqual(levels[d-1]);
 });
 it('builds a closed irregular limestone rim around a water footprint rather than a rectangular pool',()=>{
  const root=new T.Group(),b=irregularBasin(root,{name:'test-basin',x:0,y:3,z:0,width:20,depth:10,seed:31,low:false});root.updateMatrixWorld(true);
  const ray=new T.Raycaster(new T.Vector3(0,10,0),new T.Vector3(0,-1,0));expect(ray.intersectObject(b.water).length).toBeGreaterThan(0);expect(ray.intersectObject(b.rim)).toHaveLength(0);
  expect(b.water.geometry.getAttribute('color').count).toBe(b.water.geometry.getAttribute('position').count);
  ray.set(new T.Vector3(10.5,10,5),new T.Vector3(0,-1,0));expect(ray.intersectObject(b.water)).toHaveLength(0);
  expect(b.rim.geometry.getAttribute('position').array.every(Number.isFinite)).toBe(true);expect(b.rim.userData.nonColliding).toBe(true);
 });
 it('keeps a paddy level while its retaining outline follows a curved contour',()=>{
  const root=new T.Group(),t=contourBench(root,{name:'rice',x:0,y:4,z:0,width:30,depth:6,seed:3,low:true,water:true});root.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(t.field);expect(box.max.y-box.min.y).toBeLessThan(.001);expect(box.max.z-box.min.z).toBeGreaterThan(7);
 });
 it('leaves the player lane clear and gives the limestone cave a real opening',()=>{
  const root=new T.Group(),cave=organicCave(root,12,71,'#9ba591',false);root.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(cave);expect(box.max.z).toBeLessThan(-2);
  const ray=new T.Raycaster(new T.Vector3(0,2,4),new T.Vector3(0,0,-1));expect(ray.intersectObject(cave)).toHaveLength(0);
  ray.set(new T.Vector3(6.2,2,4),new T.Vector3(0,0,-1));expect(ray.intersectObject(cave).length).toBeGreaterThan(0);
 });
});
