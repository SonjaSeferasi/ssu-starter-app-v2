import { AccountError, accountClient, accountResponse, jsonBody, verifiedUser } from '../../../lib/socialu-account';
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

  const startsAt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(startsAt.getTime())) return { error: 'date and time must be valid.' };

  return { event: { title, description, location, starts_at: startsAt.toISOString() } };
}

// SRS-400.6: the creator always comes from the verified token; any creator ID in the body is ignored.
// Events live in the socialu schema, which is outside the Data API, so the insert goes through a server-only function.
export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request);
    const body = await jsonBody(request);
    const validation = validateEvent(body);
    if ('error' in validation) throw new AccountError(validation.error!, 400);

    const { title, description, location, starts_at } = validation.event;
    const { data, error } = await accountClient().rpc('socialu_create_event', {
      p_auth_id: user.id, p_title: title, p_description: description, p_location: location, p_starts_at: starts_at,
    });
    if (error) {
      if (!error.code && /fetch failed/i.test(error.message)) throw new AccountError('The server cannot reach Supabase. Check the server network connection and try again.', 503);
      if (error.code === '42501') throw new AccountError('A verified, active university account is required. Finish setting up your profile, then try again.', 403);
      if (error.code === '22023') throw new AccountError('Title, description, location, date, and time are required.', 400);
      throw new AccountError('Events are unavailable. Check that the event migration has been applied.', 503);
    }
    return Response.json({ event: data }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
