import { AccountError, accountClient, accountResponse, verifiedUser } from '../../../../../lib/socialu-account';
import { chatOperation, conversationIdParam } from '../../../../../lib/chat-access';
import { GIF_BYTES_REJECTED, gifError, gifStorageKey, isGifBytes } from '../../../../../lib/chat-gif';
import { resolveMediaUrl } from '../../../../../lib/media';
export const dynamic = 'force-dynamic';

// The bucket the rest of the application stores media in (lib/media.ts signs URLs from the same one).
const MEDIA_BUCKET = 'media';

// SRS-201.14 (#1405): a conversation participant sends a GIF uploaded from their device.
// The body is multipart form data with one 'gif' file. The sender always comes from the verified token.
//
// The GIF is checked three times over, and each check is there because the one before it can be lied to:
//   - the page refuses an unsupported format or an oversized file (SRS-201.12, SRS-201.13), but a request
//     can be made without the page;
//   - this route applies the same rules to what actually arrived, and then reads the file's header,
//     because the reported type is a claim about the file name as much as about the file;
//   - the database refuses a format or size its chat_gif policy does not allow as the row is written.
// Storage comes between the second and third of those, so an upload that the database then refuses leaves
// an object behind; it is removed before the error is returned.
//
// Unlike app/api/conversations/[id]/photos/route.ts there is no display copy. Re-encoding a GIF to a
// smaller still image is exactly what SRS-201.15 must not show, so the bytes that arrive are the bytes
// that are stored, and only the header is ever read.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const conversationId = conversationIdParam((await context.params).id);

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new AccountError('Choose a GIF to send.', 400);
    }
    const file = form.get('gif');
    if (!(file instanceof File)) throw new AccountError('Choose a GIF to send.', 400);

    // The same two rules the page applied, from the same module, so the two answers cannot differ.
    const refusal = gifError({ type: file.type, size: file.size });
    if (refusal) throw new AccountError(refusal, 400);

    const bytes = Buffer.from(await file.arrayBuffer());
    // file.size is what the browser declared; this is what arrived. A request that declares a small GIF and
    // sends a large one is refused rather than stored.
    if (bytes.byteLength !== file.size) throw new AccountError('That GIF could not be read. Choose it again.', 400);
    // A file named .gif and reported as image/gif can still be anything. The header is the cheapest honest
    // check, and reading no further leaves the frames untouched.
    if (!isGifBytes(bytes)) throw new AccountError(GIF_BYTES_REJECTED, 400);

    const supabase = accountClient();
    const storageKey = gifStorageKey(user.id, conversationId, crypto.randomUUID());
    const storage = supabase.storage.from(MEDIA_BUCKET);
    // upsert stays off: the random name means this key is new, and refusing to overwrite makes it
    // impossible for one send to replace another student's stored GIF even if a key were ever repeated.
    const { error: uploadError } = await storage.upload(storageKey, bytes, { contentType: 'image/gif', upsert: false });
    if (uploadError) throw new AccountError('Your GIF could not be stored. Please try again.', 503);

    let message;
    try {
      message = await chatOperation('socialu_send_gif', {
        p_auth_id: user.id, p_conversation_id: conversationId,
        p_storage_key: storageKey, p_mime_type: 'image/gif', p_byte_count: String(bytes.byteLength),
      });
    } catch (error) {
      // Nothing references this object: the message and the asset row are written in one transaction, so a
      // refusal leaves no row pointing at it. Removing it keeps the bucket from filling with GIFs that were
      // never sent. A failed removal is not worth reporting over the error the student actually needs.
      await storage.remove([storageKey]).catch(() => {});
      throw error;
    }

    // So the sender sees the GIF they just sent without waiting for the history to reload. Showing it to
    // everyone else is SRS-201.15, which is also where a link that has expired is refreshed.
    const url = await resolveMediaUrl(supabase, storageKey);
    return Response.json({ message: { ...message, photo_url: url } }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
