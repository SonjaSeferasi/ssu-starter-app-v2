import { AccountError, accountClient, accountOperation, accountResponse, verifiedUser } from './socialu-account';
import { CONVERSATION_NOT_AVAILABLE } from './chat-access';

// Server-only Snipe bridge (UR-510 to UR-514, UR-525). The acting student always comes from the verified
// token; the database function performs every participant, friendship, consent and reward check.
export const SNIPE_NOT_AVAILABLE = 'Snipe not available.';
export const SNIPE_REPORT_NOT_AVAILABLE = 'Report not available.';
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

export type RpcError = { code?: string | null; message?: string | null; details?: string | null };

// Also used for errors the staging bridge reports as data (a rejected ticket commits its terminal state).
export function snipeError(error: RpcError): SnipeError {
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
    // The publishing answer and its reward roll back together (no current Snipe reward rule); retry later.
    case 'SN503': return known(503, 'SNIPE_REWARDS_UNAVAILABLE');
    // Group reporting (SRS-514.8, 514.14): invalid reason, not reportable here, or no longer published.
    case 'SR400': return known(400, 'SNIPE_REPORT_INVALID');
    case 'SR403': return known(403, 'SNIPE_REPORT_NOT_ALLOWED');
    case 'SR409': return known(409, 'SNIPE_NOT_PUBLISHED');
    // Administrator review (SRS-514.1, 514.10, 514.12): not a current manager, invalid decision, unknown report.
    case 'SM400': return known(400, 'SNIPE_DECISION_INVALID');
    case 'SM403': return known(403, 'SNIPE_MODERATION_NOT_ALLOWED');
    case 'SR404': return new SnipeError(SNIPE_REPORT_NOT_AVAILABLE, 404, true);
    // Direct photo upload tickets (20261030034841_snipe_photo_transport.sql).
    case 'SP404': return known(404, 'SNIPE_UPLOAD_NOT_AVAILABLE');
    case 'SP409': return known(409, 'SNIPE_UPLOAD_BUSY');
    case 'SP410': return known(410, 'SNIPE_UPLOAD_EXPIRED');
    case 'SP422': return known(400, 'SNIPE_PHOTO_INVALID');
    case 'SP429': return known(429, 'SNIPE_UPLOAD_LIMIT');
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

// SRS-514.8 to 514.11: a group member's report of a published Snipe. Only the trimmed reason is forwarded;
// the reporter comes from the verified token and status/resolution never come from the browser.
export const SNIPE_REPORT_REASON_MAX = 500;
export type SnipeReportResult = { result: 'created' | 'existing' | 'conflict'; report: unknown; snipe: unknown };

export async function snipeReport(authId: string, conversationId: string, snipeId: string, reason: string) {
  const { data, error } = await accountClient().rpc('socialu_snipe_report', { p_auth_id: authId, p_conversation_id: conversationId, p_snipe_id: snipeId, p_payload: { reason } });
  if (error) throw snipeError(error);
  return data as SnipeReportResult;
}

// SRS-514.1, 514.10, 514.12, 514.13, 514.15: a current group owner or administrator reviews the group's
// unresolved reports, decides each one, or removes a published Snipe directly. The database derives the actor
// and rechecks the account, participant, school and manager role on every call; only the decision is forwarded.
export type SnipeModerationAction = 'queue' | 'resolve' | 'remove';
export type SnipeDecision = 'dismissed' | 'removed';
export const SNIPE_DECISIONS: readonly SnipeDecision[] = ['dismissed', 'removed'];

export async function snipeModeration<T = any>(authId: string, action: SnipeModerationAction, conversationId: string, targetId: string | null = null, payload: { decision?: SnipeDecision } = {}): Promise<T> {
  const { data, error } = await accountClient().rpc('socialu_snipe_moderation', { p_auth_id: authId, p_action: action, p_conversation_id: conversationId, p_target_id: targetId, p_payload: payload });
  if (error) throw snipeError(error);
  return data as T;
}

// Dedicated private bucket, provisioned by the Snipe migration. A restrictive storage.objects policy
// denies anon/authenticated every row here, so only this server (service_role) uploads or downloads.
// No public or signed URL is ever created; photos are streamed through the authorized photo route.
export const SNIPE_BUCKET = 'socialu-snipe-photos';
// Unvalidated originals uploaded by the browser (20261030034841_snipe_photo_transport.sql). Same restrictive
// policy, separate bucket: only upload-only signed URLs for one staging key are issued here, it is never
// read by participants, and cleanup in this bucket can never reach a committed photo.
export const SNIPE_STAGING_BUCKET = 'socialu-snipe-staging';

export function snipeStorage() {
  return accountClient().storage.from(SNIPE_BUCKET);
}

export function snipeStagingStorage() {
  return accountClient().storage.from(SNIPE_STAGING_BUCKET);
}

// Snipe uploads refuse a public bucket, because a public object URL could be fetched without any of the checks below.
export async function requirePrivateSnipeBucket(bucket = SNIPE_BUCKET) {
  const { data, error } = await accountClient().storage.getBucket(bucket);
  if (error || !data) throw new AccountError('Snipe photo storage is not set up yet.', 503, 'SNIPE_STORAGE_SETUP_REQUIRED');
  if (data.public) throw new AccountError('Snipe uploads are paused: the Snipe storage bucket must be private.', 503, 'SNIPE_STORAGE_PUBLIC');
}

// Reads one private object as a stream with the server key, never through a public or signed read URL.
// The same request the SDK's download() makes; the caller reads the body (bounded). `missing` is a
// definite "no such object"; anything else is an unavailable store.
export async function snipeObject(bucket: string, key: string, signal?: AbortSignal):
  Promise<{ body: ReadableStream<Uint8Array>; missing?: never } | { body?: never; missing: boolean }> {
  accountClient();
  const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  const path = [bucket, ...key.split('/')].map(encodeURIComponent).join('/');
  let response: Response;
  try {
    response = await fetch(`${base}/storage/v1/object/${path}`, { headers: { apikey: serverKey, Authorization: `Bearer ${serverKey}` }, cache: 'no-store', signal });
  } catch { return { missing: false }; }
  if (response.ok && response.body) return { body: response.body };
  await response.body?.cancel().catch(() => {});
  // Storage has answered a missing object both as 404 and as 400 with statusCode "404".
  return { missing: response.status === 404 || response.status === 400 };
}

export function snipeResponse(error: unknown) {
  if (error instanceof SnipeError) {
    return Response.json({ error: error.message, ...(error.code ? { code: error.code } : {}), ...error.extra }, { status: error.status, headers: NO_STORE });
  }
  return accountResponse(error);
}
