import { accountResponse, AccountError, jsonBody } from '../../../lib/socialu-account';
import { gameRoomOperation } from '../../../lib/game-room-server';
import { validAppearance } from '../../../lib/game-room';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    return Response.json(await gameRoomOperation(request, 'read'), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
export async function PUT(request: Request) {
  try {
    const body = await jsonBody(request);
    if (!validAppearance(body)) throw new AccountError('Choose a valid face and outfit.', 400);
    return Response.json(await gameRoomOperation(request, 'save_avatar', { p_outfit_id: body.outfitId, p_face_id: body.faceId }),
      { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
