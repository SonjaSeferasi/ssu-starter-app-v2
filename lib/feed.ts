import { accountClient, AccountError } from './socialu-account';

/** Calls one of the socialu_* feed RPC functions (supabase/migrations/20261008000200_feed_functions.sql). */
export async function feedRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await accountClient().rpc(fn, args);
  if (error) {
    if (!error.code && /fetch failed/i.test(error.message)) {
      throw new AccountError('The server cannot reach Supabase. Check the server network connection and try again.', 503);
    }
    if (error.code === '42501') throw new AccountError(error.message, 403);
    if (error.code === '22023' || error.code === '22001') throw new AccountError(error.message, 400);
    if (error.code === 'P0002') throw new AccountError(error.message, 404);
    // P0001 is Postgres's default code for a bare RAISE EXCEPTION (no explicit
    // ERRCODE) -- e.g. validate_media()'s unsupported-type/size checks.
    if (error.code === 'P0001') throw new AccountError(error.message, 400);
    throw new AccountError('SocialU feed storage is unavailable. Check that the feed migration has been applied.', 503);
  }
  return data as T;
}
