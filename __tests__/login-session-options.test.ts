import {expect,it} from 'vitest';
import {canEndLoginSession} from '../lib/login-session-options';
import type {LoginEntry} from '../lib/login-activity';

const other:LoginEntry={id:'42',signed_in_at:'2026-11-03T12:00:00Z',active:true,is_current:false,can_end:true};
it('offers logout only when the API authorizes an active other session',()=>{
 expect(canEndLoginSession(other)).toBe(true);
 for(const changes of [{is_current:true},{active:false},{can_end:false},{can_end:undefined},{id:'0'},{id:'9223372036854775808'}]){
  expect(canEndLoginSession({...other,...changes})).toBe(false);
 }
});
