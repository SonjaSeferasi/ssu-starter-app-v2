'use client';

import { useEffect, useState } from 'react';
import { storedAccessToken } from '../../lib/account/session';
import { timeAgo } from '../feed/time';
import type { Notification } from '../../lib/notifications';

// SRS-312.10: "Sarah liked your post" / "Sarah and Adam liked your post" /
// "Sarah, Adam and 3 others liked your post" -- matching the example format
// in the SRS text exactly, driven by the grouped actor_names/actor_count
// socialu_list_notifications already computed server-side.
//
// SRS-313: "Sarah commented on your post." / reply notifications
// (additional, not SRS-313-numbered): "Adam replied to your comment." --
// both ungrouped (actor_count is always 1 for these two kinds).
function formatNotification(notification: Notification): string {
  const { kind, actorNames, actorCount } = notification;
  const name = actorNames[0] ?? 'Someone';
  if (kind === 'post_comment') return `${name} commented on your post.`;
  if (kind === 'comment_reply') return `${name} replied to your comment.`;
  if (actorNames.length === 0 || actorCount <= 0) return 'liked your post';
  if (actorCount === 1) return `${name} liked your post`;
  if (actorCount === 2) return `${name} and ${actorNames[1]} liked your post`;
  const others = actorCount - 2;
  return `${name}, ${actorNames[1]} and ${others} other${others === 1 ? '' : 's'} liked your post`;
}

// SRS-312 -- the smallest reusable notification display that fits the
// existing SocialU architecture: no notification UI/infrastructure existed
// anywhere in the codebase before this (confirmed by a full repo search),
// so this is a new, self-contained header control, not an extension of an
// existing one. It reads its own access token (storedAccessToken(), the
// same helper FeedPage already uses) rather than taking one as a prop, so
// it can be dropped into the shared NavigationFrame header without changing
// that component's signature or every page that renders it.
export function NotificationBell() {
  const [token, setToken] = useState('');
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setToken(storedAccessToken() || '');
    const onSessionChange = () => setToken(storedAccessToken() || '');
    window.addEventListener('socialu-session-changed', onSessionChange);
    return () => window.removeEventListener('socialu-session-changed', onSessionChange);
  }, []);

  useEffect(() => {
    if (!open || !token) return;
    setLoading(true);
    setError('');
    fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load notifications.');
        setNotifications(body.notifications);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load notifications.'))
      .finally(() => setLoading(false));
  }, [open, token]);

  if (!token) return null;

  function handleClick(notification: Notification) {
    setOpen(false);
    // SRS-312.10/SRS-313: routes to the post's correct feed tab; FeedPage
    // scrolls to and highlights the post, and (for post_comment/comment_reply,
    // where commentId is set) the specific comment/reply within it too. The
    // recipient is always either the post's own author or the person who
    // was commented on/replied to -- both already see this post in their
    // own feed regardless of Public/Friends Only, so no extra authorization
    // check is needed beyond the feed's own.
    // Plain location navigation rather than next/navigation's useRouter():
    // NavigationFrame (which renders this) is exercised by a plain
    // react-dom/server renderToStaticMarkup in __tests__/navigation.test.ts
    // with no App Router context provider -- useRouter() throws there.
    const tab = notification.visibility === 'friends_only' ? 'friends' : 'for-you';
    const commentParam = notification.commentId ? `&comment=${notification.commentId}` : '';
    window.location.href = `/?post=${notification.postId}&tab=${tab}${commentParam}`;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-100"
      >
        <span aria-hidden="true" className="text-lg">🔔</span>
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 top-11 z-20 max-h-96 w-80 overflow-y-auto rounded-2xl border border-stone-200 bg-white py-2 shadow-lg">
            <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Notifications</p>
            {loading ? (
              <p className="px-4 py-3 text-sm text-stone-400">Loading…</p>
            ) : error ? (
              <p className="px-4 py-3 text-sm text-red-600">{error}</p>
            ) : (notifications ?? []).length === 0 ? (
              <p className="px-4 py-3 text-sm text-stone-400">No notifications yet.</p>
            ) : (
              (notifications ?? []).map((notification) => (
                <button
                  key={`${notification.kind}-${notification.commentId ?? notification.postId}-${notification.latestAt}`}
                  type="button"
                  role="menuitem"
                  onClick={() => handleClick(notification)}
                  className="block w-full px-4 py-2.5 text-left text-sm text-stone-800 transition hover:bg-stone-50"
                >
                  <span className="font-medium">{formatNotification(notification)}</span>
                  <span className="mt-0.5 block text-xs text-stone-400">{timeAgo(notification.latestAt)}</span>
                </button>
              ))
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
