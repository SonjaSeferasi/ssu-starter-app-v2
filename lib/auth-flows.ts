import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { AccountError, authClient, textField } from './socialu-account';

export { passwordError } from './account/validation';

export function universityEmail(value: unknown) {
  const email = textField(value).toLowerCase();
  if (!/^[^\s@]+@salemstate\.edu$/.test(email)) throw new AccountError('Use your Salem State university email (@salemstate.edu).', 400);
  return email;
}

export async function authGuard(action: 'status' | 'failure' | 'success' | 'verified' | 'send', email: string, purpose = 'signup') {
  const client = authClient();
  const { data, error } = await client.rpc('socialu_auth_guard', { p_action: action, p_email: email, p_purpose: purpose });
  if (error) throw new AccountError('Account security is not configured. Apply the SRS 100–105 migration on the server.', 503);
  if (data?.retry_after > 0) throw new AccountError(`Please wait ${data.retry_after} seconds before requesting another code.`, 429);
  return data as { verification_required?: boolean };
}

function recoveryKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new AccountError('Password recovery is not configured on the server.', 503);
  return createHash('sha256').update('socialu-recovery-v1:' + key).digest();
}

// The recovery provider token is encrypted, not returned as an app login session.
// Email links return a session in the URL; only trust one minted by that kind of email, recently.
export async function emailLinkUser(token: unknown, methods: string[]) {
  const invalid = new AccountError('This email link is invalid or has expired. Request a new one.', 400);
  if (typeof token !== 'string' || !token || token.length > 16000) throw invalid;
  const { data, error } = await authClient().auth.getUser(token);
  if (error || !data.user?.email || !data.user.email_confirmed_at) throw invalid;
  let amr: { method?: string; timestamp?: number }[] = [];
  try { amr = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).amr ?? []; } catch { throw invalid; }
  // getUser has already validated the signature, so these claims are trustworthy.
  const fresh = amr.some(entry => methods.includes(entry.method ?? '') && typeof entry.timestamp === 'number' && Date.now() - entry.timestamp * 1000 < 15 * 60_000);
  if (!fresh) throw invalid;
  return { user: data.user, email: universityEmail(data.user.email) };
}

export function recoveryTicket(token: string, userId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', recoveryKey(), iv);
  const body = Buffer.from(JSON.stringify({ token, userId, id: randomUUID(), expires: Date.now() + 15 * 60_000 }));
  const encrypted = Buffer.concat([cipher.update(body), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

export function readRecoveryTicket(ticket: unknown): { token: string; userId: string; id: string } {
  try {
    if (typeof ticket !== 'string' || ticket.length > 16000) throw new Error();
    const bytes = Buffer.from(ticket, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', recoveryKey(), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const result = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString());
    if (!result.token || !result.userId || !result.id || result.expires < Date.now()) throw new Error();
    return result;
  } catch { throw new AccountError('Your password-reset verification has expired. Request a new code.', 401); }
}

export async function claimRecoveryTicket(id: string) {
  const { data, error } = await authClient().rpc('socialu_claim_recovery', { p_ticket: id });
  if (error) throw new AccountError('Password-reset security is not configured on the server.', 503);
  if (!data) throw new AccountError('This reset verification has already been used. Request a new code.', 401);
}

export async function revokeAppSessions(userId: string, token: string, scope: 'global' | 'others') {
  // getUser has already validated this token before its claims are consumed.
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  const { error } = await authClient().rpc('socialu_session_guard', {
    p_action: scope === 'global' ? 'revoke_all' : 'revoke_others', p_auth_id: userId,
    p_session: claims.session_id, p_issued_at: new Date(claims.iat * 1000).toISOString(),
  });
  if (error) throw new AccountError('Session security is not configured on the server.', 503);
}

export async function confirmPassword(email: string, password: string) {
  const client = authClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) return false;
  // A credential check must not leave an extra remembered session behind.
  const result = await authClient().auth.admin.signOut(data.session.access_token, 'local');
  if (result.error) throw new AccountError('Unable to complete the security check. Please try again.', 503);
  return true;
}
