'use client';

import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Comment } from './types';
import { MentionDropdown } from './MentionDropdown';
import { useMentionAutocomplete } from './use-mention-autocomplete';

export function CommentComposer({
  postId,
  accessToken,
  authorInitial,
  parentCommentId,
  initialText,
  placeholder,
  autoFocus,
  onPosted,
  onCancel,
}: {
  postId: number;
  accessToken: string;
  authorInitial: string;
  /** Replying to Comments (separate feature, not SRS-310): set to reply instead of posting a top-level comment. */
  parentCommentId?: number;
  initialText?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onPosted: (comment: Comment) => void;
  onCancel?: () => void;
}) {
  const [text, setText] = useState(initialText ?? '');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mention = useMentionAutocomplete();

  const canSubmit = text.trim().length > 0 && !posting;

  function handleTextChange(value: string, cursor: number) {
    setText(value);
    mention.handleTextChange(value, cursor);
  }

  function selectMention(username: string) {
    const cursor = textareaRef.current?.selectionStart ?? text.length;
    const result = mention.applyMention(text, cursor, username);
    setText(result.text);
    mention.close();
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(result.cursor, result.cursor);
    });
  }

  async function handleSubmit() {
    if (!canSubmit) return; // SRS-310: disabled while empty/whitespace-only or a request is pending.
    setPosting(true);
    setError('');
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ textContent: text, parentCommentId }),
    });
    const body = await res.json();
    setPosting(false);
    if (!res.ok) {
      setError(body.error || (parentCommentId ? 'Failed to post reply.' : 'Failed to post comment.'));
      return;
    }
    setText('');
    onPosted(body.comment);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // The mention dropdown's own navigation (arrows/Enter/Escape) takes
    // priority over this composer's own Enter-submits/Escape-cancels while
    // it's open -- selecting a suggestion should never also submit the comment.
    if (mention.handleKeyDown(e, selectMention)) {
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape' && onCancel) {
      onCancel();
    }
  }

  const avatarSize = parentCommentId ? 'h-7 w-7' : 'h-8 w-8';

  return (
    <div className="flex items-start gap-2">
      <div className={`flex ${avatarSize} shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800`}>
        {authorInitial}
      </div>
      <div className="relative min-w-0 flex-1">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
          onKeyDown={handleKeyDown}
          onBlur={mention.close}
          placeholder={placeholder ?? 'Write a comment… (type @ to mention someone)'}
          rows={1}
          autoFocus={autoFocus}
          disabled={posting}
          className="w-full resize-none rounded-2xl border-0 bg-stone-50 px-3 py-2 text-sm text-stone-800 outline-none placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
        />
        {mention.open ? (
          <MentionDropdown
            members={mention.members}
            loading={mention.loading}
            activeIndex={mention.activeIndex}
            onHover={mention.setActiveIndex}
            onSelect={selectMention}
          />
        ) : null}
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        <div className="mt-1.5 flex justify-end gap-2">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={posting}
              className="rounded-full border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
            >
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
          >
            {posting ? 'Posting…' : parentCommentId ? 'Post Reply' : 'Post Comment'}
          </button>
        </div>
      </div>
    </div>
  );
}
