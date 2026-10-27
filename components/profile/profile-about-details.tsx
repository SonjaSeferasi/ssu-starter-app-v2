'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Brush, Camera, Clapperboard, Code2, Coffee, Dumbbell, ExternalLink, Gamepad2, Heart, Laptop, MapPin, MessageCircle, Music, Music2, Palette, Plane, Sparkles, Trophy, Users, UtensilsCrossed, BookOpen } from 'lucide-react';
import type { StudentProfile } from '../../lib/profile';
import { PROFILE_PROMPTS, spotifyMusic, type ProfilePersonality } from '../../lib/profile-personality';
import styles from './profile-about.module.css';

export const interestIcons = {
  Coding: Code2, Music, 'Campus life': Users, Coffee, Design: Palette, Reading: BookOpen, Gaming: Gamepad2, Sports: Trophy,
  Art: Brush, Photography: Camera, Movies: Clapperboard, Travel: Plane, Fitness: Dumbbell, Food: UtensilsCrossed,
};
export const promptIcons = { building: Laptop, up_for: Heart, ask_me: MessageCircle, find_me: MapPin, fun_fact: Sparkles };

function SpotifyPlayer({ url }: { url: string }) {
  const music = spotifyMusic(url);
  const [playing, setPlaying] = useState(false);
  useEffect(() => setPlaying(false), [url]);
  if (!music) return null;
  return <div className={styles.music}>
    <div><Music2 size={16} aria-hidden="true" /><strong>On repeat</strong><a href={music.url} target="_blank" rel="noopener noreferrer" aria-label="Open music in Spotify"><ExternalLink size={15} /></a></div>
    {playing ? <iframe title="Spotify music player" src={music.embedUrl} width="100%" height="152" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowFullScreen />
      : <button type="button" onClick={() => setPlaying(true)}>Load Spotify player<ArrowRight size={15} /></button>}
  </div>;
}

export function AboutDetails({ profile, personality }: { profile: StudentProfile; personality: ProfilePersonality }) {
  const { answers, interests } = personality;
  return <>
    {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
    {answers.length > 0 && <ul className={styles.prompts}>{answers.map(item => {
      const Icon = promptIcons[item.prompt];
      return <li key={item.prompt}><Icon size={24} strokeWidth={1.6} aria-hidden="true" /><div><h3>{PROFILE_PROMPTS.find(prompt => prompt.id === item.prompt)!.label}</h3><p>{item.answer}</p></div></li>;
    })}</ul>}
    {interests.length > 0 && <div className={styles.interestBlock}>
      <h3>{profile.is_own ? 'My interests' : 'Interests'}</h3>
      <div className={styles.interests} aria-label="Interests">{interests.map(interest => {
        const Icon = interestIcons[interest];
        return <span key={interest}><Icon size={17} aria-hidden="true" />{interest}</span>;
      })}</div>
    </div>}
    {!profile.bio && !answers.length && !interests.length && <p className={styles.emptyAbout}>
      {profile.is_own ? 'Pick a few prompts and interests so classmates can get to know you.' : `${profile.name} hasn’t added anything here yet.`}
    </p>}
    {personality.spotifyUrl && <SpotifyPlayer url={personality.spotifyUrl} />}
  </>;
}
