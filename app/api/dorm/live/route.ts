import { AccountError, accountClient, accountResponse, jsonBody, verifiedUser } from '../../../../lib/socialu-account';
import { CHAT_LIMIT, uuid, validLiveState } from '../../../../lib/dormspace-multiplayer';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request);
    const body = await jsonBody(request);
    if (!uuid(body.connectionId) || !['join','update','sync','say','leave'].includes(body.action as string))
      throw new AccountError('Choose a valid multiplayer action.', 400);
    const action = body.action as string, location = body.location as Record<string, unknown> | undefined;
    if (action === 'join' && (!location || !(location.kind === 'hall' && Number.isInteger(location.floor) && Number(location.floor) >= 1 && Number(location.floor) <= 999
      || location.kind === 'room' && typeof location.owner === 'string' && location.owner.length > 0 && location.owner.length <= 100)))
      throw new AccountError('Choose a hall floor or dorm.', 400);
    if (['join','update'].includes(action) && !validLiveState(body.state)) throw new AccountError('Enter a valid player position.', 400);
    if (action === 'update' && (!Number.isSafeInteger(body.sequence) || Number(body.sequence) < 1 || Number(body.sequence) > 999999999999999))
      throw new AccountError('Enter a valid movement sequence.', 400);
    if (action === 'say' && (!uuid(body.messageId) || typeof body.text !== 'string' || !body.text.trim() || [...body.text].length > CHAT_LIMIT))
      throw new AccountError('Write a message of 1 to 200 characters.', 400);
    // This token has already been verified above, including its session revocation check.
    const token = request.headers.get('Authorization')!.slice(7).trim();
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    const { data, error } = await accountClient().rpc('socialu_dormspace_live', {
      p_auth_id: user.id, p_session: claims.session_id, p_connection: body.connectionId, p_action: action,
      p_location: action === 'join' ? location : {},
      p_data: action === 'say' ? { text: body.text, messageId: body.messageId }
        : ['join','update'].includes(action) ? { state: body.state, sequence: body.sequence ?? 0, snapshot: body.snapshot === true } : {},
    });
    if (error) {
      const statuses: Record<string, number> = { '42501': 403, '22023': 400, DS400: 400, DS408:409, DS409: 409, DS410: 409, DS429: 429 };
      if (statuses[error.code]) throw new AccountError(error.message, statuses[error.code], error.code);
      throw new AccountError('Multiplayer is temporarily unavailable. You can still explore your dorm.', 503, 'DORMSPACE_LIVE_UNAVAILABLE');
    }
    return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
