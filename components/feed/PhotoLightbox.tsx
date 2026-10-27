'use client';

import { useEffect, useRef, useState } from 'react';
import type { TouchEvent as ReactTouchEvent } from 'react';
import type { FeedPhoto } from './types';

// Swipe must travel at least this far (px) before it counts as a
// deliberate navigation gesture rather than an incidental touch/scroll
// wobble. Exported as a pure function so the threshold is testable
// without rendering (this file needs a real DOM for everything else,
// via document.addEventListener/document.body, which this project's
// node-environment test harness doesn't provide).
export function swipeAction(deltaX: number): 'prev' | 'next' | null {
  if (deltaX <= -50) return 'next';
  if (deltaX >= 50) return 'prev';
  return null;
}

// Facebook/Instagram-style photo viewer, additional functionality not in
// the official SRS. Pure presentation over photo URLs the backend has
// already authorized (campus/friends feed, a repost's live-reauthorized
// embed, or a single post page) -- this component never fetches anything
// itself, so it can't expose a Friends Only photo to anyone who wasn't
// already allowed to see the post it came from.
export function PhotoLightbox({
  photos,
  startIndex,
  onClose,
}: {
  photos: FeedPhoto[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;
  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min(photos.length - 1, i + 1));

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', onKeyDown);
    containerRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTouchStart(e: ReactTouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }
  function handleTouchEnd(e: ReactTouchEvent) {
    if (touchStartX.current === null) return;
    const deltaX = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    const action = swipeAction(deltaX);
    if (action === 'next') goNext();
    else if (action === 'prev') goPrev();
  }

  const photo = photos[index];
  if (!photo) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      tabIndex={-1}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 outline-none"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
        className="fixed right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-2xl text-white transition hover:bg-black/60"
      >
        ×
      </button>

      {hasPrev ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          aria-label="Previous photo"
          className="fixed left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-xl text-white transition hover:bg-black/60 sm:left-4"
        >
          ‹
        </button>
      ) : null}

      {hasNext ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          aria-label="Next photo"
          className="fixed right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-xl text-white transition hover:bg-black/60 sm:right-4"
        >
          ›
        </button>
      ) : null}

      <img
        src={photo.url}
        alt={photos.length > 1 ? `Photo ${index + 1} of ${photos.length}` : 'Post photo'}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[90vw] select-none object-contain"
      />

      {photos.length > 1 ? (
        <p className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white/90">
          {index + 1} of {photos.length}
        </p>
      ) : null}
    </div>
  );
}
