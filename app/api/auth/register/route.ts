import { AccountError, accountOperation, accountResponse, authClient, jsonBody, textField } from '../../../../lib/socialu-account';

export async function POST(request: Request) {
  try {
    const body = await jsonBody(request);
    const email = textField(body.email).toLowerCase();
    const fullName = textField(body.fullName);
    const username = textField(body.username);
    const password = typeof body.password === 'string' ? body.password : '';
    if (!fullName || !username || !email || !password) throw new AccountError('Full name, username, university email, and password are required.', 400);
    if (body.confirmPassword !== password) throw new AccountError('Passwords do not match.', 400);
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      throw new AccountError('Use at least 8 characters with uppercase, lowercase, a number, and a special character.', 400);
    }
    await accountOperation('check_registration', { p_identifier: email, p_full_name: fullName, p_username: username });
    const { error } = await authClient().auth.signUp({ email, password, options: { data: { full_name: fullName, username } } });
    if (error) throw new AccountError('Registration could not be completed. Check your details or try again later.', 400);
    return Response.json({ message: 'Check your university email to verify your account, then sign in.' }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountResponse(error); }
}
