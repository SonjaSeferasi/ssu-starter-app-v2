// Hero banner for the regular Campus/Friends feed tabs -- same gradient
// card + icon + title/subtitle + decorative note layout as the Whisper
// Wall's banner, but in the app's normal light emerald palette (the dark
// "after dark" look stays exclusive to the Whisper Wall's own identity).
export function FeedBanner({ tab }: { tab: 'for-you' | 'friends' }) {
  const isFriends = tab === 'friends';

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700 px-6 py-8 shadow-sm sm:px-10">
      <span className="pointer-events-none absolute left-6 top-5 text-lg text-emerald-200/50" aria-hidden="true">✦</span>
      <span className="pointer-events-none absolute right-24 top-8 text-sm text-emerald-200/40" aria-hidden="true">✦</span>
      <span className="pointer-events-none absolute bottom-6 left-20 text-xs text-emerald-200/30" aria-hidden="true">✦</span>

      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/15 text-4xl" aria-hidden="true">
          {isFriends ? '🤝' : '🎓'}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{isFriends ? 'Friends Feed' : 'Campus Feed'}</h2>
          <p className="mt-1 text-sm text-emerald-50/80">
            {isFriends ? 'Catch up with the people you follow back.' : "See what's happening across campus."}
          </p>
        </div>
        <div className="hidden shrink-0 -rotate-2 rounded-lg bg-amber-50 px-4 py-3 text-center shadow-md sm:block" aria-hidden="true">
          <p className="text-xs font-medium leading-relaxed text-stone-700">
            Campus life.<br />Happens here.
          </p>
        </div>
      </div>
    </div>
  );
}
