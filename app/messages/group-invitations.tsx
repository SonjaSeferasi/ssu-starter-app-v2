'use client';

import { useState } from 'react';
import { accessToken } from '../../lib/account/session';
import styles from './messages.module.css';

export type PendingInvitation = {
  id: string;
  conversation_id: string;
  // SRS-202.6: the group's name, when it has one.
  group_name?: string | null;
  inviter: { username: string; name: string };
  member_count: number;
};

// SRS-205.5 (#491): the invited student's pending group invitations, shown at the top of the Groups tab with
// SRS-205.6 (#495) Accept, which joins the group (SRS-205.7, #793), and SRS-205.8 (#499) Decline.
export function GroupInvitationList({ invitations, onAccepted, onDeclined }: {
  invitations: PendingInvitation[];
  onAccepted: (invitation: PendingInvitation, conversationId: string) => void;
  onDeclined: (invitation: PendingInvitation) => void;
}) {
  const [answering, setAnswering] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function answer(invitation: PendingInvitation, choice: 'accept' | 'decline') {
    if (answering) return;
    setAnswering(invitation.id);
    setError('');
    try {
      const token = await accessToken();
      const response = await fetch(`/api/group-invitations/${encodeURIComponent(invitation.id)}/${choice}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token ?? ''}` },
      });
      const data = await response.json().catch(() => ({}));
      // An invitation that was already answered (here or in another tab) simply leaves the list.
      if (response.status === 404) { onDeclined(invitation); throw new Error(data.error || 'This invitation is no longer available.'); }
      if (!response.ok) throw new Error(data.error || 'Your answer could not be saved. Please try again.');
      if (choice === 'accept') onAccepted(invitation, String(data.conversation_id));
      else onDeclined(invitation);
    } catch (reason) {
      setError(reason instanceof Error && !(reason instanceof TypeError) ? reason.message : 'Your answer could not be saved. Please try again.');
    } finally {
      setAnswering(null);
    }
  }

  if (invitations.length === 0 && !error) return null;
  return (
    <section className={styles.invitations} aria-labelledby="group-invitations-title">
      <h2 id="group-invitations-title" className={styles.invitationsTitle}>Invitations</h2>
      {error && <p className={styles.listError} role="alert">{error}</p>}
      <ul className={styles.invitationList}>
        {invitations.map((invitation) => (
          <li key={invitation.id} className={styles.invitationItem}>
            <span className={styles.itemAvatar} aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            </span>
            <span className={styles.itemText}>
              <span className={styles.itemName}>{invitation.group_name ?? 'Group chat'}</span>
              <span className={styles.itemPreview}>
                {invitation.inviter.name} invited you · {invitation.member_count} member{invitation.member_count === 1 ? '' : 's'}
              </span>
            </span>
            <span className={styles.invitationActions}>
              <button type="button" className={styles.inviteAction} onClick={() => answer(invitation, 'accept')} disabled={Boolean(answering)}>
                {answering === invitation.id ? 'Saving…' : 'Accept'}
              </button>
              <button type="button" className={styles.retry} onClick={() => answer(invitation, 'decline')} disabled={Boolean(answering)}>
                Decline
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
