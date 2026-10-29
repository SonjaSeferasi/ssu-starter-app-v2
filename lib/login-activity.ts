import { accountClient, AccountError } from './socialu-account';
export type LoginEntry = { id: string; signed_in_at: string };
export type LoginHistory = { entries: LoginEntry[] };
export async function loginHistory(userId: string): Promise<LoginHistory> {
  const {data,error}=await accountClient().rpc('socialu_login_history',{p_auth_id:userId});
  if(error?.code==='42501') throw new AccountError('A verified, active university account is required.',403);
  if(error) throw new AccountError('Login Activity is unavailable. Please try again later.',503);
  return data as LoginHistory;
}
