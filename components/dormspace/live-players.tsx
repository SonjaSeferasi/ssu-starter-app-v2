'use client';
import { memo, useCallback, useEffect, useRef, useSyncExternalStore, type MutableRefObject } from 'react';
import { HALL_AVATAR_PX } from '../../lib/dormspace-movement';
import { SERVER_LIVE_UI, emptyLiveRoster } from '../../lib/dormspace-live-store';
import { PixelAvatar } from './campus-art';
import type { DormLive } from './use-dorm-live';
import styles from './dormspace.module.css';
import type { PixelAvatarLook } from '../../lib/dormspace-avatar';
import type { Direction } from '../../lib/dormspace-movement';

export function useLiveRoster(live?: DormLive) {
  return useSyncExternalStore(live?.store.subscribeRoster??noopSubscribe,live?.store.getRoster??emptyLiveRoster,emptyLiveRoster);
}
const noopSubscribe=()=>()=>{};
const noVisual=()=>null;
function usePlayerVisual(live: DormLive|undefined,id: string) {
  const subscribe=useCallback((fn:()=>void)=>live?.store.subscribePlayer(id,fn)??(()=>{}),[live,id]);
  const snapshot=useCallback(()=>live?.store.getVisual(id)??null,[live,id]);
  return useSyncExternalStore(subscribe,snapshot,noVisual);
}
export function LocalPlayerAvatar({live,look,facing,moving,sprinting}:{live?:DormLive;look?:PixelAvatarLook;facing:Direction;moving:boolean;sprinting:boolean}) {
  const ui=useSyncExternalStore(live?.store.subscribeUI??noopSubscribe,live?.store.getUI??(()=>SERVER_LIVE_UI),()=>SERVER_LIVE_UI);
  const visual=usePlayerVisual(live,ui.selfId);
  return <PixelAvatar look={visual?.look??look} facing={facing} moving={moving} sprinting={sprinting}/>;
}
export function PlayerCaption({live,id,self=false,name}:{live?:DormLive;id?:string;self?:boolean;name?:string}) {
  const ui=useSyncExternalStore(live?.store.subscribeUI??noopSubscribe,live?.store.getUI??(()=>SERVER_LIVE_UI),()=>SERVER_LIVE_UI);
  const visual=usePlayerVisual(live,self?ui.selfId:id??'');
  const label=visual?.username??name;
  if(!label)return null;
  return <span className={styles.playerCaption} data-player-caption={visual?.id??'self'}>
    {visual?.speech?<span className={styles.speechBubble} role="status" aria-label={`${label} says: ${visual.speech.text}`} title={visual.speech.text} data-speech-player={visual.id}><span className={styles.speechText}>{visual.speech.text}</span></span>:null}
    <span className={styles.playerName} title={label}>{label}{self?' · you':''}</span>
  </span>;
}

type RemoteProps={live:DormLive;id:string;kind:'hall'|'room';columns:number;rows:number;offsetX?:number;offsetY?:number;anchorY:number;size:MutableRefObject<{width:number;height:number}>};
const RemotePlayer=memo(function RemotePlayer({live,id,kind,columns,rows,offsetX=0,offsetY=0,anchorY,size}:RemoteProps) {
  const visual=usePlayerVisual(live,id), sprite=useRef<HTMLSpanElement>(null);
  useEffect(()=>{
    let frame=0,disposed=false,previous=0;
    const first=live.store.players.get(id)?.state;
    let position=first?{x:first.x,y:first.y}:{x:0,y:0};
    function tick(now:number) {
      frame=0;if(disposed||!sprite.current)return;
      const state=live.store.players.get(id)?.state;if(!state)return;
      const dt=previous?Math.min(50,now-previous):16;previous=now;
      const alpha=1-Math.exp(-dt/65),distance=Math.hypot(state.x-position.x,state.y-position.y);
      position=distance<.003?{x:state.x,y:state.y}:{x:position.x+(state.x-position.x)*alpha,y:position.y+(state.y-position.y)*alpha};
      const x=(position.x+offsetX)/columns*size.current.width,y=(position.y+offsetY)/rows*size.current.height;
      sprite.current.style.transform=`translate3d(${x.toFixed(3)}px,${y.toFixed(3)}px,0) translate(-50%,-${anchorY}%)`;
      sprite.current.style.zIndex=String(kind==='room'?11+Math.round(position.y)*2:Math.round(position.y)*2);
      sprite.current.dataset.captionEdge=(position.x+offsetX)/columns<.2?'left':(position.x+offsetX)/columns>.8?'right':'center';
      if(distance>=.003)frame=requestAnimationFrame(tick);
    }
    const wake=()=>{if(!frame&&!disposed){previous=0;frame=requestAnimationFrame(tick);}};
    const unsubscribe=live.store.subscribePlayer(id,wake);
    const observer=new ResizeObserver(wake);if(sprite.current?.parentElement)observer.observe(sprite.current.parentElement);
    wake();return()=>{disposed=true;cancelAnimationFrame(frame);unsubscribe();observer.disconnect();};
  },[live,id,kind,columns,rows,offsetX,offsetY,anchorY,size]);
  if(!visual||visual.restItemId)return null;
  return <span ref={sprite} className={`${kind==='hall'?styles.hallAvatar:styles.roomAvatar} ${styles.remotePlayer}`}
    data-remote-player={id} aria-label={`${visual.username}'s avatar`} style={{width:kind==='hall'?HALL_AVATAR_PX:`${100/columns}%`}}>
    <PixelAvatar look={visual.look} facing={visual.facing} moving={visual.moving} sprinting={visual.sprinting}/>
    <PlayerCaption live={live} id={id}/>
  </span>;
});
export function LivePlayers(props:Omit<RemoteProps,'id'>) {
  const ids=useLiveRoster(props.live);
  const ui=useSyncExternalStore(props.live.store.subscribeUI,props.live.store.getUI,()=>SERVER_LIVE_UI);
  return <>{ids.filter(id=>id!==ui.selfId).map(id=><RemotePlayer key={id} {...props} id={id}/>)}</>;
}
