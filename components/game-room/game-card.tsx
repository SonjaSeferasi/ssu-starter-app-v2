import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { GameCard } from '../../lib/game-room-cards';
import styles from './game-room.module.css';

/** Drawn artwork for DormSpace 3D: a warm dorm corner. Decorative. */
function DormArt() {
  return <svg viewBox="0 0 320 180" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
    <rect width="320" height="180" fill="#ffe9d6" />
    <path d="M0 122h320v58H0z" fill="#f3c9a0" />
    <path d="M0 122h320" stroke="#e4b488" strokeWidth="3" />
    <rect x="26" y="34" width="42" height="34" rx="4" fill="#ffd9e8" stroke="#fffaf2" strokeWidth="5" /><path d="M34 60l9-12 7 8 5-5 7 9z" fill="#ff9dc2" />
    <rect x="121" y="20" width="78" height="62" rx="6" fill="#cfe8f5" stroke="#fffaf2" strokeWidth="7" />
    <path d="M160 20v62M121 51h78" stroke="#fffaf2" strokeWidth="5" />
    <circle cx="181" cy="36" r="8" fill="#ffd36b" />
    <path d="M114 100h130a8 8 0 0 1 8 8v30H106v-30a8 8 0 0 1 8-8z" fill="#b99be8" />
    <rect x="106" y="126" width="146" height="18" rx="6" fill="#8b6fd0" />
    <rect x="118" y="88" width="46" height="22" rx="10" fill="#fffcff" />
    <path d="M110 144v12M248 144v12" stroke="#6f55b5" strokeWidth="6" strokeLinecap="round" />
    <rect x="228" y="44" width="68" height="8" rx="4" fill="#d79a66" />
    <rect x="236" y="28" width="10" height="16" rx="2" fill="#71d9ae" /><rect x="249" y="24" width="9" height="20" rx="2" fill="#ff8a28" /><rect x="261" y="30" width="12" height="14" rx="2" fill="#8b45e6" />
    <path d="M280 150c0-14 6-22 6-34M286 150c0-18 12-20 14-30M286 150c-2-16-12-18-14-28" stroke="#4fb88c" strokeWidth="5" strokeLinecap="round" fill="none" />
    <path d="M272 150h28l-4 20h-20z" fill="#e58a5a" />
    <rect x="62" y="112" width="34" height="44" rx="5" fill="#d79a66" /><rect x="67" y="118" width="24" height="12" rx="3" fill="#f3c9a0" /><circle cx="79" cy="140" r="3" fill="#fffaf2" />
    <path d="M79 112V96" stroke="#70677d" strokeWidth="3" /><path d="M67 96h24l-5-16H72z" fill="#ffd36b" />
  </svg>;
}

/** One game: artwork, name, short description and a single action. */
export function GameCardView({ card }: { card: GameCard }) {
  return <article className={styles.gameCard} data-accent={card.accent}>
    <div className={styles.gameArt}>{card.image ? <img src={card.image} alt="" width={720} height={405} /> : <DormArt />}</div>
    <div className={styles.gameBody}>
      <h3>{card.name}</h3>
      <p>{card.description}</p>
      <Link href={card.href} className={styles.gameAction}>{card.action}<ArrowRight size={18} aria-hidden="true" /></Link>
    </div>
  </article>;
}
