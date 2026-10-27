'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Pencil, X } from 'lucide-react';
import type { StudentProfile } from '../../lib/profile';
import type { FeedPost } from '../feed/types';
import { accessToken } from '../../lib/account/session';
import { PostCard } from '../feed/PostCard';
import { PostComposer } from '../feed/PostComposer';
import { profileFetch } from './profile-view';
import styles from './profile-campus.module.css';

export function ProfileJournal({ profile, onPostCountChange }: { profile: StudentProfile; onPostCountChange: (delta: number) => void }) {
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [token, setToken] = useState('');
  const [viewerId, setViewerId] = useState<number | null>(null);
  const [viewerInitial, setViewerInitial] = useState('');
  const [composer, setComposer] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setError('');
    accessToken().then(value => {
      if (!value) throw new Error('Please sign in again.');
      if (active) setToken(value);
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to check your session.'); });
    profileFetch('/api/profile').then(({ response, data }) => {
      if (active && response.ok) {
        const id = Number(data.profile?.id);
        setViewerId(Number.isSafeInteger(id) && id > 0 ? id : null);
        setViewerInitial(data.profile?.username?.[0]?.toUpperCase() ?? '');
      }
    }).catch(() => {});
    profileFetch(`/api/profiles/content?username=${encodeURIComponent(profile.username)}&category=posts`)
      .then(({ response, data }) => {
        if (!response.ok) throw new Error(data.error || 'Unable to load this journal.');
        if (active) setPosts(data.posts);
      })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load this journal.'); });
    return () => { active = false; };
  }, [profile.username, revision]);

  return <section className={styles.journal} aria-label="Profile posts">
    <div className={styles.sectionHeading}>
      <h2>Recent posts</h2>
      {profile.is_own && <button type="button" className={styles.createPost} onClick={() => setComposer(value => !value)} aria-expanded={composer} aria-controls="profile-composer" disabled={!token}>
        {composer ? <X size={17} /> : <Pencil size={17} />}{composer ? 'Close composer' : 'Create post'}
      </button>}
    </div>
    {composer && <div id="profile-composer" className={styles.composer}><PostComposer accessToken={token} authorInitial={profile.name[0]?.toUpperCase() ?? ''} onPublished={() => { setComposer(false); setRevision(value => value + 1); onPostCountChange(1); }} /></div>}
    {error ? <div className={styles.empty} role="alert"><p>{error}</p><button type="button" onClick={() => setRevision(value => value + 1)}>Try again</button></div>
      : posts === null || !token ? <div className={styles.journalLoading} role="status">
        <span className={styles.srOnly}>Loading posts…</span>
        {[0, 1].map(index => <div key={index} className={styles.loadingCard} aria-hidden="true">
          <div className={styles.loadingHeader}><span className={styles.loadingAvatar} /><span className={styles.loadingAuthor} /></div>
          <span className={styles.loadingLine} /><span className={styles.loadingShortLine} />
        </div>)}
      </div>
      : !posts.length ? <div className={styles.empty}><BookOpen size={32} /><h3>No posts yet</h3><p>{profile.is_own ? 'Posts you share will appear here.' : 'Posts they share with you will appear here.'}</p></div>
      : <div className={styles.journalPosts}>{posts.map(post => <PostCard key={post.postId} post={post} accessToken={token} isOwnPost={viewerId === post.authorId} authorInitial={viewerInitial} currentStudentId={viewerId}
        onUpdated={updated => setPosts(current => current?.map(item => item.postId === updated.postId ? updated : item) ?? null)}
        onDeleted={id => { setPosts(current => current?.filter(item => item.postId !== id) ?? null); if (profile.is_own) onPostCountChange(-1); }} />)}</div>}
  </section>;
}
