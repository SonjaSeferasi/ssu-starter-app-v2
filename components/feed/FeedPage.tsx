'use client';

import { useEffect, useState } from 'react';
import { FeedSwitcher, type FeedTab } from './FeedSwitcher';
import { PostComposer } from './PostComposer';
import { PostCard } from './PostCard';
import { LoadingFeedState, EmptyFeedState, ErrorFeedState } from './FeedStates';
import type { FeedPost } from './types';

const DEV_STUDENT_ID_KEY = 'dev_student_id';

export function FeedPage() {
  const [studentId, setStudentId] = useState('');
  const [tab, setTab] = useState<FeedTab>('campus');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setStudentId(localStorage.getItem(DEV_STUDENT_ID_KEY) || '');
  }, []);

  useEffect(() => {
    if (studentId) loadFeed();
  }, [tab, studentId]);

  async function loadFeed() {
    setLoading(true);
    setError('');
    const res = await fetch(`/api/posts/feed/${tab}`, { headers: { 'x-student-id': studentId } });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body.error || 'Failed to load the feed.');
      return;
    }
    setPosts(body.posts);
  }

  function handleStudentIdChange(value: string) {
    setStudentId(value);
    localStorage.setItem(DEV_STUDENT_ID_KEY, value);
  }

  return (
    <main className="min-h-screen bg-[#f4f7f2] px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-stone-900">Campus Feed</h1>
          <FeedSwitcher active={tab} onChange={setTab} />
        </div>

        {!studentId ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">Temporary dev sign-in</p>
            <p className="mt-1">
              Real login isn&apos;t built yet, so enter a <code>student_id</code> from the seeded <code>students</code>{' '}
              table to act as that student.
            </p>
            <input
              type="number"
              placeholder="e.g. 1"
              onChange={(e) => handleStudentIdChange(e.target.value)}
              className="mt-2 w-32 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>
        ) : (
          <>
            <PostComposer studentId={studentId} onPublished={loadFeed} />

            {loading ? (
              <LoadingFeedState />
            ) : error ? (
              <ErrorFeedState message={error} />
            ) : posts.length === 0 ? (
              <EmptyFeedState tab={tab} />
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post.postId} post={post} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
