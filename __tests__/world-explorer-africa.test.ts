import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {africaLevels} from '../lib/world-explorer/levels/africa';
import {africaPlaces,type AfricaCode} from '../lib/world-explorer/africa';
import {levelDefinitionFor,validateLevel,authoredDifficulty} from '../lib/world-explorer/level-manifest';
import {validateLevelDesign} from '../lib/world-explorer/level-validator';
import {analyzeDifficulty} from '../lib/world-explorer/difficulty';
import {collectibleAcceptance} from '../lib/world-explorer/collectible-acceptance';
import {compareLevels,fingerprint} from '../lib/world-explorer/level-similarity';
import {loadCountryEnvironment} from '../components/world-explorer/countries/registry';
import {FIXED_STEP,LevelSimulation} from '../lib/world-explorer/simulation';
import {playRoute} from '../lib/world-explorer/level-analysis';
import {criticalPlatforms,routeGraphFor} from '../lib/world-explorer/route-graph';
import {explorerAssist} from '../lib/world-explorer/difficulty';
import {discoveryFor} from '../lib/world-explorer-discoveries';
import {guideDestination} from '../lib/world-explorer/guide-destination';
import {countryProfile} from '../lib/world-explorer/profiles';
import {countryByCode} from '../lib/world-explorer/catalog';

const codes=Object.keys(africaLevels) as AfricaCode[];

describe('Africa production batch',()=>{
 it('places every built level in Africa with its own environment, sourced teaching note and declared tier',()=>{
  for(const code of codes){
   const level=levelDefinitionFor(code),place=africaPlaces[code];
   expect(countryByCode(code)?.continent,code).toBe('africa');
   expect(level.environmentId,code).toBe('africa-'+place.iso2.toLowerCase());
   expect(level.difficultyTier,code).toBe(place.tier);
   expect(place.source,code).toMatch(/^https:\/\//);expect(place.fact.length,code).toBeGreaterThan(80);
  }
 });
 it('gives every level its own design: no two share a signature, and none is flagged as structurally similar',()=>{
  const levels=[...codes.map(code=>levelDefinitionFor(code)),levelDefinitionFor('EGY'),levelDefinitionFor('JPN')];
  expect(new Set(codes.map(code=>levelDefinitionFor(code).design?.signatureMechanic)).size).toBe(codes.length);
  expect(new Set(codes.map(code=>levelDefinitionFor(code).design?.archetype)).size).toBe(codes.length);
  const prints=levels.map(fingerprint);
  for(let i=0;i<prints.length;i++)for(let j=i+1;j<prints.length;j++){const result=compareLevels(prints[i],prints[j]);expect(result.review,`${result.a} ~ ${result.b} ${result.score.toFixed(2)}`).toBe(false);}
 });
 it('spreads the continent across the difficulty tiers',()=>{
  const tiers=new Set(codes.map(code=>africaPlaces[code].tier));
  expect(tiers.size).toBeGreaterThanOrEqual(Math.min(5,codes.length-2));
 });
});

describe.each(codes)('%s Africa level',code=>{
 it('passes all LevelValidator checks and measures at its declared tier',()=>{
  const level=levelDefinitionFor(code,authoredDifficulty(code));
  expect(validateLevel(level).id).toBe(africaLevels[code]!.id);
  expect(analyzeDifficulty(level).measuredTier).toBe(africaPlaces[code].tier);
  const report=validateLevelDesign(level);
  expect(report.checks.filter(c=>!c.ok).map(c=>c.name+': '+c.detail)).toEqual([]);
 },400000);
 it('lets an input-only player collect every coin and every star without damage',()=>{
  const report=collectibleAcceptance(code);
  expect(report.incomplete).toEqual([]);expect(report.missingCoins).toEqual([]);expect(report.missingStars).toEqual([]);expect(report.cleanRoutes).toEqual(['bonus','main']);
 },400000);
 it('mounts, dresses and disposes its scenery in both quality modes',async()=>{
  for(const low of [true,false]){
   const level=levelDefinitionFor(code),scene=new T.Scene(),env=await loadCountryEnvironment(level.environmentId);
   expect(env?.id).toBe(level.environmentId);const finish=new LevelSimulation(level).position(level.finish).x;
   const context={scene,level,finish,low,reducedMotion:true},mounted=env!.mount(context);
   for(const platform of level.platforms){const root=new T.Group();env!.dressPlatform(root,platform,context);expect(root.children.length,platform.id).toBeGreaterThan(0);}
   for(const name of africaPlaces[code].features)expect(mounted.root.getObjectByName(name),name).toBeTruthy();
   let vertices=0;mounted.root.traverse(o=>{if(o instanceof T.Mesh){const p=o.geometry.getAttribute('position');expect(p,o.name).toBeTruthy();for(let i=0;i<p.count;i+=97)expect(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)),o.name).toBe(true);vertices+=p.count*((o as T.InstancedMesh).count??1);}});
   expect(vertices).toBeGreaterThan(5000);
   const enemy=env!.createEnemy(new T.Group());for(const state of ['PATROL_LEFT','TURN','ALERT'] as const)enemy.update(1,1,state);
   mounted.setView?.('overview');mounted.setReducedMotion(false);mounted.frame(40);mounted.update(1,1/60,{time:1,platforms:[],wind:[],playerX:0});mounted.dispose();expect(scene.children).not.toContain(mounted.root);
  }
 },60000);
 it('teaches the level’s own destination on the card, in the guide and in the discovery',()=>{
  expect(countryProfile(code)?.levelTitle).toBe(africaPlaces[code].title);
  expect(guideDestination(code)?.fromLevel).toBe(true);expect(guideDestination(code)?.place).toBe(africaPlaces[code].landmark);
  expect(discoveryFor(code)?.landmark).toBe(africaPlaces[code].landmark);expect(discoveryFor(code)?.text).toBe(africaPlaces[code].fact);
 });
 it('finishes on expert and with Explorer assist, including pauses and backtracking at checkpoints',()=>{
  const level=levelDefinitionFor(code,4);
  for(const candidate of [level,explorerAssist(level)])for(const kind of ['pause','backtrack'] as const){
   const result=playRoute(candidate,criticalPlatforms(routeGraphFor(candidate)),{detours:candidate.checkpoints.map(c=>({platformId:c.platformId,kind,seconds:kind==='pause'?2.3:1.2}))});
   expect(result.simulation.state.status,kind).toBe('completed');expect(result.damage,kind).toBe(0);
  }
 },300000);
 it('recovers at every checkpoint after a fall with one heart lost',()=>{
  const original=levelDefinitionFor(code);
  for(const point of original.checkpoints){
   const level=structuredClone(original);level.spawn={platformId:point.platformId,offset:point.offset};
   const simulation=new LevelSimulation(level),tick=(frames:number)=>{for(let i=0;i<frames;i++)simulation.advance(FIXED_STEP);};
   tick(30);expect(simulation.state.checkpointId).toBe(point.id);
   Object.assign(simulation.state,{grounded:false,standing:null,vy:0,y:level.physics.killY-1});
   tick(60);expect(simulation.state.hearts).toBe(2);expect(simulation.state.standing).toBe(point.platformId);
  }
 });
});
