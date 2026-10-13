import { AccountError, accountResponse, jsonBody, verifiedUser } from '../../../../../lib/socialu-account';
import { chatOperation, conversationIdParam } from '../../../../../lib/chat-access';
export const dynamic = 'force-dynamic';

// SRS-201.1: a conversation participant sends a text message.
// The sender always comes from the verified token; any sender ID in the body is ignored.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const conversationId = conversationIdParam((await context.params).id);
    const body = await jsonBody(request);
    const text = typeof body.text === 'string' ? body.text : '';
    if (!text.trim() || text.length > 500) throw new AccountError('Messages must contain 1 to 500 characters.', 400);
    const message = await chatOperation('socialu_send_message', { p_auth_id: user.id, p_conversation_id: conversationId, p_text: text });
    return Response.json({ message }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
