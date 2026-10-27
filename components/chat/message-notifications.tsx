'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { MessageCircle, UserCheck, Users, X } from 'lucide-react';
import { accessToken } from '../../lib/account/session';
import { subscribeToChat } from '../../lib/realtime-client';
import type { PendingInvitation } from '../../app/messages/group-invitations';
import { timeAgo } from '../feed/time';
import { Avatar } from '../profile/profile-view';
import styles from '../profile/profile.module.css';

export type MessageNotification = {
  conversation_id: string;
  kind: 'private' | 'group';
  name: string | null;
  sender: { username: string; name: string; photo_url: string | null };
  text: string;
  message_kind: 'text' | 'emoji';
  unread_count: number;
  sent_at: string;
};

async function chatFetch(path: string, init: RequestInit = {}) {
  const token = await accessToken();
  const response = await fetch(path, { ...init, cache: 'no-store', headers: { ...init.headers, Authorization: `Bearer ${token ?? ''}` } });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

// SRS-212.9 (#823): the Messages tab on the Notifications page. Messages the student hasn't seen (their chat wasn't
// open) and pending group invitations (SRS-205.5), kept up to date live through Supabase Realtime: a new message,
// a renamed group or a new invitation refreshes the tab, as does coming back to the window.
export function useMessageNotifications() {
  const [messages, setMessages] = useState<MessageNotification[] | null>(null);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [notes, invites] = await Promise.all([chatFetch('/api/message-notifications'), chatFetch('/api/group-invitations')]);
      if (!notes.response.ok) throw new Error(notes.data.error || 'Unable to load message notifications.');
      setMessages(notes.data.notifications ?? []);
      setInvitations(invites.response.ok ? invites.data.invitations ?? [] : []);
      setError('');
    } catch (reason) {
      setMessages((current) => current ?? []);
      setError(reason instanceof Error && !(reason instanceof TypeError) ? reason.message : 'Unable to load message notifications.');
    }
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => { void load(); };
    window.addEventListener('focus', refresh);
    const stop = subscribeToChat(refresh, () => {}, refresh, refresh);
    return () => { window.removeEventListener('focus', refresh); stop(); };
  }, [load]);

  return { messages, invitations, error, reload: load, count: (messages?.length ?? 0) + invitations.length };
}

export type MessageNotificationsState = ReturnType<typeof useMessageNotifications>;

function preview(item: MessageNotification) {
  const text = item.text.length > 80 ? `${item.text.slice(0, 80)}…` : item.text;
  return item.message_kind === 'emoji' ? text : `“${text}”`;
}

function MessageRow({ item }: { item: MessageNotification }) {
  const href = `/messages/${encodeURIComponent(item.conversation_id)}`;
  const where = item.kind === 'group' ? ` in ${item.name ?? 'a group chat'}` : '';
  const many = item.unread_count > 1 ? ` (${item.unread_count} new)` : '';
  return <li className={`${styles.notificationRow} ${styles.notificationUnread}`}>
    <Link href={href} className={styles.notificationAvatar} aria-label={`Open your conversation with ${item.kind === 'group' ? (item.name ?? 'the group') : item.sender.name}`}>
      <Avatar url={item.sender.photo_url} name={item.sender.name} />
    </Link>
    <div className={styles.notificationBody}>
      <Link href={href} className={styles.notificationName} style={{ display: 'block' }}>
        <span>{item.sender.name}</span>{item.kind === 'group' ? ' sent a message' : ' sent you a message'}{where}{many}.
      </Link>
      <span className={styles.notificationTime}>{preview(item)} · {timeAgo(item.sent_at)}</span>
    </div>
  </li>;
}

function InvitationRow({ invitation, onAnswered }: { invitation: PendingInvitation; onAnswered: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const group = invitation.group_name ?? 'a group chat';

  async function answer(choice: 'accept' | 'decline') {
    setBusy(true); setError('');
    try {
      const { response, data } = await chatFetch(`/api/group-invitations/${encodeURIComponent(invitation.id)}/${choice}`, { method: 'POST' });
      if (!response.ok) throw new Error(data.error || 'Unable to answer this invitation.');
      if (choice === 'accept') router.push(`/messages/${encodeURIComponent(data.conversation_id)}`);
      else onAnswered();
    } catch (reason) {
      setError(reason instanceof Error && !(reason instanceof TypeError) ? reason.message : 'Unable to answer this invitation.');
      setBusy(false);
      onAnswered();
    }
  }

  return <li className={`${styles.notificationRow} ${styles.notificationUnread}`}>
    <span className={styles.notificationAvatar} aria-hidden="true"><span className={styles.avatar}><Users /></span></span>
    <div className={styles.notificationBody}>
      <p><span className={styles.notificationName}>{invitation.inviter.name}</span> invited you to join {group}.</p>
      <span className={styles.notificationTime}>{invitation.member_count} member{invitation.member_count === 1 ? '' : 's'}</span>
      {error && <p className={styles.notificationError} role="alert">{error}</p>}
    </div>
    <div className={styles.notificationActions}>
      <button type="button" className={styles.button} onClick={() => answer('accept')} disabled={busy}><UserCheck />Accept</button>
      <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => answer('decline')} disabled={busy}><X />Decline</button>
    </div>
  </li>;
}

export function MessageNotificationList({ state }: { state: MessageNotificationsState }) {
  const { messages, invitations, error, reload } = state;
  if (error && !messages?.length && !invitations.length) return <p className={`${styles.notice} ${styles.error}`} role="alert">{error}</p>;
  if (!messages) return <div className={styles.skeleton} style={{ height: 160, borderRadius: 16 }} aria-busy="true" />;
  if (!messages.length && !invitations.length) return <div className={styles.empty}>
    <MessageCircle />
    <h2>No message notifications</h2>
    <p>Messages you haven’t seen yet and group invitations will show up here.</p>
  </div>;
  return <ul className={styles.notificationList} aria-live="polite">
    {invitations.map((invitation) => <InvitationRow key={`invitation-${invitation.id}`} invitation={invitation} onAnswered={() => { void reload(); }} />)}
    {messages.map((item) => <MessageRow key={`conversation-${item.conversation_id}`} item={item} />)}
  </ul>;
}
