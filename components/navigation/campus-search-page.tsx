'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { searchCampus, type CampusSearch } from '../../lib/campus-search';
import { useNavigationSession } from './social-shell';
import { SessionNotice } from './section-page';
import { SearchForm } from './search-form';
import styles from './campus-search.module.css';

export function CampusSearchPage({ query, offset }: { query: string; offset: number }) {
  const session = useNavigationSession();
  const [result, setResult] = useState<CampusSearch | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const valid = query.length <= 100 && Number.isInteger(offset) && offset >= 0 && offset <= 1_000_000;
  useEffect(() => {
    if (session !== 'signed-in' || !query || !valid) return;
    const controller = new AbortController();
    setResult(null); setError('');
    void searchCampus(query, offset, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult(data); })
      .catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Search could not be loaded.'); });
    const refresh = () => { controller.abort(); setResult(null); setAttempt(value => value + 1); };
    const onStorage = (event: StorageEvent) => { if (event.key === null || event.key === 'access_token') refresh(); };
    window.addEventListener('socialu-session-changed', refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      controller.abort();
      window.removeEventListener('socialu-session-changed', refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, [session, query, offset, valid, attempt]);

  if (session !== 'signed-in') return <SessionNotice state={session} redirectTo={`/search?q=${encodeURIComponent(query)}`} />;
  const retry = () => setAttempt(value => value + 1);
  const pageHref = (nextOffset: number) => `/search?q=${encodeURIComponent(query)}&offset=${nextOffset}`;
  return <main className={styles.page}>
    <h1>Search your campus</h1>
    <SearchForm className={styles.form} initialQuery={query.slice(0, 100)} />
    <p>Find students and events in your campus community, or search the group chats you belong to.</p>
    {!valid ? <p role="alert">Enter up to 100 characters and start a new search.</p> : !query ? <p>Enter a name, group, or event to get started.</p> : <>
      <h2>Results for “{query}”</h2>
      {error ? <p role="alert">{error} <button onClick={retry}>Try again</button></p> : !result ? <p role="status">Searching…</p> : <>
        {(result.students.error || result.groups.error || result.events.error) && <button onClick={retry}>Retry search</button>}
        <section aria-labelledby="search-students">
          <h3 id="search-students">Students</h3>
          {result.students.error ? <p role="alert">{result.students.error}</p> : <>
            {!result.students.items.length && <p>No students found.</p>}
            <ul>{result.students.items.map(student => <li key={student.username}>
              <Link href={student.is_me ? '/profile' : `/students/${encodeURIComponent(student.username)}`}>
                <strong>{student.name}</strong><span>@{student.username}{student.is_me ? ' · You' : ''}</span>
              </Link>
            </li>)}</ul>
            <nav aria-label="Student search pages" className={styles.pages}>
              {offset > 0 && <Link href={pageHref(Math.max(0, offset - 20))}>Previous students</Link>}
              {result.students.hasMore && offset <= 999_980 && <Link href={pageHref(offset + 20)}>More students</Link>}
            </nav>
          </>}
        </section>
        <section aria-labelledby="search-groups">
          <h3 id="search-groups">Your group chats</h3>
          {result.groups.error ? <p role="alert">{result.groups.error}</p> : !result.groups.items.length ? <p>No groups found.</p> : <ul>{result.groups.items.map(group => <li key={group.id}>
            <Link href={`/messages/${encodeURIComponent(group.id)}`}><strong>{group.name || 'Group chat'}</strong><span>Open group chat</span></Link>
          </li>)}</ul>}
        </section>
        <section aria-labelledby="search-events">
          <h3 id="search-events">Events</h3>
          {result.events.error ? <p role="alert">{result.events.error}</p> : !result.events.items.length ? <p>No events found.</p> : <ul>{result.events.items.map(event => <li key={event.event_id}>
            <Link href={`/events/${encodeURIComponent(event.event_id)}`}><strong>{event.title}</strong><span>{event.location}</span></Link>
          </li>)}</ul>}
        </section>
      </>}
    </>}
  </main>;
}
