'use client';

import { useEffect, useState } from 'react';
import { FeedSwitcher, type FeedTab } from './FeedSwitcher';
import { PostComposer } from './PostComposer';
import { PostCard } from './PostCard';
import { LoadingFeedState, EmptyFeedState, ErrorFeedState } from './FeedStates';
import { ComingSoonPanels } from './ComingSoonPanels';
import type { FeedPost } from './types';
import shellStyles from '../navigation/social-shell.module.css';

// "For you" is the public Campus Feed (SRS-301); "Friends" is Friends Only (SRS-302).
const FEED_ENDPOINT: Record<FeedTab, 'campus' | 'friends'> = { 'for-you': 'campus', friends: 'friends' };

async function fetchFeed(tab: FeedTab, accessToken: string): Promise<FeedPost[]> {
  const res = await fetch(`/api/posts/feed/${FEED_ENDPOINT[tab]}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Failed to load the feed.');
  return body.posts;
}

/** Rendered only once the shared shell (social-shell.tsx) has confirmed the viewer is signed in. */
export function FeedPage() {
  const [token, setToken] = useState('');
  const [authorInitial, setAuthorInitial] = useState('');
  const [tab, setTab] = useState<FeedTab>('for-you');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('access_token') || '';
    setToken(stored);
    if (!stored) return;
    fetch('/api/profile', { headers: { Authorization: `Bearer ${stored}` } })
      .then((res) => res.json())
      .then((body) => setAuthorInitial(body.profile?.username?.[0]?.toUpperCase() ?? ''))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (token) loadFeed(token);
  }, [tab, token]);

  async function loadFeed(accessToken: string) {
    setLoading(true);
    setError('');
    try {
      setPosts(await fetchFeed(tab, accessToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the feed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={shellStyles.page}>
      <h1 className={shellStyles.title}>Campus Feed</h1>

      <div className="mt-6 flex items-start gap-6">
        <div className="min-w-0 flex-1 space-y-4 lg:max-w-2xl">
          <PostComposer accessToken={token} authorInitial={authorInitial} onPublished={() => token && loadFeed(token)} />

          <FeedSwitcher active={tab} onChange={setTab} />

          {loading ? (
            <LoadingFeedState />
          ) : error ? (
            <ErrorFeedState message={error} />
          ) : posts.length === 0 ? (
            <EmptyFeedState tab={tab === 'friends' ? 'friends' : 'campus'} />
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={`${post.postId}-${post.visibility}`} post={post} />
              ))}
            </div>
          )}
        </div>

        <ComingSoonPanels />
      </div>
    </main>
  );
}
