import { AccountError, accountResponse, authClient, jsonBody } from '../../../../lib/socialu-account';
import { authGuard, universityEmail } from '../../../../lib/auth-flows';

export async function POST(request: Request) {
  try {
    const body = await jsonBody(request);
    const email = universityEmail(body.email);
    await authGuard('send', email, 'recovery');
    const { error } = await authClient().auth.resetPasswordForEmail(email);
    if (error) throw new AccountError('Unable to request a password-reset code. Please try again shortly.', 400);
    return Response.json({ message: 'If an eligible account exists, a password-reset code has been sent.', retryAfter: 30 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
