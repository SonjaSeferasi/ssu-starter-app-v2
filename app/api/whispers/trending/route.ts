import { accountResponse, verifiedUser } from '../../../../lib/socialu-account';
import { feedRpc } from '../../../../lib/feed';
import { shapeConfessions, type RawConfessionRow } from '../../../../lib/whisper';

// The Whisper Wall's Trending Confessions sidebar -- top 3 by engagement
// score (reactions x1 + comments x2, zero-engagement excluded). A
// deliberately separate endpoint/RPC from the main feed's own "Sort:
// Trending" option (/api/whispers?sort=trending, which uses a different
// time-decayed formula for browsing the full list) -- unrelated feature
// that happens to share a name.
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const rows = await feedRpc<RawConfessionRow[]>('socialu_whisper_trending', { p_auth_id: user.id });
    return Response.json({ confessions: shapeConfessions(rows) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return accountResponse(error);
  }
}
