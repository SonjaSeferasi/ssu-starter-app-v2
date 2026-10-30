export type FeedTab = 'for-you' | 'friends' | 'whispers';

export function FeedSwitcher({ active, onChange }: { active: FeedTab; onChange: (tab: FeedTab) => void }) {
  const tabs: { id: FeedTab; label: string; badge?: string }[] = [
    { id: 'for-you', label: 'For you' },
    { id: 'friends', label: 'Friends' },
    { id: 'whispers', label: 'Whisper Wall 👻', badge: 'New' },
  ];

  return (
    <div className="inline-flex flex-wrap rounded-full bg-stone-100 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
            active === tab.id ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          {tab.label}
          {tab.badge ? (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                active === tab.id ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {tab.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
