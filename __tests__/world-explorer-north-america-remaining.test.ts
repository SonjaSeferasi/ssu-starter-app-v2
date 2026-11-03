import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {remainingNorthAmericaLevels as northAmericaLevels} from '../lib/world-explorer/levels/north-america/remaining';
import {remainingNorthAmericaPlaces as northAmericaPlaces,type RemainingNorthAmericaCode as NorthAmericaCode} from '../lib/world-explorer/north-america-remaining';
import {levelDefinitionFor,validateLevel,authoredDifficulty} from '../lib/world-explorer/level-manifest';
import {validateLevelDesign} from '../lib/world-explorer/level-validator';
import {collectibleAcceptance} from '../lib/world-explorer/collectible-acceptance';
import {loadCountryEnvironment} from '../components/world-explorer/countries/registry';
import {FIXED_STEP,LevelSimulation} from '../lib/world-explorer/simulation';
import {playRoute} from '../lib/world-explorer/level-analysis';
import {criticalPlatforms,routeGraphFor} from '../lib/world-explorer/route-graph';
import {explorerAssist} from '../lib/world-explorer/difficulty';
import {platformSurfaceY} from '../lib/world-explorer/platform-surface';
import {island} from '../components/world-explorer/scenic-kit';
const northAmericanCreatureNames=Object.fromEntries(Object.entries(northAmericaPlaces).map(([code,p])=>[code,code.toLowerCase()+'-'+p.creature+'-patrol']));
import {discoveryFor} from '../lib/world-explorer-discoveries';
import {guideDestination} from '../lib/world-explorer/guide-destination';
import {writeFileSync,mkdirSync} from 'node:fs';

const evidence:Record<string,unknown>={};
mkdirSync('tmp/north-america-complete',{recursive:true});
writeFileSync('tmp/north-america-complete/capture-targets.json',JSON.stringify(Object.entries(northAmericaLevels).map(([code,l])=>{const finish=l.platforms.find(p=>p.id===l.finish.platformId)!;const e=l.enemies![0],p=l.platforms.find(p=>p.id===e.platformId)!;return[code,(finish.x+l.finish.offset)*.43,2,p.x+e.minOffset,p.y];})));
writeFileSync('tmp/north-america-complete/country-titles.json',JSON.stringify(Object.fromEntries(Object.entries(northAmericaPlaces).map(([c,p])=>[c,p.title]))));

describe.each(Object.keys(northAmericaLevels) as NorthAmericaCode[])('%s North America adventure',code=>{
 it('validates all jump timings, both routes, checkpoint spacing and difficulty',()=>{
  const level=levelDefinitionFor(code,authoredDifficulty(code));
  expect(validateLevel(level).id).toBe(northAmericaLevels[code].id);
  const report=validateLevelDesign(level);evidence[code]={validation:report};
  mkdirSync('tmp/north-america-complete',{recursive:true});writeFileSync('tmp/north-america-complete/validation.json',JSON.stringify(evidence,null,2));
  expect(report.checks.filter(c=>!c.ok).map(c=>c.name+': '+c.detail)).toEqual([]);
 },300000);
 it('can collect every coin and every optional star in clean input-only runs',()=>{
  const report=collectibleAcceptance(code);evidence[code]={...(evidence[code] as object),collectibles:report};
  writeFileSync('tmp/north-america-complete/validation.json',JSON.stringify(evidence,null,2));
  expect(report.incomplete).toEqual([]);expect(report.damaged).toEqual([]);expect(report.runs.every(run=>run.damage===0)).toBe(true);expect(report.missingCoins).toEqual([]);expect(report.missingStars).toEqual([]);expect(report.cleanRoutes).toEqual(['bonus','main']);
 },300000);
 it('mounts, dresses and disposes scenery in both quality modes',async()=>{
  for(const low of [true,false]){
   const level=levelDefinitionFor(code),scene=new T.Scene(),env=await loadCountryEnvironment(level.environmentId);
   expect(env?.id).toBe(level.environmentId);const finish=new LevelSimulation(level).position(level.finish).x;
   const context={scene,level,finish,low,reducedMotion:true},mounted=env!.mount(context);
   for(const platform of level.platforms){
    const platformScene=new T.Scene(),root=island(platformScene,platform.x+platform.width/2,platform.y,platform.width,platform.depth,'temperate',3,platform.thickness);env!.dressPlatform(root,platform,context);expect(root.children.length).toBeGreaterThan(0);root.updateMatrixWorld(true);
    for(const z of [-.4,0,.4])for(const fraction of [.27,.53,.73]){
     const x=platform.x+platform.width*fraction,y=platformSurfaceY(platform,x),hit=new T.Raycaster(new T.Vector3(x,y+2.6,z),new T.Vector3(0,-1,0)).intersectObject(root,true)[0];
     expect(hit,platform.id).toBeTruthy();expect(Math.abs(hit.point.y-y),platform.id).toBeLessThan(.06);
    }
   }
   for(const name of northAmericaPlaces[code].features)expect(mounted.root.getObjectByName(name),name).toBeTruthy();
   mounted.setView?.('overview');mounted.setReducedMotion(false);mounted.frame(40);mounted.update(1,1/60,{time:1,platforms:[],wind:[],playerX:0});mounted.dispose();expect(scene.children).not.toContain(mounted.root);
  }
 },30000);
 it('teaches the actual level destination in the guide and discovery',()=>{
  expect(guideDestination(code)?.fromLevel).toBe(true);expect(discoveryFor(code)?.landmark).toBe(northAmericaPlaces[code].landmark);
 });
 it('has a distinct animated patrol model with room to land at each checkpoint',async()=>{
  const level=levelDefinitionFor(code),env=(await loadCountryEnvironment(level.environmentId))!,parent=new T.Group(),enemy=env.createEnemy(parent);
  expect(enemy.root.name).toBe(northAmericanCreatureNames[code]);expect(level.enemies?.length).toBeGreaterThan(0);
  for(const state of ['IDLE','PATROL_LEFT','PATROL_RIGHT','TURN','ALERT','STUNNED'] as const)expect(()=>enemy.update(1.2,-1,state)).not.toThrow();
  enemy.update(0,1,'IDLE');parent.updateMatrixWorld(true);const size=new T.Box3().setFromObject(enemy.root).getSize(new T.Vector3());expect(size.y).toBeGreaterThan(.45);expect(size.y).toBeLessThan(1.1);
  enemy.update(1,1,'DISABLED');expect(enemy.root.visible).toBe(false);
  for(const checkpoint of level.checkpoints)for(const patrol of level.enemies||[])if(patrol.platformId===checkpoint.platformId)expect(patrol.minOffset-checkpoint.offset).toBeGreaterThan(2.5);
 });
 it('finishes on expert and assist, including stops and backtracking at checkpoints',()=>{
  const level=levelDefinitionFor(code,4);
  for(const candidate of [level,explorerAssist(level)])for(const kind of ['pause','backtrack'] as const){
   const result=playRoute(candidate,criticalPlatforms(routeGraphFor(candidate)),{detours:candidate.checkpoints.map(c=>({platformId:c.platformId,kind,seconds:kind==='pause'?2.3:1.2}))});
   expect(result.simulation.state.status,kind).toBe('completed');expect(result.damage,kind).toBe(0);
  }
 },240000);
 it('recovers at every checkpoint after a fall with one heart lost',()=>{
  const original=levelDefinitionFor(code);
  for(const point of original.checkpoints){
   const level=structuredClone(original);level.spawn={platformId:point.platformId,offset:point.offset};
   const simulation=new LevelSimulation(level);
   const tick=(frames:number)=>{for(let i=0;i<frames;i++)simulation.advance(FIXED_STEP);};
   tick(30);expect(simulation.state.checkpointId).toBe(point.id);
   Object.assign(simulation.state,{grounded:false,standing:null,vy:0,y:level.physics.killY-1});
   tick(60);expect(simulation.state.hearts).toBe(2);expect(simulation.state.standing).toBe(point.platformId);
  }
 });
});
