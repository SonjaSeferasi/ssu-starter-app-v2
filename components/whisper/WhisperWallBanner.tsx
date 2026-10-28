// The distinctive, "mysterious but playful" identity for the Whisper Wall
// lives here -- everyday buttons/pills elsewhere in this feature still
// reuse the app's normal emerald accent.
export function WhisperWallBanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-900 px-6 py-8 shadow-sm sm:px-10">
      <span className="pointer-events-none absolute left-6 top-5 text-lg text-emerald-300/60" aria-hidden="true">✨</span>
      <span className="pointer-events-none absolute right-24 top-8 text-sm text-emerald-300/50" aria-hidden="true">✨</span>
      <span className="pointer-events-none absolute bottom-6 left-20 text-xs text-emerald-300/40" aria-hidden="true">✨</span>

      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/10 text-4xl" aria-hidden="true">
          👻
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">The Whisper Wall</h2>
          <p className="mt-1 text-sm text-emerald-100/80">Your campus has secrets. Share yours anonymously.</p>
        </div>
        <div className="hidden shrink-0 rotate-2 rounded-lg bg-amber-50 px-4 py-3 text-center shadow-md sm:block" aria-hidden="true">
          <p className="text-xs font-medium leading-relaxed text-stone-700">
            Real stories.<br />Real students.<br />Anonymous.
          </p>
        </div>
      </div>
    </div>
  );
}
