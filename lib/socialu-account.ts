import { getSupabaseClient } from './supabase';

export class AccountError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

export function authClient() {
  const client = getSupabaseClient();
  if (!client) throw new AccountError('Authentication is unavailable. Check the server Supabase configuration.', 503);
  return client;
}

export function accountClient() {
  // The anonymous key must never silently substitute for this server-only bridge.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new AccountError('SocialU account integration is not configured on the server.', 503);
  return authClient();
}

export async function accountOperation(action: string, args: Record<string, string | null> = {}) {
  // Fresh client: signing in on a Supabase client changes its Authorization token.
  const { data, error } = await accountClient().rpc('socialu_account', { p_action: action, ...args });
  if (error) {
    if (!error.code && /fetch failed/i.test(error.message)) throw new AccountError('The server cannot reach Supabase. Check the server network connection and try again.', 503);
    if (error.code === '23505') throw new AccountError('Username or email is already registered.', 409);
    if (error.code === '42501') throw new AccountError('A verified, active university account is required.', 403);
    if (error.code === '22023' || error.code === '22001') throw new AccountError('Check your name, username, university email, and biography (250 characters maximum).', 400);
    throw new AccountError('SocialU account storage is unavailable. Check that the account integration migration has been applied.', 503);
  }
  return data;
}

export async function verifiedUser(request: Request) {
  const header = request.headers.get('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw new AccountError('Please sign in.', 401);
  const { data, error } = await authClient().auth.getUser(token);
  if (error || !data.user) throw new AccountError('Your sign-in has expired. Please sign in again.', 401);
  if (!data.user.email_confirmed_at) throw new AccountError('Verify your university email before signing in.', 403);
  // Supabase signOut revokes refresh tokens; an issued access token can otherwise
  // remain valid until expiry. Check app revocation as well, using verified claims.
  await checkAppSession(token, data.user.id);
  return data.user;
}

export async function checkAppSession(token: string, userId: string) {
  let claims;
  try {
    claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    if (typeof claims.iat !== 'number' || !claims.session_id) throw new Error();
  } catch { throw new AccountError('Your sign-in has expired. Please sign in again.', 401); }
  const { data, error } = await accountClient().rpc('socialu_session_guard', {
    p_action: 'check', p_auth_id: userId, p_session: claims.session_id,
    p_issued_at: new Date(claims.iat * 1000).toISOString(),
  });
  if (error) throw new AccountError('Session security is not configured on the server.', 503);
  if (data !== true) throw new AccountError('Your session was ended by a security action. Please sign in again.', 401);
}

export function accountResponse(error: unknown) {
  const known = error instanceof AccountError;
  return Response.json({ error: known ? error.message : 'The request could not be completed. Please try again.', ...(known && error.code ? { code: error.code } : {}) },
    { status: known ? error.status : 503, headers: { 'Cache-Control': 'no-store' } });
}

export async function jsonBody(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch { throw new AccountError('Enter a valid request.', 400); }
}

export function textField(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
