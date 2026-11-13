// Layout placeholders for teammates' not-yet-built features (visual only —
// no fake data, no backend calls). MS is building Campus/Friends Feed + posts.
// You're invited and the Events card after it are live: they load real invitations and events.
// Trending on campus is live too (SRS-405): it links to the ranking on Events and Trending.
import React from 'react';
import Link from 'next/link';
import { UpcomingEventsPanel } from './UpcomingEventsPanel';
import { InvitationsPanel } from './InvitationsPanel';

const PANELS = [
  { icon: '👥', title: 'Group chats', body: "Coming soon — Loens's private messaging and group chats." },
];

export function ComingSoonPanels() {
  return (
    <div className="hidden space-y-4 lg:block">
      {PANELS.map((panel) => (
        <div key={panel.title} className="rounded-3xl border border-white/50 bg-white/70 p-5 backdrop-blur-md" aria-disabled="true">
          <p className="text-sm font-semibold text-stone-800">
            {panel.icon} {panel.title}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-stone-500">{panel.body}</p>
        </div>
      ))}
      <Link href="/events#trending-title" className="block rounded-3xl border border-white/50 bg-white/70 p-5 backdrop-blur-md hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#28634e]">
        <p className="text-sm font-semibold text-stone-800">🔥 Trending on campus</p>
        <p className="mt-1.5 text-xs leading-relaxed text-stone-500">See this week&apos;s most-liked Campus Feed posts.</p>
      </Link>
      <InvitationsPanel />
      <UpcomingEventsPanel />
    </div>
  );
}
