'use client';

import { useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { FeedPhoto } from './types';
import { PhotoLightbox } from './PhotoLightbox';

// Facebook/Instagram-style photo viewer, additional functionality not in
// the official SRS. Thumbnails become buttons that open a full-screen
// lightbox instead of plain <img>s -- used identically by regular posts,
// a repost's embedded original, and the single-post page (all three
// render through this one component), so none of them needed separate
// wiring. Clicking a thumbnail inside a repost's embed (itself wrapped in
// a Link to the original post) must never also navigate -- every handler
// here stops propagation for that reason.
export function PostMedia({ photos }: { photos: FeedPhoto[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);

  if (photos.length === 0) return null;

  function openAt(index: number, trigger: HTMLButtonElement) {
    lastTriggerRef.current = trigger;
    setOpenIndex(index);
  }
  function close() {
    setOpenIndex(null);
    lastTriggerRef.current?.focus();
  }

  function thumbButtonProps(index: number) {
    return {
      type: 'button' as const,
      'aria-label': photos.length > 1 ? `View photo ${index + 1} of ${photos.length}` : 'View photo',
      onClick: (e: ReactMouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        openAt(index, e.currentTarget);
      },
      className: 'block w-full cursor-zoom-in border-0 bg-transparent p-0',
    };
  }

  return (
    <>
      {/* No fixed height and no object-cover: width fills the post, height
          follows the image's own aspect ratio (h-auto), so the entire
          photo is visible from the start -- portrait photos run taller
          rather than getting cropped, landscape photos run shorter rather
          than stretching. object-contain is set defensively (inert under
          this exact sizing, since only width is constrained) so a future
          height constraint can't silently reintroduce cropping. */}
      {photos.length === 1 ? (
        <div className="mt-3 overflow-hidden rounded-2xl">
          <button {...thumbButtonProps(0)}>
            <img src={photos[0].url} alt="" className="block w-full h-auto object-contain" />
          </button>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 items-start gap-1 overflow-hidden rounded-2xl">
          {photos.map((photo, i) => (
            <button key={photo.assetId} {...thumbButtonProps(i)}>
              <img src={photo.url} alt="" className="block w-full h-auto object-contain" />
            </button>
          ))}
        </div>
      )}

      {openIndex !== null ? (
        <PhotoLightbox photos={photos} startIndex={openIndex} onClose={close} />
      ) : null}
    </>
  );
}
