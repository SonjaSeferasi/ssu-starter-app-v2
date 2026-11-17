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
