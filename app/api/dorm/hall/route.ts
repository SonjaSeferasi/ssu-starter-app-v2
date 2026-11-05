import { AccountError, accountResponse, verifiedUser } from '../../../../lib/socialu-account';
import { dormDirectory, unexpectedDirectory } from '../../../../lib/dormspace-3d-server';
import { readFloorParam, readHallDirectory, readHallLocation, readUsernameParam } from '../../../../lib/dormspace-hall-contract';

export const dynamic = 'force-dynamic';
const noStore = { headers: { 'Cache-Control': 'no-store' } };

// GET ?floor=<n> -> one floor of the shared school DormHall (own floor when omitted).
// GET ?locate=<username> -> the floor of a visible schoolmate's door, or null.
// Entering a room is still authorized only by GET /api/dorm?owner=<username>.
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const params = new URL(request.url).searchParams;
    if (params.has('locate')) {
      const username = readUsernameParam(params.get('locate'));
      if (!username) throw new AccountError('Choose a student to find.', 400);
      return Response.json({ location: readHallLocation(await dormDirectory(user.id, 'locate', { username })) }, noStore);
    }
    const floor = readFloorParam(params.get('floor'));
    if (floor === 'invalid') throw new AccountError('Choose a floor from 1 to 999.', 400);
    const directory = readHallDirectory(await dormDirectory(user.id, 'directory', floor === null ? {} : { floor }));
    if (!directory) throw unexpectedDirectory();
    return Response.json(directory, noStore);
  } catch (error) { return accountResponse(error); }
}
