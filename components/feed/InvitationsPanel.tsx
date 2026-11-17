'use client';

import React from 'react';
import Link from 'next/link';
import { InvitationList, useInvitations } from '../events/MyInvitations';

// SRS-402.4: the signed-in student's event invitations beside the feed; each opens its event, with Accept and Decline.
// The title opens the full Invitations page.
export function InvitationsPanel() {
  const { invitations, respond, error } = useInvitations();
  return (
    <section className="rounded-3xl border border-stone-200 bg-white/70 p-5" aria-labelledby="feed-invitations">
      <p id="feed-invitations" className="text-sm font-semibold text-stone-800">
        <Link href="/events/invitations" className="hover:underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#28634e]">📅 You&apos;re invited</Link>
      </p>
      <InvitationList invitations={invitations} onRespond={respond} limit={4} classNames={{
        list: 'mt-2 space-y-1',
        item: 'block rounded-xl px-2 py-1.5 -mx-2 hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#28634e]',
        title: 'block truncate text-xs font-semibold text-stone-700',
        meta: 'block text-xs text-stone-500',
        empty: 'mt-1.5 text-xs leading-relaxed text-stone-500',
        cancelled: 'mr-1.5 rounded-full bg-red-50 px-1.5 py-px text-[11px] font-bold text-red-700',
        actions: 'mb-1 flex gap-1.5',
        accept: 'rounded-lg bg-[#1f6b4f] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#185a42] disabled:opacity-60',
        decline: 'rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] font-bold text-stone-700 hover:bg-stone-200 disabled:opacity-60',
        accepted: 'rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800',
      }} />
      {error ? <p role="alert" className="mt-1 text-xs text-red-700">{error}</p> : null}
      <Link href="/events/invitations" className="mt-2 inline-block text-xs font-semibold text-[#1f6b4f] hover:underline">See all invitations</Link>
    </section>
  );
}
