'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { accessToken } from '../../lib/account/session';

type Member = { username: string; name: string; photo_url: string | null; is_me: boolean };

export function CampusMembersPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [retry, setRetry] = useState(0);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  async function load(offset: number) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true); setError('');
    try {
      const token = await accessToken();
      if (controller.signal.aborted) return;
      if (!token) throw new Error('Please sign in to see campus members.');
      const params = new URLSearchParams({ q: search, offset: String(offset) });
      const response = await fetch(`/api/campus/members?${params}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal,
      });
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error(data.error || 'Unable to load campus members.');
      setMembers(current => offset ? [...current, ...data.members.filter((member: Member) => !current.some(item => item.username === member.username))] : data.members);
      setHasMore(data.hasMore);
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load campus members.');
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }

  useEffect(() => {
    setMembers([]); setHasMore(false);
    void load(0);
    return () => requestRef.current?.abort();
  }, [search, retry]);

  return <section className="rounded-3xl border border-stone-200 bg-white/80 p-5" aria-labelledby="campus-members-title">
    <div className="flex items-center justify-between gap-2">
      <h2 id="campus-members-title" className="flex items-center gap-2 text-sm font-semibold text-stone-800"><Users size={18} className="shrink-0 text-emerald-700" />People on your campus</h2>
      <button type="button" className="shrink-0 text-xs font-semibold text-emerald-700 lg:hidden" aria-expanded={expanded} aria-controls="campus-members-list" onClick={() => setExpanded(value => !value)}>{expanded ? 'Hide' : 'Show'}</button>
    </div>
    <p className="mt-1.5 text-xs leading-relaxed text-stone-500">Registered members of your school community.</p>
    <div id="campus-members-list" className={`${expanded ? 'block' : 'hidden'} lg:block`}>
      <label className="sr-only" htmlFor="campus-member-search">Search campus members</label>
      <input id="campus-member-search" type="search" value={query} onChange={event => setQuery(event.target.value)} maxLength={100} placeholder="Search members…" className="mt-4 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600" />
      <div className="mt-3 max-h-80 overflow-y-auto" aria-busy={loading}>
        <ul className="space-y-1">
          {members.map(member => <li key={member.username}>
            <Link href={member.is_me ? '/profile' : `/students/${encodeURIComponent(member.username)}`} className="flex items-center gap-3 rounded-xl px-1 py-2 transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700">
              {member.photo_url ? <img src={member.photo_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800" aria-hidden="true">{member.name[0]?.toUpperCase()}</span>}
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-stone-800">{member.name}</span><span className="block truncate text-xs text-stone-500">@{member.username}</span></span>
              {member.is_me && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">You</span>}
            </Link>
          </li>)}
        </ul>
        {loading && <p className="py-3 text-xs text-stone-500" role="status">Loading members…</p>}
        {!loading && !error && !members.length && <p className="py-3 text-xs text-stone-500">{search ? 'No members match your search.' : 'No campus members to show yet.'}</p>}
      </div>
      {error && <p className="mt-3 text-xs text-red-700" role="alert">{error} <button type="button" className="font-semibold underline" onClick={() => setRetry(value => value + 1)}>Retry</button></p>}
      {hasMore && !error && <button type="button" className="mt-3 w-full rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 disabled:opacity-50" onClick={() => void load(members.length)} disabled={loading}>{loading ? 'Loading…' : 'Show more members'}</button>}
    </div>
  </section>;
}
