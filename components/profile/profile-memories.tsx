'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Heart, ImagePlus, Plus, Smile, Sparkles, Star, Sun, X, type LucideIcon } from 'lucide-react';
import type { StudentProfile } from '../../lib/profile';
import { MAX_MEMORIES, MEMORY_DOODLES, type MemoryDoodle, type ProfileMemory } from '../../lib/profile-memories';
import { accessToken } from '../../lib/account/session';
import { profileFetch } from './profile-view';
import { handwriting } from './handwriting';
import styles from './profile-memories.module.css';

const doodleIcons: Record<Exclude<MemoryDoodle, 'none'>, LucideIcon> = { heart: Heart, sparkles: Sparkles, star: Star, sun: Sun, smile: Smile };
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function Doodle({ kind, size = 18 }: { kind: MemoryDoodle; size?: number }) {
  if (kind === 'none') return null;
  const Icon = doodleIcons[kind];
  return <Icon className={styles.doodle} data-doodle={kind} size={size} strokeWidth={1.8} aria-hidden="true" />;
}

export function ProfileMemories({ profile }: { profile: StudentProfile }) {
  const [memories, setMemories] = useState<ProfileMemory[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'preview' | 'error'>('loading');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setStatus('loading');
    profileFetch(`/api/profiles/memories?username=${encodeURIComponent(profile.username)}`).then(({ response, data }) => {
      if (!response.ok) throw new Error();
      if (active) { setMemories(data.memories); setStatus(data.available ? 'ready' : 'preview'); }
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [profile.username, retry]);

  async function remove(memory: ProfileMemory) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const { response, data } = await profileFetch('/api/profiles/memories', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memoryId: memory.id }) });
      if (!response.ok) throw new Error(data.error || 'Unable to remove this memory.');
      setMemories(data.memories);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to remove this memory.'); }
    finally { setBusy(false); }
  }

  if (!profile.is_own && !memories.length) return null;
  return <section className={styles.memories} aria-labelledby="pinned-memories-title">
    <header className={styles.heading}>
      <h2 id="pinned-memories-title">Pinned memories</h2>
      <span className={styles.stars} aria-hidden="true"><Star /><Star /></span>
    </header>
    {status === 'loading' ? <p className={styles.hint} role="status">Loading memories…</p> : <ul className={styles.board}>
      {memories.map(memory => <li key={memory.id} className={styles.polaroid}>
        {memory.url ? <img src={memory.url} alt={memory.caption || `${profile.name}’s pinned memory`} /> : <span className={styles.missing}>Photo unavailable</span>}
        <p className={handwriting.className}>{memory.caption}<Doodle kind={memory.doodle} /></p>
        {profile.is_own && <button type="button" className={styles.remove} disabled={busy} aria-label={`Remove memory${memory.caption ? ` “${memory.caption}”` : ''}`} onClick={() => remove(memory)}><X size={14} /></button>}
      </li>)}
      {profile.is_own && memories.length < MAX_MEMORIES && <li>
        <button type="button" className={styles.addTile} disabled={status !== 'ready'} onClick={() => setAdding(true)}>
          <span><Plus size={22} /></span>Add a memory
        </button>
      </li>}
    </ul>}
    {status === 'preview' && profile.is_own && <p className={styles.hint}>Preview · pinning memories isn’t available yet.</p>}
    {status === 'error' && <p className={styles.error}>Memories couldn’t load. <button onClick={() => setRetry(value => value + 1)}>Retry</button></p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {adding && <MemoryEditor onClose={() => setAdding(false)} onSaved={value => { setMemories(value); setAdding(false); }} />}
  </section>;
}

function MemoryEditor({ onClose, onSaved }: { onClose: () => void; onSaved: (memories: ProfileMemory[]) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [doodle, setDoodle] = useState<MemoryDoodle>('heart');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const element = dialog.current; const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal(); document.body.style.overflow = 'hidden';
    return () => { element?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  useEffect(() => {
    if (!photo) { setPreview(null); return; }
    const url = URL.createObjectURL(photo); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (!photo) { setError('Choose a photo to pin.'); return; }
    setSaving(true); setError('');
    try {
      // multipart: let the browser set the boundary, so this bypasses profileFetch's JSON-friendly defaults.
      const token = await accessToken();
      if (!token) throw new Error('Please sign in again.');
      const form = new FormData(); form.set('photo', photo); form.set('caption', caption); form.set('doodle', doodle);
      const response = await fetch('/api/profiles/memories', { method: 'POST', cache: 'no-store', headers: { Authorization: `Bearer ${token}` }, body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to pin this memory.');
      onSaved(data.memories);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to pin this memory.'); setSaving(false); }
  }

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="memory-editor-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <form onSubmit={save} aria-busy={saving}>
      <header><div><p>PIN A MEMORY</p><h2 id="memory-editor-title">A little moment to keep</h2></div><button type="button" className={styles.close} aria-label="Close" disabled={saving} onClick={onClose}><X size={20} /></button></header>
      <div className={styles.editorBody}>
        <label className={`${styles.polaroid} ${styles.draft}`}>
          {preview ? <img src={preview} alt="Selected memory photo" /> : <span className={styles.pick}><ImagePlus size={28} />Choose a photo</span>}
          <input type="file" accept={PHOTO_TYPES.join(',')} disabled={saving} className={styles.srOnly} onChange={event => {
            const file = event.target.files?.[0]; event.target.value = '';
            if (!file) return;
            if (!PHOTO_TYPES.includes(file.type) || !file.size || file.size > 5_000_000) { setError('Choose a JPG, PNG, or WebP photo up to 5 MB.'); return; }
            setPhoto(file); setError('');
          }} />
          <p className={handwriting.className}>{caption || 'Your caption'}<Doodle kind={doodle} /></p>
        </label>
        <div className={styles.fields}>
          <label>Caption <small>{caption.length}/40</small><input value={caption} maxLength={40} disabled={saving} placeholder="Campus days" onChange={event => setCaption(event.target.value)} /></label>
          <fieldset disabled={saving}><legend>Doodle</legend><div className={styles.doodles}>{MEMORY_DOODLES.map(item => {
            const Icon = item === 'none' ? X : doodleIcons[item];
            return <button key={item} type="button" aria-label={item === 'none' ? 'No doodle' : `${item} doodle`} aria-pressed={doodle === item} onClick={() => setDoodle(item)}><Icon size={17} aria-hidden="true" /></button>;
          })}</div></fieldset>
          <p className={styles.hint}>Visible to people who can view your profile. JPG, PNG or WebP, up to 5 MB.</p>
        </div>
      </div>
      <footer>
        <div aria-live="polite">{error && <p className={styles.error} role="alert">{error}</p>}</div>
        <button type="button" className={styles.secondary} disabled={saving} onClick={onClose}>Cancel</button>
        <button type="submit" className={styles.primary} disabled={saving || !photo}>{saving ? 'Pinning…' : 'Pin it'}</button>
      </footer>
    </form>
  </dialog>;
}
