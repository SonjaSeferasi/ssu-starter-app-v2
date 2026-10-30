import { AccountError, accountResponse, jsonBody, verifiedUser } from '../../../../../lib/socialu-account';
import { eventIdParam, eventOperation } from '../../../../../lib/event-engagement';
export const dynamic = 'force-dynamic';

const SELECT_STUDENTS = 'Select 1 to 50 students to invite.';

// SRS-402.5: the event's creator sees every invited student and their response.
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const eventId = eventIdParam((await context.params).id);
    const invitations = await eventOperation('socialu_event_invitations', { p_auth_id: user.id, p_event_id: eventId });
    return Response.json({ invitations }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}

// SRS-402.2/402.3: send an invitation to every selected student. Students who are already invited are
// never invited twice; they come back in `already_invited`. The creator always comes from the verified token.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const eventId = eventIdParam((await context.params).id);
    const body = await jsonBody(request);
    const ids = body.studentIds;
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 50 || !ids.every((id) => typeof id === 'string' && /^[1-9]\d{0,17}$/.test(id))) {
      throw new AccountError(SELECT_STUDENTS, 400);
    }
    const result = await eventOperation('socialu_event_invite', { p_auth_id: user.id, p_event_id: eventId, p_student_ids: ids }, SELECT_STUDENTS);
    return Response.json(result, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
