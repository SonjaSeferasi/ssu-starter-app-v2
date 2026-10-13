import { AccountError, accountResponse, authClient, jsonBody } from '../../../../lib/socialu-account';
import { authGuard, universityEmail } from '../../../../lib/auth-flows';

export async function POST(request: Request) {
  try {
    const body = await jsonBody(request);
    const email = universityEmail(body.email);
    if (!['signup', 'recovery', 'reverification'].includes(body.purpose as string)) throw new AccountError('Choose a valid verification flow.', 400);
    await authGuard('send', email, body.purpose as string);
    const client = authClient();
    const result = body.purpose === 'recovery' ? await client.auth.resetPasswordForEmail(email)
      : body.purpose === 'reverification' ? await client.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
      : await client.auth.resend({ type: 'signup', email });
    if (result.error && body.purpose !== 'reverification') throw new AccountError('Unable to send a code. Please try again shortly.', 400);
    return Response.json({ message: 'If your account is eligible, a new code has been sent. Check your university email.', retryAfter: 30 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
