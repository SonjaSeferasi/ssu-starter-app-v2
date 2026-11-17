'use client';

import styles from './activity-error.module.css';

/** A full-page reload also retries a rejected lazy game bundle, which reset alone can cache. */
export function ActivityError({ activity, onRetry }: { activity: string; onRetry?: () => void }) {
  return <main className={styles.page}>
    <section className={styles.card} aria-labelledby="activity-error-title">
      <span className={styles.icon} aria-hidden="true">↻</span>
      <h1 id="activity-error-title">We couldn’t open {activity}</h1>
      <p role="alert">Something interrupted this activity. Retry to open it again, or return to the Game Room to choose another game.</p>
      <p className={styles.note}>Retry reloads this page. Any unfinished attempt may need to be restarted.</p>
      <div className={styles.actions}>
        <button autoFocus onClick={onRetry || (() => window.location.reload())}>Retry</button>
        <a href="/game-room">Return to Game Room</a>
      </div>
    </section>
  </main>;
}
