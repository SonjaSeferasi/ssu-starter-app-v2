import type {CSSProperties} from 'react';
import styles from './level-complete.module.css';

/** How long the "Level Complete!" moment plays before the results appear. */
export const celebrationMs=1900;

const confettiColors=['#ff5d8f','#ffd23f','#3bceac','#5aa9ff','#ff924c','#c77dff'];
/** Fixed, evenly spread confetti so the celebration looks the same every time. */
export const confettiPieces=Array.from({length:36},(_,index)=>({left:(index*37+11)%100,delay:(index*53%17)/17*.5,drift:((index*29)%21)-10,turn:(index%2?1:-1)*(240+(index*41)%300),color:confettiColors[index%confettiColors.length],wide:index%3===0}));

/** The finish moment (SRS-631.5): a burst of light, falling confetti and the
 * words "Level Complete!" over the level, before the result dialog opens. */
export function LevelCompleteBanner(){
 return <div className={styles.banner} role="status">
  <div className={styles.rays} aria-hidden="true"/>
  <div className={styles.confetti} aria-hidden="true">{confettiPieces.map((piece,index)=><i key={index} className={piece.wide?styles.wide:undefined} style={{left:piece.left+'%',background:piece.color,'--delay':piece.delay+'s','--drift':piece.drift+'vw','--turn':piece.turn+'deg'} as CSSProperties}/>)}</div>
  <p className={styles.title}>Level Complete!</p>
 </div>;
}

const months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
/** The date inked on a stamp, for example "17 NOV 2026". */
export function stampDate(date:Date){return `${String(date.getDate()).padStart(2,'0')} ${months[date.getMonth()]} ${date.getFullYear()}`;}

/** The passport stamp for a completed country (SRS-631.6): the open passport
 * with the country's stamp pressed onto the page. */
export function PassportStamp({countryName,date}:{countryName:string;date:Date}){
 const name=countryName.toUpperCase(),inked=stampDate(date);
 return <div className={styles.passport} role="img" aria-label={`Passport stamped: ${countryName}, ${inked}`}>
  <div className={styles.cover} aria-hidden="true"><span>WORLD EXPLORER</span>
   <svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" strokeWidth="2.2"/><path d="M7 24h34M24 7c7 6 7 28 0 34M24 7c-7 6-7 28 0 34M10 15c8 4 20 4 28 0M10 33c8-4 20-4 28 0" fill="none" stroke="currentColor" strokeWidth="1.6"/></svg>
   <span>PASSPORT</span></div>
  <div className={styles.page} aria-hidden="true">
   <div className={styles.stamp}><span>{name}</span>
    <svg viewBox="0 0 64 30"><path d="M4 28 24 6l6 7 6-9 24 24z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round"/><path d="M19 12l5-6 6 7 6-9 6 9-5 3-4-4-5 5-4-5z" fill="currentColor"/></svg>
    <span>{name}</span><small>{inked}</small></div>
  </div>
 </div>;
}
