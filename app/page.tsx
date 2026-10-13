'use client';

import Link from 'next/link';
import { useNavigationSession } from '../components/navigation/social-shell';
import { SectionContent, SessionNotice } from '../components/navigation/section-page';
import styles from '../components/navigation/social-shell.module.css';

export default function Home() {
  const session = useNavigationSession();
  if (session === 'signed-in') return <SectionContent title="Home" description="Your campus. Your people. All in one place." pending="The Campus feed will appear here when the feed feature is ready." />;
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
