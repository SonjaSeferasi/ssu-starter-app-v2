import { notFound } from 'next/navigation';
import { NavigationFrame } from '../../../components/navigation/social-navigation';
import styles from '../../../components/navigation/social-shell.module.css';

// A visual-review fixture only. No account data; unavailable in production.
export default function NavigationPreview() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return (
    <NavigationFrame pathname="/game-room">
      <main className={styles.page}>
        <p className={styles.eyebrow}>Development preview · UR-600</p>
        <h1 className={styles.title}>Game Room</h1>
        <p className={styles.description}>Review the shared SocialU navigation, using the mint palette and sidebar layout from the UI designs.</p>
        <section className={styles.placeholder}>
          <h2>Five destinations. One campus.</h2>
          <p>This preview selects Game Room. The navigation links open the real app routes, which require a signed-in session. Events and Trending share one destination.</p>
        </section>
      </main>
    </NavigationFrame>
  );
}
