import { AccountError, accountResponse, jsonBody, textField, verifiedUser } from '../../../lib/socialu-account';
import { friendshipRpc, shapeStudents } from '../../../lib/friendships';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const params = new URL(request.url).searchParams;
    const action = params.get('view') ?? 'friends';
    if (!['friends','incoming','outgoing','blocked','discover','relation'].includes(action)) throw new AccountError('Choose a valid connections view.',400);
    const query = (params.get('q') ?? '').trim();
    const offset = Number(params.get('offset') ?? 0);
    if (query.length > 100 || !Number.isInteger(offset) || offset < 0 || offset > 10000) throw new AccountError('Invalid search.',400);
    const username = params.get('username')?.trim() || null;
    if (action === 'relation' && !username) throw new AccountError('Choose a student.',400);
    const result = await friendshipRpc<any>('socialu_friendships', { p_auth_id:user.id,p_action:action,p_username:username,p_query:query,p_offset:offset });
    return Response.json(action === 'relation' ? result : { students:await shapeStudents(result.slice(0,20)), hasMore:result.length>20 },{headers});
  } catch (error) { return accountResponse(error); }
}
export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request);
    const body = await jsonBody(request);
    const action = textField(body.action), username = textField(body.username);
    if (!['send','accept','decline','cancel','remove','block','unblock','message'].includes(action) || !username || username.length > 50) throw new AccountError('Choose a valid student and action.',400);
    const requestId = textField(body.requestId);
    if (['accept','decline','cancel','remove'].includes(action) && !/^[1-9]\d{0,17}$/.test(requestId)) throw new AccountError('Choose a valid friend request.',400);
    const result = await friendshipRpc('socialu_friendships',{ p_auth_id:user.id,p_action:action,p_username:username,p_request_id:requestId || null });
    return Response.json(result,{headers});
  } catch (error) { return accountResponse(error); }
}
