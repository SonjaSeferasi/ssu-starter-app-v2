import { accessToken } from './account/session';
import type { CampusEvent } from './events';

export type SearchStudent = { username: string; name: string; is_me: boolean; photo_url: string | null };
export type SearchGroup = { id: string; name: string | null; kind: 'group' | 'private'; former?: boolean | null };
type Section<T> = { items: T[]; error: string };
export type CampusSearch = {
  students: Section<SearchStudent> & { hasMore: boolean };
  groups: Section<SearchGroup>;
  events: Section<CampusEvent>;
};

// Reuse the existing account-scoped APIs: campus members respect school/block
// boundaries, and conversations expose only this student's own chat history.
export async function searchCampus(query: string, offset: number, signal: AbortSignal): Promise<CampusSearch> {
  query = query.trim();
  if (!query || query.length > 100 || !Number.isInteger(offset) || offset < 0 || offset > 1_000_000) {
    throw new Error('Enter a search of 1–100 characters.');
  }
  const token = await accessToken();
  if (!token) throw new Error('Please sign in again to search your campus.');
  signal.throwIfAborted();
  async function read(path: string) {
    const response = await fetch(path, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal });
    if (!response.ok) throw new Error('Search could not be loaded.');
    return response.json();
  }
  const [students, groups, events] = await Promise.allSettled([
    read(`/api/campus/members?q=${encodeURIComponent(query)}&offset=${offset}`).then(data => {
      if (!Array.isArray(data?.members)) throw new Error();
      return { items: data.members as SearchStudent[], hasMore: data.hasMore === true, error: '' };
    }),
    read('/api/conversations').then(data => {
      if (!Array.isArray(data?.conversations)) throw new Error();
      return { items: (data.conversations as SearchGroup[]).filter(group => group.kind === 'group' && !group.former && matches(group.name || 'Group chat', query)), error: '' };
    }),
    read('/api/events').then(data => {
      if (!Array.isArray(data?.events)) throw new Error();
      return { items: (data.events as CampusEvent[]).filter(event => event.status !== 'cancelled' && matches(`${event.title} ${event.description} ${event.location}`, query)), error: '' };
    }),
  ]);
  signal.throwIfAborted();
  return {
    students: students.status === 'fulfilled' ? students.value : { items: [], hasMore: false, error: 'Students could not be searched. Please try again.' },
    groups: groups.status === 'fulfilled' ? groups.value : { items: [], error: 'Your groups could not be searched. Please try again.' },
    events: events.status === 'fulfilled' ? events.value : { items: [], error: 'Events could not be searched. Please try again.' },
  };
}

function matches(text: string, query: string) { return text.toLocaleLowerCase().includes(query.toLocaleLowerCase()); }
