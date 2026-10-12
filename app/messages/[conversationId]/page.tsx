'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { SessionNotice } from '../../../components/navigation/section-page';
import { useNavigationSession } from '../../../components/navigation/social-shell';
import { subscribeToChat, type ChatLiveStatus, type ChatMessageEvent } from '../../../lib/realtime-client';
import styles from './conversation.module.css';

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
  const [tab, setTab] = useState<'dms' | 'groups'>('dms');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [live, setLive] = useState<ChatLiveStatus>('connecting');
  const [messages, setMessages] = useState<ChatMessageEvent[]>([]);

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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}` },
        body: JSON.stringify({ text }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Your message could not be sent. Please try again.');
      addMessage(data.message);
      setText('');
    } catch (err) {
      setError(err instanceof Error && !(err instanceof TypeError) ? err.message : 'Your message could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.listPanel} aria-label="Conversations">
        <h1 className={styles.heading}>Messages</h1>
        <div className={styles.tabs}>
          <button type="button" className={styles.tab} aria-pressed={tab === 'dms'} onClick={() => setTab('dms')}>DMs</button>
          <button type="button" className={styles.tab} aria-pressed={tab === 'groups'} onClick={() => setTab('groups')}>Groups</button>
        </div>
        <p className={styles.emptyList}>{tab === 'dms' ? 'Your direct messages will appear here.' : 'Your group chats will appear here.'}</p>
      </section>

      <section className={styles.conversation} aria-label="Conversation">
        <header className={styles.header}>
          <span className={styles.avatar} aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /></svg>
          </span>
          <div>
            <h2 className={styles.title}>Conversation</h2>
            <p className={styles.subtitle}><span className={live === 'live' ? styles.dotLive : styles.dot} />{liveLabels[live]}</p>
          </div>
        </header>

        <ol className={styles.messages} aria-live="polite">
          {messages.length === 0
            ? <li className={styles.emptyMessages}>Send a message to start the conversation.</li>
            : messages.map((message) => <li key={message.id} className={styles.message}><p className={styles.bubble}>{message.text}</p></li>)}
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
