import { accountClient } from './socialu-account';
import { SNIPE_NOT_AVAILABLE, SnipeError } from './snipe';

// Server-only bridge for SRS-511.12 / 514.1: an original actor's controls over their published Snipes, kept
// after leaving the conversation or after the friendship ends. Uses the service-role client, so it must only be
// imported by route handlers; client components may import its types only (`import type`).
// The acting student always comes from the verified token. The database derives scope from the stored original
// roles and returns metadata only: no photo, storage reference, conversation or message data. Pages hold at most
// 20 records (fixed in the database).
export type SnipeSharingAction = 'withdraw' | 'remove';
export type SnipeSharingRecord = {
  id: string; status: 'approved' | 'removed'; role: 'photographer' | 'tagged';
  submitted_at: string; published_at: string;
  // The tagged actor's own sharing permission; null for the photographer.
  sharing: 'approved' | 'withdrawn' | null;
  // The control still available: Remove (photographer) or Withdraw (tagged); null once Removed.
  action: SnipeSharingAction | null;
};
export type SnipeSharingPage = { records: SnipeSharingRecord[]; next_cursor: string | null };
export type SnipeSharingResult = { changed: boolean; snipe: SnipeSharingRecord };

// Same cursor and ID format as a Snipe ID (lib/snipe.ts snipeIdParam).
export const SNIPE_SHARING_CURSOR = /^[1-9]\d{0,17}$/;

type RpcError = { code?: string; message?: string };

// Focused mapping for this bridge's codes, using the existing SnipeError so snipeResponse renders it.
function sharingError(error: RpcError): SnipeError {
  const definite = Boolean(error.code);
  switch (error.code) {
    case 'SN404': return new SnipeError(SNIPE_NOT_AVAILABLE, 404, true);
    case 'SN400': return new SnipeError(error.message || 'Enter a valid request.', 400, true);
    case '42501': return new SnipeError('A verified, active university account is required.', 403, true);
    case 'PGRST202': return new SnipeError('Snipe needs its database update before it can be used.', 503, true, 'SNIPE_SETUP_REQUIRED');
  }
  if (!error.code && /fetch failed/i.test(error.message || '')) return new SnipeError('The server cannot reach Supabase. Check the server network connection and try again.', 503, false);
  return new SnipeError('Snipe is unavailable right now. Please try again.', 503, definite);
}

export async function snipeSharingList(authId: string, before: string | null) {
  // postgrest-js reports lost connections as `error` with an empty code rather than throwing.
  const { data, error } = await accountClient().rpc('socialu_snipe_sharing', { p_auth_id: authId, p_action: 'list', p_snipe_id: null, p_before: before });
  if (error) throw sharingError(error);
  return data as SnipeSharingPage;
}

export async function snipeSharingAction(authId: string, action: SnipeSharingAction, snipeId: string) {
  const { data, error } = await accountClient().rpc('socialu_snipe_sharing', { p_auth_id: authId, p_action: action, p_snipe_id: snipeId, p_before: null });
  if (error) throw sharingError(error);
  return data as SnipeSharingResult;
}
