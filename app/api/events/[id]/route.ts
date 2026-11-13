import { AccountError, accountResponse, jsonBody, verifiedUser } from '../../../../lib/socialu-account';
import { eventIdParam, eventOperation } from '../../../../lib/event-engagement';
import { withCoverUrls } from '../../../../lib/event-covers';
import { validateEvent } from '../../../../lib/event-input';
export const dynamic = 'force-dynamic';

// One event with its likes, comments and everyone who is going.
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const eventId = eventIdParam((await context.params).id);
    const [event] = await withCoverUrls([await eventOperation('socialu_event_detail', { p_auth_id: user.id, p_event_id: eventId })]);
    return Response.json({ event }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}

// SRS-404.1-404.6: the event's creator saves new details (title, description, location, date, time, dress code).
// The creator always comes from the verified token; the database refuses anyone else.
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const eventId = eventIdParam((await context.params).id);
    const validation = validateEvent(await jsonBody(request));
    if ('error' in validation) throw new AccountError(validation.error!, 400);
    if (Date.parse(validation.event.starts_at) <= Date.now()) throw new AccountError('Choose a date and time in the future.', 400);

    const { title, description, location, starts_at, dress_code } = validation.event;
    const event = await eventOperation('socialu_event_update', {
      p_auth_id: user.id, p_event_id: eventId, p_title: title, p_description: description,
      p_location: location, p_starts_at: starts_at, p_dress_code: dress_code,
    });
    return Response.json({ event }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
