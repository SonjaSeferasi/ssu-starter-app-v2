import { accountClient, AccountError } from './socialu-account';
export type LoginEntry = { id: string; signed_in_at: string };
export type LoginHistory = { entries: LoginEntry[]; nextCursor: string | null };
type Cursor = {at:string;id:string};
export function historyCursor(value:string|null):Cursor|null{
  if(!value)return null;
  try{
    if(value.length>500||!/^[A-Za-z0-9_-]+$/.test(value))throw new Error();
    const cursor=JSON.parse(Buffer.from(value,'base64url').toString());
    if(typeof cursor.at!=='string'||!/^\d{4}-\d\d-\d\dT/.test(cursor.at)||!Number.isFinite(Date.parse(cursor.at))
      ||typeof cursor.id!=='string'||! /^[1-9]\d{0,18}$/.test(cursor.id)||BigInt(cursor.id)>9223372036854775807n)throw new Error();
    return {at:cursor.at,id:cursor.id};
  }catch{throw new AccountError('Invalid history page. Refresh your activity and try again.',400);}
}
export async function loginHistory(userId:string,cursor:Cursor|null):Promise<LoginHistory>{
  const {data,error}=await accountClient().rpc('socialu_login_history',{p_auth_id:userId,p_before_at:cursor?.at??null,p_before_id:cursor?.id??null});
  if(error?.code==='42501')throw new AccountError('A verified, active university account is required.',403);
  if(error?.code==='22023')throw new AccountError('Invalid history page. Refresh your activity and try again.',400);
  if(error)throw new AccountError('Login Activity is unavailable. Please try again later.',503);
  return {entries:data.entries,nextCursor:data.next?Buffer.from(JSON.stringify(data.next)).toString('base64url'):null};
}
