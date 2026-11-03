import {describe,expect,it} from 'vitest';
import {isAuthoredLevel,levelAvailability,levelDefinitionFor,validateLevel} from '../lib/world-explorer/level-manifest';
import {FIXED_STEP,LevelSimulation,platformOffset,windAt} from '../lib/world-explorer/simulation';
import {headroomConflicts,playRoute,routeLeaps,starPath} from '../lib/world-explorer/level-analysis';
import {discoveryIdFor} from '../lib/world-explorer-progress';
import {discoveryFor} from '../lib/world-explorer-discoveries';
import {countryProfile} from '../lib/world-explorer/profiles';
import type {LevelDefinition} from '../lib/world-explorer/game-types';

/** The ten reference countries built on the shared Japan engine. Six still
 * use the first eight-section template; Egypt, Brazil and Norway were rebuilt
 * as route-graph levels and are covered in world-explorer-level-design. India now has its own South Asia route-graph tests. */
const codes=['ITA','EGY','BRA','CAN','AUS','IND','ZAF','NOR','FRA','USA'];
// Canada and USA now use route graphs, covered by world-explorer-north-america.test.ts.
const templateCodes=['ITA','AUS','ZAF','FRA'];
const sectionIds=['A','B','C','D','E','F','G','H'];
const byId=(level:LevelDefinition,id:string)=>level.platforms.find(platform=>platform.id===id)!;

describe.each(templateCodes)('%s level configuration',code=>{
 const level=levelDefinitionFor(code),main=level.mainRoute!,upper=level.upperRoute!;
 it('is an authored, validated level with honest availability and its own identity',()=>{
  expect(isAuthoredLevel(code)).toBe(true);expect(()=>validateLevel(level)).not.toThrow();
  expect(levelAvailability(code)).toMatchObject({levelId:level.id,title:level.title,stage:'prototype',visualReviewed:false,releaseReady:false});
  expect(countryProfile(code)?.levelTitle).toBe(level.title);
  expect(level.discovery.factId).toBe(discoveryIdFor(code));expect(level.discoveryBlocks?.every(block=>block.factId===level.discovery.factId)).toBe(true);
  const fact=discoveryFor(code)!;expect(fact.sourceUrl).toMatch(/^https:\/\//);expect(fact.text.length).toBeGreaterThan(80);
  expect(level.environment?.landmarkAssets.length).toBeGreaterThanOrEqual(3);expect(level.environment?.locationReference.length).toBeGreaterThan(10);
 });
 it('follows the eight-section structure with 30 coins, three stars, checkpoints, an enemy and a discovery',()=>{
  expect(level.sections?.map(section=>section.id)).toEqual(sectionIds);
  expect(level.coins).toHaveLength(30);expect(level.stars).toHaveLength(3);expect(level.checkpoints.length).toBeGreaterThanOrEqual(1);
  expect(level.enemies?.length).toBeGreaterThanOrEqual(1);expect(level.discoveryBlocks?.length).toBeGreaterThanOrEqual(1);
  const start=byId(level,level.spawn.platformId);expect(start.width).toBeGreaterThanOrEqual(12);expect(start.width).toBeLessThanOrEqual(16);
  const lower=main.map(id=>byId(level,id));expect(lower.some(p=>p.type==='bridge'||p.type==='wooden-bridge')).toBe(true);
  expect(lower.every(p=>p.route==='main')).toBe(true);expect(lower.some(p=>p.motion!==null||p.surface==='ice'||(level.zones||[]).length>0)).toBe(true);
  expect(main.includes(level.finish.platformId)&&main.includes(level.checkpoints[0].platformId)&&main.includes(level.discovery.platformId)).toBe(true);
  for(const enemy of level.enemies!)expect(main).toContain(enemy.platformId);
 });
 it('has an optional upper route that climbs, includes a moving platform, holds a star and rejoins the main route',()=>{
  const bonus=upper.map(id=>byId(level,id)).filter(p=>p.route==='upper');
  expect(bonus.length).toBeGreaterThanOrEqual(3);expect(bonus.some(p=>p.motion!==null)).toBe(true);
  expect(Math.max(...bonus.map(p=>p.y))).toBeGreaterThan(Math.max(...main.map(id=>byId(level,id).y))+1.5);
  expect(level.stars.some(star=>byId(level,star.platformId).route==='upper')).toBe(true);
  expect(main).toContain(upper.at(-1));expect(main.some(id=>upper.includes(id)&&byId(level,id).x>Math.max(...bonus.map(p=>p.x)))).toBe(true);
 });
 it('keeps every route jump within the real jump arc, lower jumps comfortable and walking lanes clear',()=>{
  for(const route of [main,starPath(level)]){expect(routeLeaps(level,route).filter(leap=>!leap.ok)).toEqual([]);expect(headroomConflicts(level,route)).toEqual([]);}
  for(const leap of routeLeaps(level,main)){const fixed=!byId(level,leap.from).motion&&!byId(level,leap.to).motion;if(fixed){expect(leap.gap,`${leap.from}->${leap.to}`).toBeLessThanOrEqual(3.5);expect(leap.rise,`${leap.from}->${leap.to}`).toBeLessThanOrEqual(1.25);}}
 });
});

describe.each(templateCodes)('%s input-driven play',code=>{
 it('finishes the lower route without upper rocks or damage, at Discovery, Adventure and Expert difficulty',()=>{
  for(const difficulty of [1,2,4] as const){
   const level=levelDefinitionFor(code,difficulty),run=playRoute(level,level.mainRoute!),s=run.simulation.state;
   expect(s.status,`difficulty ${difficulty}`).toBe('completed');expect(run.damage).toBe(0);expect(s.hearts).toBe(3);expect(run.discoveries).toBe(1);expect(s.discoveryFound).toBe(true);
   expect(s.checkpointId).toBe(level.checkpoints.at(-1)!.id);expect(s.coins).toBeGreaterThan(10);expect(run.simulation.progress()).toBe(100);
   expect(run.visited.filter(id=>level.platforms.find(p=>p.id===id)?.route!=='main')).toEqual([]);
   expect(run.visited.some(id=>level.platforms.find(p=>p.id===id)?.motion)||level.platforms.some(p=>p.surface==='ice')||(level.zones||[]).length>0).toBe(true);
  }
 });
 it('collects all three stars through the upper route and finishes, at Discovery and Expert difficulty',()=>{
  for(const difficulty of [1,4] as const){
   const level=levelDefinitionFor(code,difficulty),run=playRoute(level,starPath(level),{collectStars:true});
   expect(run.simulation.state.status,`difficulty ${difficulty}`).toBe('completed');expect(run.simulation.state.stars).toBe(3);expect(run.damage).toBe(0);
   expect(run.visited.some(id=>level.platforms.find(p=>p.id===id)?.route==='upper')).toBe(true);
  }
 });
 it('reaches every one of the 30 coins across the lower and bonus runs',()=>{
  const level=levelDefinitionFor(code),lower=playRoute(level,level.mainRoute!,{collectCoins:true}),bonus=playRoute(level,starPath(level),{collectStars:true,collectCoins:true});
  expect(lower.simulation.state.status).toBe('completed');expect(bonus.simulation.state.status).toBe('completed');
  expect(new Set([...lower.simulation.collectedCoins,...bonus.simulation.collectedCoins]).size).toBe(30);
 });
});

describe('Country mechanics in the shared simulation',()=>{
 it('warns before a desert or fjord gust, then pushes only inside the zone and only while it blows',()=>{
  for(const code of ['EGY','NOR']){
   const level=levelDefinitionFor(code),zone=level.zones![0],gustStart=((zone.period-zone.duration-zone.phase)%zone.period+zone.period)%zone.period;
   expect(windAt(zone,gustStart-zone.warning/2).phase).toBe('warning');expect(windAt(zone,gustStart+zone.duration/2)).toMatchObject({phase:'gust',strength:1});expect(windAt(zone,gustStart-zone.warning-.5).phase).toBe('calm');
   // A pillar or ledge wholly inside the gust; Norway's tier-4 ridge is waited out on the summit.
   const inside=level.platforms.filter(p=>!p.motion&&p.x>=zone.x-.01&&p.x+p.width<=zone.x+zone.width+.01),ledge=code==='NOR'?inside.sort((a,b)=>b.width-a.width)[0]:inside[0],fixture=structuredClone(level);fixture.spawn={platformId:ledge.id,offset:ledge.width/2};fixture.enemies=[];fixture.discoveryBlocks=[];
   const simulation=new LevelSimulation(fixture),events:string[]=[],start=simulation.state.x;let warnedBeforeGust=false;
   for(let i=0;i<Math.ceil(zone.period*60)+5;i++){for(const event of simulation.advance(FIXED_STEP)){events.push(event.type);if(event.type==='wind')warnedBeforeGust=events.includes('wind-warning');}}
   // A player standing still is pushed but never blown off the ledge.
   expect(warnedBeforeGust,code).toBe(true);expect(Math.sign(simulation.state.x-start)).toBe(Math.sign(zone.force));expect(Math.abs(simulation.state.x-start)).toBeGreaterThan(.5);expect(simulation.state.grounded).toBe(true);expect(simulation.state.hearts).toBe(3);
  }
 });
 it('makes the Canadian ice ledges slippery and leaves dry banks grippy',()=>{
  const level=levelDefinitionFor('CAN'),ice=level.platforms.find(p=>p.surface==='ice')!,stone=level.platforms.find(p=>p.id==='ca-start')!;
  const slide=(platformId:string)=>{const fixture=structuredClone(level);const p=fixture.platforms.find(item=>item.id===platformId)!;p.width=14;fixture.spawn={platformId,offset:1};fixture.enemies=[];fixture.discoveryBlocks=[];fixture.discovery={...fixture.discovery,platformId:fixture.platforms[0].id,offset:1};const simulation=new LevelSimulation(fixture);simulation.setInput({left:false,right:true,jump:false});for(let i=0;i<70;i++)simulation.advance(FIXED_STEP);simulation.setInput({left:false,right:false,jump:false});const from=simulation.state.x;for(let i=0;i<120;i++)simulation.advance(FIXED_STEP);return simulation.state.x-from;};
  expect(slide(ice.id)).toBeGreaterThan(slide(stone.id)*2);expect(level.platforms.filter(p=>p.surface==='ice')).toHaveLength(2);
 });
 it('holds paused moving platforms at both ends and bobs the Australian raft on the waves',()=>{
  const level=levelDefinitionFor('ITA'),slab=level.platforms.find(p=>p.style==='slab')!,samples=Array.from({length:700},(_,i)=>platformOffset(slab,i/100).x);
  expect(Math.max(...samples)).toBeCloseTo(slab.amplitude,5);expect(Math.min(...samples)).toBeCloseTo(-slab.amplitude,5);
  expect(samples.filter(x=>Math.abs(Math.abs(x)-slab.amplitude)<1e-6).length).toBeGreaterThan(slab.pause!*100*1.5);
  const raft=levelDefinitionFor('AUS').platforms.find(p=>p.style==='raft'&&p.motion==='horizontal')!,heights=Array.from({length:700},(_,i)=>platformOffset(raft,i/100).y);
  expect(Math.max(...heights)).toBeGreaterThan(raft.bob!*.9);expect(Math.min(...heights)).toBeLessThan(-raft.bob!*.9);
 });
 it('carries a rider up the Paris maintenance lift to a terrace that cannot be reached by jumping',()=>{
  const level=levelDefinitionFor('FRA'),lift=byId(level,'fr-lift'),terrace=byId(level,'fr-high-terrace'),e1=byId(level,'fr-e1');
  // The terrace is farther than any running jump from the last fixed ledge.
  const flight=2*level.physics.jumpSpeed/level.physics.gravity;expect(terrace.x-(e1.x+e1.width)).toBeGreaterThan(level.physics.runSpeed*flight);expect(lift.motion).toBe('vertical');
  const fixture=structuredClone(level);fixture.spawn={platformId:lift.id,offset:1.5};const simulation=new LevelSimulation(fixture),heights:number[]=[];
  for(let i=0;i<600;i++){simulation.advance(FIXED_STEP);heights.push(simulation.state.y);}
  expect(Math.max(...heights)-Math.min(...heights)).toBeGreaterThan(2.5);expect(simulation.state.standing).toBe(lift.id);
 });
 it('pauses enemy patrols at their edges, never leaving the platform',()=>{
  for(const code of codes.filter(code=>levelDefinitionFor(code).enemies?.length)){
   const level=levelDefinitionFor(code),simulation=new LevelSimulation({...level,spawn:{platformId:level.platforms[0].id,offset:level.spawn.platformId===level.platforms[0].id?level.spawn.offset:1}}),enemy=simulation.enemies[0],platform=byId(level,enemy.platformId),states=new Set<string>();
   for(let i=0;i<1500;i++){simulation.advance(FIXED_STEP);const e=simulation.enemies[0];states.add(e.state);expect(e.x).toBeGreaterThanOrEqual(platform.x+.3);expect(e.x).toBeLessThanOrEqual(platform.x+platform.width-.3);}
   expect(states.has('PATROL_LEFT')&&states.has('PATROL_RIGHT')&&states.has('TURN'),code).toBe(true);
  }
 });
 it('keeps an independent look-ahead copy of the simulation',()=>{
  const simulation=new LevelSimulation(levelDefinitionFor('BRA')),copy=simulation.clone();copy.setInput({left:false,right:true,jump:true});for(let i=0;i<90;i++)copy.advance(FIXED_STEP);
  expect(copy.state.x).not.toBe(simulation.state.x);expect(simulation.state.elapsedSeconds).toBe(0);expect(copy.platforms[0]).not.toBe(simulation.platforms[0]);
 });
 it('rejects unsafe mechanic data before a level mounts',()=>{
  const level=levelDefinitionFor('NOR');
  for(const mutate of [(l:LevelDefinition)=>{l.zones![0].warning=l.zones![0].period;},(l:LevelDefinition)=>{l.zones![0].force=0;},(l:LevelDefinition)=>{l.platforms.find(p=>p.motion)!.pause=50;},(l:LevelDefinition)=>{l.platforms[0].bob=.3;},(l:LevelDefinition)=>{l.sections=l.sections!.slice(1);},(l:LevelDefinition)=>{l.coins[0].offset=-5;},(l:LevelDefinition)=>{l.platforms[0].style='Roman Arch!';}]){const copy=structuredClone(level);mutate(copy);expect(()=>validateLevel(copy)).toThrow();}
 });
});
