import {createElement} from 'react';
import {createRequire} from 'node:module';
import type {ReactNode} from 'react';
const {renderToStaticMarkup}=createRequire(import.meta.url)('react-dom/server') as {renderToStaticMarkup(node:ReactNode):string};
import {describe,expect,it} from 'vitest';
import {availableGameCards,gameCards} from '../lib/game-room-cards';
import {GameCardView} from '../components/game-room/game-card';

// SRS-629.2: the Game Room presents exactly the three games SocialU offers.
describe('SRS-629.2: the three Game Room games',()=>{
 it('lists DormSpace 3D, Jumpyland and World Explorer with the agreed copy and destinations',()=>{
  expect(gameCards.map(card=>[card.name,card.action,card.href])).toEqual([
   ['DormSpace 3D','Enter DormSpace','/game-room/dormspace'],
   ['Jumpyland','Play Jumpyland','/game-1'],
   ['World Explorer','Explore the World','/world-explorer'],
  ]);
  expect(gameCards[0].description).toBe('Create your own campus corner. Decorate your room and explore DormSpace.');
  expect(gameCards[1].description).toBe('Jump into colorful worlds, collect coins, and take on the next challenge.');
  expect(gameCards[2].description).toBe('Travel through country adventures, discover landmarks, and fill your passport.');
 });
 it('never offers a game SocialU does not have',()=>{
  expect(JSON.stringify(gameCards)).not.toMatch(/Wordle|Quiz Clash|Study Sprint|Puzzle Quest/);
 });
 it('offers DormSpace and Jumpyland only when the account includes them',()=>{
  const names=(activities?:{code:string;included:boolean}[])=>availableGameCards(activities).map(card=>card.name);
  expect(names(undefined)).toEqual(['World Explorer']);
  expect(names([])).toEqual(['World Explorer']);
  expect(names([{code:'game1',included:true},{code:'dormspace',included:true},{code:'wordle',included:true}])).toEqual(['DormSpace 3D','Jumpyland','World Explorer']);
  expect(names([{code:'game1',included:false},{code:'dormspace',included:true}])).toEqual(['DormSpace 3D','World Explorer']);
 });
 it('renders a card with its image, heading, description and one action',()=>{
  const html=renderToStaticMarkup(createElement(GameCardView,{card:gameCards[1]}));
  expect(html).toContain('<h3');expect(html).toContain('Jumpyland');
  expect(html).toContain('href="/game-1"');expect(html).toContain('Play Jumpyland');
  expect(html).toContain('alt=""');
  expect(html.match(/<a /g)).toHaveLength(1);
 });
});
