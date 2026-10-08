'use client';

import Link from 'next/link';
import { useNavigationSession } from './social-shell';
import styles from './social-shell.module.css';

export function SectionContent({ title, description, pending }: { title: string; description: string; pending: string }) {
  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>Your campus, connected</p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      <section className={styles.placeholder}>
        <h2>Coming soon</h2><p>{pending}</p>
      </section>
    </main>
  );
}

export function SessionNotice({ state }: { state: 'loading' | 'signed-out' | 'unavailable' }) {
  return (
    <main className={styles.standalone}>
      <section className={styles.welcome}>
        <p className={styles.brand}>Social<span>U</span></p>
        {state === 'loading' ? <p className={styles.description} role="status">Checking your session…</p> : <>
          <h1 className={styles.title}>{state === 'unavailable' ? 'Unable to check your session' : 'Your campus is waiting'}</h1>
          <p className={styles.description}>{state === 'unavailable' ? 'Please refresh the page to try again.' : 'Sign in to explore SocialU with your university community.'}</p>
          <Link href="/login" className={styles.action}>Go to login</Link>
        </>}
      </section>
    </main>
  );
}

export function SectionPage(props: { title: string; description: string; pending: string }) {
  const session = useNavigationSession();
  return session === 'signed-in' ? <SectionContent {...props} /> : <SessionNotice state={session} />;
}
