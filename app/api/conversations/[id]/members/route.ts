import { AccountError, accountResponse, jsonBody, textField, verifiedUser } from '../../../../../lib/socialu-account';
import { MEMBER_NOT_AVAILABLE, chatOperation, conversationIdParam } from '../../../../../lib/chat-access';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

// SRS-204.1: the group's current members with their roles, so the owner can select one to make administrator.
// The student always comes from the verified token; the database runs the participant check.
export async function GET(request: Request, context: Context) {
  try {
    const user = await verifiedUser(request);
    const conversationId = conversationIdParam((await context.params).id);
    const members = await chatOperation('socialu_group_members', { p_auth_id: user.id, p_conversation_id: conversationId });
    return Response.json(members, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}

// SRS-204.2: the group's owner gives a selected current regular member the administrator role, with
// { "username": "...", "role": "administrator" }. The database checks the owner, the one-administrator rule and
// the chosen member. Other body fields are ignored.
export async function PATCH(request: Request, context: Context) {
  try {
    const user = await verifiedUser(request);
    const conversationId = conversationIdParam((await context.params).id);
    const body = await jsonBody(request);
    const username = textField(body.username);
    if (!username) throw new AccountError(MEMBER_NOT_AVAILABLE, 404);
    if (body.role !== 'administrator') throw new AccountError('Choose a role to give this member.', 400);
    const result = await chatOperation('socialu_assign_group_admin', { p_auth_id: user.id, p_conversation_id: conversationId, p_username: username });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
