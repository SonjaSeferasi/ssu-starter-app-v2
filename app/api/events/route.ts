import { AccountError, accountResponse, jsonBody, verifiedUser } from '../../../lib/socialu-account';
import { eventOperation } from '../../../lib/event-engagement';
import { trendingEvents, type CampusEvent } from '../../../lib/events';
import { withCoverUrls } from '../../../lib/event-covers';
export const dynamic = 'force-dynamic';

function validateEvent(body: Record<string, unknown>) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const location = typeof body.location === 'string' ? body.location.trim() : '';
  const date = typeof body.date === 'string' ? body.date.trim() : '';
  const time = typeof body.time === 'string' ? body.time.trim() : '';

  if (!title) return { error: 'title is required.' };
  if (!description) return { error: 'description is required.' };
  if (!location) return { error: 'location is required.' };
  if (!date) return { error: 'date is required.' };
  if (!time) return { error: 'time is required.' };

  // The browser sends its UTC offset (Date#getTimezoneOffset) so the event keeps the time the student picked,
  // whatever time zone the server runs in.
  const offset = body.timezoneOffset;
  const hasOffset = typeof offset === 'number' && Number.isInteger(offset) && Math.abs(offset) <= 14 * 60;
  const startsAt = new Date(`${date}T${time}:00${hasOffset ? 'Z' : ''}`);
  if (Number.isNaN(startsAt.getTime())) return { error: 'date and time must be valid.' };
  if (hasOffset) startsAt.setUTCMinutes(startsAt.getUTCMinutes() + offset);

  return { event: { title, description, location, starts_at: startsAt.toISOString() } };
}

// SRS-401.1-.6: list upcoming campus events for the signed-in student, plus trending events (UR-405).
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const events = await withCoverUrls(((await eventOperation('socialu_list_events', { p_auth_id: user.id })) ?? []) as CampusEvent[]);
    return Response.json({ events, trending: trendingEvents(events) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}

// SRS-400.6: the creator always comes from the verified token; any creator ID in the body is ignored.
export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request);
    const body = await jsonBody(request);
    const validation = validateEvent(body);
    if ('error' in validation) throw new AccountError(validation.error!, 400);

    const { title, description, location, starts_at } = validation.event;
    const event = await eventOperation('socialu_create_event', {
      p_auth_id: user.id, p_title: title, p_description: description, p_location: location, p_starts_at: starts_at,
    });
    return Response.json({ event }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
