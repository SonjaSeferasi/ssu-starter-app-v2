'use client';

import { useEffect, useRef } from 'react';
import { REACTIONS, type ChatReaction } from '../../lib/chat-reactions';
import styles from './messages.module.css';

const nameOf = (emoji: string) => REACTIONS.find((reaction) => reaction.emoji === emoji)?.name ?? emoji;

// SRS-210.2 (#805): the approved reaction set, shown under the chosen message. The student's current reaction is
// marked; choosing it again removes it (SRS-210.5) and choosing another replaces it (SRS-210.6).
// Escape closes it and returns to the message's React button.
export function ReactionPicker({ current, disabled, onPick, onClose }: { current: string | null; disabled: boolean; onPick: (emoji: string) => void; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panel.current?.querySelector('button')?.focus();
    panel.current?.scrollIntoView({ block: 'nearest' });
  }, []);

  return (
    <div ref={panel} className={styles.reactionPicker} role="group" aria-label="Choose a reaction"
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
      {REACTIONS.map(({ emoji, name }) => {
        const mine = emoji === current;
        return (
          <button key={emoji} type="button" className={styles.reactionOption} onClick={() => onPick(emoji)} disabled={disabled}
            aria-pressed={mine} aria-label={mine ? `${name}, your reaction. Choose again to remove it` : name} title={mine ? 'Remove your reaction' : name}>
            {emoji}
          </button>
        );
      })}
    </div>
  );
}

// SRS-210.4 (#812): the reactions on a message, one chip per emoji with how many students chose it; the student's
// own is highlighted. Selecting their own chip removes it (#816); selecting another changes theirs to it (#819).
export function ReactionChips({ reactions, disabled, onPick }: { reactions: ChatReaction[]; disabled: boolean; onPick: (emoji: string) => void }) {
  return (
    <ul className={styles.reactions} aria-label="Reactions">
      {reactions.map(({ emoji, count, mine }) => (
        <li key={emoji}>
          <button type="button" className={styles.reactionChip} onClick={() => onPick(emoji)} disabled={disabled} aria-pressed={mine}
            aria-label={`${nameOf(emoji)}, ${count} ${count === 1 ? 'reaction' : 'reactions'}${mine ? ', including yours. Select to remove yours' : '. Select to react with it'}`}
            title={mine ? 'Remove your reaction' : `React with ${nameOf(emoji)}`}>
            <span aria-hidden="true">{emoji}</span><span aria-hidden="true">{count}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
