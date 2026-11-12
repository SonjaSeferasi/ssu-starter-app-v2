import Link from 'next/link';
import { timeAgo } from './time';
import { FeedAvatar } from './FeedAvatar';

export function PostAuthor({
  name,
  profileHref,
  photoUrl,
  username,
  publishedAt,
  editedAt,
  visibility,
}: {
  name: string;
  profileHref?: string;
  photoUrl: string | null;
  username?: string | null;
  publishedAt: string;
  editedAt: string | null;
  visibility: 'public' | 'friends_only';
}) {
  const avatar = <FeedAvatar photoUrl={photoUrl} name={name} username={username} />;
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
