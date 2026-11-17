import {createElement} from 'react';
import {createRequire} from 'node:module';
import type {ReactNode} from 'react';
const {renderToStaticMarkup}=createRequire(import.meta.url)('react-dom/server') as {renderToStaticMarkup(node:ReactNode):string};
import {describe,expect,it,vi} from 'vitest';

vi.mock('next/link',()=>({default:({href,children,...rest}:{href:string;children:ReactNode})=>createElement('a',{href,...rest},children)}));
vi.mock('../components/navigation/social-shell',()=>({useNavigationSession:()=>'signed-in'}));
import {GameRoomContent} from '../components/game-room/game-room';

// SRS-629.1 and SRS-629.2: the Game Room dashboard, rendered with the design
// sample data the /dev/game-room route uses.
describe('SRS-629.1: Game Room dashboard',()=>{
 const html=renderToStaticMarkup(createElement(GameRoomContent,{preview:true}));
 const text=html.replace(/<[^>]+>/g,' ');
 it('opens with the welcome banner',()=>{
  expect(html).toMatch(/<h1[^>]*>Game Room<\/h1>/);
  expect(text).toContain('Your next little adventure starts here.');
 });
 it('shows the avatar area, the games area and the streak area in that order',()=>{
  const avatar=html.indexOf('id="avatar-title"'),games=html.indexOf('id="games-title"'),streak=html.indexOf('id="participation-title"');
  expect(avatar).toBeGreaterThan(-1);expect(games).toBeGreaterThan(avatar);expect(streak).toBeGreaterThan(games);
 });
 it('lists exactly the three games, each with one action',()=>{
  const order=['DormSpace 3D','Jumpyland','World Explorer'].map(name=>html.indexOf(`>${name}</h3>`));
  expect(order.every(position=>position>-1)).toBe(true);expect([...order].sort((a,b)=>a-b)).toEqual(order);
  expect(html.match(/<article/g)).toHaveLength(3);
  for(const [action,href] of [['Enter DormSpace','/game-room/dormspace'],['Play Jumpyland','/game-1'],['Explore the World','/world-explorer']])expect(html).toContain(`href="${href}"`),expect(text).toContain(action);
 });
 it('keeps the five avatar categories and the save and discard controls',()=>{
  for(const tab of ['Hair','Face','Skin','Body','Outfit'])expect(text).toContain(tab);
  expect(text).toContain('Save Look');expect(text).toContain('Discard changes');
 });
 it('shows nothing SocialU does not have',()=>{
  expect(text).not.toMatch(/Wordle|Quiz Clash|Study Sprint|Puzzle Quest|\bXP\b|Lv\.|Weekly Leaderboard|Friends Online/);
 });
});
