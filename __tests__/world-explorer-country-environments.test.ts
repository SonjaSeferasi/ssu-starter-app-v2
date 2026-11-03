import {describe,expect,it} from 'vitest';
import * as T from 'three';
import {island} from '../components/world-explorer/scenic-kit';
import {environmentIds,loadCountryEnvironment} from '../components/world-explorer/countries/registry';
import type {CountryEnvironment,EnvironmentContext} from '../components/world-explorer/countries/types';
import {levelDefinitionFor} from '../lib/world-explorer/level-manifest';
import {authoredLevels} from '../lib/world-explorer/authored-levels';
import {LevelSimulation} from '../lib/world-explorer/simulation';
import {platformSurfaceY} from '../lib/world-explorer/platform-surface';

/** The ten new country environments, each with the named landmark that must make it recognizable. */
const countries:[string,string[]][]=[
 ['ITA',['colosseum','roman-aqueduct','forum-ruins-and-columns']],
 ['EGY',['pyramids-of-giza','great-sphinx','date-palm-grove']],
 ['BRA',['emergent-kapok-trees','amazon-river-channel','animated-waterfall']],
 ['CAN',['rockies-far-range','turquoise-glacial-lake','spruce-forest']],
 ['AUS',['coral-reef-formations','reef-lagoon-surface','coconut-palms']],
 ['IND',['taj-mahal','charbagh-lawns','cypress-avenues']],
 ['ZAF',['umbrella-acacias','golden-grass-tufts','wildlife-giraffe','wildlife-elephant']],
 ['NOR',['lofoten-far-peaks','red-rorbu-fishing-village','dark-blue-fjord-water']],
 ['FRA',['eiffel-tower','haussmann-boulevards','seine-river']],
 ['USA',['statue-of-liberty','lower-manhattan-skyline','new-york-harbor-water']],
];
function vertices(root:T.Object3D){let n=0;root.traverse(object=>{if(object instanceof T.Mesh)n+=object.geometry.getAttribute('position').count*(object instanceof T.InstancedMesh?object.count:1);});return n;}
async function mount(code:string,low=false,reducedMotion=false){
 const level=levelDefinitionFor(code),environment=(await loadCountryEnvironment(level.environmentId))!,scene=new T.Scene();scene.background=new T.Color('#123456');
 const finish=new LevelSimulation(level).position(level.finish).x,context:EnvironmentContext={scene,level,finish,low,reducedMotion};
 return{level,environment,scene,context,mounted:environment.mount(context)};
}

describe('Country environment registry',()=>{
 it('registers one lazily imported environment for every authored level',async()=>{
  for(const [code,level] of Object.entries(authoredLevels)){
   const id=String(level.environmentId);expect(environmentIds,code).toContain(id);
   const environment=await loadCountryEnvironment(id);expect(environment?.id,code).toBe(id);
   expect(environment?.info.landmarkSource).toMatch(/^https:\/\//);expect(environment?.info.license.length).toBeGreaterThan(20);
  }
  expect(await loadCountryEnvironment('unknown-environment')).toBeNull();
 },120000);// 193 environment modules imported one by one: about 9 s alone, over 30 s under the full parallel suite.
});

describe.each(countries)('%s environment',(code,landmarks)=>{
 it('builds the named landmark, layered scenery and finite real geometry',async()=>{
  const {mounted,scene}=await mount(code);
  for(const name of landmarks)expect(mounted.root.getObjectByName(name),name).toBeDefined();
  expect(mounted.root.userData.layers.length).toBeGreaterThanOrEqual(5);expect(mounted.root.userData.decorative).toBe(true);
  let meshes=0;mounted.root.traverse(object=>{if(!(object instanceof T.Mesh))return;meshes++;const p=object.geometry.getAttribute('position');for(let i=0;i<p.count;i+=7)expect(Number.isFinite(p.getX(i))&&Number.isFinite(p.getY(i))&&Number.isFinite(p.getZ(i))).toBe(true);});
  expect(meshes).toBeGreaterThan(8);expect(vertices(mounted.root)).toBeGreaterThan(20000);expect(vertices(mounted.root)).toBeLessThan(4000000);
  expect(scene.fog).toBeInstanceOf(T.Fog);
  mounted.dispose();expect(scene.getObjectByName(mounted.root.name)).toBeUndefined();expect((scene.background as T.Color).getHexString()).toBe('123456');mounted.dispose();
 },30000);
 it('animates, honours reduced motion and does less work in low graphics',async()=>{
  const standard=await mount(code),low=await mount(code,true),simulation=new LevelSimulation(standard.level);
  const signals={time:2,platforms:simulation.platforms,wind:(standard.level.zones||[]).map(zone=>({id:zone.id,phase:'gust' as const,strength:1,force:zone.force})),playerX:10};
  expect(()=>{standard.mounted.update(2,1/60,signals);standard.mounted.frame(40);standard.mounted.setReducedMotion(true);standard.mounted.update(3,1/60,signals);standard.mounted.setReducedMotion(false);standard.mounted.setView?.('overview');standard.mounted.setView?.('gameplay');}).not.toThrow();
  expect(vertices(low.mounted.root)).toBeLessThan(vertices(standard.mounted.root));
  standard.mounted.dispose();low.mounted.dispose();
 },30000);
 it('dresses every platform with a flat walking cap and keeps decoration out of the lane',async()=>{
  const {level,environment,context}=await mount(code);
  for(const definition of level.platforms){
   const scene=new T.Scene(),root=island(scene,definition.x+definition.width/2,definition.y,definition.width,definition.depth,'temperate',3,definition.thickness);
   environment.dressPlatform(root,definition,{...context,scene});scene.updateMatrixWorld(true);
   // Straight down the walking lane, the first surface hit is the cap, at the
   // collision height (which climbs on slopes and stairs).
   // Rays start a little above head height; samples avoid hairline plank joints.
   for(const z of [-.4,0,.4])for(const t of [.27,.53,.73]){
    const x=definition.x+definition.width*t,surface=platformSurfaceY(definition,x),hit=new T.Raycaster(new T.Vector3(x,surface+2.6,z),new T.Vector3(0,-1,0)).intersectObject(root,true)[0];
    expect(hit,`${definition.id} at ${t},${z}`).toBeDefined();expect(Math.abs(hit.point.y-surface),`${definition.id} at ${t},${z}`).toBeLessThan(.06);
   }
  }
 },30000);
 it('creates an animated original enemy and a discovery block on the collider bottom',async()=>{
  const {environment}=await mount(code),parent=new T.Group(),enemy=(environment as CountryEnvironment).createEnemy(parent);
  for(const state of ['IDLE','PATROL_LEFT','PATROL_RIGHT','TURN','ALERT'] as const)expect(()=>enemy.update(1.3,state==='PATROL_LEFT'?-1:1,state)).not.toThrow();
  enemy.update(1,1,'DISABLED');expect(enemy.root.visible).toBe(false);enemy.update(1,1,'IDLE');
  const size=new T.Box3().setFromObject(enemy.root).getSize(new T.Vector3());expect(size.y).toBeGreaterThan(.4);expect(size.y).toBeLessThan(1.4);
  const block=environment.createDiscoveryBlock(parent,.75,.8),bounds=new T.Box3().setFromObject(block);expect(bounds.min.y).toBeCloseTo(0,1);expect(bounds.max.y).toBeGreaterThan(.75);
  const marker=new T.Group(),gate=new T.Group();environment.decorateCheckpoint(marker,{} as EnvironmentContext);environment.decorateFinish(gate,{} as EnvironmentContext);expect(marker.children.length).toBeGreaterThan(0);expect(new T.Box3().setFromObject(gate).max.y).toBeGreaterThan(3);
 },30000);
});
