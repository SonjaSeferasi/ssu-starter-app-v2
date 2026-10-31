import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {levelDefinitionFor,validateLevel} from '../lib/world-explorer/level-manifest';
import {starPath} from '../lib/world-explorer/level-analysis';
import {playAsiaRoute} from '../lib/world-explorer/asia-playtest';
import {validateLevelDesign} from '../lib/world-explorer/level-validator';
import {analyzeDifficulty} from '../lib/world-explorer/difficulty';
import {createEastAsiaEnvironment} from '../components/world-explorer/countries/east-asia';
import {eastAsiaPlaces,type NewEastAsiaCode} from '../lib/world-explorer/east-asia';
import {discoveryIdFor} from '../lib/world-explorer-progress';
import {cardStatus} from '../lib/world-explorer/design-manifest';
import {FIXED_STEP} from '../lib/world-explorer/simulation';

describe.each(Object.keys(eastAsiaPlaces) as NewEastAsiaCode[])('%s East Asia authored adventure',code=>{
 it('validates its route graph, actual jumps, timings, difficulty and optional rewards',()=>{
  const level=levelDefinitionFor(code);expect(()=>validateLevel(level)).not.toThrow();
  const report=validateLevelDesign(level,{physics:false});
  expect(report.checks.filter(c=>!c.ok).map(c=>c.detail)).toEqual([]);
  expect(analyzeDifficulty(level).measuredTier).toBe(level.difficultyTier);
  expect(level.discovery.factId).toBe(discoveryIdFor(code));expect(cardStatus(code,new Set())).toBe('playable');
 });
 it('finishes with input only and reaches every coin and all three stars across the two routes',()=>{
  const level=levelDefinitionFor(code);
  for(const wait of [0,.7,1.9,3.1]){
   const main=playAsiaRoute(level,level.mainRoute!,{collect:true,wait}),bonus=playAsiaRoute(level,starPath(level),{collect:true,wait});
   for(const run of [main,bonus]){expect(run.simulation.state.status,`${code} at ${wait}s, x=${run.simulation.state.x}`).toBe('completed');expect(run.simulation.state.hearts).toBe(3);expect(run.simulation.state.discoveryFound).toBe(true);expect(new Set(run.coinEvents).size).toBe(run.coinEvents.length);expect(new Set(run.starEvents).size).toBe(run.starEvents.length);}
   expect(bonus.simulation.state.stars).toBe(3);
   expect([...main.visited].every(id=>level.mainRoute!.includes(id))).toBe(true);
   expect(new Set([...main.simulation.collectedCoins,...bonus.simulation.collectedCoins]).size).toBe(level.coins.length);
   expect(main.simulation.state.checkpointId).toBe(level.checkpoints.at(-1)!.id);
   if(code==='PRK'){expect(level.gates).toEqual([]);expect(level.hazards).toHaveLength(2);expect(level.environmentId).toBe('north-korea-paektu');}
  }
 });
 it('lands every mandatory and optional jump using the actual controller at four motion timings',()=>{
  const level=levelDefinitionFor(code);
  for(const edge of level.routeGraph!.edges){
   const from=level.platforms.find(p=>p.id===edge.from)!;
   for(const wait of [0,.9,2.1,3.6]){
    // Wait on the preceding safe ledge, not on a platform whose advertised
    // mechanic deliberately collapses under a player who stands still.
    const previous=from.collapse?level.routeGraph!.edges.find(e=>e.to===from.id&&e.mandatory)?.from:undefined;
    const spawn=level.platforms.find(p=>p.id===(previous||from.id))!;
    const fixture=structuredClone(level);fixture.spawn={platformId:spawn.id,offset:Math.max(.5,spawn.width-2.2)};
    const run=playAsiaRoute(fixture,previous?[previous,edge.from,edge.to]:[edge.from,edge.to],{wait,stopAt:edge.to,maxFrames:1800});
    expect(run.visited.has(edge.to),`${code}: ${edge.from} → ${edge.to} at ${wait}s`).toBe(true);
    expect(run.simulation.state.hearts).toBe(3);
   }
  }
 });
 it('builds its own finite landscape and releases scene resources',()=>{
  const level=levelDefinitionFor(code),scene=new T.Scene(),environment=createEastAsiaEnvironment(code),mounted=environment.mount({scene,level,finish:90,low:true,reducedMotion:true});
  expect(mounted.root.userData.landmark).toBe(eastAsiaPlaces[code].landmark);expect(mounted.root.userData.geography).toBe(code);
  expect(mounted.root.getObjectByName('mount-fuji')).toBeUndefined();expect(mounted.root.getObjectByName('spring-pagoda')).toBeUndefined();
  let triangles=0;mounted.root.traverse(o=>{if(o instanceof T.Mesh){const p=o.geometry.getAttribute('position');expect(Array.from(p.array).every(Number.isFinite)).toBe(true);triangles+=(o.geometry.index?.count??p.count)/3*(o instanceof T.InstancedMesh?o.count:1);}});
  expect(triangles).toBeLessThan(250000);mounted.dispose();mounted.dispose();expect(scene.children).not.toContain(mounted.root);
 });
 it('retains rewards and returns to each activated checkpoint after an injected missed landing',()=>{
  const level=levelDefinitionFor(code),run=playAsiaRoute(level,level.mainRoute!,{collect:true});
  expect(run.checkpointSnapshots).toHaveLength(level.checkpoints.length);
  for(const snapshot of run.checkpointSnapshots){
   const simulation=snapshot.clone(),coins=simulation.state.coins,checkpoint=level.checkpoints.find(c=>c.id===simulation.state.checkpointId)!;
   // Fault injection exercises recovery, not a claimed input-only playthrough.
   simulation.state.y=level.physics.killY-1;simulation.state.grounded=false;simulation.state.standing=null;simulation.state.vy=-2;simulation.clearInput();let recovered=false;
   for(let i=0;i<600;i++)if(simulation.advance(FIXED_STEP).some(e=>e.type==='respawn')){recovered=true;break;}
   expect(recovered).toBe(true);expect(simulation.state.hearts).toBe(2);expect(simulation.state.coins).toBe(coins);expect(simulation.state.standing).toBe(checkpoint.platformId);
   expect(simulation.state.x).toBeCloseTo(simulation.position(checkpoint).x,6);
   const x=simulation.state.x;simulation.setInput({left:true,right:false,jump:false});for(let i=0;i<12;i++)simulation.advance(FIXED_STEP);expect(simulation.state.x).toBeLessThan(x);
   simulation.setInput({left:false,right:true,jump:false});for(let i=0;i<50;i++)simulation.advance(FIXED_STEP);expect(simulation.state.x).toBeGreaterThan(x);expect(simulation.state.hearts).toBe(2);
  }
 });
});
