'use client';

import { useEffect, useState } from 'react';

const RULES = [
  'Be kind and respectful',
  'No harassment or bullying',
  "Don't share personal information",
  'No sexual content or explicit content',
  'Keep it about campus life',
];

// Right-sidebar panel, additional functionality not in the official SRS.
// Also hosts the Campus Crush mention opt-out -- the most natural, most
// discoverable place for a privacy control next to the rules it relates
// to, rather than burying it in account settings.
export function CommunityGuidelines({ accessToken }: { accessToken: string }) {
  const [optOut, setOptOut] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    fetch('/api/whispers/opt-out', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => res.json())
      .then((body) => { if (!cancelled) setOptOut(Boolean(body.optOut)); })
      .catch(() => { if (!cancelled) setOptOut(false); });
    return () => { cancelled = true; };
  }, [accessToken]);

  async function toggle() {
    if (optOut === null || saving) return;
    setSaving(true);
    const next = !optOut;
    const res = await fetch('/api/whispers/opt-out', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ optOut: next }),
    });
    setSaving(false);
    if (res.ok) setOptOut(next);
  }

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-800">
        <span aria-hidden="true">🛡️</span> Community Guidelines
      </p>
      <ul className="mt-3 space-y-2 text-xs text-stone-600">
        {RULES.map((rule) => (
          <li key={rule} className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true">✓</span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 border-t border-stone-100 pt-3">
        <label className="flex items-start gap-2 text-xs text-stone-600">
          <input
            type="checkbox"
            checked={optOut ?? false}
            onChange={toggle}
            disabled={optOut === null || saving}
            className="mt-0.5 h-3.5 w-3.5"
          />
          <span>Don&apos;t let other students @mention me in Campus Crush guesses</span>
        </label>
      </div>

      <a href="#" onClick={(e) => e.preventDefault()} className="mt-3 inline-block text-xs font-semibold text-emerald-700 hover:text-emerald-800">
        Learn more →
      </a>
    </div>
  );
}
