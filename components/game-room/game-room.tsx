'use client';

import { GameRoomRequestError, roomRequest } from '../../lib/game-room-client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AvatarAppearance, GameRoomData } from '../../lib/game-room';
import { activityEntrypoints, gameRoomSamples, sampleFaceStyles, faceDetails, shirtColors, pantsColors } from '../../lib/game-room';
import { useNavigationSession } from '../navigation/social-shell';
import { SessionNotice } from '../navigation/section-page';
import { AvatarPreview } from './avatar-preview';
import { avatarStyleGroup, bottomColors, bottomStyles, defaultLook, hasLayeredLook, headStyles, layeredKeys, layoutAvatar, skinTones, swatchColor, topColors, topStyles, type LayeredLook } from '../../lib/avatar-layers';
import { useAvatarManifest } from '../../lib/avatar-manifest';
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
  const [editor, setEditor] = useState<'hair' | 'face' | 'outfit'>('outfit');
  const [loading, setLoading] = useState(!preview);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [retrySelection, setRetrySelection] = useState<AvatarAppearance | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [previewFallback, setPreviewFallback] = useState(false);
  const temporaryPreview = preview || previewFallback;
  // Layered art (v2) replaces the v1 controls once it has been imported.
  const manifest = useAvatarManifest();
  const layeredDefaults = manifest ? defaultLook(manifest) : null;

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
  const bodyStyle = hasLayeredLook(appearance) ? avatarStyleGroup(appearance.headStyle) : sampleFaceStyles[selectedFace?.assetKey || '']?.group || 'male';
  const hairOptions = room?.faces.filter(face => sampleFaceStyles[face.assetKey]?.group === bodyStyle && face.assetKey !== 'sample-glasses') || [];
  const dirty = JSON.stringify(appearance) !== JSON.stringify(room?.appearance || null);
  const available = room?.activities.filter(activity => activity.included) || [];
  const statusTone = retrySelection ? 'error' : saving ? 'pending' : dirty ? 'unsaved' : saveMessage === 'Avatar saved.' ? 'saved' : 'idle';
  const statusText = saveMessage || (temporaryPreview ? 'Preview only; account saving is unavailable here.' : 'Choose your look, then save your avatar.');
  // Importing new art never changes an account's saved appearance by itself.
  // Trying the new collection explicitly adds a complete, unsaved selection.
  const shown = appearance;
  const look = shown as LayeredLook;
  const layout = manifest && hasLayeredLook(shown) ? layoutAvatar(manifest, shown) : null;
  const layered = manifest && layout ? { manifest, layout } : null;
  function tryNewCollection() {
    if (!manifest || !layeredDefaults) return;
    const legacy = selectedFace?.assetKey.replace(/^sample-/, '') || '';
    const preferred = ({ smile: 'short-waves', glasses: 'short-waves', 'crew-cut': 'fade', 'side-part': 'short-waves' } as Record<string, string>)[legacy] || legacy;
    const head = headStyles.find(style => style.id === preferred && manifest.heads[style.id]);
    editAppearance({ ...layeredDefaults, ...(head ? { headStyle: head.id } : {}) });
  }
  function useOriginalCollection() {
    if (!appearance || saving) return;
    const original = { ...appearance };
    for (const key of layeredKeys) delete original[key];
    setAppearance(original); setRetrySelection(null);
    setSaveMessage(JSON.stringify(original) === JSON.stringify(room?.appearance) ? 'Original collection restored.' : 'Unsaved changes');
  }
  const swatches = (label: string, field: keyof AvatarAppearance, colors: readonly { id: string; name: string; hex: string }[]) =>
    <fieldset className={styles.colorField}><legend>{label}</legend><div className={styles.swatches}>{colors.map(color =>
      <button key={color.id} title={color.name} aria-label={label + ': ' + color.name} aria-pressed={shown?.[field] === color.id} disabled={saving}
        className={styles.swatch} style={{ backgroundColor: color.hex, color: lightColor(color.hex) ? '#18362f' : '#fff' }}
        onClick={() => editAppearance({ [field]: color.id } as Partial<AvatarAppearance>)}>{shown?.[field] === color.id && <span aria-hidden="true">✓</span>}</button>)}</div></fieldset>;
  const chips = (label: string, field: keyof AvatarAppearance, options: readonly { id: string; name: string }[]) => options.length > 1 &&
    <fieldset className={styles.colorField}><legend>{label}</legend><div className={styles.styleChoices}>{options.map(option =>
      <button key={option.id} aria-pressed={shown?.[field] === option.id} disabled={saving} onClick={() => editAppearance({ [field]: option.id } as Partial<AvatarAppearance>)}>{option.name}</button>)}</div></fieldset>;
  const faceOptions = <div className={styles.options}>{faceDetails.map(detail => <button key={detail.id} aria-label={detail.name} className={styles.option} aria-pressed={shown?.faceStyle === detail.id} disabled={saving} onClick={() => editAppearance({ faceStyle: detail.id })}>
    <AvatarPreview small portrait appearance={{ ...shown!, faceStyle: detail.id }} outfits={room?.outfits || []} faces={room?.faces || []} /><span>{detail.name}</span>
  </button>)}</div>;
  return <main className={styles.page}>
    <header className={styles.pageHeader}><h1>Game Room</h1><p>Play, explore, and make your character feel like you.</p></header>
    {temporaryPreview && !error && <aside className={styles.previewNotice} role="status">
      <p><strong>Game Room preview.</strong> Sample faces and outfits are available to try. Changes are temporary and are not saved to your account.</p>
      {!preview && <button className={styles.secondaryButton} onClick={() => setAttempt(value => value + 1)} disabled={loading}>Retry account connection</button>}
    </aside>}
    {loading ? <section className={styles.notice} role="status">Opening your Game Room…</section> : error ? <section className={styles.notice} role="alert"><h2>We couldn’t open your Game Room</h2><p>{error}</p><button className={styles.primaryButton} onClick={() => setAttempt(attempt+1)}>Retry</button></section> : <div className={styles.roomGrid}>
      <section className={styles.avatarPanel} aria-labelledby="avatar-title">
        <div className={styles.panelHeading}><span className={styles.smallIcon} aria-hidden="true">✦</span><div><h2 id="avatar-title">Customize your avatar</h2><p>Your look, across your games.</p></div></div>
        <div className={styles.avatarLayout}>
          <div className={styles.avatarStage}>
            <AvatarPreview appearance={shown} outfits={room?.outfits || []} faces={room?.faces || []} />
            <span className={styles.avatarLabel}>{temporaryPreview ? 'Campus collection · sample' : appearance ? (dirty ? 'Previewing your changes' : 'Your saved avatar') : 'Avatar collection awaiting setup'}</span>
          </div>
          <div className={styles.controls}>
            <h3 className={styles.controlsTitle}>Make it yours</h3>
            {layeredDefaults && <button className={styles.secondaryButton} disabled={saving || !room} onClick={layered ? useOriginalCollection : tryNewCollection}>
              {layered ? 'Use original collection' : 'Try the new avatar collection'}
            </button>}
            <div className={styles.bodyChoices} role="group" aria-label="Avatar style">
              {(['male','female'] as const).map(group => {
                if (layered) {
                  const head = headStyles.find(style => avatarStyleGroup(style.id) === group && layered.manifest.heads[style.id]);
                  return <button key={group} aria-pressed={bodyStyle === group} disabled={saving || !head} onClick={() => head && bodyStyle !== group && editAppearance({ headStyle: head.id })}>{group === 'male' ? 'Male' : 'Female'}</button>;
                }
                const availableFace = room?.faces.find(face => sampleFaceStyles[face.assetKey]?.group === group && face.assetKey !== 'sample-glasses');
                return <button key={group} aria-pressed={bodyStyle === group} disabled={saving || !availableFace} onClick={() => availableFace && bodyStyle !== group && editAppearance({ faceId: availableFace.id })}>{group === 'male' ? 'Male' : 'Female'}</button>;
              })}
            </div>
            <div className={styles.tabs} role="group" aria-label="Customize">
              {(['hair','face','outfit'] as const).map(tab => <button key={tab} aria-pressed={editor === tab} disabled={saving} onClick={() => setEditor(tab)}>{tab === 'hair' ? 'Hair' : tab === 'face' ? 'Face' : 'Outfit'}</button>)}
            </div>
            <section className={styles.editor} aria-label={editor === 'hair' ? 'Choose a hairstyle' : editor === 'face' ? 'Choose face details' : 'Customize your outfit'}>
              {layered ? <>
                {editor === 'hair' && <>
                  {swatches('Skin tone', 'skinTone', skinTones.map((tone, index) => ({ ...tone, hex: swatchColor(layered.manifest, 'skin', '', index, tone.hex) })))}
                  <fieldset className={styles.colorField}><legend>{bodyStyle === 'male' ? 'Male hairstyles' : 'Female hairstyles'}</legend><div className={styles.options}>{headStyles.filter(style => style.kind === 'hair' && avatarStyleGroup(style.id) === bodyStyle && layered.manifest.heads[style.id]).map(style =>
                    <button key={style.id} aria-label={style.name} className={styles.option} aria-pressed={look.headStyle === style.id} disabled={saving} onClick={() => editAppearance({ headStyle: style.id })}>
                      <AvatarPreview small portrait appearance={{ ...shown!, headStyle: style.id, faceStyle: 'natural' }} outfits={room?.outfits || []} faces={room?.faces || []} /><span>{style.name}</span>
                    </button>)}</div></fieldset>
                  {bodyStyle === 'female' && headStyles.some(style => style.kind === 'hijab' && layered.manifest.heads[style.id]) &&
                    swatches('Hijab', 'headStyle', headStyles.flatMap(style => style.kind === 'hijab' && layered.manifest.heads[style.id] ? [{ id: style.id, name: style.name, hex: style.hex }] : []))}
                </>}
                {editor === 'face' && (layered.layout?.eyes ? faceOptions : <p className={styles.footnote}>Glasses and freckles aren’t available for this look yet.</p>)}
                {editor === 'outfit' && <>
                  {chips('Top', 'topStyle', topStyles.filter(style => layered.manifest.tops[style.id]))}
                  {swatches('Top color', 'topColor', topColors.map((color, index) => ({ ...color, hex: swatchColor(layered.manifest, 'tops', look.topStyle, index, color.hex) })))}
                  {chips('Pants', 'bottomStyle', bottomStyles.filter(style => layered.manifest.bottoms[style.id]))}
                  {swatches('Pants color', 'bottomColor', bottomColors.map((color, index) => ({ ...color, hex: swatchColor(layered.manifest, 'bottoms', look.bottomStyle, index, color.hex) })))}
                </>}
              </> : <>
              {editor === 'hair' && <div className={styles.options}>{hairOptions.map(face => <button key={face.id} aria-label={sampleFaceStyles[face.assetKey].label} className={styles.option} aria-pressed={appearance?.faceId === face.id || (selectedFace?.assetKey === 'sample-glasses' && face.assetKey === 'sample-smile')} disabled={saving} onClick={() => editAppearance({ faceId: face.id })}>
                <AvatarPreview small portrait appearance={{ ...appearance!, faceId: face.id, faceStyle: 'natural' }} outfits={room?.outfits || []} faces={room?.faces || []} /><span>{sampleFaceStyles[face.assetKey].label}</span>
              </button>)}</div>}
              {editor === 'face' && faceOptions}
              {editor === 'outfit' && <>
                {(room?.outfits.length || 0) > 1 && <fieldset className={styles.colorField}><legend>Style</legend><div className={styles.styleChoices}>{room?.outfits.map(outfit =>
                  <button key={outfit.id} aria-pressed={appearance?.outfitId === outfit.id} disabled={saving} onClick={() => editAppearance({ outfitId: outfit.id })}>{outfit.name}</button>)}</div></fieldset>}
                {swatches('Shirt color', 'shirtColor', shirtColors)}
                {swatches('Pants color', 'pantsColor', pantsColors)}
              </>}
              </>}
            </section>
            <p className={styles.previewHint}>Changes preview instantly.</p>
            <p className={styles.saveStatus} data-tone={statusTone} role={retrySelection ? 'alert' : 'status'} aria-live="polite">{statusText}</p>
            <button className={styles.primaryButton} onClick={() => void saveAvatar()} disabled={saving || !appearance || !appearance.outfitId || !dirty || temporaryPreview}>{saving ? 'Saving…' : 'Save avatar'}</button>
            <button className={styles.secondaryButton} disabled={saving || !dirty} onClick={() => { setAppearance(room?.appearance || null); setRetrySelection(null); setSaveMessage('Changes discarded.'); }}>Discard changes</button>
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
        </section>
        <section className={styles.participation} aria-labelledby="participation-title"><span className={styles.streakIcon} aria-hidden="true">♨</span><div><h2 id="participation-title">Shared participation streak</h2><p>Status will appear when connected.</p></div></section>
      </div>
    </div>}
  </main>;
}

// Presentation for the activity cards; routes and availability stay in lib/game-room.
const activityCards: Partial<Record<string, { name: string; tagline: string; meta?: string; image?: string; primary?: boolean }>> = {
  game1: { name: 'Jumpyland', tagline: 'Three themed worlds. One little adventure.', meta: '3 levels', image: '/jumpyland/world-map-v1.png', primary: true },
  dormspace: { name: 'DormSpace', tagline: 'A little space to make your own.' },
  wordle: { name: 'Wordle', tagline: 'Guess today’s five-letter word.', meta: 'Daily puzzle' },
};

function lightColor(hex: string) {
  const [r, g, b] = [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}
