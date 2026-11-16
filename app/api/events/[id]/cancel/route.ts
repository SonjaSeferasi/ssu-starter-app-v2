import { AccountError, accountResponse, jsonBody, verifiedUser } from '../../../../../lib/socialu-account';
import { eventIdParam, eventOperation } from '../../../../../lib/event-engagement';
export const dynamic = 'force-dynamic';

const NOTE_TOO_LONG = 'The cancellation note must be 300 characters or fewer.';

// UR-404: the event's creator cancels an upcoming event, with an optional note for invited students.
// The creator always comes from the verified token; the database refuses anyone else.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const eventId = eventIdParam((await context.params).id);
    const body = await jsonBody(request);
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    if (note.length > 300) throw new AccountError(NOTE_TOO_LONG, 400);
    const event = await eventOperation('socialu_event_cancel', { p_auth_id: user.id, p_event_id: eventId, p_note: note || null }, NOTE_TOO_LONG);
    return Response.json({ event }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
