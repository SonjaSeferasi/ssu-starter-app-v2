import {createElement} from 'react';
import {createRequire} from 'node:module';
import type {ReactNode} from 'react';
const {renderToStaticMarkup}=createRequire(import.meta.url)('react-dom/server') as {renderToStaticMarkup(node:ReactNode):string};
import {describe,expect,it} from 'vitest';
import {WelcomeBanner} from '../components/game-room/welcome-banner';

// SRS-629.1: the Game Room opens with a welcome banner whose words are real text.
describe('SRS-629.1: Game Room welcome banner',()=>{
 const html=renderToStaticMarkup(createElement(WelcomeBanner));
 it('shows the heading and both lines of copy as text',()=>{
  expect(html).toMatch(/<h1[^>]*>Game Room<\/h1>/);
  expect(html).toContain('Your next little adventure starts here.');
  expect(html).toContain('Play, explore, make your space your own, and grow your daily streak.');
 });
 it('hides every decorative drawing from screen readers',()=>{
  const drawings=html.match(/<svg[^>]*>/g)!;
  expect(drawings.length).toBeGreaterThan(0);
  for(const svg of drawings)expect(svg).toContain('aria-hidden="true"');
 });
});
