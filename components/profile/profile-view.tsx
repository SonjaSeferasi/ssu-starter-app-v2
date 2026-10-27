'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Users, Bookmark, Check, Settings, Camera, GraduationCap, BookOpen, FileText, ArrowUpRight, Pencil, Tag, Images, Lock, MessageCircle, SquareUser, UserCheck, UserPlus, UserRound, X, Palette,
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
import { ProfileCampusSidebar } from './profile-campus-sidebar';
import { ProfileJournal } from './profile-journal';
import campus from './profile-campus.module.css';
import spaceStyles from './profile-space.module.css';
import { ProfileCover } from './profile-cover';
import { useProfileSpace } from './use-profile-space';
import { ProfileCorner } from './profile-corner';
import { ProfileMemories } from './profile-memories';
import { ProfilePortrait } from './profile-portrait';
import { ProfileContentTabs, type ProfileCategory } from './profile-content-tabs';

type Category = ProfileCategory;

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
    {friend.is_me ? <span className={styles.friendTag}>You</span> : <div className={styles.friendControls}><FriendActions username={friend.username} showBlock={false} /></div>}
  </li>;
}

export type PeopleList = 'friends' | 'followers' | 'following';
const PEOPLE_LABELS: Record<PeopleList, string> = { friends: 'Friends', followers: 'Followers', following: 'Following' };

// SRS-111.4, SRS-113.9: who this student is friends with, who follows them, and who they follow.
function PeopleDialog({ profile, initial, onClose }: { profile: StudentProfile; initial: PeopleList; onClose: () => void }) {
  const [list, setList] = useState<PeopleList>(initial);
  const [people, setPeople] = useState<ProfileFriend[] | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    window.addEventListener('socialu-connections-changed', refresh);
    return () => window.removeEventListener('socialu-connections-changed', refresh);
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    let active = true;
    setPeople(null); setError('');
    const query = new URLSearchParams({ list, ...(profile.is_own ? {} : { username: profile.username }) });
    profileFetch(`/api/profiles/friends?${query}`)
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) throw new Error(data.error || 'Unable to load this list.');
        setPeople(data.friends);
      })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load this list.'); });
    return () => { active = false; };
  }, [list, profile.is_own, profile.username, revision]);

  const empty = list === 'friends'
    ? { title: 'No friends yet', text: profile.is_own ? 'Add classmates from their profiles and they will show up here.' : 'When they add friends, they will show up here.' }
    : list === 'followers'
      ? { title: 'No followers yet', text: profile.is_own ? 'When someone follows you, they will show up here.' : 'When someone follows them, they will show up here.' }
      : { title: 'Not following anyone yet', text: profile.is_own ? 'Students you follow will show up here.' : 'Students they follow will show up here.' };

  return <div className={styles.backdrop} onClick={onClose}>
    <div className={styles.friendsDialog} role="dialog" aria-modal="true" aria-label={`${profile.name}'s ${PEOPLE_LABELS[list].toLowerCase()}`} onClick={event => event.stopPropagation()}>
      <div className={styles.viewerAuthor}>
        <span>{profile.is_own ? 'Your connections' : profile.name}</span>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close list" autoFocus><X size={18} /></button>
      </div>
      <div className={styles.peopleTabs} role="tablist" aria-label="Connections">
        {(Object.keys(PEOPLE_LABELS) as PeopleList[]).map(item => <button key={item} type="button" role="tab" aria-selected={list === item}
          className={styles.peopleTab} onClick={() => setList(item)}>{PEOPLE_LABELS[item]}</button>)}
      </div>
      <div role="tabpanel">
        {error ? <p className={`${styles.notice} ${styles.error}`} role="alert">{error}</p>
          : !people ? <div className={styles.skeleton} style={{ height: 120, marginTop: 16 }} aria-busy="true" />
          : !people.length ? <div className={styles.empty}><Users /><h2>{empty.title}</h2><p>{empty.text}</p></div>
          : <ul className={styles.friendsList}>{people.map(person => <FriendListRow key={person.username} friend={person} onClose={onClose} />)}</ul>}
      </div>
    </div>
  </div>;
}

function ProfileActions({ profile, social, onFollow }: { profile: StudentProfile; social: SocialSummary | null; onFollow: (data: SocialSummary) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function follow() {
    if (!social || busy) return;
    setBusy(true); setError('');
    try {
      onFollow(await socialRequest('', { action: social.following ? 'unfollow' : 'follow', username: profile.username }));
      window.dispatchEvent(new Event('socialu-connections-changed'));
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to follow this student.'); }
    finally { setBusy(false); }
  }
  return <div className={`${styles.actions} ${campus.actions}`}>
    {profile.is_own ? <><Link href="/profile/edit" className={styles.button}><Pencil size={16} />Edit profile</Link></> : <>
      <button type="button" className={styles.button} disabled={busy || !social} aria-pressed={social?.following ?? false} onClick={follow}>
        {social?.following ? <UserCheck /> : <UserPlus />}{busy ? 'Updating…' : social?.following ? 'Following' : 'Follow'}
      </button>
      <FriendActions username={profile.username} inProfile />
    </>}
    <ShareProfile username={profile.username} />
    {error && <p role="alert" className={styles.actionError}>{error}</p>}
  </div>;
}

export function PostViewer({ post, onClose, onSavedChange }: { post: FeedPost; onClose: () => void; onSavedChange?: (saved: boolean) => void }) {
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

export function PostGrid({ username, category, own, onCount }: { username: string; category: Category; own: boolean; onCount: (count: number | null) => void }) {
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
  const [people, setPeople] = useState<PeopleList | null>(null);
  const [social, setSocial] = useState<SocialSummary | null>(null);
  const [socialError, setSocialError] = useState('');
  const [socialRetry, setSocialRetry] = useState(0);
  const [contentCount, setContentCount] = useState<number | null>(null);
  const [lookSaved,setLookSaved]=useState(false);
  const space = useProfileSpace(profile?.username ?? null);
  useEffect(()=>{setLookSaved(new URLSearchParams(window.location.search).get('look')==='saved');},[]);

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
    setSocialError('');
    socialRequest(`?username=${encodeURIComponent(username ?? '')}`).then(data => { if (active) setSocial(data); })
      .catch(reason => { if (active) setSocialError(reason.message); });
    return () => { active = false; };
  }, [username, socialRetry]);

  useEffect(() => {
    setProfile(null); setSocial(null); setError(''); setMissing(false); setCategory('posts');
  }, [username]);

  useEffect(() => {
    let active = true;
    profileFetch(username ? `/api/profiles?username=${encodeURIComponent(username)}` : '/api/profiles')
      .then(({ response, data }) => {
        if (!active) return;
        if (response.status === 404) { setMissing(true); return; }
        if (!response.ok) throw new Error(data.error || 'Unable to load this profile.');
        setProfile(data.profile); setError(''); setMissing(false);
      })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load this profile.'); });
    return () => { active = false; };
  }, [username, socialRetry]);

  if (missing) return <main className={styles.page}><div className={styles.empty}><SquareUser /><h2>Profile not available</h2>
    <p>{username ? 'This student’s profile cannot be shown. Check the username and try again.' : 'Finish creating your SocialU profile first.'}</p>
    {!username && <Link href="/profile/edit" className={styles.button} style={{ marginTop: 16 }}>Set up profile</Link>}
  </div></main>;
  if (error) return <main className={styles.page}><p className={`${styles.notice} ${styles.error}`} role="alert">{error}</p></main>;
  if (!profile) return <main className={styles.page} aria-busy="true"><div className={`${styles.skeleton}`} style={{ height: 240 }} /></main>;

  return <main className={`${styles.page} ${campus.page} ${spaceStyles.theme}`} data-palette={space.look.palette} data-design-theme={space.look.theme} data-frame={space.look.frame}>
    {lookSaved&&<p className={spaceStyles.savedLookNotice} role="status"><Check size={16}/>Your look is saved to your profile.</p>}
    <div className={campus.layout}>
      <div className={campus.mainColumn}>
        {profile.is_own && <div className={spaceStyles.spaceToolbar}><p>Your profile, your way.</p><Link href="/profile/decorate" className={spaceStyles.decorateLink}><Palette size={15} />Decorate profile</Link></div>}
        <ProfileCover look={space.look} coverUrl={space.coverUrl} />
        <section className={campus.hero} aria-label={`${profile.name}'s profile`}>
          <ProfilePortrait className={campus.portrait} frame={space.look.frame}><Avatar url={profile.photo_url} name={profile.name} /></ProfilePortrait>
          <div className={campus.identity}>
            <div className={campus.nameLine}>
              <h1>{profile.name}</h1>
              <span className={campus.verified}><Check size={16} />Campus verified</span>
              {profile.is_own && <Link href="/profile/settings" className={`${styles.settings} ${campus.profileSettings}`} aria-label="Profile settings"><Settings size={20} /></Link>}
            </div>
            <p className={campus.handle}>@{profile.username}</p>
            {(profile.major || profile.class_year) && <p className={campus.study}>{[profile.major, profile.class_year].filter(Boolean).join(' · ')}</p>}
            {profile.university && <p className={campus.university}><GraduationCap size={20} />{profile.university}</p>}
            <ProfileActions profile={profile} social={social} onFollow={setSocial} />
          </div>
        </section>
        <ul className={campus.stats} aria-label="Profile statistics">
          <li><FileText aria-hidden="true" /><span><strong>{profile.post_count.toLocaleString()}</strong>Posts</span></li>
          <li><button type="button" onClick={() => setPeople('friends')}><Users aria-hidden="true" /><span><strong>{profile.friend_count.toLocaleString()}</strong>Friends</span></button></li>
          <li><button type="button" onClick={() => setPeople('followers')}><Users aria-hidden="true" /><span><strong>{social ? social.follower_count.toLocaleString() : '—'}</strong>Followers</span></button></li>
          <li><button type="button" onClick={() => setPeople('following')}><ArrowUpRight aria-hidden="true" /><span><strong>{social ? social.following_count.toLocaleString() : '—'}</strong>Following</span></button></li>
        </ul>
        {socialError && <p className={`${styles.notice} ${styles.error}`} role="alert">{socialError} <button onClick={() => setSocialRetry(value => value + 1)}>Retry</button></p>}
        {profile.is_own && !profile.setup_completed && <div className={styles.setupBanner} role="status">
          <p><strong>Complete your profile.</strong> Add your profile photo, major, and class year.</p>
          <Link href="/profile/edit" className={styles.button}>Complete profile</Link>
        </div>}
        <ProfileContentTabs value={category} onChange={setCategory} own={profile.is_own} />
        {category === 'saved' && <p className={styles.savedNote}><Lock size={12} />Only you can see your saved posts.</p>}
        <div id="profile-posts" role="tabpanel" aria-labelledby={`profile-tab-${category}`} tabIndex={0}>
          {category === 'posts'
            ? <><ProfileCorner key={profile.username} profile={profile} look={space.look} artworkReady={space.status==='ready'} onArtworkSaved={updated=>space.updateLook(current=>({...current,cornerArtwork:updated.cornerArtwork}))} /><ProfileMemories key={`memories-${profile.username}`} profile={profile} /><ProfileJournal key={profile.username} profile={profile} onPostCountChange={delta => setProfile(current => current ? { ...current, post_count: Math.max(0, current.post_count + delta) } : current)} /></>
            : <><div className={campus.sectionHeading}><h2>{category === 'saved' ? 'Saved posts' : 'Tagged posts'}</h2><span>{contentCount === null ? 'Loading…' : `${contentCount} ${contentCount === 1 ? 'post' : 'posts'}`}</span></div><PostGrid key={`${profile.username}-${category}`} username={profile.username} category={category} own={profile.is_own} onCount={setContentCount} /></>}
        </div>
      </div>
      <ProfileCampusSidebar profile={profile} onViewFriends={() => setPeople('friends')} space={space} />
    </div>
    {people && <PeopleDialog profile={profile} initial={people} onClose={() => setPeople(null)} />}
  </main>;

}

export function ProfileView({ username }: { username?: string }) {
  const session = useNavigationSession();
  return session === 'signed-in' ? <ProfileContent username={username} /> : <SessionNotice state={session} />;
}
