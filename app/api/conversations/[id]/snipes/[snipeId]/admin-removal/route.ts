import { conversationIdParam } from '../../../../../../../lib/chat-access';
import { NO_STORE, snipeIdParam, snipeModeration, snipeResponse, snipeUser } from '../../../../../../../lib/snipe';
export const dynamic = 'force-dynamic';

// SRS-514.1, 514.5 to 514.7, 514.15, 524.4: a current group owner or administrator removes a published Snipe
// they can see. No body is read; the actor and role come from the token and the database. A repeat returns the
// existing Removed state, and points already awarded are kept.
export async function POST(request: Request, context: { params: Promise<{ id: string; snipeId: string }> }) {
  try {
    const user = await snipeUser(request);
    const params = await context.params;
    const conversationId = conversationIdParam(params.id);
    const snipeId = snipeIdParam(params.snipeId);
    const outcome = await snipeModeration<{ result: 'saved' | 'closed'; snipe: unknown }>(user.id, 'remove', conversationId, snipeId);
    if (outcome.result !== 'saved') {
      return Response.json({ error: 'This Snipe is no longer open for that change.', code: 'SNIPE_CLOSED', snipe: outcome.snipe }, { status: 409, headers: NO_STORE });
    }
    return Response.json({ snipe: outcome.snipe }, { headers: NO_STORE });
  } catch (error) { return snipeResponse(error); }
}
