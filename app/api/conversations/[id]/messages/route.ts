import { AccountError, accountResponse, jsonBody, verifiedUser } from '../../../../../lib/socialu-account';
import { chatOperation, conversationIdParam, messageIdParam } from '../../../../../lib/chat-access';
import { EMOJI_REQUIRED, isSingleEmoji } from '../../../../../lib/chat-emoji';
import { withPhotoUrls } from '../../../../../lib/chat-photo-urls';
export const dynamic = 'force-dynamic';

// SRS-201.2 (#317): a conversation participant retrieves the saved text messages, oldest first.
// SRS-201.9 (#799): emoji messages are included too, marked with kind 'emoji'.
// SRS-201.7 (#1028, #1029): photo messages too. The database returns the storage key of each one, because the
// bucket is private and only the server can sign a link to it; withPhotoUrls turns those keys into signed
// links so the browser never handles a key. The reply is already no-store, so a link cannot outlive its hour
// in a cache.
// The student always comes from the verified token; the database runs the participant check.
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const conversationId = conversationIdParam((await context.params).id);
    const history = await chatOperation('socialu_conversation_messages', { p_auth_id: user.id, p_conversation_id: conversationId });
    return Response.json(await withPhotoUrls(history), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}

// SRS-201.1: a conversation participant sends a text message.
// SRS-201.8 (#796): or one emoji, sent as {"kind":"emoji","emoji":"😀"}; text messages are unchanged.
// SRS-209.3 (#991): a text message may answer another, sent as {"text":"...","replyTo":"<message id>"}.
// The database checks that the target is a readable message of this same group conversation.
// The sender always comes from the verified token; any sender ID in the body is ignored.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const conversationId = conversationIdParam((await context.params).id);
    const body = await jsonBody(request);
    if (body.kind === 'emoji') {
      if (!isSingleEmoji(body.emoji)) throw new AccountError(EMOJI_REQUIRED, 400);
      const message = await chatOperation('socialu_send_emoji', { p_auth_id: user.id, p_conversation_id: conversationId, p_emoji: body.emoji });
      return Response.json({ message }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    }
    const text = typeof body.text === 'string' ? body.text : '';
    if (!text.trim() || text.length > 500) throw new AccountError('Messages must contain 1 to 500 characters.', 400);
    // An absent replyTo sends an ordinary message; a malformed one is refused here rather than reaching the
    // database, so a bad id cannot look like a missing message. The parameter is left out entirely when there
    // is no target, which is what p_reply_to_id's default is for.
    const replyTo = body.replyTo === undefined || body.replyTo === null ? null : messageIdParam(String(body.replyTo));
    const message = await chatOperation('socialu_send_message',
      { p_auth_id: user.id, p_conversation_id: conversationId, p_text: text, ...(replyTo ? { p_reply_to_id: replyTo } : {}) });
    return Response.json({ message }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
