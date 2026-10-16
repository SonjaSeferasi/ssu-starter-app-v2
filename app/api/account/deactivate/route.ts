import { AccountError, accountResponse, authClient, jsonBody, verifiedUser } from '../../../../lib/socialu-account';
import { friendshipRpc } from '../../../../lib/friendships';
export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request);
    const body = await jsonBody(request);
    if (body.confirm !== 'DEACTIVATE' || typeof body.password !== 'string' || !body.password) throw new AccountError('Enter your password and type DEACTIVATE to confirm.',400);
    const {data,error} = await authClient().auth.signInWithPassword({email:user.email!,password:body.password});
    if (error || !data.user || data.user.id !== user.id) throw new AccountError('Your current password is incorrect.',403);
    await friendshipRpc('socialu_account_lifecycle',{p_auth_id:user.id,p_action:'deactivate'});
    return Response.json({deactivated:true},{headers:{'Cache-Control':'no-store'}});
  } catch (error) { return accountResponse(error); }
}
