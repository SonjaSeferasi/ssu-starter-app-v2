import type {CostumeStyle} from '../game-room/costume-details';
import type {GameRoomData} from '../../lib/game-room';
import {AvatarPreview} from '../game-room/avatar-preview';
import {CollectibleIcon} from './collectible-icon';
import {themeFor,worldArtwork} from './themes';
import styles from './failure-panel.module.css';
export function FailurePanel({room,level,region,cause,count,total,onRetry,onMap,onPrepare,costume}:{room:GameRoomData;level:number;region:string;cause:string;count:number;total:number;onRetry:()=>void;onMap:()=>void;onPrepare:()=>void;costume?:CostumeStyle}){
 const theme=themeFor(level),fall=cause.includes('fell');
 const title=level===3?'Your next chapter awaits.':level===2?'Power up. Try again.':'Every hero takes a tumble.';
 return <article className={styles.failure} style={{backgroundImage:`linear-gradient(90deg,rgba(15,31,29,.96),rgba(22,40,35,.82) 65%,rgba(18,35,31,.5)),url('${worldArtwork(level)}')`}}>
   <div className={styles.content}><span className={styles.eyebrow}>LEVEL {String(level).padStart(2,'0')} · {region}</span><h2 id="game-dialog-title">{title}</h2><p className={styles.cause}>{cause}</p>
     <div className={styles.score}><CollectibleIcon level={level}/><div><strong>{count}<small> / {total}</small></strong><span>{theme.collectible} this attempt</span></div></div>
     <p className={styles.tip}><strong>{fall?'Find your rhythm':'Your next move'}</strong>{fall?'Get close to the edge, then jump toward the next landing. You can stop and line up your leap.':`Keep a little distance and press X for ${theme.power.toLowerCase()}, or jump over the enemy. Watch the recharge indicator.`}</p>
     <p className={styles.saved}>✓ Your completed levels are safe. A retry starts this level fresh.</p>
     <div className={styles.actions}><button autoFocus onClick={onRetry}>Try again · Level {level} →</button><button onClick={onPrepare}>Prepare for adventure</button><button onClick={onMap}>Back to world map</button></div>
   </div><div className={styles.avatar} aria-hidden="true"><div className={styles.halo}/><AvatarPreview appearance={room.appearance} outfits={room.outfits} faces={room.faces} costume={costume}/></div>
 </article>;
}
