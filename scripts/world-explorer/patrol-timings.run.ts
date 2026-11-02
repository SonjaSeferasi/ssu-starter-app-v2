// Patrol-timing investigations behind the Stage A acceptance findings:
//   npx vitest run --config scripts/world-explorer/patrol-timings.vitest.config.mjs
// A start delay shifts every patrol phase, so sweeping it across one patrol
// cycle samples the timings a player can meet. Writes
// documentation/world-explorer/review/south-america/acceptance/patrol-timings.json.
//   Venezuela: does the bot collect ve-coin-01 past the summit toad at the
//     runtime difficulty (3)?
//   Brazil: how often does the main-route coin detour meet the far-bank seed
//     pod, at difficulty 1 and at the runtime difficulty (2), with and without
//     collecting coins?
import {it} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {authoredDifficulty,levelDefinitionFor} from '../../lib/world-explorer/level-manifest';
import {playRoute} from '../../lib/world-explorer/level-analysis';
import {criticalPlatforms,optionalPath,routeGraphFor} from '../../lib/world-explorer/route-graph';
import type {Difficulty} from '../../lib/world-explorer/game-types';

const cycle=(code:string,platformId:string,difficulty:Difficulty)=>{const e=levelDefinitionFor(code,difficulty).enemies!.find(enemy=>enemy.platformId===platformId)!;return 2*((e.maxOffset-e.minOffset)/e.speed+(e.turnPause??0));};
const sweep=(count:number,length:number)=>Array.from({length:count},(_,i)=>+(i*length/count).toFixed(2));

it('sweeps patrol timings for the Stage A findings',()=>{
 const out:Record<string,unknown>={};
 {const difficulty=authoredDifficulty('VEN')??1,level=levelDefinitionFor('VEN',difficulty),graph=routeGraphFor(level),waits=sweep(16,cycle('VEN','ve-summit',difficulty));
  out.venezuela={coin:'ve-coin-01',difficulty,runs:(['main','bonus'] as const).flatMap(route=>waits.map(wait=>{const r=playRoute(level,route==='main'?criticalPlatforms(graph):optionalPath(graph),{collectCoins:true,collectStars:route==='bonus',wait});return{route,wait,status:r.simulation.state.status,damage:r.damage,collected:r.simulation.collectedCoins.has('ve-coin-01')};}))};}
 {const runs:unknown[]=[];
  for(const difficulty of [1,2] as const){const level=levelDefinitionFor('BRA',difficulty),graph=routeGraphFor(level);
   for(const collectCoins of [true,false])for(const wait of sweep(32,cycle('BRA','br-far-bank',2))){const r=playRoute(level,criticalPlatforms(graph),{collectCoins,wait});runs.push({difficulty,collectCoins,wait,status:r.simulation.state.status,damage:r.damage,hits:r.hits.map(h=>({x:+h.x.toFixed(2),on:h.standing}))});}}
  out.brazil={platform:'br-far-bank',runtimeDifficulty:authoredDifficulty('BRA')??1,runs};}
 const dir='documentation/world-explorer/review/south-america/acceptance';mkdirSync(dir,{recursive:true});writeFileSync(`${dir}/patrol-timings.json`,JSON.stringify(out,null,1));
});
