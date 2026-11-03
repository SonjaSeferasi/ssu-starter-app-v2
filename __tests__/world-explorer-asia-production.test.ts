import {describe,it,expect} from 'vitest';
import {asiaRegions,asiaProductionManifest,asiaRegionFor} from '../lib/world-explorer/asia-production';
import {countriesForContinent} from '../lib/world-explorer/catalog';
import {cardStatus} from '../lib/world-explorer/design-manifest';
import {levelDefinitionFor} from '../lib/world-explorer/level-manifest';
import evidence from '../public/world-explorer/data/east-asia-evidence.json';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

describe('Asia regional production and release boundaries',()=>{
 it('covers exactly the requested47 countries once, with five accurate batch sizes',()=>{
  const records=asiaProductionManifest();expect(records).toHaveLength(47);expect(asiaRegions.map(r=>r.codes.length)).toEqual([5,11,9,5,17]);
  expect(new Set(records.map(r=>r.code)).size).toBe(47);
  expect(records.map(r=>r.code).sort()).toEqual(countriesForContinent('asia').map(c=>c.code).sort());
  expect(asiaRegionFor('TUR')?.id).toBe('west');expect(asiaRegionFor('RUS')).toBeUndefined();
 });
 it('keeps automation evidence separate from human visual and release approval',()=>{
  const records=asiaProductionManifest();expect(records.filter(r=>r.stages.tested)).toHaveLength(47);
  for(const record of records){expect(record.stages.released).toBe(false);expect(record.stages.visuallyCompleted).toBe(false);expect(record.humanReview).toBe('pending');}
  expect(records.every(r=>r.stages.implemented&&r.productionState==='TESTING')).toBe(true);
 });
 it('offers implemented countries freely and ties recorded play evidence to exact authored files',()=>{
  for(const row of evidence.records){
   expect(cardStatus(row.code,new Set())).toBe('playable');const level=levelDefinitionFor(row.code);
   const bytes=readFileSync(`public/world-explorer/levels/${level.countryId.toLowerCase()}-level-01.json`,'utf8').replace(/\r\n/g,'\n');
   expect(createHash('sha256').update(bytes).digest('hex')).toBe(row.sourceSha256);
   expect(row.runs).toHaveLength(8);expect(row.edgeChecks).toBeGreaterThan(20);expect(row.released).toBe(false);
  }
  expect(evidence.similarity.filter(p=>p.review)).toEqual([]);
 });
});
