export type Visibility = 'public' | 'friends_only';

export function VisibilitySelector({
  value,
  onChange,
  disabledOptions,
}: {
  value: Visibility | null;
  onChange: (v: Visibility) => void;
  /** Share (additional functionality): a Friends Only original forces a
   * repost to also be Friends Only -- disables Public in the UI as a
   * courtesy; the backend enforces this independently either way. */
  disabledOptions?: Visibility[];
}) {
  const options: { id: Visibility; label: string }[] = [
    { id: 'public', label: 'Public' },
    { id: 'friends_only', label: 'Friends Only' },
  ];

  return (
    <div className="inline-flex rounded-full border border-stone-200 p-1">
      {options.map((opt) => {
        const disabled = disabledOptions?.includes(opt.id) ?? false;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              value === opt.id ? 'bg-emerald-100 text-emerald-800' : 'text-stone-500 hover:text-stone-800'
            } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
