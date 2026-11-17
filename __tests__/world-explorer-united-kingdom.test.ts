import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {loadCountryEnvironment} from '../components/world-explorer/countries/registry';
import {westminster} from '../components/world-explorer/countries/united-kingdom';
import {levelDefinitionFor} from '../lib/world-explorer/level-manifest';
import {platformSurfaceY} from '../lib/world-explorer/platform-surface';
import {island} from '../components/world-explorer/scenic-kit';

const level=levelDefinitionFor('GBR');
async function mount(low:boolean){
 const environment=(await loadCountryEnvironment(level.environmentId!))!,scene=new T.Scene(),context={scene,level,finish:157,low,reducedMotion:false};
 return{environment,scene,context,mounted:environment.mount(context)};
}
function triangles(root:T.Object3D){let total=0;root.traverse(o=>{if(o instanceof T.Mesh){const p=o.geometry.getAttribute('position');total+=(o.geometry.index?.count??p.count)/3*(o instanceof T.InstancedMesh?o.count:1);}});return total;}

// SRS-632.1: the United Kingdom level is recognisably Westminster on the Thames.
describe('United Kingdom: detailed Westminster scenery',()=>{
 it('loads its own scenery under the same environment id and credits what it shows',async()=>{
  const {environment,mounted}=await mount(true);
  expect(environment.id).toBe('europe-gb');
  for(const asset of ['elizabeth-tower-clock-dials','palace-gothic-bays','westminster-bridge-bus-and-cab','london-street-furniture'])expect(environment.info.assets).toContain(asset);
  mounted.dispose();
 });
 it('builds every Westminster landmark as real geometry, with no block stand-in left behind',async()=>{
  const {mounted}=await mount(false),detail=mounted.root.getObjectByName('westminster-detailed-scenery')!;
  expect(detail.userData.collidable).toBe(false);
  for(const name of ['thames-embankment','victoria-tower','palace-of-westminster','central-tower','elizabeth-tower','westminster-bridge','westminster-skyline','thames-tour-boat','london-plane-trees','union-flag'])expect(detail.getObjectByName(name),name).toBeTruthy();
  expect(mounted.root.getObjectByName('westminster-tower-landmark')).toBeUndefined();
  const palace=detail.getObjectByName('palace-of-westminster')!;expect(palace.userData.bays).toBeGreaterThanOrEqual(60);expect(palace.userData.style).toBe('Neo-Gothic');
  detail.traverse(o=>{if(o instanceof T.Mesh)expect(Array.from(o.geometry.getAttribute('position').array as ArrayLike<number>).every(Number.isFinite),o.name).toBe(true);});
  mounted.dispose();
 },30000);
 it('gives Elizabeth Tower four lit clock dials that the finish camera can see',async()=>{
  const {mounted}=await mount(false),tower=mounted.root.getObjectByName('elizabeth-tower')!,dials=tower.getObjectByName('elizabeth-tower-clock-dials') as T.Mesh;
  expect(tower.userData.clockFaces).toBe(4);expect((dials.material as T.MeshStandardMaterial).emissiveIntensity).toBeGreaterThan(0);
  const box=new T.Box3().setFromObject(dials),size=box.getSize(new T.Vector3());expect(size.x).toBeGreaterThan(4);expect(size.z).toBeGreaterThan(4);expect(size.y).toBeGreaterThan(2.8);
  // From the finish, the dial sits inside the frame, above the gate.
  const finish=level.platforms.find(p=>p.id===level.finish.platformId)!,camera=new T.PerspectiveCamera(44,16/9,.1,190);
  camera.position.set(finish.x+finish.width-4,finish.y+2.6,12.8);camera.lookAt(camera.position.x,finish.y+1.75,-1);camera.updateMatrixWorld();camera.updateProjectionMatrix();
  const centre=new T.Vector3(westminster.elizabethX,tower.userData.dialCentreY,box.max.z).project(camera);
  expect(Math.abs(centre.x)).toBeLessThan(.9);expect(centre.y).toBeGreaterThan(.2);expect(centre.y).toBeLessThan(.8);
  mounted.dispose();
 },30000);
 it('keeps the palace on the far bank, clear of the route, and stays inside the scenery budget',async()=>{
  const {mounted}=await mount(false),detail=mounted.root.getObjectByName('westminster-detailed-scenery')!;
  for(const name of ['victoria-tower','palace-of-westminster','central-tower','elizabeth-tower','thames-embankment','westminster-skyline'])expect(new T.Box3().setFromObject(detail.getObjectByName(name)!).max.z,name).toBeLessThan(-14);
  expect(triangles(mounted.root)).toBeLessThan(250000);mounted.dispose();
  const low=await mount(true);expect(triangles(low.mounted.root)).toBeLessThan(triangles((await mount(false)).mounted.root));low.mounted.dispose();
 },40000);
 it('moves the river boat and the gulls, and stills them for reduced motion',async()=>{
  const {mounted}=await mount(true),boat=mounted.root.getObjectByName('thames-tour-boat')!,gulls=mounted.root.getObjectByName('thames-gulls')!;
  mounted.update(0,0,{time:0,platforms:[],wind:[],playerX:0});const start=boat.position.x;mounted.update(10,.1,{time:10,platforms:[],wind:[],playerX:0});expect(boat.position.x).toBeGreaterThan(start+5);
  mounted.setReducedMotion(true);const held=boat.position.x;mounted.update(20,.1,{time:20,platforms:[],wind:[],playerX:0});expect(boat.position.x).toBe(held);expect(gulls.visible).toBe(false);
  mounted.dispose();mounted.dispose();
 },30000);
 it('dresses the route with London street furniture behind the walking lane, on an unchanged walking surface',async()=>{
  const {environment,context,mounted}=await mount(false);let furnished=0;const seen=new Set<string>();
  for(const p of level.platforms){
   const root=new T.Group();island(root,0,0,p.width,p.depth,'temperate',3,p.thickness);environment.dressPlatform(root,p,context);root.updateMatrixWorld(true);
   const props=root.getObjectByName('london-street-furniture');
   if(props){furnished++;seen.add(p.terrain||'');const bounds=new T.Box3().setFromObject(props);expect(bounds.max.z,p.id).toBeLessThanOrEqual(-.55);expect(bounds.min.x,p.id).toBeGreaterThanOrEqual(-p.width/2-.2);expect(bounds.max.x,p.id).toBeLessThanOrEqual(p.width/2+.2);expect(props.userData.collidable).toBe(false);}
   const cap=root.getObjectByName('country-platform-cap');if(!cap)continue;
   for(const fraction of [.15,.5,.85]){const x=(fraction-.5)*p.width,expected=platformSurfaceY({...p,x:-p.width/2,y:0},x),hits=new T.Raycaster(new T.Vector3(x,expected+5,0),new T.Vector3(0,-1,0)).intersectObject(cap);expect(hits.length,p.id).toBeGreaterThan(0);expect(hits[0].point.y,p.id).toBeCloseTo(expected,1);}
  }
  expect(furnished).toBeGreaterThanOrEqual(12);for(const terrain of ['bridge','rooftop','ground'])expect(seen.has(terrain),terrain).toBe(true);
  mounted.dispose();
 },30000);
});
