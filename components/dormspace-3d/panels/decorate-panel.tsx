'use client';
// Owner-only decorating drawer: inventory, placed-item picker, keyboard grid coordinates with live
// validity, quarter turns, store (inventory return, never a sale) and wall/floor appearances.
import { placementSize } from '../../../lib/dormspace-rules';
import { FLOOR_SWATCHES as FLOOR_SWATCH, WALL_COLORS } from '../scene/palette';
import type { useRoomEditor } from '../use-room-editor';
import styles from '../dormspace-3d.module.css';

type Editor = ReturnType<typeof useRoomEditor>;

export function DecoratePanel({ editor, thumbnails, onClose }: { editor: Editor; thumbnails: Record<string, string>; onClose: () => void }) {
  const { selectedItem, shown, locked, status, cursor, rotation } = editor;
  const placed = selectedItem ? shown.placements.some(p => p.itemId === selectedItem.id) : false;
  const size = selectedItem ? placementSize(selectedItem, rotation) : null;
  return (
    <aside className={styles.drawer} aria-label="Decorating tools">
      <div className={styles.drawerHeader}><h3>Decorate</h3><button type="button" className={styles.button} onClick={onClose}>Done</button></div>
      {selectedItem ? (
        <section aria-label={`Placing ${selectedItem.name}`} style={{ display: 'grid', gap: 8 }}>
          <strong>{selectedItem.name}</strong>
          <p className={styles.hint}>
            Point at the {selectedItem.surface === 'wall' ? 'wall' : 'floor'} and click, or use the arrow keys or the coordinates below, then press Enter or Place.
            {selectedItem.surface === 'floor' ? ' Press R or Rotate for a quarter turn.' : ' Wall decorations stay upright.'}
          </p>
          <div className={styles.coords}>
            <label>Column<input type="number" min={1} value={cursor.x + 1} disabled={locked}
              onChange={event => editor.moveCursor({ x: Number(event.target.value) - 1 || 0, y: cursor.y })} /></label>
            <label>Row<input type="number" min={1} value={cursor.y + 1} disabled={locked}
              onChange={event => editor.moveCursor({ x: cursor.x, y: Number(event.target.value) - 1 || 0 })} /></label>
            <span className={styles.hint}>{size?.width} × {size?.height} squares{selectedItem.surface === 'floor' ? ` · ${rotation}°` : ''}</span>
          </div>
          <p role="status" aria-live="polite" className={status?.valid ? styles.valid : styles.invalid}>{status?.message}</p>
          <div className={styles.controls}>
            <button type="button" className={`${styles.button} ${styles.primary}`} disabled={locked || !status?.valid} onClick={editor.place}>{placed ? 'Move here' : 'Place here'}</button>
            {selectedItem.surface === 'floor' ? <button type="button" className={styles.button} disabled={locked} onClick={editor.rotate}>Rotate ↻</button> : null}
            {placed ? <button type="button" className={styles.button} disabled={locked} onClick={() => editor.store(selectedItem.id)}>Store in inventory</button> : null}
            <button type="button" className={styles.button} onClick={() => editor.choose(null)}>Cancel</button>
          </div>
        </section>
      ) : <p className={styles.hint}>Click a piece of furniture in your room to move it, or choose one from your inventory.</p>}

      {shown.placements.length ? (
        <label className={styles.field}>Placed furniture
          <select value={placed ? selectedItem!.id : ''} disabled={locked} onChange={event => editor.choose(event.target.value || null)}>
            <option value="">Choose an item to move, turn or store</option>
            {shown.placements.map(p => <option key={p.itemId} value={p.itemId}>{editor.item(p.itemId)?.name ?? 'Item'}</option>)}
          </select>
        </label>
      ) : null}

      <section aria-label="Inventory" style={{ display: 'grid', gap: 8 }}>
        <h3>Inventory</h3>
        {editor.inventory.length ? (
          <div className={styles.inventory}>
            {editor.inventory.map(entry => (
              <button key={entry.id} type="button" className={styles.slot} aria-pressed={editor.selected === entry.id} disabled={locked} onClick={() => editor.choose(entry.id)}>
                {thumbnails[entry.previewKey] ? <img src={thumbnails[entry.previewKey]} alt="" /> : null}
                <span>{entry.name}</span>
              </button>
            ))}
          </div>
        ) : <p className={styles.hint}>Everything you own is in your room.</p>}
      </section>

      {(['wall', 'floor'] as const).map(kind => (
        <section key={kind} aria-label={kind === 'wall' ? 'Wall colour' : 'Flooring'} style={{ display: 'grid', gap: 8 }}>
          <h3>{kind === 'wall' ? 'Wall colour' : 'Flooring'}</h3>
          <div className={styles.swatches}>
            {editor.appearances(kind).map(entry => (
              <button key={entry.id} type="button" className={styles.swatch} title={entry.name} aria-label={entry.name} disabled={locked}
                style={{ background: (kind === 'wall' ? WALL_COLORS : FLOOR_SWATCH)[entry.previewKey] ?? '#ccc' }}
                aria-pressed={(kind === 'wall' ? shown.wallItemId : shown.floorItemId) === entry.id}
                onClick={() => editor.appearance(kind, entry.id)} />
            ))}
          </div>
        </section>
      ))}
    </aside>
  );
}
