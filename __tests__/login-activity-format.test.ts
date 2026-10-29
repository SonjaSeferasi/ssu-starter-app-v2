import {expect,it} from 'vitest';
import {loginDate,loginTime} from '../lib/login-activity-format';
it('displays the recorded date in the selected timezone across midnight',()=>{
 expect(loginDate('2026-10-29T00:30:00Z','America/New_York')).toBe('Oct 28, 2026');
 expect(loginDate('2026-10-29T00:30:00Z','Asia/Tokyo')).toBe('Oct 29, 2026');
});
it('preserves historical dates and leap days instead of replacing them with today',()=>{
 expect(loginDate('2024-02-29T15:00:00Z','UTC')).toBe('Feb 29, 2024');
 expect(loginDate('bad','UTC')).toBe('Date unavailable');
});

it('distinguishes repeated fall-back hours and preserves recorded seconds',()=>{
 expect(loginTime('2026-11-01T05:30:12Z','America/New_York')).toBe('1:30:12 AM EDT');
 expect(loginTime('2026-11-01T06:30:12Z','America/New_York')).toBe('1:30:12 AM EST');
 expect(loginTime('bad','UTC')).toBe('Time unavailable');
});
