'use client';
// The 3D DormSpace game controller (production). Every account, directory, room, guestbook, live and
// shop operation goes through the authenticated APIs; nothing here is synthetic. Three.js and the
// engine load lazily; WebGL failure or context loss offers a retry and the campus version.
import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { Dorm } from '../../lib/dormspace-rules';
import type { GameRoomData } from '../../lib/game-room';
import { readHallDirectory, readHallLocation, type HallDirectory, type HallDoor } from '../../lib/dormspace-hall-contract';
import { emptyLiveRoster } from '../../lib/dormspace-live-store';
import { useDormLive } from '../dormspace/use-dorm-live';
import { DormLiveChat } from '../dormspace/live-chat';
import { Guestbook } from '../dormspace/guestbook';
import campusStyles from '../dormspace/dormspace.module.css';
import type { DormEngine, EngineCallbacks } from './scene/engine';
import type { ThumbnailRequest } from './scene/thumbnails';
import { noHandlers, type LayerHandlers } from './layer-types';
import { dormRequest } from './api';
import { HallLayer } from './hall-layer';
import { RoomLayer } from './room-layer';
import { ShopPanel, apiShopSource } from './panels/shop-panel';
import { ControlBar, Joystick } from './panels/touch-controls';
import styles from './dormspace-3d.module.css';

type View = { kind: 'hall'; arrivalSlot: number | null } | { kind: 'room'; dorm: Dorm };
type EngineState = 'loading' | 'ready' | 'unsupported' | 'error' | 'lost';
const REVOCATION_CHECK_MS = 2000;
const DIRECTORY_REFRESH_MS = 15000;
// Layout effects run before every passive effect of the same commit (the layers' setScene included).
const useBindEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Starts the lazily loaded engine in `host` and recreates it on retry or context restore. */
export function useDormEngine(host: React.RefObject<HTMLDivElement>, callbacks: React.MutableRefObject<EngineCallbacks>) {
  const [state, setState] = useState<EngineState>('loading');
  const [engine, setEngine] = useState<DormEngine | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false, created: DormEngine | null = null;
    setState('loading');
    const proxy: EngineCallbacks = {
      onTarget: t => callbacks.current.onTarget(t), onInteract: () => callbacks.current.onInteract(), onActivate: t => callbacks.current.onActivate(t),
      onRotate: () => callbacks.current.onRotate(), onEscape: () => callbacks.current.onEscape(), onCursor: c => callbacks.current.onCursor(c),
      onNudge: s => callbacks.current.onNudge(s), onPlace: () => callbacks.current.onPlace(), onSelectPlaced: id => callbacks.current.onSelectPlaced(id),
      onStandUp: () => callbacks.current.onStandUp(), onAvatarNotices: n => callbacks.current.onAvatarNotices(n),
      onContextLost: () => { if (!disposed) setState('lost'); },
      onContextRestored: () => { if (!disposed) setAttempt(n => n + 1); },
      inputBlocked: () => callbacks.current.inputBlocked(),
    };
    import('./scene/engine').then(module => {
      if (disposed || !host.current) return;
      // Creating the renderer is the WebGL check (no separate probe context is allocated).
      try { created = new module.DormEngine(host.current, proxy); setEngine(created); setState('ready'); }
      catch (error) { setState(error instanceof module.WebGLUnavailableError ? 'unsupported' : 'error'); }
    }).catch(() => { if (!disposed) setState('error'); });
    return () => { disposed = true; created?.dispose(); setEngine(null); };
  }, [attempt, host, callbacks]);
  return { engine, state, retry: () => setAttempt(n => n + 1) };
}

export function DormSpace3DGame() {
  const host = useRef<HTMLDivElement>(null);
  const [avatar, setAvatar] = useState<GameRoomData | null>(null);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarAttempt, setAvatarAttempt] = useState(0);
  const [avatarNotices, setAvatarNotices] = useState<readonly string[]>([]);
  const [username, setUsername] = useState('');
  const [directory, setDirectory] = useState<HallDirectory | null>(null);
  const [directoryError, setDirectoryError] = useState('');
  const [view, setView] = useState<View>({ kind: 'hall', arrivalSlot: null });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [guestbookOwner, setGuestbookOwner] = useState<string | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopModal, setShopModal] = useState(false);
  const [interactLabel, setInteractLabel] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const layer = useRef<LayerHandlers>(noHandlers);
  const blockedRef = useRef(false);
  blockedRef.current = !!guestbookOwner || shopModal;

  const callbacks = useRef<EngineCallbacks>(null as unknown as EngineCallbacks);
  callbacks.current = {
    onTarget: t => layer.current.onTarget(t), onInteract: () => layer.current.onInteract(), onActivate: t => layer.current.onActivate(t),
    onRotate: () => layer.current.onRotate(), onEscape: () => { if (shopOpen && !shopModal) setShopOpen(false); else layer.current.onEscape(); },
    onCursor: c => layer.current.onCursor(c), onNudge: s => layer.current.onNudge(s), onPlace: () => layer.current.onPlace(),
    onSelectPlaced: id => layer.current.onSelectPlaced(id), onStandUp: () => layer.current.onStandUp(),
    onAvatarNotices: notices => setAvatarNotices(notices), onContextLost() {}, onContextRestored() {},
    inputBlocked: () => blockedRef.current || layer.current.blocked(),
  };
  const { engine, state: engineState, retry: retryEngine } = useDormEngine(host, callbacks);
  const register = useCallback((handlers: LayerHandlers) => { layer.current = handlers; }, []);
  const notify = useCallback((message: string) => setNotice(message), []);

  // SRS-504.1 / SRS-504.2: the saved Game Room appearance (or its default), refreshed on focus.
  useEffect(() => {
    const controller = new AbortController();
    let loading = false;
    async function load() {
      if (loading || document.visibilityState === 'hidden') return;
      loading = true;
      const result = await dormRequest<GameRoomData>('/api/game-room', { signal: controller.signal });
      loading = false;
      if (controller.signal.aborted) return;
      if (result.ok) { setAvatar(previous => JSON.stringify(previous) === JSON.stringify(result.data) ? previous : result.data); setAvatarError(''); }
      else setAvatarError('Your saved avatar could not be loaded. Your last loaded look, or the default 3D student, is shown.');
      setAvatarLoaded(true);
    }
    void load();
    const refresh = () => { void load(); };
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { controller.abort(); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [avatarAttempt]);

  // SRS-507.20: one floor of the shared school directory at a time. Every student-initiated load (floor
  // change, return to the hall) takes a new sequence number; a response is applied only if no newer
  // load started meanwhile. Background refreshes never take a number, so a slow periodic refresh can
  // neither overwrite a newer floor choice nor cancel one that is still loading.
  const directorySeq = useRef(0);
  const loadDirectory = useCallback(async (floor: number | null, background = false) => {
    const seq = background ? directorySeq.current : ++directorySeq.current;
    const result = await dormRequest<unknown>(`/api/dorm/hall${floor ? `?floor=${floor}` : ''}`);
    if (seq !== directorySeq.current) return null;
    if (!result.ok) { setDirectoryError(result.error); return null; }
    const parsed = readHallDirectory(result.data);
    if (!parsed) { setDirectoryError('The DormHall directory could not be read.'); return null; }
    setDirectoryError(''); setDirectory(parsed); setUsername(parsed.me.username);
    return parsed;
  }, []);
  // The first directory places the student at their own door, but only if they are still in the hall:
  // a slow first response never pulls a student back out of a room they opened meanwhile.
  const loadFirstDirectory = useCallback(() => loadDirectory(null).then(first => {
    if (first) setView(current => current.kind === 'hall' ? { kind: 'hall', arrivalSlot: first.me.slot } : current);
  }), [loadDirectory]);
  useEffect(() => { void loadFirstDirectory(); }, [loadFirstDirectory]);
  useEffect(() => {
    if (view.kind !== 'hall' || !directory) return;
    const timer = window.setInterval(() => { if (document.visibilityState !== 'hidden') void loadDirectory(directory.floor, true); }, DIRECTORY_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [view.kind, directory?.floor, loadDirectory]); // eslint-disable-line react-hooks/exhaustive-deps

  /** SRS-507.15 (revised): back to the floor holding that room's permanent door, or the student's own floor. */
  const returnToHall = useCallback(async (from: string | null, message = '') => {
    setGuestbookOwner(null); setNotice(message);
    let floor: number | null = null, slot: number | null = null;
    if (from) {
      const located = await dormRequest<unknown>(`/api/dorm/hall?locate=${encodeURIComponent(from)}`);
      const location = located.ok ? readHallLocation(located.data) : null;
      if (location) { floor = location.floor; slot = location.slot; }
    }
    const next = await loadDirectory(floor);
    setView({ kind: 'hall', arrivalSlot: slot ?? (next && next.floor === next.me.floor ? next.me.slot : null) });
  }, [loadDirectory]);

  // SRS-507.12 / 507.13 / 507.19: /api/dorm authorizes entry (owner or current friend) and counts visits.
  const openRoom = useCallback(async (owner: string | null) => {
    if (busy) return;
    setBusy(true); setNotice('');
    const result = await dormRequest<Dorm>(`/api/dorm${owner ? `?owner=${encodeURIComponent(owner)}` : ''}`);
    setBusy(false);
    if (result.ok) { if (result.data.isOwner) setUsername(result.data.owner); setView({ kind: 'room', dorm: result.data }); return; }
    setNotice(result.error);
    if (result.status === 403 && directory) void loadDirectory(directory.floor, true);
  }, [busy, directory, loadDirectory]);
  const enterDoor = useCallback((door: HallDoor) => { void openRoom(door.state === 'own' ? null : door.username); }, [openRoom]);
  const reloadOwnRoom = useCallback(async () => {
    const result = await dormRequest<Dorm>('/api/dorm');
    if (result.ok) setView(current => current.kind === 'room' && current.dorm.isOwner ? { kind: 'room', dorm: result.data } : current);
    else setNotice(result.error);
  }, []);

  const visiting = view.kind === 'room' && !view.dorm.isOwner ? view.dorm.owner : null;
  const live = useDormLive(avatarLoaded ? view.kind === 'hall' ? directory ? { kind: 'hall', floor: directory.floor } : null : { kind: 'room', owner: view.dorm.owner } : null,
    room => setView(current => current.kind === 'room' && room.version > current.dorm.version ? { kind: 'room', dorm: { ...current.dorm, ...room } } : current),
    message => { setNotice(message); if (visiting) void returnToHall(null, message); });
  // Bind the new place's live connection before RoomLayer/HallLayer call setScene, so the spawn the
  // engine publishes on entering a place lands in that place's connection (read by its join), never
  // in the previous one. The join itself starts in a later passive effect and awaits the prior leave.
  useBindEffect(() => { engine?.setLive(live); }, [engine, live]);

  // SRS-507.17: a visit ends promptly when the friendship ends.
  useEffect(() => {
    if (!visiting) return;
    const timer = window.setInterval(async () => {
      const result = await dormRequest<{ allowed: boolean }>(`/api/dorm?check=${encodeURIComponent(visiting)}`);
      if (result.ok && !result.data.allowed) void returnToHall(null, `You're no longer friends with ${visiting}, so your visit ended.`);
    }, REVOCATION_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [visiting, returnToHall]);

  // Shop and inventory previews are rendered from the same 3D models.
  const requested = useRef(new Set<string>());
  const requestThumbnails = useCallback((items: ThumbnailRequest[]) => {
    const fresh = items.filter(item => !requested.current.has(item.key));
    if (!fresh.length) return;
    fresh.forEach(item => requested.current.add(item.key));
    void import('./scene/thumbnails').then(m => m.renderFurnitureThumbnails(fresh)).then(rendered => setThumbnails(previous => ({ ...previous, ...rendered }))).catch(() => {});
  }, []);
  useEffect(() => {
    if (view.kind !== 'room' || engineState !== 'ready') return;
    requestThumbnails(view.dorm.catalog.filter(item => item.surface && item.width && item.height)
      .map(item => ({ key: item.previewKey, width: item.width!, height: item.height!, surface: item.surface as 'floor' | 'wall' })));
  }, [view, engineState, requestThumbnails]);
  // SRS-522 shared points HUD: only ever a balance the server returned for this account (shop catalog
  // or a purchase outcome). Nothing is shown until the first response; there is no default value.
  const [points, setPoints] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    void apiShopSource.catalog().then(result => { if (active && result.ok) setPoints(result.catalog.balance); });
    return () => { active = false; };
  }, []);
  const shopSource = useMemo(() => ({
    ...apiShopSource,
    async catalog() {
      const result = await apiShopSource.catalog();
      if (result.ok) {
        setPoints(result.catalog.balance);
        requestThumbnails(result.catalog.offers.filter(o => o.surface && o.width && o.height).map(o => ({ key: o.previewKey, width: o.width!, height: o.height!, surface: o.surface! })));
      }
      return result;
    },
  }), [requestThumbnails]);
  // Stable callback (reads the latest view through a ref), so saving the room never reloads the shop.
  const viewRef = useRef(view); viewRef.current = view;
  const purchased = useCallback((_owned: string[], balance: number) => {
    setPoints(balance);
    // SRS-522.8 / SRS-529.6: refresh owned inventory without a reset so the item can be placed now.
    const current = viewRef.current;
    if (current.kind === 'room' && current.dorm.isOwner) void reloadOwnRoom();
  }, [reloadOwnRoom]);

  const self = useMemo(() => ({ username, avatar }), [username, avatar]);
  const players = useSyncExternalStore(live.store.subscribeRoster, live.store.getRoster, emptyLiveRoster);
  const names = players.map(id => live.store.players.get(id)?.username).filter((name): name is string => !!name);
  const layerProps = { engine, live, self, register, onInteractLabel: setInteractLabel, notify };
  const denied = useCallback((message: string) => { void returnToHall(null, message); }, [returnToHall]);

  return (
    <div className={styles.game} data-dormspace-version="3d">
      <div className={styles.toolbar}>
        <h2>DormSpace</h2>
        {points !== null ? <span className={styles.chip} data-dormspace-points={points}>Shared points: {points.toLocaleString()}</span> : null}
        <Link className={styles.button} href="/game-room">Edit Game Room avatar</Link>
        <button type="button" className={styles.button} aria-pressed={shopOpen} onClick={() => setShopOpen(open => !open)}>Furniture shop</button>
        <button type="button" className={styles.button} disabled={busy} onClick={() => void openRoom(null)}>My room</button>
      </div>
      <nav className={styles.legacy} aria-label="Other DormSpace versions">
        <span>Prefer 2D?</span>
        <Link href="/game-room/dormspace/campus">Campus version</Link>
        <Link href="/game-room/dormspace/classic">Classic version</Link>
        <Link href="/game-room/dormspace/art-credits">Art credits</Link>
      </nav>
      {avatarNotices.length ? <p className={styles.notice} role="status">{avatarNotices.join(' ')}</p> : null}
      {avatarError ? <div className={styles.notice} role="status">{avatarError} <button type="button" className={styles.button} onClick={() => setAvatarAttempt(n => n + 1)}>Retry avatar</button></div> : null}
      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}

      <div className={styles.stage} data-engine={engineState}>
        <div ref={host} style={{ position: 'absolute', inset: 0 }} />
        {engineState === 'loading' ? <div className={styles.overlay} role="status"><h3>Opening DormSpace…</h3></div> : null}
        {engineState === 'unsupported' || engineState === 'error' || engineState === 'lost' ? (
          <div className={styles.overlay} role="alert">
            <h3>{engineState === 'lost' ? 'The 3D view was interrupted' : 'The 3D view could not start'}</h3>
            <p>{engineState === 'unsupported' ? 'This browser or device does not provide WebGL.' : 'Your room and furniture are safe; nothing was changed.'} You can retry or use the campus version with the same rooms and friends.</p>
            <div className={styles.controls} style={{ justifyContent: 'center' }}>
              <button type="button" className={`${styles.button} ${styles.primary}`} onClick={retryEngine}>Retry 3D</button>
              <Link className={styles.button} href="/game-room/dormspace/campus">Open campus version</Link>
            </div>
          </div>
        ) : null}
        {engineState === 'ready' && view.kind === 'hall' && !directory ? (
          <div className={styles.overlay} role={directoryError ? 'alert' : 'status'}>
            <h3>{directoryError ? 'The shared DormHall is unavailable' : 'Finding your room…'}</h3>
            {directoryError ? <>
              <p>{directoryError}</p>
              <div className={styles.controls} style={{ justifyContent: 'center' }}>
                <button type="button" className={styles.button} onClick={() => void loadFirstDirectory()}>Try again</button>
                <button type="button" className={`${styles.button} ${styles.primary}`} disabled={busy} onClick={() => void openRoom(null)}>Open my room</button>
                <Link className={styles.button} href="/game-room/dormspace/campus">Campus version</Link>
              </div>
            </> : null}
          </div>
        ) : null}
        {engineState === 'ready' && view.kind === 'hall' && directory ? (
          <HallLayer {...layerProps} directory={directory} arrivalSlot={view.arrivalSlot} busy={busy} onEnter={enterDoor}
            onFloor={floor => { void loadDirectory(floor).then(next => { if (next) setView(current => current.kind === 'hall' ? { kind: 'hall', arrivalSlot: null } : current); }); }} />
        ) : null}
        {engineState === 'ready' && view.kind === 'room' ? (
          <RoomLayer key={view.dorm.owner} {...layerProps} dorm={view.dorm} thumbnails={thumbnails}
            onDormChange={dorm => setView({ kind: 'room', dorm })} onReload={() => void reloadOwnRoom()}
            onExit={() => void returnToHall(view.dorm.isOwner ? null : view.dorm.owner)} onGuestbook={() => setGuestbookOwner(view.dorm.owner)} />
        ) : null}
        {shopOpen && engineState === 'ready' ? (
          <ShopPanel source={shopSource} thumbnails={thumbnails} onPurchased={purchased} onBalance={setPoints} onModal={setShopModal} onClose={() => setShopOpen(false)}
            note={view.kind === 'room' && view.dorm.isOwner ? undefined : 'Open your room to place what you buy.'} />
        ) : null}
        <div className={styles.touchStage}><Joystick sink={engine} /></div>
      </div>

      <ControlBar sink={engine} interactLabel={interactLabel} onInteract={() => layer.current.onInteract()} />
      {names.length ? <ul className={styles.people} aria-label="Players here">{names.map(name => <li key={name}>{name}</li>)}</ul> : null}
      <div className={campusStyles.game}>
        <DormLiveChat key={view.kind === 'hall' ? `hall:${directory?.floor ?? 0}` : `room:${view.dorm.owner}`} live={live}
          location={view.kind === 'hall' ? `DormHall · Floor ${directory?.floor ?? '…'}` : `${view.dorm.owner}'s room`} />
        {guestbookOwner ? <div data-dormspace-modal><Guestbook owner={guestbookOwner} onClose={() => setGuestbookOwner(null)} onDenied={denied} /></div> : null}
      </div>
    </div>
  );
}
