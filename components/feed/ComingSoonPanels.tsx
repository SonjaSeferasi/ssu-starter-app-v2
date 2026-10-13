// Layout placeholders for teammates' not-yet-built features (visual only —
// no fake data, no backend calls). MS is building Campus/Friends Feed + posts.
const PANELS = [
  { icon: '👥', title: 'Group chats', body: "Coming soon — Loens's private messaging and group chats." },
  { icon: '🔥', title: 'Trending on campus', body: "Coming soon — Kabanga's trending posts and discovery." },
  { icon: '📅', title: "You're invited", body: "Coming soon — Kabanga's event invitations." },
];

export function ComingSoonPanels() {
  return (
    <aside className="hidden w-72 shrink-0 space-y-4 lg:block">
      {PANELS.map((panel) => (
        <div key={panel.title} className="rounded-3xl border border-stone-200 bg-white/70 p-5" aria-disabled="true">
          <p className="text-sm font-semibold text-stone-800">
            {panel.icon} {panel.title}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-stone-500">{panel.body}</p>
        </div>
      ))}
    </aside>
  );
}
