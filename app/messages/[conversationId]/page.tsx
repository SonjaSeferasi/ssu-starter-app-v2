'use client';

import Link from 'next/link';
import { accessToken, storedAccessToken } from '../../../lib/account/session';

import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { SessionNotice } from '../../../components/navigation/section-page';
import { useNavigationSession } from '../../../components/navigation/social-shell';
import { subscribeToChat, type ChatConversationEvent, type ChatLiveStatus, type ChatMessageEvent } from '../../../lib/realtime-client';
import { CHAT_ACTIVITY_EVENT, ConversationListPanel } from '../conversation-list';
import { EmojiPicker } from '../emoji-picker';
import { GroupNameForm } from '../group-name';
import { InvitePicker } from '../invite-picker';
import styles from '../messages.module.css';

const liveLabels: Record<ChatLiveStatus, string> = {
  connecting: 'Connecting to live updates…',
  live: 'Live updates on',
  offline: 'Live updates paused',
  'signed-out': 'Sign in again for live updates',
  unavailable: 'Live updates unavailable',
};

export default function ConversationPage() {
  const session = useNavigationSession();
  const { conversationId } = useParams<{ conversationId: string }>();
  // The key starts each conversation with empty state when moving from one chat to another.
  return session === 'signed-in' ? <Conversation key={conversationId} /> : <SessionNotice state={session} />;
}

// Saved history and live events can overlap; keep one copy of each message, oldest first.
function mergeMessages(current: ChatMessageEvent[], incoming: ChatMessageEvent[]) {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => Date.parse(a.sent_at) - Date.parse(b.sent_at) || Number(a.id) - Number(b.id));
}

// SRS-201.1 (#302): send a text message in a conversation, laid out like the Messages UI design.
// SRS-201.2 (#318, #319): show the saved messages on open, then new messages live.
function Conversation() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [text, setText] = useState('');
  const [peer, setPeer] = useState<{name:string;username:string}|null>(null);
  useEffect(() => {
    const controller = new AbortController(); setPeer(null);
    fetch(`/api/conversations/${encodeURIComponent(conversationId)}/peer`, {headers:{Authorization:`Bearer ${storedAccessToken() ?? ''}`},cache:'no-store',signal:controller.signal})
      .then(response => response.ok ? response.json() : null).then(data => { if (!controller.signal.aborted && data?.peer) setPeer(data.peer); }).catch(() => {});
    return () => controller.abort();
  }, [conversationId]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [live, setLive] = useState<ChatLiveStatus>('connecting');
  const [messages, setMessages] = useState<ChatMessageEvent[]>([]);
  // The signed-in student's ID (returned with the history) puts their own messages on the right.
  const [myStudentId, setMyStudentId] = useState<string | null>(null);
  // 'denied' (SRS-213.1, #324): the conversation is missing or the student is not a participant; both look the same.
  const [history, setHistory] = useState<'loading' | 'loaded' | 'failed' | 'denied'>('loading');
  const [historyError, setHistoryError] = useState('');
  const [reload, setReload] = useState(0);
  // #460: the conversation kind, the student's group role, and the member count come with the history.
  // SRS-202.6 (#840): a named group's name comes with the history too.
  const [info, setInfo] = useState<{ kind: 'private' | 'group'; name: string | null; role: string | null; memberCount: number | null } | null>(null);
  // SRS-205.1 (#483): the invite panel, offered only to the group's owner or administrator.
  const [inviting, setInviting] = useState(false);
  const canInvite = info?.kind === 'group' && (info.role === 'owner' || info.role === 'administrator');
  // SRS-202.5 (#836): the same owner or administrator can name the group from its header.
  const [naming, setNaming] = useState(false);
  // SRS-211.1 (#831): sender names by student ID, returned with the history.
  const [senders, setSenders] = useState<Record<string, { name: string; username: string }>>({});
  const sendersRef = useRef<Record<string, { name: string; username: string }> | null>(null);

  // SRS-212.5: mark the messages shown here as read, again when a message arrives while the student is looking
  // at this conversation, and when they come back to the tab. Nothing is marked while the page is hidden.
  const meRef = useRef<string | null>(null);
  const shownRef = useRef(false);
  const marking = useRef(false);
  const markAgain = useRef(false);
  async function markRead() {
    if (!shownRef.current || document.visibilityState !== 'visible') return;
    if (marking.current) { markAgain.current = true; return; }
    marking.current = true;
    try {
      do {
        markAgain.current = false;
        const token = await accessToken();
        const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/read`, { method: 'POST', headers: { Authorization: `Bearer ${token ?? ''}` } });
        // The list refreshes so this conversation's unread dot clears (SRS-212.4).
        if (response.ok) window.dispatchEvent(new Event(CHAT_ACTIVITY_EVENT));
      } while (markAgain.current);
    } catch {
      // Not marked this time; it is tried again on the next message, visit, or return to the tab.
    } finally {
      marking.current = false;
    }
  }

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') void markRead(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [conversationId]);

  // #318: load the saved messages when the conversation opens, when Try again is pressed, and
  // every time live updates (re)connect, so messages sent while the page was offline still appear.
  useEffect(() => {
    const controller = new AbortController();
    setHistory((current) => (current === 'loaded' ? current : 'loading'));
    (async () => {
      try {
        const token = await accessToken();
        const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
          headers: { Authorization: `Bearer ${token ?? ''}` }, cache: 'no-store', signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (response.status === 404) { setHistory('denied'); return; }
        if (!response.ok) throw new Error(data.error || 'Messages could not be loaded.');
        setMyStudentId(String(data.student_id));
        meRef.current = String(data.student_id);
        if (data.kind) setInfo({ kind: data.kind, name: data.name ?? null, role: data.role ?? null, memberCount: data.member_count ?? null });
        if (data.senders) { sendersRef.current = data.senders; setSenders(data.senders); }
        setMessages((current) => mergeMessages(current, data.messages ?? []));
        setHistory('loaded');
        shownRef.current = true;
        void markRead();
        setHistoryError('');
      } catch (err) {
        if (controller.signal.aborted) return;
        setHistory('failed');
        setHistoryError(err instanceof Error && !(err instanceof TypeError) ? err.message : 'Messages could not be loaded.');
      }
    })();
    return () => controller.abort();
  }, [conversationId, reload]);

  // #319: keep only this conversation's messages; merging by ID stops the send reply and live event both showing.
  function addMessage(message: ChatMessageEvent) {
    // Any sent or received message (in any conversation) refreshes the list's order and previews (#457).
    window.dispatchEvent(new Event(CHAT_ACTIVITY_EVENT));
    if (message.conversation_id !== conversationId) return;
    setMessages((current) => mergeMessages(current, [message]));
    if (message.sender_id !== meRef.current) void markRead();
    // SRS-211.1: a member whose name is not loaded yet (for example, someone who just joined) loads the names again.
    if (sendersRef.current && message.sender_id !== meRef.current && !sendersRef.current[message.sender_id]) setReload((count) => count + 1);
  }

  function liveStatus(status: ChatLiveStatus) {
    setLive(status);
    if (status === 'live') setReload((count) => count + 1);
  }

  // SRS-202.6 (#844): a group renamed by its owner or administrator shows the new name right away, here and in the list.
  function renamed(update: ChatConversationEvent) {
    window.dispatchEvent(new Event(CHAT_ACTIVITY_EVENT));
    if (update.conversation_id !== conversationId) return;
    setInfo((current) => current && { ...current, name: update.name });
  }

  // SRS-212.9 (#823): a new group invitation refreshes the list so it appears on the Groups tab.
  const invited = () => window.dispatchEvent(new Event(CHAT_ACTIVITY_EVENT));

  useEffect(() => subscribeToChat(addMessage, liveStatus, renamed, invited), [conversationId]);

  // Show the latest message: on open, after the student's own message, and for new messages while they
  // are already at the bottom. If they scrolled up to read, keep their place and offer a button instead.
  const [atLatest, setAtLatest] = useState(true);
  const [unseen, setUnseen] = useState(0);
  const atLatestRef = useRef(true);
  const shownCount = useRef(0);
  const opened = useRef(false);

  function scrollToLatest(behavior: ScrollBehavior = 'smooth') {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
    setUnseen(0);
  }

  useEffect(() => {
    const onScroll = () => {
      const at = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 120;
      atLatestRef.current = at;
      setAtLatest(at);
      if (at) setUnseen(0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);

  useLayoutEffect(() => {
    const added = messages.length - shownCount.current;
    shownCount.current = messages.length;
    if (added <= 0) return;
    const mine = messages[messages.length - 1].sender_id === myStudentId;
    if (!opened.current) { opened.current = true; scrollToLatest('auto'); }
    else if (mine || atLatestRef.current) scrollToLatest();
    else setUnseen((count) => count + added);
  }, [messages, myStudentId]);

  // Text (SRS-201.1) and emoji (SRS-201.8) messages are sent the same way; the ref stops double-sends
  // before the disabled state shows. Returns whether the message was sent.
  const sendingRef = useRef(false);
  async function deliver(body: { text: string } | { kind: 'emoji'; emoji: string }) {
    if (sendingRef.current) return false;
    sendingRef.current = true;
    setSending(true);
    setError('');
    try {
      // No sender ID is sent: the server reads the sender from the token.
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${storedAccessToken() ?? ''}` },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 404) { setHistory('denied'); return false; }
      if (!response.ok) throw new Error(data.error || 'Your message could not be sent. Please try again.');
      addMessage(data.message);
      setMyStudentId((current) => current ?? data.message.sender_id);
      return true;
    } catch (err) {
      setError(err instanceof Error && !(err instanceof TypeError) ? err.message : 'Your message could not be sent. Please try again.');
      return false;
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    if (await deliver({ text })) setText('');
  }

  // SRS-201.8 (#797): the emoji picker beside the message box; a chosen emoji is sent straight away.
  const [picking, setPicking] = useState(false);
  const emojiButton = useRef<HTMLButtonElement>(null);
  function closePicker() {
    setPicking(false);
    emojiButton.current?.focus();
  }
  function sendEmoji(emoji: string) {
    closePicker();
    void deliver({ kind: 'emoji', emoji });
  }

  // SRS-213.1 (#324): outsiders see the same clear message as for a missing conversation, with no message box.
  if (history === 'denied') {
    return (
      <main className={`${styles.page} ${styles.withConversation}`}>
        <ConversationListPanel />
        <section className={`${styles.conversation} ${styles.unavailable}`} aria-label="Conversation">
          <span className={styles.avatar} aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          </span>
          <h2 className={styles.emptyTitle}>This conversation isn’t available</h2>
          <p className={styles.emptyText}>It may not exist, or you may not be one of its participants.</p>
          <Link href="/messages" className={styles.backLink}>Back to Messages</Link>
        </section>
      </main>
    );
  }

  return (
    <main className={`${styles.page} ${styles.withConversation}`}>
      <ConversationListPanel />

      <section className={styles.conversation} aria-label="Conversation">
        <header className={styles.header}>
          {/* Tablets and phones show one panel at a time, so this returns to the Messages list there. */}
          <Link href="/messages" className={styles.backButton} aria-label="Back to Messages">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
          <span className={styles.avatar} aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /></svg>
          </span>
          <div className={styles.headerText}>
            {canInvite && naming ? (
              <GroupNameForm conversationId={conversationId} current={info.name} onCancel={() => setNaming(false)}
                onSaved={(name) => {
                  setInfo((current) => current && { ...current, name });
                  setNaming(false);
                  // The Messages list refreshes so it shows the new name too.
                  window.dispatchEvent(new Event(CHAT_ACTIVITY_EVENT));
                }} />
            ) : (
              <h2 className={styles.title}>
                {info?.kind === 'group'
                  ? <>
                      {info.name ?? 'Group chat'}
                      {canInvite && (
                        <button type="button" className={styles.renameButton} onClick={() => setNaming(true)} aria-label={info.name ? 'Rename group' : 'Name group'} title={info.name ? 'Rename group' : 'Name group'}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                        </button>
                      )}
                      {info.role === 'owner' && <span className={styles.roleBadge}>Owner</span>}
                    </>
                  : peer ? <Link href={`/students/${encodeURIComponent(peer.username)}`}>{peer.name}</Link> : 'Conversation'}
              </h2>
            )}
            <p className={styles.subtitle}>
              {info?.kind === 'group' && info.memberCount !== null && <>{info.memberCount} member{info.memberCount === 1 ? '' : 's'} ·</>}
              <span className={live === 'live' ? styles.dotLive : styles.dot} />{liveLabels[live]}
            </p>
          </div>
          {canInvite && (
            <button type="button" className={styles.inviteButton} onClick={() => setInviting((open) => !open)} aria-expanded={inviting}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6" /><path d="M22 11h-6" /></svg>
              Invite
            </button>
          )}
          {canInvite && inviting && <InvitePicker conversationId={conversationId} onClose={() => setInviting(false)} />}
          {/* #847: on wide screens the Messages list sits beside the conversation, so this closes it and returns there.
              Tablets and phones use the back button instead. Nothing is changed or deleted. */}
          <Link href="/messages" className={styles.closeButton} aria-label="Close conversation" title="Close conversation">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </Link>
        </header>

        <ol className={styles.messages} aria-live="polite">
          {messages.length === 0
            ? <li className={styles.emptyMessages}>{history === 'loading' ? 'Loading messages…' : history === 'loaded' ? 'Send a message to start the conversation.' : 'No messages to show yet.'}</li>
            : messages.map((message, index) => {
              const mine = message.sender_id === myStudentId;
              // SRS-201.9 (#800): an emoji message is shown larger, without a bubble, on the sender's side.
              const bubble = `${styles.bubble}${mine ? ` ${styles.bubbleOwn}` : ''}${message.kind === 'emoji' ? ` ${styles.emojiBubble}` : ''}`;
              // SRS-211.1 (#831): every message is read out with its sender's name; in groups the name is also
              // shown above each run of messages from another member.
              const sender = mine ? 'You' : senders[message.sender_id]?.name ?? (info?.kind === 'group' ? 'A member' : peer?.name ?? 'Them');
              const showName = info?.kind === 'group' && !mine && messages[index - 1]?.sender_id !== message.sender_id;
              return (
                <li key={message.id} className={mine ? `${styles.message} ${styles.messageOwn}` : styles.message}>
                  {showName && <span className={styles.senderName} aria-hidden="true">{sender}</span>}
                  <p className={bubble}>
                    <span className={styles.srOnly}>{sender}: </span>{message.text}
                  </p>
                </li>
              );
            })}
        </ol>

        <div className={styles.footer}>
          {!atLatest && !picking && (
            <button type="button" className={styles.jump} onClick={() => scrollToLatest()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>
              {unseen > 0 ? `${unseen} new message${unseen === 1 ? '' : 's'}` : 'Jump to latest'}
            </button>
          )}
          {history === 'failed' && (
            <p className={`${styles.error} ${styles.errorAbove}`} role="alert">
              {historyError} <button type="button" className={styles.retry} onClick={() => setReload((count) => count + 1)}>Try again</button>
            </p>
          )}
          {picking && <EmojiPicker disabled={sending} onPick={sendEmoji} onClose={closePicker} />}
          <form className={styles.composer} onSubmit={send}>
            <button ref={emojiButton} type="button" className={styles.emojiToggle} onClick={() => setPicking((open) => !open)}
              aria-expanded={picking} aria-label="Choose an emoji">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01" /><path d="M15 9h.01" /></svg>
            </button>
            <label htmlFor="message-text" className={styles.srOnly}>Message</label>
            <input id="message-text" className={styles.input} value={text} onChange={(event) => setText(event.target.value)}
              placeholder="Message…" maxLength={500} autoComplete="off" disabled={sending} />
            <button type="submit" className={styles.send} disabled={sending || !text.trim()} aria-label="Send message">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7Z" /></svg>
            </button>
          </form>
          {error && <p className={styles.error} role="alert">{error}</p>}
        </div>
      </section>
    </main>
  );
}
