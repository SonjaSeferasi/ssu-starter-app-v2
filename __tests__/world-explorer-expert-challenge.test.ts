import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {authoredDifficulty,hasExpertChallenge,levelDefinitionFor} from '../lib/world-explorer/level-manifest';

// Issue #1238 (SRS-628.6): the country card offered "Expert challenge" for
// every destination, but for many countries the expert level is identical to
// the normal one, so switching it on silently changed nothing.
const explorer=readFileSync('components/world-explorer/world-explorer.tsx','utf8');
const same=(code:string)=>JSON.stringify(levelDefinitionFor(code,authoredDifficulty(code)!))===JSON.stringify(levelDefinitionFor(code,4));

describe('Issue #1238: Expert challenge is only offered where it changes the level',()=>{
 it('reports no expert challenge for the countries named in the bug report',()=>{
  for(const code of ['IND','CHN','NOR','URY']){
   expect(same(code),code).toBe(true);
   expect(hasExpertChallenge(code,authoredDifficulty(code)!),code).toBe(false);
  }
 });
 it('reports an expert challenge where the expert level really differs',()=>{
  expect(same('JPN')).toBe(false);
  expect(hasExpertChallenge('JPN',authoredDifficulty('JPN')!)).toBe(true);
 });
 it('never offers an expert challenge on top of a route that is already expert',()=>{
  expect(hasExpertChallenge('JPN',4)).toBe(false);
 });
 it('treats an unknown destination as having no expert challenge instead of failing',()=>{
  expect(hasExpertChallenge('ZZZ',1)).toBe(false);
 });
 it('disables the option, explains why, and does not launch an identical "expert" run',()=>{
  expect(explorer).toContain('disabled={!expertAvailable}');
  expect(explorer).toContain('This destination has one calibrated route, so no tougher version is offered.');
  expect(explorer).not.toMatch(/difficulty=\{challenge\?4:/);
  expect(explorer).not.toContain('const difficulty=challenge?4:');
 });
});
