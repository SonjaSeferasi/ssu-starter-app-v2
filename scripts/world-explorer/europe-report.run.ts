// Refreshes a composed region's rows and the totals of DESIGN-MANIFEST.md from
// the live manifest (other rows are left as they are), and writes the region
// tracker (CSV and JSON) under documentation/world-explorer/review/<region>/.
//   npx vitest run --config scripts/world-explorer/europe-report.vitest.config.mjs
//   REPORT_REGION=oceania npx vitest run --config scripts/world-explorer/europe-report.vitest.config.mjs
import {it} from 'vitest';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {europeCodes,europePlaces} from '../../lib/world-explorer/europe';
import {oceaniaCodes,oceaniaPlaces} from '../../lib/world-explorer/oceania';
import {designRecord,productionSummary} from '../../lib/world-explorer/design-manifest';
import {tierName,analyzeDifficulty} from '../../lib/world-explorer/difficulty';
import {levelDefinitionFor,authoredDifficulty} from '../../lib/world-explorer/level-manifest';
import {fingerprint,compareLevels} from '../../lib/world-explorer/level-similarity';

type Place={iso2:string;title:string;landmark:string;source:string;tier:number;archetype:string;signature:string;interpretation?:string};
const regions:Record<string,{codes:string[];places:Record<string,Place>}>={europe:{codes:europeCodes,places:europePlaces},oceania:{codes:oceaniaCodes,places:oceaniaPlaces}};
const region=process.env.REPORT_REGION||'europe',{codes,places}=regions[region];

it(`refreshes the ${region} tracker rows`,()=>{
 const path='documentation/world-explorer/DESIGN-MANIFEST.md',summary=productionSummary();let text=readFileSync(path,'utf8');
 const totals=`**Totals:** ${summary.total} countries · status ${Object.entries(summary.status).map(([k,v])=>`${k} ${v}`).join(', ')} · tiers ${Object.entries(summary.tiers).map(([k,v])=>`T${k} ${v}`).join(', ')} · reviewed ${summary.reviewed} · blocked by unimplemented mechanics ${summary.blockedByMechanics}.`;
 text=text.replace(/\*\*Totals:\*\*[^\n]*/,totals);
 for(const code of codes){const record=designRecord(code)!,row=new RegExp(`(\\| \\d+ \\| [^|]+\\(${code}\\) \\| )[^\\n]*`);text=text.replace(row,`$1${record.status} | ${record.difficultyTier} · ${tierName(record.difficultyTier)} | ${record.archetype} | ${record.signatureMechanic} | ${record.landmark} |`);}
 writeFileSync(path,text);
 // Structural similarity inside the batch: pairs at or above 0.72 are flagged for review.
 const prints=codes.map(code=>fingerprint(levelDefinitionFor(code))),pairs:ReturnType<typeof compareLevels>[]=[];
 for(let i=0;i<prints.length;i++)for(let j=i+1;j<prints.length;j++)pairs.push(compareLevels(prints[i],prints[j]));
 pairs.sort((a,b)=>b.score-a.score);
 const rows=codes.map(code=>{const place=places[code],level=levelDefinitionFor(code,authoredDifficulty(code)),measured=analyzeDifficulty(level).measuredTier,nearest=pairs.filter(p=>p.a.startsWith(place.iso2.toLowerCase()+'-')||p.b.startsWith(place.iso2.toLowerCase()+'-'))[0];
  return{code,name:designRecord(code)!.name,title:place.title,setting:place.landmark,source:place.source,tier:place.tier,measuredTier:measured,archetype:place.archetype,signatureMechanic:place.signature,mechanicInterpretation:place.interpretation||'',status:'TESTING',art:'first stylized pass — awaiting visual review',humanReview:'not performed',physicalPhone:'not performed',liveAccountSave:'not performed',nearestSimilarity:nearest?`${nearest.a===level.id?nearest.b:nearest.a} ${nearest.score.toFixed(2)}${nearest.review?' (flagged)':''}`:''};});
 mkdirSync(`documentation/world-explorer/review/${region}`,{recursive:true});
 writeFileSync(`documentation/world-explorer/review/${region}/${region}-tracker.json`,JSON.stringify({generatedAt:new Date().toISOString(),flaggedPairs:pairs.filter(p=>p.review).map(p=>({a:p.a,b:p.b,score:+p.score.toFixed(3)})),rows},null,1));
 const head=Object.keys(rows[0]);writeFileSync(`documentation/world-explorer/review/${region}/${region}-tracker.csv`,[head.join(','),...rows.map(r=>head.map(k=>`"${String((r as Record<string,unknown>)[k]).replace(/"/g,'""')}"`).join(','))].join('\n')+'\n');
 console.log('flagged pairs',pairs.filter(p=>p.review).length,'highest',pairs.slice(0,3).map(p=>`${p.a}~${p.b} ${p.score.toFixed(2)}`).join(' | '));
});
