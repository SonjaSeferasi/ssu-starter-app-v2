'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Camera, Clock, Users, GraduationCap, Grid3x3, Images, Landmark, Lock, MessageCircle, Pencil, SquareUser, UserCheck, UserPlus, UserRound, X,
} from 'lucide-react';
import type { StudentProfile } from '../../lib/profile';
import type { FeedPost } from '../feed/types';
import { timeAgo } from '../feed/time';
import { accessToken, clearSession, storedAccessToken } from '../../lib/account/session';
import { SessionNotice } from '../navigation/section-page';
import { useNavigationSession } from '../navigation/social-shell';
import styles from './profile.module.css';

type Category = 'posts' | 'tagged';

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

type FriendAction = 'send' | 'cancel' | 'accept' | 'decline' | 'unfriend';

// SRS-114, SRS-116: friend request actions. Any page that shows a request can reuse this.
export async function friendAction(username: string, action: FriendAction): Promise<StudentProfile> {
  const { response, data } = await profileFetch('/api/friends', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, action }),
  });
  if (!response.ok) throw new Error(data.error || 'Unable to update this friend request.');
  window.dispatchEvent(new Event('socialu-notifications-changed'));
  return data.profile;
}

function ProfileActions({ profile, onChange }: { profile: StudentProfile; onChange: (profile: StudentProfile) => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (profile.is_own) return <div className={styles.actions}><Link href="/profile/edit" className={styles.button}><Pencil />Edit profile</Link><ProfileLogout /></div>;

  async function run(action: FriendAction) {
    if (action === 'unfriend' && !window.confirm(`Remove ${profile.name} from your friends?`)) return;
    setBusy(true); setError('');
    try { onChange(await friendAction(profile.username, action)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update this friend request.'); }
    finally { setBusy(false); }
  }

  async function message() {
    setBusy(true); setError('');
    try {
      const { response, data } = await profileFetch('/api/conversations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: profile.username }),
      });
      if (!response.ok) throw new Error(data.error || 'Unable to open this conversation.');
      router.push(`/messages/${data.conversationId}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to open this conversation.');
      setBusy(false);
    }
  }

  // SRS-113.16-113.18
  return <div className={styles.actions}>
    {profile.is_friend
      ? <button type="button" className={styles.button} onClick={() => run('unfriend')} disabled={busy} title="Remove friend"><UserCheck />Friends</button>
      : profile.friend_request === 'sent'
        ? <button type="button" className={styles.button} onClick={() => run('cancel')} disabled={busy} title="Cancel friend request"><Clock />Requested</button>
        : profile.friend_request === 'received'
          ? <>
            <button type="button" className={styles.button} onClick={() => run('accept')} disabled={busy}><UserCheck />Accept</button>
            <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => run('decline')} disabled={busy}><X />Decline</button>
          </>
          : <button type="button" className={styles.button} onClick={() => run('send')} disabled={busy}><UserPlus />Add Friend</button>}
    {/* SRS-113.17: only current friends can start a private conversation. */}
    {profile.is_friend && <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={message} disabled={busy}><MessageCircle />Message</button>}
    {error && <p className={`${styles.notice} ${styles.error}`} role="alert" style={{ width: '100%', marginTop: 0 }}>{error}</p>}
  </div>;
}

type ProfileFriend = { username: string; name: string; photo_url: string | null; is_me: boolean; is_friend: boolean; friend_request: 'sent' | 'received' | null };

// One person in a friends list, with your own friend status toward them (nothing when you are already friends).
function FriendListRow({ friend, onClose }: { friend: ProfileFriend; onClose: () => void }) {
  const [person, setPerson] = useState(friend);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(action: FriendAction) {
    setBusy(true); setError('');
    try {
      const updated = await friendAction(person.username, action);
      setPerson(current => ({ ...current, is_friend: updated.is_friend, friend_request: updated.friend_request }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update this friend request.'); }
    finally { setBusy(false); }
  }

  return <li className={styles.friendItem}>
    <Link href={person.is_me ? '/profile' : `/students/${encodeURIComponent(person.username)}`} className={styles.friendRow} onClick={onClose}>
      <Avatar url={person.photo_url} name={person.name} />
      <span className={styles.friendName}>{person.name}<small>@{person.username}</small></span>
    </Link>
    {person.is_me ? <span className={styles.friendTag}>You</span>
      : person.is_friend ? null
      : person.friend_request === 'received' ? <span className={styles.friendActions}>
        <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => run('accept')} disabled={busy}>Accept</button>
        <button type="button" className={`${styles.button} ${styles.secondary} ${styles.small}`} onClick={() => run('decline')} disabled={busy}>Decline</button>
      </span>
      : person.friend_request === 'sent'
        ? <button type="button" className={`${styles.button} ${styles.secondary} ${styles.small}`} onClick={() => run('cancel')} disabled={busy} title="Cancel friend request"><Clock />Requested</button>
        : <button type="button" className={`${styles.button} ${styles.small}`} onClick={() => run('send')} disabled={busy}><UserPlus />Add Friend</button>}
    {error && <p className={styles.friendError} role="alert">{error}</p>}
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

function PostViewer({ post, onClose }: { post: FeedPost; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const hasPhotos = post.photos.length > 0;
  return <div className={styles.backdrop} onClick={onClose}>
    <div className={`${styles.viewer} ${hasPhotos ? '' : styles.viewerTextOnly}`} role="dialog" aria-modal="true" aria-label={`Post by ${post.authorName}`} onClick={event => event.stopPropagation()}>
      {hasPhotos && <div className={styles.viewerMedia}>{post.photos.map((url, index) => <img key={url} src={url} alt={`Photo ${index + 1} of ${post.photos.length}`} />)}</div>}
      <div className={styles.viewerBody}>
        <div className={styles.viewerAuthor}>
          <Avatar url={post.authorPhotoUrl} name={post.authorName} />
          <span>{post.authorName}</span>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close post" autoFocus><X size={18} /></button>
        </div>
        {post.textContent && <p className={styles.viewerText}>{post.textContent}</p>}
        <span className={styles.viewerDate}>
          {timeAgo(post.publishedAt)}{post.editedAt ? ' · edited' : ''} · {post.visibility === 'public' ? 'Public' : 'Friends only'}
        </span>
      </div>
    </div>
  </div>;
}

function PostGrid({ username, category, own }: { username: string; category: Category; own: boolean }) {
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<FeedPost | null>(null);

  useEffect(() => {
    let active = true;
    setPosts(null); setError('');
    profileFetch(`/api/profiles/content?username=${encodeURIComponent(username)}&category=${category}`)
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) throw new Error(data.error || 'Unable to load posts.');
        setPosts(data.posts);
      })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load posts.'); });
    return () => { active = false; };
  }, [username, category]);

  if (error) return <p className={`${styles.notice} ${styles.error}`} role="alert">{error}</p>;
  if (!posts) return <div className={styles.grid} aria-busy="true">{[0, 1, 2].map(key => <div key={key} className={`${styles.tile} ${styles.skeleton}`} />)}</div>;
  // SRS-112.7: an empty-content message for each category.
  if (!posts.length) return <div className={styles.empty}>
    {category === 'posts' ? <Camera /> : <SquareUser />}
    <h2>{category === 'posts' ? 'No posts yet' : 'No tagged posts yet'}</h2>
    <p>{category === 'posts'
      ? own ? 'Share your first post from the Campus Feed and it will show up here.' : 'When they share posts you can see, they will show up here.'
      : own ? 'Posts you are tagged in will show up here.' : 'Posts they are tagged in will show up here.'}</p>
  </div>;

  return <>
    <div className={styles.grid}>
      {posts.map(post => <button type="button" key={post.postId} className={styles.tile} onClick={() => setOpen(post)}
        aria-label={`Open post from ${timeAgo(post.publishedAt)}${post.textContent ? `: ${post.textContent.slice(0, 60)}` : ''}`}>
        {post.photos[0] ? <img src={post.photos[0]} alt="" /> : <div className={styles.tileTextBg}><p className={styles.tileText}>{post.textContent}</p></div>}
        {post.photos.length > 1 && <span className={styles.tileIcon} aria-hidden="true"><Images /></span>}
        {post.visibility === 'friends_only' && post.photos.length <= 1 && <span className={styles.tileIcon} title="Friends only" aria-hidden="true"><Lock /></span>}
      </button>)}
    </div>
    {open && <PostViewer post={open} onClose={() => setOpen(null)} />}
  </>;
}

function ProfileContent({ username }: { username?: string }) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState(false);
  // SRS-112.2: Posts is selected when a profile opens.
  const [category, setCategory] = useState<Category>('posts');
  const [showFriends, setShowFriends] = useState(false);

  useEffect(() => {
    let active = true;
    setProfile(null); setError(''); setMissing(false); setCategory('posts'); setShowFriends(false);
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

  const details = [profile.major, profile.class_year].filter(Boolean).join(' · ');
  return <main className={styles.page}>
    <section className={styles.header} aria-label={`${profile.name}'s profile`}>
      <div className={styles.avatarWrap}>
        <Avatar url={profile.photo_url} name={profile.name} />
        {profile.is_own && <Link href="/profile/edit" className={styles.avatarBadge} aria-label="Change profile photo"><Camera size={18} /></Link>}
      </div>
      <div className={styles.info}>
        <div className={styles.nameRow}>
          <div><h1 className={styles.name}>{profile.name}</h1><p className={styles.username}>@{profile.username}</p></div>
          <ProfileActions profile={profile} onChange={setProfile} />
        </div>
        {/* SRS-111.1, SRS-111.4, SRS-111.8, SRS-113.8, SRS-113.9 */}
        <ul className={styles.stats}><li>{count(profile.post_count, 'post', 'posts')}</li><li><button type="button" className={styles.statButton} onClick={() => setShowFriends(true)}>{count(profile.friend_count, 'friend', 'friends')}</button></li></ul>
        <p className={styles.meta}>
          {profile.university && <span><Landmark />{profile.university}</span>}
          {details && <span><GraduationCap />{details}</span>}
        </p>
        {profile.bio ? <p className={styles.bio}>{profile.bio}</p> : profile.is_own && <p className={styles.hint}>Add a bio so classmates can get to know you.</p>}
      </div>
    </section>

    {profile.is_own && !profile.setup_completed && <div className={styles.setupBanner} role="status">
      <p><strong>Finish setting up your profile.</strong> Add a profile photo, your major, class year, and a short bio.</p>
      <Link href="/profile/edit" className={styles.button}>Complete profile</Link>
    </div>}

    {/* SRS-112.1: Posts and Tagged only; Snipes never appear on a profile. */}
    <div className={styles.tabs} role="tablist" aria-label="Profile content">
      <button type="button" role="tab" className={styles.tab} aria-selected={category === 'posts'} onClick={() => setCategory('posts')}><Grid3x3 />Posts</button>
      <button type="button" role="tab" className={styles.tab} aria-selected={category === 'tagged'} onClick={() => setCategory('tagged')}><SquareUser />Tagged</button>
    </div>
    <div role="tabpanel"><PostGrid username={profile.username} category={category} own={profile.is_own} /></div>
    {showFriends && <FriendsList profile={profile} onClose={() => setShowFriends(false)} />}
  </main>;
}

export function ProfileView({ username }: { username?: string }) {
  const session = useNavigationSession();
  return session === 'signed-in' ? <ProfileContent username={username} /> : <SessionNotice state={session} />;
}
