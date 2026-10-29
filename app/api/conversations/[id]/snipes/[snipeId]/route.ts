import { AccountError, jsonBody } from '../../../../../../lib/socialu-account';
import { conversationIdParam } from '../../../../../../lib/chat-access';
import { NO_STORE, snipeIdParam, snipeOperation, snipeResponse, snipeUser } from '../../../../../../lib/snipe';
export const dynamic = 'force-dynamic';

type ActionResult = { result: 'saved' | 'expired' | 'closed'; snipe: unknown };
const outcomes = {
  expired: 'This Snipe expired before your answer was saved.',
  closed: 'This Snipe is no longer open for that change.',
};

// SRS-511.2 to 511.13, 514.1 to 514.5, 514.15: a tagged friend's separate answers and withdrawal,
// or the photographer's removal. The acting student comes from the token; no other IDs are accepted.
export async function PATCH(request: Request, context: { params: Promise<{ id: string; snipeId: string }> }) {
  try {
    const user = await snipeUser(request);
    const params = await context.params;
    const conversationId = conversationIdParam(params.id);
    const snipeId = snipeIdParam(params.snipeId);
    const body = await jsonBody(request);
    const action = body.action;
    if (action !== 'respond' && action !== 'withdraw' && action !== 'remove') throw new AccountError('Choose a Snipe action.', 400);
    const payload: Record<string, boolean> = {};
    if (action === 'respond') {
      for (const question of ['identity', 'sharing'] as const) {
        if (body[question] === undefined) continue;
        if (typeof body[question] !== 'boolean') throw new AccountError('Answer Yes or No.', 400);
        payload[question] = body[question];
      }
      if (Object.keys(payload).length === 0) throw new AccountError('Answer Yes or No.', 400);
    }
    const outcome = await snipeOperation<ActionResult>(user.id, action, conversationId, snipeId, payload);
    if (outcome.result !== 'saved') {
      return Response.json({ error: outcomes[outcome.result], code: 'SNIPE_CLOSED', snipe: outcome.snipe }, { status: 409, headers: NO_STORE });
    }
    return Response.json({ snipe: outcome.snipe }, { headers: NO_STORE });
  } catch (error) { return snipeResponse(error); }
}
