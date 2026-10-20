'use client';

import Link from 'next/link';
import { DormSpaceGame } from '../../../components/dormspace/dormspace-game';
import { DormSpaceBanner } from '../../../components/dormspace/campus-art';
import { SessionNotice } from '../../../components/navigation/section-page';
import { useNavigationSession } from '../../../components/navigation/social-shell';
import styles from '../../../components/navigation/social-shell.module.css';

export default function DormSpacePage() {
  const session = useNavigationSession();
  if (session !== 'signed-in') return <SessionNotice state={session} />;
  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}><Link href="/game-room">Game Room</Link> / DormSpace</p>
      <DormSpaceBanner />
      <DormSpaceGame />
    </main>
  );
}
