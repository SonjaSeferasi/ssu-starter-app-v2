'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { accessToken } from '../../lib/account/session';
import styles from './messages.module.css';

type Friend = { username: string; name: string; invited: boolean };

// SRS-205.1 (#483): the group's owner or administrator chooses one of their current friends, and
// SRS-205.3 (#487): sends that friend a group invitation. The friend is not a member until they accept (SRS-205.4).
export function InvitePicker({ conversationId, onClose }: { conversationId: string; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState<string | null>(null);

  const url = `/api/conversations/${encodeURIComponent(conversationId)}/invitations`;

  // Friends who can be invited: current friends only, minus anyone already in the group (the server decides).
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const token = await accessToken();
        const response = await fetch(`${url}?q=${encodeURIComponent(query.trim())}`, { headers: { Authorization: `Bearer ${token ?? ''}` }, cache: 'no-store' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Friends could not be loaded.');
        if (!active) return;
        setFriends(data.friends ?? []);
        setHasMore(Boolean(data.has_more));
        setError('');
      } catch (reason) {
        if (!active) return;
        setFriends([]);
        setError(reason instanceof Error && !(reason instanceof TypeError) ? reason.message : 'Friends could not be loaded.');
      }
    }, query ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [query, url]);

  async function invite(username: string) {
    if (sending) return;
    setSending(username);
    setError('');
    try {
      const token = await accessToken();
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ username }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'The invitation could not be sent.');
      setFriends((current) => current?.map((friend) => (friend.username === username ? { ...friend, invited: true } : friend)) ?? current);
    } catch (reason) {
      setError(reason instanceof Error && !(reason instanceof TypeError) ? reason.message : 'The invitation could not be sent.');
    } finally {
      setSending(null);
    }
  }

  return (
    <div className={styles.invitePanel} role="dialog" aria-labelledby="invite-title" onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}>
      <div className={styles.invitePanelTop}>
        <h3 id="invite-title" className={styles.stepTitle}>Invite friends</h3>
        <button type="button" className={styles.retry} onClick={onClose}>Close</button>
      </div>
      <label htmlFor="invite-search" className={styles.srOnly}>Search friends</label>
      <input id="invite-search" className={styles.pickerSearch} placeholder="Search friends…" value={query}
        onChange={(event) => setQuery(event.target.value)} autoFocus autoComplete="off" maxLength={100} />
      {error && <p className={styles.listError} role="alert">{error}</p>}
      {!friends ? (
        <p className={styles.pickerHint}>Loading friends…</p>
      ) : friends.length === 0 ? (
        <p className={styles.pickerHint}>
          {query.trim() ? 'No friends match that name.' : <>No friends to invite. Friends already in this group aren’t shown. <Link href="/friends">Find people</Link></>}
        </p>
      ) : (
        <ul className={styles.inviteList} aria-label="Friends you can invite">
          {friends.map((friend) => (
            <li key={friend.username} className={styles.inviteRow}>
              <span className={styles.itemAvatar} aria-hidden="true">{friend.name.charAt(0).toUpperCase()}</span>
              <span className={styles.itemText}>
                <span className={styles.itemName}>{friend.name}</span>
                <span className={styles.itemPreview}>@{friend.username}</span>
              </span>
              {friend.invited
                ? <span className={styles.invitedBadge}>Invited</span>
                : <button type="button" className={styles.inviteAction} onClick={() => invite(friend.username)} disabled={Boolean(sending)}>
                    {sending === friend.username ? 'Sending…' : 'Invite'}
                  </button>}
            </li>
          ))}
        </ul>
      )}
      {hasMore && <p className={styles.pickerHint}>Showing the first 20 friends. Type a name to find others.</p>}
      <p className={styles.pickerHint}>Invited friends join the group after they accept.</p>
    </div>
  );
}
