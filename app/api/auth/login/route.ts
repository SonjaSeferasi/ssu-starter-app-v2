import { AccountError, accountOperation, accountResponse, authClient, jsonBody, textField } from '../../../../lib/socialu-account';
import { friendshipRpc } from '../../../../lib/friendships';
import { academicEmail } from '../../../../lib/university-email';
import { authGuard } from '../../../../lib/auth-flows';

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
    // Use the same failure tracking whether the user types an email or a username.
    if (!academicEmail(email)) throw new AccountError('Incorrect email or password.', 401);
    const status = await authGuard('status', email);
    async function requireVerification() {
      try {
        await authGuard('send', email, 'reverification');
        await authClient().auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: new URL('/verify-email?purpose=reverification', request.url).href } });
      } catch (error) {
        if (!(error instanceof AccountError) || error.status !== 429) throw error;
      }
      return Response.json({ error: 'Verify your university email before trying to sign in again.', verificationRequired: true, email }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
    }
    if (status?.verification_required) return requireVerification();
    const { data, error } = await authClient().auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) {
      const failed = await authGuard('failure', email);
      if (failed?.verification_required) return requireVerification();
      throw new AccountError('Incorrect email or password.', 401);
    }
    if (!data.user.email_confirmed_at) throw new AccountError('Verify your university email before signing in.', 403);
    const accountState = await friendshipRpc<{ is_active: boolean } | null>('socialu_account_lifecycle', { p_auth_id: data.user.id, p_action: 'status' });
    if (accountState?.is_active === false) {
      if (body.reactivate !== true) throw new AccountError('Your account is deactivated. Confirm reactivation to sign in and restore your profile.', 403, 'ACCOUNT_INACTIVE');
      await friendshipRpc('socialu_account_lifecycle', { p_auth_id: data.user.id, p_action: 'reactivate' });
    }
    let profile = await accountOperation('read', { p_auth_id: data.user.id });
    // The email link may verify Auth without completing our profile callback.
    // Recover from the authenticated account's metadata, never login form fields.
    if (!profile) {
      const fullName = textField(data.user.user_metadata?.full_name);
      const username = textField(data.user.user_metadata?.username);
      if (fullName && username) {
        try {
          profile = await accountOperation('onboard', {
            p_auth_id: data.user.id, p_full_name: fullName, p_username: username, p_bio: '',
          });
        } catch (error) {
          // Let the student correct missing/invalid details or a claimed username.
          // Security and storage failures must still prevent a successful login.
          if (!(error instanceof AccountError) || ![400, 409].includes(error.status)) throw error;
        }
      }
    }
    await authGuard('success', email);
    // No token is returned until verified identity, domain and account state pass.
    return Response.json({ session: data, needsProfile: !profile }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
