'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useScreenThemeContext } from './use-screen-theme';
import { SCREEN_THEMES, SOLID_COLORS, GRADIENTS, resolveHeaderTheme } from '../../lib/screen-themes';
import type { ScreenThemeId, HeaderThemeId } from '../../lib/screen-themes';
import { SessionNotice } from '../navigation/section-page';
import { useProfileGate } from './profile-view';
import shellStyles from '../navigation/social-shell.module.css';

type Tab = 'background' | 'header';

// "Customize Your Screen" -- additional functionality, not in the
// official SRS. Background and header themes are selected and saved
// completely independently (two separate pending selections, one Save
// Changes call that sets both at once). NULL/"Default" always means
// today's existing plain look -- nothing changes for a student who never
// opens this page.
//
// Each illustrated theme is the student-supplied artwork itself
// (ScreenTheme.image), shown with background-size:cover -- see
// lib/screen-themes.ts. Header thumbnails use aspect-[4/1] (matching the
// actual banner shape); background thumbnails use aspect-video. The SAME
// image works at either aspect ratio (and at the tiny thumbnail size
// here) because cover crops to fill, same as the real banner/background.
export function CustomizeScreen() {
  const gate = useProfileGate();
  const { backgroundTheme, headerTheme, loading, error, save } = useScreenThemeContext();
  const [tab, setTab] = useState<Tab>('background');
  const [pendingBackground, setPendingBackground] = useState<ScreenThemeId | null>(null);
  const [pendingHeader, setPendingHeader] = useState<HeaderThemeId | null>(null);
  const [seeded, setSeeded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!loading && !seeded) {
      setPendingBackground(backgroundTheme);
      setPendingHeader(headerTheme);
      setSeeded(true);
    }
  }, [loading, seeded, backgroundTheme, headerTheme]);

  if (gate !== 'ready') return <SessionNotice state={gate} />;

  async function handleSave() {
    setSaving(true);
    setNotice('');
    const ok = await save(pendingBackground, pendingHeader);
    setSaving(false);
    if (ok) {
      setNotice('Your screen has been updated!');
      setTimeout(() => setNotice(''), 4000);
    }
  }

  async function handleReset() {
    setSaving(true);
    setNotice('');
    const ok = await save(null, null);
    setSaving(false);
    if (ok) {
      setPendingBackground(null);
      setPendingHeader(null);
      setNotice('Reset to Default.');
      setTimeout(() => setNotice(''), 4000);
    }
  }

  const previewBackground = SCREEN_THEMES.find((t) => t.id === pendingBackground);
  const previewHeader = resolveHeaderTheme(pendingHeader);

  return (
    <main className={shellStyles.page}>
      <Link href="/profile/settings" className="inline-flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-emerald-700">
        ← Back to Profile settings
      </Link>
      <h1 className={shellStyles.title}>Customize Your Screen</h1>
      <p className="mt-1 text-sm text-stone-500">
        Make SocialU feel like your space. Choose a background style and a header style to create your perfect campus vibe.
      </p>

      {loading ? (
        <p className="mt-8 text-sm text-stone-400">Loading your saved theme…</p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-4">
            <div className="inline-flex rounded-full bg-stone-100 p-1" role="tablist" aria-label="Customize Your Screen">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'background'}
                onClick={() => setTab('background')}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${tab === 'background' ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:text-stone-900'}`}
              >
                Background Style
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'header'}
                onClick={() => setTab('header')}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${tab === 'header' ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:text-stone-900'}`}
              >
                Header Style
              </button>
            </div>

            {tab === 'background' ? (
              <BackgroundPicker value={pendingBackground} onChange={setPendingBackground} />
            ) : (
              <HeaderPicker value={pendingHeader} onChange={setPendingHeader} />
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-stone-800">Preview Combination</p>
              <p className="mt-1 text-xs text-stone-500">See how your background and header look together.</p>
              <div
                className="relative mt-3 aspect-[4/3] overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 bg-cover bg-center"
                style={previewBackground ? { backgroundImage: `url(${previewBackground.image})`, backgroundColor: previewBackground.background } : undefined}
              >
                <div
                  className={`absolute inset-x-2 top-2 flex h-10 items-center overflow-hidden rounded-xl bg-cover bg-center px-3 text-xs font-bold ${
                    previewHeader ? previewHeader.textClass : 'bg-emerald-700 text-white'
                  }`}
                  style={previewHeader ? previewHeader.style : undefined}
                >
                  <span className="relative">Campus Feed</span>
                </div>
              </div>
            </div>

            {error ? <p className="text-xs text-red-600">{error}</p> : null}
            {notice ? <p className="text-xs font-medium text-emerald-700">{notice}</p> : null}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="flex-1 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-60"
              >
                Reset to Default
              </button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

function BackgroundPicker({ value, onChange }: { value: ScreenThemeId | null; onChange: (id: ScreenThemeId | null) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500">Changes the entire page background behind posts, sidebars, and content.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Background style">
        <DefaultTile selected={value === null} onClick={() => onChange(null)} />
        {SCREEN_THEMES.map((theme) => (
          <ThumbnailTile
            key={theme.id}
            label={theme.label}
            description={theme.description}
            selected={value === theme.id}
            onClick={() => onChange(theme.id)}
            style={{ backgroundImage: `url(${theme.image})`, backgroundColor: theme.background }}
            aspect="aspect-video"
          />
        ))}
      </div>
    </div>
  );
}

function HeaderPicker({ value, onChange }: { value: HeaderThemeId | null; onChange: (id: HeaderThemeId | null) => void }) {
  return (
    <div className="space-y-6">
      <p className="text-xs text-stone-500">Changes the Campus Feed, Friends, and Whisper Wall banners at the top of the feed.</p>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Illustrated Headers</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Illustrated header style">
          <DefaultTile selected={value === null} onClick={() => onChange(null)} />
          {SCREEN_THEMES.map((theme) => (
            <ThumbnailTile
              key={theme.id}
              label={theme.label}
              description={theme.description}
              selected={value === theme.id}
              onClick={() => onChange(theme.id)}
              style={{ backgroundImage: `url(${theme.image})`, backgroundColor: theme.background }}
              aspect="aspect-[4/1]"
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Solid Colors</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Solid color header style">
          {SOLID_COLORS.map((color) => (
            <ThumbnailTile
              key={color.id}
              label={color.label}
              selected={value === color.id}
              onClick={() => onChange(color.id)}
              style={{ backgroundColor: color.hex }}
              aspect="aspect-[4/1]"
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Gradient Palettes</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Gradient header style">
          {GRADIENTS.map((gradient) => (
            <ThumbnailTile
              key={gradient.id}
              label={gradient.label}
              selected={value === gradient.id}
              onClick={() => onChange(gradient.id)}
              style={{ backgroundImage: gradient.css }}
              aspect="aspect-[4/1]"
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function DefaultTile({ selected, onClick }: { selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`overflow-hidden rounded-2xl border-2 text-left transition ${selected ? 'border-emerald-600' : 'border-stone-200 hover:border-emerald-300'}`}
    >
      <div className="flex aspect-[4/1] items-center justify-center bg-stone-100 text-xs text-stone-400">No theme</div>
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium text-stone-700">Default</span>
        {selected ? <span aria-hidden="true" className="text-emerald-600">✓</span> : null}
      </div>
    </button>
  );
}

function ThumbnailTile({
  label,
  description,
  selected,
  onClick,
  style,
  aspect,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  style: React.CSSProperties;
  aspect: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`overflow-hidden rounded-2xl border-2 text-left transition ${selected ? 'border-emerald-600' : 'border-stone-200 hover:border-emerald-300'}`}
    >
      <div className={`relative ${aspect} overflow-hidden bg-cover bg-center bg-stone-100`} style={style}>
        {selected ? (
          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs text-white" aria-hidden="true">
            ✓
          </span>
        ) : null}
      </div>
      <div className="px-3 py-2">
        <p className="text-xs font-semibold text-stone-800">{label}</p>
        {description ? <p className="mt-0.5 text-[11px] text-stone-500">{description}</p> : null}
      </div>
    </button>
  );
}
