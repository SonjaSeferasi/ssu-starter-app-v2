import { AccountError, accountResponse, jsonBody, verifiedUser } from '../../../lib/socialu-account';
import { gameParticipation } from '../../../lib/game-participation-server';
import { isAuthoredLevel } from '../../../lib/world-explorer/level-manifest';

export const dynamic = 'force-dynamic';
const noStore = { headers: { 'Cache-Control': 'no-store' } };

export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    return Response.json(await gameParticipation(user.id), noStore);
  } catch (error) { return accountResponse(error); }
}

export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request);
    const body = await jsonBody(request);
    if (typeof body.country !== 'string' || !/^(?:[A-Z]{3}|ANTARCTICA)$/.test(body.country) || !isAuthoredLevel(body.country)
        || typeof body.timeZone !== 'string' || body.timeZone.length > 100) {
      throw new AccountError('Start a playable World Explorer level to qualify.', 400);
    }
    return Response.json(await gameParticipation(user.id, 'explorer', body.timeZone), noStore);
  } catch (error) { return accountResponse(error); }
}
