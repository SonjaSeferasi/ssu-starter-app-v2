import type { FeedPhoto } from './types';

export function PostMedia({ photos }: { photos: FeedPhoto[] }) {
  if (photos.length === 0) return null;

  if (photos.length === 1) {
    return (
      <div className="mt-3 overflow-hidden rounded-2xl">
        <img src={photos[0].url} alt="" className="max-h-[480px] w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-1 overflow-hidden rounded-2xl">
      {photos.map((photo) => (
        <img key={photo.assetId} src={photo.url} alt="" className="h-48 w-full object-cover" />
      ))}
    </div>
  );
}
