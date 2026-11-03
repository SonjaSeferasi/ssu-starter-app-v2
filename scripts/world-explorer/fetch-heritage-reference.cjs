/* Optional maintainer refresh. The game uses its bundled snapshot and never
 * downloads the World Heritage catalogue at runtime. Run before build-profiles.
 * UNESCO Datahub whc001 metadata declares CC BY-SA 4.0; original descriptions
 * remain a local research input and are not copied into the shipped snapshot. */
const fs=require('node:fs/promises');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const endpoint='https://data.unesco.org/api/explore/v2.1/catalog/datasets/whc001/records';
async function main(){
 const records=[];
 for(let offset=0;;offset+=100){
  const url=new URL(endpoint);
  url.searchParams.set('select','name_en,iso_codes,id_no,category,short_description_en');
  url.searchParams.set('limit','100');url.searchParams.set('offset',String(offset));
  const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('UNESCO Datahub returned '+response.status+' at offset '+offset);
  const payload=await response.json();
  if(!Array.isArray(payload.results)||!Number.isFinite(payload.total_count))throw Error('Unexpected UNESCO Datahub schema');
  records.push(...payload.results);
  if(records.length>=payload.total_count)break;
  if(!payload.results.length)throw Error('UNESCO pagination ended before the advertised record count');
 }
 const output=path.join(root,'tmp/world-explorer-heritage-reference.json');
 await fs.mkdir(path.dirname(output),{recursive:true});
 await fs.writeFile(output,JSON.stringify(records,null,2)+'\n');
 process.stdout.write('Saved '+records.length+' research records to '+path.relative(root,output)+'. Review changed facts before rebuilding.\n');
}
main().catch(error=>{process.stderr.write(String(error)+'\n');process.exitCode=1;});
