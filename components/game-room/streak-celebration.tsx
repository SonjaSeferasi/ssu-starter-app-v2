'use client';

import { useId } from 'react';
import { Check, Sparkles, Sunrise } from 'lucide-react';
import type { ParticipationStatus } from '../../lib/game-participation-client';
import styles from './streak-celebration.module.css';

type StreakReward = Pick<ParticipationStatus, 'count' | 'qualifiedToday' | 'earnedPointsToday'>;

export function StreakCelebration({ status }: { status: StreakReward }) {
  const gradient = useId();
  // Celebrate confirmed rewards only, never a pending or failed save.
  if (!status.qualifiedToday || !Number.isFinite(status.earnedPointsToday) || status.earnedPointsToday <= 0) return null;

  return <div className={styles.card} role="status" aria-live="polite" aria-atomic="true">
    <div className={styles.eyebrow}><Check size={13} aria-hidden="true" /> TODAY, YOU SHOWED UP</div>
    <div className={styles.flameScene} aria-hidden="true">
      <span className={styles.halo} />
      <Sparkles className={styles.sparkLeft} size={22} />
      <Sparkles className={styles.sparkRight} size={16} />
      <svg className={styles.flame} viewBox="0 0 120 140" fill="none">
        <defs><linearGradient id={gradient} x1="60" y1="12" x2="60" y2="132" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffbd39" /><stop offset=".5" stopColor="#ff8428" /><stop offset="1" stopColor="#ee4e30" />
        </linearGradient></defs>
        <path d="M63 7C69 32 94 39 91 66C100 62 102 54 101 48C119 72 117 98 99 117C79 139 43 139 23 118C4 98 8 72 28 51C26 69 34 72 39 69C49 61 34 40 63 7Z" fill={`url(#${gradient})`} />
        <path d="M64 76C68 92 83 96 80 110C78 124 61 131 48 123C33 114 39 101 47 94C47 104 53 104 55 100C58 94 54 88 64 76Z" fill="#ffe38a" />
        <ellipse cx="44" cy="77" rx="4" ry="5" fill="#75331f" /><ellipse cx="77" cy="77" rx="4" ry="5" fill="#75331f" />
        <path d="M54 86Q60 92 66 86" stroke="#75331f" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    </div>
    <div className={styles.streak}><strong>{status.count}</strong><span>{status.count === 1 ? 'day streak' : 'days of showing up'}</span></div>
    <p className={styles.title}>You’re on fire!</p>
    <div className={styles.reward}><Sparkles size={17} aria-hidden="true" /><strong>+{status.earnedPointsToday} points</strong><span>earned today</span></div>
    <p className={styles.message}>Come back tomorrow to grow your streak<br className={styles.lineBreak} /> and earn more points.</p>
    <div className={styles.tomorrow}><Sunrise size={18} aria-hidden="true" /><span>A little play. A brighter tomorrow.</span></div>
  </div>;
}
