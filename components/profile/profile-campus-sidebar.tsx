'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Check, ChevronRight, GraduationCap, Users } from 'lucide-react';
import type { StudentProfile } from '../../lib/profile';
import { Avatar, profileFetch } from './profile-view';
import { ProfileDecoratedCard } from './profile-cover';
import { ProfileAbout } from './profile-about';
import { ProfileHellos } from './profile-hellos';
import type { useProfileSpace } from './use-profile-space';
import styles from './profile-campus.module.css';

type CampusEvent = { event_id: string; title: string; location: string; starts_at: string };
type Connection = { username: string; name: string; photo_url: string | null; is_me: boolean };
const eventDate = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function ProfileCampusSidebar({ profile, onViewFriends, space }: { profile: StudentProfile; onViewFriends: () => void; space: ReturnType<typeof useProfileSpace> }) {
  const [events, setEvents] = useState<CampusEvent[] | null>(null);
  const [friends, setFriends] = useState<Connection[] | null>(null);
  const [eventsError, setEventsError] = useState(false);
  const [friendsError, setFriendsError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setEvents(null); setFriends(null); setEventsError(false); setFriendsError(false);
    profileFetch('/api/events').then(({ response, data }) => {
      if (!response.ok) throw new Error();
      if (active) setEvents(data.events.slice(0, 2));
    }).catch(() => { if (active) setEventsError(true); });
    profileFetch(`/api/profiles/friends?list=friends&username=${encodeURIComponent(profile.username)}`).then(({ response, data }) => {
      if (!response.ok) throw new Error();
      if (active) setFriends(data.friends.slice(0, 3));
    }).catch(() => { if (active) setFriendsError(true); });
    return () => { active = false; };
  }, [profile.username, profile.friend_count, retry]);

  return <aside className={styles.sidebar} aria-label="Campus and connections" data-layout={space.look.layout}>
    <section className={styles.studentCard} aria-label="SocialU student card">
      <p className={styles.cardBrand}>SOCIALU<span>STUDENT CARD</span></p>
      <GraduationCap size={32} strokeWidth={1.4} aria-hidden="true" />
      <h2>{profile.university || 'Your campus community'}</h2>
      <p className={styles.cardYear}>{profile.class_year || 'Campus member'}</p>
      <span className={styles.cardVerified}><Check size={16} />Campus verified</span>
    </section>
    <section className={styles.sidePanel}>
      <header><h2>Campus events</h2><Link href="/events">View all<ArrowRight size={15} /></Link></header>
      {eventsError ? <p className={styles.sideNote}>Events couldn’t be loaded. <button onClick={() => setRetry(value => value + 1)}>Retry</button></p>
        : events === null ? <p className={styles.sideNote} role="status">Loading events…</p>
        : !events.length ? <p className={styles.sideNote}>No upcoming events.</p>
        : <ul className={styles.sideList}>{events.map(event => <li key={event.event_id}><Link href="/events" className={styles.eventRow}>
          <span className={styles.eventIcon}><CalendarDays size={23} /></span><span><strong>{event.title}</strong><small>{event.location && `${event.location} · `}{eventDate.format(new Date(event.starts_at))}</small></span><ChevronRight size={17} />
        </Link></li>)}</ul>}
    </section>
    <ProfileDecoratedCard look={space.look} area="about"><ProfileAbout profile={profile} hometown={space.look.hometown??''} homeCountry={space.look.homeCountry??''} ready={space.status==='ready'} onHometownSaved={(hometown,homeCountry)=>space.updateLook(current=>({...current,hometown,homeCountry}))}/></ProfileDecoratedCard>
    <ProfileDecoratedCard look={space.look} area="notes"><ProfileHellos profile={profile} notes={space.notes} status={space.status} onUpdate={space.updateNotes} onRetry={space.reload} /></ProfileDecoratedCard>
    <section className={styles.sidePanel}>
      <header><h2>Friends</h2><button type="button" onClick={onViewFriends}>View all<ArrowRight size={15} /></button></header>
      {friendsError ? <p className={styles.sideNote}>Connections couldn’t be loaded. <button onClick={() => setRetry(value => value + 1)}>Retry</button></p>
        : friends === null ? <p className={styles.sideNote} role="status">Loading connections…</p>
        : !friends.length ? <div className={styles.sideNote}><p>No friends yet.</p>{profile.is_own && <Link href="/friends?view=discover" className={styles.sideLink}>Find classmates<ArrowRight size={14} /></Link>}</div>
        : <ul className={styles.sideList}>{friends.map(friend => <li key={friend.username}><Link href={friend.is_me ? '/profile' : `/students/${encodeURIComponent(friend.username)}`} className={styles.connectionRow}>
          <Avatar url={friend.photo_url} name={friend.name} /><span><strong>{friend.name}</strong><small>@{friend.username}</small></span><Users size={19} aria-hidden="true" />
        </Link></li>)}</ul>}
    </section>
  </aside>;
}
