'use client';
import { useEffect, useRef, useState } from 'react';
import { dormRequest } from '../api';
import { MAX_MUSIC_BYTES, type DormMusic } from '../../../lib/dormspace-music';
import styles from '../dormspace-3d.module.css';

export function MusicPanel({ owner, connectionId }: { owner: string; connectionId: string | null }) {
  const [music, setMusic] = useState<DormMusic | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(30);
  const audio = useRef<HTMLAudioElement>(null);
  const source = useRef<string | null>(null);
  const current = useRef<DormMusic | null>(null);
  const active = useRef(true);
  const loading = useRef(false);
  const uploading = useRef(false);
  const sequence = useRef(0);
  const path = `/api/dorm/music?owner=${encodeURIComponent(owner)}&connection=${encodeURIComponent(connectionId ?? '')}`;

  function stop() {
    sequence.current++;
    if (audio.current) { audio.current.pause(); audio.current.removeAttribute('src'); audio.current.load(); }
    if (source.current) URL.revokeObjectURL(source.current);
    source.current = null; setPlaying(false);
  }
  function accept(next: DormMusic) {
    if (next.track?.version !== current.current?.track?.version) stop();
    current.current = next; setMusic(next);
  }
  useEffect(() => {
    active.current = true;
    const abort = new AbortController();
    async function load() {
      if (!connectionId || loading.current || uploading.current) return;
      loading.current = true;
      const result = await dormRequest<DormMusic>(path, { signal: abort.signal });
      loading.current = false;
      if (!active.current || abort.signal.aborted) return;
      if (result.ok) { accept(result.data); setError(''); }
      else { stop(); setMusic(null); current.current = null; setError(result.error); }
    }
    void load(); const timer = window.setInterval(() => void load(), 5000);
    const sessionChanged = () => { stop(); void load(); };
    window.addEventListener('socialu-session-changed', sessionChanged);
    return () => {
      active.current = false; abort.abort(); window.clearInterval(timer);
      window.removeEventListener('socialu-session-changed', sessionChanged); stop();
    };
  }, [path, connectionId]); // The parent remounts this component on every room/connection change.

  async function listen() {
    if (playing) { audio.current?.pause(); setPlaying(false); return; }
    const track = current.current?.track;
    if (!track || !audio.current || loading.current) return;
    const seq = ++sequence.current;
    loading.current = true; setError('');
    try {
      if (!source.current) {
        const response = await fetch(track.url, { credentials: 'omit', signal: AbortSignal.timeout(45_000) });
        if (!response.ok) throw new Error('The soundtrack could not load. Try listening again.');
        const blob = await response.blob();
        if (!active.current || seq !== sequence.current) return;
        if (blob.size > MAX_MUSIC_BYTES) throw new Error('This soundtrack is too large.');
        source.current = URL.createObjectURL(blob); audio.current!.src = source.current;
      }
      if (!active.current || seq !== sequence.current) return;
      audio.current!.volume = volume / 100;
      await audio.current!.play();
      if (active.current && seq === sequence.current) setPlaying(true);
    } catch (e) {
      if (active.current && seq === sequence.current) { setPlaying(false); setError(e instanceof Error ? e.message : 'Tap Listen again to enable music.'); }
    } finally { loading.current = false; }
  }
  async function upload(file: File | undefined) {
    if (!file || uploading.current) return;
    if (!/\.mp3$/i.test(file.name) || file.size < 32 || file.size > MAX_MUSIC_BYTES) { setError('Choose an MP3 file up to 20 MB.'); return; }
    uploading.current = true; setBusy(true); setError('');
    try {
      const started = await dormRequest<{ uploadUrl: string; storageKey: string }>(path, { method: 'POST', body: JSON.stringify({ action: 'upload', size: file.size }) });
      if (!started.ok) throw new Error(started.error);
      const response = await fetch(started.data.uploadUrl, {
        method: 'PUT', headers: { 'Content-Type': 'audio/mpeg', 'x-upsert': 'false', ...(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY } : {}) },
        body: file, signal: AbortSignal.timeout(120_000),
      });
      if (!response.ok) throw new Error('The MP3 upload did not finish. Please retry.');
      const saved = await dormRequest<DormMusic>(path, { method: 'POST', body: JSON.stringify({ action: 'save', storageKey: started.data.storageKey, title: file.name.replace(/\.mp3$/i, '').slice(0, 120) || 'Dorm soundtrack' }) });
      if (!saved.ok) throw new Error(saved.error);
      if (active.current) accept(saved.data);
    } catch (e) { if (active.current) setError(e instanceof Error ? e.message : 'The soundtrack was not saved.'); }
    finally { uploading.current = false; if (active.current) setBusy(false); }
  }
  async function remove() {
    if (uploading.current) return;
    uploading.current = true; setBusy(true); setError('');
    const result = await dormRequest<DormMusic>(path, { method: 'POST', body: JSON.stringify({ action: 'remove' }) });
    if (active.current) { if (result.ok) accept(result.data); else setError(result.error); setBusy(false); }
    uploading.current = false;
  }
  return <details className={styles.musicPanel} onKeyDown={e => e.stopPropagation()}>
    <summary className={styles.button}>Dorm music{playing ? ' · Playing' : ''}</summary>
    <div className={styles.musicControls}>
      <h3>{owner}’s soundtrack</h3>
      <audio ref={audio} loop preload="none" onError={() => { setPlaying(false); setError('This MP3 could not play. Try uploading another MP3.'); }} />
      <p>{music?.track?.title ?? (connectionId ? 'No soundtrack uploaded.' : 'Connecting to this room…')}</p>
      {music?.track ? <>
        <button type="button" className={styles.button} onClick={() => void listen()}>{playing ? 'Pause music' : 'Listen to music'}</button>
        <label>Music volume <input aria-label="Music volume" type="range" min="0" max="100" value={volume} onChange={e => { const next = Number(e.target.value); setVolume(next); if (audio.current) audio.current.volume = next / 100; }} /></label>
      </> : null}
      {music?.isOwner ? <>
        <label>Upload your dorm MP3 (up to 20 MB)
          <input aria-label="Upload dorm MP3" type="file" accept=".mp3,audio/mpeg" disabled={busy} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        {music.track ? <button type="button" className={styles.button} disabled={busy} onClick={() => void remove()}>Remove soundtrack</button> : null}
        <p className={styles.hint}>Upload music you have permission to share with your room visitors.</p>
      </> : null}
      {busy ? <p role="status">Uploading and checking your MP3…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <p className={styles.hint}>Music starts only when you choose Listen. Volume affects only you.</p>
    </div>
  </details>;
}
