'use client';

import Link from 'next/link';
import { Suspense, useEffect } from 'react';
import { useNavigationSession } from '../components/navigation/social-shell';
import { SessionNotice } from '../components/navigation/section-page';
import { FeedPage } from '../components/feed/FeedPage';
import styles from '../components/navigation/social-shell.module.css';

export default function Home() {
  const session = useNavigationSession();
  useEffect(() => {
    // Email links fall back to the Site URL when their redirect is not allow-listed in Supabase.
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    if (!fragment.get('access_token')) return;
    const target = { recovery: '/reset-password', magiclink: '/verify-email?purpose=reverification', signup: '/verify-email?purpose=signup' }[fragment.get('type') ?? ''];
    window.location.replace(target ? target + window.location.hash : '/');
  }, []);
  // SRS-312.10: FeedPage reads ?post=/&tab= via useSearchParams(), which
  // Next.js requires a Suspense boundary for -- the fallback is skipped in
  // practice almost instantly since this is a client-rendered page.
  if (session === 'signed-in') return <Suspense><FeedPage /></Suspense>;
  if (session !== 'signed-out') return <SessionNotice state={session} />;
  return (
    <main className={styles.standalone}>
      <section className={styles.welcome}>
        <p className={styles.brand}>Social<span>U</span></p>
        <h1 className={styles.title}>Your campus.<br />Your people.</h1>
        <p className={styles.description}>A place to connect with students at your university.</p>
        <div className={styles.welcomeActions}>
          <Link href="/login" className={styles.action}>Log in</Link>
          <Link href="/register" className={`${styles.action} ${styles.secondaryAction}`}>Create account</Link>
        </div>
      </section>
    </main>
  );
}
