import { AccountError, accountClient, accountResponse, verifiedUser } from '../../../../../lib/socialu-account';
import { chatOperation, conversationIdParam } from '../../../../../lib/chat-access';
import { photoError, photoStorageKey } from '../../../../../lib/chat-photo';
import { PhotoBytesError, displayCopy, readPhoto } from '../../../../../lib/chat-photo-image';
import { resolveMediaUrl } from '../../../../../lib/media';
export const dynamic = 'force-dynamic';

// The bucket the rest of the application stores media in (lib/media.ts signs URLs from the same one).
const MEDIA_BUCKET = 'media';

// SRS-201.6 (#1022, #1023, #1026): a conversation participant sends a chosen photo.
// The body is multipart form data with one 'photo' file. The sender always comes from the verified token.
//
// The photo is checked three times over, and each check is there because the one before it can be lied to:
//   - the page refuses an unsupported format or an oversized file (SRS-201.4, SRS-201.5), but a request can
//     be made without the page;
//   - this route applies the same rules to what actually arrived, and then decodes the bytes, because the
//     reported type is a claim about the file name as much as about the file;
//   - the database refuses a format or size its chat_photo policy does not allow as the row is written.
// Storage comes between the second and third of those, so an upload that the database then refuses leaves an
// object behind; it is removed before the error is returned.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const conversationId = conversationIdParam((await context.params).id);

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new AccountError('Choose a photo to send.', 400);
    }
    const file = form.get('photo');
    if (!(file instanceof File)) throw new AccountError('Choose a photo to send.', 400);

    // The same two rules the page applied, from the same module, so the two answers cannot differ.
    const refusal = photoError({ type: file.type, size: file.size });
    if (refusal) throw new AccountError(refusal, 400);

    const bytes = Buffer.from(await file.arrayBuffer());
    // file.size is what the browser declared; this is what arrived. A request that declares a small photo and
    // sends a large one is refused rather than stored.
    if (bytes.byteLength !== file.size) throw new AccountError('That photo could not be read. Choose it again.', 400);

    let size;
    try {
      size = await readPhoto(bytes, file.type);
    } catch (error) {
      if (error instanceof PhotoBytesError) throw new AccountError(error.message, 400);
      throw error;
    }

    const supabase = accountClient();
    const unique = crypto.randomUUID();
    const storageKey = photoStorageKey(user.id, conversationId, unique, file.type);
    const storage = supabase.storage.from(MEDIA_BUCKET);
    // upsert stays off: the random name means this key is new, and refusing to overwrite makes it impossible
    // for one send to replace another student's stored photo even if a key were ever repeated.
    const { error: uploadError } = await storage.upload(storageKey, bytes, { contentType: file.type, upsert: false });
    if (uploadError) throw new AccountError('Your photo could not be stored. Please try again.', 503);

    // SRS-201.6 (#1026): the smaller copy the conversation shows. A photo already small enough gets none, and
    // a copy that cannot be made is not a reason to refuse the send -- the original is shown instead.
    const stored: string[] = [storageKey];
    let display: { key: string; type: string; bytes: number } | null = null;
    const copy = await displayCopy(bytes, file.type, size);
    if (copy) {
      const displayKey = photoStorageKey(user.id, conversationId, unique, copy.type, 'display');
      const { error: copyError } = await storage.upload(displayKey, copy.bytes, { contentType: copy.type, upsert: false });
      if (!copyError) {
        display = { key: displayKey, type: copy.type, bytes: copy.bytes.byteLength };
        stored.push(displayKey);
      }
    }

    let message;
    try {
      message = await chatOperation('socialu_send_photo', {
        p_auth_id: user.id, p_conversation_id: conversationId,
        p_storage_key: storageKey, p_mime_type: file.type, p_byte_count: String(bytes.byteLength),
        ...(display ? {
          p_display_storage_key: display.key, p_display_mime_type: display.type,
          p_display_byte_count: String(display.bytes),
        } : {}),
      });
    } catch (error) {
      // Nothing references these objects: the message and the asset rows are written in one transaction, so a
      // refusal leaves no row pointing at them. Removing them keeps the bucket from filling with photos that
      // were never sent. A failed removal is not worth reporting over the error the student actually needs.
      await storage.remove(stored).catch(() => {});
      throw error;
    }

    // So the sender sees the photo they just sent without waiting for the history to reload. Showing a photo
    // to everyone else is SRS-201.7, which is also where a link that has expired is refreshed.
    const url = await resolveMediaUrl(supabase, display ? display.key : storageKey);
    return Response.json({ message: { ...message, photo_url: url } }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
