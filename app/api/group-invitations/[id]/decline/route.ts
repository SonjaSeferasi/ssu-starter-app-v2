import { accountResponse, verifiedUser } from '../../../../../lib/socialu-account';
import { chatOperation, invitationIdParam } from '../../../../../lib/chat-access';
export const dynamic = 'force-dynamic';

// SRS-205.8 (#498): the invited student declines; they are never added to the group (SRS-205.9).
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const invitationId = invitationIdParam((await context.params).id);
    const result = await chatOperation('socialu_decline_group_invitation', { p_auth_id: user.id, p_invitation_id: invitationId });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
