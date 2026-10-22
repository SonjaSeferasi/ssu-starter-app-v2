'use client';

import { storedAccessToken } from '../../lib/account/session';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FeedSwitcher, type FeedTab } from './FeedSwitcher';
import { PostComposer } from './PostComposer';
import { PostCard } from './PostCard';
import { LoadingFeedState, EmptyFeedState, ErrorFeedState } from './FeedStates';
import { CampusMembersPanel } from './CampusMembersPanel';
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
  // SRS-312.10: a clicked notification links here as /?post=<id>&tab=<for-you|friends>
  // so the target post opens on the correct tab and gets scrolled into view/highlighted
  // once the feed loads -- see the effect below.
  const searchParams = useSearchParams();
  const targetPostIdParam = Number(searchParams.get('post'));
  const targetPostId = Number.isInteger(targetPostIdParam) && targetPostIdParam > 0 ? targetPostIdParam : null;
  // SRS-313/312.10: a clicked comment/reply notification adds &comment=<id>
  // -- only ever meaningful on the matching post, so it's only passed down
  // to that one PostCard below.
  const targetCommentIdParam = Number(searchParams.get('comment'));
  const targetCommentId = Number.isInteger(targetCommentIdParam) && targetCommentIdParam > 0 ? targetCommentIdParam : undefined;
  const initialTab: FeedTab = searchParams.get('tab') === 'friends' ? 'friends' : 'for-you';

  const [token, setToken] = useState('');
  const [authorInitial, setAuthorInitial] = useState('');
  const [currentStudentId, setCurrentStudentId] = useState<number | null>(null);
  const [tab, setTab] = useState<FeedTab>(initialTab);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [highlightedPostId, setHighlightedPostId] = useState<number | null>(null);

  useEffect(() => {
    const stored = storedAccessToken() || '';
    setToken(stored);
    if (!stored) return;
    fetch('/api/profile', { headers: { Authorization: `Bearer ${stored}` } })
      .then((res) => res.json())
      .then((body) => {
        setAuthorInitial(body.profile?.username?.[0]?.toUpperCase() ?? '');
        const id = Number(body.profile?.id);
        setCurrentStudentId(Number.isInteger(id) ? id : null);
      })
      .catch(() => {});
  }, []);

  const [deletedNotice, setDeletedNotice] = useState(false);

  function handlePostUpdated(updated: FeedPost) {
    setPosts((prev) => prev.map((p) => (p.postId === updated.postId ? updated : p)));
  }

  // SRS-307.3: remove the post from this feed immediately. It also
  // disappears from other views (e.g. the author's profile) on their own
  // next load, since those fetch fresh from the same now-deleted row.
  function handlePostDeleted(postId: number) {
    setPosts((prev) => prev.filter((p) => p.postId !== postId));
    setDeletedNotice(true);
    setTimeout(() => setDeletedNotice(false), 4000);
  }

  useEffect(() => {
    if (token) loadFeed(token);
  }, [tab, token]);

  // Once the target post from a notification link has actually loaded into
  // this tab, scroll to it and briefly highlight it. Does nothing if the
  // post isn't on this tab/feed at all (e.g. a stale link to a deleted or
  // since-inaccessible post) -- it just silently finds nothing to scroll to.
  useEffect(() => {
    if (loading || targetPostId === null) return;
    if (!posts.some((p) => p.postId === targetPostId)) return;
    const el = document.getElementById(`post-${targetPostId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedPostId(targetPostId);
    const timer = setTimeout(() => setHighlightedPostId(null), 2500);
    return () => clearTimeout(timer);
  }, [loading, posts, targetPostId]);

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

      <div className="mt-6 flex flex-col items-start gap-6 lg:flex-row">
        <div className="w-full min-w-0 flex-1 space-y-4 lg:max-w-2xl">
          <PostComposer accessToken={token} authorInitial={authorInitial} onPublished={() => token && loadFeed(token)} />

          <FeedSwitcher active={tab} onChange={setTab} />

          {deletedNotice ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Post deleted successfully.</div>
          ) : null}

          {loading ? (
            <LoadingFeedState />
          ) : error ? (
            <ErrorFeedState message={error} />
          ) : posts.length === 0 ? (
            <EmptyFeedState tab={tab === 'friends' ? 'friends' : 'campus'} />
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={`${post.postId}-${post.visibility}`}
                  post={post}
                  accessToken={token}
                  isOwnPost={currentStudentId !== null && currentStudentId === post.authorId}
                  authorInitial={authorInitial}
                  currentStudentId={currentStudentId}
                  highlighted={post.postId === highlightedPostId}
                  targetCommentId={post.postId === targetPostId ? targetCommentId : undefined}
                  onUpdated={handlePostUpdated}
                  onDeleted={handlePostDeleted}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="order-first w-full shrink-0 space-y-4 lg:order-last lg:w-72"><CampusMembersPanel /><ComingSoonPanels /></aside>
      </div>
    </main>
  );
}
