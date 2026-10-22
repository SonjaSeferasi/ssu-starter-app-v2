'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { friendsRequest } from '../../components/friends/client';
import styles from './messages.module.css';

type Friend = { username: string; name: string | null };

// SRS-200.1 (#314): choose a current friend and open the private conversation with them, reusing it if it exists.
// This is the same workflow as the profile and Friends page Message button (POST /api/friends, action "message"),
// which checks the friendship and blocks and finds or creates the conversation on the server (#312, #313).
export function FriendPicker({ onClose, onOpened }: { onClose: () => void; onOpened: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState<string | null>(null);

  // Current friends only (the server excludes blocked and deactivated students); searching waits for a short pause.
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      friendsRequest(`?view=friends&q=${encodeURIComponent(query.trim())}`)
        .then((data) => {
          if (!active) return;
          setFriends(data.students ?? []);
          setHasMore(Boolean(data.hasMore));
          setError('');
        })
        .catch((reason) => {
          if (!active) return;
          setFriends([]);
          setError(reason instanceof Error ? reason.message : 'Friends could not be loaded.');
        });
    }, query ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);

  async function open(username: string) {
    if (opening) return;
    setOpening(username);
    setError('');
    try {
      const data = await friendsRequest('', { action: 'message', username });
      if (!data.conversation_id) throw new Error('This conversation could not be opened.');
      onOpened();
      router.push(`/messages/${encodeURIComponent(data.conversation_id)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'This conversation could not be opened.');
    } finally {
      setOpening(null);
    }
  }

  return (
    <div className={styles.picker}>
      <div className={styles.pickerTop}>
        <label htmlFor="friend-search" className={styles.srOnly}>Search friends</label>
        <input id="friend-search" className={styles.pickerSearch} placeholder="Search friends…" value={query}
          onChange={(event) => setQuery(event.target.value)} autoFocus autoComplete="off" maxLength={100} />
        <button type="button" className={styles.retry} onClick={onClose}>Cancel</button>
      </div>
      {error && <p className={styles.listError} role="alert">{error}</p>}
      {!friends ? (
        <p className={styles.emptyList}>Loading friends…</p>
      ) : friends.length === 0 ? (
        <p className={styles.emptyList}>
          {query.trim() ? 'No friends match that name.' : <>You don’t have any friends yet. <Link href="/friends">Find friends</Link> to start a conversation.</>}
        </p>
      ) : (
        <ul className={styles.conversationList} aria-label="Friends">
          {friends.map((friend) => {
            const name = friend.name?.trim() || friend.username;
            return (
              <li key={friend.username}>
                <button type="button" className={styles.conversationItem} onClick={() => open(friend.username)} disabled={Boolean(opening)}>
                  <span className={styles.itemAvatar} aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
                  <span className={styles.itemText}>
                    <span className={styles.itemName}>{name}</span>
                    <span className={styles.itemLine}><span className={styles.itemPreview}>{opening === friend.username ? 'Opening…' : `@${friend.username}`}</span></span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {hasMore && <p className={styles.pickerHint}>Showing the first 20 friends. Type a name to find others.</p>}
    </div>
  );
}
