'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { accessToken } from '../../lib/account/session';
import { CHAT_ACTIVITY_EVENT } from '../../lib/chat-events';
import { FriendPicker } from './friend-picker';
import { GroupInvitationList, type PendingInvitation } from './group-invitations';
import styles from './messages.module.css';

export type ConversationSummary = {
  id: string;
  kind: 'private' | 'group';
  name: string | null;
  username: string | null;
  member_count: number | null;
  // SRS-212.4 (#328): true when another participant's message is still unread for this student.
  unread?: boolean;
  last_message: { text: string; sender_id: string; sent_at: string } | null;
};

// The conversation page announces sent and received messages so the list can refresh its order and previews.
export { CHAT_ACTIVITY_EVENT };

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
  // SRS-200.1 (#314): choosing a friend to message replaces the DM list while open.
  const [picking, setPicking] = useState(false);
  // SRS-202.1 (#456): New group first shows a confirmation step; only Create group creates it.
  const [confirmingGroup, setConfirmingGroup] = useState(false);
  // SRS-205.5 (#491): pending group invitations, refreshed with the list (focus and chat activity).
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);

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

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const token = await accessToken();
        const response = await fetch('/api/group-invitations', { headers: { Authorization: `Bearer ${token ?? ''}` }, cache: 'no-store', signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        setInvitations(data.invitations ?? []);
      } catch {
        // Invitations stay as they were; they are loaded again on the next refresh.
      }
    })();
    return () => controller.abort();
  }, [refresh]);

  // SRS-205.6 / SRS-205.7: after accepting, the student is a member, so the group opens and the list refreshes.
  function joined(invitation: PendingInvitation, conversationId: string) {
    setInvitations((current) => current.filter((item) => item.id !== invitation.id));
    window.dispatchEvent(new Event(CHAT_ACTIVITY_EVENT));
    router.push(`/messages/${encodeURIComponent(conversationId)}`);
  }

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
      setConfirmingGroup(false);
      router.push(`/messages/${encodeURIComponent(data.conversation.id)}`);
    } catch (err) {
      setCreateError(err instanceof Error && !(err instanceof TypeError) ? err.message : 'The group could not be created. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  // SRS-212.4 (#329): the open conversation is being read, so it never shows as unread here.
  const unreadIn = (kind: ConversationSummary['kind']) =>
    Boolean(list?.conversations.some((conversation) => conversation.kind === kind && conversation.unread && conversation.id !== openId));

  const shown = list?.conversations.filter((conversation) => (tab === 'dms' ? conversation.kind === 'private' : conversation.kind === 'group')) ?? [];

  return (
    <section className={styles.listPanel} aria-label="Conversations">
      <h1 className={styles.heading}>Messages</h1>
      <div className={styles.tabs}>
        <button type="button" className={styles.tab} aria-pressed={tab === 'dms'} onClick={() => { setTab('dms'); setPicking(false); setConfirmingGroup(false); }}>
          DMs{unreadIn('private') && <><span className={styles.tabDot} aria-hidden="true" /><span className={styles.srOnly}> (unread)</span></>}
        </button>
        <button type="button" className={styles.tab} aria-pressed={tab === 'groups'} onClick={() => { setTab('groups'); setPicking(false); setConfirmingGroup(false); }}>
          Groups{(unreadIn('group') || invitations.length > 0) && <><span className={styles.tabDot} aria-hidden="true" /><span className={styles.srOnly}>{unreadIn('group') ? ' (unread)' : ' (new invitations)'}</span></>}
        </button>
      </div>
      {tab === 'dms' && !picking && (
        <button type="button" className={styles.newGroup} onClick={() => setPicking(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
          New message
        </button>
      )}
      {tab === 'groups' && !confirmingGroup && (
        <GroupInvitationList invitations={invitations} onAccepted={joined}
          onDeclined={(invitation) => setInvitations((current) => current.filter((item) => item.id !== invitation.id))} />
      )}
      {tab === 'groups' && !confirmingGroup && (
        <button type="button" className={styles.newGroup} onClick={() => { setCreateError(''); setConfirmingGroup(true); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
          New group
        </button>
      )}
      {/* #483: a way to search for people and send friend requests on the Friends page before inviting them. */}
      {!picking && !confirmingGroup && (
        <Link href="/friends" className={styles.findPeople}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          Find people
        </Link>
      )}
      {tab === 'groups' && confirmingGroup ? (
        <div className={styles.picker} role="group" aria-labelledby="new-group-title">
          <h2 id="new-group-title" className={styles.stepTitle}>Create a group chat?</h2>
          <p className={styles.stepText}>You’ll be the group’s owner and its first member, and the group opens right away so you can send the first message. Then choose Invite in the group to invite your friends.</p>
          {createError && <p className={styles.listError} role="alert">{createError}</p>}
          <div className={styles.stepActions}>
            <button type="button" className={styles.newGroup} onClick={newGroup} disabled={creating}>{creating ? 'Creating group…' : 'Create group'}</button>
            <button type="button" className={styles.retry} onClick={() => { setConfirmingGroup(false); setCreateError(''); }} disabled={creating}>Cancel</button>
          </div>
        </div>
      ) : tab === 'dms' && picking ? (
        <FriendPicker onClose={() => setPicking(false)} onOpened={() => { setPicking(false); window.dispatchEvent(new Event(CHAT_ACTIVITY_EVENT)); }} />
      ) : !list ? (
        <p className={styles.emptyList} role={failed ? 'alert' : undefined}>
          {failed ? <>Conversations could not be loaded. <button type="button" className={styles.retry} onClick={() => setRefresh((count) => count + 1)}>Try again</button></> : 'Loading conversations…'}
        </p>
      ) : shown.length === 0 ? (
        <p className={styles.emptyList}>
          {tab === 'dms' ? 'No direct messages yet. Choose New message to start one with a friend.' : 'No group chats yet. Choose New group to create one.'}
        </p>
      ) : (
        <ul className={styles.conversationList}>
          {shown.map((conversation) => {
            // SRS-202.6 (#840): named groups show their name; others show "Group chat".
            const name = conversation.name ?? (conversation.kind === 'private' ? 'Student' : 'Group chat');
            const last = conversation.last_message;
            const unread = Boolean(conversation.unread) && conversation.id !== openId;
            const preview = last
              ? `${last.sender_id === list.me ? 'You: ' : ''}${last.text}`
              : conversation.kind === 'group'
                ? `${conversation.member_count ?? 1} member${conversation.member_count === 1 ? '' : 's'}`
                : 'No messages yet';
            return (
              <li key={conversation.id}>
                <Link href={`/messages/${encodeURIComponent(conversation.id)}`} className={unread ? `${styles.conversationItem} ${styles.itemUnread}` : styles.conversationItem}
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
                      {unread && <span className={styles.unreadDot}><span className={styles.srOnly}>Unread messages</span></span>}
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
