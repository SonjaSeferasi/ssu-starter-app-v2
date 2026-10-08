'use client';

import { useState } from 'react';
import { ImagePreview, type PendingImage } from './ImagePreview';
import { VisibilitySelector, type Visibility } from './VisibilitySelector';

export function PostComposer({ studentId, onPublished }: { studentId: string; onPublished: () => void }) {
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [images, setImages] = useState<PendingImage[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const next = Array.from(fileList).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...next]);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handlePublish() {
    if (!text.trim()) {
      setError('Write something before publishing.');
      return;
    }
    setError('');
    setPublishing(true);

    const createRes = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-student-id': studentId },
      body: JSON.stringify({ textContent: text, visibility }),
    });
    const createBody = await createRes.json();

    if (!createRes.ok) {
      setError(createBody.error || 'Failed to publish post.');
      setPublishing(false);
      return;
    }

    if (images.length > 0) {
      const form = new FormData();
      for (const img of images) form.append('images', img.file);
      const photoRes = await fetch(`/api/posts/${createBody.post.postId}/photos`, {
        method: 'POST',
        headers: { 'x-student-id': studentId },
        body: form,
      });
      if (!photoRes.ok) {
        const photoBody = await photoRes.json();
        setError(`Post published, but attaching photos failed: ${photoBody.error || 'unknown error'}`);
        setPublishing(false);
        onPublished();
        return;
      }
    }

    setText('');
    setVisibility('public');
    setImages([]);
    setPublishing(false);
    onPublished();
  }

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share something with your campus…"
        rows={2}
        className="w-full resize-none rounded-2xl border-0 bg-stone-50 px-4 py-3 text-sm text-stone-800 outline-none placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-200"
      />
      <ImagePreview images={images} onRemove={removeImage} />

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-stone-200 text-stone-500 hover:border-emerald-300 hover:text-emerald-700">
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
          <VisibilitySelector value={visibility} onChange={setVisibility} />
        </div>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
        >
          {publishing ? 'Publishing…' : 'Create post'}
        </button>
      </div>
    </div>
  );
}
