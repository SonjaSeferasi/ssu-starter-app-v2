import { AccountError, accountResponse, jsonBody, verifiedUser } from '../../../lib/socialu-account';
import { dormOperation, ownerParam } from '../../../lib/dormspace';
import { gameParticipation } from '../../../lib/game-participation-server';
import { isRotation } from '../../../lib/dormspace-rules';

export const dynamic = 'force-dynamic';
const noStore = { headers: { 'Cache-Control': 'no-store' } };

// GET ?view=hall -> DormHall doors; ?check=<username> -> current visit access; ?owner=<username> -> enter a dorm.
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const params = new URL(request.url).searchParams;
    if (params.get('view') === 'hall') return Response.json(await dormOperation(user.id, 'hall'), noStore);
    const check = ownerParam(params.get('check'));
    if (check) return Response.json(await dormOperation(user.id, 'access', check), noStore);
    const dorm = await dormOperation(user.id, 'open', ownerParam(params.get('owner')));
    const zone = request.headers.get('x-socialu-participation-zone');
    if (zone && zone.length <= 100) {
      try {
        await gameParticipation(user.id, 'dormspace', zone);
        return Response.json(dorm, { headers: { ...noStore.headers, 'X-SocialU-Participation-Recorded': '1' } });
      } catch {
        // Streak storage can be unavailable while the room itself is available.
        console.warn('DormSpace participation could not be recorded.');
      }
    }
    return Response.json(dorm, noStore);
  } catch (error) { return accountResponse(error); }
}

// PUT saves the owner's complete arrangement and appearance against the version it was based on.
export async function PUT(request: Request) {
  try {
    const user = await verifiedUser(request);
    const body = await jsonBody(request);
    if (!Number.isInteger(body.version) || !Array.isArray(body.placements)) throw new AccountError('Enter a valid dorm arrangement.', 400);
    const placements = body.placements.map((placement: unknown) => {
      const p = placement as Record<string, unknown>;
      if (!p || typeof p.itemId !== 'string' || !Number.isInteger(p.x) || !Number.isInteger(p.y)) throw new AccountError('Enter a valid dorm arrangement.', 400);
      const rotation = p.rotation === undefined ? 0 : p.rotation;
      if (!isRotation(rotation)) throw new AccountError('Choose a rotation of 0, 90, 180 or 270 degrees.', 400);
      return { itemId: p.itemId, x: p.x, y: p.y, rotation };
    });
    const appearance: Record<string, string | null> = {};
    for (const field of ['wallItemId', 'floorItemId'] as const) {
      if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
      if (body[field] !== null && typeof body[field] !== 'string') throw new AccountError('Choose a valid wall color and floor style.', 400);
      appearance[field] = body[field] as string | null;
    }
    const dorm = await dormOperation(user.id, 'save', null, {
      version: body.version, placements, ...appearance,
    });
    return Response.json(dorm, noStore);
  } catch (error) { return accountResponse(error); }
}

// PATCH updates the owner's guestbook welcome message.
export async function PATCH(request: Request) {
  try {
    const user = await verifiedUser(request);
    const body = await jsonBody(request);
    if (typeof body.welcome !== 'string') throw new AccountError('Enter a welcome message.', 400);
    return Response.json(await dormOperation(user.id, 'welcome', null, { text: body.welcome }), noStore);
  } catch (error) { return accountResponse(error); }
}
