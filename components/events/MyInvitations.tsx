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
};

// SRS-402.4: invitations sent to the signed-in student, each linked to its event; cancelled ones say so (UR-404).
export function useMyInvitations() {
  const [invitations, setInvitations] = useState<MyInvitation[] | null>(null);
  useEffect(() => {
    const token = storedAccessToken();
    if (!token) { setInvitations([]); return; }
    const controller = new AbortController();
    fetch('/api/events/invitations', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal })
      .then(async (response) => setInvitations(response.ok ? (await response.json()).invitations : []))
      .catch((err) => { if (err.name !== 'AbortError') setInvitations([]); });
    return () => controller.abort();
  }, []);
  return invitations;
}

export function InvitationList({ invitations, classNames }: {
  invitations: MyInvitation[] | null;
  classNames: { list: string; item: string; title: string; meta: string; empty: string; cancelled?: string };
}) {
  if (invitations === null) return <p className={classNames.empty}>Loading invitations…</p>;
  if (invitations.length === 0) return <p className={classNames.empty}>No event invitations right now.</p>;
  return (
    <ul className={classNames.list}>
      {invitations.map((invitation) => (
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
        </li>
      ))}
    </ul>
  );
}
