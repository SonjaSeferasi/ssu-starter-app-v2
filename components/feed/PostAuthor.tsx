import Link from 'next/link';
import { timeAgo } from './time';

export function PostAuthor({
  name,
  profileHref,
  photoUrl,
  publishedAt,
  editedAt,
  visibility,
}: {
  name: string;
  profileHref?: string;
  photoUrl: string | null;
  publishedAt: string;
  editedAt: string | null;
  visibility: 'public' | 'friends_only';
}) {
  const avatar = (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
        {photoUrl ? <img src={photoUrl} alt="" className="h-full w-full object-cover" /> : name[0]?.toUpperCase()}
      </span>
  );
  return (
    <div className="flex items-center gap-3">
      {profileHref ? <Link href={profileHref} aria-label={`View ${name}'s profile`} className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700">{avatar}</Link> : avatar}
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold text-stone-900">{profileHref ? <Link href={profileHref} className="hover:text-emerald-700 hover:underline focus-visible:underline">{name}</Link> : name}</p>
        <p className="text-xs text-stone-500">
          {visibility === 'public' ? 'Campus public' : 'Friends only'} · {timeAgo(publishedAt)}
          {editedAt ? ' · Edited' : ''}
        </p>
      </div>
    </div>
  );
}
