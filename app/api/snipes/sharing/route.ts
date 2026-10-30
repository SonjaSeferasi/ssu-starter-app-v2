import { AccountError } from '../../../../lib/socialu-account';
import { NO_STORE, snipeResponse, snipeUser } from '../../../../lib/snipe';
import { SNIPE_SHARING_CURSOR, snipeSharingList } from '../../../../lib/snipe-sharing';
export const dynamic = 'force-dynamic';

// SRS-511.12, 514.1: the signed-in student's published Snipes they took or approved for sharing, newest first,
// in pages of 20. Metadata only; no conversation membership is required or granted. Only `before` (the previous
// page's next_cursor) is read from the request; the student comes from the verified token.
export async function GET(request: Request) {
  try {
    const user = await snipeUser(request);
    const before = new URL(request.url).searchParams.get('before');
    if (before !== null && !SNIPE_SHARING_CURSOR.test(before)) throw new AccountError('Enter a valid request.', 400);
    const page = await snipeSharingList(user.id, before);
    return Response.json({ records: page.records, next_cursor: page.next_cursor }, { headers: NO_STORE });
  } catch (error) { return snipeResponse(error); }
}
