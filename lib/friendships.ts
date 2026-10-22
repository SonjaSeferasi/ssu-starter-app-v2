import { AccountError, accountClient } from './socialu-account';
import { resolveMediaUrl } from './media';
export type Relationship = { state: 'none' | 'sent' | 'received' | 'friends' | 'blocked'; request_id: string | null };
export type FriendStudent = { username: string; name: string; full_name: string; photo_url: string | null; relationship: Relationship };
export async function friendshipRpc<T>(fn: 'socialu_friendships' | 'socialu_account_lifecycle', args: Record<string, unknown>): Promise<T> {
  const { data, error } = await accountClient().rpc(fn, args);
  if (error) {
    if (!error.code && /fetch failed/i.test(error.message)) throw new AccountError('The server cannot reach Supabase. Check the server network connection and try again.', 503);
    if (error.code === 'P0002') throw new AccountError('This student or connection is not available.', 404);
    if (error.code === '42501') throw new AccountError('This action is not available for your account or this connection.', 403);
    if (error.code === '40001' || error.code === '23505') throw new AccountError('This connection changed. Refresh and try again.', 409);
    if (error.code === '22023') throw new AccountError(error.message, 400);
    console.error('Friendship operation failed', { operation: fn, action: args.p_action, code: error.code });
    throw new AccountError('Connections are temporarily unavailable. Please try again later.', 503);
  }
  return data as T;
}
export async function shapeStudents(rows: (Omit<FriendStudent,'photo_url'> & { photo_key: string | null })[]) {
  return Promise.all(rows.map(async ({ photo_key, ...row }) => ({ ...row, photo_url: await resolveMediaUrl(accountClient(), photo_key) })));
}
