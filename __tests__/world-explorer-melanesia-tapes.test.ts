import {it,expect} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {melanesiaCodes as remainingNorthAmericaCodes} from '../lib/world-explorer/melanesia';
import {authoredDifficulty,levelDefinitionFor} from '../lib/world-explorer/level-manifest';
import {LevelSimulation} from '../lib/world-explorer/simulation';
import {playRoute} from '../lib/world-explorer/level-analysis';
import {criticalPlatforms,optionalPath,routeGraphFor} from '../lib/world-explorer/route-graph';
import type {SimulationInput} from '../lib/world-explorer/game-types';
it.each(remainingNorthAmericaCodes)('%s records clean main and bonus input tapes for rendered playback',code=>{
 const level=levelDefinitionFor(code,authoredDifficulty(code)),graph=routeGraphFor(level),out='tmp/oceania-batch-a/tapes';mkdirSync(out,{recursive:true});
 for(const route of ['main','bonus'] as const){
  const advance=LevelSimulation.prototype.advance,clone=LevelSimulation.prototype.clone,lookAhead=new WeakSet<LevelSimulation>(),inputs:SimulationInput[]=[];let actual:LevelSimulation|undefined;
  LevelSimulation.prototype.clone=function(){const copy=clone.call(this);lookAhead.add(copy);return copy;};
  LevelSimulation.prototype.advance=function(seconds){if(!lookAhead.has(this)){actual??=this;if(actual===this)inputs.push({...((this as unknown as {input:SimulationInput}).input)});}return advance.call(this,seconds);};
  try{
   const result=playRoute(level,route==='main'?criticalPlatforms(graph):optionalPath(graph),{collectCoins:true,collectStars:route==='bonus'}),sim=result.simulation,s=sim.state;
   expect(s.status).toBe('completed');expect(result.damage).toBe(0);
   writeFileSync(`${out}/${code.toLowerCase()}-${route}.json`,JSON.stringify({code,route,inputs,expected:{status:s.status,hearts:s.hearts,coinIds:[...sim.collectedCoins].sort(),starIds:[...sim.collectedStars].sort(),discoveryFound:s.discoveryFound},seconds:s.elapsedSeconds}));
  }finally{LevelSimulation.prototype.advance=advance;LevelSimulation.prototype.clone=clone;}
 }
},120000);
