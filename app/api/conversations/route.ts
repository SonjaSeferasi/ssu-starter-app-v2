import { accountResponse, verifiedUser } from '../../../lib/socialu-account';
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
