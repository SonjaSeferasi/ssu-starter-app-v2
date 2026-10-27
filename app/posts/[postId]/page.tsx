'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { storedAccessToken } from '../../../lib/account/session';
import { useNavigationSession } from '../../../components/navigation/social-shell';
import { SessionNotice } from '../../../components/navigation/section-page';
import { PostCard } from '../../../components/feed/PostCard';
import { LoadingFeedState, ErrorFeedState } from '../../../components/feed/FeedStates';
import type { FeedPost } from '../../../components/feed/types';
import shellStyles from '../../../components/navigation/social-shell.module.css';

// Share (additional functionality, not SRS-numbered): a direct, shareable
// link to a single post. Reuses PostCard as-is, so photos, likes,
// comments, replies, and verified mentions all work exactly as they do in
// the feed -- this page only fetches the one post and hands it off.
export default function SharedPostPage() {
  const params = useParams<{ postId: string }>();
  const postId = Number(params.postId);
  const session = useNavigationSession();

  const [token, setToken] = useState('');
  const [authorInitial, setAuthorInitial] = useState('');
  const [currentStudentId, setCurrentStudentId] = useState<number | null>(null);
  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    if (session !== 'signed-in') return;
    const stored = storedAccessToken() || '';
    setToken(stored);
    if (!stored || !Number.isInteger(postId)) {
      setError('This post isn’t available.');
      setLoading(false);
      return;
    }

    fetch('/api/profile', { headers: { Authorization: `Bearer ${stored}` } })
      .then((res) => res.json())
      .then((body) => {
        setAuthorInitial(body.profile?.username?.[0]?.toUpperCase() ?? '');
        const id = Number(body.profile?.id);
        setCurrentStudentId(Number.isInteger(id) ? id : null);
      })
      .catch(() => {});

    fetch(`/api/posts/${postId}`, { headers: { Authorization: `Bearer ${stored}` } })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'This post isn’t available.');
        setPost(body.post);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'This post isn’t available.'))
      .finally(() => setLoading(false));
  }, [session, postId]);

  if (session !== 'signed-in') return <SessionNotice state={session} redirectTo={`/posts/${params.postId}`} />;

  return (
    <main className={shellStyles.page}>
      <h1 className={shellStyles.title}>Post</h1>
      <div className="mt-6 w-full max-w-2xl">
        {deleted ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Post deleted successfully.</div>
        ) : loading ? (
          <LoadingFeedState />
        ) : error || !post ? (
          <ErrorFeedState message={error || 'This post isn’t available.'} />
        ) : (
          <PostCard
            post={post}
            accessToken={token}
            isOwnPost={currentStudentId !== null && currentStudentId === post.authorId}
            authorInitial={authorInitial}
            currentStudentId={currentStudentId}
            onUpdated={setPost}
            onDeleted={() => setDeleted(true)}
          />
        )}
      </div>
    </main>
  );
}
