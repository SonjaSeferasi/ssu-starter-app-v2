import { AccountError, accountResponse, jsonBody, verifiedUser } from '../../../../../lib/socialu-account';
import { eventIdParam, eventOperation } from '../../../../../lib/event-engagement';
export const dynamic = 'force-dynamic';

const COMMENT_LENGTH = 'Comments must contain 1 to 500 characters.';

// Comment on an event; the author always comes from the verified token.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifiedUser(request);
    const eventId = eventIdParam((await context.params).id);
    const body = await jsonBody(request);
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text || text.length > 500) throw new AccountError(COMMENT_LENGTH, 400);
    const comment = await eventOperation('socialu_event_comment', { p_auth_id: user.id, p_event_id: eventId, p_text: text }, COMMENT_LENGTH);
    return Response.json({ comment }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
