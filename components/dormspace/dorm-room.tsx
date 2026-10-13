'use client';

import { useEffect, useRef, useState } from 'react';
import { placementMessages, placementProblem, type CatalogItem, type Dorm, type Placement } from '../../lib/dormspace-rules';
import { CELL_PX, exitArt, guestbookArt, itemArt, PixelArt, PixelAvatar, textures } from './pixel-art';
import { dormApi, TouchControls, useHeldMovement, type Direction } from './shared';
import styles from './dormspace.module.css';

const TICK_MS = 130;
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
  aspectRatio: `${width} / ${height}`,
});

export function DormRoom({ dorm, onDormChange, onReload, onExit, onOpenGuestbook }: {
  dorm: Dorm; onDormChange: (dorm: Dorm) => void; onReload: () => void;
  onExit: () => void; onOpenGuestbook: () => void;
}) {
  const floorSurface = dorm.surfaces.find((s) => s.code === 'floor') ?? { code: 'floor', width: 10, height: 7 };
  const wallSurface = dorm.surfaces.find((s) => s.code === 'wall') ?? { code: 'wall', width: 10, height: 2 };
  // The avatar walks the floor plus one doorway row below it, where the exit and guestbook are.
  const DOORWAY_ROW = floorSurface.height;

  const [pending, setPending] = useState<Arrangement | null>(null);
  const [decorating, setDecorating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>({ kind: 'idle' });
  const [feedback, setFeedback] = useState('');
  const [avatar, setAvatar] = useState({ x: 4, y: DOORWAY_ROW });
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
    const candidate = { itemId: chosen.id, x, y };
    // SRS-500.11, SRS-500.12: name the violated rule and keep the last accepted arrangement.
    const problem = placementProblem({ ...dorm, placements: shown.placements }, shown.placements, candidate);
    if (problem) { setFeedback(placementMessages[problem]); return; }
    setSelected(null);
    void commit({ ...shown, placements: [...shown.placements.filter((p) => p.itemId !== chosen.id), candidate] });
  }

  function returnToInventory(itemId: string) {
    setSelected(null);
    void commit({ ...shown, placements: shown.placements.filter((p) => p.itemId !== itemId) });
  }

  function chooseAppearance(kind: 'wall' | 'floor', id: string) {
    if (locked) return;
    void commit({ ...shown, [kind === 'wall' ? 'wallItemId' : 'floorItemId']: id });
  }

  // Solid squares: the guestbook stand in the doorway row and every placed chair. Beds, desks and
  // other furniture stay walkable. (Owner request; SRS-504.8 calls for no furniture collision, so the
  // team should amend that requirement or revisit this.)
  const solid = new Set([`0,${DOORWAY_ROW}`, `1,${DOORWAY_ROW}`]);
  for (const placement of shown.placements) {
    const entry = item(placement.itemId);
    if (entry?.previewKey !== 'chair' || entry.surface !== 'floor') continue;
    for (let dx = 0; dx < (entry.width ?? 1); dx++) for (let dy = 0; dy < (entry.height ?? 1); dy++) solid.add(`${placement.x + dx},${placement.y + dy}`);
  }

  // The exit is used by standing on it; the guestbook from the square beside or above the stand.
  const interaction = avatar.y === DOORWAY_ROW && avatar.x >= 4 && avatar.x <= 5 ? 'exit'
    : (avatar.y === DOORWAY_ROW && avatar.x === 2) || (avatar.y === DOORWAY_ROW - 1 && avatar.x <= 1) ? 'guestbook' : null;

  function step(direction: Direction) {
    // SRS-504.7: stay inside the room, and never step onto a solid square.
    setAvatar((current) => {
      const next = {
        x: Math.min(floorSurface.width - 1, Math.max(0, current.x + (direction === 'left' ? -1 : direction === 'right' ? 1 : 0))),
        y: Math.min(DOORWAY_ROW, Math.max(0, current.y + (direction === 'up' ? -1 : direction === 'down' ? 1 : 0))),
      };
      return solid.has(`${next.x},${next.y}`) ? current : next;
    });
  }
  const walk = useHeldMovement(step, TICK_MS);

  function interact() {
    walk.releaseAll();
    if (interaction === 'exit') onExit();
    else if (interaction === 'guestbook') onOpenGuestbook();
  }

  // Depth: a piece is layered by its top row and the avatar by the row it stands on, so the avatar is
  // drawn over any bed or desk square it walks across (SRS-504.8) and behind a piece's raised front
  // only when standing just above it. Wall decorations stay behind everything on the floor.
  const depth = (row: number) => 10 + row * 2;

  function renderItems(surface: string) {
    return shown.placements.map((placement) => {
      const entry = item(placement.itemId);
      if (!entry || entry.surface !== surface) return null;
      const art = itemArt[entry.previewKey];
      const rise = art ? art.h / ((entry.height ?? 1) * CELL_PX) : 1;
      return (
        <button
          key={entry.id} type="button" className={styles.item} data-selected={selected === entry.id}
          tabIndex={decorating && !selected ? 0 : -1} title={entry.name}
          style={{
            gridColumn: `${placement.x + 1} / span ${entry.width}`, gridRow: `${placement.y + 1} / span ${entry.height}`,
            zIndex: surface === 'floor' ? depth(placement.y) : 1,
          }}
          onClick={() => { if (decorating && !locked) { setSelected(entry.id); setFeedback(''); } }}
          aria-label={decorating ? `Select ${entry.name} to move or return it` : entry.name}
        >
          {art ? <PixelArt art={art} className={styles.itemSprite} style={{ height: `${rise * 100}%` }} /> : entry.name}
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
  const walkRows = floorSurface.height + 1;

  return (
    <section aria-label={dorm.isOwner ? 'My Dorm' : `${dorm.owner}'s dorm`} className={styles.game}>
      <div className={styles.toolbar}>
        <h2>{dorm.isOwner ? 'My Dorm' : `${dorm.owner}'s Dorm`}</h2>
        {dorm.isOwner ? (
          // SRS-500.1: decorating mode is offered only to the owner.
          <button type="button" className={`${styles.button} ${decorating ? styles.primary : ''}`} aria-pressed={decorating}
            onClick={() => { setDecorating((on) => !on); setSelected(null); setFeedback(''); }}>
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

      <div className={styles.roomLayout} data-decorating={decorating}>
        <div
          ref={stage} className={`${styles.stage} ${styles.roomStage} ${decorating ? styles.decorating : ''}`} tabIndex={0}
          data-placing={Boolean(decorating && selected)}
          onKeyDown={(event) => walk.onKeyDown(event, interact)} onKeyUp={walk.onKeyUp} onBlur={walk.releaseAll}
        >
          <div className={styles.room}>
            <div className={`${styles.surface} ${styles.wallSurface}`} aria-label="Wall"
              style={{ ...grid(wallSurface.width, wallSurface.height), ...textureStyle(wallKey, wallSurface.width, wallSurface.height) }}>
              {renderCells('wall', wallSurface.width, wallSurface.height)}
              {renderItems('wall')}
            </div>
            <div className={styles.walkArea}>
              <div className={`${styles.surface} ${styles.floorSurface}`} aria-label="Floor"
                style={{ ...grid(floorSurface.width, floorSurface.height), ...textureStyle(floorKey, floorSurface.width, floorSurface.height) }}>
                {renderCells('floor', floorSurface.width, floorSurface.height)}
                {renderItems('floor')}
              </div>
              <div className={styles.doorway} style={grid(floorSurface.width, 1)}>
                <span className={styles.fixture} style={{ gridColumn: '1 / span 2' }} title="Guestbook">
                  <PixelArt art={guestbookArt} className={styles.itemSprite} label="Guestbook" />
                </span>
                <span className={styles.fixture} style={{ gridColumn: '5 / span 2' }} title="Exit">
                  <PixelArt art={exitArt} className={styles.itemSprite} label="Exit" />
                </span>
              </div>
              <span className={styles.roomAvatar} style={{
                left: `${((avatar.x + 0.5) / floorSurface.width) * 100}%`, top: `${((avatar.y + 0.9) / walkRows) * 100}%`,
                width: `${100 / floorSurface.width}%`, transitionDuration: `${walk.tick}ms`, zIndex: depth(avatar.y) + 1,
              }}>
                <PixelAvatar facing={walk.facing} moving={walk.moving} sprinting={walk.sprinting} />
              </span>
            </div>
          </div>
        </div>

        {decorating ? (
          <aside className={styles.panel} aria-label="Decorating tools">
            {selectedItem ? (
              <div>
                <h3>{selectedItem.name}</h3>
                <p className={styles.hint}>Choose a spot{selectedItem.surface === 'wall' ? ' on the wall' : ' on the floor'}. The item’s top-left corner goes where you click.</p>
                <div className={styles.inventory} style={{ marginTop: 8 }}>
                  {selectedIsPlaced ? (
                    <button type="button" className={styles.button} disabled={locked} onClick={() => returnToInventory(selectedItem.id)}>Return to inventory</button>
                  ) : null}
                  <button type="button" className={styles.button} onClick={() => { setSelected(null); setFeedback(''); }}>Cancel</button>
                </div>
              </div>
            ) : <p className={styles.hint}>Select an item in your room to move it, or pick one from your inventory.</p>}

            <div>
              <h3>Inventory</h3>
              {inventory.length ? (
                <div className={styles.inventory}>
                  {inventory.map((entry: CatalogItem) => (
                    <button key={entry.id} type="button" className={`${styles.slot} ${selected === entry.id ? styles.primary : ''}`}
                      disabled={locked} aria-pressed={selected === entry.id} title={entry.name}
                      onClick={() => { setSelected(entry.id); setFeedback(''); }}>
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
        interactLabel={interaction === 'exit' ? 'Exit' : interaction === 'guestbook' ? 'Guestbook' : null}
        sprinting={walk.sprinting} onSprint={walk.setSprinting} />
      <p className={styles.hint}>
        {dorm.isOwner ? 'Your room saves automatically while you decorate. ' : `You’re visiting ${dorm.owner}. `}
        Walk to the doorway and press E at the exit or the guestbook.
      </p>
    </section>
  );
}
