import { AccountError, accountResponse, jsonBody } from '../../../lib/socialu-account';
import { gameRoomOperation } from '../../../lib/game-room-server';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try { return Response.json(await gameRoomOperation(request, 'read_preferences'), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return accountResponse(error); }
}
export async function PUT(request: Request) {
  try {
    const body = await jsonBody(request);
    if (body.position !== 'side' && body.position !== 'bottom') throw new AccountError('Choose Side or Bottom.', 400);
    return Response.json(await gameRoomOperation(request, 'save_preferences', { p_position: body.position }),
      { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
