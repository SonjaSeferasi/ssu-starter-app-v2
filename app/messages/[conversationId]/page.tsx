'use client';

import Link from 'next/link';
import { storedAccessToken } from '../../../lib/account/session';

import { type FormEvent, useEffect, useState } from 'react';
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
  return session === 'signed-in' ? <Conversation /> : <SessionNotice state={session} />;
}

// SRS-201.1 (#302): send a text message in a conversation, laid out like the Messages UI design.
// Showing this session's sent and live messages confirms the send; loading history is SRS-201.2.
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
  // Temporary (until SRS-201.2 / SRS-211.x): the signed-in student's ID puts their own messages on the right.
  const [myStudentId, setMyStudentId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/profile', { headers: { Authorization: `Bearer ${storedAccessToken() ?? ''}` }, cache: 'no-store', signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (data?.profile?.id) setMyStudentId(String(data.profile.id)); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Keep only this conversation's messages; the ID check stops the send reply and live event both showing.
  function addMessage(message: ChatMessageEvent) {
    if (message.conversation_id !== conversationId) return;
    setMessages((current) => current.some((m) => m.id === message.id) ? current : [...current, message]);
  }

  useEffect(() => subscribeToChat(addMessage, setLive), [conversationId]);

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
            ? <li className={styles.emptyMessages}>Send a message to start the conversation.</li>
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

        <form className={styles.composer} onSubmit={send}>
          <label htmlFor="message-text" className={styles.srOnly}>Message</label>
          <input id="message-text" className={styles.input} value={text} onChange={(event) => setText(event.target.value)}
            placeholder="Message…" maxLength={500} autoComplete="off" disabled={sending} />
          <button type="submit" className={styles.send} disabled={sending || !text.trim()} aria-label="Send message">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7Z" /></svg>
          </button>
        </form>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </section>
    </main>
  );
}
