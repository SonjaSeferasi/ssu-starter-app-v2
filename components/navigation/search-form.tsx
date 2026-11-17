'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';

export function SearchForm({ className, initialQuery = '' }: { className?: string; initialQuery?: string }) {
  const router = useRouter();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get('q') || '').trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
  }
  return <form action="/search" role="search" className={className} onSubmit={submit}>
    <input type="search" name="q" aria-label="Search students, groups, and events" placeholder="Search students, groups, events…" maxLength={100} defaultValue={initialQuery} />
    <button type="submit" aria-label="Search">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
    </button>
  </form>;
}
