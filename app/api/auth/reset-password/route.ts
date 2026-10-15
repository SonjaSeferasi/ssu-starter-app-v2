import { AccountError, accountResponse, authClient, checkAppSession, jsonBody } from '../../../../lib/socialu-account';
import { claimRecoveryTicket, confirmPassword, passwordError, readRecoveryTicket, revokeAppSessions } from '../../../../lib/auth-flows';

export async function POST(request: Request) {
  try {
    const body = await jsonBody(request);
    const password = typeof body.password === 'string' ? body.password : '';
    const validation = passwordError(password, typeof body.confirmPassword === 'string' ? body.confirmPassword : '');
    if (validation) throw new AccountError(validation, 400);
    const ticket = readRecoveryTicket(body.ticket);
    const client = authClient();
    const { data, error } = await client.auth.getUser(ticket.token);
    if (error || !data.user?.email || data.user.id !== ticket.userId) throw new AccountError('Your reset verification has expired. Request a new code.', 401);
    await checkAppSession(ticket.token, data.user.id);
    if (await confirmPassword(data.user.email, password)) throw new AccountError('Choose a password different from your current password.', 400);
    await claimRecoveryTicket(ticket.id);
    // Fail closed before changing credentials if app-level revocation is unavailable.
    await revokeAppSessions(data.user.id, ticket.token, 'global');
    const result = await client.auth.admin.updateUserById(data.user.id, { password });
    if (result.error) throw new AccountError('Unable to save your new password. Please try again.', 400);
    // The admin password update revokes all Supabase sessions in its transaction.
    // Signing out again with the now-revoked recovery token can fail even though
    // both the password update and session revocation have already succeeded.
    return Response.json({ message: 'Password reset. Sign in with your new password.' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
