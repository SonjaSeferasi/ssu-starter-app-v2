import { AccountError, accountOperation, accountResponse, authClient, jsonBody } from '../../../../lib/socialu-account';
import { authGuard, recoveryTicket, universityEmail, verificationCode } from '../../../../lib/auth-flows';

export async function POST(request: Request) {
  try {
    const body = await jsonBody(request);
    const email = universityEmail(body.email);
    const token = verificationCode(body.code);
    if (!['signup', 'recovery', 'reverification'].includes(body.purpose as string)) throw new AccountError('Choose a valid verification flow.', 400);
    const type = body.purpose === 'reverification' ? 'email' : body.purpose as 'signup' | 'recovery';
    const { data, error } = await authClient().auth.verifyOtp({ email, token, type });
    if (error || !data.session || !data.user) throw new AccountError('This code is incorrect or has expired. Check your email or request a new code.', 400);
    if (body.purpose === 'recovery') {
      return Response.json({ ticket: recoveryTicket(data.session.access_token, data.user.id) }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (body.purpose === 'reverification') {
      // Reverification never logs in without the student's password.
      const { error: signOutError } = await authClient().auth.admin.signOut(data.session.access_token, 'local');
      if (signOutError) throw new AccountError('Unable to complete verification. Please try again.', 503);
      await authGuard('verified', email);
      return Response.json({ verified: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    await accountOperation('onboard', { p_auth_id: data.user.id,
      p_full_name: data.user.user_metadata.full_name, p_username: data.user.user_metadata.username, p_bio: '' });
    return Response.json({ session: data.session }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
