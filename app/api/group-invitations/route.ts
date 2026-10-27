import { accountResponse, verifiedUser } from '../../../lib/socialu-account';
import { chatOperation } from '../../../lib/chat-access';
export const dynamic = 'force-dynamic';

// SRS-205.5 (#490): the signed-in student's pending group invitations, waiting for their answer.
// The student always comes from the verified token, so nobody can read another student's invitations.
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const result = await chatOperation('socialu_pending_group_invitations', { p_auth_id: user.id });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
