import { AccountError, accountResponse, jsonBody, textField, verifiedUser } from '../../../../../lib/socialu-account';
import { feedRpc } from '../../../../../lib/feed';

// The Whisper Wall -- report a confession. Self-report blocking, the
// duplicate-reporter no-op, severity-tiered auto-removal (2 distinct
// harassment/threats/private_info reports, or 5 of any reason), and
// reporter-identity privacy (reporter_id is never returned) all live in
// socialu_whisper_report_confession.
export async function POST(request: Request, { params }: { params: Promise<{ confessionId: string }> }) {
  try {
    const user = await verifiedUser(request);
    const { confessionId: confessionIdParam } = await params;
    const confessionId = Number(confessionIdParam);
    if (!Number.isInteger(confessionId)) throw new AccountError('Invalid confession id.', 400);

    const body = await jsonBody(request);
    const result = await feedRpc<{ reported: boolean; confession_removed: boolean }>('socialu_whisper_report_confession', {
      p_auth_id: user.id, p_confession_id: confessionId, p_reason: textField(body.reason),
    });
    return Response.json({ reported: result.reported, confessionRemoved: result.confession_removed }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}
