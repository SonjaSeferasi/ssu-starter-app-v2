import { AccountError, accountResponse, jsonBody, verifiedUser } from '../../../../../../../lib/socialu-account';
import { chatOperation, conversationIdParam, messageIdParam } from '../../../../../../../lib/chat-access';
import { REACTION_REQUIRED, isReaction } from '../../../../../../../lib/chat-reactions';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string; messageId: string }> };

// SRS-210.3 (#808) / SRS-210.6: a conversation participant reacts to a message with { "emoji": "👍" }, one of the
// approved set. Reacting again with another emoji replaces the student's reaction. The student always comes from
// the verified token; the database checks the participant, the message and the emoji. Other body fields are ignored.
export async function PUT(request: Request, context: Context) {
  try {
    const user = await verifiedUser(request);
    const params = await context.params;
    const conversationId = conversationIdParam(params.id);
    const messageId = messageIdParam(params.messageId);
    const body = await jsonBody(request);
    if (!isReaction(body.emoji)) throw new AccountError(REACTION_REQUIRED, 400);
    const reaction = await chatOperation('socialu_react_to_message', { p_auth_id: user.id, p_conversation_id: conversationId, p_message_id: messageId, p_emoji: body.emoji });
    return Response.json(reaction, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}

// SRS-210.5 (#815): the student removes their own reaction from a message. Nobody else's reaction can be removed.
export async function DELETE(request: Request, context: Context) {
  try {
    const user = await verifiedUser(request);
    const params = await context.params;
    const conversationId = conversationIdParam(params.id);
    const messageId = messageIdParam(params.messageId);
    const reaction = await chatOperation('socialu_remove_reaction', { p_auth_id: user.id, p_conversation_id: conversationId, p_message_id: messageId });
    return Response.json(reaction, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
