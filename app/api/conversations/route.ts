import { AccountError, accountResponse, jsonBody, textField, verifiedUser } from '../../../lib/socialu-account';
import { chatOperation } from '../../../lib/chat-access';
export const dynamic = 'force-dynamic';

// SRS-202.1 (#457): the signed-in student's conversations (DMs and groups) for the Messages list.
// The student always comes from the verified token; the database decides which conversations are theirs.
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const list = await chatOperation('socialu_conversation_list', { p_auth_id: user.id });
    return Response.json(list, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}

// SRS-202.1 (#455): the signed-in student creates a group chat and becomes its first member and owner (SRS-203.1).
// Only { "kind": "group" } is accepted; owner or member IDs sent by the browser are ignored.
export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request);
    const body = await jsonBody(request);
    if (body.kind === undefined && textField(body.username)) {
      const conversationId = await chatOperation('socialu_open_private_conversation', { p_auth_id: user.id, p_username: textField(body.username) });
      return Response.json({ conversationId }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (body.kind !== 'group') throw new AccountError('Choose a valid conversation type.', 400);
    const conversation = await chatOperation('socialu_create_group', { p_auth_id: user.id });
    return Response.json({ conversation }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
