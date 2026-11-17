import {createElement} from 'react';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import type {ReactNode} from 'react';
const {renderToStaticMarkup}=createRequire(import.meta.url)('react-dom/server') as {renderToStaticMarkup(node:ReactNode):string};
import {describe,it,expect} from 'vitest';
import {LevelCompleteBanner,celebrationMs,confettiPieces} from '../components/world-explorer/level-complete';

// SRS-631.5: the finish celebration.
describe('level complete celebration',()=>{
 it('announces "Level Complete!" as a status and hides the decoration from screen readers',()=>{
  const html=renderToStaticMarkup(createElement(LevelCompleteBanner));
  expect(html).toContain('role="status"');expect(html).toContain('Level Complete!');
  expect(html.match(/<i /g)).toHaveLength(confettiPieces.length);expect(confettiPieces.length).toBeGreaterThanOrEqual(30);
  expect(html.match(/aria-hidden="true"/g)!.length).toBeGreaterThanOrEqual(2);
 });
 it('spreads the confetti across the whole width in several colours, the same way every time',()=>{
  const lefts=confettiPieces.map(piece=>piece.left);expect(Math.min(...lefts)).toBeLessThan(10);expect(Math.max(...lefts)).toBeGreaterThan(90);
  expect(new Set(confettiPieces.map(piece=>piece.color)).size).toBeGreaterThanOrEqual(5);
  for(const piece of confettiPieces){expect(piece.delay).toBeGreaterThanOrEqual(0);expect(piece.delay).toBeLessThan(.6);}
 });
 it('is short, and the run page skips it for reduced motion and shows the results afterwards',()=>{
  expect(celebrationMs).toBeGreaterThanOrEqual(1200);expect(celebrationMs).toBeLessThanOrEqual(2500);
  const page=readFileSync('components/world-explorer/country-run.tsx','utf8');
  expect(page).toContain('if(!calm.current){setCelebrating(true);');expect(page).toContain("status==='complete'&&celebrating&&!leaving&&<LevelCompleteBanner/>");
  expect(page).toContain('clearTimeout(celebration.current)');
 });
});
