'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Bell, UserCheck, X } from 'lucide-react';
import { timeAgo } from '../feed/time';
import { SessionNotice } from '../navigation/section-page';
import { useNavigationSession } from '../navigation/social-shell';
import { Avatar, friendAction, profileFetch } from './profile-view';
import styles from './profile.module.css';

type FriendNotification = {
  notification_id: number;
  kind: 'friend_request' | 'friendship_accepted';
  created_at: string;
  read_at: string | null;
  actor_username: string;
  actor_name: string;
  actor_photo_url: string | null;
  request_status: 'pending' | 'accepted' | 'declined' | 'canceled' | 'blocked' | null;
};

function NotificationRow({ item, onAnswered }: { item: FriendNotification; onAnswered: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const profileHref = `/students/${encodeURIComponent(item.actor_username)}`;

  async function answer(action: 'accept' | 'decline') {
    setBusy(true); setError('');
    try { await friendAction(item.actor_username, action); onAnswered(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to answer this request.'); setBusy(false); }
  }

  const pending = item.kind === 'friend_request' && item.request_status === 'pending';
  const text = item.kind === 'friendship_accepted' ? ' accepted your friend request.'
    : pending ? ' sent you a friend request.' : ' sent you a friend request. You are now friends.';
  return <li className={`${styles.notificationRow} ${item.read_at ? '' : styles.notificationUnread}`}>
    <Link href={profileHref} className={styles.notificationAvatar} aria-label={`View ${item.actor_name}'s profile`}>
      <Avatar url={item.actor_photo_url} name={item.actor_name} />
    </Link>
    <div className={styles.notificationBody}>
      <p><Link href={profileHref} className={styles.notificationName}>{item.actor_name}</Link>{text}</p>
      <span className={styles.notificationTime}>{timeAgo(item.created_at)}</span>
      {error && <p className={styles.notificationError} role="alert">{error}</p>}
    </div>
    {pending && <div className={styles.notificationActions}>
      <button type="button" className={styles.button} onClick={() => answer('accept')} disabled={busy}><UserCheck />Accept</button>
      <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => answer('decline')} disabled={busy}><X />Decline</button>
    </div>}
  </li>;
}

function NotificationsContent() {
  const [items, setItems] = useState<FriendNotification[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    profileFetch('/api/notifications')
      .then(({ response, data }) => {
        if (!response.ok) throw new Error(data.error || 'Unable to load notifications.');
        setItems(data.notifications); setError('');
        // Seeing the list counts as reading it, so the bell badge clears.
        if (data.unread > 0) return profileFetch('/api/notifications', { method: 'POST' })
          .then(() => { window.dispatchEvent(new Event('socialu-notifications-changed')); }, () => undefined);
      })
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Unable to load notifications.'));
  }, []);
  useEffect(load, [load]);

  return <main className={styles.page}>
    <h1 className={styles.name} style={{ marginBottom: 16 }}>Notifications</h1>
    {error ? <p className={`${styles.notice} ${styles.error}`} role="alert">{error}</p>
      : !items ? <div className={styles.skeleton} style={{ height: 160, borderRadius: 16 }} aria-busy="true" />
      : !items.length ? <div className={styles.empty}><Bell /><h2>No notifications yet</h2><p>Friend requests and accepted requests will show up here.</p></div>
      : <ul className={styles.notificationList}>{items.map(item => <NotificationRow key={item.notification_id} item={item} onAnswered={load} />)}</ul>}
  </main>;
}

export function NotificationsView() {
  const session = useNavigationSession();
  return session === 'signed-in' ? <NotificationsContent /> : <SessionNotice state={session} />;
}
