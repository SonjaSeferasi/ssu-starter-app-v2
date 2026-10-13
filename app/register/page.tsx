'use client';

import Link from 'next/link';
import { useState } from 'react';
import { User, Mail, Lock } from 'lucide-react';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      });

      const data = await response.json();
      setMessage(response.ok
        ? (data.requiresEmailConfirmation ? 'Check your email to confirm your account, then sign in.' : 'Account created. You can now sign in.')
        : data.error || 'Registration failed.');
    } catch {
      setMessage('Unable to create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const fieldClass = 'flex items-center gap-3 rounded-xl border border-input bg-card px-4 py-3.5 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30';
  const inputClass = 'w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70';

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 pb-8 pt-10 text-foreground" style={{ colorScheme: 'light' }}>
      <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url("/pictures/campus-bg.png"), linear-gradient(135deg, #b4cbbc 0%, #e3e9df 48%, #829e8d 100%)' }} />
      <div aria-hidden="true" className="absolute inset-0 bg-background/40 backdrop-blur-[2px]" />
      <section aria-labelledby="register-title" className="relative w-full max-w-xl rounded-2xl border border-border/60 bg-card/95 px-8 py-12 shadow-2xl shadow-foreground/10 backdrop-blur-md sm:px-14">
        <h1 id="register-title" className="text-center text-5xl font-extrabold tracking-tight text-foreground">Social<span className="text-primary">U</span></h1>
        <p className="mt-3 text-center text-xl font-semibold text-foreground">Your campus. Your people.</p>
        <p className="mt-6 text-center text-sm text-muted-foreground">Create your account with your university email.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4" aria-busy={loading}>
          <label className={fieldClass}>
            <User className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs text-muted-foreground">Username</span>
              <input type="text" name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]{3,30}" title="3–30 letters, numbers, or underscores" className={inputClass} placeholder="your_username" />
            </span>
          </label>
          <label className={fieldClass}>
            <Mail className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs text-muted-foreground">University email</span>
              <input type="email" name="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required className={inputClass} placeholder="you@westbridge.edu" />
            </span>
          </label>
          <label className={fieldClass}>
            <Lock className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs text-muted-foreground">Password</span>
              <input type="password" name="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required className={inputClass} placeholder="At least 8 characters" />
            </span>
          </label>
          {message ? <p role="status" className="rounded-xl border border-border bg-background p-3 text-sm text-foreground">{message}</p> : null}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <div className="my-7 h-px bg-border" />
        <p className="text-center text-sm text-muted-foreground">Already have an account? <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">Sign in</Link></p>
      </section>
      <p className="relative mt-8 text-center text-xs text-foreground">Westbridge University&nbsp;&nbsp;|&nbsp;&nbsp;A more connected campus</p>
    </main>
  );
}
