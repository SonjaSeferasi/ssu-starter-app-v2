'use client';

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { PostAuthor } from './PostAuthor';
import { PostMedia } from './PostMedia';
import { MentionDropdown } from './MentionDropdown';
import { useMentionAutocomplete } from './use-mention-autocomplete';
import { VisibilitySelector, type Visibility } from './VisibilitySelector';
import type { FeedPost } from './types';

// Share (additional functionality, not SRS-numbered): Facebook-style
// reposting inside SocialU. Caption is optional; visibility has no
// default (matching PostComposer's SRS-315.3 pattern) and is forced to
// Friends Only when the original is Friends Only -- the backend enforces
// this independently either way, this is just the honest UI reflection
// of that rule.
export function ShareModal({
  post,
  accessToken,
  onClose,
  onShared,
}: {
  post: FeedPost;
  accessToken: string;
  onClose: () => void;
  onShared?: () => void;
}) {
  const [viewerName, setViewerName] = useState('');
  const [viewerPhotoUrl, setViewerPhotoUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<Visibility | null>(null);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mention = useMentionAutocomplete();

  const originalIsFriendsOnly = post.visibility === 'friends_only';

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    dialogRef.current?.focus();
    fetch('/api/profiles', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => res.json())
      .then((body) => {
        setViewerName(body.profile?.name ?? '');
        setViewerPhotoUrl(body.profile?.photo_url ?? null);
      })
      .catch(() => {});
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [accessToken, onClose]);

  function handleCaptionChange(value: string, cursor: number) {
    setCaption(value);
    mention.handleTextChange(value, cursor);
  }

  function selectMention(username: string) {
    const cursor = textareaRef.current?.selectionStart ?? caption.length;
    const result = mention.applyMention(caption, cursor, username);
    setCaption(result.text);
    mention.close();
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(result.cursor, result.cursor);
    });
  }

  function handleCaptionKeyDown(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (mention.handleKeyDown(e, selectMention)) e.preventDefault();
  }

  async function handleShare() {
    if (sharing) return; // one in-flight submission only
    if (!visibility) {
      setError('Choose Public or Friends Only before sharing.');
      return;
    }
    setError('');
    setSharing(true);
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ textContent: caption, visibility, repostOfPostId: post.postId }),
    });
    const body = await res.json();
    setSharing(false);
    if (!res.ok) {
      setError(body.error || 'Failed to share this post.');
      return;
    }
    // Close immediately and let the parent show the success confirmation --
    // same pattern ReportPostModal/DeletePostModal already use.
    onShared?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-heading"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-xl outline-none"
      >
        <div className="flex items-center justify-between">
          <h2 id="share-modal-heading" className="text-lg font-semibold text-stone-900">
            Share to SocialU
          </h2>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100">
            ×
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
            {viewerPhotoUrl ? <img src={viewerPhotoUrl} alt="" className="h-full w-full object-cover" /> : viewerName[0]?.toUpperCase()}
          </span>
          <p className="text-sm font-semibold text-stone-900">{viewerName}</p>
        </div>

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={caption}
            onChange={(e) => handleCaptionChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
            onKeyDown={handleCaptionKeyDown}
            onBlur={mention.close}
            placeholder="Say something about this post…"
            rows={3}
            disabled={sharing}
            className="mt-4 w-full resize-none rounded-2xl border-0 bg-stone-50 px-4 py-3 text-sm text-stone-800 outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
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
        </div>

        <div className="mt-3 rounded-2xl border border-stone-200 p-3">
          <PostAuthor
            name={post.authorName}
            profileHref={post.authorUsername ? `/students/${encodeURIComponent(post.authorUsername)}` : undefined}
            photoUrl={post.authorPhotoUrl}
            publishedAt={post.publishedAt}
            editedAt={post.editedAt}
            visibility={post.visibility}
          />
          {post.textContent ? <p className="mt-2 whitespace-pre-wrap text-sm text-stone-800">{post.textContent}</p> : null}
          <PostMedia photos={post.photos} />
        </div>

        {originalIsFriendsOnly ? (
          <p className="mt-2 text-xs text-stone-500">This post is Friends Only, so your repost will be too.</p>
        ) : null}

        <div className="mt-3 flex items-center justify-between">
          <VisibilitySelector value={visibility} onChange={setVisibility} disabledOptions={originalIsFriendsOnly ? ['public'] : []} />
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={sharing}
            className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={sharing || !visibility}
            className="rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
          >
            {sharing ? 'Sharing…' : 'Share to SocialU'}
          </button>
        </div>
      </div>
    </div>
  );
}
