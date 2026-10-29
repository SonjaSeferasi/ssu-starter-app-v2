'use client';

import { useEffect, useState } from 'react';
import { accessToken } from '../../lib/account/session';
import styles from './profile.module.css';

// Relocated from the Whisper Wall's Community Guidelines sidebar card
// (removed per explicit instruction) -- the underlying setting is
// unchanged (socialu.students.campus_crush_opt_out, enforced server-side
// in sync_whisper_mentions against both the suggestion dropdown AND
// manually-typed @mentions), only where a student controls it moved.
// The label's polarity is intentionally flipped from the old checkbox
// ("Don't let other students @mention me…", checked = opted out) to a
// positive framing ("Allow mentions…", checked = NOT opted out) per the
// new copy -- checked here always means optOut is false.
export function CampusCrushPrivacy() {
  const [optOut, setOptOut] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await accessToken();
      if (!token) return;
      try {
        const res = await fetch('/api/whispers/opt-out', { headers: { Authorization: `Bearer ${token}` } });
        const body = await res.json();
        if (!cancelled) setOptOut(Boolean(body.optOut));
      } catch {
        if (!cancelled) setOptOut(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle() {
    if (optOut === null || saving) return;
    setSaving(true);
    setError('');
    // Flip "allowed" (optOut === false) to its opposite: allowed -> not
    // allowed means optOut becomes true, and vice versa.
    const nextOptOut = optOut === false;
    try {
      const token = await accessToken();
      if (!token) throw new Error('Please sign in again.');
      const res = await fetch('/api/whispers/opt-out', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ optOut: nextOptOut }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to save your preference.');
      setOptOut(Boolean(body.optOut));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save your preference.');
    } finally {
      setSaving(false);
    }
  }

  const allowed = optOut === false;

  return (
    <div className={styles.settingsLogout}>
      <div>
        <h2>Privacy</h2>
        <p className={styles.hint}>
          Allow mentions in Campus Crush guesses
          <br />
          When on, other students can @mention you in their Whisper Wall Campus Crush guesses. When off, you can never be mentioned there, even if someone types your handle directly.
        </p>
        {error ? <p className={styles.hint} style={{ color: '#b91c1c' }}>{error}</p> : null}
      </div>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="checkbox"
          checked={allowed}
          onChange={toggle}
          disabled={optOut === null || saving}
          aria-label="Allow mentions in Campus Crush guesses"
        />
        <span>{allowed ? 'On' : 'Off'}</span>
      </label>
    </div>
  );
}
