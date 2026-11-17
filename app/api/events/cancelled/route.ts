import { accountResponse, verifiedUser } from '../../../../lib/socialu-account';
import { eventOperation } from '../../../../lib/event-engagement';
import { withCoverUrls } from '../../../../lib/event-covers';
import type { CampusEvent } from '../../../../lib/events';
export const dynamic = 'force-dynamic';

// UR-404: the cancelled events the signed-in student created, was invited to or was going to, newest first.
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const events = await withCoverUrls(((await eventOperation('socialu_cancelled_events', { p_auth_id: user.id })) ?? []) as CampusEvent[]);
    return Response.json({ events }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
