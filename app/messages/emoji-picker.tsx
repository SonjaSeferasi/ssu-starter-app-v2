'use client';

import { useMemo, useState } from 'react';
import { searchEmojis } from '../../lib/chat-emoji';
import styles from './messages.module.css';

// SRS-201.8 (#797): search the built-in emoji list by name ("laugh" finds 😂) and choose one to send it.
// Enter in the search box sends the first match; Escape or Close closes the picker.
export function EmojiPicker({ disabled, onPick, onClose }: { disabled: boolean; onPick: (emoji: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchEmojis(query), [query]);

  return (
    <div className={styles.emojiPanel} role="dialog" aria-labelledby="emoji-title" onKeyDown={(event) => { if (event.key === 'Escape') onClose(); }}>
      <div className={styles.invitePanelTop}>
        <h3 id="emoji-title" className={styles.stepTitle}>Send an emoji</h3>
        <button type="button" className={styles.retry} onClick={onClose}>Close</button>
      </div>
      <label htmlFor="emoji-search" className={styles.srOnly}>Search emoji</label>
      <input id="emoji-search" className={styles.pickerSearch} placeholder="Search emoji…" value={query}
        onChange={(event) => setQuery(event.target.value)} autoFocus autoComplete="off" maxLength={50}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          if (results.length && !disabled) onPick(results[0].emoji);
        }} />
      {results.length === 0 ? (
        <p className={styles.pickerHint}>No emoji match that word.</p>
      ) : (
        <ul className={styles.emojiGrid} aria-label="Emoji">
          {results.map((item) => (
            <li key={item.emoji}>
              <button type="button" className={styles.emojiOption} onClick={() => onPick(item.emoji)} disabled={disabled}
                aria-label={item.name} title={item.name}>{item.emoji}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
