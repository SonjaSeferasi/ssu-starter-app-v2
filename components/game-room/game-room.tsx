'use client';

import { GameRoomRequestError, roomRequest } from '../../lib/game-room-client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AvatarAppearance, GameRoomData } from '../../lib/game-room';
import { activityEntrypoints, gameRoomSamples } from '../../lib/game-room';
import { useNavigationSession } from '../navigation/social-shell';
import { SessionNotice } from '../navigation/section-page';
import { layeredKeys } from '../../lib/avatar-layers';
import { avatarEditorPreview } from '../../lib/avatar-editor';
import { completeAvatar, avatarGroups, avatarParts, avatarVariant, collectionHair, collectionFaces, type AvatarGroup } from '../../lib/avatar-collection';
import { bodyShapes, skinColors } from '../../lib/avatar-figure';
import { CompleteAvatar } from './complete-avatar';
import { ActivityArt } from './activity-art';
import styles from './game-room.module.css';

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
  const [editor, setEditor] = useState<'hair' | 'face' | 'skin' | 'body' | 'outfit'>('outfit');
  const [loading, setLoading] = useState(!preview);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [retrySelection, setRetrySelection] = useState<AvatarAppearance | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [previewFallback, setPreviewFallback] = useState(false);
  const temporaryPreview = preview || previewFallback;
  const [collectionGroup, setCollectionGroup] = useState<AvatarGroup | null>(null);
  const shown = room ? avatarEditorPreview(room, appearance) : null;
  const selectedAvatar = completeAvatar(shown?.avatarId);
  const visibleGroup = collectionGroup || selectedAvatar?.group || 'male';
  const parts = selectedAvatar ? avatarParts(selectedAvatar) : { outfit: 1, hair: 0, detail: 'natural' as const };
  const look = { bodyShape: shown?.bodyShape, skinColor: shown?.skinColor };
  const skinName = skinColors.find(color => color.id === look.skinColor)?.name;
  const bodyName = bodyShapes.find(shape => shape.id === (look.bodyShape || 'average'))!.name;

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

  const dirty = JSON.stringify(appearance) !== JSON.stringify(room?.appearance || null);
  const available = room?.activities.filter(activity => activity.included) || [];
  const statusTone = retrySelection ? 'error' : saving ? 'pending' : dirty ? 'unsaved' : saveMessage === 'Avatar saved.' ? 'saved' : 'idle';
  const legacyPreview = !completeAvatar(appearance?.avatarId);
  const statusText = saveMessage || (temporaryPreview ? 'Preview only; account saving is unavailable here.' : legacyPreview ? 'Choose a complete look, then save it to update your avatar.' : 'Choose your look, then save your avatar.');
  function chooseCompleteAvatar(id: string, change: Pick<AvatarAppearance, 'bodyShape' | 'skinColor'> = {}) {
    if (!completeAvatar(id) || !room || saving) return;
    const current = appearance || completeAppearance(room, { outfitId: room.outfits[0]?.id || '', faceId: room.faces.find(face => face.initial)?.id || room.faces[0]?.id || null });
    const next = { ...current!, avatarId: id, ...change };
    for (const key of layeredKeys) delete next[key];
    // The defaults (average body, skin as painted) are not stored.
    if (!next.bodyShape || next.bodyShape === 'average') delete next.bodyShape;
    if (!next.skinColor) delete next.skinColor;
    setAppearance(next); setRetrySelection(null); setSaveMessage('Unsaved changes');
  }
  const chooseFigure = (change: Pick<AvatarAppearance, 'bodyShape' | 'skinColor'>) => selectedAvatar && chooseCompleteAvatar(selectedAvatar.id, change);
  return <main className={styles.page}>
    <header className={styles.pageHeader}><h1>Game Room</h1><p>Play, explore, and make your character feel like you.</p></header>
    {temporaryPreview && !error && <aside className={styles.previewNotice} role="status">
      <p><strong>Game Room preview.</strong> Complete avatars are available to try. Changes are temporary and are not saved to your account.</p>
      {!preview && <button className={styles.secondaryButton} onClick={() => setAttempt(value => value + 1)} disabled={loading}>Retry account connection</button>}
    </aside>}
    {loading ? <section className={styles.notice} role="status">Opening your Game Room…</section> : error ? <section className={styles.notice} role="alert"><h2>We couldn’t open your Game Room</h2><p>{error}</p><button className={styles.primaryButton} onClick={() => setAttempt(attempt+1)}>Retry</button></section> : <div className={styles.roomGrid}>
      <section className={styles.avatarPanel} aria-labelledby="avatar-title">
        <div className={styles.panelHeading}><span className={styles.smallIcon} aria-hidden="true">✦</span><div><h2 id="avatar-title">Customize your avatar</h2><p>Your look, across your games.</p></div></div>
        <div className={styles.avatarLayout}>
          <div className={styles.avatarStage}>
            {selectedAvatar && <CompleteAvatar avatar={selectedAvatar} look={look} />}
            <span className={styles.avatarLabel}>{temporaryPreview ? 'Campus collection · sample' : dirty ? 'Previewing your changes' : legacyPreview ? 'Complete avatar preview' : 'Your saved avatar'}</span>
          </div>
          <div className={styles.controls}>
            <h3 className={styles.controlsTitle}>Make it yours</h3>
            <p className={styles.collectionIntro}>Choose your hair, face, skin, body and outfit. Each combination is a complete figure.</p>
            <div className={styles.collectionTabs} role="group" aria-label="Complete avatar collection">
              {avatarGroups.map(group => <button key={group} aria-pressed={visibleGroup === group} disabled={saving} onClick={() => setCollectionGroup(group)}>{group === 'male' ? 'Male' : group === 'female' ? 'Female' : 'Hijab'}</button>)}
            </div>
            <div className={styles.tabs} role="group" aria-label="Customize">
              {(['hair', 'face', 'skin', 'body', 'outfit'] as const).map(tab => <button key={tab} aria-pressed={editor === tab} disabled={saving} onClick={() => setEditor(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}
            </div>
            <section aria-label={editor === 'hair' ? (visibleGroup === 'hijab' ? 'Choose a hijab' : 'Choose a hairstyle') : editor === 'face' ? 'Choose face details' : editor === 'skin' ? 'Choose a skin color' : editor === 'body' ? 'Choose a body shape' : 'Choose an outfit'}
              className={editor === 'skin' ? styles.skinOptions : editor === 'body' ? `${styles.completeOptions} ${styles.bodyOptions}` : styles.completeOptions}>
              {editor === 'hair' && collectionHair[visibleGroup].map((name, hair) => {
                const choice = avatarVariant(visibleGroup, parts.outfit, hair, parts.detail);
                return <button key={name} aria-label={name} aria-pressed={selectedAvatar?.group === visibleGroup && parts.hair === hair} disabled={saving} className={styles.completeOption} onClick={() => chooseCompleteAvatar(choice.id)}><CompleteAvatar avatar={choice} look={look} small portrait /><span>{name}</span></button>;
              })}
              {editor === 'face' && collectionFaces.map(face => {
                const choice = avatarVariant(visibleGroup, parts.outfit, parts.hair, face.id);
                return <button key={face.id} aria-label={face.name} aria-pressed={selectedAvatar?.group === visibleGroup && parts.detail === face.id} disabled={saving} className={styles.completeOption} onClick={() => chooseCompleteAvatar(choice.id)}><CompleteAvatar avatar={choice} look={look} small portrait /><span>{face.name}</span></button>;
              })}
              {editor === 'skin' && selectedAvatar && <>
                <button className={styles.paintedSkin} aria-pressed={!look.skinColor} disabled={saving} onClick={() => chooseFigure({ skinColor: undefined })}>As painted</button>
                <div className={styles.swatches}>
                  {skinColors.map(color => <button key={color.id} className={styles.swatch} style={{ background: color.hex }} title={color.name} aria-label={color.name}
                    aria-pressed={look.skinColor === color.id} disabled={saving} onClick={() => chooseFigure({ skinColor: color.id })} />)}
                </div>
              </>}
              {editor === 'body' && selectedAvatar && bodyShapes.map(shape => <button key={shape.id} aria-label={shape.name} aria-pressed={(look.bodyShape || 'average') === shape.id} disabled={saving}
                className={styles.completeOption} onClick={() => chooseFigure({ bodyShape: shape.id })}><CompleteAvatar avatar={selectedAvatar} look={{ ...look, bodyShape: shape.id }} small /><span>{shape.name}</span></button>)}
              {editor === 'outfit' && Array.from({ length: 6 }, (_, index) => {
                const choice = avatarVariant(visibleGroup, index + 1, parts.hair, parts.detail);
                return <button key={choice.id} aria-label={choice.name} aria-pressed={selectedAvatar?.group === visibleGroup && parts.outfit === index + 1} disabled={saving} className={styles.completeOption} onClick={() => chooseCompleteAvatar(choice.id)}><CompleteAvatar avatar={choice} look={look} small /><span>{choice.name}</span></button>;
              })}
            </section>
            <p className={styles.footnote}>{selectedAvatar?.description}{look.bodyShape && look.bodyShape !== 'average' ? `, ${bodyName.toLowerCase()} body` : ''}{skinName ? `, ${skinName.toLowerCase()} skin` : ''}.</p>
            <p className={styles.previewHint}>Changes preview instantly.</p>
            <p className={styles.saveStatus} data-tone={statusTone} role={retrySelection ? 'alert' : 'status'} aria-live="polite">{statusText}</p>
            <button className={styles.primaryButton} onClick={() => void saveAvatar()} disabled={saving || !appearance || !appearance.outfitId || !dirty || temporaryPreview}>{saving ? 'Saving…' : 'Save avatar'}</button>
            <button className={styles.secondaryButton} disabled={saving || !dirty} onClick={() => { setAppearance(room?.appearance || null); setCollectionGroup(null); setRetrySelection(null); setSaveMessage('Changes discarded.'); }}>Discard changes</button>
            <p className={styles.footnote}>Customization is optional. Your avatar is ready to play.</p>
          </div>
        </div>
      </section>
      <div className={styles.activityColumn}>
        <section className={styles.activities} aria-labelledby="activity-title">
          <h2 id="activity-title">Pick your next break</h2>
          {available.map(activity => {
            const entry = activityEntrypoints[activity.code];
            const card = activityCards[activity.code];
            const name = card?.name || activity.name;
            return <article className={styles.activityCard} key={activity.code}>
              <div className={styles.activityImage}>{card?.image ? <img src={card.image} alt="" /> : <ActivityArt code={activity.code} />}</div>
              <div className={styles.activityBody}>
                <div className={styles.activityCopy}><h3>{name}</h3><p>{card?.tagline || activity.description}</p>{card?.meta && <span className={styles.activityMeta}>{card.meta}</span>}</div>
                {entry.href ? <Link href={entry.href} className={card?.primary ? styles.playLink : styles.openLink}>{entry.action} {name} <span aria-hidden="true">→</span></Link>
                  : <span className={styles.unavailable}>{entry.unavailable}</span>}
              </div>
            </article>;
          })}
          {!available.length && <p className={styles.footnote}>Included activities have not been configured yet.</p>}
          <article className={styles.activityCard}>
            <div className={styles.activityBody}>
              <div className={styles.activityCopy}><h3>World Explorer</h3><p>Play country levels from Japan and East Asia to Europe, Africa, Oceania, North America and all twelve countries of South America, or explore country scenery previews.</p><span className={styles.activityMeta}>Playable levels on six continents · 193 country profiles</span></div>
              <Link href="/world-explorer" className={styles.openLink}>Explore the world <span aria-hidden="true">→</span></Link>
            </div>
          </article>
        </section>
        <section className={styles.participation} aria-labelledby="participation-title"><span className={styles.streakIcon} aria-hidden="true">♨</span><div><h2 id="participation-title">Shared participation streak</h2><p>Status will appear when connected.</p></div></section>
      </div>
    </div>}
  </main>;
}

// Presentation for the activity cards; routes and availability stay in lib/game-room.
const activityCards: Partial<Record<string, { name: string; tagline: string; meta?: string; image?: string; primary?: boolean }>> = {
  game1: { name: 'Jumpyland', tagline: 'Three themed worlds. One little adventure.', meta: '3 levels', image: '/jumpyland/world-map-v1.png', primary: true },
  dormspace: { name: 'DormSpace', tagline: 'Explore the 3D DormHall and make your room your own.' },
  wordle: { name: 'Wordle', tagline: 'Guess today’s five-letter word.', meta: 'Daily puzzle' },
};
