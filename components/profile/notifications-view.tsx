'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, MessageCircle, UserCheck, UserPlus, X } from 'lucide-react';
import { MessageNotificationList, useMessageNotifications } from '../chat/message-notifications';
import { timeAgo } from '../feed/time';
import { SessionNotice } from '../navigation/section-page';
import { useNavigationSession } from '../navigation/social-shell';
import { Avatar, profileFetch } from './profile-view';
import styles from './profile.module.css';

type NotificationItem = {
  notification_id: number;
  kind: 'friend_request' | 'friendship_accepted' | 'post_like' | 'post_comment' | 'comment_reply' | 'mention' | 'repost' | 'whisper_comment';
  created_at: string;
  read_at: string | null;
  actor_username: string;
  actor_name: string;
  actor_photo_url: string | null;
  request_status: 'pending' | 'accepted' | 'declined' | 'canceled' | 'blocked' | null;
  // SRS-312/313 (post_like/post_comment/comment_reply only; null for friend kinds).
  post_id: number | null;
  comment_id: number | null;
  visibility: 'public' | 'friends_only' | null;
  actor_count: number | null;
  actor_names: string[] | null;
};

// SRS-312.10: "Sarah liked your post" / "Sarah and Adam liked your post" /
// "Sarah, Adam and 3 others liked your post", driven by the grouped
// actor_names/actor_count socialu_notifications computes server-side.
// SRS-313 (plus reply notifications, additional functionality): both
// ungrouped (actor_count is always 1 for these two kinds).
function feedNotificationText(item: NotificationItem): string {
  const names = item.actor_names ?? [item.actor_name];
  const count = item.actor_count ?? 1;
  const name = names[0] ?? item.actor_name;
  if (item.kind === 'post_comment') return ' commented on your post.';
  if (item.kind === 'comment_reply') return ' replied to your comment.';
  if (item.kind === 'mention') return item.comment_id ? ' mentioned you in a comment.' : ' mentioned you in a post.';
  if (item.kind === 'repost') return ' reposted your post.';
  // The Whisper Wall (additional functionality): no actor identity is ever
  // revealed for this kind (see socialu_notifications' whisper_comment_items
  // CTE) -- actor_name is always null here, so this is a standalone sentence,
  // not a "<name> did X" suffix like every other kind above.
  if (item.kind === 'whisper_comment') return 'Someone commented on your confession.';
  if (count <= 1) return ' liked your post.';
  if (count === 2) return ` and ${names[1]} liked your post.`;
  const others = count - 2;
  return `, ${names[1]} and ${others} other${others === 1 ? '' : 's'} liked your post.`;
}

function feedNotificationHref(item: NotificationItem): string {
  // The Whisper Wall (additional functionality): opens the tab, not a
  // specific confession -- there's no per-confession deep link/scroll
  // target in this version (confessions have no stable DOM anchor the way
  // posts do), only "go see your confessions."
  if (item.kind === 'whisper_comment') return '/?tab=whispers';
  const tab = item.visibility === 'friends_only' ? 'friends' : 'for-you';
  const commentParam = item.comment_id ? `&comment=${item.comment_id}` : '';
  return `/?post=${item.post_id}&tab=${tab}${commentParam}`;
}

function NotificationRow({ item, onAnswered }: { item: NotificationItem; onAnswered: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const profileHref = `/students/${encodeURIComponent(item.actor_username)}`;
  const isFriendKind = item.kind === 'friend_request' || item.kind === 'friendship_accepted';

  async function answer(action: 'accept' | 'decline') {
    setBusy(true); setError('');
    try {
      const relation = await profileFetch(`/api/friends?view=relation&username=${encodeURIComponent(item.actor_username)}`);
      if (!relation.response.ok) throw new Error(relation.data.error || 'Unable to load this request.');
      const result = await profileFetch('/api/friends', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: item.actor_username, action, requestId: relation.data.request_id }) });
      if (!result.response.ok) throw new Error(result.data.error || 'Unable to answer this request.');
      window.dispatchEvent(new Event('socialu-notifications-changed'));
      onAnswered();
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to answer this request.'); setBusy(false); }
  }

  const pending = item.kind === 'friend_request' && item.request_status === 'pending';
  const text = isFriendKind
    ? (item.kind === 'friendship_accepted' ? ' accepted your friend request.'
       : pending ? ' sent you a friend request.' : ' sent you a friend request. You are now friends.')
    : feedNotificationText(item);
  return <li className={`${styles.notificationRow} ${item.read_at ? '' : styles.notificationUnread}`}>
    <Link href={profileHref} className={styles.notificationAvatar} aria-label={`View ${item.actor_name}'s profile`}>
      <Avatar url={item.actor_photo_url} name={item.actor_name} />
    </Link>
    <div className={styles.notificationBody}>
      {isFriendKind
        ? <p><Link href={profileHref} className={styles.notificationName}>{item.actor_name}</Link>{text}</p>
        : <Link href={feedNotificationHref(item)} className={styles.notificationName} style={{ display: 'block' }}>
            <span>{item.actor_name}</span>{text}
          </Link>}
      <span className={styles.notificationTime}>{timeAgo(item.created_at)}</span>
      {error && <p className={styles.notificationError} role="alert">{error}</p>}
    </div>
    {pending && <div className={styles.notificationActions}>
      <button type="button" className={styles.button} onClick={() => answer('accept')} disabled={busy}><UserCheck />Accept</button>
      <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => answer('decline')} disabled={busy}><X />Decline</button>
    </div>}
  </li>;
}

// SRS-212.9 (LP, Chat): 'messages' shows message notifications and group invitations from Chat.
type Tab = 'general' | 'friends' | 'messages';

function NotificationsContent() {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('general');
  const firstLoad = useRef(true);
  // SRS-212.9 (LP, Chat): loaded from Chat's own endpoints and kept up to date live; nothing above changes.
  const messages = useMessageNotifications();
  // SRS-212.9 (LP, Chat): the bell links to ?tab=messages when only message notifications are new.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') !== 'messages') return;
    firstLoad.current = false;
    setTab('messages');
  }, []);

  const load = useCallback(() => {
    profileFetch('/api/notifications')
      .then(({ response, data }) => {
        if (!response.ok) throw new Error(data.error || 'Unable to load notifications.');
        const list: NotificationItem[] = data.notifications;
        // First load: open on Friend requests when that is where the new items are.
        if (firstLoad.current && list.some(item => item.kind === 'friend_request' && item.request_status === 'pending')
          && !list.some(item => item.kind !== 'friend_request' && !item.read_at)) setTab('friends');
        firstLoad.current = false;
        setItems(list); setError('');
        // Seeing the list counts as reading it, so the bell badge clears.
        if (data.unread > 0) return profileFetch('/api/notifications', { method: 'POST' })
          .then(() => { window.dispatchEvent(new Event('socialu-notifications-changed')); }, () => undefined);
      })
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Unable to load notifications.'));
  }, []);
  useEffect(load, [load]);

  // Friend requests get their own tab; everything else is a general notification.
  const requests = items?.filter(item => item.kind === 'friend_request') ?? [];
  const general = items?.filter(item => item.kind !== 'friend_request') ?? [];
  const pendingCount = requests.filter(item => item.request_status === 'pending').length;
  const shown = tab === 'friends' ? requests : general;

  return <main className={styles.page}>
    <h1 className={styles.name} style={{ marginBottom: 16 }}>Notifications</h1>
    <div className={styles.tabs} role="tablist" aria-label="Notification type">
      <button type="button" role="tab" className={styles.tab} aria-selected={tab === 'general'} onClick={() => setTab('general')}><Bell />Notifications</button>
      <button type="button" role="tab" className={styles.tab} aria-selected={tab === 'friends'} onClick={() => setTab('friends')}>
        <UserPlus />Friend requests{pendingCount > 0 && <span className={styles.tabCount}>{pendingCount}</span>}
      </button>
      <button type="button" role="tab" className={styles.tab} aria-selected={tab === 'messages'} onClick={() => setTab('messages')}>
        <MessageCircle />Messages{messages.count > 0 && <span className={styles.tabCount}>{messages.count}</span>}
      </button>
    </div>
    <div role="tabpanel" style={{ marginTop: 16 }}>
      {tab === 'messages' ? <MessageNotificationList state={messages} />
        : error ? <p className={`${styles.notice} ${styles.error}`} role="alert">{error}</p>
        : !items ? <div className={styles.skeleton} style={{ height: 160, borderRadius: 16 }} aria-busy="true" />
        : !shown.length ? <div className={styles.empty}>
          {tab === 'friends' ? <UserPlus /> : <Bell />}
          <h2>{tab === 'friends' ? 'No friend requests' : 'No notifications yet'}</h2>
          <p>{tab === 'friends' ? 'When someone sends you a friend request, it will show up here.' : 'Accepted friend requests, likes, comments, and mentions will show up here.'}</p>
        </div>
        : <ul className={styles.notificationList}>{shown.map(item => <NotificationRow key={item.notification_id} item={item} onAnswered={load} />)}</ul>}
    </div>
  </main>;
}

export function NotificationsView() {
  const session = useNavigationSession();
  return session === 'signed-in' ? <NotificationsContent /> : <SessionNotice state={session} />;
}
