import { AccountError, accountClient, accountResponse, verifiedUser } from '../../../lib/socialu-account';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const user = await verifiedUser(request);
    const { data, error } = await accountClient().rpc('socialu_points_balance', { p_auth_id: user.id });
    if (error || !data || !Number.isSafeInteger(data.balance)) throw new AccountError('Your points balance could not be refreshed.', 503);
    return Response.json({ balance: data.balance }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
