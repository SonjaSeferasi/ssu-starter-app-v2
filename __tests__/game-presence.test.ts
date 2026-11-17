import { describe,it,expect } from 'vitest';
import { presenceLocation, validPresence } from '../lib/game-presence';
describe('Presence route scope',()=>{
  it.each([['/game-room','game-room'],['/game-1','jumpyland'],['/game-room/game-1/level','jumpyland'],['/world-explorer','world-explorer'],['/game-room/dormspace/classic','dormspace'],['/game-room/dormspace/campus','dormspace']])('maps %s', (route,expected)=>expect(presenceLocation(route)).toBe(expected));
  it.each(['/','/messages','/wordle','/dev/game-room','/dev/jumpyland','/game-room/dormspace/art-credits','/game-123'])('does not publish %s',route=>expect(presenceLocation(route)).toBeNull());
  it('rejects malformed friends and inherited property locations',()=>{const base={visible:true,serverTime:new Date().toISOString()};expect(validPresence({...base,friends:[null]})).toBe(false);expect(validPresence({...base,friends:[{username:'a',name:'A',location:'toString',expiresAt:new Date().toISOString()}]})).toBe(false);});
});
