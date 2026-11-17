import { afterEach, describe, expect, it, vi } from 'vitest';
import { boundedJumpylandRequest, isConfirmedJumpylandCompletion, JUMPYLAND_REQUEST_LIMIT_MS } from '../lib/jumpyland-request';
afterEach(()=>vi.useRealTimers());
describe('Jumpyland whole-request deadline',()=>{
  it('includes a stalled sign-in refresh and blocks a request after timeout',async()=>{
    vi.useFakeTimers();let release!:()=>void;const send=vi.fn();
    const pending=boundedJumpylandRequest(async signal=>{await new Promise<void>(resolve=>release=resolve);if(signal.aborted)throw new Error('cancelled');return send();});
    const rejected=expect(pending).rejects.toMatchObject({name:'TimeoutError'});
    await vi.advanceTimersByTimeAsync(JUMPYLAND_REQUEST_LIMIT_MS);await rejected;
    release();await vi.runAllTimersAsync();expect(send).not.toHaveBeenCalled();
  });
  it('bounds a response body or transport that ignores AbortSignal',async()=>{
    vi.useFakeTimers();let signal!:AbortSignal;
    const pending=boundedJumpylandRequest(async s=>{signal=s;return new Promise(()=>{});});
    const rejected=expect(pending).rejects.toMatchObject({name:'TimeoutError'});
    await vi.advanceTimersByTimeAsync(JUMPYLAND_REQUEST_LIMIT_MS-1);expect(signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);await rejected;expect(signal.aborted).toBe(true);
  });
  it('ignores a late success after timing out, allowing an independent retry',async()=>{
    vi.useFakeTimers();let late!:(value:string)=>void;const received=vi.fn();
    const pending=boundedJumpylandRequest(()=>new Promise<string>(resolve=>late=resolve));
    pending.then(received,()=>{});const rejected=expect(pending).rejects.toMatchObject({name:'TimeoutError'});
    await vi.advanceTimersByTimeAsync(10000);await rejected;
    expect(await boundedJumpylandRequest(async()=> 'retry confirmed')).toBe('retry confirmed');
    late('old response');await Promise.resolve();expect(received).not.toHaveBeenCalled();
  });
  it('does not restart the existing deadline when another operation begins',async()=>{
    vi.useFakeTimers();const first=boundedJumpylandRequest(()=>new Promise(()=>{}));const rejected=expect(first).rejects.toMatchObject({name:'TimeoutError'});
    await vi.advanceTimersByTimeAsync(5000);expect(await boundedJumpylandRequest(async()=>true)).toBe(true);
    await vi.advanceTimersByTimeAsync(5000);await rejected;
  });
  it('clears the timer on success',async()=>{vi.useFakeTimers();expect(await boundedJumpylandRequest(async()=>({completed:[1]}))).toEqual({completed:[1]});expect(vi.getTimerCount()).toBe(0);});
  it('preserves immediate error and clears its timer',async()=>{vi.useFakeTimers();await expect(boundedJumpylandRequest(async()=>{throw new Error('Offline');})).rejects.toThrow('Offline');expect(vi.getTimerCount()).toBe(0);});
});
describe('Only confirmed completion unlocks replay and next',()=>{
  it.each([null,{}, {completed:[]},{completed:[2]},{completed:['1']},{completed:[1,4]},{completed:[1],balance:-1},{completed:[1],reward:{points:'25'}},{completed:[1],reward:null}])('rejects ambiguous/malformed response %j',data=>expect(isConfirmedJumpylandCompletion(data,1)).toBe(false));
  it('accepts confirmed legacy progress without inventing points',()=>expect(isConfirmedJumpylandCompletion({completed:[1]},1)).toBe(true));
  it('accepts confirmed retry and replay data',()=>{expect(isConfirmedJumpylandCompletion({completed:[1,2],balance:50,reward:{points:25}},2)).toBe(true);expect(isConfirmedJumpylandCompletion({completed:[1,2,3],balance:50,reward:{points:0}},1)).toBe(true);});
});
