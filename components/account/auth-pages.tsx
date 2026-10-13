'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Check, CheckCircle2, GraduationCap, KeyRound, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { passwordError } from '../../lib/account/validation';
import { accessToken, clearSession, saveSession } from '../../lib/account/session';
import styles from './account.module.css';

export type AuthScreen = 'login' | 'register' | 'verify-email' | 'forgot-password' | 'reset-password' | 'change-password';
type Purpose = 'signup' | 'recovery' | 'reverification';
const copy: Record<AuthScreen, { title: string; description: string; action: string }> = {
  login: { title: 'Your campus. Your people.', description: 'Verify your student status with your university email.', action: 'Sign in' },
  register: { title: 'Your campus. Your people.', description: 'Join your campus community with your university email.', action: 'Create account' },
  'verify-email': { title: 'Verify your university email.', description: 'Enter the six-digit code sent to your university email.', action: 'Verify email' },
  'forgot-password': { title: 'Forgot your password?', description: 'Enter your university email to receive a password-reset code.', action: 'Send reset code' },
  'reset-password': { title: 'Choose a new password.', description: 'Give your account a fresh start with a strong new password.', action: 'Reset password' },
  'change-password': { title: 'Change your password.', description: 'Confirm your current password, then choose a new one.', action: 'Save new password' },
};

function Brand({ href }: { href: string }) {
  return <Link href={href} className={styles.brand} aria-label="SocialU">Social<span>U</span></Link>;
}

function Field({ label, icon, children, code = false }: { label: string; icon: ReactNode; children: ReactNode; code?: boolean }) {
  return <label className={`${styles.field} ${code ? styles.code : ''}`}>{icon}<span className={styles.fieldBody}><span>{label}</span>{children}</span></label>;
}

async function post(endpoint: string, payload: Record<string, unknown>, token?: string | null) {
  const response = await fetch(`/api/auth/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload), cache: 'no-store' });
  return { response, data: await response.json() };
}

export default function AuthPages({ screen, preview = false }: { screen: AuthScreen; preview?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [current, setCurrent] = useState('');
  const [code, setCode] = useState('');
  const [purpose, setPurpose] = useState<Purpose>('signup');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [verifiedReset, setVerifiedReset] = useState(false);
  const [complete, setComplete] = useState(false);
  const href = (target: AuthScreen) => preview ? `/preview/${target}` : target === 'change-password' ? '/account/security' : `/${target}`;
  const isCode = screen === 'verify-email' || screen === 'reset-password' && !verifiedReset;
  const newPassword = screen === 'register' || screen === 'change-password' || screen === 'reset-password' && verifiedReset;
  const content = copy[screen];

  useEffect(() => {
    setPassword(''); setConfirmation(''); setCurrent(''); setCode(''); setError(''); setMessage(''); setVerifiedReset(false); setComplete(false);
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get('email') || '');
    setPurpose(screen === 'reset-password' ? 'recovery' : params.get('purpose') === 'reverification' ? 'reverification' : 'signup');
    const sentAt = Number(sessionStorage.getItem(`${preview ? 'preview:' : ''}socialu:code-sent`) || 0);
    setCooldown(Math.max(0, Math.ceil((sentAt + 30_000 - Date.now()) / 1000)));
    if (params.get('reset') === 'done') setMessage('Password reset. Sign in with your new password.');
    if (params.get('verified') === 'done') setMessage('Email verified. Sign in with your password to continue.');
  }, [screen, preview]);

  useEffect(() => {
    if (!cooldown) return;
    const timeout = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timeout);
  }, [cooldown]);

  function sent() {
    sessionStorage.setItem(`${preview ? 'preview:' : ''}socialu:code-sent`, String(Date.now()));
    setCooldown(30);
  }

  async function resend() {
    if (busy || cooldown > 0) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (!/^[^\s@]+@salemstate\.edu$/i.test(email)) throw new Error('Enter your Salem State university email first.');
      if (preview) { sent(); setMessage('Preview code: 123456. No real email was sent.'); return; }
      const { response, data } = await post('resend', { email, purpose });
      if (!response.ok) throw new Error(data.error || 'Unable to resend your code.');
      sent(); setMessage(data.message);
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to resend. Please try again.'); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (screen !== 'login' && screen !== 'change-password' && !/^[^\s@]+@salemstate\.edu$/i.test(email)) throw new Error('Use your Salem State university email (@salemstate.edu).');
      if (isCode && !/^\d{6}$/.test(code)) throw new Error('Enter the six-digit code from your email.');
      if (newPassword) {
        const invalid = passwordError(password, confirmation, screen === 'change-password' ? current : undefined);
        if (invalid) throw new Error(invalid);
      }
      if (preview) {
        if (isCode && code !== '123456') throw new Error('Use the preview code 123456, or request a replacement code.');
        if (screen === 'register' || screen === 'forgot-password') {
          sent(); router.push(href(screen === 'register' ? 'verify-email' : 'reset-password') + `?email=${encodeURIComponent(email)}`);
        } else if (screen === 'reset-password' && !verifiedReset) { setVerifiedReset(true); setCode(''); }
        else if (screen === 'reset-password') router.push(href('login') + '?reset=done');
        else if (screen === 'change-password') { setPassword(''); setConfirmation(''); setCurrent(''); setMessage('Preview: password changed. No real account was changed.'); }
        else if (purpose === 'reverification') router.push(href('login') + '?verified=done');
        else setComplete(true);
        return;
      }
      let endpoint: string = screen;
      let payload: Record<string, unknown> = { email, password, confirmPassword: confirmation };
      let token: string | null = null;
      if (screen === 'register') payload = { ...payload, fullName: name.trim(), username: username.trim() };
      if (screen === 'login') payload = { identifier: email.trim(), password };
      if (isCode) { endpoint = 'verify'; payload = { email, code, purpose }; }
      if (screen === 'reset-password' && verifiedReset) payload.ticket = sessionStorage.getItem('socialu:recovery-ticket');
      if (screen === 'change-password') {
        token = await accessToken();
        if (!token) throw new Error('Sign in before changing your password.');
        payload.currentPassword = current;
      }
      const { response, data } = await post(endpoint, payload, token);
      if (!response.ok) {
        if (data.verificationRequired) { sent(); router.push(href('verify-email') + `?purpose=reverification&email=${encodeURIComponent(data.email)}`); return; }
        throw new Error(data.error || 'Unable to complete your request.');
      }
      if (screen === 'register' || screen === 'forgot-password') {
        sent(); router.push(href(screen === 'register' ? 'verify-email' : 'reset-password') + `?email=${encodeURIComponent(email)}`);
      } else if (screen === 'reset-password' && !verifiedReset) {
        sessionStorage.setItem('socialu:recovery-ticket', data.ticket); setVerifiedReset(true); setCode('');
      } else if (screen === 'reset-password') {
        sessionStorage.removeItem('socialu:recovery-ticket'); clearSession(); router.push(href('login') + '?reset=done');
      } else if (screen === 'change-password') {
        setPassword(''); setConfirmation(''); setCurrent(''); setMessage(data.message);
      } else if (screen === 'verify-email' && purpose === 'reverification') router.push(href('login') + '?verified=done');
      else {
        const session = screen === 'login' ? data.session?.session : data.session;
        if (!session?.access_token) throw new Error('No session was returned. Please sign in again.');
        saveSession(session, screen === 'login' && remember);
        router.push(data.needsProfile ? '/profile' : '/');
      }
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  }

  const passwordField = (label: string, value: string, update: (value: string) => void, autoComplete: string) => <Field label={label} icon={<LockKeyhole />} key={label}><input type="password" value={value} onChange={event => update(event.target.value)} autoComplete={autoComplete} placeholder="••••••••••" required maxLength={256} /></Field>;

  return <div className={styles.workspace}>
    {preview && <div className={styles.previewBar}>Interactive preview · No real emails or account changes <Link href="/preview">All account pages</Link></div>}
    <main className={styles.scene}>
      <section className={styles.panel} aria-label={content.title}>
        <Brand href={preview ? '/preview' : '/'} />
        <h1 className={styles.tagline}>{isCode && screen === 'reset-password' ? 'Verify it’s you.' : content.title}</h1>
        <p className={styles.description}>{isCode ? <>Enter the six-digit code sent to {email ? <strong>{email}</strong> : 'your university email'}.</> : content.description}</p>
        {complete ? <div className={styles.success}><CheckCircle2 size={42} /><h2>Welcome to SocialU.</h2><p>Your {screen === 'login' ? 'sign-in' : 'verification'} preview is complete. A real account would continue to your campus home.</p><Link href="/preview">Explore the other pages</Link></div> : <>
          {preview && isCode && <div className={styles.notice}>Preview verification code: <strong>123456</strong>.</div>}
          {error && <div className={`${styles.notice} ${styles.error}`} role="alert">{error}</div>}
          {message && <div className={styles.notice} role="status">{message}</div>}
          <form onSubmit={submit} className={styles.form} aria-busy={busy}>
            {screen === 'register' && <>
              <Field label="Full name" icon={<UserRound />}><input value={name} onChange={event => setName(event.target.value)} placeholder="Your full name" autoComplete="name" required maxLength={100} /></Field>
              <Field label="Username" icon={<UserRound />}><input value={username} onChange={event => setUsername(event.target.value)} placeholder="Choose a username" autoComplete="username" required maxLength={50} pattern="[A-Za-z0-9_.]+" title="Use letters, numbers, periods, and underscores." /></Field>
            </>}
            {(screen === 'login' || screen === 'register' || screen === 'forgot-password' || isCode) && <Field label="University email" icon={<Mail />}><input value={email} onChange={event => setEmail(event.target.value)} type={screen === 'login' ? 'text' : 'email'} placeholder="you@salemstate.edu" autoComplete={screen === 'login' ? 'username' : 'email'} aria-label={screen === 'login' ? 'University email or username' : undefined} required maxLength={254} /></Field>}
            {isCode && <Field label="Verification code" icon={<ShieldCheck />} code><input value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" placeholder="000000" required /></Field>}
            {screen === 'change-password' && passwordField('Current password', current, setCurrent, 'current-password')}
            {(screen === 'login' || newPassword) && passwordField(screen === 'login' ? 'Password' : 'New password', password, setPassword, screen === 'login' ? 'current-password' : 'new-password')}
            {newPassword && <>{passwordField('Confirm password', confirmation, setConfirmation, 'new-password')}<p className={styles.hint}>Use 8+ characters with uppercase and lowercase letters, a number, and a special character.</p></>}
            {screen === 'login' && <div className={styles.options}><label className={styles.remember}><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} /><span className={styles.check} aria-hidden="true">{remember && <Check size={17} strokeWidth={2.2} />}</span>Remember me</label><Link href={href('forgot-password')}>Forgot password?</Link></div>}
            {isCode && <p className={styles.hint}>Your code is valid for 15 minutes.</p>}
            <button type="submit" className={styles.button} disabled={busy}>{busy ? 'Please wait…' : isCode ? 'Verify code' : content.action}</button>
            {isCode && <p className={styles.hint} style={{ textAlign: 'center' }}>Didn’t receive a code? <button type="button" className={styles.textButton} onClick={resend} disabled={busy || cooldown > 0}>{cooldown ? `Resend in ${cooldown}s` : 'Resend code'}</button></p>}
          </form>
          <p className={styles.footer}>{screen === 'login' ? <>New to SocialU? <Link href={href('register')}>Create account</Link></> : screen === 'register' ? <>Already have an account? <Link href={href('login')}>Sign in</Link></> : <Link href={href('login')}>Back to sign in</Link>}</p>
        </>}
      </section>
      <p className={styles.campusFooter}>Salem State University &nbsp; | &nbsp; A more connected campus</p>
    </main>
  </div>;
}

export function AuthPreviewIndex() {
  const pages: { screen: AuthScreen; srs: string; title: string; description: string }[] = [
    { screen: 'register', srs: '100', title: 'Create account', description: 'Register with your university email and choose a password.' },
    { screen: 'verify-email', srs: '101–102', title: 'Verify & resend', description: 'Enter a six-digit code or request a replacement.' },
    { screen: 'login', srs: '103', title: 'Sign in', description: 'Use your university email or username to reconnect.' },
    { screen: 'forgot-password', srs: '104 · Step 1', title: 'Forgot password', description: 'Request a password-reset code by email.' },
    { screen: 'reset-password', srs: '104 · Steps 2–3', title: 'Reset password', description: 'Verify your code, then save a new password.' },
    { screen: 'change-password', srs: '105', title: 'Change password', description: 'Confirm your current password and set a new one.' },
  ];
  return <div className={styles.workspace}><main className={styles.previewIndex}>
    <Brand href="/preview" /><h1>Your account pages.</h1><p>A more connected campus, from the very first sign-in. Explore your SRS 100–105 pages below.</p>
    <div className={styles.notice}><strong>Interactive preview.</strong> No real emails are sent or accounts changed. Use <strong>123456</strong> for verification codes.</div>
    <div className={styles.previewGrid}>{pages.map(page => <Link className={styles.previewCard} href={`/preview/${page.screen}`} key={page.screen}><GraduationCap size={25} /><small>SRS {page.srs}</small><h2>{page.title}</h2><p>{page.description}</p></Link>)}</div>
  </main></div>;
}
