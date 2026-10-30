'use client';

import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { MentionDropdown } from '../feed/MentionDropdown';
import { useMentionAutocomplete } from '../feed/use-mention-autocomplete';
import type { WhisperComment } from './types';

const MAX_LENGTH = 300;

export function WhisperCommentComposer({
  confessionId,
  accessToken,
  parentCommentId,
  allowMentions,
  placeholder,
  autoFocus,
  onPosted,
  onCancel,
}: {
  confessionId: number;
  accessToken: string;
  parentCommentId?: number;
  /** Only Campus Crush confessions allow @mentions -- see sync_whisper_mentions. */
  allowMentions: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  onPosted: (comment: WhisperComment) => void;
  onCancel?: () => void;
}) {
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mention = useMentionAutocomplete('/api/whispers/mention-candidates');

  const canSubmit = text.trim().length > 0 && text.length <= MAX_LENGTH && !posting;

  function handleTextChange(value: string, cursor: number) {
    setText(value);
    if (allowMentions) mention.handleTextChange(value, cursor);
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
    if (!canSubmit) return;
    setPosting(true);
    setError('');
    const res = await fetch(`/api/whispers/${confessionId}/comments`, {
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
    if (allowMentions && mention.handleKeyDown(e, selectMention)) {
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

  const avatarSize = parentCommentId ? 'h-7 w-7 text-sm' : 'h-8 w-8 text-base';

  return (
    <div className="flex items-start gap-2">
      <div className={`flex ${avatarSize} shrink-0 items-center justify-center rounded-full bg-indigo-100`} aria-hidden="true">
        👻
      </div>
      <div className="relative min-w-0 flex-1">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
          onKeyDown={handleKeyDown}
          onBlur={mention.close}
          placeholder={placeholder ?? (allowMentions ? 'Share your guess… (type @ to mention someone)' : 'Say something anonymously…')}
          rows={1}
          maxLength={MAX_LENGTH}
          autoFocus={autoFocus}
          disabled={posting}
          className="w-full resize-none rounded-2xl border-0 bg-stone-50 px-3 py-2 text-sm text-stone-800 outline-none placeholder:text-stone-400 focus:ring-2 focus:ring-indigo-200 disabled:opacity-60"
        />
        {allowMentions && mention.open ? (
          <MentionDropdown
            members={mention.members}
            loading={mention.loading}
            activeIndex={mention.activeIndex}
            onHover={mention.setActiveIndex}
            onSelect={selectMention}
          />
        ) : null}
        <div className="mt-1 flex items-center justify-between pl-1">
          <span className="text-[11px] text-stone-400">{text.length}/{MAX_LENGTH}</span>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
        <div className="mt-1 flex justify-end gap-2">
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
            className="rounded-full bg-indigo-700 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-800 disabled:opacity-60"
          >
            {posting ? 'Posting…' : parentCommentId ? 'Post Reply' : 'Post Comment'}
          </button>
        </div>
      </div>
    </div>
  );
}
