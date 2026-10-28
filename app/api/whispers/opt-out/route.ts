import { accountResponse, jsonBody, verifiedUser } from '../../../../lib/socialu-account';
import { feedRpc } from '../../../../lib/feed';

// The Whisper Wall -- read/toggle "don't let others mention me in Campus
// Crush." Enforcement of the opt-out itself (both in the suggestion list
// and server-side on raw text, so it can't be bypassed by typing a handle
// manually) lives in socialu.sync_whisper_mentions and
// socialu_whisper_mention_candidates, not here -- this route only reads or
// flips the flag.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const result = await feedRpc<{ campus_crush_opt_out: boolean }>('socialu_whisper_set_opt_out', { p_auth_id: user.id });
    return Response.json({ optOut: result.campus_crush_opt_out }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return accountResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request);
    const body = await jsonBody(request);
    const result = await feedRpc<{ campus_crush_opt_out: boolean }>('socialu_whisper_set_opt_out', {
      p_auth_id: user.id, p_opt_out: body.optOut === true,
    });
    return Response.json({ optOut: result.campus_crush_opt_out }, { status: 200 });
  } catch (error) {
    return accountResponse(error);
  }
}
