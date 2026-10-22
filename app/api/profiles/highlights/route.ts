import { AccountError, accountClient, accountResponse, jsonBody, textField, verifiedUser } from '../../../../lib/socialu-account';
import { profileRpc } from '../../../../lib/profile';
import { shapeFeedPosts, type RawFeedRow } from '../../../../lib/posts';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };

type RawHighlight = { highlight_id: number; title: string; posts: RawFeedRow[] };

async function shapeHighlights(rows: RawHighlight[]) {
  return Promise.all(rows.map(async row => ({
    highlightId: row.highlight_id, title: row.title, posts: await shapeFeedPosts(accountClient(), row.posts.filter(post => post.photos.length > 0)),
  })));
}

function id(value: unknown) {
  const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isSafeInteger(number) || number < 1) throw new AccountError('Choose a valid item.', 400);
  return number;
}

// Profile highlights: named collections of a student's own posts. Without ?username= it returns your own.
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const username = new URL(request.url).searchParams.get('username')?.trim() || null;
    const rows = await profileRpc<RawHighlight[]>('socialu_profile_highlights', { p_auth_id: user.id, p_action: 'list', p_username: username });
    return Response.json({ highlights: await shapeHighlights(rows) }, { headers });
  } catch (error) { return accountResponse(error); }
}

// { action: 'create', title, postIds } or { action: 'delete', highlightId }. Always acts on your own profile.
export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request);
    const body = await jsonBody(request);
    const action = textField(body.action);
    if (action !== 'create' && action !== 'delete') throw new AccountError('Choose a valid highlight action.', 400);
    if (action === 'create' && (!Array.isArray(body.postIds) || body.postIds.length < 1 || body.postIds.length > 30)) {
      throw new AccountError('Choose photo posts containing between 1 and 30 pictures.', 400);
    }
    const args = action === 'create'
      ? { p_title: textField(body.title), p_post_ids: Array.isArray(body.postIds) ? body.postIds.map(id) : [] }
      : { p_highlight_id: id(body.highlightId) };
    const rows = await profileRpc<RawHighlight[]>('socialu_profile_highlights', { p_auth_id: user.id, p_action: action, ...args });
    return Response.json({ highlights: await shapeHighlights(rows) }, { headers });
  } catch (error) { return accountResponse(error); }
}
