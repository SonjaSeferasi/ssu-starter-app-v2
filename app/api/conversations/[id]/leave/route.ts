import { accountResponse, verifiedUser } from '../../../../../lib/socialu-account';
import { chatOperation, conversationIdParam } from '../../../../../lib/chat-access';
export const dynamic = 'force-dynamic';

// SRS-207.1 (#886): a regular group member leaves the group, ending their own current membership. An
// administrator who is not the owner leaves the same way (SRS-207.2). The owner is refused until the group has
// an administrator to take over (SRS-208.1).
// The student always comes from the verified token, so nobody can remove anyone else through this route.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const conversationId = conversationIdParam((await context.params).id);
    const result = await chatOperation('socialu_leave_group', { p_auth_id: user.id, p_conversation_id: conversationId });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
