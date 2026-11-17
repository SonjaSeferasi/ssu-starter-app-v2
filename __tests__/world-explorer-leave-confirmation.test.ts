import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {leaveConfirmation,needsLeaveConfirmation,statusWhileConfirming} from '../lib/world-explorer/run-exit';

// Issue #1178 (SRS-622.2): the level's exit control ended an unfinished attempt
// immediately, with no Leave Game / Stay confirmation.
const run=readFileSync('components/world-explorer/country-run.tsx','utf8');

describe('Issue #1178: leaving an unfinished World Explorer attempt asks first',()=>{
 it('asks for confirmation while an attempt is in progress',()=>{
  for(const status of ['running','paused','discovery'] as const)expect(needsLeaveConfirmation(status,false),status).toBe(true);
 });
 it('leaves at once when there is no attempt progress to lose',()=>{
  for(const status of ['starting','complete','failed'] as const)expect(needsLeaveConfirmation(status,false),status).toBe(false);
  expect(needsLeaveConfirmation('running',true)).toBe(false);
 });
 it('pauses a running attempt behind the confirmation and leaves an open guide as it is',()=>{
  expect(statusWhileConfirming('running')).toBe('paused');
  expect(statusWhileConfirming('paused')).toBe('paused');
  expect(statusWhileConfirming('discovery')).toBe('discovery');
 });
 it('offers Leave Game and Stay and explains what is discarded and what is kept',()=>{
  expect(leaveConfirmation.leave).toBe('Leave Game');expect(leaveConfirmation.stay).toBe('Stay');
  expect(leaveConfirmation.body).toMatch(/unfinished attempt.*discarded/);
  expect(leaveConfirmation.body).toMatch(/already saved.*kept/);
 });
 it('routes every exit from a level through the confirmation',()=>{
  expect(run).toContain("onClick={()=>requestExit('world-map')} aria-label=\"Return to the world map\"");
  expect(run).toContain("onClick={()=>requestExit('world-map')}>Return to world map</button><button className={styles.quietButton} onClick={()=>requestExit('game-room')}>Back to Game Room</button>");
  expect(run).not.toContain('<button onClick={onExit} aria-label="Return to the world map">');
 });
 it('renders the confirmation with Stay first, and Stay returns to the paused attempt',()=>{
  expect(run).toContain('{leaveConfirmation.title}');expect(run).toContain('{leaveConfirmation.body}');
  expect(run.indexOf('{leaveConfirmation.stay}')).toBeGreaterThan(-1);
  expect(run.indexOf('{leaveConfirmation.stay}')).toBeLessThan(run.indexOf('{leaveConfirmation.leave}'));
  expect(run).toContain('onClick={()=>setLeaving(null)}');
 });
});
