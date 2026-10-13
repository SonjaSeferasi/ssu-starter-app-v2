'use client';

import Link from 'next/link';
import { SessionNotice } from '../../components/navigation/section-page';
import { useNavigationSession } from '../../components/navigation/social-shell';
import styles from '../../components/navigation/social-shell.module.css';

// UR-607: each activity has a description and an opening control. DormSpace is available;
// Game 1 and the daily word game are still being built by their feature owner (SS).
const activities = [
  { name: 'DormSpace', href: '/game-room/dormspace', description: 'Decorate your own 2D dorm, walk the DormHall, visit friends’ dorms and leave notes in their guestbooks.' },
  { name: 'Game 1', href: null, description: 'A three-level platform game. Coming soon.' },
  { name: 'Daily word game', href: null, description: 'Guess today’s five-letter word in six tries. Coming soon.' },
];

export default function GameRoomPage() {
  const session = useNavigationSession();
  if (session !== 'signed-in') return <SessionNotice state={session} />;
  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>Your campus, connected</p>
      <h1 className={styles.title}>Game Room</h1>
      <p className={styles.description}>A little break between classes. A little more you.</p>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginTop: 32 }}>
        {activities.map((activity) => (
          <section key={activity.name} className={styles.placeholder} style={{ marginTop: 0 }}>
            <h2>{activity.name}</h2>
            <p>{activity.description}</p>
            {activity.href
              ? <Link href={activity.href} className={styles.action}>Open {activity.name}</Link>
              : <span className={`${styles.action} ${styles.secondaryAction}`} aria-disabled="true">Coming soon</span>}
          </section>
        ))}
      </div>
    </main>
  );
}
