import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {southAsiaCodes,southAsiaPlaces} from '../lib/world-explorer/south-asia';
import {authoredDifficulty,levelDefinitionFor} from '../lib/world-explorer/level-manifest';
import {validateLevelDesign} from '../lib/world-explorer/level-validator';
import {analyzeDifficulty} from '../lib/world-explorer/difficulty';
import {criticalPlatforms,optionalPath} from '../lib/world-explorer/route-graph';
import {playSoutheastAsiaRoute} from '../lib/world-explorer/southeast-asia-playtest';
import {southAsiaEnvironment} from '../components/world-explorer/countries/south-asia';
import {island} from '../components/world-explorer/scenic-kit';
import {platformSurfaceY} from '../lib/world-explorer/platform-surface';
import {countryProfile} from '../lib/world-explorer/profiles';
import {discoveryFor} from '../lib/world-explorer-discoveries';

describe.each(southAsiaCodes)('%s South Asia review candidate',code=>{
 it('uses its sourced setting and measures at the authored tier in the runtime configuration',()=>{
  const l=levelDefinitionFor(code,authoredDifficulty(code));
  expect(validateLevelDesign(l,{physics:false}).checks.filter(c=>!c.ok)).toEqual([]);
  expect(analyzeDifficulty(l).measuredTier).toBe(southAsiaPlaces[code].tier);
  expect(countryProfile(code)?.landmarkName).toBe(southAsiaPlaces[code].landmark);
  expect(discoveryFor(code)?.sourceUrl).toBe(southAsiaPlaces[code].source);
 });
 it('completes both routes at all four runtime settings and varied cycle timings',()=>{
  for(const difficulty of [1,2,3,4] as const)for(const wait of [0,.7,1.9,3.1]){
   const l=levelDefinitionFor(code,difficulty),coins=new Set<string>();
   for(const path of [criticalPlatforms(l.routeGraph!),optionalPath(l.routeGraph!)]){
    const r=playSoutheastAsiaRoute(l,path,{collect:true,wait}),s=r.simulation.state;
    expect(s.status,`${code}/${difficulty}/${wait} x=${s.x}`).toBe('completed');expect(s.hearts).toBe(3);if(path.includes(l.stars[0].platformId))expect(s.stars).toBe(3);expect(s.discoveryFound).toBe(true);
    r.simulation.collectedCoins.forEach(id=>coins.add(id));
    expect(s.checkpointId).toBe(l.checkpoints.at(-1)!.id);
    if(code==='NPL')expect(r.events).toContain('climb');
    if(l.gates?.length){expect(r.events).toContain('switch');expect(r.events).toContain('gate-open');}
    if(l.hazards.length)expect(r.events).toContain('hazard-warning');
    for(const p of l.platforms.filter(p=>p.motion))expect(r.visited.has(p.id),p.id).toBe(true);
   }
   expect(coins.size).toBe(l.coins.length);
  }
 },30000);
 it('builds finite scenery and dresses the visible cap at the actual collision surface',()=>{
  const l=levelDefinitionFor(code),scene=new T.Scene(),e=southAsiaEnvironment(code),context={scene,level:l,finish:100,low:true,reducedMotion:true},mounted=e.mount(context);
  let triangles=0;
  mounted.root.traverse(o=>{if(o instanceof T.Mesh){const p=o.geometry.getAttribute('position');expect(Array.from(p.array).every(Number.isFinite)).toBe(true);triangles+=(o.geometry.index?.count??p.count)/3*(o instanceof T.InstancedMesh?o.count:1);}});
  expect(triangles).toBeLessThan(250000);
  mounted.root.updateMatrixWorld(true);
  mounted.root.traverse(o=>{if(o instanceof T.InstancedMesh&&o.userData.groundSurface){
   const land=mounted.root.getObjectByName(o.userData.groundSurface)!;
   for(let i=0;i<o.count;i++){const matrix=new T.Matrix4();o.getMatrixAt(i,matrix);const point=new T.Vector3().setFromMatrixPosition(matrix).applyMatrix4(o.matrixWorld),hit=new T.Raycaster(new T.Vector3(point.x,80,point.z),new T.Vector3(0,-1,0)).intersectObject(land)[0];expect(hit).toBeDefined();expect(point.y).toBeCloseTo(hit.point.y-.03,2);}
  }});
  for(const p of l.platforms){
   const root=new T.Group();island(root,0,0,p.width,p.depth,'temperate',3,p.thickness);e.dressPlatform(root,p,context);root.updateMatrixWorld(true);
   const cap=root.getObjectByName('country-platform-cap');if(!cap)continue;
   for(const fraction of [.15,.5,.85]){const x=(fraction-.5)*p.width,expected=platformSurfaceY({...p,x:-p.width/2,y:0},x),ray=new T.Raycaster(new T.Vector3(x,expected+5,0),new T.Vector3(0,-1,0));const hits=ray.intersectObject(cap);expect(hits.length,p.id).toBeGreaterThan(0);expect(hits[0].point.y,p.id).toBeCloseTo(expected,1);}
  }
  mounted.dispose();expect(scene.children).not.toContain(mounted.root);
 },30000);
});
