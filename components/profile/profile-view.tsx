'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Users, Bookmark, Check, Settings, Camera, GraduationCap, Grid3x3, Images, Lock, MessageCircle, SquareUser, UserCheck, UserPlus, UserRound, X,
} from 'lucide-react';
import type { StudentProfile } from '../../lib/profile';
import type { FeedPost } from '../feed/types';
import { timeAgo } from '../feed/time';
import { accessToken, clearSession, storedAccessToken } from '../../lib/account/session';
import { SessionNotice } from '../navigation/section-page';
import { useNavigationSession } from '../navigation/social-shell';
import styles from './profile.module.css';
import { FriendActions } from '../friends/friend-actions';
import { SavePostButton, ShareProfile, socialRequest, type SocialSummary } from './social-actions';

type Category = 'posts' | 'saved' | 'tagged';

// /api/auth/session reports a verified student without a SocialU profile row as signed out (409),
// but that student must still reach /profile to create one. A stored token lets the page try;
// the profile API then decides, and a 401 falls back to the sign-in notice.
export function useProfileGate() {
  const session = useNavigationSession();
  const [hasToken, setHasToken] = useState(false);
  useEffect(() => { setHasToken(Boolean(storedAccessToken())); }, [session]);
  return session === 'signed-in' || (session === 'signed-out' && hasToken) ? 'ready' : session;
}

export async function profileFetch(path: string, init: RequestInit = {}) {
  const token = await accessToken();
  if (!token) throw new Error('Please sign in again.');
  const response = await fetch(path, { ...init, cache: 'no-store', headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

// SRS-109.1: a default avatar until a profile photo is saved.
export function Avatar({ url, name, className = '' }: { url: string | null; name: string; className?: string }) {
  return <span className={`${styles.avatar} ${className}`}>{url ? <img src={url} alt={`${name}'s profile photo`} /> : <UserRound aria-label="Default profile avatar" />}</span>;
}

function count(value: number, one: string, many: string) {
  return <><strong>{value.toLocaleString()}</strong> {value === 1 ? one : many}</>;
}

// Preserve the group’s profile logout action when replacing the profile layout.
export function ProfileLogout() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  async function logout() {
    setLoggingOut(true);
    try {
      const token = await accessToken();
      if (token) await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch {
      // Still sign out on this device if the server request fails.
    } finally {
      clearSession();
      router.push('/login');
    }
  }
  return <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={logout} disabled={loggingOut}>
    {loggingOut ? 'Logging out…' : 'Log out'}
  </button>;
}

type ProfileFriend = { username: string; name: string; photo_url: string | null; is_me: boolean; is_friend: boolean; friend_request: 'sent' | 'received' | null };

// One person in a friends list, with your own friend status toward them (nothing when you are already friends).
function FriendListRow({ friend, onClose }: { friend: ProfileFriend; onClose: () => void }) {
  return <li className={styles.friendItem}>
    <Link href={friend.is_me ? '/profile' : `/students/${encodeURIComponent(friend.username)}`} className={styles.friendRow} onClick={onClose}>
      <Avatar url={friend.photo_url} name={friend.name} />
      <span className={styles.friendName}>{friend.name}<small>@{friend.username}</small></span>
    </Link>
    {friend.is_me ? <span className={styles.friendTag}>You</span> : <FriendActions username={friend.username} />}
  </li>;
}

// SRS-111.4, SRS-113.9: who this student is friends with.
function FriendsList({ profile, onClose }: { profile: StudentProfile; onClose: () => void }) {
  const [friends, setFriends] = useState<ProfileFriend[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    let active = true;
    profileFetch(profile.is_own ? '/api/profiles/friends' : `/api/profiles/friends?username=${encodeURIComponent(profile.username)}`)
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) throw new Error(data.error || 'Unable to load friends.');
        setFriends(data.friends);
      })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load friends.'); });
    return () => { active = false; };
  }, [profile.is_own, profile.username]);

  return <div className={styles.backdrop} onClick={onClose}>
    <div className={styles.friendsDialog} role="dialog" aria-modal="true" aria-label={`${profile.name}'s friends`} onClick={event => event.stopPropagation()}>
      <div className={styles.viewerAuthor}>
        <span>{profile.is_own ? 'Your friends' : `${profile.name}'s friends`}</span>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close friends list" autoFocus><X size={18} /></button>
      </div>
      {error ? <p className={`${styles.notice} ${styles.error}`} role="alert">{error}</p>
        : !friends ? <div className={styles.skeleton} style={{ height: 120, marginTop: 16 }} aria-busy="true" />
        : !friends.length ? <div className={styles.empty}><Users /><h2>No friends yet</h2>
          <p>{profile.is_own ? 'Add classmates from their profiles and they will show up here.' : 'When they add friends, they will show up here.'}</p></div>
        : <ul className={styles.friendsList}>{friends.map(friend => <FriendListRow key={friend.username} friend={friend} onClose={onClose} />)}</ul>}
    </div>
  </div>;
}

function ProfileActions({ profile, social, onFollow }: { profile: StudentProfile; social: SocialSummary | null; onFollow: (data: SocialSummary) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function follow() {
    if (!social || busy) return;
    setBusy(true); setError('');
    try { onFollow(await socialRequest('', { action: social.following ? 'unfollow' : 'follow', username: profile.username })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to follow this student.'); }
    finally { setBusy(false); }
  }
  return <div className={styles.actions}>
    {profile.is_own ? <><Link href="/profile/edit" className={styles.button}>Edit profile</Link><Link href="/friends" className={`${styles.button} ${styles.secondary}`}>Friends</Link></> : <>
      <button type="button" className={styles.button} disabled={busy || !social} aria-pressed={social?.following ?? false} onClick={follow}>
        {social?.following ? <UserCheck /> : <UserPlus />}{busy ? 'Updating…' : social?.following ? 'Following' : 'Follow'}
      </button>
      <FriendActions username={profile.username} inProfile />
    </>}
    <ShareProfile username={profile.username} />
    {error && <p role="alert" className={styles.actionError}>{error}</p>}
  </div>;
}

function PostViewer({ post, onClose, onSavedChange }: { post: FeedPost; onClose: () => void; onSavedChange?: (saved: boolean) => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; previous?.focus(); };
  }, [onClose]);
  const hasPhotos = post.photos.length > 0;
  return <div className={styles.backdrop} onClick={onClose}>
    <div ref={dialogRef} className={`${styles.viewer} ${hasPhotos ? '' : styles.viewerTextOnly}`} role="dialog" aria-modal="true" aria-label={`Post by ${post.authorName}`} onClick={event => event.stopPropagation()}>
      {hasPhotos && <div className={styles.viewerMedia}>{post.photos.map((photo, index) => <img key={photo.assetId} src={photo.url} alt={`Photo ${index + 1} of ${post.photos.length}`} />)}</div>}
      <div className={styles.viewerBody}>
        <div className={styles.viewerAuthor}>
          <Avatar url={post.authorPhotoUrl} name={post.authorName} />
          <span>{post.authorName}</span>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close post" autoFocus><X size={18} /></button>
        </div>
        {post.textContent && <p className={styles.viewerText}>{post.textContent}</p>}
        <SavePostButton postId={post.postId} onChange={onSavedChange} />
        <span className={styles.viewerDate}>
          {timeAgo(post.publishedAt)}{post.editedAt ? ' · edited' : ''} · {post.visibility === 'public' ? 'Public' : 'Friends only'}
        </span>
      </div>
    </div>
  </div>;
}

function PostGrid({ username, category, own, onCount }: { username: string; category: Category; own: boolean; onCount: (count: number | null) => void }) {
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<FeedPost | null>(null);

  useEffect(() => {
    let active = true;
    setPosts(null); setError(''); onCount(null);
    profileFetch(category === 'saved' ? '/api/profiles/social?action=saved' : `/api/profiles/content?username=${encodeURIComponent(username)}&category=${category}`)
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) throw new Error(data.error || 'Unable to load posts.');
        setPosts(data.posts); onCount(data.posts.length);
      })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load posts.'); });
    return () => { active = false; };
  }, [username, category, onCount]);

  if (error) return <p className={`${styles.notice} ${styles.error}`} role="alert">{error}</p>;
  if (!posts) return <div className={styles.grid} aria-busy="true">{[0, 1, 2].map(key => <div key={key} className={`${styles.tile} ${styles.skeleton}`} />)}</div>;
  // SRS-112.7: an empty-content message for each category.
  if (!posts.length) return <div className={styles.empty}>
    {category === 'saved' ? <Bookmark /> : category === 'posts' ? <Camera /> : <SquareUser />}
    <h2>{category === 'saved' ? 'Your favorite moments, kept here' : category === 'posts' ? 'No posts yet' : 'No tagged posts yet'}</h2>
    <p>{category === 'saved' ? 'Tap Save on a post to keep it here. Only you can see your saved posts.' : category === 'posts'
      ? own ? 'Share your first post from the Campus Feed and it will show up here.' : 'When they share posts you can see, they will show up here.'
      : own ? 'Posts you are tagged in will show up here.' : 'Posts they are tagged in will show up here.'}</p>
  </div>;

  return <>
    <div className={styles.grid}>
      {posts.map(post => <button type="button" key={post.postId} className={styles.tile} onClick={() => setOpen(post)}
        aria-label={`Open post from ${timeAgo(post.publishedAt)}${post.textContent ? `: ${post.textContent.slice(0, 60)}` : ''}`}>
        {post.photos[0] ? <img src={post.photos[0].url} alt="" /> : <div className={styles.tileTextBg}><p className={styles.tileText}>{post.textContent}</p></div>}
        {post.photos.length > 1 && <span className={styles.tileIcon} aria-hidden="true"><Images /></span>}
        {post.visibility === 'friends_only' && post.photos.length <= 1 && <span className={styles.tileIcon} title="Friends only" aria-hidden="true"><Lock /></span>}
      </button>)}
    </div>
    {open && <PostViewer post={open} onClose={() => setOpen(null)} onSavedChange={saved => { if (!saved && category === 'saved') { const remaining = posts.filter(post => post.postId !== open.postId); setPosts(remaining); onCount(remaining.length); setOpen(null); } }} />}
  </>;
}

function ProfileContent({ username }: { username?: string }) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);
  // SRS-112.2: Posts is selected when a profile opens.
  const [category, setCategory] = useState<Category>('posts');
  const [showFriends, setShowFriends] = useState(false);
  const [social, setSocial] = useState<SocialSummary | null>(null);
  const [socialError, setSocialError] = useState('');
  const [socialRetry, setSocialRetry] = useState(0);
  const [contentCount, setContentCount] = useState<number | null>(null);

  useEffect(() => {
    const refresh = () => setSocialRetry(value => value + 1);
    window.addEventListener('socialu-connections-changed', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('socialu-connections-changed', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);


  useEffect(() => {
    let active = true;
    setSocial(null); setSocialError('');
    socialRequest(`?username=${encodeURIComponent(username ?? '')}`).then(data => { if (active) setSocial(data); })
      .catch(reason => { if (active) setSocialError(reason.message); });
    return () => { active = false; };
  }, [username, socialRetry]);

  useEffect(() => {
    let active = true;
    setProfile(null); setError(''); setMissing(false); setCategory('posts');
    profileFetch(username ? `/api/profiles?username=${encodeURIComponent(username)}` : '/api/profiles')
      .then(({ response, data }) => {
        if (!active) return;
        if (response.status === 404) { setMissing(true); return; }
        if (!response.ok) throw new Error(data.error || 'Unable to load this profile.');
        setProfile(data.profile);
      })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load this profile.'); });
    return () => { active = false; };
  }, [username]);

  if (missing) return <main className={styles.page}><div className={styles.empty}><SquareUser /><h2>Profile not available</h2>
    <p>{username ? 'This student’s profile cannot be shown. Check the username and try again.' : 'Finish creating your SocialU profile first.'}</p>
    {!username && <Link href="/profile/edit" className={styles.button} style={{ marginTop: 16 }}>Set up profile</Link>}
  </div></main>;
  if (error) return <main className={styles.page}><p className={`${styles.notice} ${styles.error}`} role="alert">{error}</p></main>;
  if (!profile) return <main className={styles.page} aria-busy="true"><div className={`${styles.skeleton}`} style={{ height: 240 }} /></main>;

  return <main className={`${styles.page} ${styles.profilePage}`}>
    <div className={styles.campusBar}><span>Your campus. Your people.</span><span className={styles.verified}><i />Campus verified <GraduationCap /></span></div>
    <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/profile">My profile</Link><span>/</span><span>{profile.name}</span></nav>
    <section className={styles.header} aria-label={`${profile.name}'s profile`}>
      <div className={styles.avatarWrap}>
        <Avatar url={profile.photo_url} name={profile.name} />
        <span className={styles.avatarBadge} title="Verified university account"><Check size={14} /><span className={styles.srOnly}>Verified university account</span></span>
      </div>
      <div className={styles.info}>
        <div className={styles.nameRow}><h1 className={styles.name}>{profile.name}</h1>
          {profile.is_own && <Link href="/profile/settings" className={styles.settings} aria-label="Profile settings"><Settings size={17} /></Link>}
        </div>
        <ul className={styles.stats}>
          <li>{count(profile.post_count, 'post', 'posts')}</li>
          <li><button type="button" className={styles.statButton} onClick={() => setShowFriends(true)}>{count(profile.friend_count, 'friend', 'friends')}</button></li>
          <li><strong>{social ? social.follower_count.toLocaleString() : '—'}</strong> followers</li>
          <li><strong>{social ? social.following_count.toLocaleString() : '—'}</strong> following</li>
        </ul>
        <p className={styles.username}>@{profile.username}</p>
        {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
        {profile.major && <p className={styles.major}>{profile.major}</p>}
        <p className={styles.meta}>
          {profile.university && <span><GraduationCap />{profile.university}</span>}
          {profile.class_year && <span>{profile.class_year}</span>}
        </p>
        <ProfileActions profile={profile} social={social} onFollow={setSocial} />
      </div>
    </section>
    {socialError && <p className={`${styles.notice} ${styles.error}`} role="alert">{socialError} <button onClick={() => setSocialRetry(value => value + 1)}>Retry</button></p>}

    {profile.is_own && !profile.setup_completed && <div className={styles.setupBanner} role="status">
      <p><strong>Finish setting up your profile.</strong> Add a profile photo, your major, and class year.</p>
      <Link href="/profile/edit" className={styles.button}>Complete profile</Link>
    </div>}

    {showFriends && <FriendsList profile={profile} onClose={() => setShowFriends(false)} />}
    <div className={styles.tabsRow}>
      <div className={styles.tabs} role="tablist" aria-label="Profile content">
        {(['posts', ...(profile.is_own ? ['saved'] : []), 'tagged'] as Category[]).map(item => <button key={item} id={`tab-${item}`} aria-controls="profile-posts" type="button" role="tab" className={styles.tab} aria-selected={category === item} tabIndex={category === item ? 0 : -1}
          onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const items: Category[] = profile.is_own ? ['posts', 'saved', 'tagged'] : ['posts', 'tagged']; const index = items.indexOf(item); const next = event.key === 'Home' ? items[0] : event.key === 'End' ? items[items.length - 1] : items[(index + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length]; setCategory(next); document.getElementById(`tab-${next}`)?.focus(); } }}
          onClick={() => setCategory(item)}>{item === 'posts' ? <Grid3x3 /> : item === 'saved' ? <Bookmark /> : <UserRound />}{item[0].toUpperCase() + item.slice(1)}</button>)}
      </div>
      <span className={styles.momentCount}>{contentCount === null ? 'Loading…' : `${contentCount} ${contentCount === 1 ? 'moment' : 'moments'}`}</span>
    </div>
    {category === 'saved' && <p className={styles.savedNote}><Lock size={12} />Only you can see your saved posts.</p>}
    <div id="profile-posts" role="tabpanel" aria-labelledby={`tab-${category}`} tabIndex={0}><PostGrid key={`${profile.username}-${category}`} username={profile.username} category={category} own={profile.is_own} onCount={setContentCount} /></div>
    {profile.is_own && <nav className={styles.profileDock} aria-label="Profile shortcuts">
      <button className={styles.dockButton} aria-pressed={category !== 'saved'} onClick={() => setCategory('posts')}><UserRound />Profile</button>
      <button className={styles.dockButton} aria-pressed={category === 'saved'} onClick={() => setCategory('saved')}><Bookmark />Saved</button>
      <Link className={styles.dockButton} href="/profile/edit"><Settings />Edit</Link>
      <ShareProfile username={profile.username} compact />
    </nav>}

  </main>;
}

export function ProfileView({ username }: { username?: string }) {
  const session = useNavigationSession();
  return session === 'signed-in' ? <ProfileContent username={username} /> : <SessionNotice state={session} />;
}
