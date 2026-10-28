'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,Compass,Flag,Heart,Pause,Play,RotateCcw,Settings,Star,Trophy,Volume2} from 'lucide-react';
import type {Country} from '../../lib/world-explorer/catalog';
import {discoveryFor} from '../../lib/world-explorer-discoveries';
import {countryProfile} from '../../lib/world-explorer/profiles';
import {levelAvailability,levelDefinitionFor} from '../../lib/world-explorer/level-manifest';
import type {CountryRunResult,CountryStats,Difficulty,ExplorerRunPreferences} from '../../lib/world-explorer/game-types';
import type {ExplorerPreferences} from '../../lib/world-explorer/preferences';
import {CountryFlag} from './country-flag';
import {LandmarkPhoto} from './landmark-photo';
import {PreferencesControls} from './preferences-panel';
import styles from './world-explorer.module.css';

type RunStatus='starting'|'running'|'paused'|'discovery'|'complete'|'failed';
type Controller={pause:()=>void;resume:()=>void;destroy:()=>void;setPreferences?:(preferences:ExplorerRunPreferences)=>void;setReviewView?:(view:'gameplay'|'overview')=>void};
export type RunOutcome=CountryRunResult;
const initialStats:CountryStats={hearts:3,coins:0,totalCoins:0,stars:0,totalStars:3,checkpointActive:false,timeSeconds:0,discoveryFound:false};
const labels=['Discovery','Adventure','Hard','Expert'];
function formatTime(seconds:number){const whole=Math.max(0,Math.floor(seconds));return `${Math.floor(whole/60)}:${String(whole%60).padStart(2,'0')}`;}
function runId(){return globalThis.crypto?.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,char=>{const value=Math.floor(Math.random()*16);return(char==='x'?value:(value&3)|8).toString(16);});}

export function CountryRun({country,difficulty,preferences,saveStatus,onPreferences,onExit,onResult,onRetry,onNext}:{country:Country;difficulty:Difficulty;preferences:ExplorerPreferences;saveStatus:string;onPreferences:(value:ExplorerPreferences)=>void;onExit:()=>void;onResult:(completed:boolean,coins:number,result:RunOutcome,runId:string)=>void;onRetry:()=>void;onNext:()=>void}){
 const stage=useRef<HTMLDivElement>(null),controller=useRef<Controller|null>(null),finished=useRef(false),statsRef=useRef(initialStats),dialog=useRef<HTMLDivElement>(null),attempt=useRef('');
 const [status,setStatus]=useState<RunStatus>('starting'),[error,setError]=useState(''),[distance,setDistance]=useState(0),[stats,setStats]=useState(initialStats),[showSettings,setShowSettings]=useState(false);
 const [review,setReview]=useState(false),[overview,setOverview]=useState(false),[performance,setPerformance]=useState<{fps:number;drawCalls:number;triangles:number}|null>(null);
 const availability=levelAvailability(country.code),profile=countryProfile(country.code),level=useMemo(()=>levelDefinitionFor(country.code,difficulty),[country.code,difficulty]);
 const finalPlatform=level.platforms.find(platform=>platform.id===level.finish.platformId)!,finishX=finalPlatform.x+level.finish.offset;
 const checkpointMarks=level.checkpoints.map(point=>{const platform=level.platforms.find(item=>item.id===point.platformId)!;return(platform.x+point.offset)/finishX*100;});
 useEffect(()=>{
  let disposed=false,expired=false,game:Controller|undefined;attempt.current=runId();setReview(new URLSearchParams(window.location.search).get('review')==='1');
  const timeout=setTimeout(()=>{if(disposed)return;expired=true;setError('The level took too long to load. Check the connection and try again.');setStatus('failed');},20000);
  import('./country-scene').then(({mountCountryStage})=>{
   if(disposed||expired||!stage.current)return;
   game=mountCountryStage(stage.current,{...country,difficulty,...preferences},{
    onReady:()=>{clearTimeout(timeout);if(!disposed&&!expired)setStatus('running');},
    onProgress:value=>{if(!disposed)setDistance(value);},
    onPerformance:value=>{if(!disposed)setPerformance(value);},
    onStats:value=>{if(!disposed){statsRef.current=value;setStats(value);}},
    onDiscovery:()=>{if(!disposed){setShowSettings(false);setStatus('discovery');}},
    onFinish:(coins,result)=>{if(disposed||finished.current)return;finished.current=true;const latest=statsRef.current;onResult(true,coins??latest.coins,result||{stars:latest.stars,elapsedMs:Math.round(latest.timeSeconds*1000),discoveryFound:latest.discoveryFound},attempt.current);setStatus('complete');},
    onFail:()=>{if(disposed||finished.current)return;finished.current=true;const latest=statsRef.current;onResult(false,latest.coins,{stars:latest.stars,elapsedMs:Math.round(latest.timeSeconds*1000),discoveryFound:latest.discoveryFound},attempt.current);setStatus('failed');},
    onError:message=>{clearTimeout(timeout);if(!disposed){setError(message);setStatus('failed');}}
   });controller.current=game;
  }).catch(reason=>{clearTimeout(timeout);if(!disposed){setError(reason instanceof Error?reason.message:'The 3D level could not open.');setStatus('failed');}});
  return()=>{disposed=true;clearTimeout(timeout);game?.destroy();controller.current=null;};
 // The parent keys attempts; updates to HUD and preferences must not restart physics.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 useEffect(()=>{controller.current?.setPreferences?.(preferences);},[preferences]);
 function resume(){controller.current?.resume();setShowSettings(false);setStatus('running');}
 function pause(){if(status==='running'){controller.current?.pause();setStatus('paused');}else if(status==='paused'||status==='discovery')resume();}
 useEffect(()=>{
  const keyboard=(event:KeyboardEvent)=>{if(event.repeat||event.altKey||event.ctrlKey||event.metaKey)return;if(['Escape','KeyP'].includes(event.code)){event.preventDefault();pause();}};
  const visibility=()=>{if(document.hidden&&status==='running'){controller.current?.pause();setStatus('paused');}};
  window.addEventListener('keydown',keyboard);document.addEventListener('visibilitychange',visibility);return()=>{window.removeEventListener('keydown',keyboard);document.removeEventListener('visibilitychange',visibility);};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[status]);
 useEffect(()=>{
  if(status==='running'||status==='starting')return;
  const first=dialog.current?.querySelector<HTMLElement>('button,a,input,select');first?.focus({preventScroll:true});
  const trap=(event:KeyboardEvent)=>{
   if(event.key!=='Tab'||!dialog.current)return;const controls=Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select')).filter(element=>!element.hidden);
   const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  };
  window.addEventListener('keydown',trap);return()=>window.removeEventListener('keydown',trap);
 },[status,showSettings]);
 const signal=(action:'left'|'right'|'jump',pressed:boolean)=>stage.current?.dispatchEvent(new CustomEvent('explorer-input',{detail:{action,pressed}}));
 const openGuide=()=>{controller.current?.pause();setStatus('discovery');};
 return <section className={styles.run} aria-label={country.name+' country level'}>
  <div ref={stage} className={styles.runStage}/>
  <header className={styles.playHeader}>
   <div className={styles.playIdentity}><button onClick={onExit} aria-label="Return to the world map"><ArrowLeft size={19}/></button><CountryFlag iso2={country.iso2} name={country.name} size={42}/><div><h1>{country.name}</h1><p>Level 1 · {availability?.title}</p><small>{availability?.stage==='prototype'?'Playable prototype':'Environment preview'} · {labels[difficulty-1]}</small></div></div>
   <div className={styles.playProgress} aria-label="Level route"><div><span>Start</span><span>Checkpoint</span><Flag size={12}/></div><progress aria-label="Level progress" value={distance} max={100}/>{checkpointMarks.map((mark,index)=><i key={index} className={stats.checkpointActive?styles.checkpointEarned:undefined} style={{left:mark+'%'}} aria-label={stats.checkpointActive?'Checkpoint activated':'Checkpoint ahead'}/>)}</div>
   <div className={styles.playCounters}><span aria-label={`${stats.coins} of ${stats.totalCoins} coins`}><i className={styles.coin}/>{stats.coins}<small>/{stats.totalCoins}</small></span><span aria-label={`${stats.stars} of ${stats.totalStars} stars`}><Star size={23} fill="#efcf65"/>{stats.stars}<small>/{stats.totalStars}</small></span><button onClick={pause} disabled={!['running','paused','discovery'].includes(status)} aria-label={status==='running'?'Pause level':'Resume level'}>{status==='running'?<Pause/>:<Play/>}</button></div>
  </header>
  <div className={styles.playSecondary}><div className={styles.playLives} aria-label={stats.hearts+' hearts remaining'}>{[0,1,2].map(index=><Heart key={index} size={17} fill={index<stats.hearts?'#ff9b91':'none'} color={index<stats.hearts?'#ff9b91':'#afc0bd'}/>)}<span>{formatTime(stats.timeSeconds)}</span></div><button onClick={openGuide} disabled={status!=='running'}><BookOpen size={15}/>{stats.discoveryFound?'Discovery unlocked':'Country guide'}</button></div>
  <p className={styles.controlsHint}>← → / A D to move · Space / ↑ / W to jump · P / Esc to pause</p>
  {review&&status==='running'&&<div className={styles.reviewTools}><button onClick={()=>{controller.current?.setReviewView?.(overview?'gameplay':'overview');setOverview(value=>!value);}}>{overview?'Player camera':'Full-level overview'}</button><span>{overview?'Scenery review · gameplay paused':'Gameplay review'}{performance?` · ${performance.fps} FPS · ${performance.drawCalls} draws · ${performance.triangles.toLocaleString()} triangles`:''}</span></div>}
  <div className={styles.touchControls} aria-label="Touch game controls">{(['left','right','jump'] as const).map(action=><button key={action} aria-label={action==='jump'?'Jump':'Move '+action} onPointerDown={event=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);signal(action,true);}} onPointerUp={()=>signal(action,false)} onPointerCancel={()=>signal(action,false)} onLostPointerCapture={()=>signal(action,false)}>{action==='left'?'←':action==='right'?'→':'Jump ↑'}</button>)}</div>
  {status!=='running'&&<div className={styles.runOverlay}><div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="run-dialog-title" className={styles.gameDialog}>
   {status==='starting'?<><Compass className={styles.loadingCompass}/><h2 id="run-dialog-title">Preparing {country.name}</h2><p>Loading the landscape and checking your route.</p></>:status==='paused'?<>
    <Pause size={30}/><h2 id="run-dialog-title">Adventure paused</h2><button className={styles.playButton} onClick={resume}><Play size={17}/>Continue adventure</button>
    <div className={styles.dialogActions}><button onClick={()=>setShowSettings(value=>!value)}><Settings size={16}/>Settings</button><button onClick={onRetry}><RotateCcw size={16}/>Restart level</button></div>
    {showSettings&&<PreferencesControls value={preferences} onChange={onPreferences} inGame/>}<button className={styles.quietButton} onClick={onExit}>Return to world map</button>
   </>:status==='discovery'?<>
    <BookOpen size={30}/><p className={styles.eyebrow}>{stats.discoveryFound?'DISCOVERY UNLOCKED':'COUNTRY FIELD GUIDE'}</p><h2 id="run-dialog-title">Discover {country.name}</h2><Discovery country={country}/>
    <button className={styles.playButton} onClick={resume}>Continue adventure<ArrowRight size={17}/></button>
   </>:status==='complete'?<>
    <Trophy size={38}/><p className={styles.eyebrow}>PASSPORT STAMP EARNED</p><h2 id="run-dialog-title">{country.name} explored!</h2><div className={styles.resultStars} aria-label={`${stats.stars} of 3 stars earned`}>{[0,1,2].map(index=><Star key={index} size={34} fill={index<stats.stars?'#f2d174':'none'} color={index<stats.stars?'#f2d174':'#819b91'}/>)}</div>
    <div className={styles.resultDetails}><span><i className={styles.coin}/>{stats.coins} / {stats.totalCoins} coins</span><span>{formatTime(stats.timeSeconds)}</span><span><BookOpen size={14}/>{stats.discoveryFound?'Discovery learned':'Discovery still to find'}</span></div><p role="status" className={styles.muted}>{saveStatus}</p>
    {stats.discoveryFound&&<Discovery country={country} compact/>}<button className={styles.playButton} onClick={onRetry}><RotateCcw size={17}/>Replay level</button><button className={styles.quietButton} onClick={onNext}>Choose another destination <ArrowRight size={13}/></button><button className={styles.quietButton} onClick={onExit}>World map and passport</button>
   </>:<>
    <Heart size={32}/><h2 id="run-dialog-title">{error?'The world could not open':'Another adventure awaits'}</h2><p>{error||'Try again with three fresh hearts. Your best result stays in your passport.'}</p><button className={styles.playButton} onClick={onRetry}><RotateCcw size={17}/>Try again</button><button className={styles.quietButton} onClick={onExit}>Return to world map</button>
   </>}
  </div></div>}
 </section>;
}

function Discovery({country,compact=false}:{country:Country;compact?:boolean}){
 const fact=discoveryFor(country.code),profile=countryProfile(country.code);
 return <div className={styles.discovery}><h3>{fact?.title||profile?.landmarkName}</h3><p>{fact?.text||country.description}</p>{!compact&&<><dl className={styles.discoveryFacts}>{country.capital.length>0&&<div><dt>Capital / seat</dt><dd>{country.capital.join(' · ')}</dd></div>}<div><dt>Place</dt><dd>{profile?.landmarkName}</dd></div><div><dt>Landscape</dt><dd>{profile?.features.join(' · ')}</dd></div>{country.languages.length>0&&<div><dt>Languages</dt><dd>{country.languages.slice(0,3).join(' · ')}</dd></div>}</dl><LandmarkPhoto code={country.code}/></>}<a href={fact?.sourceUrl||profile?.sourceUrl} target="_blank" rel="noreferrer">Explore the source <ArrowRight size={12}/></a></div>;
}
