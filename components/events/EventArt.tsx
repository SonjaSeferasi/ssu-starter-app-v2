import React from 'react';
import { BookOpen, Music, PartyPopper, Sparkles, Trophy, Utensils, type LucideIcon } from 'lucide-react';
import styles from '../../app/events/events.module.css';

// Events have no photos yet, so each one gets an illustrated banner: a stable color scene from its ID
// and an icon matched to its title.
const SCENES = [
  ['#2b2350', '#e2725b'],
  ['#1d4e47', '#8cc7a8'],
  ['#7a1f2b', '#f2a65a'],
  ['#203a5c', '#7fb6d9'],
  ['#3f2a56', '#d98fb2'],
  ['#4a3b1c', '#e8c35a'],
];

const THEMES: [RegExp, LucideIcon][] = [
  [/party|parade|halloween|social|dance|celebrat|fest/i, PartyPopper],
  [/basketball|soccer|game|sport|final|match|\brun\b|\bgym\b|tournament/i, Trophy],
  [/music|concert|\bmic\b|\bband\b|singing|jazz|karaoke/i, Music],
  [/study|class|lecture|\bcs\b|code|hack|exam|library|workshop|\btalk/i, BookOpen],
  [/food|pizza|lunch|dinner|breakfast|bake|coffee|snack/i, Utensils],
];

function hash(value: string) {
  let result = 0;
  for (const char of value) result = (result * 31 + char.charCodeAt(0)) >>> 0;
  return result;
}

export function EventArt({ id, title, className, coverUrl, children }:
  { id: string; title: string; className?: string; coverUrl?: string | null; children?: React.ReactNode }) {
  // The host's cover photo replaces the generated art.
  if (coverUrl) {
    return (
      <div className={`${styles.art} ${className ?? ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed Storage URL */}
        <img src={coverUrl} alt="" className={styles.coverImage} />
        {children}
      </div>
    );
  }
  const [deep, bright] = SCENES[hash(id) % SCENES.length];
  const Icon = THEMES.find(([pattern]) => pattern.test(title))?.[1] ?? Sparkles;
  return (
    <div className={`${styles.art} ${className ?? ''}`} style={{ background: `linear-gradient(160deg, ${deep} 0%, ${deep} 45%, ${bright} 140%)` }}>
      <span className={styles.artSun} style={{ background: bright }} aria-hidden="true" />
      <span className={styles.artHill} style={{ background: deep }} aria-hidden="true" />
      <Icon className={styles.artIcon} strokeWidth={1.6} aria-hidden="true" />
      {children}
    </div>
  );
}
