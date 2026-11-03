// Builds the single acceptance checklist for every built World Explorer
// adventure from recorded evidence:
//   node scripts/world-explorer/acceptance-report.mjs [--dir documentation/world-explorer/review/acceptance-all]
// Reads, under <dir>:
//   gameplay/adventure-acceptance.json   routes, collectibles, checkpoints, hazard recovery (bot, Node)
//   browser/playthrough-results.json     replays, keyboard, emulated touch, saved progress (headless Edge)
//   layout/layout-check.json             five viewports
//   destination/destination-check.json   card, run screen and guide consistency
//   performance/capture-results.json     frame rate and load, desktop and phone viewport
//   shader/after-cold.json               shader links after the level is ready (cold start)
//   human-results.json                   human desktop, physical phone, live account save, sign-offs
//   findings.json                        open art tasks and fairness/readability findings
// and the Asia regions' own trackers (asia-tracker.csv, *-art-pass.csv) for their art tasks.
// A check with no evidence is written as "not run"; a human check without a
// recorded result is "not performed". Nothing is ever filled in as passed.
// Writes <dir>/ACCEPTANCE.md and <dir>/acceptance.json.
import {existsSync,readFileSync,readdirSync,statSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,value,i,all)=>value.startsWith('--')?[...pairs,[value.slice(2),all[i+1]]]:pairs,[]));
const dir=args.dir||'documentation/world-explorer/review/acceptance-all';
const read=p=>{const f=join(dir,p);return existsSync(f)?JSON.parse(readFileSync(f,'utf8')):null;};
const gameplay=read('gameplay/adventure-acceptance.json')?.report||{},browser=read('browser/playthrough-results.json'),layout=read('layout/layout-check.json')?.levels||{};
const destination=read('destination/destination-check.json')?.levels||{},performance=read('performance/capture-results.json'),shader=read('shader/after-cold.json')?.levels||{};
const human=read('human-results.json')||{},findings=read('findings.json')||{};
// The review snapshot every result in this folder came from (SNAPSHOT.txt), when there is one.
const snapshot=existsSync(join(dir,'SNAPSHOT.txt'))?readFileSync(join(dir,'SNAPSHOT.txt'),'utf8').match(/git tree: (\w+)/)?.[1]||null:null;
// Where each check's evidence lives: the file and the entry for the country, plus its screenshots.
const evidenceFor=(code,b,l,d,perf)=>{const c=code.toLowerCase(),has=p=>existsSync(join(dir,p))?p:null;return{
 destination:d?[`destination/destination-check.json#levels.${code}`,has(`destination/shots/guide-${c}.jpg`)].filter(Boolean):[],
 gameplay:gameplay[code]?[`gameplay/adventure-acceptance.json#report.${code}`,...['complete-main','complete-bonus','hazard'].map(k=>has(`gameplay/${c}-${k}.json`))].filter(Boolean):[],
 browser:b?[`browser/playthrough-results.json#countries.${code}`,...['complete-main-result','complete-bonus-result','hazard-after-respawn','keyboard','touch-viewport','card-after-reload'].map(k=>has(`browser/screens/${c}-${k}.jpg`))].filter(Boolean):[],
 layout:l?[`layout/layout-check.json#levels.${code}`,...Object.keys(l).flatMap(v=>[has(`layout/shots/${c}-${v}.jpg`),has(`layout/shots/${c}-${v}-guide.jpg`),has(`layout/shots/${c}-${v}-pause.jpg`)])].filter(Boolean):[],
 performance:perf?[`performance/capture-results.json#${code}`,...['a-start','d-overview','phone'].map(k=>has(`performance/${c}-${k}.jpg`))].filter(Boolean):[],
 coldStart:shader[code]?[`shader/after-cold.json#levels.${code}`]:[]};};
const regions=JSON.parse(readFileSync(join(dir,'regions.json'),'utf8'));
// Asia trackers: newest asia-tracker.csv wins; every *-art-pass.csv adds tasks.
const csv=text=>{const rows=[];for(const line of text.split(/\r?\n/).filter(Boolean)){const cells=[];let cur='',q=false;for(const ch of line){if(ch==='"'){q=!q;continue;}if(ch===','&&!q){cells.push(cur);cur='';continue;}cur+=ch;}cells.push(cur);rows.push(cells);}const [head,...body]=rows;return body.map(r=>Object.fromEntries(head.map((h,i)=>[h,r[i]])));};
const asiaRoot='documentation/world-explorer/review/asia',asiaTrackers=existsSync(asiaRoot)?readdirSync(asiaRoot).map(d=>join(asiaRoot,d,'asia-tracker.csv')).filter(existsSync).sort((a,b)=>statSync(b).mtimeMs-statSync(a).mtimeMs):[];
const asia=asiaTrackers[0]?Object.fromEntries(csv(readFileSync(asiaTrackers[0],'utf8')).map(r=>[r.code,r])):{};
const artPasses=existsSync(asiaRoot)?[...new Set(readdirSync(asiaRoot).flatMap(d=>{const p=join(asiaRoot,d);return statSync(p).isDirectory()?readdirSync(p).filter(f=>/art-pass\.csv$/.test(f)).map(f=>join(p,f)):[];}))]:[];
const artTasks={};for(const file of artPasses)for(const r of csv(readFileSync(file,'utf8')))if(r.status!=='DONE')for(const code of (r.countries||'').split(/;\s*/))(artTasks[code]=artTasks[code]||new Set()).add(`${r.id} ${r.focus} (${r.status})`);

const cell=v=>v==null?'not run':v.result==='pass'?'pass':v.result==='n/a'?'n/a':v.result==='not-run'?'not run':`**fail**: ${String(v.detail||'').replace(/\|/g,'/').slice(0,90)}`;
const all=Object.values(regions).flat();
const out={generatedAt:new Date().toISOString(),sources:{asiaTracker:asiaTrackers[0]||null,artPasses},countries:{}};
for(const code of all){
 const g=gameplay[code]?.checks,b=browser?.countries?.[code],card=browser?.cards?.[code],l=layout[code],d=destination[code]?.checks,perf=performance?.results?.find(r=>r.code===code),sh=shader[code];
 const layoutCell=l?(()=>{const fails=Object.entries(l).flatMap(([v,x])=>Object.entries(x.checks).filter(([,c])=>c.result==='fail'||c.result==='not-run').map(([k,c])=>`${v} ${k}${c.result==='not-run'?' not run':''}`));return fails.length?{result:'fail',detail:fails.join('; ')}:{result:'pass'};})():null;
 const destCell=d?(()=>{const fails=Object.entries(d).filter(([,c])=>c.result!=='pass'&&c.result!=='n/a').map(([k,c])=>`${k}: ${c.detail}`);return fails.length?{result:'fail',detail:fails.join('; ')}:{result:'pass'};})():null;
 // Both completions must replay; a hazard replay that was not run (fixture method) is named, never counted as passed.
 const replays=b?(()=>{const kinds=['complete-main','complete-bonus','hazard'],run=kinds.filter(k=>b[k]&&!b[k].notRun),fails=run.filter(k=>!b[k].ok),missing=kinds.filter(k=>!run.includes(k));if(fails.length)return{result:'fail',detail:fails.join(', ')+(missing.length?'; not run: '+missing.join(', '):'')};if(missing.some(k=>k!=='hazard'))return{result:'fail',detail:'not run: '+missing.join(', ')};return{result:'pass',detail:missing.length?'completions replayed; hazard replay not run (fixture method)':''};})():null;
 const perfCell=perf?(()=>{const dsk=perf.desktop,ph=perf.phone;if(!dsk?.averageFps||!ph?.averageFps)return{result:'fail',detail:dsk?.error||ph?.error||'no frame data'};const ok=dsk.averageFps>=55&&ph.averageFps>=55;return{result:ok?'pass':'fail',detail:`desktop ${dsk.averageFps}/${dsk.onePercentLowFps} · phone view ${ph.averageFps}/${ph.onePercentLowFps} FPS · ${Math.round(dsk.triangles/1000)}k tris`};})():null;
 const coldCell=sh?{result:sh.programsLinkedAfterReady===0?'pass':'fail',detail:`${sh.programsLinkedAfterReady} shader links after ready; worst frame ${Math.round(sh.worstFrameAfterReadyMs)} ms`}:null;
 const h=human[code]||{};const hv=k=>h[k]?`${h[k].result} (${h[k].by||'?'}, ${h[k].date||'?'}${h[k].device?', '+h[k].device:''})`:'not performed';
 const notes=[...(findings[code]||[]),...(asia[code]?.artReviewTasks?[`Asia tracker art: ${asia[code].artReviewTasks}`]:[]),...[...(artTasks[code]||[])].map(t=>`Art pass ${t}`)];
 out.countries[code]={region:Object.entries(regions).find(([,v])=>v.includes(code))[0],automated:{destination:destCell,routes:g?.routes??null,collectibles:g?.collectibles??null,checkpoints:g?.checkpoints??null,hazardRecovery:g?.hazardRecovery??null,replays,keyboard:b?.keyboard?{result:b.keyboard.ok?'pass':'fail',detail:''}:null,touchEmulated:b?.touch?{result:b.touch.ok?'pass':'fail',detail:''}:null,layout:layoutCell,savedProgressLocal:card?{result:card.ok?'pass':'fail',detail:''}:null,performance:perfCell,coldStart:coldCell},
  human:{sourceReview:hv('sourceReview'),desktopPlay:hv('desktopPlay'),physicalPhone:hv('physicalPhone'),liveAccountSave:hv('liveAccountSave'),visualSignOff:hv('visualSignOff'),countryJudgements:hv('countryJudgements')},findings:notes,evidence:evidenceFor(code,b,l,d,perf),snapshot,status:'TESTING'};
}
writeFileSync(join(dir,'acceptance.json'),JSON.stringify(out,null,1));
const A=['destination','routes','collectibles','checkpoints','hazardRecovery','replays','keyboard','touchEmulated','layout','savedProgressLocal','performance','coldStart'];
const count=(k,r)=>Object.values(out.countries).filter(c=>(c.automated[k]?.result??'not run')===r).length;
out.snapshot=snapshot;
let md=`# World Explorer acceptance checklist — every built adventure\n\nGenerated ${out.generatedAt} by \`scripts/world-explorer/acceptance-report.mjs\` from recorded evidence in this folder${snapshot?`, all taken from review snapshot \`${snapshot}\` (SNAPSHOT.txt)`:''}. **Every adventure stays at TESTING.** Automated results are machine evidence only; the human columns are filled only from \`human-results.json\` and read "not performed" until a person records a result.\n\n`;
md+=`## Summary of automated checks (${all.length} adventures)\n\n| Check | Pass | Fail | Not run |\n| --- | ---: | ---: | ---: |\n`+A.map(k=>`| ${k} | ${count(k,'pass')} | ${count(k,'fail')} | ${all.length-count(k,'pass')-count(k,'fail')-count(k,'n/a')} |`).join('\n')+'\n\n';
md+=`Human checks recorded: ${Object.keys(human).length} of ${all.length} adventures.\n\n`;
// Destination failures counted once per country, then by failing check and by region, so the totals reconcile.
const destFails=Object.entries(out.countries).filter(([,c])=>c.automated.destination?.result==='fail');
const byCheck={};for(const [code] of destFails)for(const [k,c] of Object.entries(destination[code].checks))if(c.result==='fail')(byCheck[k]=byCheck[k]||[]).push(code);
const byRegion={};for(const [code,c] of destFails)(byRegion[c.region]=byRegion[c.region]||[]).push(code);
md+=`## Destination failures reconciled\n\n${destFails.length} of ${all.length} adventures fail the destination check. Each is counted once below by region; the by-check counts can add up to more when one country fails two checks.\n\n| Failing check | Countries | Codes |\n| --- | ---: | --- |\n`+Object.entries(byCheck).map(([k,v])=>`| ${k} | ${v.length} | ${v.join(', ')} |`).join('\n')+`\n\n| Region | Countries | Codes |\n| --- | ---: | --- |\n`+Object.entries(byRegion).map(([k,v])=>`| ${k} | ${v.length} | ${v.join(', ')} |`).join('\n')+`\n| **Total** | **${destFails.length}** | |\n\n`;
for(const [region,codes] of Object.entries(regions)){
 md+=`## ${region}\n\n### Automated\n\n| Code | Destination | Routes | Collectibles | Checkpoints | Hazard recovery | Replays | Keyboard | Touch (emulated) | Layout (5 viewports) | Saved progress (local) | Performance | Cold start |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n`;
 // A passed hazard check names its method; a passed replay set names a hazard replay that was not run.
 const shown=(k,v)=>v?.result!=='pass'?cell(v):k==='hazardRecovery'?`pass (${/^fixture/.test(v.detail)?'fixture':'natural'})`:k==='replays'&&v.detail?'pass (completions; hazard replay not run)':'pass';
 for(const code of codes){const c=out.countries[code];md+=`| ${code} | ${A.map(k=>shown(k,c.automated[k])).join(' | ')} |\n`;}
 md+=`\n### Human\n\n| Code | Source review | Desktop play | Physical phone | Live account save | Visual sign-off | Country-specific judgements | Status |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n`;
 for(const code of codes){const c=out.countries[code];md+=`| ${code} | ${Object.values(c.human).join(' | ')} | TESTING |\n`;}
 const open=codes.filter(code=>out.countries[code].findings.length);
 if(open.length){md+=`\n### Open findings and art tasks\n\n`+open.map(code=>`- **${code}:** ${out.countries[code].findings.join('; ')}`).join('\n')+'\n';}
 md+='\n';
}
writeFileSync(join(dir,'ACCEPTANCE.md'),md);console.log('wrote',join(dir,'ACCEPTANCE.md'),Object.keys(out.countries).length,'adventures');
// The tracker: one row per country, every automated result with its detail, every human result, and the evidence files.
const q=v=>`"${String(v??'').replace(/"/g,'""')}"`,H=['sourceReview','desktopPlay','physicalPhone','liveAccountSave','visualSignOff','countryJudgements'];
const rows=[['code','region','status','snapshot',...A.flatMap(k=>[k,k+'Detail']),...H,'findings','evidence'].join(',')];
for(const [code,c] of Object.entries(out.countries))rows.push([code,c.region,c.status,snapshot||'',...A.flatMap(k=>[c.automated[k]?.result??'not run',c.automated[k]?.detail??'']),...H.map(k=>c.human[k]),c.findings.join(' | '),Object.values(c.evidence).flat().join(' ')].map(q).join(','));
writeFileSync(join(dir,'tracker.csv'),rows.join('\n')+'\n');console.log('wrote',join(dir,'tracker.csv'));
