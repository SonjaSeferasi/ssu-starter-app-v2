'use client';

import React from 'react';
import { InvitationList, useMyInvitations } from '../events/MyInvitations';

// SRS-402.4: the signed-in student's event invitations beside the feed; each opens its event.
export function InvitationsPanel() {
  const invitations = useMyInvitations();
  return (
    <section className="rounded-3xl border border-stone-200 bg-white/70 p-5" aria-labelledby="feed-invitations">
      <p id="feed-invitations" className="text-sm font-semibold text-stone-800">📅 You&apos;re invited</p>
      <InvitationList invitations={invitations} classNames={{
        list: 'mt-2 space-y-1',
        item: 'block rounded-xl px-2 py-1.5 -mx-2 hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#28634e]',
        title: 'block truncate text-xs font-semibold text-stone-700',
        meta: 'block text-xs text-stone-500',
        empty: 'mt-1.5 text-xs leading-relaxed text-stone-500',
      }} />
    </section>
  );
}
