import type { MentionCandidate } from './use-mention-autocomplete';

export function MentionDropdown({
  members,
  loading,
  activeIndex,
  onHover,
  onSelect,
}: {
  members: MentionCandidate[];
  loading: boolean;
  activeIndex: number;
  onHover: (index: number) => void;
  onSelect: (username: string) => void;
}) {
  return (
    <div
      role="listbox"
      aria-label="Mention a student"
      className="absolute left-0 top-full z-30 mt-1 max-h-64 w-72 overflow-y-auto rounded-2xl border border-stone-200 bg-white py-1 shadow-lg"
    >
      {loading && members.length === 0 ? (
        <p className="px-3 py-2 text-xs text-stone-400">Searching…</p>
      ) : members.length === 0 ? (
        <p className="px-3 py-2 text-xs text-stone-400">No matching students.</p>
      ) : (
        members.map((member, index) => (
          <button
            key={member.username}
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            onMouseEnter={() => onHover(index)}
            onMouseDown={(e) => {
              e.preventDefault(); // keep focus (and the caret position) in the composer's text field
              onSelect(member.username);
            }}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left transition ${
              index === activeIndex ? 'bg-emerald-50' : 'hover:bg-stone-50'
            }`}
          >
            {member.photoUrl ? (
              <img src={member.photoUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
                {member.name[0]?.toUpperCase()}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-stone-800">{member.name}</span>
              <span className="block truncate text-xs text-stone-500">@{member.username}</span>
            </span>
          </button>
        ))
      )}
    </div>
  );
}
