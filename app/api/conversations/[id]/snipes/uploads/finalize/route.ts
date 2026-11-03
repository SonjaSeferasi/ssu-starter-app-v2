import { AccountError } from '../../../../../../../lib/socialu-account';
import { conversationIdParam } from '../../../../../../../lib/chat-access';
import { NO_STORE, SNIPE_BUCKET, SNIPE_STAGING_BUCKET, SnipeError, requirePrivateSnipeBucket, snipeError, snipeObject, snipeResponse, snipeStorage, snipeUser } from '../../../../../../../lib/snipe';
import { type StageOutcome, TICKET, readCapped, removeObject, sha256, smallJsonBody, stageOperation, ticketHash } from '../../../../../../../lib/snipe-transport';
import { SnipePhotoError, type ValidatedSnipePhoto, validateSnipePhoto } from '../../../../../../../lib/snipe-image';
import type { SnipeMimeType } from '../../../../../../../lib/snipe-policy';
export const dynamic = 'force-dynamic';

type Claim = { claim: string; staging_key: string; submission_key: string; targets: string[]; content_digest: string; mime_type: SnipeMimeType; byte_count: number };
type Accepted = { created?: boolean; snipe?: unknown; same_upload?: boolean };
const CHANGED = 'The uploaded photo does not match the one you chose. Start the Snipe again.';
const EXPIRED = 'This photo upload expired. Start the Snipe again.';

// SRS-510.2, 510.3, 510.11: accept one directly uploaded photo. The body is only the ticket. Under a short
// exclusive claim the server downloads the ORIGINAL staged bytes and checks their exact size and SHA-256 against
// what was declared at begin, then strictly decodes and re-encodes them (metadata removed) with the same
// validator as every Snipe photo. The re-encoded copy goes to a new attempt-specific committed key, and the
// database accepts it atomically, rechecking membership, friendship, cooldowns and retry identity.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await snipeUser(request);
    const conversationId = conversationIdParam((await context.params).id);
    const body = await smallJsonBody(request);
    const ticket = typeof body.ticket === 'string' ? body.ticket : '';
    if (!TICKET.test(ticket)) throw new AccountError('Start the Snipe again.', 400);
    const ticket_hash = ticketHash(ticket);
    const stage = (action: 'release' | 'reject' | 'accept', claim: string, payload: Record<string, unknown> = {}) =>
      stageOperation<StageOutcome>(user.id, action, conversationId, { ticket_hash, claim, ...payload });

    const claimed = await stageOperation<StageOutcome & Accepted>(user.id, 'claim', conversationId, { ticket_hash });
    if (claimed.state === 'accepted') return Response.json({ created: false, snipe: claimed.snipe }, { headers: NO_STORE });
    if (claimed.state !== 'claimed') throw outcomeError(claimed);
    const { claim, staging_key: stagingKey, content_digest: digest, mime_type: mimeType, byte_count: byteCount, submission_key: submissionKey } = claimed as unknown as Claim;

    // Anything that is not a definite verdict gives the claim back, so the same ticket can be retried.
    let rejected = false;
    const release = () => stage('release', claim).catch(() => {});
    const reject = async (reason: string) => {
      rejected = true;
      await stage('reject', claim, { reason });
      // Never shown to anyone; removed now and again after its upload URL expires.
      await removeObject('staging', stagingKey);
      return new AccountError(reason, 400, 'SNIPE_PHOTO_INVALID');
    };

    let validated: ValidatedSnipePhoto;
    try {
      const object = await snipeObject(SNIPE_STAGING_BUCKET, stagingKey);
      if (!object.body) {
        if (object.missing) throw new AccountError('The photo has not finished uploading. Please try again.', 409, 'SNIPE_UPLOAD_MISSING');
        throw new AccountError('The photo could not be read from storage. Please try again.', 503);
      }
      // Never more than the declared size is read, so an oversized or swapped object cannot exhaust memory.
      const bytes = await readCapped(object.body, byteCount);
      if (!bytes || bytes.byteLength !== byteCount || sha256(bytes) !== digest) throw await reject(CHANGED);
      try { validated = await validateSnipePhoto(bytes, mimeType); }
      catch (error) {
        if (error instanceof SnipePhotoError) throw await reject(error.message);
        throw error;
      }
      if (validated.digest !== digest || validated.mimeType !== mimeType) throw await reject(CHANGED);
      await requirePrivateSnipeBucket(SNIPE_BUCKET);
    } catch (error) {
      if (!rejected) await release();
      throw error;
    }

    // Every attempt gets its own committed object (the digest folder records which photo it is), so a retry can
    // never overwrite a committed photo and removing this attempt's object never touches another.
    const storageKey = `snipe/${user.id}/${submissionKey}/${digest}/${crypto.randomUUID()}.${validated.extension}`;
    const { error: uploadError } = await snipeStorage().upload(storageKey, validated.bytes, { contentType: validated.mimeType, upsert: false })
      .catch(() => ({ error: true }));
    if (uploadError) {
      // No database row can reference this attempt yet, so removing a partial upload is always safe.
      await removeObject('photos', storageKey);
      await release();
      throw new AccountError('The photo could not be stored. Please try again.', 503);
    }

    let accepted: StageOutcome & Accepted;
    try {
      accepted = await stage('accept', claim, { storage_key: storageKey, mime_type: validated.mimeType, byte_count: validated.bytes.byteLength });
    } catch (error) {
      // A database rejection rolled everything back. An uncertain outcome may have committed this photo, so it
      // is kept for reconciliation (and the staged original until cleanup) instead of risking a committed image.
      if (error instanceof SnipeError && error.definite) await removeObject('photos', storageKey);
      else console.error('Snipe submission outcome uncertain; upload kept for reconciliation', { storageKey });
      throw error;
    }
    if (accepted.state !== 'accepted') {
      // rejected / expired / retry are committed answers in which nothing references this object.
      await removeObject('photos', storageKey);
      throw outcomeError(accepted);
    }
    // A concurrent retry with the same key committed first, with its own photo. Only an object the database
    // confirms is not the committed photo is removed.
    if (!accepted.created && accepted.same_upload === false) await removeObject('photos', storageKey);
    await removeObject('staging', stagingKey);
    return Response.json({ created: accepted.created, snipe: accepted.snipe }, { status: accepted.created ? 201 : 200, headers: NO_STORE });
  } catch (error) { return snipeResponse(error); }
}

function outcomeError(outcome: StageOutcome) {
  if (outcome.state === 'expired') return new SnipeError(outcome.error?.message || EXPIRED, 410, true, 'SNIPE_UPLOAD_EXPIRED');
  if (outcome.state === 'retry') return new SnipeError('Snipe is busy right now. Please try again.', 503, true);
  if (outcome.error?.code) return snipeError(outcome.error);
  return new SnipeError('This photo upload is no longer available. Start the Snipe again.', 409, true, 'SNIPE_UPLOAD_NOT_AVAILABLE');
}
