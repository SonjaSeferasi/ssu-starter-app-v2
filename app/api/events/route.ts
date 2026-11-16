import { AccountError, accountResponse, jsonBody, verifiedUser } from '../../../lib/socialu-account';
import { eventOperation } from '../../../lib/event-engagement';
import type { CampusEvent } from '../../../lib/events';
import { withCoverUrls } from '../../../lib/event-covers';
import { validateEvent } from '../../../lib/event-input';
export const dynamic = 'force-dynamic';

// SRS-401.1-.6: list upcoming campus events for the signed-in student. Trending is Campus Feed posts
// (SRS-405, GET /api/posts/trending), so events are no longer ranked here (#1189, #1190).
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const events = await withCoverUrls(((await eventOperation('socialu_list_events', { p_auth_id: user.id })) ?? []) as CampusEvent[]);
    return Response.json({ events }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}

// SRS-400.6: the creator always comes from the verified token; any creator ID in the body is ignored.
export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request);
    const body = await jsonBody(request);
    const validation = validateEvent(body);
    if ('error' in validation) throw new AccountError(validation.error!, 400);

    const { title, description, location, starts_at, dress_code } = validation.event;
    const event = await eventOperation('socialu_create_event', {
      p_auth_id: user.id, p_title: title, p_description: description, p_location: location, p_starts_at: starts_at,
      // Only sent when given, so creating events keeps working before 20261027125000_event_dress_code.sql is applied.
      ...(dress_code ? { p_dress_code: dress_code } : {}),
    });
    return Response.json({ event }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
