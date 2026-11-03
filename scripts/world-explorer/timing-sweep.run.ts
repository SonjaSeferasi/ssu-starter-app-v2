// Dense timing sweeps at each level's runtime difficulty:
//   SWEEP_CODES=ARG,CHL SWEEP_COUNT=24 SWEEP_OUT=batch-b \
//     npx vitest run --config scripts/world-explorer/timing-sweep.vitest.config.mjs
// A start delay shifts every patrol, gust and hazard phase. Each level is
// played at SWEEP_COUNT delays spread over 0–SWEEP_SPAN s (default 9 s) on
// three strategies: the critical route, the main route collecting coins, and
// the bonus route collecting coins and stars. Writes
// documentation/world-explorer/review/south-america/acceptance/timing-sweep-<SWEEP_OUT>.json
// with each run's outcome and where any damage happened.
import {it} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {authoredDifficulty,levelDefinitionFor} from '../../lib/world-explorer/level-manifest';
import {playRoute} from '../../lib/world-explorer/level-analysis';
import {criticalPlatforms,optionalPath,routeGraphFor} from '../../lib/world-explorer/route-graph';
import {stepBack} from '../../lib/world-explorer/collectible-acceptance';

it('sweeps start timings at runtime difficulty',()=>{
 const codes=(process.env.SWEEP_CODES||'GUY').split(','),count=Number(process.env.SWEEP_COUNT||16),span=Number(process.env.SWEEP_SPAN||9);
 const waits=Array.from({length:count},(_,i)=>+(i*span/count).toFixed(2)),out:Record<string,unknown>={};
 for(const code of codes){
  const difficulty=authoredDifficulty(code)??1,level=levelDefinitionFor(code,difficulty),graph=routeGraphFor(level);
  const detours=(stepBack[code]||[]).map(platformId=>({platformId,kind:'backtrack' as const,seconds:1}));
  const coins=new Set<string>(),stars=new Set<string>(),runs:unknown[]=[];let damaged=0,failed=0;
  for(const wait of waits)for(const strategy of ['critical','main','bonus'] as const){
   const r=playRoute(level,strategy==='bonus'?optionalPath(graph):criticalPlatforms(graph),{wait,collectCoins:strategy!=='critical',collectStars:strategy==='bonus',detours:strategy==='critical'?[]:detours}),s=r.simulation.state;
   if(s.status==='completed'&&r.damage===0){r.simulation.collectedCoins.forEach(id=>coins.add(id));r.simulation.collectedStars.forEach(id=>stars.add(id));}
   if(r.damage)damaged++;if(s.status!=='completed')failed++;
   runs.push({wait,strategy,status:s.status,damage:r.damage,coins:s.coins,stars:s.stars,hits:r.hits.map(h=>({x:+h.x.toFixed(2),y:+h.y.toFixed(2),on:h.standing}))});
  }
  out[code]={difficulty,waits,runs:runs.length,damaged,failed,cleanCoins:`${coins.size}/${level.coins.length}`,cleanStars:`${stars.size}/${level.stars.length}`,missingCoins:level.coins.filter(c=>!coins.has(c.id)).map(c=>c.id),detail:runs};
  console.log('SWEEP',code,'d'+difficulty,`${runs.length} runs`,`damaged ${damaged}`,`failed ${failed}`,'coins',`${coins.size}/${level.coins.length}`,'stars',`${stars.size}/${level.stars.length}`);
 }
 const dir='documentation/world-explorer/review/south-america/acceptance';mkdirSync(dir,{recursive:true});
 writeFileSync(`${dir}/timing-sweep-${process.env.SWEEP_OUT||'latest'}.json`,JSON.stringify(out,null,1));
});
