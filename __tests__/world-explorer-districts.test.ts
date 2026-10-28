import {describe,expect,it} from 'vitest';
import * as T from 'three';
import {addProfileDistrict} from '../components/world-explorer/profile-districts';
import {countryProfile} from '../lib/world-explorer/profiles';
import {countries} from '../lib/world-explorer/catalog';

function build(code:string){const root=new T.Group();expect(addProfileDistrict(root,countryProfile(code)!)).toBe(true);root.updateMatrixWorld(true);return root;}
function names(root:T.Object3D,name:string){const found:T.Object3D[]=[];root.traverse(o=>{if(o.name===name)found.push(o);});return found;}

describe('Profile-led architectural districts',()=>{
 it('distinguishes the imperial courtyard axis from a European palace',()=>{
  const root=build('CHN');expect(names(root,'hall-timber-body')).toHaveLength(3);expect(names(root,'curved-eaves-roof').length).toBeGreaterThan(3);
  expect(names(root,'central-processional-axis')).toHaveLength(1);expect(names(root,'courtyard-side-hall')).toHaveLength(2);
  const wings=names(root,'courtyard-side-hall');expect(wings[0].position.x).toBe(-wings[1].position.x);
 });
 it('models Lalibela as a cruciform monolith within an excavated precinct',()=>{
  const root=build('ETH'),church=root.getObjectByName('cruciform-rock-cut-monolith')!;
  const ray=new T.Raycaster(new T.Vector3(0,10,0),new T.Vector3(0,-1,0));expect(ray.intersectObject(church,false)).not.toHaveLength(0);
  ray.set(new T.Vector3(1.25,10,1.25),new T.Vector3(0,-1,0));expect(ray.intersectObject(church,false)).toHaveLength(0);
  const bounds=new T.Box3().setFromObject(church),plateau=new T.Box3().setFromObject(root.getObjectByName('surrounding-living-rock')!);
  expect(bounds.max.y).toBeLessThan(plateau.max.y);expect(bounds.min.y).toBeGreaterThan(0);
  expect(names(root,'excavated-courtyard-floor')).toHaveLength(1);
 });
 it('preserves monastery and medieval town roof identities over a generic roof hint',()=>{
  for(const code of ['ARM','GEO']){const root=build(code);expect(names(root,'conical-monastery-dome')).toHaveLength(1);expect(names(root,'cross-church-longitudinal')).toHaveLength(1);}
  const tallinn=build('EST');expect(names(tallinn,'street-facing-gable')).toHaveLength(6);expect(names(tallinn,'gothic-spire')).toHaveLength(1);expect(names(tallinn,'conical-monastery-dome')).toHaveLength(0);
 });
 it('uses physical place traits for timber, earth, basalt, mounds and medina settings',()=>{
  expect(names(build('LVA'),'vertical-timber').length).toBeGreaterThan(0);
  expect(names(build('YEM'),'earthen-high-rise')).toHaveLength(7);
  expect(names(build('TGO'),'thatched-granary-roof')).toHaveLength(4);
  expect(names(build('FSM'),'cross-stacked-basalt').length).toBeGreaterThan(12);
  expect(names(build('DNK'),'turf-burial-mound')).toHaveLength(2);
  expect(names(build('MAR'),'courtyard-garden')).toHaveLength(1);
 });
 it('leaves dedicated forms and unrecognized profiles to their existing builders',()=>{
  for(const code of ['JOR','KHM','ITA','GRC','TON','SOM','USA','JPN','EGY']){const root=new T.Group();expect(addProfileDistrict(root,countryProfile(code)!)).toBe(false);expect(root.children).toHaveLength(0);}
  const template=countryProfile('ALB')!;
  for(const [landmarkName,features] of [['Machu Picchu',['Inca terraces','Archaeological remains']],['Great Zimbabwe',['Stone buildings','Archaeological remains']]] as const){const root=new T.Group();expect(addProfileDistrict(root,{...template,landmarkName,features:[...features]})).toBe(false);expect(root.children).toHaveLength(0);}
 });
 it('keeps every handled district finite and within the shared landmark geometry budget',()=>{
  let count=0;
  for(const country of countries){const root=new T.Group();if(!addProfileDistrict(root,countryProfile(country.code)!))continue;count++;
   let vertices=0;const geometry=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();
   root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){geometry.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);const attr=o.geometry.getAttribute('position');vertices+=attr.count;expect(attr.array.every(Number.isFinite)).toBe(true);}});
   const bounds=new T.Box3().setFromObject(root);expect(bounds.isEmpty()).toBe(false);expect(bounds.max.length()).toBeLessThan(20);expect(vertices).toBeGreaterThan(300);expect(vertices).toBeLessThan(50000);
   geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
  }
  expect(count).toBeGreaterThan(25);
 });
});
