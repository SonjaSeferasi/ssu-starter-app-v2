import { resolveHeaderTheme } from '../../lib/screen-themes';
import type { HeaderThemeId } from '../../lib/screen-themes';

// The distinctive, "mysterious but playful" identity for the Whisper Wall
// lives here -- everyday buttons/pills elsewhere in this feature still
// reuse the app's normal emerald accent.
//
// "Customize Your Screen" (additional functionality, not in the official
// SRS): a student's chosen header theme -- illustrated art, a solid
// color, or a gradient -- can replace the plain dark gradient backdrop,
// but the ghost mascot, "The Whisper Wall" title, its subtitle, and the
// "Real stories..." note are ALWAYS rendered exactly as before -- per
// explicit instruction, theming never touches the Whisper Wall's own
// identity or messaging, only what's behind it. A heavier dark scrim
// (vs. the regular Feed banner's, and only over illustrated art, which is
// the only kind busy enough to need it) keeps the moody, "after dark"
// feel and white text legible over any of the 9 illustrated themes, even
// a bright one.
export function WhisperWallBanner({ headerTheme }: { headerTheme?: HeaderThemeId | null }) {
  const resolved = resolveHeaderTheme(headerTheme);

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-900 bg-cover bg-center px-6 py-8 shadow-sm sm:px-10"
      style={resolved ? resolved.style : undefined}
    >
      {resolved?.kind === 'illustrated' ? <div className="absolute inset-0 bg-black/45" aria-hidden="true" /> : null}

      <span className="pointer-events-none absolute left-6 top-5 text-lg text-emerald-300/60" aria-hidden="true">✨</span>
      <span className="pointer-events-none absolute right-24 top-8 text-sm text-emerald-300/50" aria-hidden="true">✨</span>
      <span className="pointer-events-none absolute bottom-6 left-20 text-xs text-emerald-300/40" aria-hidden="true">✨</span>

      <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
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
