import {describe,expect,it} from 'vitest';
import {isAuthoredLevel,levelAvailability,levelDefinitionFor,validateLevel} from '../lib/world-explorer/level-manifest';
import {FIXED_STEP,LevelSimulation,platformOffset} from '../lib/world-explorer/simulation';
import {platformSurfaceY} from '../lib/world-explorer/platform-surface';
import {playRoute} from '../lib/world-explorer/level-analysis';
import {criticalPlatforms,optionalPath,routeGraphFor} from '../lib/world-explorer/route-graph';
import {validateLevelDesign} from '../lib/world-explorer/level-validator';
import {analyzeDifficulty,explorerAssist,measureJumpEnvelope,tiers} from '../lib/world-explorer/difficulty';
import {compareLevels,fingerprint,similarityMatrix} from '../lib/world-explorer/level-similarity';
import {authoredLevels} from '../lib/world-explorer/authored-levels';
import {gameplayCameraFrame} from '../lib/world-explorer/game-camera';
import {discoveryIdFor} from '../lib/world-explorer-progress';
import {cardStatus,designManifest,designRecord,mechanics,productionSummary,tierQuota} from '../lib/world-explorer/design-manifest';
import type {LevelDefinition} from '../lib/world-explorer/game-types';

/** The three proof levels: same engine, different play. */
const redesigned=[['EGY',2,'desert-ruins-mechanism'],['BRA',3,'canopy-river-traversal'],['NOR',4,'vertical-cliff-precision']] as const;
const byId=(level:LevelDefinition,id:string)=>level.platforms.find(p=>p.id===id)!;
const fixture=(level:LevelDefinition,platformId:string,offset:number)=>{const copy=structuredClone(level);copy.spawn={platformId,offset};copy.enemies=[];copy.discoveryBlocks=[];return copy;};
const run=(simulation:LevelSimulation,frames:number,input={left:false,right:false,jump:false})=>{const events:string[]=[];for(let i=0;i<frames;i++){simulation.setInput(input);events.push(...simulation.advance(FIXED_STEP).map(e=>e.type));}return events;};

describe.each(redesigned)('%s route-graph level',(code,tier,archetype)=>{
 const level=levelDefinitionFor(code),graph=routeGraphFor(level);
 it('declares its own design identity, tier, route graph and close gameplay camera',()=>{
  expect(isAuthoredLevel(code)).toBe(true);expect(levelAvailability(code)).toMatchObject({stage:'prototype',visualReviewed:false,releaseReady:false});
  expect(level.difficultyTier).toBe(tier);expect(level.design?.archetype).toBe(archetype);expect(level.routeGraph).toBeDefined();
  expect(level.discovery.factId).toBe(discoveryIdFor(code));
  // Grounded terrain, not only floating rocks: continuous ground, stairs or cliffs.
  const kinds=new Set(level.platforms.map(p=>p.terrain));expect(kinds.has('ground')).toBe(true);expect(kinds.has('stairs')).toBe(true);
  expect(level.platforms.filter(p=>p.terrain==='ground'||p.terrain==='cliff'||p.terrain==='stairs'||p.terrain==='slope').every(p=>p.thickness>=12)).toBe(true);
  expect(level.camera?.distance).toBeGreaterThan(18);
 });
 it('passes every LevelValidator check, including physics at every timing',()=>{
  const report=validateLevelDesign(level);
  expect(report.checks.length).toBeGreaterThanOrEqual(15);
  expect(report.checks.filter(check=>!check.ok).map(check=>`${check.name}: ${check.detail}`)).toEqual([]);
 },240000);
 it('measures at its declared tier against the real jump envelope',()=>{
  const report=analyzeDifficulty(level);expect(report.measuredTier).toBe(tier);expect(report.warnings).toEqual([]);
  const band=tiers[tier-1],hardest=Math.max(...report.jumps.map(j=>j.gapPercent));expect(hardest).toBeGreaterThanOrEqual(band.gap[0]);expect(hardest).toBeLessThanOrEqual(band.gap[1]);
 });
 it('finishes with no damage at Discovery, Adventure and Expert challenge',()=>{
  for(const difficulty of [1,2,4] as const){
   const scaled=levelDefinitionFor(code,difficulty),result=playRoute(scaled,criticalPlatforms(routeGraphFor(scaled))),s=result.simulation.state;
   expect(s.status,`difficulty ${difficulty}`).toBe('completed');expect(result.damage).toBe(0);expect(s.discoveryFound).toBe(true);expect(s.checkpointId).toBe(scaled.checkpoints.at(-1)!.id);
  }
 },120000);
 it('reaches every coin and all three stars across the critical and optional runs',()=>{
  const main=playRoute(level,criticalPlatforms(graph),{collectCoins:true}),bonus=playRoute(level,optionalPath(graph),{collectStars:true,collectCoins:true});
  expect(main.simulation.state.status).toBe('completed');expect(bonus.simulation.state.status).toBe('completed');expect(main.damage+bonus.damage).toBe(0);
  expect(bonus.simulation.state.stars).toBe(3);
  expect(new Set([...main.simulation.collectedCoins,...bonus.simulation.collectedCoins]).size).toBe(level.coins.length);
 },180000);
 it('stays completable in Explorer assist mode, with the same route and gentler timing',()=>{
  const assisted=explorerAssist(level);expect(assisted.platforms.map(p=>[p.x,p.y,p.width])).toEqual(level.platforms.map(p=>[p.x,p.y,p.width]));
  expect(assisted.physics.coyoteTime).toBeGreaterThan(level.physics.coyoteTime);
  const result=playRoute(assisted,criticalPlatforms(routeGraphFor(assisted)));expect(result.simulation.state.status).toBe('completed');expect(result.damage).toBe(0);
 },120000);
});

describe('Level similarity and difficulty tooling',()=>{
 it('measures the jump envelope from the simulation itself',()=>{
  const {dmax,hmax}=measureJumpEnvelope(levelDefinitionFor('EGY').physics);
  // Close to the analytic 2·v·vy/g and vy²/2g, less the frame-quantized takeoff.
  expect(dmax).toBeGreaterThan(5.2);expect(dmax).toBeLessThan(5.5);expect(hmax).toBeGreaterThan(1.9);expect(hmax).toBeLessThan(2.03);
  expect(tiers.map(t=>t.share).reduce((a,b)=>a+b,0)).toBe(193);
 });
 it('finds the three proof levels structurally different and flags the template levels for review',()=>{
  const prints=redesigned.map(([code])=>fingerprint(levelDefinitionFor(code)));
  for(let i=0;i<prints.length;i++)for(let j=i+1;j<prints.length;j++){const result=compareLevels(prints[i],prints[j]);expect(result.review,`${result.a} ~ ${result.b} ${result.score.toFixed(2)}`).toBe(false);expect(result.score).toBeLessThan(.55);}
  expect(new Set(prints.map(p=>p.rhythm)).size).toBe(3);expect(new Set(prints.map(p=>p.signature)).size).toBe(3);
  // The levels still built from the shared template (Canada and the United States have since been redesigned).
  const templateCodes=['ITA','CAN','AUS','ZAF','FRA','USA'].filter(code=>!(authoredLevels[code] as {design?:unknown}).design);expect(templateCodes.length).toBeGreaterThanOrEqual(3);
  const template=similarityMatrix(templateCodes.map(code=>levelDefinitionFor(code)));
  expect(template.every(pair=>pair.review)).toBe(true);
 });
 it('derives a graph for template levels so every level is checked the same way',()=>{
  for(const code of Object.keys(authoredLevels)){const level=levelDefinitionFor(code),graph=routeGraphFor(level);expect(criticalPlatforms(graph).at(-1),code).toBe(level.finish.platformId);expect(criticalPlatforms(graph)[0]).toBe(level.spawn.platformId);}
 });
 it('rejects malformed route graphs, mechanisms and terrain before a level mounts',()=>{
  const level=levelDefinitionFor('EGY');
  const mutations:((l:LevelDefinition)=>void)[]=[
   l=>{l.routeGraph!.edges[0].action='TELEPORT' as never;},l=>{l.routeGraph!.nodes[0].platformId='missing';},l=>{l.routeGraph!.edges[0].to=l.routeGraph!.edges[0].from;},
   l=>{l.switches![0].gateIds=['missing-gate'];},l=>{l.gates![0].height=1;},l=>{l.platforms[0].terrain='unknown-terrain' as never;},l=>{l.platforms.find(p=>p.steps)!.steps=40;},
   l=>{l.platforms[0].slope=50;},l=>{l.difficultyTier=6 as never;},l=>{l.platforms[0].collapse={delay:0,respawn:1};},l=>{l.checkpoints[0].platformId=l.platforms.find(p=>p.id==='eg-col-1')!.id;l.platforms.find(p=>p.id==='eg-col-1')!.collapse={delay:1,respawn:3};},
  ];
  for(const mutate of mutations){const copy=structuredClone(level);mutate(copy);expect(()=>validateLevel(copy)).toThrow();}
 });
});

describe('Shared mechanics library',()=>{
 it('opens a timed stone gate from a pressure plate, warns before closing and never closes on the player',()=>{
  const level=levelDefinitionFor('EGY'),gate=level.gates![0],plate=level.switches![0],simulation=new LevelSimulation(fixture(level,plate.platformId,plate.offset));
  expect(simulation.gates[0].open).toBe(0);
  const events=run(simulation,60);expect(events).toContain('switch');expect(events).toContain('gate-open');expect(simulation.gates[0].open).toBe(1);
  // Walk away: the gate stays open for its window, then warns and sinks closed.
  const later=run(simulation,Math.ceil((gate.openSeconds+2.5)*60),{left:true,right:false,jump:false});expect(later).toContain('gate-closing');expect(simulation.gates[0].open).toBe(0);
  // A closed gate is a wall.
  const blocked=new LevelSimulation(fixture(level,'eg-gate-court',6));run(blocked,180,{left:false,right:true,jump:false});expect(blocked.state.x).toBeLessThan(gate.x);
  // Standing over the open slot holds the gate open.
  const holder=new LevelSimulation(fixture(level,plate.platformId,plate.offset));run(holder,40);holder.state.x=gate.x+gate.width/2;holder.state.standing='eg-gate-exit';run(holder,Math.ceil((gate.openSeconds+3)*60));expect(holder.gates[0].open).toBe(1);
 });
 it('shakes, drops and later restores a collapsing ice ledge',()=>{
  const level=levelDefinitionFor('NOR'),ice=byId(level,'no-ice-1'),simulation=new LevelSimulation(fixture(level,ice.id,1.2)),state=()=>simulation.platforms.find(p=>p.id===ice.id)!;
  run(simulation,10);expect(state().collapsePhase).toBe('shaking');
  const events=run(simulation,Math.ceil(ice.collapse!.delay*60)+30);expect(events).toContain('collapse');expect(['falling','hidden']).toContain(state().collapsePhase);
  expect(simulation.state.standing).not.toBe(ice.id);
  run(simulation,Math.ceil((ice.collapse!.respawn+3)*60));expect(['stable','hidden']).toContain(state().collapsePhase);
 });
 it('swings a vine seat along an arc that rises at each end',()=>{
  const swing=byId(levelDefinitionFor('BRA'),'br-swing-1'),samples=Array.from({length:440},(_,i)=>platformOffset(swing,i/100));
  expect(Math.max(...samples.map(s=>s.x))).toBeCloseTo(swing.amplitude,1);expect(Math.min(...samples.map(s=>s.x))).toBeCloseTo(-swing.amplitude,1);
  const low=samples.find(s=>Math.abs(s.x)<.05)!,high=samples.find(s=>Math.abs(s.x)>swing.amplitude*.98)!;expect(low.y).toBeLessThan(.01);expect(high.y).toBeGreaterThan(.4);
 });
 it('launches from a bounce pad and climbs stairs and slopes by walking',()=>{
  const brazil=levelDefinitionFor('BRA'),bounce=new LevelSimulation(fixture(brazil,'br-start',brazil.spawn.offset));
  const events=run(bounce,240,{left:false,right:true,jump:false});expect(events).toContain('bounce');expect(bounce.state.standing).toBe('br-canopy-1');
  const egypt=levelDefinitionFor('EGY'),stairs=byId(egypt,'eg-stairs-1'),walker=new LevelSimulation(fixture(egypt,'eg-dune',.5));
  run(walker,90,{left:false,right:true,jump:false});expect(walker.state.y).toBeGreaterThan(stairs.y+stairs.slope!*.5);expect(walker.state.grounded).toBe(true);
  expect(platformSurfaceY(stairs,stairs.x+.1)).toBe(stairs.y);expect(platformSurfaceY(stairs,stairs.x+stairs.width-.1)).toBeCloseTo(stairs.y+stairs.slope!,5);
 });
 it('frames the player at 9-12% of the view height on the left third',()=>{
  for(const [code] of redesigned){
   const level=levelDefinitionFor(code),frame=gameplayCameraFrame(level,level.camera!,40,1,16/9),visible=2*Math.tan(22*Math.PI/180)*(frame.z-.2);
   const share=level.physics.playerHeight/visible;expect(share).toBeGreaterThanOrEqual(.09);expect(share).toBeLessThanOrEqual(.12);
   const width=visible*16/9,screenX=(40-(frame.x-width/2))/width;expect(screenX).toBeGreaterThan(.25);expect(screenX).toBeLessThan(.36);
  }
 });
});

describe('Design manifest and production tracker',()=>{
 it('covers the 193 member states at exactly the 39/39/39/38/38 tier split, all unreviewed',()=>{
  const summary=productionSummary();expect(summary.total).toBe(193);expect(summary.tiers).toEqual(Object.fromEntries(Object.entries(tierQuota).map(([k,v])=>[k,v])));
  const built=Object.values(authoredLevels),designed=built.filter(level=>level.design&&level.difficultyTier).length;
  expect(summary.reviewed).toBe(0);expect(summary.status).toEqual({playable:designed,template:built.length-designed,planned:193-built.length});expect(designRecord('ANTARCTICA')).toBeUndefined();
  expect(Object.keys(summary.archetypes).length).toBeGreaterThanOrEqual(15);
 });
 it('records real design data for built levels and measured tiers for template levels',()=>{
  for(const record of designManifest().filter(r=>r.status!=='planned')){
   const level=levelDefinitionFor(record.code);expect(record.levelId).toBe(level.id);
   expect(record.difficultyTier,record.code).toBe(record.status==='playable'?level.difficultyTier:analyzeDifficulty(level).measuredTier);
  }
  expect(designManifest().filter(r=>r.status==='planned').every(r=>mechanics.find(m=>m.id===r.signatureMechanic)?.status==='implemented')).toBe(true);
 });
 it('opens every built level from the start, with no tier lock',()=>{
  // A tier describes the route, not a gate: a tier 4 level is open with nothing completed.
  expect(cardStatus('EGY',new Set())).toBe('playable');expect(cardStatus('BRA',new Set())).toBe('playable');expect(cardStatus('NOR',new Set())).toBe('playable');
  expect(cardStatus('EGY',new Set(['EGY']))).toBe('completed');
  // Every member state is built, so each card opens; a code outside the catalogue stays under development.
  for(const record of designManifest())expect(cardStatus(record.code,new Set()),record.code).toBe('playable');expect(cardStatus('ANTARCTICA',new Set())).toBe('under-development');
 });
});
