import { accountResponse, verifiedUser } from '../../../../lib/socialu-account';
import { eventOperation } from '../../../../lib/event-engagement';
export const dynamic = 'force-dynamic';

// SRS-402.4: the signed-in student's event invitations.
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const invitations = await eventOperation('socialu_my_event_invitations', { p_auth_id: user.id });
    return Response.json({ invitations }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
