'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import shellStyles from '../../../components/navigation/social-shell.module.css';
import styles from '../events.module.css';
import { useNavigationSession } from '../../../components/navigation/social-shell';
import { SessionNotice } from '../../../components/navigation/section-page';
import { InvitationList, useInvitations } from '../../../components/events/MyInvitations';

// Invitations: every upcoming event other students posted at the school, plus the ones a host invited the student to.
// Accept keeps it here as Accepted; Decline removes it from Invitations (the event stays on Events and the Campus Feed).
export default function InvitationsPage() {
  const session = useNavigationSession();
  const { invitations, respond, error } = useInvitations();
  if (session !== 'signed-in') return <SessionNotice state={session} />;

  return (
    <main className={shellStyles.page}>
      <Link href="/events" className={styles.backLink}>
        <ArrowLeft aria-hidden="true" size={16} />
        Back to Events &amp; Trending
      </Link>
      <h1 className={styles.title}>Invitations</h1>
      <p className={styles.subtitle}>Events other students are hosting. Accept to keep one here; decline to remove it from your invitations.</p>
      {error ? <p role="alert" className={styles.alert}>{error}</p> : null}
      <InvitationList invitations={invitations} onRespond={respond} classNames={{
        list: styles.invitationPage, item: styles.invitationPageItem, title: styles.invitationPageTitle,
        meta: styles.invitationMeta, empty: styles.empty, cancelled: styles.cancelledTag,
        actions: styles.inviteActions, accept: styles.inviteAccept, decline: styles.inviteDecline, accepted: styles.inviteAccepted,
      }} />
    </main>
  );
}
