import { AccountError, accountClient, accountResponse, jsonBody, verifiedUser } from '../../../../../lib/socialu-account';
import { chatOperation, conversationIdParam } from '../../../../../lib/chat-access';
import { gifError, gifStorageKey } from '../../../../../lib/chat-gif';
import { fetchLinkedGif } from '../../../../../lib/chat-gif-link-server';
import { resolveMediaUrl } from '../../../../../lib/media';
export const dynamic = 'force-dynamic';

const MEDIA_BUCKET = 'media';

// SRS-201.21 (UR-201): a conversation participant sends a GIF by giving a link to it.
// The body is JSON with one field, `url`.
//
// From the second line onwards this is app/api/conversations/[id]/gifs/route.ts: the GIF is stored, and
// socialu_send_gif writes the message. Only where the bytes come from is different -- a link the student
// pasted instead of a file they picked -- so a linked GIF is a 'gif_upload' message like any other, the
// same 15 MB limit applies to it, and nothing downstream has to learn a third way for a GIF to exist.
// That also means this route needed no migration: the function it calls has been deployed since
// SRS-201.14.
//
// Storing a copy rather than the link is the decision worth defending. A message holding a remote URL
// would show whatever that address serves tomorrow, inside a conversation someone has already read, and
// would break outright when the GIF is taken down. The copy is the GIF that was sent.
//
// lib/chat-gif-link-server.ts does the dangerous part -- deciding where the server is willing to connect
// and how much it will read -- and its header explains each rule.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const conversationId = conversationIdParam((await context.params).id);

    const body = await jsonBody(request);
    // Throws an AccountError with a sentence for the student when the link is refused at any stage.
    const bytes = await fetchLinkedGif(body.url);

    // The same rule the device upload applies, from the same module. The reader already stopped at the
    // limit; this is what turns that into the message the student sees.
    const refusal = gifError({ type: 'image/gif', size: bytes.byteLength });
    if (refusal) throw new AccountError(refusal, 400);

    const supabase = accountClient();
    const storageKey = gifStorageKey(user.id, conversationId, crypto.randomUUID());
    const storage = supabase.storage.from(MEDIA_BUCKET);
    const { error: uploadError } = await storage.upload(storageKey, bytes, { contentType: 'image/gif', upsert: false });
    if (uploadError) throw new AccountError('Your GIF could not be stored. Please try again.', 503);

    let message;
    try {
      message = await chatOperation('socialu_send_gif', {
        p_auth_id: user.id, p_conversation_id: conversationId,
        p_storage_key: storageKey, p_mime_type: 'image/gif', p_byte_count: String(bytes.byteLength),
      });
    } catch (error) {
      await storage.remove([storageKey]).catch(() => {});
      throw error;
    }

    const url = await resolveMediaUrl(supabase, storageKey);
    return Response.json({ message: { ...message, photo_url: url } }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
