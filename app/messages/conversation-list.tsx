'use client';

import { useState } from 'react';
import styles from './messages.module.css';

// The Messages column from the UI design, shared by /messages and each conversation page.
// The conversation list itself is SRS-212.4; until then this shows the empty state.
export function ConversationListPanel() {
  const [tab, setTab] = useState<'dms' | 'groups'>('dms');
  return (
    <section className={styles.listPanel} aria-label="Conversations">
      <h1 className={styles.heading}>Messages</h1>
      <div className={styles.tabs}>
        <button type="button" className={styles.tab} aria-pressed={tab === 'dms'} onClick={() => setTab('dms')}>DMs</button>
        <button type="button" className={styles.tab} aria-pressed={tab === 'groups'} onClick={() => setTab('groups')}>Groups</button>
      </div>
      <p className={styles.emptyList}>{tab === 'dms' ? 'Your direct messages will appear here.' : 'Your group chats will appear here.'}</p>
    </section>
  );
}
