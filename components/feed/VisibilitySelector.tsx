export type Visibility = 'public' | 'friends_only';

export function VisibilitySelector({ value, onChange }: { value: Visibility; onChange: (v: Visibility) => void }) {
  const options: { id: Visibility; label: string }[] = [
    { id: 'public', label: 'Public' },
    { id: 'friends_only', label: 'Friends Only' },
  ];

  return (
    <div className="inline-flex rounded-full border border-stone-200 p-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            value === opt.id ? 'bg-emerald-100 text-emerald-800' : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
