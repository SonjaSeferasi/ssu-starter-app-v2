// DormSpace furniture shop contract (UR-522, UR-523, UR-529). Pure: request validation for the API
// route, response whitelisting, and client state labels. The database is the authority for price,
// ownership, eligibility and the charge; nothing here grants or prices anything.

export const OFFER_STATES = ['owned', 'included', 'available', 'insufficient', 'unavailable'] as const;
export type OfferState = typeof OFFER_STATES[number];
export type ShopOffer = {
  id: string; name: string; previewKey: string; kind: string;
  surface: 'floor' | 'wall' | null; width: number | null; height: number | null; overlapCategory: string | null;
  price: number | null; state: OfferState; reason: string | null;
};
/** `buyer` is an opaque scope for the signed-in account, derived by the authenticated catalog route
 * (never an account id, username or token). It only keys the browser's pending purchase so another
 * account signed in later in the same tab can never check or retry it. Null in the database result. */
export type ShopCatalog = { balance: number; offers: ShopOffer[]; buyer: string | null };
export type PurchaseRequest = { itemId: string; expectedPrice: number; actionKey: string };
export const REJECTIONS = ['price_changed', 'insufficient', 'owned', 'unavailable', 'key_mismatch'] as const;
export type Rejection = typeof REJECTIONS[number];
export type PurchaseResult =
  | { status: 'completed'; replayed: boolean; itemId: string; charged: number; balance: number; owned: string[] }
  | { status: 'rejected'; reason: Rejection; itemId: string; price: number | null; balance: number; message: string };
export type PurchaseStatus = PurchaseResult | { status: 'not_found'; balance: number };

const ITEM_ID = /^[1-9]\d{0,18}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isActionKey = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);
const points = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** Request body for POST /api/dorm/shop. Account identifiers and amounts to charge are never accepted;
 * `expectedPrice` is only the price the student confirmed, compared with the current offer. */
export function readPurchaseRequest(body: Record<string, unknown>): PurchaseRequest | string {
  const allowed = new Set(['itemId', 'expectedPrice', 'actionKey']);
  if (Object.keys(body).some(key => !allowed.has(key))) return 'Send only the item, the confirmed price and the purchase key.';
  if (typeof body.itemId !== 'string' || !ITEM_ID.test(body.itemId)) return 'Choose an item to buy.';
  if (!points(body.expectedPrice)) return 'Confirm the item price before buying.';
  if (!isActionKey(body.actionKey)) return 'Start the purchase again.';
  return { itemId: body.itemId, expectedPrice: body.expectedPrice as number, actionKey: (body.actionKey as string).toLowerCase() };
}

function readOffer(value: unknown): ShopOffer | null {
  const o = value as Record<string, unknown> | null;
  if (!o || typeof o.id !== 'string' || !ITEM_ID.test(o.id) || typeof o.name !== 'string' || typeof o.previewKey !== 'string'
    || typeof o.kind !== 'string' || !OFFER_STATES.includes(o.state as OfferState)) return null;
  const size = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v > 0 && v <= 20 ? v : null);
  return {
    id: o.id, name: o.name.slice(0, 80), previewKey: o.previewKey.slice(0, 60), kind: o.kind,
    surface: o.surface === 'floor' || o.surface === 'wall' ? o.surface : null, width: size(o.width), height: size(o.height),
    overlapCategory: typeof o.overlapCategory === 'string' ? o.overlapCategory.slice(0, 40) : null,
    price: points(o.price) ? o.price as number : null, state: o.state as OfferState,
    reason: typeof o.reason === 'string' ? o.reason.slice(0, 200) : null,
  };
}
export function readShopCatalog(value: unknown): ShopCatalog | null {
  const raw = value as Record<string, unknown> | null;
  if (!raw || typeof raw.balance !== 'number' || !Number.isSafeInteger(raw.balance) || !Array.isArray(raw.offers)) return null;
  const offers = raw.offers.map(readOffer);
  return offers.every(Boolean) ? { balance: raw.balance, offers: offers as ShopOffer[], buyer: isBuyerScope(raw.buyer) ? raw.buyer : null } : null;
}
const BUYER_SCOPE = /^[A-Za-z0-9_-]{16,64}$/;
export const isBuyerScope = (value: unknown): value is string => typeof value === 'string' && BUYER_SCOPE.test(value);
/** Request header carrying the attempt's buyer scope on every purchase and status request; the route
 * answers 409 BUYER_MISMATCH (bridge never called) when the verified session is another account. */
export const BUYER_HEADER = 'X-DormSpace-Buyer';
export const BUYER_MISMATCH = 'BUYER_MISMATCH';
const rejectionMessages: Record<Rejection, string> = {
  price_changed: 'The price changed. Review the new price before buying.',
  insufficient: 'You do not have enough points for this item.',
  owned: 'You already own this item.',
  unavailable: 'This item is not available to buy right now.',
  key_mismatch: 'This purchase key was already used for a different item. Start a new purchase.',
};
export function readPurchaseResult(value: unknown): PurchaseStatus | null {
  const r = value as Record<string, unknown> | null;
  if (!r || typeof r.balance !== 'number' || !Number.isSafeInteger(r.balance)) return null;
  if (r.status === 'not_found') return { status: 'not_found', balance: r.balance };
  if (typeof r.itemId !== 'string' || !ITEM_ID.test(r.itemId)) return null;
  if (r.status === 'completed' && points(r.charged) && Array.isArray(r.owned) && r.owned.every(id => typeof id === 'string' && ITEM_ID.test(id)))
    return { status: 'completed', replayed: r.replayed === true, itemId: r.itemId, charged: r.charged as number, balance: r.balance, owned: r.owned as string[] };
  if (r.status === 'rejected' && REJECTIONS.includes(r.reason as Rejection))
    return { status: 'rejected', reason: r.reason as Rejection, itemId: r.itemId, price: points(r.price) ? r.price as number : null, balance: r.balance, message: rejectionMessages[r.reason as Rejection] };
  return null;
}
/** HTTP status and code for a rejected purchase (nothing was charged). */
export function rejectionResponse(reason: Rejection) {
  const codes: Record<Rejection, string> = { price_changed: 'PRICE_CHANGED', insufficient: 'INSUFFICIENT_POINTS', owned: 'ALREADY_OWNED', unavailable: 'ITEM_UNAVAILABLE', key_mismatch: 'ACTION_KEY_MISMATCH' };
  return { status: reason === 'key_mismatch' ? 422 : 409, code: codes[reason], message: rejectionMessages[reason] };
}

/** Client label for an offer (SRS-529.2 to SRS-529.5). */
export function offerLabel(offer: ShopOffer) {
  switch (offer.state) {
    case 'owned': return 'Owned';
    case 'included': return 'Included free';
    case 'available': return 'Available to purchase';
    case 'insufficient': return 'Insufficient points';
    default: return offer.reason ?? 'Not available';
  }
}
/** A confirmed purchase whose outcome is not yet known, as kept in the browser (sessionStorage). It holds
 * the buyer scope, the key and the price the student confirmed; never a token or account identifier.
 * A same-key retry always resends `expectedPrice` (the confirmed price), even if the catalog price has
 * changed since: the server then rejects it as price_changed and the student must confirm again. */
export type PendingPurchase = { buyer: string; key: string; itemId: string; name: string; expectedPrice: number };
export const pendingStorageKey = (buyer: string) => `dormspace-pending-purchase:${buyer}`;
/** Reads a stored pending purchase for exactly this buyer scope; anything else (another account's
 * attempt, malformed or tampered data) is null and must not be checked or retried. */
export function readPendingPurchase(raw: string | null, buyer: string | null): PendingPurchase | null {
  if (!raw || !isBuyerScope(buyer)) return null;
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    if (!p || p.buyer !== buyer || !isActionKey(p.key) || typeof p.itemId !== 'string' || !ITEM_ID.test(p.itemId)
      || typeof p.name !== 'string' || !points(p.expectedPrice)) return null;
    return { buyer, key: (p.key as string).toLowerCase(), itemId: p.itemId, name: p.name.slice(0, 80), expectedPrice: p.expectedPrice as number };
  } catch { return null; }
}
/** Only a definite server outcome for this attempt ends it (and clears the stored key): completed for
 * the same item, or rejected. Not found, transport loss, 5xx, sign-in errors and unreadable or
 * mismatched responses all leave it unresolved so it can still be checked or retried with the same key. */
export function resolvesPending(pending: Pick<PendingPurchase, 'itemId'>, status: PurchaseStatus | null): status is PurchaseResult {
  if (!status || status.status === 'not_found') return false;
  return status.status === 'rejected' || status.itemId === pending.itemId;
}

/** Client-side purchase attempt state. A key is kept until the outcome is known, so a retry
 * after a lost response can never double-charge (the server returns the original outcome). */
export type PurchaseAttempt =
  | { phase: 'idle' }
  | { phase: 'confirming'; offer: ShopOffer; key: string; buyer: string }
  | { phase: 'sending'; pending: PendingPurchase; checking?: boolean }
  | { phase: 'unknown'; pending: PendingPurchase; message: string; notFound?: boolean }
  | { phase: 'done'; name: string; charged: number; replayed: boolean }
  | { phase: 'rejected'; name: string; message: string; expectedPrice: number | null; price: number | null }
  | { phase: 'notice'; message: string };
