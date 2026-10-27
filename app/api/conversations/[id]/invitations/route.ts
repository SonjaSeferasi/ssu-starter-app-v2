import { AccountError, accountResponse, jsonBody, textField, verifiedUser } from '../../../../../lib/socialu-account';
import { chatOperation, conversationIdParam } from '../../../../../lib/chat-access';
export const dynamic = 'force-dynamic';

// SRS-205.1 (#482): the group's owner or administrator loads the current friends they can invite, with an
// optional name search. The student always comes from the verified token; the database checks the role.
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const conversationId = conversationIdParam((await context.params).id);
    const query = (new URL(request.url).searchParams.get('q') ?? '').trim();
    if (query.length > 100) throw new AccountError('Search must be 100 characters or fewer.', 400);
    const result = await chatOperation('socialu_group_invite_friends', { p_auth_id: user.id, p_conversation_id: conversationId, p_query: query });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}

// SRS-205.3 (#486): send a group invitation to one current friend, chosen by username.
// Only { "username": "..." } is read; inviter, invitee and status values sent by the browser are ignored.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const conversationId = conversationIdParam((await context.params).id);
    const username = textField((await jsonBody(request)).username);
    if (!username || username.length > 100) throw new AccountError('Choose a friend to invite.', 400);
    const result = await chatOperation('socialu_send_group_invitation', { p_auth_id: user.id, p_conversation_id: conversationId, p_username: username });
    // 201 when a new invitation was saved; 200 when the friend already had one waiting.
    return Response.json(result, { status: result?.created ? 201 : 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
