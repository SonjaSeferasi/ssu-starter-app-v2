import { AccountError, accountResponse, authClient, jsonBody } from '../../../../lib/socialu-account';
import { authGuard, universityEmail } from '../../../../lib/auth-flows';

export async function POST(request: Request) {
  try {
    const body = await jsonBody(request);
    const email = universityEmail(body.email);
    await authGuard('send', email, 'recovery');
    const { error } = await authClient().auth.resetPasswordForEmail(email, { redirectTo: new URL('/reset-password', request.url).href });
    if (error) throw new AccountError('Unable to request a password-reset email. Please try again shortly.', 400);
    return Response.json({ message: 'If an eligible account exists, a password-reset link has been sent. Open the newest email to continue.', retryAfter: 30 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
