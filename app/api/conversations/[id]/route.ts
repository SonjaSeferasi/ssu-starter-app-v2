import { AccountError, accountResponse, jsonBody, verifiedUser } from '../../../../lib/socialu-account';
import { GROUP_NAME_LENGTH, chatOperation, conversationIdParam } from '../../../../lib/chat-access';
export const dynamic = 'force-dynamic';

// SRS-202.5 (#835): the group's owner or administrator sets or changes the group's name with { "name": "..." }.
// The student always comes from the verified token; the database checks the role. Other body fields are ignored.
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const conversationId = conversationIdParam((await context.params).id);
    const body = await jsonBody(request);
    // Runs of spaces become one space, as the database stores it.
    const name = typeof body.name === 'string' ? body.name.replace(/\s+/g, ' ').trim() : '';
    if (!name || [...name].length > 50) throw new AccountError(GROUP_NAME_LENGTH, 400);
    const conversation = await chatOperation('socialu_rename_group', { p_auth_id: user.id, p_conversation_id: conversationId, p_name: name });
    return Response.json({ conversation }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
