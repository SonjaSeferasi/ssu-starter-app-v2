import styles from './game-room.module.css';

/** Campus scenery for the banner. Decorative only: the heading and copy are real text. */
function CampusScenery() {
  return <svg className={styles.bannerArt} viewBox="0 0 640 220" aria-hidden="true" preserveAspectRatio="xMaxYMax slice">
    <g fill="#ffffff" opacity=".85">
      <path d="M96 58a20 20 0 0 1 38-8 16 16 0 0 1 22 14 14 14 0 0 1-4 28H100a17 17 0 0 1-4-34z" />
      <path d="M430 34a16 16 0 0 1 30-6 13 13 0 0 1 18 11 11 11 0 0 1-3 22h-42a14 14 0 0 1-3-27z" />
    </g>
    <path d="M0 196c70-46 150-52 230-26 70-34 150-40 220-12 60-22 130-18 190 10v52H0z" fill="#bfe8cf" />
    <path d="M0 208c90-30 190-30 290-8 110-28 230-24 350 6v14H0z" fill="#9fdcb9" />
    <g>
      <rect x="388" y="104" width="150" height="86" rx="6" fill="#f7d9ef" />
      <rect x="440" y="76" width="46" height="114" rx="5" fill="#e9c3ee" />
      <path d="M432 78l31-30 31 30z" fill="#b98be6" />
      <path d="M380 106l34-22 34 22zM478 106l34-22 34 22z" fill="#c9a2ea" />
      <path d="M463 48V22" stroke="#8b45e6" strokeWidth="3" /><path d="M463 22l20 6-20 7z" fill="#ff8a28" />
      <rect x="453" y="150" width="20" height="40" rx="10" fill="#8b45e6" />
      <g fill="#fffcff"><rect x="402" y="122" width="18" height="22" rx="4" /><rect x="506" y="122" width="18" height="22" rx="4" /><rect x="402" y="156" width="18" height="22" rx="4" /><rect x="506" y="156" width="18" height="22" rx="4" /><circle cx="463" cy="104" r="11" /></g>
    </g>
    <g>
      <rect x="571" y="150" width="8" height="44" rx="3" fill="#b07a55" /><circle cx="575" cy="134" r="30" fill="#ffb8d6" /><circle cx="596" cy="150" r="20" fill="#ffc9df" />
      <rect x="340" y="160" width="7" height="34" rx="3" fill="#b07a55" /><circle cx="343" cy="146" r="24" fill="#8fd6ad" /><circle cx="326" cy="160" r="16" fill="#a6e0bd" />
    </g>
    <g fill="#ffd36b"><path d="M300 60l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" /><path d="M548 44l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" /></g>
  </svg>;
}

/** A small original game-controller mascot beside the heading. Decorative. */
function Mascot() {
  return <svg className={styles.bannerMascot} viewBox="0 0 96 72" aria-hidden="true">
    <path d="M24 18h48a20 20 0 0 1 20 22l-2 14a11 11 0 0 1-20 5l-6-9H32l-6 9a11 11 0 0 1-20-5L4 40a20 20 0 0 1 20-22z" fill="#b98be6" stroke="#8b45e6" strokeWidth="3" />
    <path d="M26 30v14M19 37h14" stroke="#fffcff" strokeWidth="5" strokeLinecap="round" />
    <circle cx="66" cy="32" r="4.5" fill="#ffd36b" /><circle cx="75" cy="41" r="4.5" fill="#71d9ae" /><circle cx="57" cy="41" r="4.5" fill="#ff8a28" />
    <circle cx="42" cy="30" r="2.2" fill="#302044" /><circle cx="52" cy="30" r="2.2" fill="#302044" /><path d="M43 35c2 3 6 3 8 0" stroke="#302044" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M48 18V8" stroke="#8b45e6" strokeWidth="3" strokeLinecap="round" /><circle cx="48" cy="6" r="4" fill="#ffd36b" />
  </svg>;
}

/** The Game Room welcome banner (SRS-629.1). */
export function WelcomeBanner() {
  return <header className={styles.banner}>
    <CampusScenery />
    <div className={styles.bannerCopy}>
      <div className={styles.bannerTitle}><Mascot /><h1>Game Room</h1></div>
      <p className={styles.bannerTagline}>Your next little adventure starts here.</p>
      <p className={styles.bannerText}>Play, explore, make your space your own, and grow your daily streak.</p>
    </div>
  </header>;
}
