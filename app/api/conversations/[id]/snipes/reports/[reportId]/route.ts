import { AccountError, jsonBody } from '../../../../../../../lib/socialu-account';
import { conversationIdParam } from '../../../../../../../lib/chat-access';
import { NO_STORE, SNIPE_DECISIONS, SNIPE_REPORT_NOT_AVAILABLE, type SnipeDecision, snipeModeration, snipeResponse, snipeUser } from '../../../../../../../lib/snipe';
export const dynamic = 'force-dynamic';

type Resolution = { result: 'saved' | 'existing' | 'conflict'; report: unknown; snipe: unknown };

// SRS-514.12, 514.13, 514.15: a current group owner or administrator resolves one report as Dismissed or
// Removed. Only `decision` is read from the body; the resolver and their role come from the token and the
// database. Repeating the same decision returns the stored result; a different one is refused.
export async function PATCH(request: Request, context: { params: Promise<{ id: string; reportId: string }> }) {
  try {
    const user = await snipeUser(request);
    const params = await context.params;
    const conversationId = conversationIdParam(params.id);
    if (!/^[1-9]\d{0,17}$/.test(params.reportId)) throw new AccountError(SNIPE_REPORT_NOT_AVAILABLE, 404);
    const body = await jsonBody(request);
    if (!SNIPE_DECISIONS.includes(body.decision as SnipeDecision)) throw new AccountError('Choose Dismiss or Remove.', 400, 'SNIPE_DECISION_INVALID');
    const decision = body.decision as SnipeDecision;

    const outcome = await snipeModeration<Resolution>(user.id, 'resolve', conversationId, params.reportId, { decision });
    if (outcome.result === 'conflict') {
      return Response.json({ error: 'This report was already resolved with a different decision, which is kept.',
        code: 'SNIPE_REPORT_ALREADY_RESOLVED', report: outcome.report, snipe: outcome.snipe }, { status: 409, headers: NO_STORE });
    }
    return Response.json({ changed: outcome.result === 'saved', report: outcome.report, snipe: outcome.snipe }, { headers: NO_STORE });
  } catch (error) { return snipeResponse(error); }
}
