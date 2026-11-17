import { beforeEach, expect, it, vi } from 'vitest';

const { gameParticipation, dormOperation, verifiedUser } = vi.hoisted(() => ({
  gameParticipation: vi.fn(), dormOperation: vi.fn(), verifiedUser: vi.fn(),
}));

vi.mock('../../lib/game-participation-server', () => ({ gameParticipation }));
vi.mock('../../lib/dormspace', () => ({
  dormOperation,
  ownerParam: (value: string | null) => value,
}));
vi.mock('../../lib/socialu-account', async original => ({
  ...(await original<typeof import('../../lib/socialu-account')>()),
  verifiedUser,
}));

import { GET as getDorm } from '../../app/api/dorm/route';
import { GET as getStreak, POST as recordExplorer } from '../../app/api/game-participation/route';
import { AccountError } from '../../lib/socialu-account';

beforeEach(() => {
  vi.resetAllMocks();
  verifiedUser.mockResolvedValue({ id: 'signed-in-student' });
  gameParticipation.mockResolvedValue({ recorded: true });
  dormOperation.mockResolvedValue({ version: 1 });
});

function roomRequest(query = '') {
  return new Request('http://localhost/api/dorm' + query, { headers: { 'x-socialu-participation-zone': 'UTC' } });
}

it('credits a successfully opened dorm, with the viewer as the participating student', async () => {
  const result = await getDorm(roomRequest('?owner=friend'));
  expect(result.status).toBe(200);
  expect(result.headers.get('x-socialu-participation-recorded')).toBe('1');
  expect(dormOperation).toHaveBeenCalledWith('signed-in-student', 'open', 'friend');
  expect(gameParticipation).toHaveBeenCalledWith('signed-in-student', 'dormspace', 'UTC');

  gameParticipation.mockClear();
  expect((await getDorm(roomRequest('?view=hall'))).status).toBe(200);
  dormOperation.mockRejectedValueOnce(new AccountError('This dorm is not available.', 403));
  expect((await getDorm(roomRequest('?owner=friend'))).status).toBe(403);
  expect(gameParticipation).not.toHaveBeenCalled();
});

it('reads the signed-in streak and qualifies only playable Explorer levels', async () => {
  expect((await getStreak(new Request('http://localhost/api/game-participation'))).status).toBe(200);
  expect(gameParticipation).toHaveBeenCalledWith('signed-in-student');
  gameParticipation.mockClear();

  const request = (country: string) => new Request('http://localhost/api/game-participation', {
    method: 'POST', body: JSON.stringify({ country, timeZone: 'UTC' }),
  });
  expect((await recordExplorer(request('ZZZ'))).status).toBe(400);
  expect(gameParticipation).not.toHaveBeenCalled();
  expect((await recordExplorer(request('JPN'))).status).toBe(200);
  expect(gameParticipation).toHaveBeenCalledWith('signed-in-student', 'explorer', 'UTC');
});
