import { AccountError, accountClient, accountResponse, verifiedUser } from '../../../../lib/socialu-account';
import { profileRpc } from '../../../../lib/profile';
import { resolveMediaUrl } from '../../../../lib/media';

export const dynamic = 'force-dynamic';
type MemberRow = { username: string; name: string; photo_key: string | null; is_me: boolean };

export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const params = new URL(request.url).searchParams;
    const query = (params.get('q') ?? '').trim();
    const offset = Number(params.get('offset') ?? 0);
    if (query.length > 100 || !Number.isInteger(offset) || offset < 0 || offset > 1000000) {
      throw new AccountError('Invalid member search.', 400);
    }
    // The database derives the school from this verified identity, never URL school/user IDs.
    const rows = await profileRpc<MemberRow[]>('socialu_campus_members', { p_auth_id: user.id, p_query: query, p_offset: offset });
    const members = await Promise.all(rows.slice(0, 20).map(async ({ photo_key, ...member }) => ({
      ...member, photo_url: await resolveMediaUrl(accountClient(), photo_key),
    })));
    return Response.json({ members, hasMore: rows.length > 20 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
