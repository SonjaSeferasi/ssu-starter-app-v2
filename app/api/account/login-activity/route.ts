import {AccountError,accountClient,accountResponse,jsonBody,verifiedUser} from '../../../../lib/socialu-account';
import {loginHistory,historyCursor,currentSessionId} from '../../../../lib/login-activity';
export const dynamic='force-dynamic';
export async function GET(request:Request){
  try{
    const user=await verifiedUser(request);
    return Response.json(await loginHistory(user.id,historyCursor(new URL(request.url).searchParams.get('cursor')),currentSessionId(request)),{headers:{'Cache-Control':'no-store'}});
  }catch(error){return accountResponse(error);}
}

export async function POST(request:Request){
  try{
    const user=await verifiedUser(request);
    const current=currentSessionId(request);
    if(!current)throw new AccountError('Please sign in again before managing devices.',401);
    const body=await jsonBody(request);
    if(body.confirm!==true||typeof body.id!=='string'||! /^[1-9]\d{0,18}$/.test(body.id)||BigInt(body.id)>9223372036854775807n)
      throw new AccountError('Confirm which sign-in you want to end.',400);
    const {data,error}=await accountClient().rpc('socialu_end_login_session',{p_auth_id:user.id,p_current_session:current,p_history_id:body.id});
    if(error?.code==='42501')throw new AccountError('Your session has expired. Please sign in again.',401);
    if(error?.code==='P0002')throw new AccountError('That sign-in was not found.',404);
    if(error?.code==='22023')throw new AccountError('Use Log Out to end your current session.',400);
    if(error||data!==true)throw new AccountError('Could not log out this device. Please try again later.',503);
    return Response.json({ended:true},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return accountResponse(error);}
}
