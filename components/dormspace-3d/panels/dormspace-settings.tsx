import Link from 'next/link';
import styles from '../dormspace-3d.module.css';

export function DormSpaceSettings() {
  return (
    <details className={styles.settings} onKeyDown={event => {
      // Keep game shortcuts from firing while a student is using the settings links.
      event.stopPropagation();
      if (event.key === 'Escape' && event.currentTarget.open) {
        event.currentTarget.open = false;
        event.currentTarget.querySelector('summary')?.focus();
      }
    }}>
      <summary className={styles.button} aria-label="DormSpace settings">
        Settings <span aria-hidden="true">▾</span>
      </summary>
      <nav className={styles.settingsPanel} aria-label="DormSpace versions">
        <h3>DormSpace versions</h3>
        <p>3D DormSpace <span>Default</span></p>
        <Link href="/game-room/dormspace/campus" prefetch={false}>Campus version <span>Saved pixel campus</span></Link>
        <Link href="/game-room/dormspace/classic" prefetch={false}>Classic version <span>Saved original pixel DormSpace</span></Link>
        <p>Your room and furniture stay saved when you switch versions.</p>
        <Link href="/game-room/dormspace/art-credits" prefetch={false}>Art credits</Link>
      </nav>
    </details>
  );
}
