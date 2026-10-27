'use client';

import { SessionNotice } from '../../components/navigation/section-page';
import { useNavigationSession } from '../../components/navigation/social-shell';
import { useEffect } from 'react';
import { subscribeToChat } from '../../lib/realtime-client';
import { CHAT_ACTIVITY_EVENT, ConversationListPanel } from './conversation-list';
import styles from './messages.module.css';

// Messages home in the UI design's chat layout. Choosing a conversation opens /messages/[conversationId].
export default function MessagesPage() {
  const session = useNavigationSession();
  // SRS-212.4 (#329): a new live message refreshes the list so its unread dot appears without a reload.
  // SRS-202.6 (#844): so does a group being renamed, so the list shows its new name.
  useEffect(() => {
    if (session !== 'signed-in') return;
    const refresh = () => window.dispatchEvent(new Event(CHAT_ACTIVITY_EVENT));
    return subscribeToChat(refresh, () => {}, refresh);
  }, [session]);
  if (session !== 'signed-in') return <SessionNotice state={session} />;
  return (
    <main className={styles.page}>
      <ConversationListPanel />
      <section className={`${styles.conversation} ${styles.emptyConversation}`} aria-label="Conversation">
        <span className={styles.avatar} aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /></svg>
        </span>
        <h2 className={styles.emptyTitle}>Your messages</h2>
        <p className={styles.emptyText}>Choose a conversation to read and send messages.</p>
      </section>
    </main>
  );
}
