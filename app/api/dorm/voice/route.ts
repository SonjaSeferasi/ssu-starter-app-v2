import { AccountError, accountResponse, jsonBody, verifiedUser } from '../../../../lib/socialu-account';
import { uuid } from '../../../../lib/dormspace-multiplayer';
import { checkVoice, joinVoice, leaveVoice, voiceConfig } from '../../../../lib/dormspace-voice-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request);
    const body = await jsonBody(request);
    const { session_id: sessionId } = JSON.parse(Buffer.from(request.headers.get('Authorization')!.slice(7).trim().split('.')[1], 'base64url').toString('utf8'));
    if (!uuid(sessionId)) throw new AccountError('Please sign in again.', 401);
    const owner = { authId: user.id, sessionId };
    const config = voiceConfig();
    const headers = { 'Cache-Control': 'no-store' };
    if (body.action === 'join' && uuid(body.connectionId) && uuid(body.attempt)) {
      return Response.json(await joinVoice(config, owner, body.connectionId, body.attempt), { headers });
    }
    if (body.action === 'check') await checkVoice(config, owner, body.ticket);
    else if (body.action === 'leave') await leaveVoice(config, owner, body.ticket);
    else throw new AccountError('Choose a valid voice action.', 400);
    return new Response(null, { status: 204, headers });
  } catch (error) {
    return accountResponse(error);
  }
}
