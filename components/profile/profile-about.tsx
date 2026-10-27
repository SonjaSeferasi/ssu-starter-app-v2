'use client';

import { useEffect, useState } from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import type { StudentProfile } from '../../lib/profile';
import { EMPTY_PERSONALITY } from '../../lib/profile-personality';
import { profileFetch } from './profile-view';
import { ProfileHometown } from './profile-hometown';
import { AboutDetails } from './profile-about-details';
import { ProfilePersonalityEditor } from './profile-personality-editor';
import styles from './profile-about.module.css';

export function ProfileAbout({ profile,hometown,homeCountry,ready,onHometownSaved }: { profile: StudentProfile;hometown:string;homeCountry:string;ready:boolean;onHometownSaved:(value:string,countryCode:string)=>void }) {
  const [personality, setPersonality] = useState(EMPTY_PERSONALITY);
  const [status, setStatus] = useState<'loading' | 'ready' | 'preview' | 'error'>('loading');
  const [editing, setEditing] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setPersonality(EMPTY_PERSONALITY); setStatus('loading'); setEditing(false);
    profileFetch(`/api/profiles/personality?username=${encodeURIComponent(profile.username)}`).then(({ response, data }) => {
      if (!response.ok) throw new Error();
      if (active) { setPersonality(data.personality); setStatus(data.available ? 'ready' : 'preview'); }
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [profile.username, retry]);
  return <section className={styles.card} aria-labelledby="profile-about-title">
    <header className={styles.header}>
      <h2 id="profile-about-title">A little about {profile.is_own ? 'me' : profile.name}</h2>
      {profile.is_own && <button type="button" className={styles.edit} aria-label="Customize about me" onClick={() => setEditing(true)}><MoreHorizontal size={20} /></button>}
    </header>
    <ProfileHometown value={hometown} countryCode={homeCountry} own={profile.is_own} ready={ready} onSaved={onHometownSaved}/>
    <AboutDetails profile={profile} personality={personality} />
    {profile.is_own && !personality.answers.length && !personality.interests.length && <button className={styles.addPrompt} type="button" onClick={() => setEditing(true)}><Plus size={15} />Add prompts & interests</button>}
    {status === 'error' && <p className={styles.note}>Couldn’t load prompts and interests. <button onClick={() => setRetry(value => value + 1)}>Retry</button></p>}
    {editing && <ProfilePersonalityEditor profile={profile} initial={personality} status={status}
      onClose={() => setEditing(false)} onSaved={value => { setPersonality(value); setStatus('ready'); setEditing(false); }} />}
  </section>;
}
