'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Check } from 'lucide-react';

const e = React.createElement;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [remember, setRemember] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || 'Login failed.');
        return;
      }
      const accessToken = data?.session?.session?.access_token;
      if (!accessToken) {
        setMessage('Sign in did not return a session. Please try again.');
        return;
      }
      const storage = remember ? localStorage : sessionStorage;
      const otherStorage = remember ? sessionStorage : localStorage;
      storage.setItem('access_token', accessToken);
      otherStorage.removeItem('access_token');
      router.push('/profile');
    } catch {
      setMessage('Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const field = (icon, label, inputType, placeholder, value, setValue) =>
    e('label', {
      className: 'flex items-center gap-3 rounded-xl border border-input bg-card px-4 py-3.5 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30',
    },
    e(icon, { className: 'h-5 w-5 shrink-0 text-muted-foreground', 'aria-hidden': true }),
    e('span', { className: 'flex min-w-0 flex-1 flex-col' },
      e('span', { className: 'text-xs text-muted-foreground' }, label),
      e('input', {
        type: inputType,
        name: inputType,
        autoComplete: inputType === 'password' ? 'current-password' : 'username',
        required: true,
        value,
        placeholder,
        onChange: (event) => setValue(event.target.value),
        className: 'w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70',
      })
    ));

  return e('main', {
    className: 'relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 pb-8 pt-10 text-foreground',
    style: { colorScheme: 'light' },
  },
  // Campus photograph.
  e('div', {
    'aria-hidden': true,
    className: 'absolute inset-0 bg-cover bg-center',
    style: { backgroundImage: 'url("/pictures/campus-bg.png"), linear-gradient(135deg, #b4cbbc 0%, #e3e9df 48%, #829e8d 100%)' },
  }),
  e('div', { className: 'absolute inset-0 bg-background/40 backdrop-blur-[2px]', 'aria-hidden': true }),
  e('section', {
    'aria-labelledby': 'login-title',
    className: 'relative w-full max-w-xl rounded-2xl border border-border/60 bg-card/95 px-8 py-12 shadow-2xl shadow-foreground/10 backdrop-blur-md sm:px-14',
  },
    e('h1', { id: 'login-title', className: 'text-center text-5xl font-extrabold tracking-tight text-foreground' },
      'Social', e('span', { className: 'text-primary' }, 'U')),
    e('p', { className: 'mt-3 text-center text-xl font-semibold text-foreground' }, 'Your campus. Your people.'),
    e('p', { className: 'mt-6 text-center text-sm text-muted-foreground' }, 'Verify your student status with your university email.'),
    e('form', { className: 'mt-8 space-y-4', onSubmit: handleSubmit, 'aria-busy': loading },
      field(Mail, 'University email', 'email', 'you@westbridge.edu', email, setEmail),
      field(Lock, 'Password', 'password', '••••••••••', password, setPassword),
      e('div', { className: 'flex flex-wrap items-center justify-between gap-3 pt-1' },
        e('label', { className: 'flex cursor-pointer items-center gap-2 text-sm text-foreground' },
          e('input', {
            type: 'checkbox', name: 'remember', checked: remember,
            onChange: (event) => setRemember(event.target.checked),
            className: 'peer sr-only',
          }),
          e('span', {
            'aria-hidden': true,
            className: 'flex h-5 w-5 items-center justify-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 ' +
              (remember ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card'),
          }, remember ? e(Check, { className: 'h-3.5 w-3.5' }) : null),
          'Remember me'),
        e('button', {
          type: 'button',
          onClick: () => setMessage('Password reset is not available yet.'),
          className: 'text-sm text-muted-foreground transition-colors hover:text-foreground',
        }, 'Forgot password?')
      ),
      message ? e('p', { role: 'status', className: 'rounded-xl border border-border bg-background p-3 text-sm text-foreground' }, message) : null,
      e('button', {
        type: 'submit', disabled: loading,
        className: 'w-full rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70',
      }, loading ? 'Signing in…' : 'Sign in')
    ),
    e('div', { className: 'my-7 h-px bg-border' }),
    e('p', { className: 'text-center text-sm text-muted-foreground' }, 'New to SocialU? ',
      e(Link, { href: '/register', className: 'font-medium text-foreground underline-offset-4 hover:underline' }, 'Create account'))
  ),
  e('p', { className: 'relative mt-8 text-center text-xs text-foreground' },
    'Westbridge University\u00a0\u00a0|\u00a0\u00a0A more connected campus')
  );
}
