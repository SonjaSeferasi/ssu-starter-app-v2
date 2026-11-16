'use client';
// SRS-500 / SRS-505 decorating in the 3D room: the same versioned PUT /api/dorm autosave, conflict
// reload and placement rules as the campus version. A rejected move never changes the shown room.
import { useCallback, useState } from 'react';
import { placementMessages, placementProblem, placementSize, type Dorm, type Placement, type Rotation } from '../../lib/dormspace-rules';
import { ghostStatus, type GhostStatus } from '../../lib/dormspace-3d-world';
import { dormRequest } from './api';

export type Arrangement = { placements: Placement[]; wallItemId: string | null; floorItemId: string | null };
export type SaveState = { kind: 'idle' | 'saving' | 'saved' | 'conflict' } | { kind: 'error'; message: string };
export type Cursor = { x: number; y: number };
export type Save = (dorm: Dorm, next: Arrangement) => Promise<{ ok: true; dorm: Dorm } | { ok: false; status: number; error: string }>;

export const saveToServer: Save = async (dorm, next) => {
  const result = await dormRequest<Dorm>('/api/dorm', { method: 'PUT', body: JSON.stringify({ version: dorm.version, ...next }) });
  return result.ok ? { ok: true, dorm: result.data } : { ok: false, status: result.status, error: result.error };
};

export function useRoomEditor(dorm: Dorm, onDormChange: (dorm: Dorm) => void, save: Save = saveToServer) {
  const [pending, setPending] = useState<Arrangement | null>(null);
  const [state, setState] = useState<SaveState>({ kind: 'idle' });
  const [selected, setSelected] = useState<string | null>(null);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [cursor, setCursor] = useState<Cursor>({ x: 0, y: 0 });
  const [feedback, setFeedback] = useState('');
  const shown: Arrangement = pending ?? { placements: dorm.placements, wallItemId: dorm.wallItemId, floorItemId: dorm.floorItemId };
  const locked = state.kind === 'saving' || state.kind === 'conflict';
  const item = useCallback((id: string | null) => dorm.catalog.find(entry => entry.id === id), [dorm.catalog]);
  const selectedItem = item(selected);
  const surfaceOf = (id: string | null) => (item(id)?.surface === 'wall' ? 'wall' : 'floor') as 'floor' | 'wall';
  const surfaceSize = (surface: 'floor' | 'wall') => dorm.surfaces.find(s => s.code === surface) ?? { code: surface, width: 10, height: surface === 'floor' ? 7 : 5 };

  async function commit(next: Arrangement) {
    if (!dorm.isOwner) return;
    setPending(next); setState({ kind: 'saving' }); setFeedback('');
    const result = await save(dorm, next);
    setPending(null);
    if (result.ok) { onDormChange(result.dorm); setState({ kind: 'saved' }); return; }
    if (result.status === 409) { setState({ kind: 'conflict' }); return; }
    setState({ kind: 'error', message: result.status === 0 ? 'Your change was not saved. Check your connection, then reload your dorm.' : `Your change was not saved. ${result.error}` });
  }

  function choose(id: string | null) {
    setSelected(id); setFeedback('');
    const placed = shown.placements.find(p => p.itemId === id);
    setRotation(placed?.rotation ?? 0);
    if (placed) setCursor({ x: placed.x, y: placed.y });
    else if (id) {
      // Start new items near the middle of their surface.
      const surface = surfaceSize(surfaceOf(id)), size = placementSize(item(id)!, 0);
      setCursor({ x: Math.max(0, Math.floor((surface.width - size.width) / 2)), y: surfaceOf(id) === 'wall' ? 0 : Math.max(0, Math.floor((surface.height - size.height) / 2) - 1) });
    }
  }
  function moveCursor(next: Cursor) {
    if (!selectedItem) return;
    const surface = surfaceSize(surfaceOf(selected)), size = placementSize(selectedItem, rotation);
    // Keep the ghost's footprint on the surface so the cursor never wanders off the grid.
    setCursor({ x: Math.max(0, Math.min(surface.width - size.width, next.x)), y: Math.max(0, Math.min(surface.height - size.height, next.y)) });
  }
  const candidate: Placement | null = selected ? { itemId: selected, x: cursor.x, y: cursor.y, rotation } : null;
  const status: GhostStatus | null = candidate && selectedItem
    ? ghostStatus({ ...dorm, placements: shown.placements }, shown.placements, candidate, surfaceOf(selected)) : null;

  /** SRS-500.2/500.3/500.11/500.12: place or move the selected item at the cursor, or explain why not. */
  function place() {
    if (locked || !candidate || !selectedItem) return;
    const problem = placementProblem({ ...dorm, placements: shown.placements }, shown.placements, candidate);
    if (problem) { setFeedback(placementMessages[problem]); return; }
    setSelected(null);
    void commit({ ...shown, placements: [...shown.placements.filter(p => p.itemId !== candidate.itemId), candidate] });
  }
  /** Quarter turn. A placed item that has not been moved turns in place and saves (as in the campus view). */
  function rotate() {
    if (locked || selectedItem?.surface !== 'floor') return;
    const next = ((rotation + 90) % 360) as Rotation;
    setRotation(next); setFeedback('');
    const placed = shown.placements.find(p => p.itemId === selected);
    if (!placed || placed.x !== cursor.x || placed.y !== cursor.y) return;
    const turned = { ...placed, rotation: next };
    const problem = placementProblem(dorm, shown.placements, turned);
    if (problem) { setFeedback(`${placementMessages[problem]} Choose another spot for this orientation, or rotate again.`); return; }
    void commit({ ...shown, placements: shown.placements.map(p => p.itemId === selected ? turned : p) });
  }
  /** SRS-500.4: storing removes the placement only; ownership is unchanged. */
  function store(itemId: string) {
    if (locked) return;
    setSelected(null);
    void commit({ ...shown, placements: shown.placements.filter(p => p.itemId !== itemId) });
  }
  function appearance(kind: 'wall' | 'floor', id: string) {
    if (locked) return;
    void commit({ ...shown, [kind === 'wall' ? 'wallItemId' : 'floorItemId']: id });
  }
  const inventory = dorm.catalog.filter(entry => entry.surface && dorm.owned.includes(entry.id) && !shown.placements.some(p => p.itemId === entry.id));
  const appearances = (kind: 'wall' | 'floor') => dorm.catalog.filter(entry => entry.kind === kind && dorm.owned.includes(entry.id));
  return {
    shown, state, setState, locked, selected, selectedItem, rotation, cursor, feedback, setFeedback, status, inventory, appearances,
    choose, moveCursor, place, rotate, store, appearance, item,
  };
}
