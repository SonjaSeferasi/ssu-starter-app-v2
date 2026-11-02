// Regenerates the measured data behind documentation/world-explorer/SOUTH-AMERICA.md:
//   npx vitest run --config scripts/world-explorer/report.vitest.config.mjs
// It runs the same LevelValidator, DifficultyAnalyzer, input-driven bot and
// similarity analyzer as the test suite, and writes one JSON file.
import {it} from 'vitest';
import {writeFileSync} from 'node:fs';
import {levelDefinitionFor} from '../../lib/world-explorer/level-manifest';
import {validateLevelDesign} from '../../lib/world-explorer/level-validator';
import {analyzeDifficulty,explorerAssist,tierName} from '../../lib/world-explorer/difficulty';
import {playRoute} from '../../lib/world-explorer/level-analysis';
import {criticalPlatforms,optionalPath,routeGraphFor} from '../../lib/world-explorer/route-graph';
import {similarityMatrix} from '../../lib/world-explorer/level-similarity';
import {southAmerica} from '../../lib/world-explorer/south-america';
import {readFileSync} from 'node:fs';
import {designRecord,mechanics,productionSummary} from '../../lib/world-explorer/design-manifest';

/** Refresh only the South American rows, the totals and the mechanics table of
 * DESIGN-MANIFEST.md from the live manifest; every other row is left as is. */
function refreshDesignManifest(){
 const path='documentation/world-explorer/DESIGN-MANIFEST.md',summary=productionSummary();let text=readFileSync(path,'utf8');
 const totals=`**Totals:** ${summary.total} countries · status ${Object.entries(summary.status).map(([k,v])=>`${k} ${v}`).join(', ')} · tiers ${Object.entries(summary.tiers).map(([k,v])=>`T${k} ${v}`).join(', ')} · reviewed ${summary.reviewed} · blocked by unimplemented mechanics ${summary.blockedByMechanics}.`;
 text=text.replace(/\*\*Totals:\*\*[^\n]*/,totals);
 for(const entry of southAmerica){
  const record=designRecord(entry.code)!,row=new RegExp(`(\\| \\d+ \\| [^|]+\\(${entry.code}\\) \\| )[^\\n]*`);
  text=text.replace(row,`$1${record.status} | ${record.difficultyTier} · ${tierName(record.difficultyTier)} | ${record.archetype} | ${record.signatureMechanic} | ${record.landmark} |`);
 }
 const table=mechanics.map(m=>`| ${m.name} | ${m.status} | \`${m.field}\` |`).join('\n');
 text=text.replace(/(\| Mechanic \| Status \| Level data \|\r?\n\| --- \| --- \| --- \|\r?\n)(?:\|[^\n]*\n)+/,`$1${table}\n`);
 writeFileSync(path,text);
}

it('South America report',()=>{
 const rows=southAmerica.filter(entry=>entry.levelBuilt).map(entry=>{
  const level=levelDefinitionFor(entry.code),graph=routeGraphFor(level),report=validateLevelDesign(level),difficulty=analyzeDifficulty(level);
  const main=playRoute(level,criticalPlatforms(graph),{collectCoins:true}),bonus=playRoute(level,optionalPath(graph),{collectStars:true,collectCoins:true});
  const coins=new Set([...main.simulation.collectedCoins,...bonus.simulation.collectedCoins]);
  const strategy=(detours:'backtrack'|'pause'|null,assist=false)=>{const subject=assist?explorerAssist(level):level,run=playRoute(subject,criticalPlatforms(graph),detours?{detours:level.checkpoints.map(c=>({platformId:c.platformId,kind:detours,seconds:detours==='pause'?2.3:1.5}))}:{});return{status:run.simulation.state.status,damage:run.damage,seconds:Math.round(run.simulation.state.elapsedSeconds*10)/10};};
  return{
   code:entry.code,levelId:level.id,title:level.title,batch:entry.batch,tier:level.difficultyTier,tierName:tierName(level.difficultyTier!),measuredTier:difficulty.measuredTier,score:Math.round(difficulty.score*100)/100,
   hardestGapPercent:Math.round(Math.max(...difficulty.jumps.map(j=>j.gapPercent))),hardestStepPercent:Math.round(Math.max(...difficulty.jumps.map(j=>j.stepPercent))),mechanics:difficulty.mechanics,
   archetype:level.design!.archetype,signature:level.design!.signatureMechanic,designMechanics:level.design!.mechanics,
   platforms:level.platforms.length,criticalPath:criticalPlatforms(graph),optionalPlatforms:level.platforms.filter(p=>p.route==='upper').map(p=>p.id),
   validator:{passed:report.checks.filter(c=>c.ok).length,total:report.checks.length,failed:report.checks.filter(c=>!c.ok).map(c=>`${c.name}: ${c.detail}`),botSeconds:report.completionSeconds,targetSeconds:level.design!.targetDurationSeconds},
   collectibles:{coins:`${coins.size}/${level.coins.length}`,stars:`${bonus.simulation.state.stars}/3`,damage:main.damage+bonus.damage},
   strategies:{forward:strategy(null),assist:strategy(null,true),backtrack:strategy('backtrack'),pause:strategy('pause')},
  };
 });
 const levels=[...rows.map(r=>levelDefinitionFor(r.code)),...['JPN','EGY','NOR'].map(code=>levelDefinitionFor(code))];
 const southAmericanIds=new Set(rows.map(r=>r.levelId));
 const similarity=similarityMatrix(levels).filter(p=>southAmericanIds.has(p.a)||southAmericanIds.has(p.b)).map(p=>({a:p.a,b:p.b,score:Math.round(p.score*100)/100,review:p.review}));
 refreshDesignManifest();
 writeFileSync('documentation/world-explorer/review/south-america/validation-report.json',JSON.stringify({generatedAt:new Date().toISOString(),levels:rows,similarity:{flagged:similarity.filter(p=>p.review),highest:similarity.slice(0,10),pairs:similarity.length}},null,1));
},900000);
