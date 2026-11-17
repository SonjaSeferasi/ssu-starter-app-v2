'use client';

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ImagePreview, type PendingImage } from './ImagePreview';
import { VisibilitySelector, type Visibility } from './VisibilitySelector';
import { MentionDropdown } from './MentionDropdown';
import { useMentionAutocomplete } from './use-mention-autocomplete';
import { FeedAvatar } from './FeedAvatar';

export function PostComposer({
  accessToken,
  authorInitial,
  authorPhotoUrl,
  authorUsername,
  onPublished,
  translucent,
}: {
  accessToken: string;
  authorInitial: string;
  /** The signed-in viewer's profile photo; falls back to authorInitial when missing. */
  authorPhotoUrl?: string | null;
  authorUsername?: string | null;
  onPublished: () => void;
  /** "Customize Your Screen": a translucent glass surface instead of solid white, so a selected background theme keeps showing through. Defaults to false (today's unchanged look) everywhere this isn't explicitly passed. */
  translucent?: boolean;
}) {
  const [text, setText] = useState('');
  // SRS-315.3: no visibility is pre-selected -- the student must explicitly
  // choose Public or Friends Only before a post (text or photo) can publish.
  const [visibility, setVisibility] = useState<Visibility | null>(null);
  const [images, setImages] = useState<PendingImage[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let frame = 0;
    const focusEntry = () => {
      cancelAnimationFrame(frame);
      // Let route/fragment scroll handling finish before focusing the composer.
      frame = requestAnimationFrame(() => {
        const target = window.location.hash === '#create-text-post' ? inputRef.current
          : window.location.hash === '#create-photo-post' ? photoButtonRef.current : null;
        target?.scrollIntoView({ block: 'center' });
        target?.focus({ preventScroll: true });
      });
    };
    focusEntry();
    window.addEventListener('hashchange', focusEntry);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('hashchange', focusEntry); };
  }, []);
  const mention = useMentionAutocomplete();

  function handleTextChange(value: string, cursor: number) {
    setText(value);
    mention.handleTextChange(value, cursor);
  }

  function selectMention(username: string) {
    const cursor = inputRef.current?.selectionStart ?? text.length;
    const result = mention.applyMention(text, cursor, username);
    setText(result.text);
    mention.close();
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(result.cursor, result.cursor);
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (mention.handleKeyDown(e, selectMention)) e.preventDefault();
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const next = Array.from(fileList).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...next]);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handlePublish() {
    if (!visibility) {
      setError('Choose Public or Friends Only before publishing.');
      return;
    }
    if (!text.trim() && images.length === 0) {
      setError('Write something or add a photo before publishing.');
      return;
    }
    setError('');
    setPublishing(true);

    // The whole flow is wrapped in try/catch/finally: without it, a
    // rejected fetch (offline, dropped connection -- not just a non-ok
    // response, an actual network failure) threw out of this function
    // uncaught, `setPublishing(false)` was never reached, and the Create
    // post button stayed disabled forever, even after the network came
    // back (confirmed bug #1182).
    try {
      const createRes = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ textContent: text, visibility }),
      });
      const createBody = await createRes.json();

      if (!createRes.ok) {
        setError(createBody.error || 'Failed to publish post.');
        return;
      }

      if (images.length > 0) {
        // Own try/catch, deliberately separate from the outer one: the
        // rollback below must run whether the photo request comes back
        // with a non-ok response OR the fetch itself rejects (a genuine
        // dropped connection, not just an error status -- confirmed by
        // browser testing that the non-ok-only check below missed this
        // exact case and left a blank post live, #1181).
        try {
          const form = new FormData();
          for (const img of images) form.append('images', img.file);
          const photoRes = await fetch(`/api/posts/${createBody.post.postId}/photos`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: form,
          });
          if (!photoRes.ok) {
            const photoBody = await photoRes.json().catch(() => ({}));
            throw new Error(photoBody.error || 'unknown error');
          }
        } catch (photoErr) {
          // The post already exists with no photos attached. Rather than
          // leave it live (a blank card if there was no text either, or a
          // post missing the photo the student meant to attach), roll it
          // back entirely so "Create post" is a clean, safe retry -- never
          // a second, duplicate publish on top of a stuck failed one.
          await fetch(`/api/posts/${createBody.post.postId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          }).catch(() => {});
          const reason = photoErr instanceof Error ? photoErr.message : 'unknown error';
          setError(`Couldn't attach your photos (${reason}) -- nothing was posted. Try again.`);
          return;
        }
      }

      setText('');
      setVisibility(null);
      setImages([]);
      onPublished();
    } catch {
      setError('Failed to publish post. Check your connection and try again.');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${translucent ? 'border-white/40 bg-white/70 backdrop-blur-md' : 'border-stone-200 bg-white'}`}>
      <div className="flex items-center gap-3">
        <FeedAvatar photoUrl={authorPhotoUrl} name={authorInitial} username={authorUsername} />
        <div className="relative min-w-0 flex-1">
          <input
            id="create-text-post"
            aria-label="Post text"
            ref={inputRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
            onKeyDown={handleKeyDown}
            onBlur={mention.close}
            placeholder="Share something with your campus…"
            className="w-full rounded-full border-0 bg-stone-50 px-4 py-3 text-sm text-stone-800 outline-none placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-200"
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
        <button
          onClick={handlePublish}
          disabled={publishing || !visibility}
          className="shrink-0 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
        >
          {publishing ? 'Publishing…' : 'Create post'}
        </button>
      </div>

      <ImagePreview images={images} onRemove={removeImage} />

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      <div className="mt-3 flex items-center gap-2 pl-[52px]">
        <button id="create-photo-post" ref={photoButtonRef} type="button" aria-label="Choose photos for your post" onClick={() => photoInputRef.current?.click()} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-stone-200 text-stone-500 hover:border-emerald-300 hover:text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700">
          <span aria-hidden="true">📷</span>
        </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        <VisibilitySelector value={visibility} onChange={setVisibility} />
      </div>
    </div>
  );
}
