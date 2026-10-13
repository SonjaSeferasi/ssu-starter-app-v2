'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AvatarAppearance, GameRoomData } from '../../lib/game-room';
import { activityEntrypoints, gameRoomSamples, sampleFaceStyles } from '../../lib/game-room';
import { useNavigationSession } from '../navigation/social-shell';
import { SessionNotice } from '../navigation/section-page';
import { AvatarPreview } from './avatar-preview';
import { ActivityArt } from './activity-art';
import styles from './game-room.module.css';

class GameRoomRequestError extends Error {
  constructor(message: string, public code?: string) { super(message); }
}

async function roomRequest(method = 'GET', body?: AvatarAppearance, signal?: AbortSignal): Promise<GameRoomData> {
  const response = await fetch('/api/game-room', { method, headers: { Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`, 'Content-Type': 'application/json' }, cache: 'no-store', body: body ? JSON.stringify(body) : undefined, signal });
  const data = await response.json();
  if (!response.ok) throw new GameRoomRequestError(data.error || 'The Game Room could not be loaded.', data.code);
  return data;
}

export function GameRoom() {
  const session = useNavigationSession();
  return session === 'signed-in' ? <GameRoomContent /> : <SessionNotice state={session} />;
}

export function GameRoomContent({ preview = false }: { preview?: boolean }) {
  const [room, setRoom] = useState<GameRoomData | null>(preview ? gameRoomSamples : null);
  const [appearance, setAppearance] = useState<AvatarAppearance | null>(preview ? gameRoomSamples.appearance : null);
  const [editor, setEditor] = useState<'face' | 'outfit' | null>(null);
  const [faceGroup, setFaceGroup] = useState<'male' | 'female'>('male');
  const [loading, setLoading] = useState(!preview);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [retrySelection, setRetrySelection] = useState<AvatarAppearance | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [previewFallback, setPreviewFallback] = useState(false);
  const temporaryPreview = preview || previewFallback;

  useEffect(() => {
    if (preview) return;
    const controller = new AbortController();
    setLoading(true); setError('');
    void roomRequest('GET', undefined, controller.signal).then(data => {
      if (!controller.signal.aborted) {
        setRoom(data); setAppearance(data.appearance); setPreviewFallback(false);
        setRetrySelection(null); setSaveMessage('');
      }
    }).catch(failure => {
      if (controller.signal.aborted) return;
      // Only a missing Game Room integration allows the existing public design
      // samples. Permission, session and other network failures stay errors.
      if (failure instanceof GameRoomRequestError && failure.code === 'GAME_ROOM_SETUP_REQUIRED' && (!room || previewFallback)) {
        setRoom(gameRoomSamples); setAppearance(gameRoomSamples.appearance);
        setPreviewFallback(true); setRetrySelection(null); setSaveMessage('');
      } else { setError(failure.message); }
    })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [preview, attempt]);

  async function selectAppearance(selected: AvatarAppearance) {
    if (saving) return;
    setAppearance(selected); setRetrySelection(null);
    if (temporaryPreview) { setRoom(current => current ? { ...current, appearance: selected } : current); setSaveMessage('Sample preview updated. No account data was saved.'); return; }
    setSaving(true); setSaveMessage('Saving your appearance…');
    try {
      const saved = await roomRequest('PUT', selected);
      setRoom(saved); setAppearance(saved.appearance); setSaveMessage('Appearance saved.');
    } catch {
      // A lost response may have committed; do not claim a confirmed rejection.
      setAppearance(room?.appearance || null); setRetrySelection(selected);
      setSaveMessage('The save could not be confirmed. Showing your last confirmed appearance. Retry the same selection.');
    } finally { setSaving(false); }
  }

  const available = room?.activities.filter(activity => activity.included) || [];
  return <main className={styles.page}>
    <header className={styles.pageHeader}><p className={styles.eyebrow}>A little break between classes</p><h1>Game Room</h1><p>Play, explore, and make your character feel like you.</p></header>
    {temporaryPreview && !error && <aside className={styles.previewNotice} role="status">
      <p><strong>Game Room preview.</strong> Sample faces and outfits are available to try. Changes are temporary and are not saved to your account.</p>
      {!preview && <button className={styles.primaryButton} onClick={() => setAttempt(value => value + 1)} disabled={loading}>Retry account connection</button>}
    </aside>}
    {loading ? <section className={styles.notice} role="status">Opening your Game Room…</section> : error ? <section className={styles.notice} role="alert"><h2>We couldn’t open your Game Room</h2><p>{error}</p><button className={styles.primaryButton} onClick={() => setAttempt(attempt+1)}>Retry</button></section> : <div className={styles.roomGrid}>
      <section className={styles.avatarPanel} aria-labelledby="avatar-title">
        <div className={styles.panelHeading}><span className={styles.smallIcon} aria-hidden="true">✦</span><div><h2 id="avatar-title">Customize your avatar</h2><p>A little expression of you.</p></div></div>
        <div className={styles.avatarStage}><div className={styles.avatarHalo} /><AvatarPreview appearance={appearance} outfits={room?.outfits || []} faces={room?.faces || []} /><span className={styles.avatarLabel}>{temporaryPreview ? 'Campus collection · sample' : appearance ? 'Your current appearance' : 'Avatar collection awaiting setup'}</span></div>
        <div className={styles.editActions}><button aria-pressed={editor === 'face'} onClick={() => setEditor(editor === 'face' ? null : 'face')}>☺ <span>Face</span></button><button aria-pressed={editor === 'outfit'} onClick={() => setEditor(editor === 'outfit' ? null : 'outfit')}>♧ <span>Outfits</span></button></div>
        {editor && <section className={styles.editor} aria-label={editor === 'face' ? 'Choose a default face' : 'Choose a complete outfit'}>
          <h3>{editor === 'face' ? 'Choose a default face' : 'Your complete outfits'}</h3>
          {temporaryPreview && editor === 'face' && <div className={styles.faceGroups} aria-label="Browse avatar styles">
            {(['male', 'female'] as const).map(group => <button key={group} aria-pressed={faceGroup === group} onClick={() => setFaceGroup(group)}>{group === 'male' ? 'Male styles' : 'Female styles'}</button>)}
          </div>}
          <div className={styles.options}>
            {(editor === 'face' ? room?.faces.filter(face => !temporaryPreview || sampleFaceStyles[face.assetKey]?.group === faceGroup) : room?.outfits)?.map((item, index) => {
              const selected = editor === 'face' ? appearance?.faceId === item.id : appearance?.outfitId === item.id;
              const option = { outfitId: editor === 'outfit' ? item.id : appearance?.outfitId || room?.outfits[0]?.id || '', faceId: editor === 'face' ? item.id : appearance ? appearance.faceId : room?.faces.find(face => face.initial)?.id || null };
              const label = 'name' in item ? item.name : sampleFaceStyles[item.assetKey]?.label || `Face ${index+1}`;
              return <button className={styles.option} key={item.id} aria-pressed={selected} disabled={saving || !option.outfitId || (!option.faceId && !appearance)} onClick={() => void selectAppearance(option)}><AvatarPreview small portrait={editor === 'face'} appearance={option} outfits={room?.outfits || []} faces={room?.faces || []} /><span>{label}</span>{selected && <span className={styles.selectedMark} aria-hidden="true">✓</span>}</button>;
            })}
          </div>
          {!(editor === 'face' ? room?.faces.length : room?.outfits.length) && <p>No {editor === 'face' ? 'default faces' : 'complete outfits'} are available yet.</p>}
          {editor === 'face' && <p className={styles.editorNote}>Photograph cropping and camera capture are coming in a later build.</p>}
        </section>}
        <div className={styles.saveStatus} role={retrySelection ? 'alert' : 'status'}>{saveMessage}{retrySelection && <button onClick={() => void selectAppearance(retrySelection)} disabled={saving}>Retry</button>}</div>
      </section>
      <div className={styles.activityColumn}>
        <section className={styles.participation} aria-labelledby="participation-title"><span className={styles.streakIcon} aria-hidden="true">♨</span><div><h2 id="participation-title">One shared participation streak</h2><p>Game 1, DormSpace, and Wordle when available.</p><p className={styles.pendingStatus}>Participation status will appear here when connected.</p></div></section>
        <section className={styles.activities} aria-labelledby="activity-title"><div className={styles.activityHeading}><h2 id="activity-title">Pick your next break</h2><span>{available.length} included activities</span></div>
          {available.map(activity => <article className={styles.activityCard} key={activity.code}><div className={styles.activityImage}><ActivityArt code={activity.code} /></div><div className={styles.activityCopy}><h3>{activity.name}</h3><p>{activity.description}</p><span className={styles.activityMeta}>{activity.code === 'game1' ? 'Three required levels' : activity.code === 'dormspace' ? 'Your campus space' : 'Daily five-letter puzzle'}</span></div><div className={styles.activityAction}>
            {activityEntrypoints[activity.code].href ? <Link href={activityEntrypoints[activity.code].href!} aria-label={activityEntrypoints[activity.code].action + ' ' + activity.name}>{activityEntrypoints[activity.code].action} <span aria-hidden="true">›</span></Link>
              : <><button disabled aria-label={activityEntrypoints[activity.code].action + ' ' + activity.name + ': not connected'}>{activityEntrypoints[activity.code].action} <span aria-hidden="true">›</span></button><span>{activityEntrypoints[activity.code].unavailable}</span></>}
          </div></article>)}
          {!available.length && <p className={styles.editorNote}>Included activities have not been configured yet.</p>}
        </section>
        <p className={styles.roomFootnote}>You can play with the default character. Customizing your avatar is always optional.</p>
      </div>
    </div>}
  </main>;
}
