'use client';

import { SessionNotice } from '../../components/navigation/section-page';
import { useNavigationSession } from '../../components/navigation/social-shell';
import { ConversationListPanel } from './conversation-list';
import styles from './messages.module.css';

// Messages home in the UI design's chat layout. Choosing a conversation opens /messages/[conversationId].
export default function MessagesPage() {
  const session = useNavigationSession();
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
