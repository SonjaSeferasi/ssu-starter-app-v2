'use client';

import { storedAccessToken } from '../../lib/account/session';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AvatarAppearance, GameRoomData } from '../../lib/game-room';
import { activityEntrypoints, gameRoomSamples, sampleFaceStyles, faceDetails, shirtColors, pantsColors } from '../../lib/game-room';
import { useNavigationSession } from '../navigation/social-shell';
import { SessionNotice } from '../navigation/section-page';
import { AvatarPreview } from './avatar-preview';
import { ActivityArt } from './activity-art';
import styles from './game-room.module.css';

class GameRoomRequestError extends Error {
  constructor(message: string, public code?: string) { super(message); }
}

async function roomRequest(method = 'GET', body?: AvatarAppearance, signal?: AbortSignal): Promise<GameRoomData> {
  const response = await fetch('/api/game-room', { method, headers: { Authorization: `Bearer ${storedAccessToken() || ''}`, 'Content-Type': 'application/json' }, cache: 'no-store', body: body ? JSON.stringify(body) : undefined, signal });
  const data = await response.json();
  if (!response.ok) throw new GameRoomRequestError(data.error || 'The Game Room could not be loaded.', data.code);
  return data;
}

export function GameRoom() {
  const session = useNavigationSession();
  return session === 'signed-in' ? <GameRoomContent /> : <SessionNotice state={session} />;
}

function completeAppearance(data: GameRoomData, value: AvatarAppearance | null): AvatarAppearance | null {
  if (!value) return null;
  const key = data.faces.find(face => face.id === value.faceId)?.assetKey;
  return { ...value, faceStyle: value.faceStyle || (key === 'sample-glasses' ? 'square-glasses' : 'natural'),
    shirtColor: value.shirtColor || (data.outfits.find(outfit => outfit.id === value.outfitId)?.assetKey === 'sample-study' ? 'cream' : data.outfits.find(outfit => outfit.id === value.outfitId)?.assetKey === 'sample-weekend' ? 'green' : 'navy'), pantsColor: value.pantsColor || 'denim' };
}

export function GameRoomContent({ preview = false }: { preview?: boolean }) {
  const [room, setRoom] = useState<GameRoomData | null>(preview ? { ...gameRoomSamples, appearance: completeAppearance(gameRoomSamples, gameRoomSamples.appearance) } : null);
  const [appearance, setAppearance] = useState<AvatarAppearance | null>(preview ? completeAppearance(gameRoomSamples, gameRoomSamples.appearance) : null);
  const [editor, setEditor] = useState<'hair' | 'face' | 'outfit' | null>(null);
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
        const saved = completeAppearance(data, data.appearance); setRoom({ ...data, appearance: saved }); setAppearance(saved); setPreviewFallback(false);
        setRetrySelection(null); setSaveMessage('');
      }
    }).catch(failure => {
      if (controller.signal.aborted) return;
      // Only a missing Game Room integration allows the existing public design
      // samples. Permission, session and other network failures stay errors.
      if (failure instanceof GameRoomRequestError && failure.code === 'GAME_ROOM_SETUP_REQUIRED' && (!room || previewFallback)) {
        const sample = completeAppearance(gameRoomSamples, gameRoomSamples.appearance); setRoom({ ...gameRoomSamples, appearance: sample }); setAppearance(sample);
        setPreviewFallback(true); setRetrySelection(null); setSaveMessage('');
      } else { setError(failure.message); }
    })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [preview, attempt]);

  function editAppearance(change: Partial<AvatarAppearance>) {
    if (saving || !room) return;
    const current = appearance || completeAppearance(room, { outfitId: room.outfits[0]?.id || '', faceId: room.faces.find(face => face.initial)?.id || room.faces[0]?.id || null });
    setAppearance({ ...current!, ...change }); setRetrySelection(null); setSaveMessage('Unsaved changes');
  }

  async function saveAvatar() {
    if (saving || !appearance) return;
    if (temporaryPreview) { setSaveMessage('This is a design preview. Sign in to save an avatar to your account.'); return; }
    const selected = { ...appearance };
    setSaving(true); setRetrySelection(null); setSaveMessage('Saving your avatar…');
    try {
      const saved = await roomRequest('PUT', selected);
      const confirmed = completeAppearance(saved, saved.appearance);
      setRoom({ ...saved, appearance: confirmed }); setAppearance(confirmed); setSaveMessage('Avatar saved.');
    } catch (failure) {
      setRetrySelection(selected);
      setSaveMessage(failure instanceof Error ? failure.message + ' Your changes are still here; try saving again.' : 'The save could not be confirmed. Your changes are still here.');
    } finally { setSaving(false); }
  }

  const selectedFace = room?.faces.find(face => face.id === appearance?.faceId);
  const bodyStyle = sampleFaceStyles[selectedFace?.assetKey || '']?.group || 'male';
  const hairOptions = room?.faces.filter(face => sampleFaceStyles[face.assetKey]?.group === bodyStyle && face.assetKey !== 'sample-glasses') || [];
  const dirty = JSON.stringify(appearance) !== JSON.stringify(room?.appearance || null);
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
        <div className={styles.avatarStage}><div className={styles.avatarHalo} /><AvatarPreview appearance={appearance} outfits={room?.outfits || []} faces={room?.faces || []} /><span className={styles.avatarLabel}>{temporaryPreview ? 'Campus collection · sample' : appearance ? (dirty ? 'Previewing your changes' : 'Your saved avatar') : 'Avatar collection awaiting setup'}</span></div>
        <div className={styles.bodyChoices} role="group" aria-label="Avatar body style">
          {(['male','female'] as const).map(group => {
            const availableFace = room?.faces.find(face => sampleFaceStyles[face.assetKey]?.group === group && face.assetKey !== 'sample-glasses');
            return <button key={group} aria-pressed={bodyStyle === group} disabled={saving || !availableFace} onClick={() => availableFace && bodyStyle !== group && editAppearance({ faceId: availableFace.id })}>{group === 'male' ? 'Male' : 'Female'}</button>;
          })}
        </div>
        <div className={styles.editActions}>
          {(['hair','face','outfit'] as const).map(tab => <button key={tab} aria-pressed={editor === tab} disabled={saving} onClick={() => setEditor(editor === tab ? null : tab)}>{tab === 'hair' ? 'Hair' : tab === 'face' ? 'Face' : 'Outfit'}</button>)}
        </div>
        {editor && <section className={styles.editor} aria-label={editor === 'hair' ? 'Choose a hairstyle' : editor === 'face' ? 'Choose face details' : 'Customize your outfit'}>
          <h3>{editor === 'hair' ? 'Choose your hairstyle' : editor === 'face' ? 'Choose your face details' : 'Customize your outfit'}</h3>
          {editor === 'hair' && <div className={styles.options}>{hairOptions.map(face => <button key={face.id} aria-label={sampleFaceStyles[face.assetKey].label} className={styles.option} aria-pressed={appearance?.faceId === face.id || (selectedFace?.assetKey === 'sample-glasses' && face.assetKey === 'sample-smile')} disabled={saving} onClick={() => editAppearance({ faceId: face.id })}>
            <AvatarPreview small portrait appearance={{ ...appearance!, faceId: face.id, faceStyle: 'natural' }} outfits={room?.outfits || []} faces={room?.faces || []} /><span>{sampleFaceStyles[face.assetKey].label}</span>
          </button>)}</div>}
          {editor === 'face' && <div className={styles.options}>{faceDetails.map(detail => <button key={detail.id} aria-label={detail.name} className={styles.option} aria-pressed={appearance?.faceStyle === detail.id} disabled={saving} onClick={() => editAppearance({ faceStyle: detail.id })}>
            <AvatarPreview small portrait appearance={{ ...appearance!, faceStyle: detail.id }} outfits={room?.outfits || []} faces={room?.faces || []} /><span>{detail.name}</span>
          </button>)}</div>}
          {editor === 'outfit' && <>
            <p className={styles.editorNote}>Your available outfits</p>
            <div className={styles.options}>{room?.outfits.map(outfit => <button key={outfit.id} aria-label={outfit.name} className={styles.option} aria-pressed={appearance?.outfitId === outfit.id} disabled={saving} onClick={() => editAppearance({ outfitId: outfit.id })}>
              <AvatarPreview small appearance={{ ...appearance!, outfitId: outfit.id }} outfits={room?.outfits || []} faces={room?.faces || []} /><span>{outfit.name}</span>
            </button>)}</div>
            <fieldset className={styles.colorField}><legend>Shirt color</legend><div className={styles.colorOptions}>{shirtColors.map(color => <button key={color.id} aria-label={'Shirt color: '+color.name} aria-pressed={appearance?.shirtColor === color.id} disabled={saving} onClick={() => editAppearance({ shirtColor: color.id })}><span className={styles.swatch} style={{ backgroundColor: color.hex }} aria-hidden="true" /><span>{color.name}</span></button>)}</div></fieldset>
            <fieldset className={styles.colorField}><legend>Pants color</legend><div className={styles.colorOptions}>{pantsColors.map(color => <button key={color.id} aria-label={'Pants color: '+color.name} aria-pressed={appearance?.pantsColor === color.id} disabled={saving} onClick={() => editAppearance({ pantsColor: color.id })}><span className={styles.swatch} style={{ backgroundColor: color.hex }} aria-hidden="true" /><span>{color.name}</span></button>)}</div></fieldset>
          </>}
        </section>}
        <div className={styles.avatarSaveActions}>
          <button className={styles.primaryButton} onClick={() => void saveAvatar()} disabled={saving || !appearance || !appearance.outfitId || !dirty || temporaryPreview}>{saving ? 'Saving…' : 'Save avatar'}</button>
          <button className={styles.discardButton} disabled={saving || !dirty} onClick={() => { setAppearance(room?.appearance || null); setRetrySelection(null); setSaveMessage('Changes discarded.'); }}>Discard changes</button>
        </div>
        <p className={styles.saveStatus} role={retrySelection ? 'alert' : 'status'} aria-live="polite">{saveMessage || (temporaryPreview ? 'Preview only; account saving is unavailable here.' : 'Choose your look, then save your avatar.')}</p>
      </section>
      <div className={styles.activityColumn}>
        <section className={styles.participation} aria-labelledby="participation-title"><span className={styles.streakIcon} aria-hidden="true">♨</span><div><h2 id="participation-title">One shared participation streak</h2><p>Jumpyland, DormSpace, and Wordle when available.</p><p className={styles.pendingStatus}>Participation status will appear here when connected.</p></div></section>
        <section className={styles.activities} aria-labelledby="activity-title"><div className={styles.activityHeading}><h2 id="activity-title">Pick your next break</h2><span>{available.length} included activities</span></div>
          {available.map(activity => <article className={styles.activityCard} key={activity.code}><div className={styles.activityImage}><ActivityArt code={activity.code} /></div><div className={styles.activityCopy}><h3>{activity.code === 'game1' ? 'Jumpyland' : activity.name}</h3><p>{activity.code === 'game1' ? 'Explore three themed journeys, collect treasures, and use powers against patrolling enemies.' : activity.description}</p><span className={styles.activityMeta}>{activity.code === 'game1' ? 'Three required levels' : activity.code === 'dormspace' ? 'Your campus space' : 'Daily five-letter puzzle'}</span></div><div className={styles.activityAction}>
            {activityEntrypoints[activity.code].href ? <Link href={activityEntrypoints[activity.code].href!} aria-label={activityEntrypoints[activity.code].action + ' ' + (activity.code === 'game1' ? 'Jumpyland' : activity.name)}>{activityEntrypoints[activity.code].action} <span aria-hidden="true">›</span></Link>
              : <><button disabled aria-label={activityEntrypoints[activity.code].action + ' ' + activity.name + ': not connected'}>{activityEntrypoints[activity.code].action} <span aria-hidden="true">›</span></button><span>{activityEntrypoints[activity.code].unavailable}</span></>}
          </div></article>)}
          {!available.length && <p className={styles.editorNote}>Included activities have not been configured yet.</p>}
        </section>
        <p className={styles.roomFootnote}>You can play with the default character. Customizing your avatar is always optional.</p>
      </div>
    </div>}
  </main>;
}
