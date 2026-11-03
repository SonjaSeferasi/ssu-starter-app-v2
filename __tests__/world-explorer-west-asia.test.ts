import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {westAsiaCodes,westAsiaPlaces} from '../lib/world-explorer/west-asia';
import {authoredDifficulty,levelDefinitionFor} from '../lib/world-explorer/level-manifest';
import {validateLevelDesign} from '../lib/world-explorer/level-validator';
import {analyzeDifficulty} from '../lib/world-explorer/difficulty';
import {criticalPlatforms,optionalPath} from '../lib/world-explorer/route-graph';
import {playSoutheastAsiaRoute} from '../lib/world-explorer/southeast-asia-playtest';
import {westAsiaEnvironment} from '../components/world-explorer/countries/west-asia';
import {island} from '../components/world-explorer/scenic-kit';
import {platformSurfaceY} from '../lib/world-explorer/platform-surface';
import {countryProfile} from '../lib/world-explorer/profiles';
import {discoveryFor} from '../lib/world-explorer-discoveries';
import {FIXED_STEP} from '../lib/world-explorer/simulation';
import {levelAvailability} from '../lib/world-explorer/level-manifest';
import {guideDestination} from '../lib/world-explorer/guide-destination';
import {landmarkImage} from '../lib/world-explorer/media';
import media from '../public/world-explorer/data/west-asia-media.json';
import {readFileSync} from 'node:fs';

describe.each(westAsiaCodes)('%s West Asia review candidate',code=>{
 it('keeps the playable title, card profile, guide, discovery and fixed licensed photograph on the same setting',async()=>{
  const place=westAsiaPlaces[code],profile=countryProfile(code),guide=guideDestination(code),photo=await landmarkImage(code),record=media.records.find(r=>r.code===code)!;
  expect(levelAvailability(code)?.title).toBe(place.title);expect(levelDefinitionFor(code).title).toBe(place.title);
  expect(profile?.levelTitle).toBe(place.title);expect(profile?.landmarkName).toBe(place.landmark);expect(guide?.place).toBe(place.landmark);expect(guide?.fromLevel).toBe(true);expect(guide?.landscape).toEqual([...place.features]);
  expect(discoveryFor(code)?.landmark).toBe(place.landmark);expect(discoveryFor(code)?.text).toBe(place.fact);
  expect(record.setting).toBe(place.landmark);expect(record.reviewStatus).toBe('DEVELOPER_SUBJECT_REVIEWED');expect(photo?.url).toBe('/world-explorer/photos/west-asia/'+place.iso2.toLowerCase()+'.jpg');expect(photo?.pageUrl).toMatch(/^https:\/\/commons.wikimedia.org\//);expect(photo?.author.length).toBeGreaterThan(0);expect(photo?.license).toMatch(/^CC|Public domain/);
  const bytes=readFileSync('public'+photo!.url);expect([...bytes.subarray(0,3)]).toEqual([255,216,255]);expect(bytes.length).toBeGreaterThan(4000);
 });
 it('uses its sourced setting and measures at the authored tier in the runtime configuration',()=>{
  const l=levelDefinitionFor(code,authoredDifficulty(code));
  expect(validateLevelDesign(l,{physics:false}).checks.filter(c=>!c.ok)).toEqual([]);
  expect(analyzeDifficulty(l).measuredTier).toBe(westAsiaPlaces[code].tier);
  expect(countryProfile(code)?.landmarkName).toBe(westAsiaPlaces[code].landmark);
  expect(discoveryFor(code)?.sourceUrl).toBe(westAsiaPlaces[code].source);
 });
 it('completes both routes at all four runtime settings and varied cycle timings',()=>{
  for(const difficulty of [1,2,3,4] as const)for(const wait of [0,.7,1.9,3.1]){
   const l=levelDefinitionFor(code,difficulty),coins=new Set<string>();
   for(const path of [criticalPlatforms(l.routeGraph!),optionalPath(l.routeGraph!)]){
    const r=playSoutheastAsiaRoute(l,path,{collect:true,wait}),s=r.simulation.state;
    expect(s.status,`${code}/${difficulty}/${wait} x=${s.x}`).toBe('completed');expect(s.hearts).toBe(3);if(path.includes(l.stars[0].platformId))expect(s.stars).toBe(3);expect(s.discoveryFound).toBe(true);
    r.simulation.collectedCoins.forEach(id=>coins.add(id));
    expect(s.checkpointId).toBe(l.checkpoints.at(-1)!.id);
    if(['OMN','SAU'].includes(code))expect(r.events).toContain('climb');
    if(l.gates?.length){expect(r.events).toContain('switch');expect(r.events).toContain('gate-open');}
    if(l.hazards.length)expect(r.events).toContain('hazard-warning');
    for(const p of l.platforms.filter(p=>p.motion))expect(r.visited.has(p.id),p.id).toBe(true);
   }
   expect(coins.size).toBe(l.coins.length);
  }
 },30000);
 it('pauses and recovers at each checkpoint with rewards and controls intact across runtime settings and timings',()=>{
  for(const difficulty of [1,2,3,4] as const)for(const wait of [0,.7,1.9,3.1]){
   const l=levelDefinitionFor(code,difficulty);
   for(const path of [criticalPlatforms(l.routeGraph!),optionalPath(l.routeGraph!)]){
    const run=playSoutheastAsiaRoute(l,path,{collect:true,wait});expect(run.checkpointSnapshots).toHaveLength(l.checkpoints.length);
    for(const sim of run.checkpointSnapshots){
     const anchor=l.checkpoints.find(c=>c.id===sim.state.checkpointId)!,before={coins:sim.state.coins,stars:sim.state.stars},time=sim.state.elapsedSeconds,platforms=sim.platforms.map(p=>[p.x,p.y]);
     sim.pause();for(let i=0;i<90;i++)sim.advance(FIXED_STEP);expect(sim.state.elapsedSeconds).toBe(time);expect(sim.platforms.map(p=>[p.x,p.y])).toEqual(platforms);sim.resume();
     // Controlled missed landing: a recovery fixture, not an input-only run.
     sim.state.y=l.physics.killY-1;sim.state.grounded=false;sim.state.standing=null;sim.state.vy=-2;sim.clearInput();let recovered=false;
     for(let i=0;i<120;i++)if(sim.advance(FIXED_STEP).some(e=>e.type==='respawn')){recovered=true;break;}
     expect(recovered).toBe(true);expect(sim.state.hearts).toBe(2);expect(sim.state.standing).toBe(anchor.platformId);expect(sim.state.x).toBeCloseTo(sim.position(anchor).x,6);expect(sim.state.coins).toBe(before.coins);expect(sim.state.stars).toBe(before.stars);
     const x=sim.state.x;sim.setInput({left:true,right:false,jump:false});for(let i=0;i<12;i++)sim.advance(FIXED_STEP);expect(sim.state.x).toBeLessThan(x);sim.setInput({left:false,right:true,jump:false});for(let i=0;i<32;i++)sim.advance(FIXED_STEP);expect(sim.state.x).toBeGreaterThan(x);expect(sim.state.hearts).toBe(2);
    }
   }
  }
 },30000);
 it('builds finite scenery and dresses the visible cap at the actual collision surface',()=>{
  const l=levelDefinitionFor(code),scene=new T.Scene(),e=westAsiaEnvironment(code),context={scene,level:l,finish:100,low:true,reducedMotion:true},mounted=e.mount(context);
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
