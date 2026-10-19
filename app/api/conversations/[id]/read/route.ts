import { accountResponse, verifiedUser } from '../../../../../lib/socialu-account';
import { chatOperation, conversationIdParam } from '../../../../../lib/chat-access';
export const dynamic = 'force-dynamic';

// SRS-212.5: a participant marks the messages already in a conversation as read (also used for messages that
// arrive while the conversation is open). The student always comes from the verified token.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const conversationId = conversationIdParam((await context.params).id);
    const result = await chatOperation('socialu_mark_conversation_read', { p_auth_id: user.id, p_conversation_id: conversationId });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
