'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { storedAccessToken } from '../../lib/account/session';
import { formatWhen } from '../../lib/events';

// UR-403: each invitation shows the student's answer.
const RSVP_LABEL: Record<string, string> = { pending: 'Awaiting your reply', attending: 'Accepted', not_attending: 'Declined' };

export type MyInvitation = {
  event_id: string; title: string; location: string; starts_at: string; creator_username: string; rsvp: string;
  // UR-404: cancelled events stay listed with their notice.
  status?: 'active' | 'cancelled'; cancelled_at?: string | null; cancellation_note?: string | null;
  // True when the host invited the student; false for any other event posted at their school.
  invited?: boolean;
};

export type InvitationAnswer = 'attending' | 'not_attending';

// Invitations: what the host sent, plus every upcoming event other students posted at the school.
// Declined ones leave the list (the event itself stays on Events and the Campus Feed).
export const shownInvitations = (invitations: MyInvitation[]) => invitations.filter((invitation) => invitation.rsvp !== 'not_attending');

const canAnswer = (invitation: MyInvitation) => invitation.status !== 'cancelled' && Date.parse(invitation.starts_at) > Date.now();

// Accept (attending) or decline (not_attending) as the signed-in student; returns the saved answer.
export async function answerInvitation(eventId: string, response: InvitationAnswer): Promise<InvitationAnswer> {
  const token = storedAccessToken();
  if (!token) throw new Error('Please sign in again.');
  const result = await fetch(`/api/events/${eventId}/rsvp`, {
    method: 'POST', cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ response }),
  });
  const data = await result.json();
  if (!result.ok) throw new Error(data.error || 'Your answer could not be saved. Please try again.');
  return data.invitation.rsvp;
}

// SRS-402.4: the signed-in student's invitations, each linked to its event, with Accept and Decline.
export function useInvitations() {
  const [invitations, setInvitations] = useState<MyInvitation[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const token = storedAccessToken();
    if (!token) { setInvitations([]); return; }
    const controller = new AbortController();
    fetch('/api/events/invitations', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal })
      .then(async (response) => setInvitations(response.ok ? (await response.json()).invitations : []))
      .catch((err) => { if (err.name !== 'AbortError') setInvitations([]); });
    return () => controller.abort();
  }, []);

  async function respond(eventId: string, response: InvitationAnswer) {
    setError('');
    try {
      const rsvp = await answerInvitation(eventId, response);
      setInvitations((current) => current && current.map((item) => item.event_id === eventId ? { ...item, rsvp } : item));
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return { invitations, respond, error };
}

// Every invitation, declined ones included (the event page uses this to show and change the answer).
export function useMyInvitations() {
  return useInvitations().invitations;
}

type ListClasses = { list: string; item: string; title: string; meta: string; empty: string; cancelled?: string; actions?: string; accept?: string; decline?: string; accepted?: string };

export function InvitationList({ invitations, classNames, onRespond, limit }: {
  invitations: MyInvitation[] | null;
  classNames: ListClasses;
  onRespond?: (eventId: string, response: InvitationAnswer) => Promise<void> | void;
  limit?: number;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  if (invitations === null) return <p className={classNames.empty}>Loading invitations…</p>;
  const shown = shownInvitations(invitations);
  if (shown.length === 0) return <p className={classNames.empty}>No event invitations right now.</p>;

  async function answer(eventId: string, response: InvitationAnswer) {
    if (!onRespond) return;
    setBusy(eventId);
    try { await onRespond(eventId, response); } finally { setBusy(null); }
  }

  return (
    <ul className={classNames.list}>
      {shown.slice(0, limit ?? shown.length).map((invitation) => (
        <li key={invitation.event_id}>
          <Link href={`/events/${invitation.event_id}`} className={classNames.item}>
            <span className={classNames.title}>
              {invitation.status === 'cancelled' ? <span className={classNames.cancelled}>Cancelled</span> : null}
              {invitation.title}
            </span>
            <span className={classNames.meta}>{formatWhen(invitation.starts_at)} · from @{invitation.creator_username}</span>
            {invitation.status === 'cancelled' ? null : <span className={classNames.meta}>{RSVP_LABEL[invitation.rsvp] ?? RSVP_LABEL.pending}</span>}
            {invitation.status === 'cancelled' ? (
              <span className={classNames.meta}>{invitation.cancellation_note ? `Cancelled by the host: “${invitation.cancellation_note}”` : 'The host cancelled this event.'}</span>
            ) : null}
          </Link>
          {onRespond && canAnswer(invitation) ? (
            <div className={classNames.actions} role="group" aria-label={`Answer the invitation to ${invitation.title}`}>
              {invitation.rsvp === 'attending'
                ? <span className={classNames.accepted}>✓ Accepted</span>
                : <button type="button" className={classNames.accept} disabled={busy === invitation.event_id} onClick={() => answer(invitation.event_id, 'attending')}>Accept</button>}
              <button type="button" className={classNames.decline} disabled={busy === invitation.event_id} onClick={() => answer(invitation.event_id, 'not_attending')}>Decline</button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
