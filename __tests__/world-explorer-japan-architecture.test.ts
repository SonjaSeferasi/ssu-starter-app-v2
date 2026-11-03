import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {createJapanPagoda,createJapanTorii,createJapanLantern,createJapanHouse,addJapanArchitecture} from '../components/world-explorer/japan-architecture';

function vertices(root:T.Object3D){let count=0;root.traverse(o=>{if(o instanceof T.Mesh)count+=o.geometry.getAttribute('position').count;});return count;}
function matching(root:T.Object3D,name:string){let count=0;root.traverse(o=>{if(o.name===name)count++;});return count;}

describe('Detailed Japan architecture',()=>{
 it('gives the five-tier pagoda stepped silhouettes, real roof overhangs, balconies and tile geometry',()=>{
  const root=createJapanPagoda();root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root);
  expect(root.userData.tiers).toBe(5);expect(matching(root,'japan-curved-tiled-roof')).toBe(5);expect(matching(root,'japan-timber-balcony')).toBe(5);expect(matching(root,'japan-layered-roof-brackets')).toBe(5);
  expect(bounds.max.y).toBeGreaterThan(9);expect(bounds.max.y).toBeLessThan(11);expect(bounds.max.x-bounds.min.x).toBeGreaterThan(5.4);
  const ray=new T.Raycaster(new T.Vector3(2.55,12,0),new T.Vector3(0,-1,0)),hit=ray.intersectObject(root,true)[0];expect(hit).toBeDefined();expect(hit.point.y).toBeGreaterThan(1);expect(hit.point.y).toBeLessThan(3);
  expect(vertices(root)).toBeGreaterThan(30000);
 });
 it('keeps the torii passage genuinely open between modeled posts',()=>{
  const root=createJapanTorii({width:3.5});root.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(0,1,5),new T.Vector3(0,0,-1));expect(ray.intersectObject(root,true)).toHaveLength(0);
  ray.set(new T.Vector3(3.5*.36,1,5),new T.Vector3(0,0,-1));expect(ray.intersectObject(root,true).length).toBeGreaterThan(0);expect(root.userData.features).toContain('modeled rope and paper streamers');
 });
 it('provides three-dimensional lantern and timber house details with compact silhouettes',()=>{
  const stone=createJapanLantern(),paper=createJapanLantern({kind:'hanging'}),house=createJapanHouse();
  expect(stone.userData.model).toBe('stone-toro-with-open-light-chamber');expect(paper.userData.model).toBe('ribbed-paper-chochin');expect(house.userData.features).toContain('raised wooden veranda');expect(matching(house,'recessed-lattice-panel')).toBeGreaterThanOrEqual(6);
  expect(new T.Box3().setFromObject(stone).max.y).toBeLessThan(2);expect(new T.Box3().setFromObject(house).max.y).toBeLessThan(3.2);expect(vertices(stone)).toBeGreaterThan(500);expect(vertices(paper)).toBeGreaterThan(1000);
 });
 it('keeps a composed district finite and reduces geometry in low graphics mode',()=>{
  const high=addJapanArchitecture(new T.Group(),{finish:138}),low=addJapanArchitecture(new T.Group(),{finish:138,low:true});
  const highCount=vertices(high),lowCount=vertices(low);expect(highCount).toBeGreaterThan(50000);expect(highCount).toBeLessThan(200000);expect(lowCount).toBeLessThan(highCount*.72);
  high.traverse(o=>{if(o instanceof T.Mesh)expect(o.geometry.getAttribute('position').array.every(Number.isFinite)).toBe(true);});expect(new T.Box3().setFromObject(high).max.z).toBeLessThan(-3);
 });
});
