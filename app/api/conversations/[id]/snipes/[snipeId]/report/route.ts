import { AccountError, jsonBody } from '../../../../../../../lib/socialu-account';
import { conversationIdParam } from '../../../../../../../lib/chat-access';
import { NO_STORE, SNIPE_REPORT_REASON_MAX, snipeIdParam, snipeReport, snipeResponse, snipeUser } from '../../../../../../../lib/snipe';
export const dynamic = 'force-dynamic';

// SRS-514.8, 514.9, 514.11, 514.14: a current group member reports a published Snipe and gets a receipt
// once the report is stored. Only `reason` is read from the body; the reporter comes from the token, and
// no report status or administrator decision is accepted. The database rechecks everything.
export async function POST(request: Request, context: { params: Promise<{ id: string; snipeId: string }> }) {
  try {
    const user = await snipeUser(request);
    const params = await context.params;
    const conversationId = conversationIdParam(params.id);
    const snipeId = snipeIdParam(params.snipeId);
    const body = await jsonBody(request);
    if (typeof body.reason !== 'string') throw new AccountError('Enter a reason for your report.', 400, 'SNIPE_REPORT_INVALID');
    const reason = body.reason.trim();
    if (!reason) throw new AccountError('Enter a reason for your report.', 400, 'SNIPE_REPORT_INVALID');
    // Counted in characters (code points), as the database counts them.
    if ([...reason].length > SNIPE_REPORT_REASON_MAX) throw new AccountError(`Keep your reason to ${SNIPE_REPORT_REASON_MAX} characters or fewer.`, 400, 'SNIPE_REPORT_INVALID');

    const outcome = await snipeReport(user.id, conversationId, snipeId, reason);
    if (outcome.result === 'conflict') {
      // The first reason is kept unchanged; the reporter sees the receipt for the report already on file.
      return Response.json({ error: 'You already reported this Snipe with a different reason. Your first report is kept and is waiting for review.',
        code: 'SNIPE_ALREADY_REPORTED', report: outcome.report, snipe: outcome.snipe }, { status: 409, headers: NO_STORE });
    }
    return Response.json({ created: outcome.result === 'created', report: outcome.report, snipe: outcome.snipe },
      { status: outcome.result === 'created' ? 201 : 200, headers: NO_STORE });
  } catch (error) { return snipeResponse(error); }
}
