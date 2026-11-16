'use client';

import Link from 'next/link';
import { DormSpace3DGame } from '../../../components/dormspace-3d/game';
import { SessionNotice } from '../../../components/navigation/section-page';
import { useNavigationSession } from '../../../components/navigation/social-shell';
import styles from '../../../components/navigation/social-shell.module.css';

// Default DormSpace: the walkable 3D version (Three.js loads lazily inside the game).
export default function DormSpacePage() {
  const session = useNavigationSession();
  if (session !== 'signed-in') return <SessionNotice state={session} />;
  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}><Link href="/game-room">Game Room</Link> / DormSpace</p>
      <DormSpace3DGame />
    </main>
  );
}
