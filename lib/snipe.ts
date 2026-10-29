import { AccountError, accountClient, accountOperation, accountResponse, verifiedUser } from './socialu-account';
import { CONVERSATION_NOT_AVAILABLE } from './chat-access';

// Server-only Snipe bridge (UR-510 to UR-514). The acting student always comes from the verified
// token; the database function performs every participant, friendship and consent check.
export const SNIPE_NOT_AVAILABLE = 'Snipe not available.';
export const NO_STORE = { 'Cache-Control': 'no-store' };

export type SnipeAction = 'list' | 'prepare' | 'create' | 'respond' | 'withdraw' | 'remove' | 'photo';

// `definite` is true when the database answered with an error, so the transaction was rolled back.
// Without it (lost connection, gateway failure) a create may still have committed.
export class SnipeError extends AccountError {
  constructor(message: string, status: number, public definite: boolean, code?: string, public extra: Record<string, unknown> = {}) {
    super(message, status, code);
  }
}

export async function snipeUser(request: Request) {
  // verifiedUser checks the token, email verification and app session revocation;
  // accountOperation('read') applies the account lifecycle (inactive or reverification-required accounts stop here).
  const user = await verifiedUser(request);
  const profile = await accountOperation('read', { p_auth_id: user.id });
  if (!profile) throw new AccountError('Complete your profile before using Snipe.', 409);
  return user;
}

export function snipeIdParam(value: string) {
  if (!/^[1-9]\d{0,17}$/.test(value)) throw new AccountError(SNIPE_NOT_AVAILABLE, 404);
  return value;
}

type RpcError = { code?: string; message?: string; details?: string | null };

function snipeError(error: RpcError): SnipeError {
  const definite = Boolean(error.code);
  const known = (status: number, code?: string, extra?: Record<string, unknown>) => new SnipeError(error.message || 'Snipe request failed.', status, definite, code, extra);
  switch (error.code) {
    case 'SC404': return new SnipeError(CONVERSATION_NOT_AVAILABLE, 404, true);
    case 'SN404': return new SnipeError(SNIPE_NOT_AVAILABLE, 404, true);
    case 'SN400': return known(400);
    case 'SN403': return known(403);
    case 'SN409': return known(409, 'SNIPE_CONFLICT');
    case 'SN422': return known(409, 'SNIPE_TARGET_INELIGIBLE');
    case 'SN429': {
      let cooldowns: unknown = [];
      try { cooldowns = JSON.parse(error.details || '[]'); } catch { /* message alone still explains it */ }
      return known(429, 'SNIPE_COOLDOWN', { cooldowns });
    }
    case '42501': return new SnipeError('A verified, active university account is required.', 403, true);
    case 'PGRST202': return new SnipeError('Snipe needs its database update before it can be used.', 503, true, 'SNIPE_SETUP_REQUIRED');
  }
  if (!error.code && /fetch failed/i.test(error.message || '')) return new SnipeError('The server cannot reach Supabase. Check the server network connection and try again.', 503, false);
  return new SnipeError('Snipe is unavailable right now. Please try again.', 503, definite);
}

export async function snipeOperation<T = any>(authId: string, action: SnipeAction, conversationId: string, snipeId: string | null = null, payload: Record<string, unknown> = {}): Promise<T> {
  // postgrest-js reports lost connections as `error` with an empty code rather than throwing.
  const { data, error } = await accountClient().rpc('socialu_snipe', { p_auth_id: authId, p_action: action, p_conversation_id: conversationId, p_snipe_id: snipeId, p_payload: payload });
  if (error) throw snipeError(error);
  return data as T;
}

// Dedicated private bucket, provisioned by the Snipe migration. A restrictive storage.objects policy
// denies anon/authenticated every row here, so only this server (service_role) uploads or downloads.
// No public or signed URL is ever created; photos are streamed through the authorized photo route.
export const SNIPE_BUCKET = 'socialu-snipe-photos';

export function snipeStorage() {
  return accountClient().storage.from(SNIPE_BUCKET);
}

// Snipe uploads refuse a public bucket, because a public object URL could be fetched without any of the checks below.
export async function requirePrivateSnipeBucket() {
  const { data, error } = await accountClient().storage.getBucket(SNIPE_BUCKET);
  if (error || !data) throw new AccountError('Snipe photo storage is not set up yet.', 503, 'SNIPE_STORAGE_SETUP_REQUIRED');
  if (data.public) throw new AccountError('Snipe uploads are paused: the Snipe storage bucket must be private.', 503, 'SNIPE_STORAGE_PUBLIC');
}

export function snipeResponse(error: unknown) {
  if (error instanceof SnipeError) {
    return Response.json({ error: error.message, ...(error.code ? { code: error.code } : {}), ...error.extra }, { status: error.status, headers: NO_STORE });
  }
  return accountResponse(error);
}
