export type PendingImage = { file: File; previewUrl: string };

export function ImagePreview({ images, onRemove }: { images: PendingImage[]; onRemove: (index: number) => void }) {
  if (images.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {images.map((img, i) => (
        <div key={img.previewUrl} className="group relative h-20 w-20 overflow-hidden rounded-xl border border-stone-200">
          <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition group-hover:opacity-100"
            aria-label="Remove image"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
