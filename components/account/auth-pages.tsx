'use client';

import { academicEmail } from '../../lib/university-email';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Check, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { passwordError } from '../../lib/account/validation';
import { accessToken, clearSession, saveSession } from '../../lib/account/session';
import styles from './account.module.css';

export type AuthScreen = 'login' | 'register' | 'verify-email' | 'forgot-password' | 'reset-password' | 'change-password';
type Purpose = 'signup' | 'recovery' | 'reverification';
const copy: Record<AuthScreen, { title: string; description: string; action: string }> = {
  login: { title: 'Your campus. Your people.', description: 'Verify your student status with your university email.', action: 'Sign in' },
  register: { title: 'Your campus. Your people.', description: 'Verify your school email to join your own campus community.', action: 'Create account' },
  'verify-email': { title: 'Verify your university email.', description: 'Click the verification link sent to your university email.', action: 'Verify email' },
  'forgot-password': { title: 'Forgot your password?', description: 'Enter your university email to receive a password-reset link.', action: 'Send reset link' },
  'reset-password': { title: 'Choose a new password.', description: 'Give your account a fresh start with a strong new password.', action: 'Reset password' },
  'change-password': { title: 'Change your password.', description: 'Confirm your current password, then choose a new one.', action: 'Save new password' },
};

// Share (additional functionality): after a successful login, return the
// student to wherever they were trying to go (e.g. a shared post link)
// via ?redirect=. Only ever an internal path -- a leading "/" but not "//"
// (protocol-relative, e.g. "//evil.example") and no "://" anywhere rules
// out every way this could point off-site, so this can never become an
// open redirect even though the value comes straight from the URL.
export function safeRedirectTarget(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('://')) return null;
  return value;
}

function Brand({ href }: { href: string }) {
  return <Link href={href} className={styles.brand} aria-label="SocialU">Social<span>U</span></Link>;
}

function Field({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return <label className={styles.field}>{icon}<span className={styles.fieldBody}><span>{label}</span>{children}</span></label>;
}

async function post(endpoint: string, payload: Record<string, unknown>, token?: string | null) {
  const response = await fetch(`/api/auth/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload), cache: 'no-store' });
  return { response, data: await response.json() };
}

export default function AuthPages({ screen }: { screen: AuthScreen }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [current, setCurrent] = useState('');
  const [purpose, setPurpose] = useState<Purpose>('signup');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [needsReactivation, setNeedsReactivation] = useState(false);
  const [confirmReactivation, setConfirmReactivation] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [verifiedReset, setVerifiedReset] = useState(false);
  const initializedScreen = useRef<AuthScreen | null>(null);
  const href = (target: AuthScreen) => target === 'change-password' ? '/account/security' : `/${target}`;
  // Verification happens by clicking the emailed link; these screens wait for it.
  const waitingForLink = screen === 'verify-email' || screen === 'reset-password' && !verifiedReset;
  const newPassword = screen === 'register' || screen === 'change-password' || screen === 'reset-password' && verifiedReset;
  const content = copy[screen];

  useEffect(() => {
    // Development Strict Mode replays effects; consume a one-time link only once.
    if (initializedScreen.current === screen) return;
    initializedScreen.current = screen;
    setPassword(''); setConfirmation(''); setCurrent(''); setError(''); setMessage(''); setVerifiedReset(false);
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get('email') || '');
    const linkPurpose: Purpose = screen === 'reset-password' ? 'recovery' : params.get('purpose') === 'reverification' ? 'reverification' : 'signup';
    setPurpose(linkPurpose);
    const sentAt = Number(sessionStorage.getItem('socialu:code-sent') || 0);
    setCooldown(Math.max(0, Math.ceil((sentAt + 30_000 - Date.now()) / 1000)));
    if (params.get('deactivated') === 'done') setMessage('Your account is deactivated. Your data is kept. Sign in when you are ready to reactivate it.');
    if (params.get('reset') === 'done') setMessage('Password reset. Sign in with your new password.');
    if (params.get('verified') === 'done') setMessage('Email verified. Sign in with your password to continue.');
    if (screen === 'forgot-password' && params.get('reason') === 'sign-in-link') {
      setMessage('That email contains a sign-in link, not a password-reset link. Enter your university email below to request a new password-reset email.');
    }
    const tokenHash = params.get('token_hash');
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const recoveryAccessToken = fragment.get('type') === 'recovery' ? fragment.get('access_token') : null;
    if (screen === 'verify-email' && (fragment.has('error') || fragment.has('error_code'))) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setError('This verification link is invalid or has expired. Request a new one.');
      return;
    }
    const linkAccessToken = fragment.get('access_token');
    const linkType = { signup: 'signup', magiclink: 'reverification' }[fragment.get('type') ?? ''];
    if (screen === 'verify-email' && linkAccessToken && linkType === linkPurpose) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setBusy(true);
      post('verify', { linkAccessToken, purpose: linkPurpose }).then(({ response, data }) => {
        if (!response.ok) throw new Error(data.error || 'This email link is invalid or has expired. Request a new one.');
        if (linkPurpose === 'reverification') { router.push(href('login') + '?verified=done'); return; }
        // The confirmation link already signed the new student in.
        const expiresAt = Number(fragment.get('expires_at'));
        saveSession({ access_token: linkAccessToken, refresh_token: fragment.get('refresh_token') ?? undefined, ...(expiresAt ? { expires_at: expiresAt } : {}) }, true);
        router.push('/');
      }).catch(error => setError(error instanceof Error ? error.message : 'Unable to verify your email link.'))
        .finally(() => setBusy(false));
      return;
    }
    if (screen !== 'reset-password') return;
    if (fragment.has('error') || fragment.has('error_code')) {
      window.history.replaceState(null, '', window.location.pathname);
      setError('This reset link is invalid or has expired. Request a new one.');
      return;
    }
    if (!recoveryAccessToken && !(tokenHash && params.get('type') === 'recovery')) return;
    // Drop the one-time token from the address bar before verifying it.
    window.history.replaceState(null, '', window.location.pathname);
    setBusy(true);
    post('verify', { ...(recoveryAccessToken ? { recoveryAccessToken } : { tokenHash }), purpose: 'recovery' }).then(({ response, data }) => {
      if (!response.ok) throw new Error(data.error || 'This reset link is invalid or has expired. Request a new one.');
      sessionStorage.setItem('socialu:recovery-ticket', data.ticket); setEmail(data.email); setVerifiedReset(true);
    }).catch(error => setError(error instanceof Error ? error.message : 'Unable to verify your reset link.'))
      .finally(() => setBusy(false));
  }, [screen]);

  useEffect(() => {
    if (!cooldown) return;
    const timeout = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timeout);
  }, [cooldown]);

  function sent() {
    sessionStorage.setItem('socialu:code-sent', String(Date.now()));
    setCooldown(30);
  }

  async function resend() {
    if (busy || cooldown > 0) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (!academicEmail(email.trim())) throw new Error('Enter your school email first.');
      const { response, data } = await post('resend', { email, purpose });
      if (!response.ok) throw new Error(data.error || 'Unable to resend your email.');
      sent(); setMessage(data.message);
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to resend. Please try again.'); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (screen === 'register' && !name.trim()) throw new Error('Enter your full name.');
      if (screen !== 'login' && screen !== 'change-password' && !academicEmail(email.trim())) throw new Error('Use your school email (.edu, .edu.xx, or .ac.xx).');
      if (newPassword) {
        const invalid = passwordError(password, confirmation, screen === 'change-password' ? current : undefined);
        if (invalid) throw new Error(invalid);
      }
      let endpoint: string = screen;
      let payload: Record<string, unknown> = { email, password, confirmPassword: confirmation };
      let token: string | null = null;
      if (screen === 'register') payload = { ...payload, fullName: name.trim(), username: username.trim() };
      if (screen === 'login') payload = { identifier: email.trim(), password, reactivate: needsReactivation && confirmReactivation };
      if (screen === 'reset-password' && verifiedReset) payload.ticket = sessionStorage.getItem('socialu:recovery-ticket');
      if (screen === 'change-password') {
        token = await accessToken();
        if (!token) throw new Error('Sign in before changing your password.');
        payload.currentPassword = current;
      }
      const { response, data } = await post(endpoint, payload, token);
      if (screen === 'login' && data.code === 'ACCOUNT_INACTIVE') setNeedsReactivation(true);
      if (!response.ok) {
        if (data.verificationRequired) { sent(); router.push(href('verify-email') + `?purpose=reverification&email=${encodeURIComponent(data.email)}`); return; }
        throw new Error(data.error || 'Unable to complete your request.');
      }
      if (screen === 'register' || screen === 'forgot-password') {
        sent(); router.push(href(screen === 'register' ? 'verify-email' : 'reset-password') + `?email=${encodeURIComponent(email)}`);
      } else if (screen === 'reset-password') {
        sessionStorage.removeItem('socialu:recovery-ticket'); clearSession(); router.push(href('login') + '?reset=done');
      } else if (screen === 'change-password') {
        setPassword(''); setConfirmation(''); setCurrent(''); setMessage(data.message);
      } else {
        const session = data.session?.session;
        if (!session?.access_token) throw new Error('No session was returned. Please sign in again.');
        saveSession(session, remember);
        // Profile setup always comes first if it's still needed; otherwise
        // honor ?redirect= (e.g. back to a shared post) when present and safe.
        const redirectTarget = safeRedirectTarget(new URLSearchParams(window.location.search).get('redirect'));
        router.push(data.needsProfile ? '/profile' : redirectTarget ?? '/');
      }
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  }

  const passwordField = (label: string, value: string, update: (value: string) => void, autoComplete: string) => <Field label={label} icon={<LockKeyhole />} key={label}><input type="password" value={value} onChange={event => update(event.target.value)} autoComplete={autoComplete} placeholder="••••••••••" required maxLength={256} /></Field>;

  return <div className={styles.workspace}>
    <main className={styles.scene}>
      <section className={styles.panel} aria-label={content.title}>
        <Brand href="/" />
        <h1 className={styles.tagline}>{waitingForLink ? 'Check your email.' : content.title}</h1>
        <p className={styles.description}>{waitingForLink ? <>Open the newest {screen === 'reset-password' ? 'password-reset' : 'verification'} email{email ? <> sent to <strong>{email}</strong></> : ''} and click its link.</> : content.description}</p>
          {error && <div className={`${styles.notice} ${styles.error}`} role="alert">{error}</div>}
          {message && <div className={styles.notice} role="status">{message}</div>}
          {waitingForLink ? <div className={styles.form} aria-busy={busy}>
            {busy ? <p className={styles.hint} role="status">Checking your email link…</p> : <>
              <Field label="University email" icon={<Mail />}><input value={email} onChange={event => { setEmail(event.target.value); setNeedsReactivation(false); setConfirmReactivation(false); }} type="email" placeholder="you@school.edu" autoComplete="email" maxLength={254} /></Field>
              <button type="button" className={styles.button} onClick={resend} disabled={cooldown > 0}>{cooldown ? `Resend in ${cooldown}s` : 'Resend email'}</button>
            </>}
          </div> : <form onSubmit={submit} className={styles.form} aria-busy={busy}>
            {screen === 'register' && <>
              <Field label="Full name" icon={<UserRound />}><input value={name} onChange={event => setName(event.target.value)} placeholder="Your full name" autoComplete="name" required maxLength={100} /></Field>
              <Field label="Username" icon={<UserRound />}><input value={username} onChange={event => setUsername(event.target.value)} placeholder="Choose a username" autoComplete="username" required maxLength={50} pattern="[A-Za-z0-9_.]+" title="Use letters, numbers, periods, and underscores." /></Field>
            </>}
            {(screen === 'login' || screen === 'register' || screen === 'forgot-password') && <Field label="University email" icon={<Mail />}><input value={email} onChange={event => { setEmail(event.target.value); setNeedsReactivation(false); setConfirmReactivation(false); }} type={screen === 'login' ? 'text' : 'email'} placeholder="you@school.edu" autoComplete={screen === 'login' ? 'username' : 'email'} aria-label={screen === 'login' ? 'University email or username' : undefined} required maxLength={254} /></Field>}
            {screen === 'change-password' && passwordField('Current password', current, setCurrent, 'current-password')}
            {(screen === 'login' || newPassword) && passwordField(screen === 'login' ? 'Password' : 'New password', password, setPassword, screen === 'login' ? 'current-password' : 'new-password')}
            {newPassword && <>{passwordField('Confirm password', confirmation, setConfirmation, 'new-password')}<p className={styles.hint}>Use 8+ characters with uppercase and lowercase letters, a number, and a special character.</p></>}
            {screen === 'login' && <div className={styles.options}><label className={styles.remember}><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} /><span className={styles.check} aria-hidden="true">{remember && <Check size={17} strokeWidth={2.2} />}</span>Remember me</label><Link href={href('forgot-password')}>Forgot password?</Link></div>}
            {screen === 'login' && needsReactivation && <label className={styles.hint}><input type="checkbox" checked={confirmReactivation} onChange={event => setConfirmReactivation(event.target.checked)} /> I want to reactivate my account and restore my profile.</label>}
            <button type="submit" className={styles.button} disabled={busy || (screen === 'login' && needsReactivation && !confirmReactivation)}>{busy ? 'Please wait…' : screen === 'login' && needsReactivation ? 'Reactivate and sign in' : content.action}</button>
          </form>}
          <p className={styles.footer}>{screen === 'login' ? <>New to SocialU? <Link href={href('register')}>Create account</Link></> : screen === 'register' ? <>Already have an account? <Link href={href('login')}>Sign in</Link></> : <Link href={href('login')}>Back to sign in</Link>}</p>
      </section>
      <p className={styles.campusFooter}>Your school. Your community. &nbsp; | &nbsp; A more connected campus</p>
    </main>
  </div>;
}
