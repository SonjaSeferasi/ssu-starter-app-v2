'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { storedAccessToken } from '../../lib/account/session';
import type { TrendingPost } from '../../lib/trending';
import styles from '../../app/events/events.module.css';

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
export const likesLabel = (count: number) => `${count} ${count === 1 ? 'like' : 'likes'} this week`;

// SRS-405.8: recalculated every time Events and Trending is opened or refreshed.
export function useTrendingPosts() {
  const [posts, setPosts] = useState<TrendingPost[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const token = storedAccessToken();
    if (!token) { setPosts([]); return; }
    const controller = new AbortController();
    fetch('/api/posts/trending', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) { setError(data.error || 'Trending could not be loaded.'); setPosts([]); return; }
        setPosts(data.posts);
      })
      .catch((err) => { if (err.name !== 'AbortError') { setError('Trending could not be loaded.'); setPosts([]); } });
    return () => controller.abort();
  }, []);
  return { posts, error };
}

// SRS-405.5: each entry shows its author, a text or photo preview and its recent-like count;
// SRS-405.6: selecting one opens the feed post (/posts/:id applies the feed's access rules).
export function TrendingPostList({ posts, error = '' }: { posts: TrendingPost[] | null; error?: string }) {
  return (
    <section className={styles.sideCard} aria-labelledby="trending-title">
      <h2 id="trending-title" className={styles.sideTitle}>Trending on campus</h2>
      <p className={styles.sideBody}>Campus Feed posts with the most likes in the last 7 days</p>
      {error ? <p role="alert" className={styles.actionError}>{error}</p> : null}
      {posts === null ? <p className={styles.sideEmpty}>Loading trending posts…</p>
        : posts.length === 0 ? (error ? null : <p className={styles.sideEmpty}>Nothing is trending yet. Like a post on the Campus Feed to get it trending.</p>)
        : (
          <ol className={styles.trending}>
            {posts.map((post, index) => (
              <li key={post.postId}>
                <Link href={`/posts/${post.postId}`} className={styles.trendingItem}>
                  <span className={styles.rank}>{index + 1}</span>
                  {post.photoUrl
                    ? <img src={post.photoUrl} alt="" className={styles.trendingPhoto} />
                    : <span className={styles.trendingAuthor} aria-hidden="true">
                        {post.authorPhotoUrl ? <img src={post.authorPhotoUrl} alt="" /> : initials(post.authorName)}
                      </span>}
                  <span className={styles.trendingText}>
                    <strong>{post.authorName}{post.authorUsername ? <span className={styles.trendingHandle}> @{post.authorUsername}</span> : null}</strong>
                    <span className={styles.trendingPreview}>
                      {post.isRepost ? 'Reposted: ' : ''}{post.textPreview ?? (post.photoUrl ? 'Shared a photo' : 'Shared a post')}
                    </span>
                  </span>
                  <span className={styles.trendingLikes}>
                    <Heart aria-hidden="true" fill="currentColor" />{post.recentLikeCount}<span className={styles.srOnly}> {likesLabel(post.recentLikeCount)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
    </section>
  );
}

export function TrendingPosts() {
  const { posts, error } = useTrendingPosts();
  return <TrendingPostList posts={posts} error={error} />;
}
