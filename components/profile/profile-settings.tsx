'use client';

import Link from 'next/link';
import { ArrowLeft, ChevronRight, KeyRound, UserRound, Users, Shield } from 'lucide-react';
import { SessionNotice } from '../navigation/section-page';
import { ProfileLogout, useProfileGate } from './profile-view';
import styles from './profile.module.css';
import { DeactivateAccount } from '../friends/deactivate-account';
import { CampusCrushPrivacy } from './campus-crush-privacy';

export function ProfileSettings() {
  const gate = useProfileGate();
  if (gate !== 'ready') return <SessionNotice state={gate} />;

  return <main className={styles.page}>
    <Link href="/profile" className={`${styles.button} ${styles.secondary}`}><ArrowLeft />Back to profile</Link>
    <section className={styles.settingsPanel} aria-labelledby="profile-settings-title">
      <h1 id="profile-settings-title" className={styles.formTitle}>Profile settings</h1>
      <p className={styles.hint}>Manage your profile and account.</p>
      <nav className={styles.settingsLinks} aria-label="Profile settings">
        <Link href="/profile/edit" className={styles.settingsRow}>
          <UserRound aria-hidden="true" />
          <span><strong>Edit profile</strong><small>Update your photo, name, major, class year, and optional bio.</small></span>
          <ChevronRight aria-hidden="true" />
        </Link>
        <Link href="/account/security" className={styles.settingsRow}>
          <KeyRound aria-hidden="true" />
          <span><strong>Change password</strong><small>Keep your account secure with a new password.</small></span>
          <ChevronRight aria-hidden="true" />
        </Link>
        <Link href="/friends" className={styles.settingsRow}><Users aria-hidden="true"/><span><strong>Friends and requests</strong><small>Find friends, respond to requests, and start conversations.</small></span><ChevronRight aria-hidden="true"/></Link>
        <Link href="/friends?view=blocked" className={styles.settingsRow}><Shield aria-hidden="true"/><span><strong>Blocked students</strong><small>Review and manage the students you have blocked.</small></span><ChevronRight aria-hidden="true"/></Link>
      </nav>
      <CampusCrushPrivacy />
      <div className={styles.settingsLogout}>
        <div><h2>Log out</h2><p className={styles.hint}>Sign out of SocialU on this browser.</p></div>
        <ProfileLogout />
      </div>
      <DeactivateAccount />
    </section>
  </main>;
}
