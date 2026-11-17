'use client';

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ImagePreview, type PendingImage } from './ImagePreview';
import { MentionDropdown } from './MentionDropdown';
import { useMentionAutocomplete } from './use-mention-autocomplete';
import type { FeedPhoto, FeedPost } from './types';

export function EditPostModal({
  post,
  accessToken,
  onClose,
  onSaved,
}: {
  post: FeedPost;
  accessToken: string;
  onClose: () => void;
  onSaved: (updated: FeedPost) => void;
}) {
  const [text, setText] = useState(post.textContent ?? '');
  const [keptPhotos, setKeptPhotos] = useState<FeedPhoto[]>(post.photos);
  const [newImages, setNewImages] = useState<PendingImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mention = useMentionAutocomplete();

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

  function handleTextareaKeyDown(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (mention.handleKeyDown(e, selectMention)) e.preventDefault();
  }

  // SRS-306.1: opening the modal must not alter the post -- no network calls here.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const next = Array.from(fileList).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setNewImages((prev) => [...prev, ...next]);
  }

  function removeNewImage(index: number) {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  }

  function removeKeptPhoto(assetId: number) {
    setKeptPhotos((prev) => prev.filter((p) => p.assetId !== assetId));
  }

  const removedAssetIds = post.photos.filter((p) => !keptPhotos.some((k) => k.assetId === p.assetId)).map((p) => p.assetId);
  const textChanged = text.trim() !== (post.textContent ?? '');
  const hasChanges = textChanged || removedAssetIds.length > 0 || newImages.length > 0;

  async function handleSave() {
    if (!hasChanges) {
      onClose();
      return;
    }
    if (!text.trim() && keptPhotos.length === 0 && newImages.length === 0) {
      setError('A post must have text or at least one photo.');
      return;
    }
    setError('');
    setSaving(true);

    // Order matters: the text PATCH runs FIRST, before anything is
    // destroyed. This is three separate, non-transactional requests, so a
    // failure partway through can still leave the edit incomplete -- but
    // putting the cheap, fully reversible change first means a failure in
    // either photo step no longer costs the student their text edit too,
    // and (the actual reported case) a removed photo is only ever deleted
    // after the text change already safely landed. True atomicity would
    // need all three folded into one server-side transaction/RPC, which is
    // a bigger change than this fix -- left as a follow-up recommendation.
    try {
      const patchRes = await fetch(`/api/posts/${post.postId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ textContent: text }),
      });
      const patchBody = await patchRes.json();
      if (!patchRes.ok) throw new Error(patchBody.error || 'Failed to save changes.');

      // Each photo step gets its own try/catch, same reasoning as #1181/
      // #1182: a rejected fetch (true network failure, not just a non-ok
      // response) must still produce the informative "your text was
      // saved" message -- without this, the rejection propagated past
      // the !res.ok check entirely and surfaced the browser's own generic
      // "Failed to fetch" instead, confirmed by browser testing.
      for (const assetId of removedAssetIds) {
        try {
          const res = await fetch(`/api/posts/${post.postId}/photos/${assetId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || 'unknown error');
          }
        } catch (removeErr) {
          const reason = removeErr instanceof Error ? removeErr.message : 'unknown error';
          throw new Error(`Your text was saved, but removing a photo failed (${reason}).`);
        }
      }

      if (newImages.length > 0) {
        try {
          const form = new FormData();
          for (const img of newImages) form.append('images', img.file);
          const res = await fetch(`/api/posts/${post.postId}/photos`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: form,
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || 'unknown error');
          }
        } catch (uploadErr) {
          const reason = uploadErr instanceof Error ? uploadErr.message : 'unknown error';
          throw new Error(`Your text was saved, but attaching new photos failed (${reason}).`);
        }
      }

      // patchBody.post reflects the post as of the FIRST request, before
      // any photo removal/attachment -- now that the text save runs
      // first, that response is stale for the photos array whenever this
      // edit also touched photos. Re-fetch once so the caller (and the
      // feed it updates) shows the true final state.
      if (removedAssetIds.length > 0 || newImages.length > 0) {
        const freshRes = await fetch(`/api/posts/${post.postId}`, { headers: { Authorization: `Bearer ${accessToken}` } });
        const freshBody = await freshRes.json();
        if (freshRes.ok) {
          onSaved(freshBody.post);
          return;
        }
      }
      onSaved(patchBody.post);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-post-heading"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-xl outline-none"
      >
        <div className="flex items-center justify-between">
          <h2 id="edit-post-heading" className="text-lg font-semibold text-stone-900">
            Edit Post
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100"
          >
            ×
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
            {post.authorName[0]?.toUpperCase()}
          </div>
          <p className="text-sm font-semibold text-stone-900">{post.authorName}</p>
        </div>

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
            onKeyDown={handleTextareaKeyDown}
            onBlur={mention.close}
            rows={4}
            className="mt-4 w-full resize-none rounded-2xl border-0 bg-stone-50 px-4 py-3 text-sm text-stone-800 outline-none focus:ring-2 focus:ring-emerald-200"
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

        {keptPhotos.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {keptPhotos.map((photo) => (
              <div key={photo.assetId} className="group relative h-20 w-20 overflow-hidden rounded-xl border border-stone-200">
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeKeptPhoto(photo.assetId)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <ImagePreview images={newImages} onRemove={removeNewImage} />

        <label className="mt-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-stone-200 text-stone-500 hover:border-emerald-300 hover:text-emerald-700">
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          📷
        </label>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
