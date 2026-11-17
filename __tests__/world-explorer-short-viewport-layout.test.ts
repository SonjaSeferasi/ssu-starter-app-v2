import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

// Issue #1234 (SRS-628.1): at a 1209 x 672 laptop window the continent deck
// covered "Start in Japan" and the country panel pushed "Play level" below the
// window. These rules keep both launch controls reachable; the measured browser
// geometry is recorded on the issue.
const css=readFileSync('components/world-explorer/world-explorer.module.css','utf8');
const fix=css.slice(css.indexOf('/* Issue #1234'));

describe('Issue #1234: launch controls stay reachable on a short laptop window',()=>{
 it('compacts the intro on short, non-phone windows so the start button clears the continent deck',()=>{
  expect(fix).toMatch(/@media\(min-width:701px\) and \(max-height:820px\)\{\.intro\{top:100px\}/);
  expect(fix).toContain('.intro h1{font-size:clamp(34px,3.6vw,44px)');
  expect(fix).toContain('.intro .playButton{margin-top:14px}');
 });
 it('lets the country details shrink inside the panel instead of overflowing it',()=>{
  expect(fix).toContain('.journeyPanel .countryDetail{flex-shrink:1;min-height:150px}');
 });
 it('keeps the Play level button pinned inside the visible details area',()=>{
  expect(fix).toContain('.countryDetail>.playButton{position:sticky;bottom:0');
 });
 it('is the last word on these rules, after the earlier layout overrides',()=>{
  expect(css.lastIndexOf('.countryDetail{max-height:53dvh')).toBeLessThan(css.indexOf('/* Issue #1234'));
  expect(css.lastIndexOf('.intro{position:absolute;top:145px')).toBeLessThan(css.indexOf('/* Issue #1234'));
 });
});
