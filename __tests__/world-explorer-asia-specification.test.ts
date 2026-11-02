import {describe,it,expect} from 'vitest';
import specification from '../public/world-explorer/data/asia-specification.json';
import {asiaProductionManifest,asiaProductionStates} from '../lib/world-explorer/asia-production';

describe('Asia specification and truthful production gates',()=>{
 it('preserves all 47 requested settings and target tiers without claiming new playable routes',()=>{
  const records=asiaProductionManifest();expect(records).toHaveLength(47);expect(specification.countries).toHaveLength(47);
  for(const row of records){const brief=specification.countries.find(r=>r.iso2===row.iso2)!;expect(row.setting).toBe(brief.location);expect(row.targetDifficultyTier).toBe(brief.targetTier);expect(row.visualEnvironment.length).toBeGreaterThan(45);expect(row.mainLayout).toBeTruthy();}
  expect(records.filter(r=>r.region!=='east').every(r=>r.productionState==='PROPOSED')).toBe(true);
  expect(records.map(r=>r.code)).not.toContain('ANTARCTICA');
 });
 it('matches the revised East Asia targets with tested routes while retaining human approval gates',()=>{
  const records=asiaProductionManifest(),east=records.filter(r=>r.region==='east');
  expect(east.map(r=>r.targetDifficultyTier)).toEqual([5,1,2,4,3]);
  expect(east.map(r=>r.implementedDifficultyTier)).toEqual([5,1,2,4,3]);
  expect(east.every(r=>r.difficultyCalibrated&&r.specificationGaps.length>0&&r.productionState==='TESTING')).toBe(true);
  expect(east.every(r=>r.screenshots.length===4)).toBe(true);
  for(const row of records){expect(row.stages.released).toBe(false);expect(row.stages.visuallyCompleted).toBe(false);expect(row.designApprovalStatus).toBe('pending');expect(row.humanPlaytest).toBe('not-run');expect(row.mobileDeviceTest).toBe('not-run');}
  expect(asiaProductionStates).toEqual(['PROPOSED','DESIGN APPROVED','BLOCKOUT','GAMEPLAY IMPLEMENTED','ART INTEGRATION','TESTING','RELEASED']);
 });
 it('uses the newly requested country settings rather than the superseded proposals',()=>{
  const rows=asiaProductionManifest(),setting=(code:string)=>rows.find(r=>r.code===code)!.setting;
  expect(setting('LAO')).toContain('Kuang Si');expect(setting('MYS')).toContain('Kinabalu');expect(setting('PAK')).toContain('Hunza');expect(setting('TKM')).toContain('Yangykala');expect(setting('IRQ')).toContain('marsh');expect(setting('YEM')).toContain('Socotra');
 });
});
