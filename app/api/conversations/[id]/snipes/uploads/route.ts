import { AccountError } from '../../../../../../lib/socialu-account';
import { conversationIdParam } from '../../../../../../lib/chat-access';
import { NO_STORE, SNIPE_BUCKET, SNIPE_STAGING_BUCKET, requirePrivateSnipeBucket, snipeResponse, snipeStagingStorage, snipeUser } from '../../../../../../lib/snipe';
import { DIGEST, UUID, newTicket, reapStagedUploads, smallJsonBody, stageOperation, stagingKey } from '../../../../../../lib/snipe-transport';
import { SNIPE_PHOTO_POLICY, isSnipeMimeType } from '../../../../../../lib/snipe-policy';
export const dynamic = 'force-dynamic';

type Begin = { state: 'accepted'; snipe: unknown } | { state: 'staged'; reused: boolean; staging_key: string; expires_at: string };

// SRS-510.2, 510.11: start one direct photo upload. The body is small JSON describing the ORIGINAL file
// (its SHA-256, type and exact size) and the selection. Eligibility and cooldowns are checked first; then one
// opaque ticket bound to this account, conversation, submission key, tags and file is issued together with an
// upload-only URL for one unpredictable staging object. The photo itself never passes through this server.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await snipeUser(request);
    const conversationId = conversationIdParam((await context.params).id);
    const body = await smallJsonBody(request);
    const submissionKey = String(body.submissionKey ?? '').toLowerCase();
    if (!UUID.test(submissionKey)) throw new AccountError('Start the Snipe again.', 400);
    const targets = body.targets;
    if (!Array.isArray(targets) || targets.length === 0 || targets.some(id => typeof id !== 'string' || !/^[1-9]\d{0,17}$/.test(id))) {
      throw new AccountError('Choose at least one friend to tag.', 400);
    }
    // Cheap checks of the declared file; the server decoder rechecks the stored bytes at finalize.
    const mimeType = String(body.mimeType ?? '');
    if (!isSnipeMimeType(mimeType)) throw new AccountError('Only JPEG and PNG photos are supported.', 400, 'SNIPE_PHOTO_INVALID');
    const byteCount = body.byteCount;
    if (typeof byteCount !== 'number' || !Number.isSafeInteger(byteCount) || byteCount < 1) throw new AccountError('Choose a photo to submit.', 400, 'SNIPE_PHOTO_INVALID');
    if (byteCount > SNIPE_PHOTO_POLICY.maxBytes) throw new AccountError('Photos can be at most 10 MB.', 400, 'SNIPE_PHOTO_INVALID');
    const digest = String(body.digest ?? '');
    if (!DIGEST.test(digest)) throw new AccountError('The photo could not be read. Choose it again.', 400, 'SNIPE_PHOTO_INVALID');

    await requirePrivateSnipeBucket(SNIPE_BUCKET);
    await requirePrivateSnipeBucket(SNIPE_STAGING_BUCKET);
    await reapStagedUploads();
    const { ticket, hash } = newTicket();
    const staged = await stageOperation<Begin>(user.id, 'begin', conversationId, {
      submission_key: submissionKey, targets, content_digest: digest, mime_type: mimeType, byte_count: byteCount,
      ticket_hash: hash, staging_key: stagingKey(user.id, mimeType),
    });
    // A retry of an accepted submission returns the saved request; nothing is uploaded again.
    if (staged.state === 'accepted') return Response.json({ created: false, snipe: staged.snipe }, { headers: NO_STORE });

    // upsert:false — the URL can create this one object once and can never replace it. Storage keeps the URL
    // valid for two hours and cannot revoke it early; the database only frees the object after that.
    let signed: { signedUrl: string } | null = null;
    try {
      const { data, error } = await snipeStagingStorage().createSignedUploadUrl(staged.staging_key, { upsert: false });
      if (!error && data?.signedUrl) signed = data;
    } catch { /* reported below */ }
    if (!signed && !staged.reused) {
      // The ticket was never handed out; close it so it stops counting against this account.
      await stageOperation(user.id, 'discard', conversationId, { ticket_hash: hash }).catch(() => {});
      throw new AccountError('The photo upload could not be started. Please try again.', 503);
    }
    // A retried submission keeps its staging object, which may already hold the photo (Storage may refuse
    // to sign an existing upload-once key). Without a URL the browser goes straight to finalize, which
    // checks the stored bytes and reports a missing upload as retryable.
    return Response.json({
      ticket, expires_at: staged.expires_at,
      upload: signed ? { url: signed.signedUrl, method: 'PUT', headers: { 'Content-Type': mimeType } } : null,
    }, { status: 201, headers: NO_STORE });
  } catch (error) { return snipeResponse(error); }
}
