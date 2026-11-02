'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState, useSyncExternalStore } from 'react';
import { ChevronRight, MessageCircle, UserCheck, Users, X } from 'lucide-react';
import { accessToken } from '../../lib/account/session';
import { subscribeToChat } from '../../lib/realtime-client';
import { CHAT_ACTIVITY_EVENT } from '../../lib/chat-events';
import type { PendingInvitation } from '../../app/messages/group-invitations';
import { timeAgo } from '../feed/time';
import { Avatar } from '../profile/profile-avatar';
import styles from '../profile/profile.module.css';
import own from './message-notifications.module.css';

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

// SRS-212.9 (#823): message notifications, i.e. messages the student hasn't seen (their chat wasn't open) and
// pending group invitations (SRS-205.5). The Messages tab on the Notifications page lists them; the header bell and
// the Messages link show how many there are. All of them share one copy, loaded once and kept up to date live
// through Supabase Realtime: a new message, a renamed group or a new invitation refreshes it, and so does reading a
// conversation (the chat pages announce it) or coming back to the window.
type Snapshot = { messages: MessageNotification[] | null; invitations: PendingInvitation[]; error: string };
const EMPTY: Snapshot = { messages: null, invitations: [], error: '' };
let snapshot = EMPTY;
const watchers = new Set<() => void>();
let loading = false;
let loadAgain = false;
let stopLive: (() => void) | null = null;
let connecting = false;
// Invitations answered in this tab (here or on the Messages page). IDs are never reused, so a load that started
// before the answer cannot bring one back.
const answered = new Set<string>();
const unanswered = (invitations: PendingInvitation[]) => invitations.filter((invitation) => !answered.has(invitation.id));

function publish(next: Snapshot) {
  snapshot = next;
  for (const watcher of [...watchers]) watcher();
}

async function loadOnce() {
  // Signed out: nothing to show, and nothing is asked of the server.
  if (!(await accessToken())) return;
  try {
    const [notes, invites] = await Promise.all([chatFetch('/api/message-notifications'), chatFetch('/api/group-invitations')]);
    // Invitations come from their own list, so they stay correct even if the messages part fails (and stay as they
    // were if their own list fails).
    const invitations = unanswered(invites.response.ok ? invites.data.invitations ?? [] : snapshot.invitations);
    if (!notes.response.ok) {
      publish({ messages: snapshot.messages ?? [], invitations, error: notes.data.error || 'Unable to load message notifications.' });
      return;
    }
    publish({ messages: notes.data.notifications ?? [], invitations, error: '' });
  } catch (reason) {
    publish({ ...snapshot, messages: snapshot.messages ?? [], error: reason instanceof Error && !(reason instanceof TypeError) ? reason.message : 'Unable to load message notifications.' });
  }
}

function connectLive() {
  if (stopLive || connecting || !watchers.size) return;
  connecting = true;
  let usable = true;
  let wasOffline = false;
  const refresh = () => { void reloadMessageNotifications(); };
  const stop = subscribeToChat(refresh, (status) => {
    if (status === 'signed-out' || status === 'unavailable') usable = false;
    else if (status === 'offline') wasOffline = true;
    // Back online after a break: catch up on anything sent meanwhile.
    else if (status === 'live' && wasOffline) { wasOffline = false; refresh(); }
  }, refresh, refresh);
  connecting = false;
  // Not signed in yet: try again on the next refresh.
  if (usable) stopLive = stop;
}

// One load at a time; a refresh asked for during a load runs once more afterwards.
export async function reloadMessageNotifications() {
  connectLive();
  if (loading) { loadAgain = true; return; }
  loading = true;
  try {
    do { loadAgain = false; await loadOnce(); } while (loadAgain);
  } finally {
    loading = false;
  }
}

function onActivity() { void reloadMessageNotifications(); }

// SRS-205.6 / SRS-205.8: an invitation was accepted or declined (or turned out to be answered already). It leaves the
// bell, the Messages link and the Messages tab at once, and the rest is loaded again.
export function forgetInvitation(id: string) {
  answered.add(id);
  publish({ ...snapshot, invitations: unanswered(snapshot.invitations) });
  void reloadMessageNotifications();
}

// The store itself, for React (useMessageNotifications) and for tests.
export function messageNotificationsSnapshot() { return snapshot; }

export function watchMessageNotifications(onChange: () => void) {
  watchers.add(onChange);
  if (watchers.size === 1) {
    window.addEventListener('focus', onActivity);
    window.addEventListener(CHAT_ACTIVITY_EVENT, onActivity);
    void reloadMessageNotifications();
  }
  return () => {
    watchers.delete(onChange);
    if (watchers.size) return;
    window.removeEventListener('focus', onActivity);
    window.removeEventListener(CHAT_ACTIVITY_EVENT, onActivity);
    stopLive?.();
    stopLive = null;
    // Nobody is shown the notifications any more (for example, after signing out): forget them, so the next
    // student on this tab never sees them.
    snapshot = EMPTY;
    answered.clear();
  };
}

export function useMessageNotifications() {
  const { messages, invitations, error } = useSyncExternalStore(watchMessageNotifications, messageNotificationsSnapshot, () => EMPTY);
  return { messages, invitations, error, reload: reloadMessageNotifications, count: (messages?.length ?? 0) + invitations.length };
}

// SRS-212.9: the Messages link's icon, with the number of message notifications in a badge like the bell's.
export function MessageCountIcon({ children }: { children: ReactNode }) {
  const { count } = useMessageNotifications();
  return <span className={own.iconWithCount}>
    {children}
    {count > 0 && <span className={own.count}><span aria-hidden="true">{count > 9 ? '9+' : count}</span><span className={own.srOnly}>{count} unread, </span></span>}
  </span>;
}

export type MessageNotificationsState = ReturnType<typeof useMessageNotifications>;

function preview(item: MessageNotification) {
  const text = item.text.length > 80 ? `${item.text.slice(0, 80)}…` : item.text;
  return item.message_kind === 'emoji' ? text : `“${text}”`;
}

// The whole notification opens the conversation it is about, where the new messages are marked read.
function MessageRow({ item }: { item: MessageNotification }) {
  const href = `/messages/${encodeURIComponent(item.conversation_id)}`;
  const where = item.kind === 'group' ? ` in ${item.name ?? 'a group chat'}` : '';
  const many = item.unread_count > 1 ? ` (${item.unread_count} new)` : '';
  return <li className={`${styles.notificationRow} ${styles.notificationUnread}`}>
    <Link href={href} className={own.rowLink}>
      <span className={styles.notificationAvatar} aria-hidden="true"><Avatar url={item.sender.photo_url} name={item.sender.name} /></span>
      <span className={styles.notificationBody}>
        <span className={`${styles.notificationName} ${own.rowTitle}`}>
          <span>{item.sender.name}</span>{item.kind === 'group' ? ' sent a message' : ' sent you a message'}{where}{many}.
        </span>
        <span className={styles.notificationTime}>{preview(item)} · {timeAgo(item.sent_at)}</span>
      </span>
      <span className={own.open}>Open chat<ChevronRight aria-hidden="true" /></span>
    </Link>
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
      // Already answered (on the Messages page, in another tab or on another device): it simply leaves the list.
      if (response.status === 404) { forgetInvitation(invitation.id); return; }
      if (!response.ok) throw new Error(data.error || 'Unable to answer this invitation.');
      forgetInvitation(invitation.id);
      if (choice === 'accept') router.push(`/messages/${encodeURIComponent(data.conversation_id)}`);
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
  useEffect(() => { void reload(); }, [reload]);
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
