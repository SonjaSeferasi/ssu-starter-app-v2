// Collects source evidence for each country's manifest landmark, for writing
// and checking the place facts of a regional batch:
//   node scripts/world-explorer/fetch-site-sources.mjs --continent africa --out documentation/world-explorer/review/africa/site-sources.json
// For every country of the continent that the design manifest lists as
// planned, it searches English Wikipedia for the manifest landmark and records
// the article title, its introduction and the UNESCO reference number from
// the infobox (when there is one). The UNESCO listing
// (https://whc.unesco.org/en/list/<id>/) is the source cited in the game; the
// Wikipedia text is a readable cross-check, because the UNESCO site refuses
// automated requests. A landmark with no article or no reference number is
// recorded as such, never filled in.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,value,i,all)=>value.startsWith('--')?[...pairs,[value.slice(2),all[i+1]]]:pairs,[]));
const continent=args.continent||'africa',out=args.out||`documentation/world-explorer/review/${continent}/site-sources.json`;
const countries=JSON.parse(readFileSync('public/world-explorer/data/countries.json','utf8')).filter(c=>c.continent===continent);
const manifest=readFileSync('documentation/world-explorer/DESIGN-MANIFEST.md','utf8').split('\n');
const only=args.codes?new Set(args.codes.split(',')):null;
const titles=args.titles?JSON.parse(readFileSync(args.titles,'utf8')):{};
const api=async params=>{const url='https://en.wikipedia.org/w/api.php?'+new URLSearchParams({format:'json',redirects:'1',...params});await new Promise(r=>setTimeout(r,1200));for(let attempt=0;attempt<4;attempt++){const response=await fetch(url,{headers:{'User-Agent':'SocialU-WorldExplorer-review/1.0 (education project)'}});if(response.ok)return response.json();await new Promise(r=>setTimeout(r,4000*(attempt+1)));}throw new Error('Wikipedia request failed');};
const records={};
for(const country of countries){
 if(only&&!only.has(country.code))continue;
 const row=manifest.find(r=>r.includes(`(${country.code})`))?.split('|').map(s=>s.trim());
 if(!row||!/planned/.test(row[3]||''))continue;
 const landmark=row[7];
 try{
  const title=titles[country.code]||(await api({action:'query',list:'search',srsearch:landmark,srlimit:'1'})).query.search[0]?.title;
  if(!title){records[country.code]={landmark,found:false};continue;}
  const page=Object.values((await api({action:'query',prop:'extracts|revisions',exintro:'1',explaintext:'1',rvprop:'content',rvslots:'main',titles:title})).query.pages)[0];
  const wikitext=page.revisions?.[0]?.slots?.main?.['*']||'';
  // The World Heritage designation in the infobox: number (plain or as a link), official name and year.
  const field=name=>(wikitext.match(new RegExp(`\\|\\s*${name}\\s*=\\s*([^\\n]*)`))||[])[1]?.trim()||'';
  // The World Heritage entry may be any designation slot (a Ramsar site can come first); older infoboxes use ID, WHS and Year.
  const slot=[1,2,3,4].find(n=>/^WHS/.test(field(`designation${n}`))),whs=name=>slot?field(`designation${slot}_${name}`):'';
  const number=whs('number')||field('whs_id')||field('ID');
  const id=(number.match(/list\/(\d+)/)||number.match(/^\[?\s*(\d+[a-z]*)/)||[])[1]||null;
  const officialName=(whs('offname')||field('WHS')).replace(/^}+$/,'').replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g,'$1')||null,inscribed=((whs('date')||field('Year')||field('year')).match(/\d{4}/)||[])[0]||null;
  records[country.code]={name:country.name,landmark,article:page.title,officialName,inscribed,wikipedia:`https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g,'_'))}`,unescoId:id,unesco:id?`https://whc.unesco.org/en/list/${id.replace(/[a-z]+$/,'')}/`:null,extract:page.extract||''};
  console.log(country.code,page.title,id||'(no UNESCO id)');
 }catch(error){records[country.code]={landmark,error:String(error.message||error)};console.log(country.code,'error',error.message);}
}
mkdirSync(dirname(out),{recursive:true});
const previous=(()=>{try{return JSON.parse(readFileSync(out,'utf8')).records;}catch{return{};}})();
writeFileSync(out,JSON.stringify({fetchedAt:new Date().toISOString(),method:'English Wikipedia API (search, intro extract, infobox UNESCO id); UNESCO listing cited as the source',records:{...previous,...Object.fromEntries(Object.entries(records).filter(([code,r])=>!r.error||!previous[code]||previous[code].error))}},null,1));
console.log('wrote',out,Object.keys(records).length);
