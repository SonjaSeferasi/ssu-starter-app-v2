import {accountResponse,verifiedUser} from '../../../../lib/socialu-account';
import {loginHistory} from '../../../../lib/login-activity';
export const dynamic='force-dynamic';
export async function GET(request:Request){
  try{
    const user=await verifiedUser(request);
    return Response.json(await loginHistory(user.id),{headers:{'Cache-Control':'no-store'}});
  }catch(error){return accountResponse(error);}
}
