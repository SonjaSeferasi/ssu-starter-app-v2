import {afterEach,expect,it,vi} from 'vitest';
import {gameRoomSamples} from '../lib/game-room';
const {accessToken}=vi.hoisted(()=>({accessToken:vi.fn()}));
vi.mock('../lib/account/session',()=>({accessToken}));
import {roomRequest} from '../lib/game-room-client';

afterEach(()=>{vi.unstubAllGlobals();vi.resetAllMocks();});
it('waits for session refresh and sends the refreshed token for an avatar save',async()=>{
 accessToken.mockResolvedValue('refreshed-token');
 const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify(gameRoomSamples)));vi.stubGlobal('fetch',fetch);
 expect(await roomRequest('PUT',gameRoomSamples.appearance!)).toEqual(gameRoomSamples);
 expect(fetch).toHaveBeenCalledWith('/api/game-room',expect.objectContaining({method:'PUT',headers:expect.objectContaining({Authorization:'Bearer refreshed-token'})}));
});
it('does not send an anonymous save when the session is gone',async()=>{
 accessToken.mockResolvedValue(null);const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 await expect(roomRequest()).rejects.toMatchObject({code:'SESSION_REQUIRED'});expect(fetch).not.toHaveBeenCalled();
});
it('explains a non-JSON connection failure without losing the draft or replaying a write',async()=>{
 accessToken.mockResolvedValue('token');const fetch=vi.fn().mockResolvedValue(new Response('Bad Gateway',{status:502}));vi.stubGlobal('fetch',fetch);
 await expect(roomRequest('PUT',gameRoomSamples.appearance!)).rejects.toThrow('connection was interrupted');expect(fetch).toHaveBeenCalledTimes(1);
});
