import { AccountError, accountOperation, accountResponse, authClient, checkAppSession, jsonBody } from '../../../../lib/socialu-account';
import { authGuard, emailLinkUser, recoveryTicket, universityEmail } from '../../../../lib/auth-flows';

export async function POST(request: Request) {
  try {
    const body = await jsonBody(request);
    // Supabase's default email verifies the link before redirecting back with a session.
    if (body.purpose === 'recovery' && typeof body.recoveryAccessToken === 'string') {
      const token = body.recoveryAccessToken;
      // Without the recovery check, any ordinary sign-in token could reset the password.
      const { user, email } = await emailLinkUser(token, ['recovery']);
      await checkAppSession(token, user.id);
      return Response.json({ ticket: recoveryTicket(token, user.id), email }, { headers: { 'Cache-Control': 'no-store' } });
    }
    // Clicking the re-verification link proves inbox access.
    if (body.purpose === 'reverification' && typeof body.linkAccessToken === 'string') {
      const { email } = await emailLinkUser(body.linkAccessToken, ['otp']);
      const { error: signOutError } = await authClient().auth.admin.signOut(body.linkAccessToken, 'local');
      if (signOutError) throw new AccountError('Unable to complete verification. Please try again.', 503);
      await authGuard('verified', email);
      return Response.json({ verified: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    // A reset-email link carries a token hash instead of a session.
    if (body.purpose === 'recovery' && typeof body.tokenHash === 'string') {
      if (!/^[A-Za-z0-9_-]{1,512}$/.test(body.tokenHash)) throw new AccountError('This reset link is invalid. Request a new one.', 400);
      const { data, error } = await authClient().auth.verifyOtp({ token_hash: body.tokenHash, type: 'recovery' });
      if (error || !data.session || !data.user?.email) throw new AccountError('This reset link is invalid or has expired. Request a new one.', 400);
      const email = universityEmail(data.user.email);
      await checkAppSession(data.session.access_token, data.user.id);
      return Response.json({ ticket: recoveryTicket(data.session.access_token, data.user.id), email }, { headers: { 'Cache-Control': 'no-store' } });
    }
    // Clicking the sign-up confirmation link verifies the email; finish onboarding with that session.
    if (body.purpose === 'signup' && typeof body.linkAccessToken === 'string') {
      const { user } = await emailLinkUser(body.linkAccessToken, ['email/signup', 'otp']);
      await accountOperation('onboard', { p_auth_id: user.id,
        p_full_name: user.user_metadata.full_name, p_username: user.user_metadata.username, p_bio: '' });
      return Response.json({ verified: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    throw new AccountError('This email link is invalid or has expired. Request a new one.', 400);
  } catch (error) { return accountResponse(error); }
}
