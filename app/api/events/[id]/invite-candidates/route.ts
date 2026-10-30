import { accountResponse, verifiedUser } from '../../../../../lib/socialu-account';
import { eventIdParam, eventOperation } from '../../../../../lib/event-engagement';
export const dynamic = 'force-dynamic';

// SRS-402.1: registered students at the same university the creator can invite (friends or not), matching ?q=.
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const eventId = eventIdParam((await context.params).id);
    const query = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 100);
    const students = await eventOperation('socialu_event_invite_candidates', { p_auth_id: user.id, p_event_id: eventId, p_query: query });
    return Response.json({ students }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
