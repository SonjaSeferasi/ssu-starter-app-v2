'use client';

import { useProfilePhotoSource } from '../profile/profile-avatar';

/** Round feed avatar: shows the profile photo (recovering a failed signed URL when a username is known), else the initial. */
export function FeedAvatar({ photoUrl, name, username, className = 'h-10 w-10 text-sm' }: {
  photoUrl: string | null | undefined;
  name: string;
  username?: string | null;
  className?: string;
}) {
  const { source, onError } = useProfilePhotoSource(photoUrl ?? null, username);
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 font-semibold text-emerald-800 ${className}`}>
      {source ? <img src={source} alt="" className="h-full w-full object-cover" onError={onError} /> : name[0]?.toUpperCase()}
    </span>
  );
}
