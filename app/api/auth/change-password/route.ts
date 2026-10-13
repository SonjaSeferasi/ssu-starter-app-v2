import { AccountError, accountOperation, accountResponse, authClient, jsonBody, verifiedUser } from '../../../../lib/socialu-account';
import { confirmPassword, passwordError, revokeAppSessions } from '../../../../lib/auth-flows';

export async function POST(request: Request) {
  try {
    const user = await verifiedUser(request);
    await accountOperation('read', { p_auth_id: user.id });
    const body = await jsonBody(request);
    const current = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!current) throw new AccountError('Enter your current password.', 400);
    const validation = passwordError(password, typeof body.confirmPassword === 'string' ? body.confirmPassword : '', current);
    if (validation) throw new AccountError(validation, 400);
    if (!user.email || !await confirmPassword(user.email, current)) throw new AccountError('Your current password is incorrect.', 400);
    const token = request.headers.get('Authorization')!.slice(7).trim();
    await revokeAppSessions(user.id, token, 'others');
    const { error } = await authClient().auth.admin.updateUserById(user.id, { password });
    if (error) throw new AccountError('Unable to change your password. Please try again.', 400);
    const revoked = await authClient().auth.admin.signOut(token, 'others');
    if (revoked.error) throw new AccountError('Your password changed, but other sessions could not be ended. Contact account support.', 503);
    return Response.json({ message: 'Your password has been changed. Other sessions have been ended.' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
