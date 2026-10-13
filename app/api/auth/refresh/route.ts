import { AccountError, accountOperation, accountResponse, authClient, checkAppSession, jsonBody } from '../../../../lib/socialu-account';
export async function POST(request: Request) {
  try {
    const body = await jsonBody(request);
    if (typeof body.refreshToken !== 'string' || !body.refreshToken) throw new AccountError('Please sign in again.', 401);
    const { data, error } = await authClient().auth.refreshSession({ refresh_token: body.refreshToken });
    if (error || !data.session || !data.user?.email_confirmed_at) throw new AccountError('Your session has expired. Please sign in again.', 401);
    await checkAppSession(data.session.access_token, data.user.id);
    await accountOperation('read', { p_auth_id: data.user.id });
    return Response.json({ session: data.session }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
