import { describe, expect, it } from 'vitest';
import { doorPresentation, readFloorParam, readHallDirectory, readHallLocation, readUsernameParam } from '../lib/dormspace-hall-contract';
import { offerLabel, pendingStorageKey, readPendingPurchase, readPurchaseRequest, readPurchaseResult, readShopCatalog, rejectionResponse, resolvesPending } from '../lib/dormspace-shop-contract';
import { liveAvatarKey, readLivePlayer } from '../lib/dormspace-multiplayer';

const KEY = '33333333-3333-4333-8333-333333333333';
const base = { floor: 2, floorCount: 3, roomsPerFloor: 12, me: { username: 'dorm1', floor: 1, slot: 4 }, doors: [] as unknown[] };

describe('hall directory contract', () => {
  it('fills every slot so all viewers see the same twelve doors', () => {
    const parsed = readHallDirectory({ ...base, doors: [{ slot: 3, state: 'friend', username: 'dorm2' }] })!;
    expect(parsed.doors).toHaveLength(12);
    expect(parsed.doors[3]).toEqual({ slot: 3, roomNumber: '204', state: 'friend', username: 'dorm2' });
    expect(parsed.doors[0]).toEqual({ slot: 0, roomNumber: '201', state: 'vacant', username: null });
    expect(parsed.me.roomNumber).toBe('105');
  });
  it.each([
    [{ ...base, floor: 4 }],
    [{ ...base, roomsPerFloor: 10 }],
    [{ ...base, doors: [{ slot: 1, state: 'withheld', username: 'leaked' }] }],
    [{ ...base, doors: [{ slot: 1, state: 'friend', username: null }] }],
    [{ ...base, doors: [{ slot: 1, state: 'locked', username: 'a' }, { slot: 1, state: 'locked', username: 'b' }] }],
    [{ ...base, doors: [{ slot: 12, state: 'locked', username: 'a' }] }],
    [{ ...base, doors: [{ slot: 1, state: 'admin', username: 'a' }] }],
  ])('rejects an inconsistent directory %#', value => { expect(readHallDirectory(value)).toBeNull(); });
  it('validates parameters and locations', () => {
    expect(readFloorParam(null)).toBeNull();
    expect(readFloorParam('12')).toBe(12);
    expect(readFloorParam('012')).toBe('invalid');
    expect(readUsernameParam('  dorm2 ')).toBe('dorm2');
    expect(readUsernameParam('x'.repeat(101))).toBeNull();
    expect(readHallLocation({ location: null })).toBeNull();
    expect(readHallLocation({ location: { username: 'dorm2', floor: 1, slot: 99 } })).toBeNull();
  });
  it('only lets own and friend doors request entry', () => {
    const states = ['own', 'friend', 'locked', 'withheld', 'vacant'] as const;
    expect(states.map(state => doorPresentation({ slot: 0, roomNumber: '101', state, username: state === 'withheld' || state === 'vacant' ? null : 'x' }).enterable))
      .toEqual([true, true, false, false, false]);
  });
});

describe('shop contract', () => {
  it('accepts only an item, confirmed price and UUID key', () => {
    expect(readPurchaseRequest({ itemId: '7', expectedPrice: 0, actionKey: KEY })).toEqual({ itemId: '7', expectedPrice: 0, actionKey: KEY });
    expect(typeof readPurchaseRequest({ itemId: '7', expectedPrice: 10, actionKey: KEY, buyer: 'dorm2' })).toBe('string');
    expect(typeof readPurchaseRequest({ itemId: '07', expectedPrice: 10, actionKey: KEY })).toBe('string');
    expect(typeof readPurchaseRequest({ itemId: '7', expectedPrice: '10', actionKey: KEY })).toBe('string');
  });
  it('reads catalog and results strictly and labels states', () => {
    const offer = { id: '7', name: 'Sofa', previewKey: 'dorm-sofa', kind: 'furniture', surface: 'floor', width: 3, height: 2, overlapCategory: 'seat', price: 1500, state: 'available', reason: null };
    const catalog = readShopCatalog({ balance: 1600, offers: [offer] })!;
    expect(offerLabel(catalog.offers[0])).toBe('Available to purchase');
    expect(offerLabel({ ...catalog.offers[0], state: 'owned' })).toBe('Owned');
    expect(offerLabel({ ...catalog.offers[0], state: 'insufficient' })).toBe('Insufficient points');
    expect(offerLabel({ ...catalog.offers[0], state: 'unavailable', reason: 'Seasonal item' })).toBe('Seasonal item');
    expect(readShopCatalog({ balance: 1, offers: [{ ...offer, state: 'free' }] })).toBeNull();
    expect(readPurchaseResult({ status: 'completed', replayed: true, itemId: '7', charged: 1500, balance: 100, owned: ['7'] })).toMatchObject({ status: 'completed', replayed: true });
    expect(readPurchaseResult({ status: 'completed', itemId: '7', charged: -5, balance: 100, owned: [] })).toBeNull();
    expect(readPurchaseResult({ status: 'rejected', reason: 'insufficient', itemId: '7', price: 1500, balance: 3 })).toMatchObject({ message: expect.stringMatching(/enough points/) });
    expect(rejectionResponse('price_changed')).toMatchObject({ status: 409, code: 'PRICE_CHANGED' });
    expect(rejectionResponse('key_mismatch').status).toBe(422);
  });
  it('reads an opaque buyer scope only when well formed', () => {
    expect(readShopCatalog({ balance: 1, offers: [], buyer: 'AbC_123-xyzXYZ0987' })?.buyer).toBe('AbC_123-xyzXYZ0987');
    expect(readShopCatalog({ balance: 1, offers: [] })?.buyer).toBeNull();
    expect(readShopCatalog({ balance: 1, offers: [], buyer: 'dorm2@salemstate.edu' })?.buyer).toBeNull();
  });
});

describe('pending purchase safety', () => {
  const A = 'buyerScopeAAAAAAAAAAAAAAAAAAAAAA', B = 'buyerScopeBBBBBBBBBBBBBBBBBBBBBB';
  const stored = (extra: object = {}) => JSON.stringify({ buyer: A, key: KEY, itemId: '7', name: 'Plant', expectedPrice: 150, ...extra });
  it('is stored per buyer scope and never read for another account', () => {
    expect(pendingStorageKey(A)).not.toBe(pendingStorageKey(B));
    expect(readPendingPurchase(stored(), A)).toEqual({ buyer: A, key: KEY, itemId: '7', name: 'Plant', expectedPrice: 150 });
    // Same tab, different signed-in account: the attempt is not visible to them, even if copied under their key.
    expect(readPendingPurchase(stored(), B)).toBeNull();
    expect(readPendingPurchase(stored(), null)).toBeNull();
  });
  it('keeps the originally confirmed price for a same-key retry and rejects malformed records', () => {
    expect(readPendingPurchase(stored({ expectedPrice: 0 }), A)?.expectedPrice).toBe(0);
    for (const bad of [{ expectedPrice: -1 }, { expectedPrice: '150' }, { key: 'retry-1' }, { itemId: '07' }, { name: 5 }])
      expect(readPendingPurchase(stored(bad), A)).toBeNull();
    expect(readPendingPurchase('{not json', A)).toBeNull();
    expect(readPendingPurchase(null, A)).toBeNull();
  });
  it('ends an attempt only on a definite outcome for it', () => {
    const pending = { itemId: '7' };
    expect(resolvesPending(pending, { status: 'completed', replayed: true, itemId: '7', charged: 150, balance: 0, owned: ['7'] })).toBe(true);
    expect(resolvesPending(pending, { status: 'rejected', reason: 'price_changed', itemId: '7', price: 175, balance: 0, message: '' })).toBe(true);
    // Unknown transport/5xx/unreadable (null), not found, or a completed result for another item: keep it.
    expect(resolvesPending(pending, null)).toBe(false);
    expect(resolvesPending(pending, { status: 'not_found', balance: 0 })).toBe(false);
    expect(resolvesPending(pending, { status: 'completed', replayed: false, itemId: '8', charged: 1, balance: 0, owned: ['8'] })).toBe(false);
  });
});

describe('live appearance for 3D players', () => {
  it('keeps the saved appearance payload and changes its key when the look changes', () => {
    const raw = (skinColor: string) => ({ id: '2', connectionId: '44444444-4444-4444-8444-444444444444', username: 'dorm2', space: 'hall:1', updatedAt: '2026-11-04T10:00:00Z',
      state: { x: 10, y: 50, facing: 'down', moving: false, sprinting: false, restItemId: null },
      avatar: { appearance: { outfitId: '1', faceId: null, avatarId: 'campus-hijab-2', bodyShape: 'plus', skinColor }, faces: [], outfits: [] } });
    const player = readLivePlayer(raw('deep'))!;
    expect(player.avatar?.appearance).toMatchObject({ avatarId: 'campus-hijab-2', bodyShape: 'plus', skinColor: 'deep' });
    expect(liveAvatarKey(player.avatar)).not.toBe(liveAvatarKey(readLivePlayer(raw('ivory'))!.avatar));
  });
});
