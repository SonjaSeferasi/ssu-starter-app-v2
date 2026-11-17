import { afterEach, expect, it, vi } from 'vitest';
import { gameRoomSamples } from '../lib/game-room';
import { JUMPYLAND_REQUEST_LIMIT_MS } from '../lib/jumpyland-request';
const { accessToken } = vi.hoisted(() => ({ accessToken: vi.fn() }));
vi.mock('../lib/account/session', () => ({ accessToken }));
import { loadJumpylandEntry } from '../lib/jumpyland-entry';
const response = (data: unknown) => new Response(JSON.stringify(data));
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.resetAllMocks(); });

it('loads avatar and progression with one refreshed token, without starting an attempt', async () => {
  accessToken.mockResolvedValue('refreshed');
  const fetch = vi.fn(async (url: string) => response(url === '/api/jumpyland' ? { completed: [1, 2], balance: 50 } : gameRoomSamples));
  vi.stubGlobal('fetch', fetch);
  expect(await loadJumpylandEntry()).toEqual({ room: gameRoomSamples, completed: [1, 2], balance: 50 });
  expect(accessToken).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(2);
  for (const [, options] of fetch.mock.calls as unknown as [string, RequestInit][]) {
    expect(options.headers).toEqual({ Authorization: 'Bearer refreshed' });
    expect(options.method).toBeUndefined();
    expect(options.body).toBeUndefined();
  }
});
it('does not fetch account data when there is no session', async () => {
  accessToken.mockResolvedValue(null); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  await expect(loadJumpylandEntry()).rejects.toThrow('sign in'); expect(fetch).not.toHaveBeenCalled();
});
it('bounds a stalled refresh and prevents late account reads from the expired opening', async () => {
  vi.useFakeTimers(); let resolve!: (token: string) => void;
  accessToken.mockReturnValue(new Promise<string>(done => { resolve = done; }));
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  const rejected = expect(loadJumpylandEntry()).rejects.toMatchObject({ name: 'TimeoutError' });
  await vi.advanceTimersByTimeAsync(JUMPYLAND_REQUEST_LIMIT_MS); await rejected;
  resolve('late'); await vi.advanceTimersByTimeAsync(1); expect(fetch).not.toHaveBeenCalled();
});
it('does not start account reads after the page leaves during refresh', async () => {
  const cancelled = new AbortController(); let resolve!: (token: string) => void;
  accessToken.mockReturnValue(new Promise<string>(done => { resolve = done; }));
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  const rejected = expect(loadJumpylandEntry(cancelled.signal)).rejects.toThrow('cancelled');
  cancelled.abort(); resolve('late'); await rejected; expect(fetch).not.toHaveBeenCalled();
});
it('bounds a response body that never resolves, then permits a fresh retry', async () => {
  vi.useFakeTimers(); accessToken.mockResolvedValue('token');
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: () => new Promise(() => {}) }); vi.stubGlobal('fetch', fetch);
  const rejected = expect(loadJumpylandEntry()).rejects.toMatchObject({ name: 'TimeoutError' });
  await vi.advanceTimersByTimeAsync(JUMPYLAND_REQUEST_LIMIT_MS); await rejected;
  fetch.mockImplementation(async (url: string) => response(url === '/api/jumpyland' ? { completed: [] } : gameRoomSamples));
  expect((await loadJumpylandEntry()).completed).toEqual([]);
});
it('explains a non-JSON server failure without exposing the raw server content', async () => {
  accessToken.mockResolvedValue('token'); vi.stubGlobal('fetch', vi.fn(async () => new Response('internal-secret-stack', { status: 502 })));
  await expect(loadJumpylandEntry()).rejects.toThrow('could not be loaded');
});
it.each([null, {}, { completed: [4] }, { completed: ['1'] }])('rejects malformed progression %j', async progress => {
  accessToken.mockResolvedValue('token'); vi.stubGlobal('fetch', vi.fn(async (url: string) => response(url === '/api/jumpyland' ? progress : gameRoomSamples)));
  await expect(loadJumpylandEntry()).rejects.toThrow();
});
it('rejects an incomplete avatar response instead of crashing the game map', async () => {
  accessToken.mockResolvedValue('token'); vi.stubGlobal('fetch', vi.fn(async (url: string) => response(url === '/api/jumpyland' ? { completed: [] } : { appearance: null })));
  await expect(loadJumpylandEntry()).rejects.toThrow('incomplete');
});
