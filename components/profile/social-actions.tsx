'use client';

import { useEffect, useState } from 'react';
import { Bookmark, Link as LinkIcon } from 'lucide-react';
import { accessToken } from '../../lib/account/session';
import styles from './profile.module.css';

export type SocialSummary = { follower_count: number; following_count: number; following: boolean };
export async function socialRequest(query: string, body?: Record<string, unknown>) {
  const token = await accessToken();
  if (!token) throw new Error('Please sign in again.');
  const response = await fetch(`/api/profiles/social${query}`, {
    method: body ? 'POST' : 'GET', cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to save your change. Please try again.');
  return data;
}

export function SavePostButton({ postId, onChange }: { postId: number; onChange?: (saved: boolean) => void }) {
  const [saved, setSaved] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setSaved(null); setError('');
    socialRequest(`?action=save_status&postId=${postId}`).then(data => { if (active) setSaved(data.saved); })
      .catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [postId, retry]);
  async function toggle() {
    if (busy || saved === null) return;
    setBusy(true); setError('');
    try {
      const data = await socialRequest('', { action: saved ? 'unsave' : 'save', postId });
      setSaved(data.saved); onChange?.(data.saved);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save this post.'); }
    finally { setBusy(false); }
  }
  return <div className={styles.saveControl}>
    <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={toggle} disabled={busy || saved === null} aria-pressed={saved ?? false}>
      <Bookmark fill={saved ? 'currentColor' : 'none'} />{busy ? 'Saving…' : saved ? 'Saved' : 'Save'}
    </button>
    {error && <p role="alert" className={styles.actionError}>{error} {saved === null && <button onClick={() => setRetry(value => value + 1)}>Retry</button>}</p>}
  </div>;
}

export function ShareProfile({ username, compact = false }: { username: string; compact?: boolean }) {
  const [message, setMessage] = useState('');
  async function share() {
    const url = new URL(`/students/${encodeURIComponent(username)}`, window.location.origin).href;
    try {
      if (navigator.share) await navigator.share({ title: `${username} on SocialU`, url });
      else { await navigator.clipboard.writeText(url); setMessage('Profile link copied.'); }
    } catch (reason) {
      if (reason instanceof Error && reason.name === 'AbortError') return;
      setMessage(`Copy your profile link: ${url}`);
    }
  }
  return <div className={styles.shareControl}>
    <button type="button" className={compact ? styles.dockButton : `${styles.button} ${styles.secondary}`} onClick={share}><LinkIcon />{compact ? 'Share' : 'Share profile'}</button>
    {message && <p role="status" className={styles.shareMessage}>{message}<button type="button" onClick={() => setMessage('')} aria-label="Dismiss share message">×</button></p>}
  </div>;
}
