'use client';
// A dorm room in 3D: the saved layout with collisions, seats and beds (one occupant each, shared
// nighttime window), owner-only decorating with a green/red ghost and keyboard coordinates, the
// physical guestbook and the exit. Saves use the existing versioned PUT /api/dorm.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { roomSolidCells, type Dorm } from '../../lib/dormspace-rules';
import { restTargets, safeRestExit, type RestTarget, type Resting } from '../../lib/dormspace-interactions';
import { emptyLiveRoster } from '../../lib/dormspace-live-store';
import type { SceneTarget } from './scene/engine';
import type { LayerProps } from './layer-types';
import { useRoomEditor, type Save, saveToServer } from './use-room-editor';
import { DecoratePanel } from './panels/decorate-panel';
import styles from './dormspace-3d.module.css';

export function RoomLayer({ engine, live, self, register, onInteractLabel, dorm, onDormChange, onReload, onExit, onGuestbook, thumbnails, save = saveToServer }: LayerProps & {
  dorm: Dorm; onDormChange: (dorm: Dorm) => void; onReload: () => void; onExit: () => void; onGuestbook: () => void;
  thumbnails: Record<string, string>; save?: Save;
}) {
  const editor = useRoomEditor(dorm, onDormChange, save);
  const [decorating, setDecorating] = useState(false);
  const [resting, setResting] = useState<Resting | null>(null);
  const [target, setTarget] = useState<SceneTarget | null>(null);
  const restingRef = useRef(resting); restingRef.current = resting;
  const targetRef = useRef(target); targetRef.current = target;
  const floor = dorm.surfaces.find(s => s.code === 'floor') ?? { code: 'floor', width: 10, height: 7 };
  const placements = editor.shown.placements;
  const solid = useMemo(() => roomSolidCells(dorm.catalog, placements, floor.height, floor.width), [dorm.catalog, placements, floor.height, floor.width]);
  const targets = useMemo(() => restTargets(dorm.catalog, placements), [dorm.catalog, placements]);
  const item = editor.item;

  // Remote occupancy and nighttime come from the live roster (re-rendered only on roster changes).
  useSyncExternalStore(live.store.subscribeRoster, live.store.getRoster, emptyLiveRoster);
  const selfId = live.store.getUI().selfId;
  const remoteResting = [...live.store.players.values()].filter(p => p.id !== selfId && p.space === live.store.space && p.state.restItemId);
  const localSleeping = resting?.target.kind === 'bed';
  const night = localSleeping || remoteResting.some(p => item(p.state.restItemId)?.previewKey === 'bed');

  function finishRest(stopEngine = true) {
    const active = restingRef.current;
    if (!active) return;
    const exit = safeRestExit(active.returnTo, active.target, floor.width, floor.height, solid);
    if (exit) engine?.setPosition(exit);
    restingRef.current = null; setResting(null);
    if (stopEngine) engine?.setStick(0, 0);
  }
  function beginRest(next: RestTarget) {
    if (decorating) return;
    if (restingRef.current?.target.itemId === next.itemId) { finishRest(); return; }
    if (remoteResting.some(p => p.state.restItemId === next.itemId)) { editor.setFeedback('Someone is already using that furniture.'); return; }
    const position = engine?.getPosition() ?? { x: 4, y: floor.height - 1 };
    const returnTo = safeRestExit(position, next, floor.width, floor.height, solid);
    if (!returnTo) { editor.setFeedback('Leave some clear floor space before using this furniture.'); return; }
    editor.setFeedback('');
    engine?.setPosition(returnTo);
    const value = { target: next, returnTo };
    restingRef.current = value; setResting(value);
  }
  // The server rejects a taken seat (DS410) or a moved item (DS400): stand up and explain.
  useEffect(() => live.onRestRejected(message => { finishRest(); if (message) editor.setFeedback(message); }));
  // Furniture that was moved, turned or stored ends a rest on it.
  useEffect(() => {
    const active = restingRef.current;
    if (active && !targets.some(t => t.itemId === active.target.itemId && t.x === active.target.x && t.y === active.target.y && t.rotation === active.target.rotation)) finishRest();
  });

  function interact(next: SceneTarget | null) {
    if (restingRef.current) { finishRest(); return; }
    if (!next || decorating) return;
    if (next.kind === 'exit') onExit();
    else if (next.kind === 'guestbook') onGuestbook();
    else if (next.kind === 'bed' || next.kind === 'chair') beginRest(next);
  }
  const ghostItem = editor.selectedItem;
  register({
    onTarget: next => setTarget(next),
    onInteract: () => interact(targetRef.current),
    onActivate: next => interact(next),
    onRotate: () => { if (decorating) editor.rotate(); },
    onEscape: () => { if (editor.selected) editor.choose(null); else if (decorating) setDecorating(false); else if (restingRef.current) finishRest(); },
    onCursor: cell => { if (ghostItem && (ghostItem.surface === 'wall') === (cell.surface === 'wall')) editor.moveCursor(cell); },
    onNudge: step => editor.moveCursor({ x: editor.cursor.x + step.dx, y: editor.cursor.y + step.dy }),
    onPlace: () => editor.place(),
    onSelectPlaced: itemId => { if (decorating) editor.choose(itemId); },
    onStandUp: () => finishRest(false),
    blocked: () => false,
  });

  const label = resting ? localSleeping ? 'Wake up' : 'Stand up'
    : decorating || !target ? null
    : target.kind === 'exit' ? 'Exit to DormHall' : target.kind === 'guestbook' ? 'Open guestbook'
    : target.kind === 'bed' ? 'Sleep in bed' : target.kind === 'chair' ? `Sit ${item(target.itemId)?.previewKey === 'dorm-sofa' ? 'on' : 'in'} ${target.name.toLowerCase()}` : null;
  useEffect(() => { onInteractLabel(label); }, [label, onInteractLabel]);

  useEffect(() => {
    engine?.setScene({
      kind: 'room', key: `room:${dorm.owner}`, dorm, arrangement: editor.shown, resting: resting ? { itemId: resting.target.itemId } : null,
      decorating, selectedItemId: editor.selected, night, self,
      ghost: decorating && editor.selected ? { itemId: editor.selected, x: editor.cursor.x, y: editor.cursor.y, rotation: editor.rotation, valid: !!editor.status?.valid } : null,
    });
  }, [engine, dorm, editor.shown, resting, decorating, editor.selected, editor.cursor.x, editor.cursor.y, editor.rotation, editor.status?.valid, night, self]);

  const saveState = editor.state;
  return (
    <>
      <div className={styles.hud} data-scene="room" data-pose={resting ? localSleeping ? 'sleeping' : 'sitting' : 'standing'} data-time={night ? 'night' : 'day'}>
        <span className={styles.chip}>{dorm.isOwner ? 'My room' : `${dorm.owner}'s room`}</span>
        {dorm.isOwner && (saveState.kind === 'saving' || saveState.kind === 'saved') ? <span className={styles.chip} role="status">{saveState.kind === 'saving' ? 'Saving…' : '✓ All changes saved'}</span> : null}
        <span className={styles.spacer} />
        {dorm.isOwner ? (
          // SRS-500.1 / SRS-500.15: decorating is offered to the owner only; the server rejects visitor saves.
          <button type="button" className={`${styles.button} ${decorating ? styles.primary : ''}`} aria-pressed={decorating}
            onClick={() => { finishRest(); setDecorating(on => !on); editor.choose(null); editor.setFeedback(''); }}>{decorating ? 'Done decorating' : 'Decorate'}</button>
        ) : null}
        <button type="button" className={styles.button} onClick={onGuestbook}>Guestbook</button>
        <button type="button" className={styles.button} onClick={onExit}>Exit to hall</button>
      </div>
      {label ? <div className={styles.prompt} role="status"><kbd>E</kbd><span>{label}</span>
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => interact(targetRef.current)}>Go</button></div> : null}
      <div style={{ position: 'absolute', left: 12, top: 60, zIndex: 3, display: 'grid', gap: 8, maxWidth: 'min(420px, calc(100% - 24px))' }}>
        {saveState.kind === 'error' ? <p className={styles.error} role="alert">{saveState.message}</p> : null}
        {saveState.kind === 'conflict' ? (
          // SRS-505.9: offer to reload the current saved dorm before more editing.
          <div className={styles.error} role="alert">
            Your dorm was changed in another tab or device, so this change was not saved.{' '}
            <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => { editor.setState({ kind: 'idle' }); editor.choose(null); onReload(); }}>Reload my dorm</button>
          </div>
        ) : null}
        {editor.feedback ? <p className={styles.notice} role="alert">{editor.feedback}</p> : null}
        {resting ? <p className={styles.notice} role="status">{localSleeping ? 'Sleeping… the window shows nighttime for everyone here.' : 'Sitting comfortably.'} Press E or move to get up.</p> : null}
        {!dorm.isOwner ? <p className={styles.hint} style={{ background: '#ffffffd9', padding: '6px 10px', borderRadius: 10 }}>You’re visiting {dorm.owner}. Only the owner can change this room.</p> : null}
      </div>
      {decorating && dorm.isOwner ? <DecoratePanel editor={editor} thumbnails={thumbnails} onClose={() => { setDecorating(false); editor.choose(null); }} /> : null}
    </>
  );
}
