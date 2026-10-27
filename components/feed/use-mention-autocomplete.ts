import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { accessToken } from '../../lib/account/session';

export type MentionCandidate = { username: string; name: string; photoUrl: string | null };

/**
 * Shared "@" autocomplete behavior for PostComposer/CommentComposer -- both
 * use a plain controlled text value with their own onChange, so this hook
 * takes the current text + where to insert, rather than owning a ref
 * itself, and works the same way for an <input> or a <textarea>.
 *
 * Reuses the existing Campus Members search (/api/campus/members) -- same
 * university scoping, same blocked-student exclusion, same {username, name,
 * photo_url} shape the People panel already uses. No new search endpoint.
 */
export function useMentionAutocomplete() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [triggerStart, setTriggerStart] = useState<number | null>(null);
  const [members, setMembers] = useState<MentionCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      setLoading(true);
      try {
        const token = await accessToken();
        if (controller.signal.aborted || !token) return;
        const params = new URLSearchParams({ q: query, offset: '0' });
        const response = await fetch(`/api/campus/members?${params}`, {
          headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const data = await response.json();
        if (!response.ok) return;
        const rows: { username: string; name: string; photo_url: string | null; is_me: boolean }[] = data.members;
        setMembers(rows.filter((m) => !m.is_me).map((m) => ({ username: m.username, name: m.name, photoUrl: m.photo_url })));
        setActiveIndex(0);
      } catch {
        // Keep the dropdown open with whatever it last had; the next keystroke retries.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [open, query]);

  /** Call on every text change with the new value and the caret position right after the edit. */
  function handleTextChange(text: string, cursor: number) {
    const uptoCursor = text.slice(0, cursor);
    const match = uptoCursor.match(/(?:^|\s)@([A-Za-z0-9_.-]{0,50})$/);
    if (!match) {
      if (open) setOpen(false);
      return;
    }
    setTriggerStart(cursor - match[1].length - 1);
    setQuery(match[1]);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setMembers([]);
  }

  /** Returns the new text + where to put the caret after inserting @username at the trigger position. */
  function applyMention(text: string, cursor: number, username: string): { text: string; cursor: number } {
    if (triggerStart === null) return { text, cursor };
    const before = text.slice(0, triggerStart);
    const after = text.slice(cursor);
    const inserted = `@${username} `;
    return { text: before + inserted + after, cursor: before.length + inserted.length };
  }

  /** Returns true if it handled the key (caller should preventDefault and skip its own handling, e.g. Enter-submits-form). */
  function handleKeyDown(e: KeyboardEvent, onSelect: (username: string) => void): boolean {
    if (!open || members.length === 0) return false;
    if (e.key === 'ArrowDown') { setActiveIndex((i) => (i + 1) % members.length); return true; }
    if (e.key === 'ArrowUp') { setActiveIndex((i) => (i - 1 + members.length) % members.length); return true; }
    if (e.key === 'Enter' || e.key === 'Tab') { onSelect(members[activeIndex].username); return true; }
    if (e.key === 'Escape') { close(); return true; }
    return false;
  }

  return { open, members, loading, activeIndex, setActiveIndex, handleTextChange, handleKeyDown, applyMention, close };
}
