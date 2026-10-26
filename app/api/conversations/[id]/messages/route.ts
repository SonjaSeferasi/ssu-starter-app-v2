import { AccountError, accountResponse, jsonBody, verifiedUser } from '../../../../../lib/socialu-account';
import { chatOperation, conversationIdParam } from '../../../../../lib/chat-access';
import { EMOJI_REQUIRED, isSingleEmoji } from '../../../../../lib/chat-emoji';
export const dynamic = 'force-dynamic';

// SRS-201.2 (#317): a conversation participant retrieves the saved text messages, oldest first.
// SRS-201.9 (#799): emoji messages are included too, marked with kind 'emoji'.
// The student always comes from the verified token; the database runs the participant check.
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const conversationId = conversationIdParam((await context.params).id);
    const history = await chatOperation('socialu_conversation_messages', { p_auth_id: user.id, p_conversation_id: conversationId });
    return Response.json(history, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}

// SRS-201.1: a conversation participant sends a text message.
// SRS-201.8 (#796): or one emoji, sent as {"kind":"emoji","emoji":"😀"}; text messages are unchanged.
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
    const message = await chatOperation('socialu_send_message', { p_auth_id: user.id, p_conversation_id: conversationId, p_text: text });
    return Response.json({ message }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
