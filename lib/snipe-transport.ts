import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { AccountError, accountClient } from './socialu-account';
import { SNIPE_STAGING_BUCKET, type RpcError, snipeError, snipeStagingStorage, snipeStorage } from './snipe';
import type { SnipeMimeType } from './snipe-policy';

// Server-only. SRS-510.2 direct photo transport (documentation/snipe-photo-transport.md): the browser sends
// small JSON to this app and the original photo straight to private Storage through an upload-only URL.
export const TICKET = /^[A-Za-z0-9_-]{43}$/;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const DIGEST = /^[0-9a-f]{64}$/;
// Begin and finalize bodies are a few hundred bytes; anything bigger (an image, a form) is refused unread.
const MAX_JSON_BYTES = 8192;

export type StageAction = 'begin' | 'discard' | 'claim' | 'release' | 'reject' | 'accept';
// Outcomes the staging bridge commits and then reports as data; `error` maps like any bridge error.
export type StageOutcome = { state: 'accepted' | 'rejected' | 'expired' | 'retry' | 'staged' | 'claimed'; error?: RpcError; [field: string]: unknown };

// 256 random bits. Only the SHA-256 is stored, so a database read never yields a usable ticket.
export function newTicket() {
  const ticket = randomBytes(32).toString('base64url');
  return { ticket, hash: ticketHash(ticket) };
}
export const ticketHash = (ticket: string) => sha256(ticket);
export const sha256 = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');

// Unpredictable and per account; never shaped like a committed key (snipe/...), and in another bucket.
export const stagingKey = (authId: string, mimeType: SnipeMimeType) => `stage/${authId}/${randomUUID()}.${mimeType === 'image/jpeg' ? 'jpg' : 'png'}`;

export async function stageOperation<T = any>(authId: string, action: StageAction, conversationId: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await accountClient().rpc('socialu_snipe_photo', { p_auth_id: authId, p_action: action, p_conversation_id: conversationId, p_payload: payload });
  if (error) throw snipeError(error);
  return data as T;
}

export async function smallJsonBody(request: Request): Promise<Record<string, unknown>> {
  const invalid = () => new AccountError('Enter a valid request.', 400);
  if (!/^application\/json\b/i.test(request.headers.get('Content-Type') || '')) throw invalid();
  if (Number(request.headers.get('Content-Length') || 0) > MAX_JSON_BYTES) throw new AccountError('Photos are uploaded directly to storage, not in this request.', 413);
  const bytes = request.body ? await readCapped(request.body, MAX_JSON_BYTES) : new Uint8Array();
  if (!bytes) throw new AccountError('Photos are uploaded directly to storage, not in this request.', 413);
  try {
    const body = JSON.parse(Buffer.from(bytes).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch { throw invalid(); }
}

// Reads at most `limit` bytes; null (and the stream is cancelled) as soon as there are more.
export async function readCapped(body: ReadableStream<Uint8Array>, limit: number): Promise<Uint8Array | null> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) { await reader.cancel().catch(() => {}); return null; }
    chunks.push(value);
  }
  return Buffer.concat(chunks, total);
}

// Best effort: a failure is logged. A staging object is deleted again by reapStagedUploads; this is only
// ever called for a committed-photo key that the database definitely did not (or no longer) reference.
export async function removeObject(bucket: 'photos' | 'staging', key: string) {
  try {
    const { error } = await (bucket === 'photos' ? snipeStorage() : snipeStagingStorage()).remove([key]);
    if (error) console.error('Snipe object was not removed', { bucket, key });
  } catch { console.error('Snipe object was not removed', { bucket, key }); }
}

// Deletes staging objects whose ticket is finished and whose upload URL has expired (so it can no longer
// recreate them). Runs a bounded batch on each begin; it never throws and never touches committed photos.
export async function reapStagedUploads() {
  try {
    const { data, error } = await accountClient().rpc('socialu_snipe_photo_reap', { p_action: 'claim', p_payload: {} });
    if (error) return;
    const objects = ((data as { objects?: { id: string; staging_key: string }[] })?.objects ?? [])
      .filter((o) => /^stage\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png)$/.test(o.staging_key));
    if (objects.length === 0) return;
    const { error: removeError } = await snipeStagingStorage().remove(objects.map((o) => o.staging_key));
    // Not marked cleared: the lease runs out and a later batch tries again.
    if (removeError) { console.error('Snipe staging cleanup failed', { bucket: SNIPE_STAGING_BUCKET, count: objects.length }); return; }
    await accountClient().rpc('socialu_snipe_photo_reap', { p_action: 'cleared', p_payload: { ids: objects.map((o) => o.id) } });
  } catch { console.error('Snipe staging cleanup failed', { bucket: SNIPE_STAGING_BUCKET }); }
}
