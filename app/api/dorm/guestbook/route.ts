import { AccountError, accountResponse, jsonBody, verifiedUser } from '../../../../lib/socialu-account';
import { dormOperation, ownerParam } from '../../../../lib/dormspace';

export const dynamic = 'force-dynamic';
const noStore = { headers: { 'Cache-Control': 'no-store' } };

export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const owner = ownerParam(new URL(request.url).searchParams.get('owner'));
    return Response.json(await dormOperation(user.id, 'guestbook', owner), noStore);
  } catch (error) { return accountResponse(error); }
}

// POST adds a note to a friend's guestbook.
export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request);
    const body = await jsonBody(request);
    const owner = ownerParam(body.owner);
    if (!owner || typeof body.text !== 'string') throw new AccountError('Write a note before posting.', 400);
    return Response.json(await dormOperation(user.id, 'note_add', owner, { text: body.text }), { status: 201, ...noStore });
  } catch (error) { return accountResponse(error); }
}

// PATCH edits the caller's own note.
export async function PATCH(request: Request) {
  try {
    const user = await verifiedUser(request);
    const body = await jsonBody(request);
    if (typeof body.noteId !== 'string' || typeof body.text !== 'string') throw new AccountError('Write a note before saving.', 400);
    return Response.json(await dormOperation(user.id, 'note_edit', ownerParam(body.owner), { noteId: body.noteId, text: body.text }), noStore);
  } catch (error) { return accountResponse(error); }
}

// DELETE removes a note; allowed for its author or the dorm owner.
export async function DELETE(request: Request) {
  try {
    const user = await verifiedUser(request);
    const params = new URL(request.url).searchParams;
    const noteId = params.get('noteId') ?? '';
    if (!/^\d+$/.test(noteId)) throw new AccountError('Choose a note to delete.', 400);
    return Response.json(await dormOperation(user.id, 'note_delete', ownerParam(params.get('owner')), { noteId }), noStore);
  } catch (error) { return accountResponse(error); }
}
