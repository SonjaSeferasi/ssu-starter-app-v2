'use client';
// SRS-522 / SRS-523 / SRS-529 furniture shop. Prices, ownership, balance and the charge come from the
// server. Each confirmed attempt has one purchase key; it is kept (also in sessionStorage, scoped to the
// opaque buyer scope the authenticated catalog returns) until a definite outcome is known, so a lost
// response can be checked or retried without a second charge, and never by another account.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  offerLabel, pendingStorageKey, readPendingPurchase, readPurchaseResult, readShopCatalog, resolvesPending,
  type PendingPurchase, type PurchaseAttempt, type PurchaseRequest, type PurchaseStatus, type ShopCatalog,
} from '../../../lib/dormspace-shop-contract';
import { dormRequest, type ApiResult } from '../api';
import styles from '../dormspace-3d.module.css';

export type ShopOutcome = { kind: 'result'; result: PurchaseStatus } | { kind: 'unknown'; message: string };
export type ShopSource = {
  catalog(): Promise<{ ok: true; catalog: ShopCatalog } | { ok: false; message: string; unavailable: boolean }>;
  purchase(request: PurchaseRequest): Promise<ShopOutcome>;
  status(actionKey: string): Promise<ShopOutcome>;
};
const points = (value: number) => `${value.toLocaleString()} ${value === 1 ? 'point' : 'points'}`;
const NOT_CONFIRMED = 'We could not confirm whether the purchase went through.';
const unknownMessage = (result: ApiResult<unknown>) =>
  result.ok ? 'The purchase result could not be read.' : result.status === 0 || result.status >= 500 ? NOT_CONFIRMED : `${NOT_CONFIRMED} ${result.error}`;

/** Production source: the authenticated, no-store /api/dorm/shop endpoints. Only a readable completed
 * (2xx) or rejected (4xx with its result) outcome is definite; everything else is "unknown". */
export const apiShopSource: ShopSource = {
  async catalog() {
    const result = await dormRequest<unknown>('/api/dorm/shop');
    if (!result.ok) return { ok: false, message: result.error, unavailable: result.code === 'DORMSPACE_SHOP_UNAVAILABLE' };
    const catalog = readShopCatalog(result.data);
    return catalog?.buyer ? { ok: true, catalog } : { ok: false, message: 'The shop returned an unexpected catalog.', unavailable: true };
  },
  async purchase(request) {
    const result = await dormRequest<unknown>('/api/dorm/shop', { method: 'POST', body: JSON.stringify(request) });
    const parsed = readPurchaseResult(result.ok ? result.data : result.body.result);
    if (parsed && (result.ok ? parsed.status === 'completed' : parsed.status === 'rejected' && result.status >= 400 && result.status < 500))
      return { kind: 'result', result: parsed };
    return { kind: 'unknown', message: unknownMessage(result) };
  },
  async status(actionKey) {
    const result = await dormRequest<unknown>(`/api/dorm/shop?purchase=${encodeURIComponent(actionKey)}`);
    const parsed = result.ok ? readPurchaseResult(result.data) : null;
    return parsed ? { kind: 'result', result: parsed } : { kind: 'unknown', message: result.ok ? 'The purchase status could not be read.' : result.error };
  },
};

// sessionStorage can be unavailable (privacy modes); the in-memory attempt still works then.
function storedPending(buyer: string) {
  try { return readPendingPurchase(sessionStorage.getItem(pendingStorageKey(buyer)), buyer); } catch { return null; }
}
function storePending(pending: PendingPurchase) {
  try { sessionStorage.setItem(pendingStorageKey(pending.buyer), JSON.stringify(pending)); } catch { /* memory only */ }
}
function clearPending(pending: PendingPurchase) {
  try { if (storedPending(pending.buyer)?.key === pending.key) sessionStorage.removeItem(pendingStorageKey(pending.buyer)); } catch { /* memory only */ }
}
const OTHER_ACCOUNT = 'You are signed in as a different account from the one that started this purchase, so it was not checked or retried. Sign in as that account to finish it.';

export function ShopPanel({ source, thumbnails, onPurchased, onBalance, onModal, onClose, note }: {
  source: ShopSource; thumbnails: Record<string, string>; note?: string;
  onPurchased: (owned: string[], balance: number) => void; onBalance?: (balance: number) => void;
  onModal: (open: boolean) => void; onClose: () => void;
}) {
  const [catalog, setCatalog] = useState<ShopCatalog | null>(null);
  const [loadError, setLoadError] = useState<{ message: string; unavailable: boolean } | null>(null);
  const [attempt, setAttempt] = useState<PurchaseAttempt>({ phase: 'idle' });
  // Parent callbacks through a ref: a new callback identity (e.g. after a room save) never reloads the shop.
  const parent = useRef({ onPurchased, onBalance }); parent.current = { onPurchased, onBalance };

  const load = useCallback(async () => {
    setLoadError(null);
    const result = await source.catalog();
    if (result.ok) { setCatalog(result.catalog); parent.current.onBalance?.(result.catalog.balance); }
    else setLoadError({ message: result.message, unavailable: result.unavailable });
    return result.ok ? result.catalog : null;
  }, [source]);

  const settle = useCallback(async (pending: PendingPurchase, outcome: ShopOutcome) => {
    const result = outcome.kind === 'result' ? outcome.result : null;
    if (result) parent.current.onBalance?.(result.balance);
    if (!resolvesPending(pending, result)) {
      // Unresolved: keep the stored key and the confirmed price for a safe check or same-key retry.
      const notFound = result?.status === 'not_found';
      setAttempt({ phase: 'unknown', pending, notFound,
        message: outcome.kind === 'unknown' ? outcome.message : notFound ? 'This purchase was not completed.' : 'The purchase result could not be read.' });
      return;
    }
    clearPending(pending);
    if (result.status === 'completed') {
      setAttempt({ phase: 'done', name: pending.name, charged: result.charged, replayed: result.replayed });
      parent.current.onPurchased(result.owned, result.balance);
    } else setAttempt({ phase: 'rejected', name: pending.name, message: result.message, expectedPrice: pending.expectedPrice, price: result.price });
    await load();
  }, [load]);

  // Reconcile this account's attempt whose outcome was unknown when the page closed. Another account's
  // stored attempt (a different buyer scope) is never read here.
  useEffect(() => {
    let active = true;
    void (async () => {
      const current = await load();
      if (!active || !current?.buyer) return;
      const pending = storedPending(current.buyer);
      if (!pending) return;
      setAttempt({ phase: 'sending', pending, checking: true });
      const outcome = await source.status(pending.key);
      if (active) await settle(pending, outcome);
    })();
    return () => { active = false; };
  }, [load, settle, source]);

  const modal = attempt.phase === 'confirming' || attempt.phase === 'sending' || attempt.phase === 'unknown';
  useEffect(() => { onModal(modal); return () => onModal(false); }, [modal, onModal]);

  /** Re-reads the catalog to confirm the tab is still signed in as the attempt's account. */
  async function sameBuyer(pending: PendingPurchase): Promise<'same' | 'other' | 'unreachable'> {
    const fresh = await load();
    return !fresh?.buyer ? 'unreachable' : fresh.buyer === pending.buyer ? 'same' : 'other';
  }
  async function send(pending: PendingPurchase, retry: boolean) {
    setAttempt({ phase: 'sending', pending });
    const who = await sameBuyer(pending);
    if (who === 'other') { setAttempt({ phase: 'notice', message: retry ? OTHER_ACCOUNT : 'You are now signed in as a different account. Nothing was bought.' }); return; }
    if (who === 'unreachable') {
      if (retry) setAttempt({ phase: 'unknown', pending, message: 'The shop could not be reached, so nothing new was sent.' });
      else setAttempt({ phase: 'notice', message: 'The shop could not be reached. Nothing was bought.' });
      return;
    }
    storePending(pending);
    // Always the confirmed price: if the catalog price changed meanwhile, the server rejects it for reconfirmation.
    await settle(pending, await source.purchase({ itemId: pending.itemId, expectedPrice: pending.expectedPrice, actionKey: pending.key }));
  }
  async function check(pending: PendingPurchase) {
    setAttempt({ phase: 'sending', pending, checking: true });
    const who = await sameBuyer(pending);
    if (who === 'other') { setAttempt({ phase: 'notice', message: OTHER_ACCOUNT }); return; }
    if (who === 'unreachable') { setAttempt({ phase: 'unknown', pending, message: 'The shop could not be reached. Try checking again in a moment.' }); return; }
    await settle(pending, await source.status(pending.key));
  }

  return (
    <aside className={styles.drawer} aria-label="Furniture shop">
      <div className={styles.drawerHeader}><h3>Furniture shop</h3><button type="button" className={styles.button} aria-label="Close furniture shop" onClick={onClose}>Close</button></div>
      {note ? <p className={styles.notice}>{note}</p> : null}
      {catalog ? <p className={styles.balance} role="status">Shared balance: {points(catalog.balance)}</p> : null}
      {loadError ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <p className={styles.error} role="alert">{loadError.unavailable ? 'The furniture shop is not available right now. Your furniture and points are unchanged.' : loadError.message}</p>
          <button type="button" className={styles.button} onClick={() => void load()}>Try again</button>
        </div>
      ) : !catalog ? <p className={styles.status} role="status">Opening the shop…</p> : (
        <div className={styles.offers}>
          {catalog.offers.map(offer => (
            <article key={offer.id} className={styles.offer} data-offer-state={offer.state}>
              {thumbnails[offer.previewKey] ? <img src={thumbnails[offer.previewKey]} alt={`${offer.name} 3D preview`} /> : <span className={styles.thumbPending} aria-hidden="true" />}
              <div>
                <h4>{offer.name}</h4>
                <p>{offer.width && offer.height ? `${offer.width} × ${offer.height} squares` : ''}{offer.surface ? ` · ${offer.surface === 'wall' ? 'wall' : 'floor'}` : ''}{offer.overlapCategory ? ` · ${offer.overlapCategory === 'rug' ? 'goes under furniture' : offer.overlapCategory}` : ''}</p>
                <p>{offer.state === 'included' ? 'Free with your dorm' : offer.price !== null ? points(offer.price) : 'No price set'}</p>
              </div>
              <div className={styles.offerActions}>
                <span className={styles.state} data-state={offer.state}>{offerLabel(offer)}</span>
                {offer.state === 'available' && offer.price !== null && catalog.buyer ? (
                  <button type="button" className={`${styles.button} ${styles.primary}`} disabled={attempt.phase === 'sending'}
                    onClick={() => setAttempt({ phase: 'confirming', offer, key: crypto.randomUUID(), buyer: catalog.buyer! })}>Buy</button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
      {attempt.phase === 'done' ? <p className={styles.notice} role="status">{attempt.name} is yours{attempt.replayed ? ' (already completed earlier; you were charged once)' : ''}. {points(attempt.charged)} spent. Find it in your inventory.</p> : null}
      {attempt.phase === 'rejected' ? (
        <p className={styles.error} role="alert">{attempt.message}{attempt.price !== null && attempt.price !== attempt.expectedPrice ? ` Current price: ${points(attempt.price)}.` : ''} Nothing was charged.</p>
      ) : null}
      {attempt.phase === 'notice' ? <p className={styles.error} role="alert">{attempt.message}</p> : null}

      {attempt.phase === 'confirming' || attempt.phase === 'sending' || attempt.phase === 'unknown' ? (
        <div className={styles.backdrop}>
          <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="dormspace-buy-title" data-dormspace-modal>
            {attempt.phase === 'unknown' ? (
              <>
                <h3 id="dormspace-buy-title">Purchase not confirmed</h3>
                <p>{attempt.message} {attempt.pending.name} for {points(attempt.pending.expectedPrice)}: checking or trying again uses the same purchase, so you can never be charged twice.</p>
                <div className={styles.dialogActions}>
                  {/* Dismissing keeps the attempt; the shop checks it again next time it opens. */}
                  <button type="button" className={styles.button} onClick={() => setAttempt({ phase: 'idle' })}>Not now</button>
                  {attempt.notFound ? <button type="button" className={styles.button} onClick={() => { clearPending(attempt.pending); setAttempt({ phase: 'idle' }); }}>Don&apos;t buy</button> : null}
                  <button type="button" className={styles.button} onClick={() => void check(attempt.pending)}>Check purchase</button>
                  <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => void send(attempt.pending, true)}>Try again</button>
                </div>
              </>
            ) : attempt.phase === 'sending' && attempt.checking ? (
              <>
                <h3 id="dormspace-buy-title">Checking your purchase…</h3>
                <p>Looking up {attempt.pending.name} ({points(attempt.pending.expectedPrice)}). Nothing new is charged by checking.</p>
              </>
            ) : (() => {
              const name = attempt.phase === 'confirming' ? attempt.offer.name : attempt.pending.name;
              const price = attempt.phase === 'confirming' ? attempt.offer.price ?? 0 : attempt.pending.expectedPrice;
              const sending = attempt.phase === 'sending';
              return (
                <>
                  <h3 id="dormspace-buy-title">Buy {name}?</h3>
                  <p><strong>{name}</strong> costs <strong>{points(price)}</strong> from your shared SocialU balance.</p>
                  <p>Purchases are final. Items cannot be refunded or sold back; storing an item only returns it to your inventory.</p>
                  <div className={styles.dialogActions}>
                    <button type="button" className={styles.button} disabled={sending} onClick={() => setAttempt({ phase: 'idle' })}>Cancel</button>
                    <button type="button" className={`${styles.button} ${styles.primary}`} disabled={sending} autoFocus
                      onClick={() => { if (attempt.phase === 'confirming') void send({ buyer: attempt.buyer, key: attempt.key, itemId: attempt.offer.id, name, expectedPrice: price }, false); }}>
                      {sending ? 'Buying…' : `Buy for ${points(price)}`}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
