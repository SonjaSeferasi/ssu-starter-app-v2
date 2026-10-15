import { AccountError, accountClient, accountResponse, jsonBody, textField, verifiedUser } from '../../../../lib/socialu-account';
import { profileRpc } from '../../../../lib/profile';
import { shapeFeedPosts, type RawFeedRow } from '../../../../lib/posts';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
function postId(value: unknown) {
  const id = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) throw new AccountError('Choose a valid post.', 400);
  return id;
}

export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const params = new URL(request.url).searchParams;
    const action = params.get('action') ?? 'summary';
    if (!['summary', 'saved', 'save_status'].includes(action)) throw new AccountError('Choose a valid profile action.', 400);
    const result = await profileRpc<unknown>('socialu_profile_social', {
      p_auth_id: user.id, p_action: action, p_username: params.get('username')?.trim() || null,
      ...(action === 'save_status' ? { p_post_id: postId(params.get('postId')) } : {}),
    });
    return Response.json(action === 'saved' ? { posts: await shapeFeedPosts(accountClient(), result as RawFeedRow[]) } : result, { headers });
  } catch (error) { return accountResponse(error); }
}

export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request);
    const body = await jsonBody(request);
    const action = textField(body.action);
    if (!['follow', 'unfollow', 'save', 'unsave'].includes(action)) throw new AccountError('Choose a valid profile action.', 400);
    const username = textField(body.username);
    if (['follow', 'unfollow'].includes(action) && !username) throw new AccountError('Choose a student to follow.', 400);
    const result = await profileRpc('socialu_profile_social', {
      p_auth_id: user.id, p_action: action, p_username: username || null,
      ...(['save', 'unsave'].includes(action) ? { p_post_id: postId(body.postId) } : {}),
    });
    return Response.json(result, { headers });
  } catch (error) { return accountResponse(error); }
}
