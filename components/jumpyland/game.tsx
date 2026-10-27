'use client';
import {PointerInputs,type Action} from './controls';
import {backstory,missions} from './story';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AvatarPreview } from '../game-room/avatar-preview';
import { accessToken } from '../../lib/account/session';
import { GameRoomData } from '../../lib/game-room';
import { courses, levelAvailable } from './levels';
import { themeFor } from './themes';
import { CollectibleIcon } from './collectible-icon';
import { avatarTexture } from './avatar-texture';
import { avatarEditorPreview } from '../../lib/avatar-editor';
import type { GameController, InputState, WorldState } from './engine';
import styles from './game.module.css';
import {WorldMap} from './world-map';
import {FailurePanel} from './failure-panel';
import {GameAudio} from './audio';
import {Preparation} from './preparation';
import {emptyLoadout,runCostume,type RunLoadout} from './wardrobe';

type Status='menu'|'starting'|'running'|'paused'|'failed'|'saving'|'saved'|'unsaved';
const emptyWorld:WorldState={guarding:false,guardCooldown:0,blockedShots:0,hearts:3,region:'',cooldown:0,defeated:0,shield:false,skyJump:0,rapid:0,nimbus:0,saiyan:0,special:'',specialSeconds:0,notice:''};
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
  const [world,setWorld]=useState<WorldState>(emptyWorld);
  const [failure,setFailure]=useState('');
  const [preparing,setPreparing]=useState<number|null>(null);
  const [loadout,setLoadout]=useState<RunLoadout>(emptyLoadout);
  const [attempt,setAttempt]=useState<Attempt|null>(null);
  const [instructions,setInstructions]=useState(false);
  const [exit,setExit]=useState(false);
  const [controls,setControls]=useState(false);
  const audio=useRef<GameAudio|null>(null);
  const [sound,setSound]=useState(true),[volume,setVolume]=useState(35),[audioError,setAudioError]=useState('');
  useEffect(()=>{try{setSound(localStorage.getItem('jumpyland.sound')!=='off');const saved=localStorage.getItem('jumpyland.volume');if(saved!==null)setVolume(Math.max(0,Math.min(100,Number(saved)||0)));}catch{}return()=>audio.current?.destroy();},[]);
  function readyAudio(){try{if(!audio.current)audio.current=new GameAudio();audio.current.setVolume(volume/100);audio.current.setEnabled(sound);if(sound)void audio.current.unlock().catch(()=>{});}catch{setAudioError('Sound is unavailable in this browser.');}}
  function toggleSound(){const next=!sound;setSound(next);try{localStorage.setItem('jumpyland.sound',next?'on':'off');}catch{}if(!audio.current&&next){try{audio.current=new GameAudio();}catch{setAudioError('Sound is unavailable in this browser.');}}audio.current?.setEnabled(next);if(next)void audio.current?.unlock().catch(()=>{});}
  function changeVolume(value:number){setVolume(value);audio.current?.setVolume(value/100);try{localStorage.setItem('jumpyland.volume',String(value));}catch{}}
  const root=useRef<HTMLElement>(null);
  const [fullscreen,setFullscreen]=useState(false),[fullscreenError,setFullscreenError]=useState('');
  const prepared=useRef<{key:string;texture:Promise<string>}|null>(null);
  async function texture(){
    const svg=avatar.current?.querySelector('svg');if(!svg)throw new Error('Your avatar is not ready. Please retry.');
    const key=svg.outerHTML;
    if(prepared.current?.key!==key)prepared.current={key,texture:avatarTexture(svg)};
    try{return await prepared.current.texture;}catch(e){prepared.current=null;throw e;}
  }
  async function toggleFullscreen(){
    setFullscreenError('');
    try{if(document.fullscreenElement)await document.exitFullscreen();else if(root.current?.requestFullscreen)await root.current.requestFullscreen();else setFullscreenError('Fullscreen is unavailable here. Try Edge on a computer.');}
    catch{setFullscreenError('Fullscreen was unavailable. The game still fills this window.');}
  }
  useEffect(()=>{const update=()=>setFullscreen(!!document.fullscreenElement);document.addEventListener('fullscreenchange',update);return()=>document.removeEventListener('fullscreenchange',update);},[]);
  useEffect(()=>{
    if(!room)return;
    // Warm the engine, avatar and background images while the map is explored.
    void import('./engine').catch(()=>{});
    void texture().catch(()=>{});
    const images=['/jumpyland/pbr/japanese_cedar_bark-Diffuse.jpg','/jumpyland/pbr/japanese_cedar_bark-nor_gl.jpg','/jumpyland/terrain-materials-v1.png'].map(src=>{const image=new Image();image.src=src;void image.decode().catch(()=>{});return image;});
    return()=>{images.forEach(image=>{image.onload=null;});};
  },[room]);
  const avatar=useRef<HTMLDivElement>(null),stage=useRef<HTMLDivElement>(null);
  const controller=useRef<GameController|null>(null);
  const gameCleanup=useRef<(()=>void)|null>(null);
  function dispose(){if(gameCleanup.current){gameCleanup.current();gameCleanup.current=null;}else controller.current?.destroy();controller.current=null;stage.current?.replaceChildren();}
  function showMap(){dispose();change('menu');}
  const held=useRef<InputState>({left:false,right:false,jump:false,power:false,down:false,defend:false});
  const pointerInputs=useRef(new PointerInputs(held.current));
  const busy=useRef(false),mounted=useRef(true);
  function change(next:Status){if(next!=='running')pointerInputs.current.clear();statusRef.current=next;setStatus(next);}
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
  function pause(){if(statusRef.current==='running'){controller.current?.pause();audio.current?.pause();change('paused');}}
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
  async function start(number:number,selection:RunLoadout=emptyLoadout){
    if(busy.current||!levelAvailable(number,completed))return;
    readyAudio();dispose();busy.current=true;setLoadout(selection);setPreparing(null);change('starting');setError('');setCoins(0);setProgress(0);setLevel(number);setWorld({...emptyWorld,region:courses[number-1].regions[0].name});
    const id=crypto.randomUUID();
    try{
      // Build avatar before recording participation: a render failure is not a played attempt.
      await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
      const [sheet,engine]=await Promise.all([texture(),import('./engine')]);
      await api('POST',{action:'start',level:number,attemptId:id,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone});
      if(!mounted.current)return;
      dispose();
      const result={id,level:number,coins:0};setAttempt(result);
      const {mountGame}=engine;
      if(!mounted.current)return;
      const host=stage.current;if(!host)throw new Error('The play area is unavailable.');
      gameCleanup.current=mountGame(host,courses[number-1],sheet,held.current,setCoins,(cause,count)=>{
        audio.current?.end(cause==='complete'?'complete':cause==='enemy'?'hit':'fall');
        const ended={...result,coins:count};setAttempt(ended);
        if(cause==='complete')void save(ended);
        else {setFailure(cause==='fall'?'You fell below the course.':cause==='enemy'?'A '+themeFor(number).villain+' caught you.':'You touched a hazard.');change('failed');}
      },pause,handle=>{if(!mounted.current){handle.destroy();return;}controller.current=handle;change('running');audio.current?.play(number);if(document.hidden||!document.hasFocus()){handle.pause();audio.current?.pause();change('paused');}},setProgress,setWorld,selection,effect=>audio.current?.effect(effect),90,room?avatarEditorPreview(room,room.appearance):null);
    }catch(e){if(mounted.current){setError(e instanceof Error?e.message:'Unable to start. Please retry.');change('menu');}}
    finally{busy.current=false;}
  }
  useEffect(()=>()=>{dispose();},[]);
  function back(){if(['running','paused','starting','saving','unsaved'].includes(statusRef.current)){pause();setExit(true);}else router.push('/game-room');}
  function touch(key:Action){return {
    onPointerDown:(e:React.PointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);pointerInputs.current.press(e.pointerId,key);},
    onPointerUp:(e:React.PointerEvent<HTMLButtonElement>)=>pointerInputs.current.release(e.pointerId),
    onPointerCancel:(e:React.PointerEvent<HTMLButtonElement>)=>pointerInputs.current.release(e.pointerId),
    onLostPointerCapture:(e:React.PointerEvent<HTMLButtonElement>)=>pointerInputs.current.release(e.pointerId),
  };}
  const active=status!=='menu';
  const modal=preparing===null&&(exit||instructions||['paused','failed','saving','saved','unsaved'].includes(status));
  const course=courses[level-1];
  return <main ref={root} className={[styles.game,active?styles.immersive:'',loaded&&['menu','starting'].includes(status)?styles.landing:''].join(' ')}>
    <header className={styles.header}>
      <button onClick={back} disabled={status==='starting'}>← Back to Game Room</button>
      <div className={styles.gameTitle}><h1>Jumpyland</h1><span className={styles.eyebrow}>THREE WORLDS. YOUR OWN ADVENTURE.</span></div>
      <div className={styles.headerActions}><details className={styles.audioControls}><summary aria-label="Sound settings">{sound?'♫':'♪'}</summary><div><button aria-pressed={sound} onClick={toggleSound}>Sound {sound?'on':'off'}</button><label>Volume <input aria-label="Sound volume" type="range" min="0" max="100" value={volume} onChange={e=>changeVolume(Number(e.target.value))}/></label>{audioError&&<p role="status">{audioError}</p>}</div></details><button onClick={()=>void toggleFullscreen()}>{fullscreen?'Exit full screen':'Full screen ⛶'}</button><button onClick={()=>{pause();setInstructions(true);}} disabled={status==='starting'}>How to play</button></div>
    </header>
    {fullscreenError&&<p className={styles.fullscreenNotice} role="status">{fullscreenError}</p>}
    <div ref={avatar} className={styles.avatarSource} aria-hidden="true">{room&&<AvatarPreview appearance={room.appearance} outfits={room.outfits} faces={room.faces} costume={runCostume(loadout,level)}/>}</div>
    {!loaded ? <section className={styles.loading} aria-live="polite"><h2>{error?'We couldn’t open Jumpyland':'Loading your campus adventure…'}</h2><p>{error||'Getting your saved avatar and level progress.'}</p>{error&&<button onClick={()=>setReload(n=>n+1)}>Retry connection</button>}</section>:<>
      {status==='menu'&&<WorldMap room={room!} completed={completed} busy={false} error={error} onStart={number=>void start(number)} onPrepare={number=>setPreparing(number)}/>}
      <section className={styles.play} hidden={!active}>
        <div className={styles.hud}><div><span>LEVEL {level} / 3</span><h2>{course.name}</h2><span>{themeFor(level).inspiration}</span></div><div className={styles.collectibles} role="status" aria-label={coins+' of '+course.coins.length+' '+themeFor(level).collectible+' collected this attempt'}>
          <CollectibleIcon level={level}/><div><span>{themeFor(level).collectible}</span><strong key={level+'-'+coins} className={coins?styles.pickupPulse:''}>{coins}<small> / {course.coins.length}</small></strong></div>
          <progress aria-label={themeFor(level).collectible+' collected'} max={course.coins.length} value={coins}/>
        </div><button onClick={pause} disabled={status!=='running'}>Ⅱ Pause</button></div>
        <div className={styles.powerInventory} aria-label="Collected special powers"><span role="status" aria-label={world.hearts+' of 3 hearts remaining'} style={{color:'#ffe0d3',borderColor:'#e8a590'}}>{'♥'.repeat(world.hearts)}{'♡'.repeat(3-world.hearts)} · {world.hearts}/3 hearts</span><span className={world.shield?styles.powerActive:''}>◆ Shield {world.shield?'ready':'—'}</span><span className={world.skyJump?styles.powerActive:''}>↑↑ Sky jump {world.skyJump?world.skyJump+'s':'—'}</span><span className={world.rapid?styles.powerActive:''}>✦ Rapid fire {world.rapid?world.rapid+'s':'—'}</span>{level===2&&<><span className={world.nimbus?styles.powerActive:''}>☁ Nimbus {world.nimbus?world.nimbus+'s':'—'}</span><span className={world.saiyan?styles.powerActive:''}>★ Super Saiyan {world.saiyan?world.saiyan+'s':'—'}</span></>}{world.special&&world.special!=='Super Saiyan'&&<span className={styles.powerActive}>{world.special} · {world.specialSeconds}s</span>}<small role="status">{world.notice}</small></div>
        <div className={styles.journeyStatus}><strong>{world.region}</strong><span className={styles.mission}>{missions[level-1].objective}</span><button className={styles.defense} aria-label="Defend against shots" aria-pressed={world.guarding} disabled={status!=='running'||world.guardCooldown>0} {...touch('defend')} onClick={e=>{if(e.detail===0){held.current.defend=true;held.current.defendQueued=true;window.setTimeout(()=>{held.current.defend=false;},100);}}}>{world.guarding?'◈ Guarding':world.guardCooldown>0?`◈ Guard ${world.guardCooldown.toFixed(1)}s`:'◈ Defend [C / Shift]'}</button><button disabled={status!=='running'||world.cooldown>0} onClick={e=>{if(e.detail===0){held.current.power=true;held.current.powerQueued=true;window.setTimeout(()=>{held.current.power=false;},120);}}} onPointerDown={e=>{e.preventDefault();held.current.power=true;held.current.powerQueued=true;}} onPointerUp={()=>{held.current.power=false;}} onPointerLeave={()=>{held.current.power=false;}} onPointerCancel={()=>{held.current.power=false;}}>{world.special&&world.special!=='Super Star'&&!world.special.startsWith('Shadow clone')?world.special:themeFor(level).power} · {world.cooldown?world.cooldown+'s':'Ready [X]'}</button></div><div className={styles.viewport}>
          <div className={styles.stage} ref={stage}/>{status==='starting'&&<div className={styles.starting} role="status"><strong>Preparing your adventure…</strong><span>Your adventure is almost ready.</span></div>}
          {modal&&<div className={styles.overlay}><section role="dialog" aria-modal="true" aria-labelledby="game-dialog-title" className={[styles.dialog,status==='failed'&&!exit&&!instructions?styles.failedDialog:''].join(' ')}>
            {exit?<><h2 id="game-dialog-title">Leave Jumpyland?</h2><p>{['saving','unsaved'].includes(status)?'This result is not confirmed saved. Leaving without saving may lose it. Confirmed level progress stays saved.':'Your unfinished attempt and its collectibles will be discarded. Confirmed level progress stays saved.'}</p><button autoFocus onClick={()=>setExit(false)}>Stay</button>{status==='unsaved'&&attempt&&<button onClick={()=>{setExit(false);void save(attempt);}}>Retry saving</button>}<button disabled={status==='saving'||status==='starting'} onClick={()=>router.push('/game-room')}>{status==='unsaved'?'Leave without saving':'Leave Game'}</button></>
            :instructions?<><h2 id="game-dialog-title">How to play</h2><p>Hold ← / A or → / D to move. Press ↑, W or Space while standing on a platform to jump. Hold ↓ or S to crouch under shots. On touch screens, hold the movement buttons and tap Jump.</p><p>Jump past enemies or press X to use your world’s power. Your attack recharges in 3.5 seconds. Climb the upper ledges for a one-hit shield, 20 seconds of double jump (tap Space again in the air), or rapid fire. Enemies track you on their platforms and show an amber aim line before firing faster, aimed shots. Tap C or Shift, or the Defend button, to block shots for 0.65 seconds; guard recharges in 2.6 seconds. Release and press again for the next guard. Guard does not stop contact damage or falls. Keep moving and jumping together to dodge. Each attempt has three hearts. An unprotected hit or fall costs one heart; losing all three ends the attempt. Lanterns save your respawn location, not extra hearts. Avoid gaps and reach the finish gate. Collectibles are optional and reset on every attempt.</p><p>Complete a level to unlock the next. Retry as often as you like. Pause preserves your place; closing or refreshing loses the current attempt and its checkpoints.</p><button autoFocus onClick={()=>setInstructions(false)}>Close instructions</button></>
            :status==='paused'?<><h2 id="game-dialog-title">Take your time.</h2><p>Your character and collectibles are right where you left them.</p><button autoFocus onClick={()=>{change('running');controller.current?.resume();void audio.current?.resume();}}>Resume</button></>
            :status==='failed'?<FailurePanel room={room!} level={level} region={world.region} cause={failure} count={coins} total={course.coins.length} onRetry={()=>void start(level,loadout)} onMap={showMap} onPrepare={()=>setPreparing(level)} costume={runCostume(loadout,level)}/>
            :<><h2 id="game-dialog-title">{status==='saved'?(level===3?'You made it through Jumpyland!':'Level complete!'):'You reached the flag!'}</h2><p>{missions[level-1].ending}</p><p>You collected {coins} of {course.coins.length} {themeFor(level).collectible}.</p><p role="status">{status==='saving'?'Saving your result…':status==='saved'?'Your result is saved to your account.':'Your result has not been saved.'}</p>{status==='unsaved'&&<><p role="alert">{error}</p><button autoFocus onClick={()=>attempt&&void save(attempt)}>Retry saving</button></>}{status==='saved'&&<><button autoFocus onClick={()=>void start(level,loadout)}>Replay level</button>{level<3&&<button onClick={()=>void start(level+1)}>Next level →</button>}<button onClick={showMap}>Level selection</button></>}</>}
          </section></div>}
        </div>
        <progress aria-label="Distance to flag" max={100} value={progress} className={styles.distance}/>
        <footer className={styles.controls}><span>← → / A D Move · W / Space Jump · ↓ Duck · X Power · C Guard</span><button aria-pressed={controls} onClick={()=>setControls(!controls)}>{controls?'Hide':'Show'} on-screen controls</button><div className={`${styles.touch} ${controls?styles.showTouch:''}`}><button aria-label="Move left" {...touch('left')}>←</button><button aria-label="Move right" {...touch('right')}>→</button><button {...touch('jump')}>{world.nimbus?'Rise ↑':'Jump ↑'}</button><button {...touch('down')}>{world.nimbus?'Down ↓':'Duck ↓'}</button><button {...touch('power')}>{themeFor(level).power} X</button></div></footer>
      </section>
      {instructions&&!active&&<div className={styles.overlay}><section role="dialog" aria-modal="true" aria-labelledby="menu-instructions" className={styles.dialog}><h2 id="menu-instructions">How to play</h2><p><strong>{backstory.title}.</strong> {backstory.intro} {backstory.goal}</p><p>Hold ← / A or → / D to move. Press ↑, W or Space to jump while grounded; ↓ or S crouches. Touch screens have Left, Right, and Jump buttons. Press X (or the power button) to fire at patrolling enemies. The attack recharges in 3.5 seconds. Mushroom springs launch you upward; stand on a foreground pipe and press Down to travel. Naruto rope ladders climb with Up/Down. Lit lanterns checkpoint this attempt only. Climb for shields, double jump and rapid fire. Glowing route markers show moving platforms: stand on one to ride; jump off at the next landing. Enemies pursue within their platforms and aim before firing. C / Shift or Defend raises a 0.65-second guard against shots, with a 2.6-second recharge. It does not protect against touching monsters or falling. Jump past enemies, avoid gaps, collect optional gold coins, Dragon Balls, or chakra scrolls, and reach the finish.</p><p>In Dragon World, discover a Golden Nimbus on the upper route: hold Jump to rise and Down to descend for 12 seconds. Collect three Dragon Balls and climb the high late-course ledge for 15 seconds of Super Saiyan, with a golden aura and a larger X blast. Mushroom Kingdom hides Fire Flowers (bouncing fireballs) and ten-second Super Stars (contact protection). Shinobi World hides Rasengan, a short Chidori lunge and two solid shadow clones that each absorb a hit and vanish in smoke. Complete three levels in order. Retries are unlimited. Pause keeps your place until you choose Resume. Closing the page discards the current attempt.</p><button autoFocus onClick={()=>setInstructions(false)}>Got it</button></section></div>}
    </>}
    {preparing!==null&&room&&<Preparation key={preparing} room={room} level={preparing} initial={status==='failed'?loadout:emptyLoadout} onClose={()=>setPreparing(null)} onPlay={selection=>void start(preparing,selection)}/>}
  </main>;
}
