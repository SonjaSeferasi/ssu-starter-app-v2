import { afterEach, expect, it, vi } from 'vitest';
import { createElement } from 'react';
const { renderToStaticMarkup } = require('react-dom/server');
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
const { accessToken } = vi.hoisted(() => ({ accessToken: vi.fn() }));
vi.mock('../lib/account/session', () => ({ accessToken }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
import { searchCampus } from '../lib/campus-search';
import { SearchForm } from '../components/navigation/search-form';

afterEach(() => { vi.unstubAllGlobals(); vi.resetAllMocks(); });

function mockSources(overrides: Record<string, unknown> = {}) {
  accessToken.mockResolvedValue('refreshed-token');
  const fetcher = vi.fn(async (path: string) => {
    const source = path.startsWith('/api/campus/members') ? 'students' : path === '/api/conversations' ? 'groups' : 'events';
    const data = overrides[source] ?? {
      students: { members: [{ username: 'alex', name: 'Alex', is_me: false }], hasMore: true },
      groups: { conversations: [
        { id: '1', kind: 'group', name: 'CAMPUS chess' },
        { id: '2', kind: 'private', name: 'Campus friend' },
        { id: '3', kind: 'group', name: 'Campus former', former: true },
        { id: '4', kind: 'group', name: 'Other' },
      ] },
      events: { events: [
        { event_id: '5', title: 'Campus fair', description: '', location: 'Hall' },
        { event_id: '6', title: 'Cancelled', description: 'Campus', location: 'Hall', status: 'cancelled' },
        { event_id: '7', title: 'Other', description: '', location: 'Park' },
      ] },
    }[source];
    return data instanceof Response ? data : Response.json(data);
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

it('searches authorized sources with refreshed credentials, escaped text and student pagination', async () => {
  const fetcher = mockSources();
  const signal = new AbortController().signal;
  await searchCampus('  A&B  ', 20, signal);
  expect(fetcher).toHaveBeenCalledWith('/api/campus/members?q=A%26B&offset=20', expect.objectContaining({
    headers: { Authorization: 'Bearer refreshed-token' }, cache: 'no-store', signal,
  }));
  expect(fetcher).toHaveBeenCalledTimes(3);
});

it('matches case-insensitively and excludes private chats, former groups and cancelled events', async () => {
  mockSources();
  const results = await searchCampus('campus', 0, new AbortController().signal);
  expect(results.groups.items.map(group => group.id)).toEqual(['1']);
  expect(results.events.items.map(event => event.event_id)).toEqual(['5']);
  expect(results.students.hasMore).toBe(true);
});

it('keeps successful sections when another source is unavailable or malformed', async () => {
  mockSources({ groups: new Response('Unavailable', { status: 503 }), events: { unexpected: [] } });
  const results = await searchCampus('campus', 0, new AbortController().signal);
  expect(results.students.items).toHaveLength(1);
  expect(results.groups.error).toContain('could not be searched');
  expect(results.events.error).toContain('could not be searched');
});

it('does not send requests with no session, invalid input, or a cancelled search', async () => {
  const fetcher = mockSources();
  accessToken.mockResolvedValue(null);
  await expect(searchCampus('campus', 0, new AbortController().signal)).rejects.toThrow('sign in');
  accessToken.mockResolvedValue('token');
  for (const query of ['', '  ', 'x'.repeat(101)]) {
    await expect(searchCampus(query, 0, new AbortController().signal)).rejects.toThrow('1–100');
  }
  await expect(searchCampus('campus', -1, new AbortController().signal)).rejects.toThrow();
  const controller = new AbortController(); controller.abort();
  await expect(searchCampus('campus', 0, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  expect(fetcher).not.toHaveBeenCalled();
});

it('does not return stale results after an in-flight search is cancelled', async () => {
  const fetcher = mockSources();
  const controller = new AbortController();
  fetcher.mockImplementation(async () => { controller.abort(); return Response.json({ members: [], conversations: [], events: [] }); });
  await expect(searchCampus('campus', 0, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
});

it('renders an enabled, accessible search form with a GET fallback and submit button', () => {
  const html = renderToStaticMarkup(createElement(SearchForm, { initialQuery: 'Alex' }));
  expect(html).toContain('action="/search"');
  expect(html).toContain('role="search"');
  expect(html).toContain('name="q"');
  expect(html).toContain('value="Alex"');
  expect(html).toContain('type="submit"');
  expect(html).not.toContain('disabled');
});
