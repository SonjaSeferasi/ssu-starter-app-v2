import { AccountError, accountClient, accountResponse, verifiedUser } from '../../../../lib/socialu-account';
import { resolveMediaUrl } from '../../../../lib/media';

// The Whisper Wall -- Campus Crush mention suggestions. A fork of
// /api/campus/members, not a shared endpoint: socialu_whisper_mention_candidates
// additionally excludes any student who has opted out of Campus Crush
// mentions, so an opted-out student never appears in the suggestion
// dropdown -- separate from the server-side enforcement in
// socialu_whisper_create_comment that also rejects a manually-typed handle.
export const dynamic = 'force-dynamic';
type CandidateRow = { username: string; name: string; photo_key: string | null; is_me: boolean };

export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const params = new URL(request.url).searchParams;
    const query = (params.get('q') ?? '').trim();
    const offset = Number(params.get('offset') ?? 0);
    if (query.length > 100 || !Number.isInteger(offset) || offset < 0 || offset > 1000000) {
      throw new AccountError('Invalid member search.', 400);
    }
    const { data, error } = await accountClient().rpc('socialu_whisper_mention_candidates', { p_auth_id: user.id, p_query: query, p_offset: offset });
    if (error) throw new AccountError('SocialU Whisper Wall storage is unavailable. Check that the migration has been applied.', 503);
    const rows = data as CandidateRow[];
    const members = await Promise.all(rows.slice(0, 20).map(async ({ photo_key, ...member }) => ({
      ...member, photo_url: await resolveMediaUrl(accountClient(), photo_key),
    })));
    return Response.json({ members, hasMore: rows.length > 20 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
