import { AccountError, accountResponse, jsonBody, verifiedUser } from '../../../../../lib/socialu-account';
import { eventIdParam, eventOperation } from '../../../../../lib/event-engagement';
export const dynamic = 'force-dynamic';

const CHOOSE = 'Choose accept or decline.';

// UR-403: the invited student answers their invitation. Accepting records the RSVP 'attending'
// (they plan to attend); declining records 'not_attending'. The student always comes from the verified token.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const eventId = eventIdParam((await context.params).id);
    const body = await jsonBody(request);
    if (body.response !== 'attending' && body.response !== 'not_attending') throw new AccountError(CHOOSE, 400);
    const invitation = await eventOperation('socialu_event_rsvp', { p_auth_id: user.id, p_event_id: eventId, p_response: body.response }, CHOOSE);
    return Response.json({ invitation }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
