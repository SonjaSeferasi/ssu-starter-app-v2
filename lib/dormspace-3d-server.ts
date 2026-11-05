import { createHash } from 'node:crypto';
import { AccountError, accountClient } from './socialu-account';

// Server-only bridges for the shared DormHall directory and the furniture shop. The account always
// comes from verifiedUser(); the database functions resolve it again and never accept a student id.
type Unavailable = { message: string; code: string };
const DIRECTORY_UNAVAILABLE: Unavailable = {
  message: 'The shared DormHall directory is unavailable. Check that the DormSpace directory migration has been applied.',
  code: 'DORMSPACE_DIRECTORY_UNAVAILABLE',
};
const SHOP_UNAVAILABLE: Unavailable = {
  message: 'The furniture shop is unavailable. Check that the DormSpace shop migration has been applied.',
  code: 'DORMSPACE_SHOP_UNAVAILABLE',
};

async function bridge(fn: string, authId: string, action: string, payload: Record<string, unknown>, unavailable: Unavailable) {
  const { data, error } = await accountClient().rpc(fn, { p_auth_id: authId, p_action: action, p_payload: payload });
  if (error) {
    if (!error.code && /fetch failed/i.test(error.message)) throw new AccountError('The server cannot reach Supabase. Check the server network connection and try again.', 503);
    // These codes carry messages written for students by the database functions.
    if (error.code === '42501') throw new AccountError(error.message, 403);
    if (error.code === '22023') throw new AccountError(error.message, 400);
    // Anything else, including a function that has not been migrated yet (PGRST202), is unavailable.
    throw new AccountError(unavailable.message, 503, unavailable.code);
  }
  return data as unknown;
}

export const dormDirectory = (authId: string, action: 'directory' | 'locate', payload: Record<string, unknown>) =>
  bridge('socialu_dorm_directory', authId, action, payload, DIRECTORY_UNAVAILABLE);
export const dormShop = (authId: string, action: 'catalog' | 'purchase' | 'status', payload: Record<string, unknown>) =>
  bridge('socialu_dorm_shop', authId, action, payload, SHOP_UNAVAILABLE);
export const unexpectedDirectory = () => new AccountError(DIRECTORY_UNAVAILABLE.message, 503, DIRECTORY_UNAVAILABLE.code);
/** Opaque, stable per-account scope for the browser's pending purchase (see ShopCatalog.buyer). Derived
 * from the verified auth id with a one-way hash, so it reveals no id, username or token. It is not an
 * authorization credential: the server always charges the account of the request's own session. */
export const shopBuyerScope = (authId: string) =>
  createHash('sha256').update(`socialu-dormspace-shop-buyer:${authId}`).digest('base64url').slice(0, 32);
export const unexpectedShop = () => new AccountError(SHOP_UNAVAILABLE.message, 503, SHOP_UNAVAILABLE.code);
