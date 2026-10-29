import { AccountError } from '../../../../../lib/socialu-account';
import { conversationIdParam } from '../../../../../lib/chat-access';
import { NO_STORE, SnipeError, requirePrivateSnipeBucket, snipeOperation, snipeResponse, snipeStorage, snipeUser } from '../../../../../lib/snipe';
import { SnipePhotoError, type ValidatedSnipePhoto, validateSnipePhoto } from '../../../../../lib/snipe-image';
import { SNIPE_PHOTO_POLICY, isSnipeMimeType } from '../../../../../lib/snipe-policy';
export const dynamic = 'force-dynamic';

type SnipeResult = { created: boolean; snipe: unknown; same_upload?: boolean };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// SRS-510.4, 512.1, 512.2: the student's private Snipe view for this conversation and the friends they may tag.
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await snipeUser(request);
    const conversationId = conversationIdParam((await context.params).id);
    return Response.json(await snipeOperation(user.id, 'list', conversationId), { headers: NO_STORE });
  } catch (error) { return snipeResponse(error); }
}

// SRS-510.1 to 510.11: submit exactly one validated photo and one or more eligible friends.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await snipeUser(request);
    const conversationId = conversationIdParam((await context.params).id);
    let form: FormData;
    try { form = await request.formData(); } catch { throw new AccountError('Choose a photo and at least one friend.', 400); }
    const photos = form.getAll('photo');
    const photo = photos[0];
    if (photos.length !== 1 || !(photo instanceof File)) throw new AccountError('Choose exactly one photo.', 400, 'SNIPE_PHOTO_INVALID');
    // Cheap checks first: nothing is decoded or uploaded for an oversized or unsupported file.
    if (photo.size > SNIPE_PHOTO_POLICY.maxBytes) throw new AccountError('Photos can be at most 10 MB.', 400, 'SNIPE_PHOTO_INVALID');
    if (photo.type && !isSnipeMimeType(photo.type)) throw new AccountError('Only JPEG and PNG photos are supported.', 400, 'SNIPE_PHOTO_INVALID');
    const submissionKey = String(form.get('submissionKey') ?? '').toLowerCase();
    if (!UUID.test(submissionKey)) throw new AccountError('Start the Snipe again.', 400);
    const targets = form.getAll('target').map(String);
    if (targets.length === 0 || targets.some(id => !/^[1-9]\d{0,17}$/.test(id))) throw new AccountError('Choose at least one friend to tag.', 400);

    // The photo is validated first: its digest is part of the submission, so a retry is only the same
    // action when the conversation, tags and photo all match (SRS-510.11); otherwise SN409.
    let validated: ValidatedSnipePhoto;
    try { validated = await validateSnipePhoto(new Uint8Array(await photo.arrayBuffer()), photo.type); }
    catch (error) {
      if (error instanceof SnipePhotoError) throw new AccountError(error.message, 400, 'SNIPE_PHOTO_INVALID');
      throw error;
    }
    const selection = { submission_key: submissionKey, targets, content_digest: validated.digest };

    // A retry of an accepted submission returns the saved request without uploading again (SRS-510.11);
    // an ineligible or cooled-down selection is rejected before any upload (SRS-510.8, 513.9).
    const prepared = await snipeOperation<SnipeResult>(user.id, 'prepare', conversationId, null, selection);
    if (prepared.snipe) return Response.json({ created: false, snipe: prepared.snipe }, { headers: NO_STORE });
    await requirePrivateSnipeBucket();

    // Every attempt gets its own object (the digest folder records which photo it is), so a retry can
    // never overwrite a committed photo and removing this attempt's object never touches another.
    const storageKey = `snipe/${user.id}/${submissionKey}/${validated.digest}/${crypto.randomUUID()}.${validated.extension}`;
    const { error: uploadError } = await snipeStorage().upload(storageKey, validated.bytes, { contentType: validated.mimeType, upsert: false });
    if (uploadError) {
      // No database row can reference this attempt yet, so removing a partial upload is always safe.
      await removeUpload(storageKey);
      throw new AccountError('The photo could not be stored. Please try again.', 503);
    }
    let created: SnipeResult;
    try {
      created = await snipeOperation<SnipeResult>(user.id, 'create', conversationId, null,
        { ...selection, storage_key: storageKey, mime_type: validated.mimeType, byte_count: validated.bytes.byteLength });
    } catch (error) {
      // A database rejection rolled everything back. An uncertain outcome may have committed this
      // photo, so it is kept for reconciliation instead of risking a committed Snipe's image.
      if (error instanceof SnipeError && error.definite) await removeUpload(storageKey);
      else console.error('Snipe submission outcome uncertain; upload kept for reconciliation', { storageKey });
      throw error;
    }
    // A concurrent retry with the same key committed first, with its own photo. Only an object the
    // database confirms is not the committed photo is removed.
    if (!created.created && created.same_upload === false) await removeUpload(storageKey);
    return Response.json({ created: created.created, snipe: created.snipe }, { status: created.created ? 201 : 200, headers: NO_STORE });
  } catch (error) { return snipeResponse(error); }
}

async function removeUpload(storageKey: string) {
  try {
    const { error } = await snipeStorage().remove([storageKey]);
    if (error) console.error('Unreferenced Snipe upload was not removed', { storageKey });
  } catch { console.error('Unreferenced Snipe upload was not removed', { storageKey }); }
}
