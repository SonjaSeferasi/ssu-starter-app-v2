import { afterEach, expect, it, vi } from 'vitest';
const { accessToken } = vi.hoisted(() => ({ accessToken: vi.fn() }));
vi.mock('../lib/account/session', () => ({ accessToken }));
import { navigationPreferenceRequest, NAVIGATION_PREFERENCE_WAIT_MS } from '../lib/navigation-preferences-client';
const response = (data: unknown) => new Response(JSON.stringify(data));
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.resetAllMocks(); });

it.each(['side', 'bottom', 'top'] as const)('restores valid %s from the account without a write', async position => {
  accessToken.mockResolvedValue('fresh'); const fetch = vi.fn().mockResolvedValue(response({ position })); vi.stubGlobal('fetch', fetch);
  expect(await navigationPreferenceRequest()).toBe(position);
  expect(fetch).toHaveBeenCalledWith('/api/preferences', expect.objectContaining({ method: 'GET', headers: expect.objectContaining({ Authorization: 'Bearer fresh' }) }));
  expect(fetch.mock.calls[0][1].body).toBeUndefined();
});
it.each(['side', 'bottom', 'top'] as const)('confirms a matching %s save with the refreshed token', async position => {
  accessToken.mockResolvedValue('fresh'); const fetch = vi.fn().mockResolvedValue(response({ position })); vi.stubGlobal('fetch', fetch);
  expect(await navigationPreferenceRequest(position)).toBe(position);
  expect(fetch).toHaveBeenCalledWith('/api/preferences', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ position }), headers: expect.objectContaining({ Authorization: 'Bearer fresh' }) }));
});
it.each([null, {}, { position: 'left' }, { position: 1 }])('rejects malformed load confirmation %j', async data => {
  accessToken.mockResolvedValue('token'); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(data)));
  await expect(navigationPreferenceRequest()).rejects.toThrow('did not confirm');
});
it('rejects a successful response confirming a different selected position', async () => {
  accessToken.mockResolvedValue('token'); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ position: 'side' })));
  await expect(navigationPreferenceRequest('bottom')).rejects.toThrow('did not confirm');
});
it('treats non-JSON failure as unconfirmed without exposing server details', async () => {
  accessToken.mockResolvedValue('token'); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('private-stack',{status:502})));
  await expect(navigationPreferenceRequest('bottom')).rejects.toThrow('did not confirm');
});
it('does not send a request when authentication is absent', async () => {
  accessToken.mockResolvedValue(null); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  await expect(navigationPreferenceRequest('bottom')).rejects.toThrow('sign in'); expect(fetch).not.toHaveBeenCalled();
});
it('bounds token refresh and never sends an expired save after refresh resumes', async () => {
  vi.useFakeTimers(); let resolve!: (token: string) => void;
  accessToken.mockReturnValue(new Promise<string>(done => { resolve = done; })); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  const failed = expect(navigationPreferenceRequest('bottom')).rejects.toThrow('too long');
  await vi.advanceTimersByTimeAsync(NAVIGATION_PREFERENCE_WAIT_MS); await failed;
  resolve('late'); await vi.advanceTimersByTimeAsync(1); expect(fetch).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
});
it('bounds response parsing even if abort is ignored and allows a new retry', async () => {
  vi.useFakeTimers(); accessToken.mockResolvedValue('token');
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: () => new Promise(() => {}) }); vi.stubGlobal('fetch', fetch);
  const failed = expect(navigationPreferenceRequest('bottom')).rejects.toThrow('too long');
  await vi.advanceTimersByTimeAsync(NAVIGATION_PREFERENCE_WAIT_MS); await failed;
  fetch.mockResolvedValue(response({ position: 'bottom' })); expect(await navigationPreferenceRequest('bottom')).toBe('bottom');
  expect(vi.getTimerCount()).toBe(0);
});
it('cancels immediately during refresh and never sends after leaving the view', async () => {
  let resolve!: (token: string) => void;
  accessToken.mockReturnValue(new Promise<string>(done => { resolve = done; })); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  const controller = new AbortController(); const failed = expect(navigationPreferenceRequest('bottom',controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  controller.abort(); await failed; resolve('late'); await Promise.resolve(); expect(fetch).not.toHaveBeenCalled();
});
it('does not refresh or fetch if already cancelled', async () => {
  const controller = new AbortController(); controller.abort(); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  await expect(navigationPreferenceRequest(undefined,controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  expect(accessToken).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
});
