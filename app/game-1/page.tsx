'use client';

import Link from 'next/link';
import { useNavigationSession } from '../../components/navigation/social-shell';
import { SessionNotice } from '../../components/navigation/section-page';
import { ActivityArt } from '../../components/game-room/activity-art';
import styles from './entry.module.css';

// GitHub #43 / SRS-607.2: real activity entry view; gameplay is a separate task.
// An avatar is not required to enter. This menu does not record participation.
export default function Game1EntryPage() {
  const session = useNavigationSession();
  if (session !== 'signed-in') return <SessionNotice state={session} />;
  return <main className={styles.page}>
    <Link href="/game-room" className={styles.back}>← Back to Game Room</Link>
    <section className={styles.card} aria-labelledby="game-title">
      <div className={styles.art}><ActivityArt code="game1" /></div>
      <p className={styles.eyebrow}>Platform challenge</p>
      <h1 id="game-title">Game 1</h1>
      <p>Jump across platforms, avoid hazards, collect optional coins, and reach the finish flag.</p>
      <p>You can enter without customizing an avatar or uploading a photograph.</p>
      <div className={styles.status} role="status"><strong>Gameplay is not available yet.</strong><p>Return to the Game Room to choose another activity.</p></div>
      <Link href="/game-room" className={styles.return}>Back to Game Room</Link>
    </section>
  </main>;
}
