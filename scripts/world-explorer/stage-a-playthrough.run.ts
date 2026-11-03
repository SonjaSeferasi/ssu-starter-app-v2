// Records input scripts for the review playthroughs of the Stage A levels:
//   npx vitest run --config scripts/world-explorer/playthrough.vitest.config.mjs
// The same input-driven bot as the test suite plays each level; every fixed
// step's input on the real simulation is recorded with the outcome it led to.
// playthrough.mjs then replays each script in the browser (?review=1&autoplay=1)
// and checks that the page reaches the same outcome.
//   <code>-complete-bonus and <code>-complete-main: the bonus route (coins and
//     stars) and the main route (coins), as in the test suite,
//     each with the discovery and the finish.
//     Together they collect every coin and star.
//   <code>-hazard: the main route to the first checkpoint, then running on
//     without jumping until a hazard or fall costs a heart and the player
//     respawns at that checkpoint.
import {it} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {authoredDifficulty,levelDefinitionFor} from '../../lib/world-explorer/level-manifest';
import {stepBack} from '../../lib/world-explorer/collectible-acceptance';
import {FIXED_STEP,LevelSimulation} from '../../lib/world-explorer/simulation';
import {playRoute} from '../../lib/world-explorer/level-analysis';
import {criticalPlatforms,optionalPath,routeGraphFor} from '../../lib/world-explorer/route-graph';
import type {SimulationEvent,SimulationInput} from '../../lib/world-explorer/game-types';

/** Uruguay: running on from the plaza checkpoint stops at a step; from the
 * quay the run goes into the harbour. */
const hazardStart:Record<string,string>={URY:'uy-quay'};
type Recording={sim?:LevelSimulation;inputs:SimulationInput[]};
const proto=LevelSimulation.prototype as unknown as {advance:(s:number)=>SimulationEvent[];clone:()=>LevelSimulation;input:SimulationInput};
const advance=proto.advance,clone=proto.clone;let recording:Recording|null=null;
// Clones are the bot's look-ahead; only the first, real simulation is recorded.
proto.clone=function(this:LevelSimulation){const copy=clone.call(this);(copy as unknown as {lookAhead:boolean}).lookAhead=true;return copy;};
proto.advance=function(this:LevelSimulation,seconds:number){
 const self=this as unknown as {lookAhead?:boolean;input:SimulationInput};
 if(recording&&!self.lookAhead){recording.sim??=this;if(recording.sim===this)recording.inputs.push({...self.input});}
 return advance.call(this,seconds);
};
const record=<T,>(play:()=>T)=>{recording={inputs:[]};try{const result=play();return{result,inputs:recording.inputs};}finally{recording=null;}};
/** Run-length encode inputs as [left, right, jump, frames]. */
const encode=(inputs:SimulationInput[])=>inputs.reduce<[number,number,number,number][]>((runs,i)=>{const key=[+i.left,+i.right,+i.jump] as const,last=runs.at(-1);if(last&&last[0]===key[0]&&last[1]===key[1]&&last[2]===key[2])last[3]++;else runs.push([...key,1]);return runs;},[]);
const tally=(events:SimulationEvent[])=>events.reduce<Record<string,number>>((t,e)=>{t[e.type]=(t[e.type]||0)+1;return t;},{});

// PLAY_CODES picks the countries (default the Stage A three); PLAY_OUT the folder.
it('records the playthrough scripts',()=>{
 const out=process.env.PLAY_OUT||'documentation/world-explorer/review/south-america/playthroughs';mkdirSync(out,{recursive:true});const summary:Record<string,unknown>={};
 for(const code of (process.env.PLAY_CODES||'BOL,BRA,VEN').split(',')){
  // The difficulty the game itself uses for this level (Brazil's JSON says medium).
  const difficulty=authoredDifficulty(code)??1,level=levelDefinitionFor(code,difficulty),graph=routeGraphFor(level);
  // Completion along the bonus route and along the main route.
  const completions=(['bonus','main'] as const).map(name=>{
   const run=record(()=>playRoute(level,name==='bonus'?optionalPath(graph):criticalPlatforms(graph),{collectCoins:true,collectStars:name==='bonus',detours:(stepBack[code]||[]).map(platformId=>({platformId,kind:'backtrack' as const,seconds:1}))})),sim=run.result.simulation,s=sim.state;
   if(s.status!=='completed')throw new Error(code+' '+name+': not completed');
   const script={code,kind:'complete-'+name,difficulty,frames:run.inputs.length,seconds:+(run.inputs.length*FIXED_STEP).toFixed(1),expected:{status:s.status,coins:s.coins,totalCoins:level.coins.length,stars:s.stars,totalStars:level.stars.length,hearts:s.hearts,discoveryFound:s.discoveryFound,checkpoints:level.checkpoints.length,coinIds:[...sim.collectedCoins].sort(),starIds:[...sim.collectedStars].sort(),tally:tally(run.result.events)},inputs:encode(run.inputs)};
   writeFileSync(`${out}/${code.toLowerCase()}-complete-${name}.json`,JSON.stringify(script));return script;
  });
  const union=new Set(completions.flatMap(c=>c.expected.coinIds)),stars=new Set(completions.flatMap(c=>c.expected.starIds));
  // Hazard and respawn: reach the first checkpoint (or a platform named in
  // hazardStart where running on from the checkpoint meets no hazard), then run
  // on without jumping; the respawn is expected at the last checkpoint reached.
  const start=hazardStart[code]??level.checkpoints[0].platformId,hazard=record(()=>{
   const route=criticalPlatforms(graph),played=playRoute(level,route,{stopAt:start}),sim=played.simulation,events=[...played.events];
   for(let frame=0;frame<1500&&!events.some(e=>e.type==='checkpoint');frame++){sim.setInput({left:false,right:true,jump:false});events.push(...sim.advance(FIXED_STEP));}
   let damagedAt=-1;
   for(let frame=0;frame<1500;frame++){sim.setInput({left:false,right:damagedAt<0,jump:false});const happened=sim.advance(FIXED_STEP);events.push(...happened);if(damagedAt<0&&happened.some(e=>e.type==='damage'))damagedAt=frame;if(damagedAt>=0&&frame-damagedAt>150)break;}
   return{sim,events};
  });
  const h=hazard.result.sim.state,checkpoint=level.checkpoints.find(c=>c.id===h.checkpointId)??level.checkpoints[0],host=hazard.result.sim.platforms.find(p=>p.id===checkpoint.platformId)!;
  const hazardRun={code,kind:'hazard',difficulty,frames:hazard.inputs.length,seconds:+(hazard.inputs.length*FIXED_STEP).toFixed(1),checkpoint:checkpoint.platformId,expected:{status:h.status,hearts:h.hearts,standing:h.standing,x:+h.x.toFixed(2),checkpointX:+(host.x+checkpoint.offset).toFixed(2),coins:h.coins,tally:tally(hazard.result.events)},inputs:encode(hazard.inputs)};
  writeFileSync(`${out}/${code.toLowerCase()}-hazard.json`,JSON.stringify(hazardRun));
  summary[code]={coinsAcrossRuns:`${union.size}/${level.coins.length}`,starsAcrossRuns:`${stars.size}/${level.stars.length}`,completions:completions.map(c=>({...c,inputs:undefined})),hazard:{...hazardRun,inputs:undefined}};
 }
 writeFileSync(`${out}/scripts-summary${process.env.PLAY_CODES?'-'+process.env.PLAY_CODES.toLowerCase().replace(/,/g,'-'):''}.json`,JSON.stringify(summary,null,1));
 console.log(JSON.stringify(summary,null,1));
});
