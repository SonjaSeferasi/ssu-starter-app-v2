import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { recordExplorerParticipation } from '../lib/game-participation-client';

const { accessToken } = vi.hoisted(() => ({ accessToken: vi.fn() }));
vi.mock('../lib/account/session', () => ({ accessToken }));
const fetchMock = vi.fn();
const dispatchEvent = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  accessToken.mockResolvedValue('test-session');
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('window', { dispatchEvent });
});
afterEach(() => vi.unstubAllGlobals());

it('shows the server error without announcing a reward when recording fails', async () => {
  fetchMock.mockResolvedValue(Response.json({ error: 'Daily rewards are not set up yet.' }, { status: 503 }));
  await expect(recordExplorerParticipation('JPN')).rejects.toThrow('Daily rewards are not set up yet.');
  expect(dispatchEvent).not.toHaveBeenCalled();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('reads confirmed daily points from the server after recording participation', async () => {
  const status = { qualifiedToday: true, earnedPointsToday: 10, count: 1 };
  fetchMock.mockResolvedValueOnce(Response.json({ recorded: true }))
    .mockResolvedValueOnce(Response.json(status));
  await expect(recordExplorerParticipation('JPN')).resolves.toEqual(status);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(dispatchEvent.mock.calls[0][0].type).toBe('socialu-points-changed');
});

it('requires sign-in before sending a participation request', async () => {
  accessToken.mockResolvedValue(null);
  await expect(recordExplorerParticipation('JPN')).rejects.toThrow('Sign in');
  expect(fetchMock).not.toHaveBeenCalled();
});
