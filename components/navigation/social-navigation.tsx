import React from 'react';
import Link from 'next/link';
import { isCurrentDestination, navigationDestinations } from '../../lib/navigation';
import styles from './social-shell.module.css';

type IconName = (typeof navigationDestinations)[number]['icon'];

function NavigationIcon({ name }: { name: IconName }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {name === 'home' && <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />}
      {name === 'messages' && <><path d="M4 3h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-9l-6 4v-4H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M7 10h.01M12 10h.01M17 10h.01" strokeWidth="3" /></>}
      {name === 'game' && <><path d="M7 6h10c3 0 4 4 5 12 .2 2-2 3-3.5 1L16 16H8l-2.5 3C4 21 1.8 20 2 18 3 10 4 6 7 6Z" /><path d="M7 9v6M4 12h6M16 10h.01M19 13h.01" /></>}
      {name === 'events' && <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M7 14h2M15 14h2M7 18h2" /></>}
      {name === 'profile' && <><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2Z" /></>}
    </svg>
  );
}

export function SocialNavigation({ pathname }: { pathname: string }) {
  return (
    <nav className={styles.navigation} aria-label="Main navigation">
      <ul className={styles.destinationList}>
        {navigationDestinations.map(({ label, href, icon }) => (
          <li key={href}>
            <Link href={href} className={styles.destination} aria-current={isCurrentDestination(pathname, href) ? 'page' : undefined}>
              <NavigationIcon name={icon} /><span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className={styles.sidebarNote}>Your campus.<br />Your people.</p>
    </nav>
  );
}

// Also used by the development-only preview; no session or private data lives here.
export function NavigationFrame({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#socialu-content">Skip to content</a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="SocialU home">Social<span>U</span></Link>
        <span className={styles.tagline}>Your campus. Your people.</span>
      </header>
      <SocialNavigation pathname={pathname} />
      <div id="socialu-content" tabIndex={-1} className={styles.content}>{children}</div>
    </div>
  );
}
