'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AvatarPreview } from '../game-room/avatar-preview';
import { accessToken } from '../../lib/account/session';
import { GameRoomData } from '../../lib/game-room';
import { courses, levelAvailable } from './levels';
import { themeFor } from './themes';
import { CollectibleIcon } from './collectible-icon';
import { avatarTexture } from './avatar-texture';
import type { GameController, InputState } from './engine';
import styles from './game.module.css';
import {WorldMap} from './world-map';
import {FailurePanel} from './failure-panel';

type Status='menu'|'starting'|'running'|'paused'|'failed'|'saving'|'saved'|'unsaved';
type Attempt={id:string;level:number;coins:number};
export default function Game() {
  const router=useRouter();
  const [room,setRoom]=useState<GameRoomData|null>(null);
  const [completed,setCompleted]=useState<number[]>([]);
  const [loaded,setLoaded]=useState(false);
  const [error,setError]=useState('');
  const [reload,setReload]=useState(0);
  const [status,setStatus]=useState<Status>('menu');
  const statusRef=useRef<Status>('menu');
  const [level,setLevel]=useState(1);
  const [coins,setCoins]=useState(0);
  const [progress,setProgress]=useState(0);
  const [world,setWorld]=useState({region:'',cooldown:0,defeated:0});
  const [failure,setFailure]=useState('');
  const [attempt,setAttempt]=useState<Attempt|null>(null);
  const [instructions,setInstructions]=useState(false);
  const [exit,setExit]=useState(false);
  const [controls,setControls]=useState(false);
  const avatar=useRef<HTMLDivElement>(null),stage=useRef<HTMLDivElement>(null);
  const controller=useRef<GameController|null>(null);
  const held=useRef<InputState>({left:false,right:false,jump:false,power:false});
  const busy=useRef(false),mounted=useRef(true);
  function change(next:Status){statusRef.current=next;setStatus(next);}
  async function api(method='GET',body?:object){
    const token=await accessToken();
    if(!token)throw new Error('Please sign in again to play.');
    const response=await fetch('/api/jumpyland',{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},cache:'no-store',signal:AbortSignal.timeout(10000),...(body?{body:JSON.stringify(body)}:{})});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'The request could not be saved.');return data;
  }
  useEffect(()=>{
    mounted.current=true;return()=>{mounted.current=false;};
  },[]);
  useEffect(()=>{
    let cancelled=false;setLoaded(false);setError('');
    (async()=>{
      const token=await accessToken();
      if(!token)throw new Error('Please sign in again.');
      const [progress,response]=await Promise.all([api(),fetch('/api/game-room',{headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:AbortSignal.timeout(10000)})]);
      const data=await response.json();if(!response.ok)throw new Error(data.error||'Your saved avatar could not be loaded.');
      if(!cancelled){setRoom(data);setCompleted(progress.completed);setLoaded(true);}
    })().catch(e=>{if(!cancelled)setError(e.name==='TimeoutError'?'The connection took too long. Please retry.':e.message);});
    return()=>{cancelled=true;};
  },[reload]);
  function pause(){if(statusRef.current==='running'){controller.current?.pause();change('paused');}}
  useEffect(()=>{
    const hide=()=>{if(document.hidden)pause();};
    const blur=()=>pause();
    const unload=(e:BeforeUnloadEvent)=>{if(['running','paused','starting','saving','unsaved'].includes(statusRef.current)){e.preventDefault();e.returnValue='';}};
    document.addEventListener('visibilitychange',hide);window.addEventListener('blur',blur);window.addEventListener('beforeunload',unload);
    return()=>{document.removeEventListener('visibilitychange',hide);window.removeEventListener('blur',blur);window.removeEventListener('beforeunload',unload);};
  },[]);
  async function save(result:Attempt){
    if(busy.current)return;busy.current=true;change('saving');setError('');
    try {const data=await api('POST',{action:'complete',attemptId:result.id,coins:result.coins});if(mounted.current){setCompleted(data.completed);change('saved');}}
    catch(e){if(mounted.current){setError(e instanceof Error&&e.name!=='TimeoutError'?e.message:'Saving took too long. Retry saving this result.');change('unsaved');}}
    finally{busy.current=false;}
  }
  async function start(number:number){
    if(busy.current||!levelAvailable(number,completed))return;
    busy.current=true;change('starting');setError('');setCoins(0);setProgress(0);setLevel(number);setWorld({region:courses[number-1].regions[0].name,cooldown:0,defeated:0});
    const id=crypto.randomUUID();
    try{
      // Build avatar before recording participation: a render failure is not a played attempt.
      const svg=avatar.current?.querySelector('svg');if(!svg)throw new Error('Your avatar is not ready. Please retry.');
      const texture=await avatarTexture(svg);
      await api('POST',{action:'start',level:number,attemptId:id,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone});
      if(!mounted.current)return;
      controller.current?.destroy();controller.current=null;
      const result={id,level:number,coins:0};setAttempt(result);
      const {mountGame}=await import('./engine');
      if(!mounted.current)return;
      const host=stage.current;if(!host)throw new Error('The play area is unavailable.');
      mountGame(host,courses[number-1],texture,held.current,setCoins,(cause,count)=>{
        const ended={...result,coins:count};setAttempt(ended);
        if(cause==='complete')void save(ended);
        else {setFailure(cause==='fall'?'You fell below the course.':cause==='enemy'?'A '+themeFor(number).villain+' caught you.':'You touched a hazard.');change('failed');}
      },pause,handle=>{controller.current=handle;change('running');if(document.hidden||!document.hasFocus()){handle.pause();change('paused');}},setProgress,setWorld);
    }catch(e){if(mounted.current){setError(e instanceof Error?e.message:'Unable to start. Please retry.');change('menu');}}
    finally{busy.current=false;}
  }
  useEffect(()=>()=>{controller.current?.destroy();},[]);
  function back(){if(['running','paused','starting','saving','unsaved'].includes(statusRef.current)){pause();setExit(true);}else router.push('/game-room');}
  function touch(key:keyof InputState){return {
    onPointerDown:(e:React.PointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);held.current[key]=true;},
    onPointerUp:()=>{held.current[key]=false;},onPointerCancel:()=>{held.current[key]=false;},onLostPointerCapture:()=>{held.current[key]=false;},
  };}
  const active=status!=='menu';
  const modal=exit||instructions||['paused','failed','saving','saved','unsaved'].includes(status);
  const course=courses[level-1];
  return <main className={[styles.game,loaded&&['menu','starting'].includes(status)?styles.landing:''].join(' ')}>
    <header className={styles.header}>
      <button onClick={back} disabled={status==='starting'}>← Back to Game Room</button>
      <div><span className={styles.eyebrow}>YOUR WORLD. YOUR NEXT ADVENTURE.</span><h1>Jumpyland</h1></div>
      <button onClick={()=>{pause();setInstructions(true);}} disabled={status==='starting'}>How to play</button>
    </header>
    <div ref={avatar} className={styles.avatarSource} aria-hidden="true">{room&&<AvatarPreview appearance={room.appearance} outfits={room.outfits} faces={room.faces}/>}</div>
    {!loaded ? <section className={styles.loading} aria-live="polite"><h2>{error?'We couldn’t open Jumpyland':'Loading your campus adventure…'}</h2><p>{error||'Getting your saved avatar and level progress.'}</p>{error&&<button onClick={()=>setReload(n=>n+1)}>Retry connection</button>}</section>:<>
      {['menu','starting'].includes(status)&&<WorldMap room={room!} completed={completed} busy={status==='starting'} error={error} onStart={number=>void start(number)}/>}
      <section className={styles.play} hidden={!active}>
        <div className={styles.hud}><div><span>LEVEL {level} / 3</span><h2>{course.name}</h2><span>{themeFor(level).inspiration}</span></div><div className={styles.collectibles} role="status" aria-label={coins+' of '+course.coins.length+' '+themeFor(level).collectible+' collected this attempt'}>
          <CollectibleIcon level={level}/><div><span>{themeFor(level).collectible}</span><strong key={level+'-'+coins} className={coins?styles.pickupPulse:''}>{coins}<small> / {course.coins.length}</small></strong></div>
          <progress aria-label={themeFor(level).collectible+' collected'} max={course.coins.length} value={coins}/>
        </div><button onClick={pause} disabled={status!=='running'}>Ⅱ Pause</button></div>
        <div className={styles.journeyStatus}><strong>{world.region}</strong><span>{world.defeated} enemies defeated</span><button disabled={status!=='running'||world.cooldown>0} onClick={e=>{if(e.detail===0){held.current.power=true;window.setTimeout(()=>{held.current.power=false;},120);}}} onPointerDown={e=>{e.preventDefault();held.current.power=true;}} onPointerUp={()=>{held.current.power=false;}} onPointerLeave={()=>{held.current.power=false;}} onPointerCancel={()=>{held.current.power=false;}}>{themeFor(level).power} · {world.cooldown?world.cooldown+'s':'Ready [X]'}</button></div><div className={styles.viewport}>
          <div className={styles.stage} ref={stage}/>
          {modal&&<div className={styles.overlay}><section role="dialog" aria-modal="true" aria-labelledby="game-dialog-title" className={[styles.dialog,status==='failed'&&!exit&&!instructions?styles.failedDialog:''].join(' ')}>
            {exit?<><h2 id="game-dialog-title">Leave Jumpyland?</h2><p>{['saving','unsaved'].includes(status)?'This result is not confirmed saved. Leaving without saving may lose it. Confirmed level progress stays saved.':'Your unfinished attempt and its collectibles will be discarded. Confirmed level progress stays saved.'}</p><button autoFocus onClick={()=>setExit(false)}>Stay</button>{status==='unsaved'&&attempt&&<button onClick={()=>{setExit(false);void save(attempt);}}>Retry saving</button>}<button disabled={status==='saving'||status==='starting'} onClick={()=>router.push('/game-room')}>{status==='unsaved'?'Leave without saving':'Leave Game'}</button></>
            :instructions?<><h2 id="game-dialog-title">How to play</h2><p>Hold ← or → to move. Press Space while standing on a platform to jump. On touch screens, hold the movement buttons and tap Jump.</p><p>Jump past enemies or press X to use your world’s power. Powers recharge in 3.5 seconds. Avoid gaps and reach the finish gate. Collectibles are optional and reset on every attempt.</p><p>Complete a level to unlock the next. Retry as often as you like. Pause preserves your place; closing or refreshing loses the current attempt.</p><button autoFocus onClick={()=>setInstructions(false)}>Close instructions</button></>
            :status==='paused'?<><h2 id="game-dialog-title">Take your time.</h2><p>Your character and collectibles are right where you left them.</p><button autoFocus onClick={()=>{change('running');controller.current?.resume();}}>Resume</button></>
            :status==='failed'?<FailurePanel room={room!} level={level} region={world.region} cause={failure} count={coins} total={course.coins.length} onRetry={()=>void start(level)} onMap={()=>change('menu')}/>
            :<><h2 id="game-dialog-title">{status==='saved'?(level===3?'You made it through Jumpyland!':'Level complete!'):'You reached the flag!'}</h2><p>You collected {coins} of {course.coins.length} {themeFor(level).collectible}.</p><p role="status">{status==='saving'?'Saving your result…':status==='saved'?'Your result is saved to your account.':'Your result has not been saved.'}</p>{status==='unsaved'&&<><p role="alert">{error}</p><button autoFocus onClick={()=>attempt&&void save(attempt)}>Retry saving</button></>}{status==='saved'&&<><button autoFocus onClick={()=>void start(level)}>Replay level</button>{level<3&&<button onClick={()=>void start(level+1)}>Next level →</button>}<button onClick={()=>change('menu')}>Level selection</button></>}</>}
          </section></div>}
        </div>
        <progress aria-label="Distance to flag" max={100} value={progress} style={{width:'100%',height:6,accentColor:'#4c8260'}}/>
        <footer className={styles.controls}><span>← → Move · Space Jump · X Power</span><button aria-pressed={controls} onClick={()=>setControls(!controls)}>{controls?'Hide':'Show'} on-screen controls</button><div className={`${styles.touch} ${controls?styles.showTouch:''}`}><button aria-label="Move left" {...touch('left')}>←</button><button aria-label="Move right" {...touch('right')}>→</button><button {...touch('jump')}>Jump ↑</button><button {...touch('power')}>{themeFor(level).power} X</button></div></footer>
      </section>
      {instructions&&!active&&<div className={styles.overlay}><section role="dialog" aria-modal="true" aria-labelledby="menu-instructions" className={styles.dialog}><h2 id="menu-instructions">How to play</h2><p>Hold ← or → to move. Press Space to jump while grounded. Touch screens have Left, Right, and Jump buttons. Press X (or the power button) to fire at patrolling enemies. The power recharges in 3.5 seconds. Jump past enemies, avoid gaps, collect optional gold coins, Dragon Balls, or chakra scrolls, and reach the finish.</p><p>Complete three levels in order. Retries are unlimited. Pause keeps your place until you choose Resume. Closing the page discards the current attempt.</p><button autoFocus onClick={()=>setInstructions(false)}>Got it</button></section></div>}
    </>}
  </main>;
}
