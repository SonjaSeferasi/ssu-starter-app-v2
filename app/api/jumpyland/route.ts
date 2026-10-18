import { AccountError, accountClient, accountResponse, jsonBody, verifiedUser } from '../../../lib/socialu-account';
import { courses } from '../../../components/jumpyland/levels';
export const dynamic='force-dynamic';
async function operation(request:Request,args:Record<string,unknown>){
  const user=await verifiedUser(request);
  const {data,error}=await accountClient().rpc('socialu_jumpyland',{p_auth_id:user.id,...args});
  if(error){
    if(error.code==='PGRST202')throw new AccountError('Jumpyland needs its database update before account play is available.',503,'JUMPYLAND_SETUP_REQUIRED');
    if(error.code==='42501')throw new AccountError('This attempt or level is not available to your account.',403);
    if(error.code==='22023')throw new AccountError('This game result is invalid. Please retry.',400);
    throw new AccountError('Jumpyland storage is unavailable. Retry without closing this result.',503);
  }
  return Response.json(data,{headers:{'Cache-Control':'no-store'}});
}
export async function GET(request:Request){try{return await operation(request,{p_action:'read'});}catch(e){return accountResponse(e);}}
export async function POST(request:Request){try{
  const body=await jsonBody(request);
  if(!['start','complete'].includes(String(body.action))||typeof body.attemptId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.attemptId))throw new AccountError('Enter a valid game attempt.',400);
  if(body.action==='start'){
    if(!Number.isInteger(body.level)||!courses.some(c=>c.number===body.level)||typeof body.timeZone!=='string'||body.timeZone.length>100)throw new AccountError('Choose an available level and valid time zone.',400);
    return await operation(request,{p_action:'start',p_attempt:body.attemptId,p_level:body.level,p_zone:body.timeZone});
  }
  if(!Number.isInteger(body.coins)||Number(body.coins)<0||Number(body.coins)>8)throw new AccountError('Enter a valid coin result.',400);
  return await operation(request,{p_action:'complete',p_attempt:body.attemptId,p_coins:body.coins});
}catch(e){return accountResponse(e);}}
