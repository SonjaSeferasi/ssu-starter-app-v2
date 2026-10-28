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
// { "username": "...", "role": "administrator" }.
// SRS-204.6: the same owner takes it back with { "username": "...", "role": "member" }, returning that student to
// regular-member status. The database checks the owner, the one-administrator rule and the chosen member in both
// cases. Other body fields are ignored.
// SRS-205.10: the group's owner or administrator removes a regular member, with the member's username in the
// query string. The database checks the manager's role and that the student is a current regular member.
export async function DELETE(request: Request, context: Context) {
  try {
    const user = await verifiedUser(request);
    const conversationId = conversationIdParam((await context.params).id);
    const username = textField(new URL(request.url).searchParams.get('username'));
    if (!username) throw new AccountError(MEMBER_NOT_AVAILABLE, 404);
    const result = await chatOperation('socialu_remove_group_member', { p_auth_id: user.id, p_conversation_id: conversationId, p_username: username });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await verifiedUser(request);
    const conversationId = conversationIdParam((await context.params).id);
    const body = await jsonBody(request);
    const username = textField(body.username);
    if (!username) throw new AccountError(MEMBER_NOT_AVAILABLE, 404);
    if (body.role !== 'administrator' && body.role !== 'member') throw new AccountError('Choose a role for this member.', 400);
    const operation = body.role === 'administrator' ? 'socialu_assign_group_admin' : 'socialu_revoke_group_admin';
    const result = await chatOperation(operation, { p_auth_id: user.id, p_conversation_id: conversationId, p_username: username });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
