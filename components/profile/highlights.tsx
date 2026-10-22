'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import type { FeedPost } from '../feed/types';
import type { StudentProfile } from '../../lib/profile';
import { profileFetch } from './profile-view';
import styles from './profile.module.css';

type Highlight = { highlightId: number; title: string; posts: FeedPost[] };

function cover(highlight: Highlight) {
  return highlight.posts.find(post => post.photos.length)?.photos[0].url ?? null;
}

function Dialog({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return <div className={styles.backdrop} onClick={onClose}>
    <div className={styles.highlightDialog} role="dialog" aria-modal="true" aria-label={label} onClick={event => event.stopPropagation()}>
      <div className={styles.viewerAuthor}>
        <span>{label}</span>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close" autoFocus><X size={18} /></button>
      </div>
      {children}
    </div>
  </div>;
}

function PostTiles({ posts, selected, onPick }: { posts: FeedPost[]; selected?: Set<number>; onPick: (post: FeedPost) => void }) {
  return <div className={`${styles.grid} ${styles.highlightGrid}`}>
    {posts.filter(post => post.photos.length > 0).map(post => <button type="button" key={post.postId} className={styles.tile} onClick={() => onPick(post)} aria-pressed={selected ? selected.has(post.postId) : undefined}
      aria-label={post.textContent ? post.textContent.slice(0, 60) : 'Photo post'}>
      <img src={post.photos[0].url} alt="" />
      {selected?.has(post.postId) && <span className={styles.tilePicked} aria-hidden="true"><Check /></span>}
    </button>)}
  </div>;
}

function NewHighlight({ onClose, onSaved }: { onClose: () => void; onSaved: (highlights: Highlight[]) => void }) {
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [title, setTitle] = useState('');
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    profileFetch('/api/profiles/content?category=posts')
      .then(({ response, data }) => { if (!response.ok) throw new Error(data.error || 'Unable to load your posts.'); setPosts((data.posts as FeedPost[]).filter(post => post.photos.length > 0)); })
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Unable to load your posts.'));
  }, []);

  const pictureCount = (posts ?? []).filter(post => picked.has(post.postId)).reduce((total, post) => total + post.photos.length, 0);

  function toggle(post: FeedPost) {
    if (!picked.has(post.postId) && pictureCount + post.photos.length > 30) {
      setError('Each highlight can contain up to 30 pictures.');
      return;
    }
    setError('');
    setPicked(current => { const next = new Set(current); if (next.has(post.postId)) next.delete(post.postId); else next.add(post.postId); return next; });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const { response, data } = await profileFetch('/api/profiles/highlights', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', title, postIds: Array.from(picked) }),
      });
      if (!response.ok) throw new Error(data.error || 'Unable to save this highlight.');
      onSaved(data.highlights);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save this highlight.'); setBusy(false); }
  }

  return <Dialog label="New highlight" onClose={onClose}>
    <form onSubmit={save} className={styles.highlightForm}>
      <label className={styles.fieldLabel} htmlFor="highlight-title">Name</label>
      <input id="highlight-title" className={styles.textInput} value={title} onChange={event => setTitle(event.target.value)} maxLength={30} placeholder="Coffee breaks" required />
      <p className={styles.fieldLabel}>Choose photo posts · {pictureCount}/30 pictures</p>
      {!posts && !error ? <div className={styles.skeleton} style={{ height: 120 }} aria-busy="true" />
        : posts && !posts.length ? <p className={styles.hint}>Share a photo post first, then add it to a highlight.</p>
        : posts && <PostTiles posts={posts} selected={picked} onPick={toggle} />}
      {error && <p className={`${styles.notice} ${styles.error}`} role="alert">{error}</p>}
      <button type="submit" className={styles.button} disabled={busy || !title.trim() || !picked.size || pictureCount > 30}>{busy ? 'Saving…' : 'Create highlight'}</button>
    </form>
  </Dialog>;
}

function HighlightViewer({ highlight, own, onClose, onDeleted }: { highlight: Highlight; own: boolean; onClose: () => void; onDeleted: (highlights: Highlight[]) => void }) {
  const [open, setOpen] = useState<FeedPost | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function remove() {
    if (!window.confirm(`Delete the "${highlight.title}" highlight? Your posts stay on your profile.`)) return;
    setBusy(true); setError('');
    try {
      const { response, data } = await profileFetch('/api/profiles/highlights', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', highlightId: highlight.highlightId }),
      });
      if (!response.ok) throw new Error(data.error || 'Unable to delete this highlight.');
      onDeleted(data.highlights);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to delete this highlight.'); setBusy(false); }
  }

  if (open) return <Dialog label={highlight.title} onClose={() => setOpen(null)}>
    <div className={styles.highlightPhotos}>{open.photos.map(photo => <img key={photo.url} src={photo.url} alt="Highlight photo" />)}</div>
  </Dialog>;
  return <Dialog label={highlight.title} onClose={onClose}>
    {highlight.posts.length ? <PostTiles posts={highlight.posts} onPick={setOpen} /> : <p className={styles.hint}>The posts in this highlight were deleted.</p>}
    {error && <p className={`${styles.notice} ${styles.error}`} role="alert">{error}</p>}
    {own && <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={remove} disabled={busy} style={{ marginTop: 16 }}><Trash2 />Delete highlight</button>}
  </Dialog>;
}

// Highlight circles above the profile tabs. Hidden on another student's profile when they have none.
export function ProfileHighlights({ profile }: { profile: StudentProfile }) {
  const [highlights, setHighlights] = useState<Highlight[] | null>(null);
  const [open, setOpen] = useState<Highlight | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    setHighlights(null);
    profileFetch(profile.is_own ? '/api/profiles/highlights' : `/api/profiles/highlights?username=${encodeURIComponent(profile.username)}`)
      .then(({ response, data }) => { if (active) setHighlights(response.ok ? data.highlights : []); })
      .catch(() => { if (active) setHighlights([]); });
    return () => { active = false; };
  }, [profile.is_own, profile.username]);

  if (!highlights || (!profile.is_own && !highlights.length)) return null;
  return <>
    <ul className={styles.highlights} aria-label="Highlights">
      {highlights.map(highlight => {
        const image = cover(highlight);
        return <li key={highlight.highlightId}>
          <button type="button" className={styles.highlight} onClick={() => setOpen(highlight)}>
            <span className={styles.highlightCircle}>{image ? <img src={image} alt="" /> : <span className={styles.highlightLetter}>{highlight.title[0]?.toUpperCase()}</span>}</span>
            <span className={styles.highlightTitle}>{highlight.title}</span>
          </button>
        </li>;
      })}
      {profile.is_own && <li>
        <button type="button" className={styles.highlight} onClick={() => setCreating(true)}>
          <span className={`${styles.highlightCircle} ${styles.highlightNew}`}><Plus /></span>
          <span className={styles.highlightTitle}>New</span>
        </button>
      </li>}
    </ul>
    {creating && <NewHighlight onClose={() => setCreating(false)} onSaved={list => { setHighlights(list); setCreating(false); }} />}
    {open && <HighlightViewer highlight={open} own={profile.is_own} onClose={() => setOpen(null)} onDeleted={list => { setHighlights(list); setOpen(null); }} />}
  </>;
}
