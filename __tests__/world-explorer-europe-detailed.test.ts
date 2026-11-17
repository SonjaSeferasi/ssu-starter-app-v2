import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {loadCountryEnvironment} from '../components/world-explorer/countries/registry';
import {levelDefinitionFor} from '../lib/world-explorer/level-manifest';
import {platformSurfaceY} from '../lib/world-explorer/platform-surface';
import {island} from '../components/world-explorer/scenic-kit';

/** Countries whose levels have their own detailed scenery (UR-632), with the
 * landmarks each must show, the scenery that must stay off the route, the
 * name of its route furniture and its moving parts. */
const countries=[
 {code:'ESP',srs:'SRS-632.2',id:'europe-es',detail:'alhambra-detailed-scenery',landmarks:['sabika-hill','alhambra-fortress','generalife','albayzin','sierra-nevada','alhambra-cypresses','spain-flag'],far:['alhambra-fortress','generalife','albayzin'],props:'alhambra-court-furniture',terrains:['ground','terrace'],flock:'granada-swifts',credits:['alhambra-red-walls-and-towers','nasrid-arcades-pools-and-tiles']},
 {code:'GRC',srs:'SRS-632.3',id:'europe-gr',detail:'acropolis-detailed-scenery',landmarks:['sacred-rock','parthenon','propylaia','erechtheion','odeon-of-herodes-atticus','olympieion','athens-city','greece-flag','acropolis-olive-trees'],far:['sacred-rock','parthenon','propylaia','erechtheion','odeon-of-herodes-atticus','olympieion'],props:'acropolis-ruins-and-olives',terrains:['ground','terrace'],flock:'acropolis-doves',credits:['parthenon-doric-colonnade','erechtheion-caryatid-porch']},
] as const;
const signals={time:0,platforms:[],wind:[],playerX:0};
function triangles(root:T.Object3D){let total=0;root.traverse(o=>{if(o instanceof T.Mesh){const p=o.geometry.getAttribute('position');total+=(o.geometry.index?.count??p.count)/3*(o instanceof T.InstancedMesh?o.count:1);}});return total;}

describe.each(countries)('$code detailed scenery ($srs)',country=>{
 const level=levelDefinitionFor(country.code),finish=level.platforms.find(p=>p.id===level.finish.platformId)!;
 async function mount(low:boolean){const environment=(await loadCountryEnvironment(level.environmentId!))!,scene=new T.Scene(),context={scene,level,finish:finish.x+level.finish.offset,low,reducedMotion:false};return{environment,context,mounted:environment.mount(context)};}
 it('loads its own scenery under the shared environment id and credits what it shows',async()=>{
  const {environment,mounted}=await mount(true);expect(environment.id).toBe(country.id);for(const asset of country.credits)expect(environment.info.assets).toContain(asset);mounted.dispose();
 });
 it('builds each landmark as finite geometry and leaves no generic block landmark behind',async()=>{
  const {mounted}=await mount(false),detail=mounted.root.getObjectByName(country.detail)!;expect(detail.userData.collidable).toBe(false);
  for(const name of country.landmarks)expect(detail.getObjectByName(name),name).toBeTruthy();
  let generic=0;mounted.root.traverse(o=>{if(o.name.endsWith('-landmark'))generic++;if(o instanceof T.Mesh){const p=o.geometry.getAttribute('position');expect(Array.from(p.array as ArrayLike<number>).every(Number.isFinite),o.name).toBe(true);}});
  expect(generic).toBe(0);mounted.dispose();
 },40000);
 it('keeps the landmarks behind the route and inside the scenery budget, with less work in low graphics',async()=>{
  const {mounted}=await mount(false),detail=mounted.root.getObjectByName(country.detail)!;
  for(const name of country.far)expect(new T.Box3().setFromObject(detail.getObjectByName(name)!).max.z,name).toBeLessThan(-11);
  const full=triangles(mounted.root);expect(full).toBeLessThan(250000);mounted.dispose();
  const low=await mount(true);expect(triangles(low.mounted.root)).toBeLessThan(full);low.mounted.dispose();
 },40000);
 it('stills its moving parts for reduced motion and cleans up safely twice',async()=>{
  const {mounted}=await mount(true),flock=mounted.root.getObjectByName(country.flock)!;expect(flock.visible).toBe(true);
  mounted.update(3,.1,signals);mounted.setReducedMotion(true);expect(flock.visible).toBe(false);mounted.update(9,.1,signals);mounted.setReducedMotion(false);expect(flock.visible).toBe(true);
  mounted.dispose();mounted.dispose();
 },40000);
 it('dresses the route with the country\'s own furniture behind the walking lane, on an unchanged walking surface',async()=>{
  const {environment,context,mounted}=await mount(false);let furnished=0;const seen=new Set<string>();
  for(const p of level.platforms){
   const root=new T.Group();island(root,0,0,p.width,p.depth,'temperate',3,p.thickness);environment.dressPlatform(root,p,context);root.updateMatrixWorld(true);
   const props=root.getObjectByName(country.props);
   if(props){furnished++;seen.add(p.terrain||'');const bounds=new T.Box3().setFromObject(props);expect(bounds.max.z,p.id).toBeLessThanOrEqual(-.55);expect(bounds.min.x,p.id).toBeGreaterThanOrEqual(-p.width/2-.35);expect(bounds.max.x,p.id).toBeLessThanOrEqual(p.width/2+.35);expect(props.userData.collidable).toBe(false);}
   const cap=root.getObjectByName('country-platform-cap');if(!cap)continue;
   for(const fraction of [.15,.5,.85]){const x=(fraction-.5)*p.width,expected=platformSurfaceY({...p,x:-p.width/2,y:0},x),hits=new T.Raycaster(new T.Vector3(x,expected+5,0),new T.Vector3(0,-1,0)).intersectObject(cap);expect(hits.length,p.id).toBeGreaterThan(0);expect(hits[0].point.y,p.id).toBeCloseTo(expected,1);}
  }
  expect(furnished).toBeGreaterThanOrEqual(8);for(const terrain of country.terrains)expect(seen.has(terrain),terrain).toBe(true);mounted.dispose();
 },40000);
});
