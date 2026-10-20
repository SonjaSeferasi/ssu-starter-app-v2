import {describe,it,expect} from 'vitest';
import {freshLife,loseHeart} from '../components/jumpyland/attempt-life';

describe('Finite Jumpyland attempts',()=>{
 it('ends after three damaging hits even when the player keeps a checkpoint',()=>{
  let life=freshLife();
  for(const [time,remaining] of [[0,2],[2000,1],[4000,0]]){const hit=loseHeart(life,time);life=hit.state;expect(life.hearts).toBe(remaining);expect(hit.gameOver).toBe(remaining===0);}
  expect(loseHeart(life,6000).state.hearts).toBe(0);
 });
 it('does not drain multiple hearts from one enemy contact or projectile burst',()=>{
  const first=loseHeart(freshLife(),100);
  expect(loseHeart(first.state,110).lost).toBe(false);
  expect(loseHeart(first.state,1899).state.hearts).toBe(2);
  expect(loseHeart(first.state,1900).state.hearts).toBe(1);
 });
 it('makes a new fall fatal to a heart even during enemy-hit protection',()=>{
  const hit=loseHeart(freshLife(),0);
  expect(loseHeart(hit.state,700,true).state.hearts).toBe(1);
 });
 it('starts a retry with fresh hearts without modifying the failed attempt',()=>{
  let life=freshLife();for(let i=0;i<3;i++)life=loseHeart(life,i*2000).state;
  expect(freshLife().hearts).toBe(3);expect(life.hearts).toBe(0);
 });
});
