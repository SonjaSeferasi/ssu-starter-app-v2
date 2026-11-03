// Automated gameplay acceptance for every built adventure, one consistent
// procedure (the South American one) for all regions:
//   ADVENTURE_CODES=JPN,ECU ADVENTURE_OUT=<folder> npx vitest run --config scripts/world-explorer/adventure-acceptance.vitest.config.mjs
// For each country, at the difficulty the game itself plays it:
//  - routes: the validated bots (the route-graph bot, the Asia playtest bot
//    and, on levels with authored routes, the East Asia bot) play the main and bonus routes at start delays of 0, 1.8 and 3.6 s;
//    each route and delay needs a clean completion by at least one of them;
//  - collectibles and checkpoints: a coin, star or checkpoint counts only when
//    a completed run without damage reaches it;
//  - hazard recovery: from the first checkpoint the bot runs on without
//    jumping until a hazard or fall costs a heart, and must respawn at the
//    checkpoint (natural); where running on meets no hazard, the Asia tests'
//    controlled missed landing is used (fixture). The result names the method;
//  - it records the three input scripts (complete-main, complete-bonus,
//    hazard) that playthrough.mjs replays in the real browser.
// Nothing passes by default: an exception, a missing result or a mismatch is
// recorded as a failure with its reason. Writes <out>/<code>-*.json and
// <out>/adventure-acceptance.json.
import {it} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {authoredDifficulty,levelDefinitionFor} from '../../lib/world-explorer/level-manifest';
import {acceptanceTimings,stepBack} from '../../lib/world-explorer/collectible-acceptance';
import {playSoutheastAsiaRoute} from '../../lib/world-explorer/southeast-asia-playtest';
import {playAsiaRoute} from '../../lib/world-explorer/asia-playtest';
import {FIXED_STEP,LevelSimulation} from '../../lib/world-explorer/simulation';
import {playRoute,starPath} from '../../lib/world-explorer/level-analysis';
import {criticalPlatforms,optionalPath,routeGraphFor} from '../../lib/world-explorer/route-graph';
import type {LevelDefinition,SimulationEvent,SimulationInput} from '../../lib/world-explorer/game-types';

/** Platforms to start the hazard run from where running on from the first
 * checkpoint meets no hazard (Uruguay: from the quay the run enters the harbour). */
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
const verdict=(ok:boolean,detail:string):{result:'pass'|'fail';detail:string}=>({result:ok?'pass':'fail',detail});

type Bot='route-bot'|'asia-bot'|'east-asia-bot';
type BotRun={sim:LevelSimulation;tally:Record<string,number>;checkpoints:string[]};
/** One play of a route by either validated bot: the route-graph bot of the
 * South American tests (level-analysis playRoute) or the Asia regions'
 * playtest bot, or the East Asia bot on the level's authored main and upper
 * routes (as the East Asia tests play them). Any may fail a level another completes. */
function play(bot:Bot,code:string,level:LevelDefinition,path:string[],route:'main'|'bonus',wait:number):BotRun{
 if(bot==='route-bot'){
  const r=playRoute(level,path,{collectCoins:true,collectStars:route==='bonus',wait,detours:(stepBack[code]||[]).map(platformId=>({platformId,kind:'backtrack' as const,seconds:1}))});
  return{sim:r.simulation,tally:tally(r.events),checkpoints:r.events.filter(e=>e.type==='checkpoint').map(e=>e.id||'')};
 }
 const r=bot==='asia-bot'?playSoutheastAsiaRoute(level,path,{collect:true,wait}):playAsiaRoute(level,route==='main'?level.mainRoute!:starPath(level),{collect:true,wait});
 return{sim:r.simulation,tally:r.events.reduce<Record<string,number>>((t,e)=>{t[e]=(t[e]||0)+1;return t;},{}),checkpoints:r.checkpointSnapshots.map(c=>c.state.checkpointId||'')};
}
const clean=(run:BotRun)=>run.sim.state.status==='completed'&&!run.tally.damage;

function acceptance(code:string,out:string){
 const difficulty=authoredDifficulty(code)??1,level=levelDefinitionFor(code,difficulty),graph=routeGraphFor(level);
 const checks:Record<string,{result:'pass'|'fail';detail:string}>={};
 const paths={main:criticalPlatforms(graph),bonus:optionalPath(graph)},bots:Bot[]=['route-bot','asia-bot',...(level.mainRoute&&level.upperRoute?['east-asia-bot' as const]:[])];
 // Both routes at each start delay, by both bots. A route and delay passes
 // with a clean completion by either bot; coins, stars and checkpoints count
 // only from clean completions.
 const runs=acceptanceTimings.flatMap(wait=>(['main','bonus'] as const).flatMap(route=>bots.map(bot=>{
  try{const r=play(bot,code,level,paths[route],route,wait);return{bot,route,wait,ok:clean(r),status:r.sim.state.status,damage:r.tally.damage||0,coins:[...r.sim.collectedCoins],stars:[...r.sim.collectedStars],checkpoints:r.checkpoints};}
  catch(error){return{bot,route,wait,ok:false,status:'error: '+String(error).slice(0,80),damage:0,coins:[] as string[],stars:[] as string[],checkpoints:[] as string[]};}
 })));
 const uncovered=acceptanceTimings.flatMap(wait=>(['main','bonus'] as const).filter(route=>!runs.some(r=>r.ok&&r.route===route&&r.wait===wait)).map(route=>`${route}@${wait}s`));
 const perBot=bots.map(bot=>`${bot} ${runs.filter(r=>r.bot===bot&&r.ok).length}/${runs.filter(r=>r.bot===bot).length} clean`).join(', ');
 checks.routes=verdict(uncovered.length===0,`both routes at every start delay completed cleanly by at least one bot${uncovered.length?` — not ${uncovered.join(', ')}`:''} (${perBot})`);
 const coins=new Set(runs.filter(r=>r.ok).flatMap(r=>r.coins)),stars=new Set(runs.filter(r=>r.ok).flatMap(r=>r.stars));
 const missing=[...level.coins.filter(c=>!coins.has(c.id)),...level.stars.filter(s=>!stars.has(s.id))].map(item=>item.id);
 checks.collectibles=verdict(missing.length===0,`coins ${coins.size}/${level.coins.length}, stars ${stars.size}/${level.stars.length} collected in clean runs${missing.length?`; missing ${missing.join(', ')}`:''}`);
 const reached=new Set(runs.filter(r=>r.ok).flatMap(r=>r.checkpoints)),unreached=level.checkpoints.filter(c=>!reached.has(c.id)).map(c=>c.id);
 checks.checkpoints=verdict(level.checkpoints.length>0&&unreached.length===0,`${level.checkpoints.length} checkpoints, ${level.checkpoints.length-unreached.length} reached in clean runs${unreached.length?`; not ${unreached.join(', ')}`:''}`);
 // Recorded completions for the browser replays: the first bot that completes
 // the route cleanly from the first start time.
 const completions=(['bonus','main'] as const).map(name=>{
  for(const bot of bots){
   const run=record(()=>play(bot,code,level,paths[name],name,0)),sim=run.result.sim,s=sim.state;
   if(!clean(run.result))continue;
   const script={code,kind:'complete-'+name,bot,difficulty,frames:run.inputs.length,seconds:+(run.inputs.length*FIXED_STEP).toFixed(1),expected:{status:s.status,coins:s.coins,totalCoins:level.coins.length,stars:s.stars,totalStars:level.stars.length,hearts:s.hearts,discoveryFound:s.discoveryFound,checkpoints:level.checkpoints.length,coinIds:[...sim.collectedCoins].sort(),starIds:[...sim.collectedStars].sort(),tally:run.result.tally},inputs:encode(run.inputs)};
   writeFileSync(`${out}/${code.toLowerCase()}-complete-${name}.json`,JSON.stringify(script));
   return{...script,inputs:undefined};
  }
  return{code,kind:'complete-'+name,recorded:false};
 });
 // Hazard recovery: from the first checkpoint the bot runs on until a hazard
 // or fall costs a heart (natural). Where running on meets none, the Asia
 // tests' controlled missed landing is used instead (fixture): the player is
 // dropped below the kill line after the checkpoint and must respawn there
 // with one heart lost and coins and stars kept.
 const start=hazardStart[code]??level.checkpoints[0]?.platformId;
 if(!start){checks.hazardRecovery=verdict(false,'level has no checkpoint to respawn at');}
 else{
  let fixture=null as LevelSimulation|null;
  const hazard=record(()=>{
   const played=playRoute(level,paths.main,{stopAt:start}),sim=played.simulation,events=[...played.events];
   for(let frame=0;frame<1500&&!events.some(e=>e.type==='checkpoint');frame++){sim.setInput({left:false,right:true,jump:false});events.push(...sim.advance(FIXED_STEP));}
   if(sim.state.checkpointId&&sim.state.status==='playing')fixture=sim.clone();
   let damagedAt=-1;
   for(let frame=0;frame<1500;frame++){sim.setInput({left:false,right:damagedAt<0,jump:false});const happened=sim.advance(FIXED_STEP);events.push(...happened);if(damagedAt<0&&happened.some(e=>e.type==='damage'))damagedAt=frame;if(damagedAt>=0&&frame-damagedAt>150)break;}
   return{sim,events};
  });
  // Where the route bot does not reach a checkpoint, the fixture starts from
  // the Asia bot's checkpoint snapshot, as the Asia tests do.
  let fixtureFrom='route bot';
  if(!fixture){const snapshot=playSoutheastAsiaRoute(level,paths.main,{collect:true}).checkpointSnapshots[0];if(snapshot){fixture=snapshot.clone();fixtureFrom='Asia bot';}}
  const h=hazard.result.sim.state,checkpoint=level.checkpoints.find(c=>c.id===h.checkpointId)??level.checkpoints[0],host=hazard.result.sim.platforms.find(p=>p.id===checkpoint.platformId)!,checkpointX=host.x+checkpoint.offset,damaged=(tally(hazard.result.events).damage||0)>0;
  const respawned=damaged&&h.status==='playing'&&h.standing===checkpoint.platformId&&Math.abs(h.x-checkpointX)<2;
  if(respawned){
   checks.hazardRecovery=verdict(true,`natural: lost a heart (${h.hearts} left), standing on ${h.standing} at x ${h.x.toFixed(1)}; checkpoint ${checkpoint.platformId} at x ${checkpointX.toFixed(1)}`);
   const hazardRun={code,kind:'hazard',difficulty,frames:hazard.inputs.length,seconds:+(hazard.inputs.length*FIXED_STEP).toFixed(1),checkpoint:checkpoint.platformId,expected:{status:h.status,hearts:h.hearts,standing:h.standing,x:+h.x.toFixed(2),checkpointX:+checkpointX.toFixed(2),coins:h.coins,tally:tally(hazard.result.events)},inputs:encode(hazard.inputs)};
   writeFileSync(`${out}/${code.toLowerCase()}-hazard.json`,JSON.stringify(hazardRun));
  }else if(!fixture)checks.hazardRecovery=verdict(false,`natural: ${damaged?'damaged but did not respawn at the checkpoint':'no hazard or fall met'}; fixture: no checkpoint reached to drop from`);
  else{
   const sim:LevelSimulation=fixture,anchor=level.checkpoints.find(c=>c.id===sim.state.checkpointId)!,before={hearts:sim.state.hearts,coins:sim.state.coins,stars:sim.state.stars};
   sim.state.y=level.physics.killY-1;sim.state.grounded=false;sim.state.standing=null;sim.state.vy=-2;sim.clearInput();let recovered=false;
   for(let frame=0;frame<120&&!recovered;frame++)recovered=sim.advance(FIXED_STEP).some(e=>e.type==='respawn');
   const at=sim.position(anchor),s=sim.state,ok=recovered&&s.hearts===before.hearts-1&&s.standing===anchor.platformId&&Math.abs(s.x-at.x)<.01&&s.coins===before.coins&&s.stars===before.stars;
   checks.hazardRecovery=verdict(ok,`fixture (running on ${damaged?'did not respawn at the checkpoint':'met no hazard or fall'}): missed landing after ${anchor.id}, reached by the ${fixtureFrom}: ${recovered?`respawned on ${s.standing}, hearts ${before.hearts}→${s.hearts}, coins ${before.coins}→${s.coins}, stars ${before.stars}→${s.stars}`:'no respawn within 2 s'}`);
  }
 }
 return{difficulty,checks,completions,runs};
}

it('runs the automated acceptance for every listed adventure',()=>{
 const out=process.env.ADVENTURE_OUT||'documentation/world-explorer/review/acceptance-67/gameplay';mkdirSync(out,{recursive:true});
 const report:Record<string,unknown>={};
 for(const code of (process.env.ADVENTURE_CODES||'ECU').split(',')){
  try{report[code]=acceptance(code,out);}
  catch(error){report[code]={error:error instanceof Error?error.message:String(error),checks:{routes:verdict(false,'runner error'),collectibles:verdict(false,'runner error'),checkpoints:verdict(false,'runner error'),hazardRecovery:verdict(false,'runner error')}};}
  const r=report[code] as {checks:Record<string,{result:string}>};console.log(code,Object.entries(r.checks).map(([k,v])=>`${k} ${v.result}`).join(' · '));
 }
 writeFileSync(`${out}/adventure-acceptance${process.env.ADVENTURE_FILE?'-'+process.env.ADVENTURE_FILE:''}.json`,JSON.stringify({ranAt:new Date().toISOString(),report},null,1));
});
