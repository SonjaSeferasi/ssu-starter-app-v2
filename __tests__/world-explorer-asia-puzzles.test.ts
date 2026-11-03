import {describe,it,expect} from 'vitest';
import {levelDefinitionFor,validateLevel} from '../lib/world-explorer/level-manifest';
import {LevelSimulation,FIXED_STEP} from '../lib/world-explorer/simulation';
import {traceLight} from '../lib/world-explorer/light-puzzle';
import {playSoutheastAsiaRoute} from '../lib/world-explorer/southeast-asia-playtest';
import {criticalPlatforms,optionalPath} from '../lib/world-explorer/route-graph';
import {analyzeDifficulty} from '../lib/world-explorer/difficulty';

const idle={left:false,right:false,jump:false};
function atMirror(){const l=levelDefinitionFor('SAU');l.spawn={platformId:'sa-light-court',offset:8};return new LevelSimulation(l);}
function tick(sim:LevelSimulation,n:number,input=idle){sim.setInput(input);for(let i=0;i<n;i++)sim.advance(FIXED_STEP);}
describe('Specified Oman water transition and Saudi light receiver',()=>{
 it('requires a reflected ray to reach the receiver, with finite range and occlusion',()=>{
  const l=levelDefinitionFor('SAU'),p=l.lightPuzzles![0],sim=new LevelSimulation(l),point=sim.position(p);
  expect(traceLight(p,point,0).lit).toBe(false);expect(traceLight(p,point,1).lit).toBe(true);expect(traceLight(p,point,2).lit).toBe(false);
  expect(traceLight({...p,range:5},point,1).lit).toBe(false);
  expect(traceLight({...p,occluders:[{x:44,y:7,width:1,height:3}]},point,1)).toMatchObject({blocked:true,lit:false});
 });
 it('does not open the light gate by walking over its old pressure plate',()=>{const sim=atMirror();tick(sim,120);expect(sim.gates[0].timer).toBe(0);expect(sim.lightPuzzles[0].lit).toBe(false);});
 it('turns once per input press and charges only after alignment',()=>{
  const sim=atMirror();tick(sim,1,{...idle,interact:true});expect(sim.lightPuzzles[0]).toMatchObject({index:1,lit:true});expect(sim.gates[0].timer).toBe(0);
  tick(sim,35,{...idle,interact:true});expect(sim.lightPuzzles[0].index).toBe(1);expect(sim.gates[0].timer).toBeGreaterThan(0);
  tick(sim,1);tick(sim,1,{...idle,interact:true});expect(sim.lightPuzzles[0]).toMatchObject({index:2,lit:false,charge:0});tick(sim,600);expect(sim.gates[0].timer).toBeLessThanOrEqual(0);
 });
 it('ignores mirror interaction outside the pedestal and preserves independent clones',()=>{
  const sim=new LevelSimulation(levelDefinitionFor('SAU'));tick(sim,1,{...idle,interact:true});expect(sim.lightPuzzles[0].index).toBe(0);
  const original=atMirror(),copy=original.clone();tick(copy,1,{...idle,interact:true});expect(original.lightPuzzles[0].index).toBe(0);expect(copy.lightPuzzles[0].index).toBe(1);
 });
 it('pauses light charging and clears queued interaction on resume',()=>{const sim=atMirror();tick(sim,1,{...idle,interact:true});const before=structuredClone(sim.lightPuzzles);sim.pause();tick(sim,200,{...idle,interact:true});expect(sim.lightPuzzles).toEqual(before);sim.resume();tick(sim,1);expect(sim.lightPuzzles[0].index).toBe(1);});
 it('raises visible water and its crossing together, then lowers only after the occupied crossing is clear',()=>{
  const l=levelDefinitionFor('OMN');l.spawn={platformId:'om-pool-bank',offset:6};const sim=new LevelSimulation(l),b=l.waterBasins![0],low=sim.waterSurface(b.id),platform=sim.platforms.find(p=>p.id===b.platformId)!;
  tick(sim,45);expect(sim.waterSurface(b.id)).toBeCloseTo(b.highSurface);expect(platform.y).toBeCloseTo(6.55);expect(low).toBe(b.lowSurface);
  sim.state.x=platform.x+2;sim.state.y=platform.y;sim.state.standing=platform.id;tick(sim,1300);expect(sim.waterSurface(b.id)).toBeCloseTo(b.highSurface);expect(sim.state.hearts).toBe(3);
  sim.state.x=32;sim.state.y=5.3;sim.state.standing='om-pool-bank';tick(sim,1200);expect(sim.waterSurface(b.id)).toBeCloseTo(b.lowSurface);expect(platform.y).toBeCloseTo(5.55);
 });
 it('recovers a submerged player through the existing checkpoint system without losing rewards',()=>{
  const sim=new LevelSimulation(levelDefinitionFor('OMN')),c=sim.level.checkpoints[0];sim.state.checkpointId=c.id;sim.state.coins=3;sim.state.x=43;sim.state.y=4;sim.state.grounded=false;sim.state.standing=null;tick(sim,65);expect(sim.state.hearts).toBe(2);expect(sim.state.standing).toBe(c.platformId);expect(sim.state.coins).toBe(3);
 });
 it('rejects impossible basin levels, missing receivers and invalid mirror data',()=>{
  const water=levelDefinitionFor('OMN');water.waterBasins![0].highSurface+=2;expect(()=>validateLevel(water)).toThrow('water transition');
  const light=levelDefinitionFor('SAU');light.lightPuzzles![0].normals=[[0,0],[1,0]];expect(()=>validateLevel(light)).toThrow('light puzzle');
 });
 it.each(['OMN','SAU'])('%s retains tier 5 and completes both routes at four runtime settings and four timings',code=>{
  for(const difficulty of [1,2,3,4] as const)for(const wait of [0,.7,1.9,3.1]){const l=levelDefinitionFor(code,difficulty),coins=new Set<string>();for(const path of [criticalPlatforms(l.routeGraph!),optionalPath(l.routeGraph!)]){const run=playSoutheastAsiaRoute(l,path,{collect:true,wait});expect(run.simulation.state,code+'/'+difficulty+'/'+wait).toMatchObject({status:'completed',hearts:3,discoveryFound:true});run.simulation.collectedCoins.forEach(c=>coins.add(c));if(path.includes(l.stars[0].platformId))expect(run.simulation.state.stars).toBe(3);if(code==='SAU')expect(run.events).toContain('light-aligned');}expect(coins.size).toBe(l.coins.length);expect(analyzeDifficulty(l).measuredTier).toBe(5);}
 },30000);
});
