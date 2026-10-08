export type FeedTab = 'campus' | 'friends';

export function FeedSwitcher({ active, onChange }: { active: FeedTab; onChange: (tab: FeedTab) => void }) {
  const tabs: { id: FeedTab; label: string }[] = [
    { id: 'campus', label: 'Campus Feed' },
    { id: 'friends', label: 'Friends Feed' },
  ];

  return (
    <div className="inline-flex rounded-full bg-stone-100 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            active === tab.id ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
