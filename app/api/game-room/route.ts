import { accountResponse, AccountError, jsonBody } from '../../../lib/socialu-account';
import { gameRoomOperation } from '../../../lib/game-room-server';
import { validAppearance } from '../../../lib/game-room';
import { layeredKeys } from '../../../lib/avatar-layers';

export const dynamic = 'force-dynamic';
// Avatar reads must see the latest saved pieces, including the upstream account RPC.
export const fetchCache = 'force-no-store';
export async function GET(request: Request) {
  try {
    return Response.json(await gameRoomOperation(request, 'read_customized'), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
export async function PUT(request: Request) {
  try {
    const body = await jsonBody(request);
    if (!validAppearance(body)) throw new AccountError('Choose a valid face and outfit.', 400);
    const layered = Object.fromEntries(layeredKeys.filter(key => body[key] !== undefined).map(key => [key, body[key]]));
    const hasDetails = body.avatarId !== undefined || body.faceStyle !== undefined || body.shirtColor !== undefined || body.pantsColor !== undefined || Object.keys(layered).length > 0;
    const args = hasDetails ? { p_appearance: {
      outfitId: body.outfitId, faceId: body.faceId,
      faceStyle: body.faceStyle || 'natural', shirtColor: body.shirtColor || 'navy', pantsColor: body.pantsColor || 'denim',
      ...layered,
      ...(body.avatarId ? { avatarId: body.avatarId } : {}),
    } } : { p_outfit_id: body.outfitId, p_face_id: body.faceId };
    return Response.json(await gameRoomOperation(request, hasDetails ? 'save_customized' : 'save_avatar', args),
      { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
