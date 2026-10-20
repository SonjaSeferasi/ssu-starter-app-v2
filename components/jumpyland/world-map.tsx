'use client';
import {backstory,missions} from './story';
import {useEffect,useRef,useState} from 'react';
import type {GameRoomData} from '../../lib/game-room';
import {AvatarPreview} from '../game-room/avatar-preview';
import {levelAvailable} from './levels';
import {themeFor} from './themes';
import {LivingMap} from './living-map';
import {MAP_WIDTH,MAP_HEIGHT,constrainPan,mapView} from './map-layout';
import {modelWorldPoints,modelTrails,createModelCamera,projectedTrail} from './model-map-layout';
import {worlds} from './worlds';
import type {MapProjection} from './map-scene';
import styles from './world-map.module.css';

const defaultRoutes=modelTrails().map(trail=>projectedTrail(trail,createModelCamera()));
export function WorldMap({room,completed,busy,error,onStart,onPrepare}:{room:GameRoomData;completed:number[];busy:boolean;error:string;onStart:(level:number)=>void;onPrepare:(level:number)=>void}){
 const nextWorld=worlds.findIndex(w=>w.levels.some(n=>!completed.includes(n)&&levelAvailable(n,completed)));
 const initial=nextWorld<0?worlds.length-1:nextWorld;
 const [selected,setSelected]=useState(initial),[level,setLevel]=useState(worlds[initial].levels[0]);
 const [pan,setPan]=useState({x:0,y:0}),[cloud,setCloud]=useState(()=>({x:modelWorldPoints[initial].x-125,y:modelWorldPoints[initial].y-45}));
 const [hint,setHint]=useState('Drag the map to explore · Select a world to begin');
 const cloudRef=useRef(cloud);cloudRef.current=cloud;
 const [scale,setScale]=useState(1),scaleRef=useRef(1),selectedRef=useRef(initial);
 const viewport=useRef<HTMLDivElement>(null),drag=useRef<{id:number;x:number;y:number;panX:number;panY:number;moved:boolean}|null>(null);
 const nodeElements=useRef<(HTMLButtonElement|null)[]>([]),trailElements=useRef<(SVGGElement|null)[]>([]),avatarElement=useRef<HTMLElement|null>(null);
 const projectedWorlds=useRef(modelWorldPoints);
 const projectedCloud=useRef({x:cloud.x+38,y:cloud.y+105}),followCloud=useRef(false),sceneReady=useRef(false);
 const world=worlds[selected],available=levelAvailable(level,completed),done=completed.includes(level);
 function bound(x:number,y:number){const el=viewport.current;return constrainPan({x,y},el?.clientWidth||MAP_WIDTH,el?.clientHeight||MAP_HEIGHT,scaleRef.current);}
 function center(x:number,y:number){const el=viewport.current;setPan(bound((el?.clientWidth||MAP_WIDTH)/2-x*scaleRef.current,(el?.clientHeight||MAP_HEIGHT)/2-y*scaleRef.current));}
 function projectScene(projection:MapProjection){
  projectedWorlds.current=projection.worlds;
  projection.worlds.forEach((point,i)=>{const el=nodeElements.current[i];if(el){el.style.left=point.x+'px';el.style.top=point.y+'px';}});
  projection.trails.forEach((path,i)=>trailElements.current[i]?.querySelectorAll('path').forEach(el=>el.setAttribute('d',path)));
  if(avatarElement.current){avatarElement.current.style.left=projection.cloud.x+'px';avatarElement.current.style.top=projection.cloud.y+'px';}
  projectedCloud.current={x:projection.cloud.x+38,y:projection.cloud.y+105};
  if(followCloud.current){followCloud.current=false;center(projectedCloud.current.x,projectedCloud.current.y);}
 }
 function select(index:number){
  const w=worlds[index],point=modelWorldPoints[index];selectedRef.current=index;setSelected(index);
  setLevel(w.levels.find(n=>!completed.includes(n)&&levelAvailable(n,completed))??w.levels[0]);
  setCloud({x:point.x-125,y:point.y-45});const projected=projectedWorlds.current[index];center(projected.x,projected.y);
  setHint(w.name+' · '+(w.levels.every(n=>completed.includes(n))?'Completed':w.levels.some(n=>levelAvailable(n,completed))?'Ready for adventure':'Complete the previous level to unlock'));
 }
 useEffect(()=>{
  const el=viewport.current;if(!el)return;
  const observer=new ResizeObserver(()=>{if(!el.clientWidth||!el.clientHeight)return;const view=mapView(el.clientWidth,el.clientHeight,projectedWorlds.current[selectedRef.current]);scaleRef.current=view.scale;setScale(view.scale);setPan({x:view.x,y:view.y});});
  observer.observe(el);return()=>observer.disconnect();
 },[]);
 function fly(event:React.KeyboardEvent){
  if(event.target!==event.currentTarget||busy)return;
  const moves:Record<string,[number,number]>={ArrowLeft:[-28,0],ArrowRight:[28,0],ArrowUp:[0,-28],ArrowDown:[0,28]};
  if(moves[event.key]){event.preventDefault();const [dx,dy]=moves[event.key],point={x:Math.max(15,Math.min(MAP_WIDTH-80,cloud.x+dx)),y:Math.max(85,Math.min(MAP_HEIGHT-120,cloud.y+dy))};setCloud(point);if(sceneReady.current)followCloud.current=true;else center(point.x+40,point.y+60);}
  if(event.key==='Enter'){event.preventDefault();const position=sceneReady.current?projectedCloud.current:{x:cloud.x+40,y:cloud.y+60},near=projectedWorlds.current.findIndex(p=>Math.hypot(p.x-position.x,p.y-position.y)<160);if(near>=0)select(near);else setHint('Fly closer to a world marker, then press Enter.');}
  if(event.key==='Home'){event.preventDefault();select(selected);}
 }
 function pointerDown(event:React.PointerEvent<HTMLDivElement>){
  if(busy||!event.isPrimary||(event.pointerType==='mouse'&&event.button!==0)||(event.target as HTMLElement).closest('button,aside'))return;
  event.currentTarget.setPointerCapture(event.pointerId);drag.current={id:event.pointerId,x:event.clientX,y:event.clientY,panX:pan.x,panY:pan.y,moved:false};
 }
 function pointerMove(event:React.PointerEvent<HTMLDivElement>){
  const d=drag.current;if(!d||d.id!==event.pointerId)return;const dx=event.clientX-d.x,dy=event.clientY-d.y;if(Math.abs(dx)+Math.abs(dy)>6)d.moved=true;if(d.moved)setPan(bound(d.panX+dx,d.panY+dy));
 }
 function releasePointer(event:React.PointerEvent<HTMLDivElement>){if(drag.current?.id===event.pointerId)drag.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}
 return <section className={styles.map} aria-label="Jumpyland world hub">
  <div ref={viewport} className={styles.viewport} tabIndex={0} role="region" aria-label="Explore the 3D world map. Drag to pan, or use arrow keys to fly your cloud and Enter to select a nearby world." onKeyDown={fly} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={releasePointer} onPointerCancel={releasePointer} onLostPointerCapture={releasePointer}>
   <div className={styles.landscape} style={{width:MAP_WIDTH,height:MAP_HEIGHT,transform:`translate(${pan.x}px,${pan.y}px) scale(${scale})`}}>
    <LivingMap options={{selected:()=>selectedRef.current,cloud:()=>cloudRef.current,onProject:projectScene,onReady:()=>{sceneReady.current=true;const point=projectedWorlds.current[selectedRef.current];center(point.x,point.y);},onError:()=>{sceneReady.current=false;setHint('Showing the rendered map · Select a world to begin');}}}/>
    <div className={styles.atmosphere} aria-hidden="true"/>
    <svg className={styles.paths} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} aria-hidden="true">{defaultRoutes.map((route,index)=><g ref={el=>{trailElements.current[index]=el;}} key={index} className={!levelAvailable(worlds[index+1].levels[0],completed)?styles.lockedTrail:undefined}><path d={route} className={styles.trailShadow}/><path d={route} className={styles.trail}/></g>)}</svg>
    {worlds.map((w,i)=>{const locked=!w.levels.some(n=>levelAvailable(n,completed)),finished=w.levels.every(n=>completed.includes(n));return <button ref={el=>{nodeElements.current[i]=el;}} key={w.id} style={{left:modelWorldPoints[i].x,top:modelWorldPoints[i].y}} className={[styles.node,selected===i?styles.selected:'',locked?styles.locked:''].join(' ')} aria-pressed={selected===i} aria-label={'Explore '+w.name+(locked?', locked':finished?', completed':', available')} onFocus={e=>{if(e.currentTarget.matches(':focus-visible'))center(projectedWorlds.current[i].x,projectedWorlds.current[i].y);}} onClick={()=>select(i)} disabled={busy}>
     <span className={styles.orb}>{String(i+1).padStart(2,'0')}<span className={styles.badge} aria-hidden="true">{locked?<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>:finished?'✓':'→'}</span></span><span className={styles.nodeLabel}><strong>{w.name}</strong><small>{themeFor(w.themeLevel).inspiration}</small></span>
    </button>;})}
    <figure ref={el=>{avatarElement.current=el;}} className={styles.avatar} style={{left:cloud.x,top:cloud.y}} aria-label="Your saved avatar riding a cloud"><div className={styles.rider}><AvatarPreview appearance={room.appearance} outfits={room.outfits} faces={room.faces}/><div className={[styles.cloud,world.themeLevel===2?styles.goldenCloud:''].join(' ')} aria-hidden="true"><i/><i/><i/></div></div></figure>
   </div>
  </div>
  <nav className={styles.worldSwitcher} aria-label="Choose a world">{worlds.map((w,i)=><button key={w.id} aria-pressed={selected===i} disabled={busy} onClick={()=>select(i)}><span>{String(i+1).padStart(2,'0')}</span>{w.name}</button>)}</nav>
  <aside className={styles.panel} aria-label="Selected world levels">
   <div className={styles.description}><span className={styles.kicker}>LEVEL {String(level).padStart(2,'0')} <span>· {done?'COMPLETED':available?'YOUR NEXT ADVENTURE':'LOCKED'}</span></span><h2>{world.name}</h2><p>{world.description}</p>
    <details key={world.id} className={styles.mission}><summary>Your mission</summary><div><strong>{backstory.title}</strong><p>{backstory.intro}</p><p><strong>{missions[level-1].shard} shard:</strong> {missions[level-1].objective}</p><p>{backstory.goal}</p></div></details>
    {world.levels.length>1&&<div className={styles.levelList} aria-label={world.name+' levels'}>{world.levels.map(n=><button key={n} aria-pressed={level===n} disabled={busy} onClick={()=>setLevel(n)}>Level {String(n).padStart(2,'0')} · {completed.includes(n)?'Completed':levelAvailable(n,completed)?'Available':'Locked'}</button>)}</div>}
   </div>
   <div className={styles.panelActions}><button className={styles.start} disabled={busy||!available} onClick={()=>onStart(level)}>{busy?'Starting…':done?'Replay level':available?'Play level':`Complete level ${level-1} first`}{available&&<span aria-hidden="true">→</span>}</button><button className={styles.prepare} disabled={busy||!available} onClick={()=>onPrepare(level)}>Prepare for adventure</button></div>
   {error&&<p role="alert" className={styles.error}>{error}</p>}
  </aside>
  <div className={styles.mapTools}><p role="status">{hint}</p><button disabled={busy} onClick={()=>select(selected)}>Find my world <span aria-hidden="true">⌖</span></button></div>
 </section>;
}
