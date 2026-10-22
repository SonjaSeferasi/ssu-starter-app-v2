import Link from 'next/link';
import { timeAgo } from './time';

export function PostAuthor({
  name,
  username,
  photoUrl,
  publishedAt,
  editedAt,
  visibility,
}: {
  name: string;
  username: string;
  photoUrl: string | null;
  publishedAt: string;
  editedAt: string | null;
  visibility: 'public' | 'friends_only';
}) {
  return (
    <div className="flex items-center gap-3">
      <Link href={`/students/${encodeURIComponent(username)}`} aria-label={`View ${name}'s profile`} className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
        {photoUrl ? (
          <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          name[0]?.toUpperCase()
        )}
      </Link>
      <div>
        <Link href={`/students/${encodeURIComponent(username)}`} className="block text-sm font-semibold text-stone-900 hover:underline">{name}</Link>
        <p className="text-xs text-stone-500">
          {visibility === 'public' ? 'Campus public' : 'Friends only'} · {timeAgo(publishedAt)}
          {editedAt ? ' · Edited' : ''}
        </p>
      </div>
    </div>
  );
}
