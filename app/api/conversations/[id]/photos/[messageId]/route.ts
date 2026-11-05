import { accountClient, accountResponse, verifiedUser } from '../../../../../../lib/socialu-account';
import { chatOperation, conversationIdParam, messageIdParam } from '../../../../../../lib/chat-access';
export const dynamic = 'force-dynamic';

const MEDIA_BUCKET = 'media';

// #1106: the student who sent a photo removes it from the conversation.
//
// The database decides whether it may happen -- it is the only thing that knows who sent the message and who
// is still in the conversation -- and returns the stored objects to remove. Order matters: the row is marked
// first and the objects go afterwards. The other way round, a failure between the two would leave a message
// still pointing at a photograph that no longer exists, which is the one state the conversation cannot
// render. This way the worst case is an orphaned object in the bucket, which costs storage and nothing else.
//
// Deleting twice is not an error. The second call finds the message already deleted, names no objects, and
// still answers 200, so a retry after a dropped connection is harmless.
export async function DELETE(request: Request, context: { params: Promise<{ id: string; messageId: string }> }) {
  try {
    const user = await verifiedUser(request);
    const { id, messageId } = await context.params;
    const conversationId = conversationIdParam(id);
    const message = messageIdParam(messageId);

    const result = await chatOperation('socialu_delete_photo', { p_auth_id: user.id, p_message_id: message });

    // The conversation in the path has to be the one the message is actually in. The database already refused
    // anyone outside that conversation, so this only catches a mismatched URL, but a delete that reports
    // success against the wrong conversation would be a confusing thing to debug later.
    if (result?.conversation_id && String(result.conversation_id) !== conversationId) {
      return Response.json({ error: 'That photo is no longer available.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }

    const keys: string[] = Array.isArray(result?.storage_keys) ? result.storage_keys : [];
    let removed = 0;
    if (keys.length) {
      // Both objects in one call: the original and the -display copy from SRS-201.6.
      const { error } = await accountClient().storage.from(MEDIA_BUCKET).remove(keys).catch(() => ({ error: true }));
      // A failed removal is not reported to the student. The photo is already gone from the conversation for
      // everyone, and there is nothing they could do about a bucket they cannot see.
      if (!error) removed = keys.length;
      else console.error('Photo deleted but its stored objects remain', { messageId: message, keys });
    }

    return Response.json({ id: result?.id ?? message, removed, already_deleted: Boolean(result?.already_deleted) },
      { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
