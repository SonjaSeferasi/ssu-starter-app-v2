'use client';
import {useEffect,useRef,useState} from 'react';
import type {GameRoomData} from '../../lib/game-room';
import {sampleFaceStyles} from '../../lib/game-room';
import {AvatarPreview} from '../game-room/avatar-preview';
import {costumes,emptyLoadout,runCostume,type RunLoadout} from './wardrobe';
import {worldArtwork} from './themes';
import {courses} from './levels';
import styles from './preparation.module.css';

export function Preparation({room,level,initial,onClose,onPlay}:{room:GameRoomData;level:number;initial:RunLoadout;onClose:()=>void;onPlay:(selection:RunLoadout)=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [selection,setSelection]=useState<RunLoadout>({...initial,costume:room.appearance?.avatarId?null:runCostume(initial,level)?.id||null});
 const [tab,setTab]=useState<'outfits'|'powers'|'protection'>('outfits');
 const costume=runCostume(selection,level);
 const face=room.faces.find(f=>f.id===room.appearance?.faceId);
 const illustrated=!room.appearance?.avatarId&&!!face&&!!sampleFaceStyles[face.assetKey];
 useEffect(()=>{const el=dialog.current;el?.showModal();return()=>{if(el?.open)el.close();};},[]);
 return <dialog ref={dialog} className={styles.window} aria-labelledby="prepare-title" onCancel={e=>{e.preventDefault();onClose();}}>
  <header className={styles.header}><div><span>YOUR ADVENTURE, YOUR STYLE</span><h2 id="prepare-title">Prepare for adventure</h2><p>{courses[level-1].name}</p></div><button autoFocus className={styles.close} aria-label="Close preparation window" onClick={onClose}>×</button></header>
  <div className={styles.body}>
   <aside className={styles.preview} style={{backgroundImage:`linear-gradient(#132f3470,#102b31d9),url('${worldArtwork(level)}')`}}>
    <div className={styles.avatar}><AvatarPreview appearance={room.appearance} outfits={room.outfits} faces={room.faces} costume={costume}/></div>
    <h3>{costume?costume.name+' outfit':'Your current avatar'}</h3><p>Your face and hairstyle stay yours.</p>
    <div className={styles.summary}><span>{selection.power==='doubleJump'?'↑↑ Sky jump':selection.power==='rapid'?'✦ Rapid fire':'No starting power'}</span><span>{selection.shield?'◆ Guardian shield':'No starting shield'}</span></div>
   </aside>
   <section className={styles.options} aria-label="Adventure preparation choices">
    <nav className={styles.tabs} aria-label="Preparation categories">{(['outfits','powers','protection'] as const).map(t=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t==='outfits'?'Outfits':t==='powers'?'Powers':'Protection'}</button>)}</nav>
    <p className={styles.free}>Free to try for this run. No SocialU points are charged.</p>
    {tab==='outfits'?<><h3>Dress for this world</h3><p className={styles.description}>Try a themed costume, or keep your Game Room look. This does not change your saved avatar.</p><div className={styles.costumes}>
      <button aria-pressed={!selection.costume} onClick={()=>setSelection(s=>({...s,costume:null}))}><span aria-hidden="true"><AvatarPreview appearance={room.appearance} outfits={room.outfits} faces={room.faces}/></span><strong>Current avatar</strong></button>
      {costumes.filter(c=>c.world===level).map(c=><button key={c.id} disabled={!illustrated} aria-pressed={selection.costume===c.id} onClick={()=>setSelection(s=>({...s,costume:c.id}))}><span aria-hidden="true"><AvatarPreview appearance={room.appearance} outfits={room.outfits} faces={room.faces} costume={c}/></span><strong>{c.name}</strong><small>Themed outfit</small></button>)}
     </div>{!illustrated&&<p>{room.appearance?.avatarId?'Your complete avatar keeps its coordinated outfit for this adventure.':'Choose an illustrated face in Game Room to try these costumes.'}</p>}</>
    :tab==='powers'?<><h3>Choose one starting power</h3><p className={styles.description}>Optional boosts begin when the level starts. You can still collect powers on the course.</p><div className={styles.powerCards}>
      {[{id:null,name:'No starting power',icon:'○',description:'Start normally and discover powers along the way.'},{id:'doubleJump' as const,name:'Sky jump',icon:'↑↑',description:'For 20 seconds, tap Jump again in the air for a second leap.'},{id:'rapid' as const,name:'Rapid fire',icon:'✦',description:'For 20 seconds, your X attack recharges much faster.'}].map(p=><button key={p.name} aria-pressed={selection.power===p.id} onClick={()=>setSelection(s=>({...s,power:p.id}))}><b aria-hidden="true">{p.icon}</b><span><strong>{p.name}</strong><small>{p.description}</small></span></button>)}
     </div></>
    :<><h3>A little extra protection</h3><p className={styles.description}>A shield helps you survive an enemy hit. Gaps still require a good jump.</p><div className={styles.powerCards}><button aria-pressed={selection.shield} onClick={()=>setSelection(s=>({...s,shield:!s.shield}))}><b aria-hidden="true">◆</b><span><strong>Guardian shield {selection.shield?'· Selected':''}</strong><small>Absorbs one enemy hit, then gives you a short moment to move safely away.</small></span></button></div><p className={styles.description}>You can combine protection with one starting power.</p></>}
    <p className={styles.shopNote}>Trial outfits and equipment apply only to this attempt.</p>
   </section>
  </div>
  <footer className={styles.footer}><button onClick={()=>onPlay({...emptyLoadout})}>Play with current avatar</button><button className={styles.primary} onClick={()=>onPlay(selection)}>Play with this setup →</button></footer>
 </dialog>;
}
