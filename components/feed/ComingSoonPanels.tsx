// Layout placeholders for teammates' not-yet-built features (visual only —
// no fake data, no backend calls). MS is building Campus/Friends Feed + posts.
// You're invited and the Events card after it are live: they load real invitations and events.
import React from 'react';
import { UpcomingEventsPanel } from './UpcomingEventsPanel';
import { InvitationsPanel } from './InvitationsPanel';

const PANELS = [
  { icon: '👥', title: 'Group chats', body: "Coming soon — Loens's private messaging and group chats." },
  { icon: '🔥', title: 'Trending on campus', body: "Coming soon — Kabanga's trending posts and discovery." },
];

export function ComingSoonPanels() {
  return (
    <div className="hidden space-y-4 lg:block">
      {PANELS.map((panel) => (
        <div key={panel.title} className="rounded-3xl border border-stone-200 bg-white/70 p-5" aria-disabled="true">
          <p className="text-sm font-semibold text-stone-800">
            {panel.icon} {panel.title}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-stone-500">{panel.body}</p>
        </div>
      ))}
      <InvitationsPanel />
      <UpcomingEventsPanel />
    </div>
  );
}
