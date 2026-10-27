import { accountResponse, verifiedUser } from '../../../../../lib/socialu-account';
import { chatOperation, invitationIdParam } from '../../../../../lib/chat-access';
export const dynamic = 'force-dynamic';

// SRS-205.6 (#494) and SRS-205.7 (#792): the invited student accepts and joins the group in the same step.
// Returns the joined group's ID and member count so the page can open it right away.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const invitationId = invitationIdParam((await context.params).id);
    const result = await chatOperation('socialu_accept_group_invitation', { p_auth_id: user.id, p_invitation_id: invitationId });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
