'use client';
import {useEffect,useRef,useState} from 'react';
import type {GameRoomData} from '../../lib/game-room';
import {AvatarPreview} from '../game-room/avatar-preview';
import {courses,levelAvailable} from './levels';
import {themeFor} from './themes';
import {worlds} from './worlds';
import styles from './world-map.module.css';
const WIDTH=1600,HEIGHT=950;
export function WorldMap({room,completed,busy,error,onStart}:{room:GameRoomData;completed:number[];busy:boolean;error:string;onStart:(level:number)=>void}){
 const nextWorld=worlds.findIndex(w=>w.levels.some(n=>!completed.includes(n)&&levelAvailable(n,completed)));
 const initial=nextWorld<0?worlds.length-1:nextWorld;
 const [selected,setSelected]=useState(initial),[level,setLevel]=useState(worlds[initial].levels[0]);
 const [pan,setPan]=useState({x:0,y:0}),[cloud,setCloud]=useState({x:worlds[initial].x*16-180,y:worlds[initial].y*9.5-95});
 const [hint,setHint]=useState('Drag the map to explore. Select a world to discover its levels.');
 const viewport=useRef<HTMLDivElement>(null),drag=useRef<{x:number;y:number;panX:number;panY:number;moved:boolean}|null>(null);
 const world=worlds[selected],course=courses.find(c=>c.number===level)!;
 const available=levelAvailable(level,completed),done=completed.includes(level);
 function bound(x:number,y:number){const el=viewport.current;return{x:Math.min(0,Math.max((el?.clientWidth||1000)-WIDTH,x)),y:Math.min(0,Math.max((el?.clientHeight||700)-HEIGHT,y))};}
 function center(x:number,y:number){const el=viewport.current;setPan(bound((el?.clientWidth||1000)/2-x,(el?.clientHeight||700)*.4-y));}
 function select(index:number){const w=worlds[index];setSelected(index);setLevel(w.levels[0]);setCloud({x:w.x*16-180,y:w.y*9.5-95});center(w.x*16,w.y*9.5);setHint(w.name+' selected. Choose a level below.');}
 useEffect(()=>{const el=viewport.current;if(!el)return;const observer=new ResizeObserver(()=>center(worlds[initial].x*16,worlds[initial].y*9.5));observer.observe(el);return()=>observer.disconnect();},[]);
 const route=worlds.map((w,i)=>(i?'L':'M')+(w.x*10)+' '+(w.y*7)).join(' ');
 function fly(event:React.KeyboardEvent){
   if(event.target!==event.currentTarget||busy)return;
   const moves:Record<string,[number,number]>={ArrowLeft:[-28,0],ArrowRight:[28,0],ArrowUp:[0,-28],ArrowDown:[0,28]};
   if(moves[event.key]){event.preventDefault();const [dx,dy]=moves[event.key];const point={x:Math.max(20,Math.min(WIDTH-120,cloud.x+dx)),y:Math.max(20,Math.min(HEIGHT-190,cloud.y+dy))};setCloud(point);center(point.x+55,point.y+85);}
   if(event.key==='Enter'){event.preventDefault();const near=worlds.findIndex(w=>Math.hypot(w.x*16-(cloud.x+75),w.y*9.5-(cloud.y+85))<150);if(near>=0)select(near);else setHint('Fly closer to a world marker, then press Enter.');}
 }
 return <section className={styles.map} aria-label="Jumpyland world hub">
   <div ref={viewport} className={styles.viewport} tabIndex={0} role="region" aria-label="Explore the world map. Drag to pan, or use arrow keys to fly your cloud and Enter near a world." onKeyDown={fly}
    onPointerDown={e=>{if(busy||(e.target as HTMLElement).closest('button,aside'))return;drag.current={x:e.clientX,y:e.clientY,panX:pan.x,panY:pan.y,moved:false};e.currentTarget.setPointerCapture(e.pointerId);}}
    onPointerMove={e=>{const d=drag.current;if(!d)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.abs(dx)+Math.abs(dy)>6)d.moved=true;if(d.moved)setPan(bound(d.panX+dx,d.panY+dy));}}
    onPointerUp={e=>{const d=drag.current;if(d&&!d.moved){const rect=e.currentTarget.getBoundingClientRect();setCloud({x:Math.max(20,Math.min(WIDTH-120,e.clientX-rect.left-pan.x-55)),y:Math.max(20,Math.min(HEIGHT-190,e.clientY-rect.top-pan.y-90))});}drag.current=null;}}
    onPointerCancel={()=>{drag.current=null;}}>
     <div className={styles.landscape} style={{transform:`translate(${pan.x}px,${pan.y}px)`}}>
       <div className={styles.cloudHaze} aria-hidden="true"/>
       <svg className={styles.paths} viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true"><path d={route} className={styles.trailShadow}/><path d={route} className={styles.trail}/></svg>
       {worlds.map((w,i)=>{const locked=!w.levels.some(n=>levelAvailable(n,completed)),finished=w.levels.every(n=>completed.includes(n));return <button key={w.id} style={{left:w.x+'%',top:w.y+'%'}} className={[styles.node,selected===i?styles.selected:'',locked?styles.locked:''].join(' ')} aria-pressed={selected===i} aria-label={'Explore '+w.name+(locked?', locked':finished?', completed':', available')} onFocus={e=>{if(e.currentTarget.matches(':focus-visible'))center(w.x*16,w.y*9.5);}} onClick={()=>select(i)} disabled={busy}>
         <span className={styles.orb}>{String(i+1).padStart(2,'0')}<span className={styles.badge}>{locked?'⌑':finished?'✓':'→'}</span></span><span className={styles.nodeLabel}><strong>{w.name}</strong><small>{themeFor(w.themeLevel).inspiration}</small></span>
       </button>;})}
       <figure className={styles.avatar} style={{left:cloud.x,top:cloud.y}}><div className={styles.rider}><AvatarPreview appearance={room.appearance} outfits={room.outfits} faces={room.faces}/><div className={styles.cloud} aria-hidden="true"><i/><i/><i/></div></div><figcaption>Your cloud · Your adventure</figcaption></figure>
       <div className={styles.horizon} aria-hidden="true">More worlds on the horizon ✧</div>
     </div>
   </div>
   <aside className={styles.panel} aria-label="Selected world levels"><div className={styles.description}><span className={styles.kicker}>EXPLORE {world.name.toUpperCase()}</span><h2>{course.name}</h2><p>{course.subtitle}</p><div className={styles.levelList} aria-label={world.name+' levels'}>{world.levels.map(n=><button key={n} aria-pressed={level===n} onClick={()=>setLevel(n)}>Level {String(n).padStart(2,'0')} · {completed.includes(n)?'Completed':levelAvailable(n,completed)?'Available':'Locked'}</button>)}</div></div>
     <button className={styles.start} disabled={busy||!available} onClick={()=>onStart(level)}>{busy?'Starting…':done?'Replay level →':available?'Start adventure →':`Complete level ${level-1} first`}</button>{error&&<p role="alert" className={styles.error}>{error}</p>}
   </aside>
   <div className={styles.mapTools}><p role="status">{hint}</p><button onClick={()=>select(selected)}>Find my world</button></div>
 </section>;
}
