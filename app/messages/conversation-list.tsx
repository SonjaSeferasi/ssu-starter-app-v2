'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { accessToken } from '../../lib/account/session';
import styles from './messages.module.css';

export type ConversationSummary = {
  id: string;
  kind: 'private' | 'group';
  name: string | null;
  username: string | null;
  member_count: number | null;
  last_message: { text: string; sender_id: string; sent_at: string } | null;
};

// The conversation page announces sent and received messages so the list can refresh its order and previews.
export const CHAT_ACTIVITY_EVENT = 'socialu-chat-activity';

function shortTime(value: string) {
  const date = new Date(value);
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// The Messages column from the UI design, shared by /messages and each conversation page.
// SRS-202.1 (#457): the student's DMs (by friend's name) and groups, newest activity first; selecting one opens it.
export function ConversationListPanel() {
  const router = useRouter();
  const params = useParams<{ conversationId?: string }>();
  const openId = params?.conversationId;
  const [tab, setTab] = useState<'dms' | 'groups'>('dms');
  const [list, setList] = useState<{ me: string; conversations: ConversationSummary[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    const again = () => setRefresh((count) => count + 1);
    window.addEventListener('focus', again);
    window.addEventListener(CHAT_ACTIVITY_EVENT, again);
    return () => { window.removeEventListener('focus', again); window.removeEventListener(CHAT_ACTIVITY_EVENT, again); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const token = await accessToken();
        const response = await fetch('/api/conversations', { headers: { Authorization: `Bearer ${token ?? ''}` }, cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Conversations could not be loaded.');
        const data = await response.json();
        setList({ me: String(data.student_id), conversations: data.conversations ?? [] });
        setFailed(false);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    })();
    return () => controller.abort();
  }, [refresh]);

  // Show the tab that holds the open conversation.
  const openKind = list?.conversations.find((conversation) => conversation.id === openId)?.kind;
  useEffect(() => { if (openKind) setTab(openKind === 'group' ? 'groups' : 'dms'); }, [openKind]);

  // SRS-202.1 (#456): create a group (the creator becomes its owner) and open it right away.
  async function newGroup() {
    if (creating) return;
    setCreating(true);
    setCreateError('');
    try {
      const token = await accessToken();
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ kind: 'group' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.conversation?.id) throw new Error(data.error || 'The group could not be created. Please try again.');
      window.dispatchEvent(new Event(CHAT_ACTIVITY_EVENT));
      router.push(`/messages/${encodeURIComponent(data.conversation.id)}`);
    } catch (err) {
      setCreateError(err instanceof Error && !(err instanceof TypeError) ? err.message : 'The group could not be created. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  const shown = list?.conversations.filter((conversation) => (tab === 'dms' ? conversation.kind === 'private' : conversation.kind === 'group')) ?? [];

  return (
    <section className={styles.listPanel} aria-label="Conversations">
      <h1 className={styles.heading}>Messages</h1>
      <div className={styles.tabs}>
        <button type="button" className={styles.tab} aria-pressed={tab === 'dms'} onClick={() => setTab('dms')}>DMs</button>
        <button type="button" className={styles.tab} aria-pressed={tab === 'groups'} onClick={() => setTab('groups')}>Groups</button>
      </div>
      {tab === 'groups' && (
        <>
          <button type="button" className={styles.newGroup} onClick={newGroup} disabled={creating}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
            {creating ? 'Creating group…' : 'New group'}
          </button>
          {createError && <p className={styles.listError} role="alert">{createError}</p>}
        </>
      )}
      {!list ? (
        <p className={styles.emptyList} role={failed ? 'alert' : undefined}>
          {failed ? <>Conversations could not be loaded. <button type="button" className={styles.retry} onClick={() => setRefresh((count) => count + 1)}>Try again</button></> : 'Loading conversations…'}
        </p>
      ) : shown.length === 0 ? (
        <p className={styles.emptyList}>
          {tab === 'dms' ? 'No direct messages yet. Choose Message on a friend’s profile or on the Friends page to start one.' : 'No group chats yet. Choose New group to create one.'}
        </p>
      ) : (
        <ul className={styles.conversationList}>
          {shown.map((conversation) => {
            const name = conversation.kind === 'private' ? conversation.name ?? 'Student' : 'Group chat';
            const last = conversation.last_message;
            const preview = last
              ? `${last.sender_id === list.me ? 'You: ' : ''}${last.text}`
              : conversation.kind === 'group'
                ? `${conversation.member_count ?? 1} member${conversation.member_count === 1 ? '' : 's'}`
                : 'No messages yet';
            return (
              <li key={conversation.id}>
                <Link href={`/messages/${encodeURIComponent(conversation.id)}`} className={styles.conversationItem}
                  aria-current={conversation.id === openId ? 'page' : undefined}>
                  <span className={styles.itemAvatar} aria-hidden="true">
                    {conversation.kind === 'private' ? name.trim().charAt(0).toUpperCase() : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    )}
                  </span>
                  <span className={styles.itemText}>
                    <span className={styles.itemName}>{name}</span>
                    <span className={styles.itemLine}>
                      <span className={styles.itemPreview}>{preview}</span>
                      {last && <time className={styles.itemTime} dateTime={last.sent_at}>{shortTime(last.sent_at)}</time>}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
