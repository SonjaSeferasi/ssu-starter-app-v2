// Diagnose composed levels: failing design-validator checks, the measured tier
// and where the bot stops on each route at runtime difficulty.
//   DIAG_CODES=DEU,GRC npx vitest run --config scripts/world-explorer/compose-diagnose.vitest.config.mjs
import {it} from 'vitest';
import {authoredDifficulty,levelDefinitionFor} from '../../lib/world-explorer/level-manifest';
import {validateLevelDesign} from '../../lib/world-explorer/level-validator';
import {analyzeDifficulty} from '../../lib/world-explorer/difficulty';
import {playRoute} from '../../lib/world-explorer/level-analysis';
import {criticalPlatforms,optionalPath,routeGraphFor} from '../../lib/world-explorer/route-graph';
import {collectibleAcceptance} from '../../lib/world-explorer/collectible-acceptance';

it('diagnoses composed levels',()=>{
 for(const code of (process.env.DIAG_CODES||'DEU').split(',')){
  const level=levelDefinitionFor(code,authoredDifficulty(code)),graph=routeGraphFor(level);
  const failed=validateLevelDesign(level,{physics:process.env.DIAG_PHYSICS==='1'}).checks.filter(c=>!c.ok);
  const report=analyzeDifficulty(level);
  console.log(`\n== ${code} tier measured ${report.measuredTier} (declared ${level.difficultyTier}) score ${report.score.toFixed(2)} mechanics ${report.mechanics.join(',')}`);
  for(const c of failed)console.log('  validator:',JSON.stringify(c).slice(0,300));
  for(const w of report.warnings)console.log('  warning:',w);
  console.log('  hardest:',[...report.jumps].sort((x,y)=>y.gapPercent-x.gapPercent).slice(0,6).map(j=>`${j.from}>${j.to} gap ${j.gap.toFixed(2)} (${j.gapPercent.toFixed(0)}%) rise ${j.rise.toFixed(2)} ${j.action}`).join(' | '));
  for(const [name,path] of [['main',criticalPlatforms(graph)],['bonus',optionalPath(graph)]] as const){
   const run=playRoute(level,path,{collectCoins:true,collectStars:name==='bonus'}),s=run.simulation.state;
   console.log(`  ${name}: ${s.status} x=${s.x.toFixed(2)} y=${s.y.toFixed(2)} standing=${s.standing} hearts=${s.hearts} damage=${run.damage} visited=${[...run.visited].slice(-3).join('>')} bonusVisited=${[...run.visited].some(v=>v.includes('-bonus-'))}`);
  }
  if(process.env.DIAG_COLLECT==='1'){const a=collectibleAcceptance(code),byId=new Map(level.platforms.map(q=>[q.id,q]));for(const id of [...a.missingCoins,...a.missingStars]){const c=[...level.coins,...level.stars].find(k=>k.id===id)!,q=byId.get(c.platformId)!;console.log(`  missing ${id} on ${q.id} (${q.terrain}${q.slope?' slope '+q.slope:''}${q.motion?' '+q.motion:''}) offset ${c.offset.toFixed(2)}/${q.width} height ${c.height}`);}}
  console.log('  platforms:',level.platforms.map(p=>`${p.id}@${p.x}/${p.y}w${p.width}${p.motion?':'+p.motion:''}${p.slope?' s'+p.slope:''}`).join(' '));
 }
});
