import { AccountError, accountResponse, jsonBody, textField, verifiedUser } from '../../../lib/socialu-account';
import { chatOperation } from '../../../lib/chat-access';

export const dynamic = 'force-dynamic';

// SRS-113.17: the Message button on a friend's profile opens (or starts) your private conversation.
export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request);
    const username = textField((await jsonBody(request)).username);
    if (!username) throw new AccountError('Choose a student to message.', 400);
    const conversationId = await chatOperation('socialu_open_private_conversation', { p_auth_id: user.id, p_username: username });
    return Response.json({ conversationId }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
