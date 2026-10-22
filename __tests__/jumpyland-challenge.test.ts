import {describe,it,expect} from 'vitest';
import {PointerInputs,readInput,keyboardAction,type InputState} from '../components/jumpyland/controls';
import {freshGuard,raiseGuard,guardActive,GUARD_DURATION,GUARD_COOLDOWN,enemyTuning,projectileAim,enemyTracks,stepEnemy} from '../components/jumpyland/challenge';
import {courses} from '../components/jumpyland/levels';
const empty=():InputState=>({left:false,right:false,jump:false,power:false,down:false,defend:false});
describe('Combined Jumpyland controls',()=>{
 it('preserves quick taps that finish before the next simulation frame',()=>{
  const input=empty(),pointers=new PointerInputs(input);for(const action of ['jump','power','defend'] as const){pointers.press(1,action);pointers.release(1);expect(input[action]).toBe(false);expect(readInput(input,new Set())[action]).toBe(true);}pointers.clear();expect(readInput(input,new Set()).jump).toBe(false);
 });
 it('keeps walking while jumping and guarding, including alternate held jump keys',()=>{
  const keys=new Set(['KeyD','KeyW','Space','KeyC']);let state=readInput(empty(),keys);expect(state.right&&state.jump&&state.defend).toBe(true);
  keys.delete('Space');state=readInput(empty(),keys);expect(state.right&&state.jump).toBe(true);expect(keyboardAction('KeyS')).toBe('down');
 });
 it('supports two fingers, cancellation, duplicate actions and clearing on pause',()=>{
  const input=empty(),pointers=new PointerInputs(input);pointers.press(1,'right');pointers.press(2,'jump');expect(input.right&&input.jump).toBe(true);
  pointers.release(2);expect(input.right).toBe(true);expect(input.jump).toBe(false);pointers.press(3,'right');pointers.release(1);expect(input.right).toBe(true);
  pointers.clear();expect(Object.values(input).some(Boolean)).toBe(false);
 });
});
describe('Timed defense and pursuing monsters',()=>{
 it('blocks only in the guard window and cannot restart before cooldown',()=>{
  const state=raiseGuard(freshGuard(),1000);expect(guardActive(state,1000+GUARD_DURATION-1)).toBe(true);expect(guardActive(state,1000+GUARD_DURATION)).toBe(false);
  expect(raiseGuard(state,2000)).toBe(state);expect(raiseGuard(state,1000+GUARD_COOLDOWN).until).toBe(1000+GUARD_COOLDOWN+GUARD_DURATION);expect(freshGuard().readyAt).toBe(0);
 });
 it('aims toward the sampled player height at a fixed speed instead of homing',()=>{
  const aim=projectileAim({x:0,y:100},{x:300,y:-300},250);expect(aim.vx).toBeCloseTo(150);expect(aim.vy).toBeCloseTo(-200);expect(Math.hypot(aim.vx,aim.vy)).toBeCloseTo(250);
  expect(enemyTuning(3).speed).toBeGreaterThan(enemyTuning(1).speed);expect(enemyTuning(1).cooldown).toBeLessThan(3200);expect(enemyTuning(3).windup).toBeGreaterThanOrEqual(600);
 });
 it('tracks nearby players, changes direction and stays on its own carrier',()=>{
  const enemy={x:200,y:400,left:100,right:300,direction:1};expect(enemyTracks(enemy,{x:450,y:300},1)).toBe(true);expect(enemyTracks(enemy,{x:800,y:400},1)).toBe(false);
  expect(stepEnemy(enemy,0,true,.5,1).x).toBeLessThan(200);expect(stepEnemy(enemy,900,true,10,1).x).toBe(300);expect(stepEnemy(enemy,0,true,1,1,true).x).toBe(200);
 });
 it('adds pressure across each route while preserving the start and finish clearances',()=>{
  for(const course of courses){expect(course.enemies.length).toBeGreaterThanOrEqual(11);for(const enemy of course.enemies){expect(enemy.x).toBeGreaterThan(600);expect(enemy.x).toBeLessThan(course.finish-120);expect(enemy.x).toBeGreaterThanOrEqual(enemy.left);expect(enemy.x).toBeLessThanOrEqual(enemy.right);expect(course.platforms.some(p=>enemy.left>=p.x&&enemy.right<=p.x+p.width)).toBe(true);}}
 });
});
