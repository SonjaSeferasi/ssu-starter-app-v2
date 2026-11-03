import {it,expect} from 'vitest';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {countriesForContinent,countries} from '../lib/world-explorer/catalog';
import {isAuthoredLevel,levelDefinitionFor} from '../lib/world-explorer/level-manifest';
const batch=['FJI','PNG','SLB','VUT'],folder='tmp/oceania-batch-a';
it('audits the current catalogue and protects gameplay outside this four-country batch',()=>{
 mkdirSync(folder,{recursive:true});const list=countriesForContinent('oceania');expect(list).toHaveLength(14);
 const inventory=list.map(c=>({code:c.code,name:c.name,authored:isAuthoredLevel(c.code),environmentId:levelDefinitionFor(c.code).environmentId,title:levelDefinitionFor(c.code).title}));
 expect(inventory.filter(c=>!c.authored)).toEqual([]);
 writeFileSync(folder+'/inventory.json',JSON.stringify(inventory,null,2));
 const protectedLevels=Object.fromEntries(countries.filter(c=>!batch.includes(c.code)).map(c=>[c.code,levelDefinitionFor(c.code)])),path=folder+'/protected-gameplay.json';
 if(process.env.OCEANIA_BASELINE==='1')writeFileSync(path,JSON.stringify(protectedLevels));
 else{expect(existsSync(path)).toBe(true);expect(protectedLevels).toEqual(JSON.parse(readFileSync(path,'utf8')));}
});
