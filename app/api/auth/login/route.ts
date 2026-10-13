import { AccountError, accountOperation, accountResponse, authClient, jsonBody, textField } from '../../../../lib/socialu-account';

export async function POST(request: Request) {
  try {
    const body = await jsonBody(request);
    const identifier = textField(body.identifier ?? body.email);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!identifier || !password) throw new AccountError('Email or username and password are required.', 400);
    let email = identifier.toLowerCase();
    if (!identifier.includes('@')) {
      const resolved = await accountOperation('resolve_login', { p_identifier: identifier });
      if (!resolved?.email) throw new AccountError('Incorrect email or password.', 401);
      email = resolved.email;
    }
    const { data, error } = await authClient().auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) throw new AccountError('Incorrect email or password.', 401);
    if (!data.user.email_confirmed_at) throw new AccountError('Verify your university email before signing in.', 403);
    const profile = await accountOperation('read', { p_auth_id: data.user.id });
    // No token is returned until verified identity, domain and account state pass.
    return Response.json({ session: data, needsProfile: !profile }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
