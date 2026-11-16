// Synthetic, development-only fixtures for /dev/dormspace-3d. Never used by the production game:
// no account, balance or purchase here is real, and nothing is sent to any API.
import type { Dorm, CatalogItem } from '../../lib/dormspace-rules';
import type { HallDirectory } from '../../lib/dormspace-hall-contract';
import type { ShopCatalog } from '../../lib/dormspace-shop-contract';

const item = (id: string, kind: string, name: string, previewKey: string, surface: string | null, width: number | null, height: number | null, overlapCategory: string | null): CatalogItem =>
  ({ id, kind, name, previewKey, surface, width, height, overlapCategory });
export const reviewCatalog: CatalogItem[] = [
  item('1', 'furniture', 'Bed', 'bed', 'floor', 2, 3, 'bed'), item('2', 'decoration', 'Window', 'window', 'wall', 4, 4, 'window'),
  item('3', 'furniture', 'Desk', 'desk', 'floor', 3, 1, 'desk'), item('4', 'furniture', 'Chair', 'chair', 'floor', 1, 1, 'seat'),
  item('5', 'wall', 'Sage walls', 'wall-sage', null, null, null, null), item('6', 'wall', 'Sky walls', 'wall-sky', null, null, null, null),
  item('7', 'wall', 'Cream walls', 'wall-cream', null, null, null, null), item('8', 'floor', 'Oak floor', 'floor-oak', null, null, null, null),
  item('9', 'floor', 'Tile floor', 'floor-tile', null, null, null, null), item('10', 'floor', 'Carpet floor', 'floor-carpet', null, null, null, null),
  item('11', 'furniture', 'Sofa', 'dorm-sofa', 'floor', 3, 2, 'seat'), item('12', 'furniture', 'Armchair', 'dorm-armchair', 'floor', 2, 1, 'seat'),
  item('13', 'furniture', 'Bookshelf', 'dorm-bookshelf', 'floor', 2, 1, 'storage'), item('14', 'furniture', 'Wardrobe', 'dorm-wardrobe', 'floor', 2, 1, 'storage'),
  item('15', 'furniture', 'Coffee table', 'dorm-coffee-table', 'floor', 2, 1, 'table'), item('16', 'furniture', 'Nightstand', 'dorm-nightstand', 'floor', 1, 1, 'table'),
  item('17', 'decoration', 'Plant', 'dorm-plant', 'floor', 1, 1, 'plant'), item('18', 'decoration', 'Rug', 'dorm-rug', 'floor', 3, 2, 'rug'),
];
export const reviewDorm: Dorm = {
  owner: 'review-student', isOwner: true, version: 1, wallItemId: '5', floorItemId: '8', visitCount: 3,
  owned: reviewCatalog.map(entry => entry.id), catalog: reviewCatalog,
  placements: [
    { itemId: '1', x: 0, y: 0, rotation: 0 }, { itemId: '16', x: 2, y: 0, rotation: 0 }, { itemId: '2', x: 3, y: 0 },
    { itemId: '3', x: 7, y: 0, rotation: 0 }, { itemId: '4', x: 8, y: 1, rotation: 180 }, { itemId: '13', x: 4, y: 0, rotation: 0 },
    { itemId: '18', x: 3, y: 3, rotation: 0 }, { itemId: '11', x: 3, y: 3, rotation: 0 }, { itemId: '15', x: 3, y: 5, rotation: 0 },
    { itemId: '12', x: 7, y: 4, rotation: 270 }, { itemId: '17', x: 9, y: 6, rotation: 0 }, { itemId: '14', x: 0, y: 5, rotation: 90 },
  ],
  surfaces: [{ code: 'floor', width: 10, height: 7 }, { code: 'wall', width: 10, height: 5 }],
  reserved: [{ surface: 'floor', x: 4, y: 6 }, { surface: 'floor', x: 5, y: 6 }],
  compatible: reviewCatalog.filter(entry => entry.surface === 'floor' && entry.id !== '18').map(entry => ['18', entry.id] as [string, string]).concat([['3', '4']]),
};
const names = ['review-student', 'maya.r', 'jordan', 'priya_k', 'sam', 'lee.h', 'noor', 'alex.t', 'ren', 'casey'];
export const reviewDirectory: HallDirectory = {
  floor: 1, floorCount: 2, roomsPerFloor: 12, me: { username: 'review-student', floor: 1, slot: 0, roomNumber: '101' },
  doors: Array.from({ length: 12 }, (_, slot) => ({
    slot, roomNumber: `1${String(slot + 1).padStart(2, '0')}`,
    state: slot === 0 ? 'own' as const : slot === 5 ? 'withheld' as const : slot > 9 ? 'vacant' as const : slot % 3 === 1 ? 'friend' as const : 'locked' as const,
    username: slot === 5 || slot > 9 ? null : names[slot],
  })),
};
/** Illustrative review states only (labels the real catalog uses); not prices or balances of any account. */
export const reviewShop: ShopCatalog = {
  balance: 620, buyer: 'review-fixture-only-scope',
  offers: reviewCatalog.filter(entry => entry.surface).map(entry => {
    const prices: Record<string, number> = { 'dorm-plant': 150, 'dorm-armchair': 300, 'dorm-sofa': 1500, 'dorm-rug': 200, 'dorm-coffee-table': 250, 'dorm-bookshelf': 450, 'dorm-wardrobe': 600, 'dorm-nightstand': 150 };
    const starter = ['bed', 'window', 'desk', 'chair'].includes(entry.previewKey);
    const state = starter ? 'owned' as const : entry.previewKey === 'dorm-wardrobe' ? 'unavailable' as const : (prices[entry.previewKey] ?? 0) > 620 ? 'insufficient' as const : entry.previewKey === 'dorm-plant' ? 'owned' as const : 'available' as const;
    return { id: entry.id, name: entry.name, previewKey: entry.previewKey, kind: entry.kind, surface: entry.surface as 'floor' | 'wall', width: entry.width, height: entry.height,
      overlapCategory: entry.overlapCategory, price: starter ? null : prices[entry.previewKey] ?? null, state, reason: state === 'unavailable' ? 'Review: example of an unavailable reason' : null };
  }),
};
