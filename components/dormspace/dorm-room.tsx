'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { placementMessages, placementProblem, placementSize, roomSolidCells, rotationFacing, type CatalogItem, type Dorm, type Placement, type Rotation } from '../../lib/dormspace-rules';
import { CELL_PX, FLOOR_Y_SCALE, exitArt, FurnitureOccupant, furnitureSprites, guestbookArt, itemArt, nightWindowArt, PixelArt, PixelAvatar, textures } from './campus-art';
import { dormApi, TouchControls, useHeldMovement } from './shared';
import { useAvatarMotion } from './use-avatar-motion';
import { moveInRoom, type Position } from '../../lib/dormspace-movement';
import { nearbyRoomTarget, restTargets, safeRestExit, type Resting, type RestTarget, type RoomTarget } from '../../lib/dormspace-interactions';
import styles from './dormspace.module.css';
import { pickCampusFurniture } from './campus-picking';
import type { PixelAvatarLook } from '../../lib/dormspace-avatar';
import type { DormLive } from './use-dorm-live';
import { LivePlayers,LocalPlayerAvatar,PlayerCaption,useLiveRoster } from './live-players';

type Arrangement = { placements: Placement[]; wallItemId: string | null; floorItemId: string | null };
type SaveState = { kind: 'idle' | 'saving' | 'saved' | 'conflict' } | { kind: 'error'; message: string };

// Textures line up with the cell grid: a tile spanning N cells covers N/width of the surface.
export function textureStyle(key: string, cols = 2, rows = 2) {
  const texture = textures[key] ?? textures['floor-oak'];
  return {
    backgroundImage: texture.image,
    backgroundSize: `${(100 * texture.span) / cols}% ${(100 * texture.span) / rows}%`,
  };
}
// Square cells: each surface keeps its width:height cell ratio and scales with the room.
const grid = (width: number, height: number) => ({
  gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
  gridTemplateRows: `repeat(${height}, minmax(0, 1fr))`,
  aspectRatio: `${width} / ${height * FLOOR_Y_SCALE}`,
});

export function DormRoom({ avatar, dorm, onDormChange, onReload, onExit, onOpenGuestbook,live,username }: {
  avatar?: PixelAvatarLook; dorm: Dorm; onDormChange: (dorm: Dorm) => void; onReload: () => void;
  onExit: () => void; onOpenGuestbook: () => void;
  live?:DormLive; username?:string;
}) {
  const floorSurface = dorm.surfaces.find((s) => s.code === 'floor') ?? { code: 'floor', width: 10, height: 7 };
  const wallSurface = dorm.surfaces.find((s) => s.code === 'wall') ?? { code: 'wall', width: 10, height: 2 };
  // The brown fixture strip is drawn below the floor but is never walkable.
  const DOORWAY_ROW = floorSurface.height;
  const LAST_FLOOR_ROW = floorSurface.height - 1;

  const [pending, setPending] = useState<Arrangement | null>(null);
  const [decorating, setDecorating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedRotation, setSelectedRotation] = useState<Rotation>(0);
  const [save, setSave] = useState<SaveState>({ kind: 'idle' });
  const [feedback, setFeedback] = useState('');
  const motion = useAvatarMotion({ x: 4, y: LAST_FLOOR_ROW }, {
    columns: floorSurface.width, rows: DOORWAY_ROW + 1, offsetX: 0.5, offsetY: 0.9, anchorY: 90,onMove:live?.move,
  });
  const [resting, setResting] = useState<Resting | null>(null);
  const restingRef = useRef(resting);
  const [interaction, setInteraction] = useState<RoomTarget | null>({ kind: 'exit' });
  const interactionRef = useRef(interaction);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => { stage.current?.focus(); }, []);

  const shown: Arrangement = pending ?? { placements: dorm.placements, wallItemId: dorm.wallItemId, floorItemId: dorm.floorItemId };
  const item = (id: string | null) => dorm.catalog.find((entry) => entry.id === id);
  const wallKey = item(shown.wallItemId)?.previewKey ?? 'wall-sage';
  const floorKey = item(shown.floorItemId)?.previewKey ?? 'floor-oak';
  const locked = save.kind === 'saving' || save.kind === 'conflict';
  const inventory = dorm.catalog.filter((entry) => entry.surface && dorm.owned.includes(entry.id)
    && !shown.placements.some((p) => p.itemId === entry.id));
  const appearances = (kind: 'wall' | 'floor') => dorm.catalog.filter((entry) => entry.kind === kind && dorm.owned.includes(entry.id));
  const targets = useMemo(() => restTargets(dorm.catalog, shown.placements), [dorm.catalog, shown.placements]);
  const playerIds=useLiveRoster(live);
  const remoteResting=playerIds.map(id=>live!.store.players.get(id)!).filter(player=>player && player.id!==live?.store.getUI().selfId && player.state.restItemId);
  const localLook=live?.store.getVisual(live.store.getUI().selfId)?.look??avatar;
  const localSleeping=resting?.target.kind==='bed';
  const sleeping = localSleeping||remoteResting.some(player=>item(player.state.restItemId)?.previewKey==='bed');

  // SRS-505.2 to SRS-505.4, SRS-505.8: every valid change saves automatically against the version it
  // was based on. Only a stored change is marked saved; otherwise the last accepted dorm stays shown.
  async function commit(next: Arrangement) {
    setPending(next);
    setSave({ kind: 'saving' });
    setFeedback('');
    const result = await dormApi<Dorm>('/api/dorm', { method: 'PUT', body: JSON.stringify({ version: dorm.version, ...next }) });
    setPending(null);
    if (result.ok) { onDormChange(result.data); setSave({ kind: 'saved' }); return; }
    if (result.status === 409) { setSave({ kind: 'conflict' }); return; }
    setSave({ kind: 'error', message: result.status === 0
      ? 'Your change was not saved. Check your connection, then reload your dorm.'
      : `Your change was not saved. ${result.error}` });
  }

  function placeAt(surface: string, x: number, y: number) {
    if (!decorating || locked || !selected) return;
    const chosen = item(selected);
    if (!chosen) return;
    if (chosen.surface !== surface) {
      setFeedback(`${chosen.name} belongs on the ${chosen.surface === 'wall' ? 'wall' : 'floor'}.`);
      return;
    }
    const candidate = { itemId: chosen.id, x, y, rotation: selectedRotation };
    // SRS-500.11, SRS-500.12: name the violated rule and keep the last accepted arrangement.
    const problem = placementProblem({ ...dorm, placements: shown.placements }, shown.placements, candidate);
    if (problem) { setFeedback(placementMessages[problem]); return; }
    setSelected(null);
    void commit({ ...shown, placements: [...shown.placements.filter((p) => p.itemId !== chosen.id), candidate] });
  }

  function chooseItem(id: string | null) {
    setSelected(id);
    setSelectedRotation(shown.placements.find((placement) => placement.itemId === id)?.rotation ?? 0);
    setFeedback('');
  }

  function rotateSelected() {
    const chosen = item(selected);
    if (!decorating || locked || chosen?.surface !== 'floor') return;
    const rotation = ((selectedRotation + 90) % 360) as Rotation;
    setSelectedRotation(rotation); setFeedback('');
    const current = shown.placements.find((placement) => placement.itemId === selected);
    if (!current) return;
    const candidate = { ...current, rotation };
    const problem = placementProblem(dorm, shown.placements, candidate);
    if (problem) {
      setFeedback(`${placementMessages[problem]} Choose another spot for this orientation, or rotate again.`);
      return;
    }
    void commit({ ...shown, placements: shown.placements.map((placement) => placement.itemId === selected ? candidate : placement) });
  }

  function returnToInventory(itemId: string) {
    setSelected(null);
    void commit({ ...shown, placements: shown.placements.filter((p) => p.itemId !== itemId) });
  }

  function chooseAppearance(kind: 'wall' | 'floor', id: string) {
    if (locked) return;
    void commit({ ...shown, [kind === 'wall' ? 'wallItemId' : 'floorItemId']: id });
  }

  // Block raised floor items in owned and visited rooms, using the arrangement on screen.
  const solid = useMemo(() => roomSolidCells(dorm.catalog, shown.placements, DOORWAY_ROW, floorSurface.width), [dorm.catalog, shown.placements, DOORWAY_ROW, floorSurface.width]);

  function updateInteraction(position: Position, editing = decorating) {
    const nearby = nearbyRoomTarget(position, editing ? [] : targets, floorSurface.height);
    if (nearby?.kind !== interactionRef.current?.kind || nearby?.itemId !== interactionRef.current?.itemId
      || ((nearby?.kind === 'bed' || nearby?.kind === 'chair') && nearby !== interactionRef.current)) {
      interactionRef.current = nearby; setInteraction(nearby);
    }
  }

  function finishRest(stopInput = true) {
    if (stopInput) walk.releaseAll();
    const active = restingRef.current;
    if (!active) return;
    const returnTo = safeRestExit(active.returnTo, active.target, floorSurface.width, floorSurface.height, solid);
    if (returnTo) {
      motion.move(returnTo);
      if (motion.sprite.current) motion.sprite.current.style.zIndex = String(depth(returnTo.y) + 1);
    }
    restingRef.current = null; setResting(null);
    updateInteraction(motion.position.current);
    stage.current?.focus();
  }

  function beginRest(target: RestTarget) {
    if (decorating) return;
    if(remoteResting.some(player=>player.state.restItemId===target.itemId)){setFeedback('Someone is already using that furniture.');return;}
    if (restingRef.current?.target.itemId === target.itemId) { finishRest(); return; }
    const returnTo = safeRestExit(motion.position.current, target, floorSurface.width, floorSurface.height, solid);
    if (!returnTo) { setFeedback('Leave some clear floor space before using this furniture.'); return; }
    walk.releaseAll(); setFeedback('');
    motion.move(returnTo);
    const next = { target, returnTo };
    restingRef.current = next; setResting(next);
    stage.current?.focus();
  }

  function step(delta: Position) {
    // A direction stands up/wakes first, then continues moving from clear floor space.
    if (restingRef.current) finishRest(false);
    // SRS-504.7: stay inside the room, and never step onto a solid square.
    const next = moveInRoom(motion.position.current, { x: delta.x, y: delta.y / FLOOR_Y_SCALE }, floorSurface.width, LAST_FLOOR_ROW, solid);
    if (next === motion.position.current) return;
    motion.move(next);
    if (motion.sprite.current) motion.sprite.current.style.zIndex = String(depth(next.y) + 1);
    updateInteraction(next);
  }
  const walk = useHeldMovement(step);
  const restFailure=useRef<(message:string)=>void>(()=>{});
  const positionCorrection=useRef<(position:Position)=>void>(()=>{});
  restFailure.current=message=>{finishRest();setFeedback(message);};
  positionCorrection.current=position=>{motion.move(position);if(motion.sprite.current)motion.sprite.current.style.zIndex=String(depth(position.y)+1);updateInteraction(position);};
  useEffect(()=>{live?.setLocal({...motion.position.current,facing:walk.facing,moving:walk.moving,sprinting:walk.sprinting,restItemId:resting?.target.itemId??null});},[live,walk.facing,walk.moving,walk.sprinting,resting]);
  useEffect(()=>live?.onRestRejected(message=>restFailure.current(message)),[live]);
  useEffect(()=>live?.onCorrection(position=>positionCorrection.current(position)),[live]);

  function interact() {
    if (restingRef.current) { finishRest(); return; }
    walk.releaseAll();
    const target = interactionRef.current;
    if (target?.kind === 'exit') onExit();
    else if (target?.kind === 'guestbook') onOpenGuestbook();
    else if (target?.kind === 'bed' || target?.kind === 'chair') beginRest(target);
  }

  useEffect(() => {
    const active = restingRef.current;
    if (active && !targets.some((target) => target.itemId === active.target.itemId && target.x === active.target.x && target.y === active.target.y && target.rotation === active.target.rotation)) finishRest();
    const position = motion.position.current;
    if (solid.has(`${Math.round(position.x)},${Math.round(position.y)}`)) {
      // Moving or turning furniture can cover the avatar's previous square. Keep a clear exit.
      const clear = safeRestExit(position, { x: Math.round(position.x), y: Math.round(position.y), width: 1, height: 1 }, floorSurface.width, floorSurface.height, solid);
      if (clear) {
        motion.move(clear);
        if (motion.sprite.current) motion.sprite.current.style.zIndex = String(depth(clear.y) + 1);
      }
    }
    updateInteraction(motion.position.current);
  }, [targets, decorating, solid]);

  // Depth: layer pieces and the avatar by their row, with raised furniture in front of an avatar
  // standing just above it. Wall decorations stay behind everything on the floor.
  const depth = (row: number) => 10 + Math.round(row) * 2;

  function renderItems(surface: string) {
    return shown.placements.map((placement) => {
      const entry = item(placement.itemId);
      if (!entry || entry.surface !== surface) return null;
      const localOccupied=resting?.target.itemId===entry.id;
      const remoteOccupant=remoteResting.find(player=>player.state.restItemId===entry.id);
      const occupied=localOccupied||Boolean(remoteOccupant);
      const occupantKind=entry.previewKey==='bed'?'bed':'chair';
      const usable = targets.find((target) => target.itemId === entry.id);
      const rotation = placement.rotation ?? 0;
      const size = placementSize(entry, rotation);
      const art = entry.previewKey === 'window' && sleeping ? nightWindowArt : furnitureSprites(entry.previewKey, rotation)?.idle;
      const rise = art ? art.h / (size.height * CELL_PX * FLOOR_Y_SCALE) : 1;
      return (
        <button
          key={entry.id} type="button" className={`${styles.item} ${usable ? styles.usableItem : ''}`} data-selected={selected === entry.id}
          data-occupied={occupied ? occupantKind : undefined}
          data-occupant-player={remoteOccupant?.id}
          data-rotation={rotation} data-item-key={entry.previewKey}
          tabIndex={decorating ? (!selected ? 0 : -1) : usable ? 0 : -1} title={entry.name}
          style={{
            gridColumn: `${placement.x + 1} / span ${size.width}`, gridRow: `${placement.y + 1} / span ${size.height}`,
            zIndex: surface === 'floor' ? entry.overlapCategory === 'rug' ? 2 : depth(placement.y + size.height - 1) : 1,
          }}
          onClick={() => {
            if (decorating && !locked) chooseItem(entry.id);
            else if (!decorating && usable) beginRest(usable);
          }}
          aria-label={decorating ? `Select ${entry.name} to move or return it` : usable ? `${usable.kind === 'bed' ? 'Sleep in' : entry.previewKey === 'dorm-sofa' ? 'Sit on' : 'Sit in'} ${entry.name}` : entry.name}
        >
          {art ? <PixelArt art={art} className={styles.itemSprite} style={{ height: `${rise * 100}%` }}
            label={entry.previewKey === 'window' ? sleeping ? 'Window at night with moon and stars' : 'Window during daytime' : undefined} /> : entry.name}
          {occupied ? <span className={styles.occupantLayer} data-caption-edge={placement.x<2?'left':placement.x+size.width>floorSurface.width-2?'right':'center'} style={{ height: `${rise * 100}%` }}>
            <FurnitureOccupant look={remoteOccupant?.look??localLook} kind={occupantKind} itemKey={entry.previewKey} rotation={rotation} seatName={entry.name.toLowerCase()}
              caption={<PlayerCaption live={live} id={remoteOccupant?.id} self={!remoteOccupant} name={remoteOccupant?.username??username}/>}/>
          </span> : null}
        </button>
      );
    });
  }

  function renderCells(surface: string, width: number, height: number) {
    return Array.from({ length: width * height }, (_, i) => {
      const x = i % width;
      const y = Math.floor(i / width);
      const reserved = dorm.reserved.some((cell) => cell.surface === surface && cell.x === x && cell.y === y);
      const position = { gridColumn: x + 1, gridRow: y + 1 };
      return decorating && selected ? (
        <button key={`${surface}-${x}-${y}`} type="button" className={styles.cell} style={position} data-reserved={reserved}
          aria-label={`Place at column ${x + 1}, row ${y + 1}${reserved ? ' (doorway)' : ''}`} onClick={() => placeAt(surface, x, y)} />
      ) : <span key={`${surface}-${x}-${y}`} className={styles.cell} style={position} data-reserved={decorating && reserved} />;
    });
  }

  const selectedItem = item(selected);
  const selectedIsPlaced = shown.placements.some((p) => p.itemId === selected);
  const selectedSprite = selectedItem ? furnitureSprites(selectedItem.previewKey, selectedRotation)?.idle : null;
  const selectedSize = selectedItem ? placementSize(selectedItem, selectedRotation) : null;

  return (
    <section aria-label={dorm.isOwner ? 'My Dorm' : `${dorm.owner}'s dorm`} className={styles.game}
      data-pose={resting ? localSleeping ? 'sleeping' : 'sitting' : 'standing'} data-time={sleeping ? 'night' : 'day'}
      onKeyDown={(event) => {
        const target = event.target as HTMLElement;
        if (decorating && selected && event.key.toLowerCase() === 'r' && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey
          && !target.closest('input,select,textarea,[contenteditable="true"]')) {
          event.preventDefault(); rotateSelected();
        }
      }}>
      <div className={styles.toolbar}>
        <h2>{dorm.isOwner ? 'My Dorm' : `${dorm.owner}'s Dorm`}</h2>
        {dorm.isOwner ? (
          // SRS-500.1: decorating mode is offered only to the owner.
          <button type="button" className={`${styles.button} ${decorating ? styles.primary : ''}`} aria-pressed={decorating}
            onClick={() => { finishRest(); setDecorating((on) => !on); setSelected(null); setFeedback(''); }}>
            {decorating ? 'Done decorating' : 'Decorate'}
          </button>
        ) : null}
        <button type="button" className={styles.button} onClick={onOpenGuestbook}>Guestbook</button>
        <button type="button" className={styles.button} onClick={onExit}>Exit to DormHall</button>
      </div>

      {dorm.isOwner && (save.kind === 'saving' || save.kind === 'saved') ? (
        <p className={styles.badge} role="status">{save.kind === 'saving' ? 'Saving…' : '✔ All changes saved'}</p>
      ) : null}
      {save.kind === 'error' ? <p className={styles.error} role="alert">{save.message}</p> : null}
      {save.kind === 'conflict' ? (
        // SRS-505.9: offer to reload the current saved dorm before further editing.
        <div className={styles.notice} role="alert">
          <p>Your dorm was changed in another tab or device, so this change was not saved.</p>
          <button type="button" className={`${styles.button} ${styles.primary}`} style={{ marginTop: 10 }}
            onClick={() => { setSave({ kind: 'idle' }); setSelected(null); onReload(); }}>Reload my dorm</button>
        </div>
      ) : null}
      {feedback ? <p className={styles.notice} role="alert">{feedback}</p> : null}
      {resting ? <p className={styles.restStatus} role="status">
        {localSleeping ? 'Sleeping… The window shows nighttime. Press E to wake up.' : 'Sitting comfortably. Press E to stand up.'} Moving also gets you up.
      </p> : null}

      <div className={styles.roomLayout} data-decorating={decorating}>
        <div
          ref={stage} className={`${styles.stage} ${styles.roomStage} ${decorating ? styles.decorating : ''}`} tabIndex={0} aria-label="Dorm movement area"
          data-placing={Boolean(decorating && selected)}
          onClickCapture={(event) => {
            if (!event.detail || event.button !== 0 || locked || (decorating && selected)) return;
            const picked = pickCampusFurniture(event.currentTarget, event.clientX, event.clientY);
            if (picked) { event.preventDefault(); event.stopPropagation(); picked.click(); }
          }}
          onKeyDown={(event) => walk.onKeyDown(event, interact)} onKeyUp={walk.onKeyUp} onBlur={walk.releaseKeyboard}
        >
          <div className={styles.room}>
            <div className={`${styles.surface} ${styles.wallSurface}`} aria-label="Wall"
              style={{ ...grid(wallSurface.width, wallSurface.height), ...textureStyle(wallKey, wallSurface.width, wallSurface.height) }}>
              {renderCells('wall', wallSurface.width, wallSurface.height)}
              {renderItems('wall')}
            </div>
            <div ref={motion.area} className={styles.walkArea}>
              <div className={`${styles.surface} ${styles.floorSurface}`} aria-label="Floor"
                style={{ ...grid(floorSurface.width, floorSurface.height), ...textureStyle(floorKey, floorSurface.width, floorSurface.height) }}>
                {renderCells('floor', floorSurface.width, floorSurface.height)}
                {renderItems('floor')}
              </div>
              <div className={styles.doorway} style={grid(floorSurface.width, 1)} role="group" aria-label="Guestbook and exit strip">
                <span className={styles.fixture} style={{ gridColumn: '1 / span 2' }} title="Guestbook">
                  <PixelArt art={guestbookArt} className={styles.itemSprite} label="Guestbook" />
                </span>
                <span className={styles.fixture} style={{ gridColumn: '5 / span 2' }} title="Exit">
                  <PixelArt art={exitArt} className={styles.itemSprite} label="Exit" />
                </span>
              </div>
              <span ref={motion.sprite} data-dorm-avatar hidden={Boolean(resting)} className={styles.roomAvatar} style={{
                width: `${100 / floorSurface.width}%`, zIndex: depth(LAST_FLOOR_ROW) + 1,
              }}>
                <LocalPlayerAvatar live={live} look={avatar} facing={walk.facing} moving={walk.moving} sprinting={walk.sprinting} />
                <PlayerCaption live={live} self name={username}/>
              </span>
              {live?<LivePlayers live={live} kind="room" columns={floorSurface.width} rows={DOORWAY_ROW+1} offsetX={.5} offsetY={.9} anchorY={90} size={motion.size}/>:null}
            </div>
          </div>
        </div>

        {decorating ? (
          <aside className={styles.panel} aria-label="Decorating tools">
            {selectedItem ? (
              <div>
                <h3>{selectedItem.name}</h3>
                <p className={styles.hint}>Choose a spot{selectedItem.surface === 'wall' ? ' on the wall' : ' on the floor'}. The item’s top-left corner goes where you click.</p>
                {selectedSprite ? <div className={styles.rotationPreview}>
                  <PixelArt art={selectedSprite} label={`${selectedItem.name} preview, ${rotationFacing[selectedRotation]} view`} />
                  <span>{selectedSize?.width} × {selectedSize?.height} squares{selectedItem.surface === 'floor' ? ` · ${selectedRotation}°` : ''}</span>
                </div> : null}
                <div className={styles.inventory} style={{ marginTop: 8 }}>
                  {selectedItem.surface === 'floor' ? <button type="button" className={styles.button} disabled={locked} onClick={rotateSelected}>Rotate clockwise ↻</button> : null}
                  {selectedIsPlaced ? (
                    <button type="button" className={styles.button} disabled={locked} onClick={() => returnToInventory(selectedItem.id)}>Return to inventory</button>
                  ) : null}
                  <button type="button" className={styles.button} onClick={() => { setSelected(null); setFeedback(''); }}>Cancel</button>
                </div>
              </div>
            ) : <p className={styles.hint}>Select an item in your room to move it, or pick one from your inventory.</p>}

            {shown.placements.length ? <div className={styles.placedPicker}>
              <label htmlFor="dorm-placed-furniture">Placed furniture</label>
              <select id="dorm-placed-furniture" value={selectedIsPlaced ? selected ?? '' : ''} disabled={locked}
                onChange={(event) => chooseItem(event.target.value || null)}>
                <option value="">Choose an item to move or return</option>
                {shown.placements.map((placement) => <option key={placement.itemId} value={placement.itemId}>{item(placement.itemId)?.name ?? 'Item'}</option>)}
              </select>
            </div> : null}

            <div>
              <h3>Inventory</h3>
              {inventory.length ? (
                <div className={`${styles.inventory} ${styles.furnitureInventory}`}>
                  {inventory.map((entry: CatalogItem) => (
                    <button key={entry.id} type="button" className={`${styles.slot} ${selected === entry.id ? styles.primary : ''}`}
                      disabled={locked} aria-pressed={selected === entry.id} title={entry.name}
                      onClick={() => chooseItem(entry.id)}>
                      {itemArt[entry.previewKey] ? <PixelArt art={itemArt[entry.previewKey]} className={styles.slotSprite} /> : null}
                      <span>{entry.name}</span>
                    </button>
                  ))}
                </div>
              ) : <p className={styles.hint}>Everything you own is in your room.</p>}
            </div>

            {(['wall', 'floor'] as const).map((kind) => (
              <div key={kind}>
                <h3>{kind === 'wall' ? 'Wallpaper' : 'Flooring'}</h3>
                <div className={styles.swatches}>
                  {appearances(kind).map((entry) => (
                    <button key={entry.id} type="button" className={styles.swatch} style={textureStyle(entry.previewKey)}
                      aria-label={entry.name} title={entry.name} disabled={locked}
                      aria-pressed={(kind === 'wall' ? shown.wallItemId : shown.floorItemId) === entry.id}
                      onClick={() => chooseAppearance(kind, entry.id)} />
                  ))}
                </div>
              </div>
            ))}
          </aside>
        ) : null}
      </div>

      <TouchControls onPress={walk.press} onRelease={walk.release} onInteract={interact}
        interactLabel={resting ? localSleeping ? 'Wake up' : 'Stand up'
          : interaction?.kind === 'exit' ? 'Exit' : interaction?.kind === 'guestbook' ? 'Guestbook'
          : interaction?.kind === 'bed' ? 'Sleep in bed' : interaction?.kind === 'chair' ? `Sit ${item(interaction.itemId)?.previewKey === 'dorm-sofa' ? 'on' : 'in'} ${interaction.name.toLowerCase()}` : null}
        sprinting={walk.sprinting} onSprint={walk.setSprinting} />
      <p className={styles.hint}>
        {dorm.isOwner ? 'Your room saves automatically while you decorate. ' : `You’re visiting ${dorm.owner}. `}
        Click a bed to sleep or a seat to sit, or walk nearby and press E. While decorating, select floor furniture and use Rotate or press R to turn it. Use the exit and guestbook from the floor above the entry strip.
      </p>
    </section>
  );
}
