import {describe,expect,it} from 'vitest';
import * as T from 'three';
import {island} from '../components/world-explorer/scenic-kit';
import {loadCountryEnvironment} from '../components/world-explorer/countries/registry';
import type {EnvironmentContext} from '../components/world-explorer/countries/types';
import {isAuthoredLevel,levelAvailability,levelDefinitionFor,validateLevel} from '../lib/world-explorer/level-manifest';
import {FIXED_STEP,LevelSimulation,hazardAt} from '../lib/world-explorer/simulation';
import {platformSurfaceY} from '../lib/world-explorer/platform-surface';
import {playRoute} from '../lib/world-explorer/level-analysis';
import {criticalPlatforms,optionalPath,routeGraphFor} from '../lib/world-explorer/route-graph';
import {validateLevelDesign} from '../lib/world-explorer/level-validator';
import {analyzeDifficulty,explorerAssist,tiers} from '../lib/world-explorer/difficulty';
import {similarityMatrix} from '../lib/world-explorer/level-similarity';
import {cardStatus,designRecord} from '../lib/world-explorer/design-manifest';
import {discoveryIdFor,recordCountryResult,emptyExplorerProgress} from '../lib/world-explorer-progress';
import {discoveryFor} from '../lib/world-explorer-discoveries';
import {southAmerica,southAmericaEntry,southAmericaStatuses} from '../lib/world-explorer/south-america';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import type {LevelDefinition} from '../lib/world-explorer/game-types';

/** Phase 1: South America. Every country whose level is built is tested here
 * the same way; a country is never counted as built from its data alone. */
const built=southAmerica.filter(entry=>entry.levelBuilt);
const codes=built.map(entry=>entry.code);
const run=(simulation:LevelSimulation,frames:number,input={left:false,right:false,jump:false})=>{const events:string[]=[];for(let i=0;i<frames;i++){simulation.setInput(input);events.push(...simulation.advance(FIXED_STEP).map(e=>e.type));}return events;};
const fixture=(level:LevelDefinition,platformId:string,offset:number)=>{const copy=structuredClone(level);copy.spawn={platformId,offset};copy.enemies=[];copy.discoveryBlocks=[];return copy;};

describe('South America production tracker',()=>{
 it('lists the twelve countries with flags, tiers from beginner to advanced, and honest statuses',()=>{
  expect(southAmerica.map(e=>e.code).sort()).toEqual(['ARG','BOL','BRA','CHL','COL','ECU','GUY','PER','PRY','SUR','URY','VEN']);
  for(const entry of southAmerica){expect(southAmericaStatuses).toContain(entry.status);expect(entry.iso2).toMatch(/^[A-Z]{2}$/);}
  // Nothing is RELEASED without the human visual and gameplay review.
  for(const entry of southAmerica.filter(e=>e.status==='RELEASED'))expect(entry.humanReview).toBe('approved');
  // A built level is playable and authored; an unbuilt one is not.
  for(const entry of southAmerica)expect(isAuthoredLevel(entry.code),entry.code).toBe(entry.levelBuilt);
  const builtTiers=new Set(built.map(e=>e.tier));expect(Math.min(...builtTiers)).toBe(1);
 });
 it('shows each built level on its country card: its own landmark, discovery and in-game preview',()=>{
  const words=(text:string)=>new Set(text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').split(/[^a-z]+/).filter(word=>word.length>=5));
  for(const entry of built){
   expect(entry.landmarks,entry.code).toContain(entry.featuredLandmark.assetId);expect(entry.featuredLandmark.descriptionId).toBe(discoveryIdFor(entry.code));
   expect(existsSync(join('public',entry.previewImage)),entry.previewImage).toBe(true);
   const fact=discoveryFor(entry.code)!,shared=[...words(entry.featuredLandmark.name)].filter(word=>words(fact.landmark+' '+fact.text).has(word));
   expect(shared.length,`${entry.code}: ${entry.featuredLandmark.name} vs ${fact.landmark}`).toBeGreaterThan(0);
  }
  expect(southAmericaEntry('VEN')!.featuredLandmark.name).toMatch(/Angel Falls/);expect(levelDefinitionFor('VEN').title).toMatch(/Angel Falls/);
 });
 it('lets a player choose any built country freely, with no tier lock',()=>{
  for(const code of codes)expect(cardStatus(code,new Set()),code).toBe('playable');
  for(const entry of built)expect(designRecord(entry.code)?.difficultyTier).toBe(entry.tier);
 });
});

describe.each(codes)('%s level',code=>{
 const entry=built.find(e=>e.code===code)!,level=levelDefinitionFor(code),graph=routeGraphFor(level);
 it('is its own authored design with a route graph, close camera and sourced discovery',()=>{
  expect(levelAvailability(code)).toMatchObject({stage:'prototype',releaseReady:false});
  expect(level.difficultyTier).toBe(entry.tier);expect(level.design?.archetype).toBe(entry.archetype);expect(level.camera?.distance).toBeGreaterThan(18);
  expect(level.discovery.factId).toBe(discoveryIdFor(code));
  const fact=discoveryFor(code)!;expect(fact.sourceUrl).toMatch(/^https:\/\//);expect(fact.text.length).toBeGreaterThan(80);expect(fact.kind).toBe('showcase');
  expect(level.platforms.some(p=>['ground','salt-flat','terrace','tepui','lava','dune'].includes(String(p.terrain))&&p.thickness>=12)).toBe(true);
 });
 it('passes every LevelValidator check, including physics at every timing',()=>{
  const report=validateLevelDesign(level);
  expect(report.checks.filter(check=>!check.ok).map(check=>`${check.name}: ${check.detail}`)).toEqual([]);
 },300000);
 it('measures at its declared tier against the real jump envelope',()=>{
  const report=analyzeDifficulty(level);expect(report.measuredTier).toBe(entry.tier);expect(report.warnings).toEqual([]);
  const band=tiers[entry.tier-1],hardest=Math.max(...report.jumps.map(j=>j.gapPercent));expect(hardest).toBeGreaterThanOrEqual(band.gap[0]);expect(hardest).toBeLessThanOrEqual(band.gap[1]);
 });
 it('finishes with no damage at every challenge setting and in Explorer assist',()=>{
  for(const difficulty of [1,2,4] as const){
   const scaled=levelDefinitionFor(code,difficulty),result=playRoute(scaled,criticalPlatforms(routeGraphFor(scaled))),s=result.simulation.state;
   expect(s.status,`difficulty ${difficulty}`).toBe('completed');expect(result.damage).toBe(0);expect(s.discoveryFound).toBe(true);expect(s.checkpointId).toBe(scaled.checkpoints.at(-1)!.id);
  }
  const assisted=playRoute(explorerAssist(level),criticalPlatforms(graph));expect(assisted.simulation.state.status).toBe('completed');expect(assisted.damage).toBe(0);
 },240000);
 it('reaches every coin and all three stars across the critical and optional runs',()=>{
  const main=playRoute(level,criticalPlatforms(graph),{collectCoins:true}),bonus=playRoute(level,optionalPath(graph),{collectStars:true,collectCoins:true});
  expect(main.simulation.state.status).toBe('completed');expect(bonus.simulation.state.status).toBe('completed');expect(main.damage+bonus.damage).toBe(0);
  expect(bonus.simulation.state.stars).toBe(3);
  expect(new Set([...main.simulation.collectedCoins,...bonus.simulation.collectedCoins]).size).toBe(level.coins.length);
 },240000);
 it('survives untidy play: backtracking and pausing at every checkpoint',()=>{
  for(const kind of ['backtrack','pause'] as const){
   const result=playRoute(level,criticalPlatforms(graph),{detours:level.checkpoints.map(c=>({platformId:c.platformId,kind,seconds:kind==='pause'?2.3:1.5}))});
   expect(result.simulation.state.status,kind).toBe('completed');expect(result.damage,kind).toBe(0);
  }
 },240000);
 it('respawns at the last checkpoint after a fall, and saves the result to the passport',()=>{
  const checkpoint=level.checkpoints[0],simulation=new LevelSimulation(fixture(level,checkpoint.platformId,checkpoint.offset));
  run(simulation,30);expect(simulation.state.checkpointId).toBe(checkpoint.id);
  Object.assign(simulation.state,{grounded:false,standing:null,vy:0,y:level.physics.killY-1});const events=run(simulation,60);expect(events).toContain('damage');expect(events).toContain('respawn');
  expect(simulation.state.hearts).toBe(2);expect(simulation.state.standing).toBe(checkpoint.platformId);
  const progress=recordCountryResult(emptyExplorerProgress(),code,{completed:true,coins:12,stars:2,elapsedMs:61000,discoveryFound:true});
  expect(progress.countries[code]).toMatchObject({completed:true,bestCoins:12,starsEarned:2,discoveredFactIds:[discoveryIdFor(code)]});
 });
});

describe('South America mechanics',()=>{
 it('raises salt blocks from a switch, keeps them up for the window, never sinks one under the player, and lets a player re-press after backtracking',()=>{
  const level=levelDefinitionFor('BOL'),plate=level.switches!.find(s=>s.id==='bo-plate-1')!,block=()=>simulation.platforms.find(p=>p.id==='bo-block-1')!;
  const simulation=new LevelSimulation(fixture(level,plate.platformId,plate.offset-2));
  expect(block().raised).toBe(0);expect(block().y).toBeLessThan(level.hazards[1].y+level.hazards[1].height);
  const events=run(simulation,80,{left:false,right:true,jump:false});expect(events).toContain('switch');expect(events).toContain('raise');expect(block().raised).toBe(1);
  // Walk back off the plate and wait out the window: the blocks sink again.
  run(simulation,40,{left:true,right:false,jump:false});const later=run(simulation,Math.ceil(9.5*60));expect(later).toContain('lower');expect(block().raised).toBe(0);
  // Backtrack onto the plate: they rise again.
  run(simulation,90,{left:false,right:true,jump:false});expect(block().raised).toBeGreaterThan(.6);
  // Standing on a raised block holds it up after the window ends.
  const rider=new LevelSimulation(fixture(level,plate.platformId,plate.offset));run(rider,40);
  const route=playRoute(level,['bo-flat-2','bo-block-1'],{start:{platformId:'bo-flat-2',offset:plate.offset-1},stopAt:'bo-block-1',maxFrames:900});
  expect(route.visited).toContain('bo-block-1');const sim=route.simulation;run(sim,10*60);expect(sim.state.standing).toBe('bo-block-1');expect(sim.platforms.find(p=>p.id==='bo-block-1')!.raised).toBe(1);
  expect(()=>validateLevel({...structuredClone(level),platforms:level.platforms.map(p=>p.raise?{...p,raise:{...p.raise,switchId:'missing'}}:p)})).toThrow();
 });
 it('validates the new mechanic fields before a level mounts',()=>{
  const level=levelDefinitionFor('BOL');
  const mutations:((l:LevelDefinition)=>void)[]=[
   l=>{l.hazards[0].cycle={period:3,warning:2,active:1,phase:0};},l=>{l.hazards[0].style='Geyser!';},l=>{l.platforms[0].current=0;},l=>{l.platforms[0].climbable='yes' as never;},
   l=>{l.platforms.find(p=>p.raise)!.raise!.drop=0;},l=>{l.switches![0].gateIds=[];l.platforms.forEach(p=>{if(p.raise?.switchId===l.switches![0].id)delete p.raise;});},l=>{l.physics.climbSpeed=20;},
  ];
  for(const mutate of mutations){const copy=structuredClone(level);mutate(copy);expect(()=>validateLevel(copy)).toThrow();}
 });
 it('cycles a timed hazard through calm, a warning and an eruption that only hurts while active',()=>{
  const hazard={id:'h',x:0,y:0,width:1,height:3,cycle:{period:6,warning:1.5,active:1.2,phase:0}};
  expect(hazardAt(hazard,1).phase).toBe('calm');expect(hazardAt(hazard,4).phase).toBe('warning');expect(hazardAt(hazard,5.5).phase).toBe('active');expect(hazardAt({...hazard,cycle:undefined},0).phase).toBe('active');
  const level=structuredClone(levelDefinitionFor('URY'));level.hazards=[{id:'vent',x:6,y:0,width:1.2,height:3,cycle:{period:6,warning:1.5,active:1.2,phase:0}}];level.spawn={platformId:'uy-rambla',offset:12};level.enemies=[];
  const calm=new LevelSimulation(level);expect(run(calm,60)).not.toContain('damage');
  const erupting=new LevelSimulation(level);const events=run(erupting,Math.ceil(5.4*60));expect(events).toContain('hazard-warning');expect(events).toContain('hazard');expect(events).toContain('damage');
 });
 it('climbs a climbable face only while jump is held, and carries a player on a current',()=>{
  const base=levelDefinitionFor('URY'),slab=(id:string,x:number,y:number,width:number,extra={})=>({id,x,y,width,depth:4,thickness:13,type:'stone' as const,motion:null,amplitude:0,phase:0,period:7,...extra});
  const level=validateLevel({id:'climb-test',countryId:'UY',legacyCode:'URY',title:'Climb test',environmentId:'test',physics:base.physics,platforms:[slab('floor',0,0,12),slab('wall',12,4,6,{climbable:true,terrain:'climb-wall'})],spawn:{platformId:'floor',offset:8},finish:{platformId:'wall',offset:5},coins:[],stars:[0,1,2].map(i=>({id:'s'+i,platformId:'wall',offset:5,height:1})),checkpoints:[],discovery:{id:'d',platformId:'wall',offset:5.5,factId:'f'},hazards:[]});
  const climber=new LevelSimulation(level);const events=run(climber,200,{left:false,right:true,jump:true});expect(events).toContain('climb');expect(climber.state.standing).toBe('wall');expect(climber.state.y).toBeCloseTo(4,3);
  const slider=new LevelSimulation(level);run(slider,12,{left:false,right:true,jump:true});run(slider,90,{left:false,right:true,jump:false});expect(slider.state.standing).not.toBe('wall');
  const river=structuredClone(levelDefinitionFor('URY'));river.platforms[0].current=1.5;river.spawn={platformId:'uy-rambla',offset:4};
  const drifting=new LevelSimulation(river);run(drifting,60);expect(drifting.state.x).toBeGreaterThan(-6+4+1.3);
 });
});

describe('Repetition analyzer: South America against itself and the proof levels',()=>{
 it('flags no South American pair, and none against Japan, Egypt or Norway',()=>{
  const levels=[...codes,'JPN','EGY','NOR'].map(code=>levelDefinitionFor(code)),pairs=similarityMatrix(levels);
  const southAmericanIds=new Set(codes.map(code=>levelDefinitionFor(code).id)),relevant=pairs.filter(p=>southAmericanIds.has(p.a)||southAmericanIds.has(p.b));
  expect(relevant.filter(p=>p.review).map(p=>`${p.a}~${p.b} ${p.score.toFixed(2)}`)).toEqual([]);
  const prints=new Set(codes.map(code=>levelDefinitionFor(code).design!.signatureMechanic));expect(prints.size).toBe(codes.length);
 });
});

function vertices(root:T.Object3D){let n=0;root.traverse(object=>{if(object instanceof T.Mesh)n+=object.geometry.getAttribute('position').count*(object instanceof T.InstancedMesh?object.count:1);});return n;}
async function mount(code:string,low=false){
 const level=levelDefinitionFor(code),environment=(await loadCountryEnvironment(level.environmentId))!,scene=new T.Scene();scene.background=new T.Color('#123456');
 const finish=new LevelSimulation(level).position(level.finish).x,context:EnvironmentContext={scene,level,finish,low,reducedMotion:false};
 return{level,environment,scene,context,mounted:environment.mount(context)};
}
describe.each(built.map(e=>[e.code,e.landmarks] as const))('%s environment',(code,landmarks)=>{
 it('builds its named landmarks, depth layers and finite real geometry, and cleans up',async()=>{
  const {mounted,scene}=await mount(code);
  for(const name of landmarks)expect(mounted.root.getObjectByName(name),name).toBeDefined();
  expect(mounted.root.userData.layers.length).toBeGreaterThanOrEqual(5);
  let meshes=0;mounted.root.traverse(object=>{if(!(object instanceof T.Mesh))return;meshes++;const p=object.geometry.getAttribute('position');for(let i=0;i<p.count;i+=7)expect(Number.isFinite(p.getX(i))&&Number.isFinite(p.getY(i))&&Number.isFinite(p.getZ(i))).toBe(true);});
  expect(meshes).toBeGreaterThan(8);expect(vertices(mounted.root)).toBeGreaterThan(20000);expect(vertices(mounted.root)).toBeLessThan(4000000);expect(scene.fog).toBeInstanceOf(T.Fog);
  const low=await mount(code,true);expect(vertices(low.mounted.root)).toBeLessThan(vertices(mounted.root));low.mounted.dispose();
  const simulation=new LevelSimulation(levelDefinitionFor(code));
  expect(()=>{mounted.update(2,1/60,{time:2,platforms:simulation.platforms,wind:[],playerX:10});mounted.frame(40);mounted.setReducedMotion(true);mounted.setView?.('overview');mounted.setView?.('gameplay');}).not.toThrow();
  mounted.dispose();expect(scene.getObjectByName(mounted.root.name)).toBeUndefined();expect((scene.background as T.Color).getHexString()).toBe('123456');
 });
 it('dresses every platform with a flat walking cap at the collision height, clear of decoration',async()=>{
  const {level,environment,context}=await mount(code);
  for(const definition of level.platforms){
   const scene=new T.Scene(),root=island(scene,definition.x+definition.width/2,definition.y,definition.width,definition.depth,'temperate',3,definition.thickness);
   environment.dressPlatform(root,definition,{...context,scene});scene.updateMatrixWorld(true);
   for(const z of [-.4,0,.4])for(const t of [.27,.53,.73]){
    const x=definition.x+definition.width*t,surface=platformSurfaceY(definition,x),hit=new T.Raycaster(new T.Vector3(x,surface+2.6,z),new T.Vector3(0,-1,0)).intersectObject(root,true)[0];
    expect(hit,`${definition.id} at ${t},${z}`).toBeDefined();expect(Math.abs(hit.point.y-surface),`${definition.id} at ${t},${z}`).toBeLessThan(.06);
   }
  }
 });
 it('keeps platform bodies to a sculpted visual depth in the polished levels (no walls running out of view)',async()=>{
  if(!['BOL','BRA','VEN'].includes(code))return;
  const {level,environment,context}=await mount(code);
  for(const definition of level.platforms){
   const scene=new T.Scene(),root=island(scene,0,0,definition.width,definition.depth,'temperate',3,definition.thickness);environment.dressPlatform(root,definition,{...context,scene});
   const body=root.getObjectByName('country-platform-cliff') as T.Mesh|undefined;if(!body||definition.style==='salt-hotel'||definition.style?.startsWith('rusted'))continue;
   body.geometry.computeBoundingBox();const height=body.geometry.boundingBox!.max.y-body.geometry.boundingBox!.min.y;expect(height,definition.id).toBeLessThan(10.5);
  }
 });
 it('creates an original animated patrol creature, a discovery block and markers',async()=>{
  const {environment}=await mount(code),parent=new T.Group(),enemy=environment.createEnemy(parent);
  for(const state of ['IDLE','PATROL_LEFT','PATROL_RIGHT','TURN','ALERT'] as const)expect(()=>enemy.update(1.3,state==='PATROL_LEFT'?-1:1,state)).not.toThrow();
  const size=new T.Box3().setFromObject(enemy.root).getSize(new T.Vector3());expect(size.y).toBeGreaterThan(.4);expect(size.y).toBeLessThan(1.4);
  const block=environment.createDiscoveryBlock(parent,.75,.8),bounds=new T.Box3().setFromObject(block);expect(bounds.min.y).toBeCloseTo(0,1);
  const marker=new T.Group(),gate=new T.Group();environment.decorateCheckpoint(marker,{} as EnvironmentContext);environment.decorateFinish(gate,{} as EnvironmentContext);expect(marker.children.length).toBeGreaterThan(0);expect(new T.Box3().setFromObject(gate).max.y).toBeGreaterThan(3);
 });
});
