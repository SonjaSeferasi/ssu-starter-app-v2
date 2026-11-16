'use client';
// Development-only scene review (/dev/dormspace-3d): the real engine, models and panels with synthetic
// fixtures. Saves, purchases and players are local to this page and clearly labelled; no API is called.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dorm } from '../../lib/dormspace-rules';
import { DormLiveStore } from '../../lib/dormspace-live-store';
import type { DormLive } from '../dormspace/use-dorm-live';
import type { EngineCallbacks } from './scene/engine';
import { useDormEngine } from './game';
import { HallLayer } from './hall-layer';
import { RoomLayer } from './room-layer';
import { noHandlers, type LayerHandlers } from './layer-types';
import { ShopPanel, type ShopSource } from './panels/shop-panel';
import { ControlBar, Joystick } from './panels/touch-controls';
import { reviewDirectory, reviewDorm, reviewShop } from './review-fixtures';
import { reviewLooks } from './review-looks';
import type { Save } from './use-room-editor';
import styles from './dormspace-3d.module.css';

type Scene = 'hall' | 'room' | 'shop';
function offlineLive(): DormLive {
  const store = new DormLiveStore();
  store.setStatus('offline', 'Review page: no multiplayer connection.');
  return { store, local: { x: 0, y: 0, facing: 'down', moving: false, sprinting: false, restItemId: null }, connectionId: '',
    move() {}, setLocal() {}, say: async () => ({ ok: false, error: 'Review page: chat is not connected.' }), reconnect() {},
    onRestRejected: () => () => {}, onCorrection: () => () => {} };
}

export function DormSceneReview() {
  const host = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<Scene>('room');
  const [dorm, setDorm] = useState<Dorm>(reviewDorm);
  const [look, setLook] = useState(0);
  const [label, setLabel] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const layer = useRef<LayerHandlers>(noHandlers);
  const live = useMemo(offlineLive, []);
  const callbacks = useRef<EngineCallbacks>(null as unknown as EngineCallbacks);
  callbacks.current = {
    onTarget: t => layer.current.onTarget(t), onInteract: () => layer.current.onInteract(), onActivate: t => layer.current.onActivate(t),
    onRotate: () => layer.current.onRotate(), onEscape: () => layer.current.onEscape(), onCursor: c => layer.current.onCursor(c),
    onNudge: s => layer.current.onNudge(s), onPlace: () => layer.current.onPlace(), onSelectPlaced: id => layer.current.onSelectPlaced(id),
    onStandUp: () => layer.current.onStandUp(), onAvatarNotices() {}, onContextLost() {}, onContextRestored() {}, inputBlocked: () => false,
  };
  const { engine, state, retry } = useDormEngine(host, callbacks);
  const register = useCallback((handlers: LayerHandlers) => { layer.current = handlers; }, []);
  const self = useMemo(() => ({ username: 'review-student', avatar: reviewLooks[look].data as never }), [look]);
  // Local-only "save": accepts the arrangement and bumps the version, so the editor flow can be reviewed.
  const save: Save = useCallback(async (current, next) => ({ ok: true, dorm: { ...current, ...next, version: current.version + 1 } }), []);
  const shop: ShopSource = useMemo(() => ({
    catalog: async () => ({ ok: true, catalog: reviewShop }),
    purchase: async request => ({ kind: 'result', result: { status: 'rejected', reason: 'unavailable', itemId: request.itemId, price: null, balance: reviewShop.balance, message: 'Review page: purchases are disabled.' } }),
    status: async () => ({ kind: 'result', result: { status: 'not_found', balance: reviewShop.balance } }),
  }), []);

  useEffect(() => {
    if (state !== 'ready') return;
    void import('./scene/thumbnails').then(m => m.renderFurnitureThumbnails(reviewDorm.catalog.filter(i => i.surface && i.width && i.height)
      .map(i => ({ key: i.previewKey, width: i.width!, height: i.height!, surface: i.surface as 'floor' | 'wall' })))).then(setThumbnails);
  }, [state]);
  // Bounded, read-only scene state for browser checks (no account data on this page).
  useEffect(() => {
    const timer = window.setInterval(() => {
      const snap = engine?.snapshot();
      if (!snap || !stage.current) return;
      Object.assign(stage.current.dataset, { scene: snap.scene, x: String(snap.x), y: String(snap.y), pose: snap.pose ?? '', target: snap.target, drawCalls: String(snap.drawCalls) });
    }, 400);
    return () => window.clearInterval(timer);
  }, [engine]);

  const props = { engine, live, self, register, onInteractLabel: setLabel, notify: setMessage };
  return (
    <main className={styles.game} style={{ padding: 20, background: '#f3eee4', minHeight: '100vh' }}>
      <h1 style={{ margin: 0, color: '#2d3e5c' }}>DormSpace 3D scene review</h1>
      <p className={styles.notice}>Development only. Synthetic room, hall, shop states and students; changes stay on this page and nothing is sent to any server.</p>
      <div className={styles.controls}>
        {(['room', 'hall', 'shop'] as const).map(name => <button key={name} type="button" className={`${styles.button} ${scene === name ? styles.primary : ''}`} aria-pressed={scene === name} onClick={() => setScene(name)}>{name}</button>)}
        <label className={styles.field}>Student look
          <select value={look} onChange={event => setLook(Number(event.target.value))}>{reviewLooks.map((entry, index) => <option key={entry.id} value={index}>{entry.label}</option>)}</select>
        </label>
        <button type="button" className={styles.button} onClick={() => setDorm(reviewDorm)}>Reset room</button>
      </div>
      {message ? <p className={styles.notice} role="status">{message}</p> : null}
      <div ref={stage} className={styles.stage} data-engine={state}>
        <div ref={host} style={{ position: 'absolute', inset: 0 }} />
        {state !== 'ready' ? <div className={styles.overlay} role="status"><h3>{state === 'loading' ? 'Loading 3D…' : 'WebGL is unavailable'}</h3>{state !== 'loading' ? <button type="button" className={styles.button} onClick={retry}>Retry</button> : null}</div> : null}
        {state === 'ready' && scene === 'hall' ? <HallLayer {...props} directory={reviewDirectory} arrivalSlot={0} busy={false} onEnter={door => setMessage(`Review: would request entry to room ${door.roomNumber}.`)} onFloor={floor => setMessage(`Review: floor ${floor} is not part of the fixture.`)} /> : null}
        {state === 'ready' && scene !== 'hall' ? <RoomLayer {...props} dorm={dorm} onDormChange={setDorm} onReload={() => setDorm(reviewDorm)} save={save} thumbnails={thumbnails}
          onExit={() => setScene('hall')} onGuestbook={() => setMessage('Review: the guestbook uses the real Guestbook component in the game.')} /> : null}
        {state === 'ready' && scene === 'shop' ? <ShopPanel source={shop} thumbnails={thumbnails} onPurchased={() => {}} onModal={() => {}} onClose={() => setScene('room')} note="Review states only. Purchases are disabled here." /> : null}
        <div className={styles.touchStage}><Joystick sink={engine} /></div>
      </div>
      <ControlBar sink={engine} interactLabel={label} onInteract={() => layer.current.onInteract()} />
    </main>
  );
}
