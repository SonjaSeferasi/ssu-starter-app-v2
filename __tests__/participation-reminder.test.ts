import { expect, it } from 'vitest';
import { isParticipationGame, needsParticipationReminder, type ParticipationCalendar } from '../lib/participation-calendar';
const status = { atRisk: true, count: 4, forgivenRemaining: 0, qualifiedToday: false, dismissedToday: false } as ParticipationCalendar;
it('requires all four at-risk conditions', () => {
  expect(needsParticipationReminder(status)).toBe(true);
  for (const override of [{ count: 0 }, { forgivenRemaining: 1 }, { qualifiedToday: true }, { dismissedToday: true }, { atRisk: false }]) {
    expect(needsParticipationReminder({ ...status, ...override })).toBe(false);
  }
});
it.each(['/game-1','/game-room/game-1','/wordle','/game-room/wordle','/world-explorer','/world-explorer/JPN','/game-room/dormspace','/game-room/dormspace/classic','/dev/jumpyland'])('suppresses reminders in %s', path => expect(isParticipationGame(path)).toBe(true));
it.each(['/','/profile','/game-room','/events','/messages','/game-123'])('allows reminders outside games at %s', path => expect(isParticipationGame(path)).toBe(false));
