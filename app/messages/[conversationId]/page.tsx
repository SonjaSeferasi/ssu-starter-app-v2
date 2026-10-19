'use client';

import Link from 'next/link';
import { accessToken, storedAccessToken } from '../../../lib/account/session';

import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { SessionNotice } from '../../../components/navigation/section-page';
import { useNavigationSession } from '../../../components/navigation/social-shell';
import { subscribeToChat, type ChatLiveStatus, type ChatMessageEvent } from '../../../lib/realtime-client';
import { ConversationListPanel } from '../conversation-list';
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
  const [history, setHistory] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const [historyError, setHistoryError] = useState('');
  const [reload, setReload] = useState(0);

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
        if (!response.ok) throw new Error(data.error || 'Messages could not be loaded.');
        setMyStudentId(String(data.student_id));
        setMessages((current) => mergeMessages(current, data.messages ?? []));
        setHistory('loaded');
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
    if (message.conversation_id !== conversationId) return;
    setMessages((current) => mergeMessages(current, [message]));
  }

  function liveStatus(status: ChatLiveStatus) {
    setLive(status);
    if (status === 'live') setReload((count) => count + 1);
  }

  useEffect(() => subscribeToChat(addMessage, liveStatus), [conversationId]);

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

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      // No sender ID is sent: the server reads the sender from the token.
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${storedAccessToken() ?? ''}` },
        body: JSON.stringify({ text }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Your message could not be sent. Please try again.');
      addMessage(data.message);
      setMyStudentId((current) => current ?? data.message.sender_id);
      setText('');
    } catch (err) {
      setError(err instanceof Error && !(err instanceof TypeError) ? err.message : 'Your message could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <main className={`${styles.page} ${styles.withConversation}`}>
      <ConversationListPanel />

      <section className={styles.conversation} aria-label="Conversation">
        <header className={styles.header}>
          <span className={styles.avatar} aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /></svg>
          </span>
          <div>
            <h2 className={styles.title}>{peer ? <Link href={`/students/${encodeURIComponent(peer.username)}`}>{peer.name}</Link> : 'Conversation'}</h2>
            <p className={styles.subtitle}><span className={live === 'live' ? styles.dotLive : styles.dot} />{liveLabels[live]}</p>
          </div>
        </header>

        <ol className={styles.messages} aria-live="polite">
          {messages.length === 0
            ? <li className={styles.emptyMessages}>{history === 'loading' ? 'Loading messages…' : history === 'loaded' ? 'Send a message to start the conversation.' : 'No messages to show yet.'}</li>
            : messages.map((message) => {
              const mine = message.sender_id === myStudentId;
              return (
                <li key={message.id} className={mine ? `${styles.message} ${styles.messageOwn}` : styles.message}>
                  <p className={mine ? `${styles.bubble} ${styles.bubbleOwn}` : styles.bubble}>
                    <span className={styles.srOnly}>{mine ? 'You: ' : 'Them: '}</span>{message.text}
                  </p>
                </li>
              );
            })}
        </ol>

        <div className={styles.footer}>
          {!atLatest && (
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
          <form className={styles.composer} onSubmit={send}>
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
