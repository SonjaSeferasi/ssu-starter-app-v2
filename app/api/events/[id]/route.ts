import { accountResponse, verifiedUser } from '../../../../lib/socialu-account';
import { eventIdParam, eventOperation } from '../../../../lib/event-engagement';
export const dynamic = 'force-dynamic';

// One event with its likes, comments and everyone who is going.
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const eventId = eventIdParam((await context.params).id);
    const event = await eventOperation('socialu_event_detail', { p_auth_id: user.id, p_event_id: eventId });
    return Response.json({ event }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
