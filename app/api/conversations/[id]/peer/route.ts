import { accountResponse,verifiedUser } from '../../../../../lib/socialu-account';
import { conversationIdParam } from '../../../../../lib/chat-access';
import { profileRpc } from '../../../../../lib/profile';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){
  try{
    const user=await verifiedUser(request);
    const peer=await profileRpc('socialu_friend_conversation',{p_auth_id:user.id,p_conversation_id:conversationIdParam((await context.params).id)});
    return Response.json({peer},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return accountResponse(error);}
}
