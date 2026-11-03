// Merges evidence files written by separate runs (a rerun, a second region)
// into the one file acceptance-report.mjs reads. Later files win per country;
// each source is listed in the merged file's `mergedFrom`.
//   node scripts/world-explorer/merge-evidence.mjs <into.json> <from.json> [<from.json> …]
// Works for destination-check.json and layout-check.json ({levels:{CODE:…}})
// and playthrough-results.json ({countries:{CODE:…}, cards:{CODE:…}}).
import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

const [into,...from]=process.argv.slice(2);
if(!into||!from.length){console.error('usage: merge-evidence.mjs <into.json> <from.json> …');process.exit(1);}
const merged=existsSync(into)?JSON.parse(readFileSync(into,'utf8')):{};
merged.mergedFrom=[...(merged.mergedFrom||[])];
for(const file of from){
 const part=JSON.parse(readFileSync(file,'utf8'));
 for(const key of ['levels','countries','cards'])if(part[key])merged[key]={...(merged[key]||{}),...part[key]};
 for(const key of Object.keys(part))if(!['levels','countries','cards'].includes(key)&&merged[key]===undefined)merged[key]=part[key];
 merged.mergedFrom.push({file,at:part.checkedAt||part.startedAt||part.finishedAt||null,codes:Object.keys(part.levels||part.countries||{})});
}
mkdirSync(dirname(into),{recursive:true});writeFileSync(into,JSON.stringify(merged,null,1));
console.log('merged',from.length,'files into',into,Object.keys(merged.levels||merged.countries||{}).length,'countries');
