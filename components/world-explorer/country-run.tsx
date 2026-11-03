'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,ArrowUp,BookOpen,Check,Compass,Flag,Heart,Pause,Play,RotateCcw,Settings,Star,Trophy,Volume2} from 'lucide-react';
import type {Country} from '../../lib/world-explorer/catalog';
import {discoveryFor} from '../../lib/world-explorer-discoveries';
import {countryProfile} from '../../lib/world-explorer/profiles';
import {guideDestination} from '../../lib/world-explorer/guide-destination';
import {isAuthoredLevel,levelAvailability,levelDefinitionFor} from '../../lib/world-explorer/level-manifest';
import type {CountryRunResult,CountryStats,Difficulty,ExplorerRunPreferences} from '../../lib/world-explorer/game-types';
import type {ExplorerPreferences} from '../../lib/world-explorer/preferences';
import {CountryFlag} from './country-flag';
import {LandmarkPhoto} from './landmark-photo';
import {PreferencesControls} from './preferences-panel';
import styles from './world-explorer.module.css';

type RunStatus='starting'|'running'|'paused'|'discovery'|'complete'|'failed';
type Controller={pause:()=>void;resume:()=>void;destroy:()=>void;setPreferences?:(preferences:ExplorerRunPreferences)=>void;setReviewView?:(view:'gameplay'|'overview'|'scan',x?:number,y?:number)=>void;setReviewCamera?:(view:{position:[number,number,number];target:[number,number,number];fov?:number})=>void;reviewStats?:()=>{frameTimes:number[];calls:number;triangles:number;geometries:number;textures:number}};
export type RunOutcome=CountryRunResult;
const initialStats:CountryStats={hearts:3,coins:0,totalCoins:0,stars:0,totalStars:3,checkpointActive:false,timeSeconds:0,discoveryFound:false};
const labels=['Discovery','Adventure','Hard','Expert'];
function formatTime(seconds:number){const whole=Math.max(0,Math.floor(seconds));return `${Math.floor(whole/60)}:${String(whole%60).padStart(2,'0')}`;}
function runId(){return globalThis.crypto?.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,char=>{const value=Math.floor(Math.random()*16);return(char==='x'?value:(value&3)|8).toString(16);});}

export function CountryRun({country,difficulty,preferences,saveStatus,onPreferences,onExit,onResult,onRetry,onNext}:{country:Country;difficulty:Difficulty;preferences:ExplorerPreferences;saveStatus:string;onPreferences:(value:ExplorerPreferences)=>void;onExit:()=>void;onResult:(completed:boolean,coins:number,result:RunOutcome,runId:string)=>void;onRetry:()=>void;onNext:()=>void}){
 const stage=useRef<HTMLDivElement>(null),controller=useRef<Controller|null>(null),finished=useRef(false),statsRef=useRef(initialStats),dialog=useRef<HTMLDivElement>(null),attempt=useRef('');
 const [status,setStatus]=useState<RunStatus>('starting'),[error,setError]=useState(''),[distance,setDistance]=useState(0),[stats,setStats]=useState(initialStats),[showSettings,setShowSettings]=useState(false);
 const [review,setReview]=useState(false),[overview,setOverview]=useState(false),[performance,setPerformance]=useState<{fps:number;drawCalls:number;triangles:number}|null>(null);
 const availability=levelAvailability(country.code),profile=countryProfile(country.code),level=useMemo(()=>levelDefinitionFor(country.code,difficulty),[country.code,difficulty]),authored=isAuthoredLevel(country.code);
 const finalPlatform=level.platforms.find(platform=>platform.id===level.finish.platformId)!,finishX=finalPlatform.x+level.finish.offset;
 const checkpointMarks=level.checkpoints.map(point=>{const platform=level.platforms.find(item=>item.id===point.platformId)!;return(platform.x+point.offset)/finishX*100;});
 const activeCheckpoint=level.checkpoints.findIndex(point=>point.id===stats.checkpointId);
 const starMarks=level.stars.map(star=>{const platform=level.platforms.find(item=>item.id===star.platformId)!;return{id:star.id,percent:(platform.x+star.offset)/finishX*100};});
 useEffect(()=>{
  let disposed=false,expired=false,game:Controller|undefined;attempt.current=runId();setReview(new URLSearchParams(window.location.search).get('review')==='1');
  const timeout=setTimeout(()=>{if(disposed)return;expired=true;setError('The level took too long to load. Check the connection and try again.');setStatus('failed');},20000);
  // Country scenery is a separate chunk, fetched only for the chosen level.
  Promise.all([import('./country-scene'),authored?import('./countries/registry').then(registry=>registry.loadCountryEnvironment(level.environmentId)):Promise.resolve(null)]).then(([{mountCountryStage},environment])=>{
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
   },environment);controller.current=game;
   // Review builds expose a camera scan for scenery checks; gameplay pauses meanwhile.
   if(new URLSearchParams(window.location.search).get('review')==='1')Object.assign(window,{worldExplorerReview:game,__worldExplorerFinish:finishX});
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
 useEffect(()=>{
  if(!preferences.debugMode&&!review&&overview){controller.current?.setReviewView?.('gameplay');setOverview(false);}
 },[preferences.debugMode,review,overview]);
 const signal=(action:'left'|'right'|'jump',pressed:boolean)=>stage.current?.dispatchEvent(new CustomEvent('explorer-input',{detail:{action,pressed}}));
 const openGuide=()=>{controller.current?.pause();setStatus('discovery');};
 return <section className={`${styles.run} ${authored?styles.referenceRun:''}`} aria-label={country.name+' country level'} data-environment={level.environmentId} data-touch-controls={preferences.touchControls?'on':'auto'} data-debug={preferences.debugMode||review?'on':'off'}>
  <div ref={stage} className={styles.runStage}/>
  <header className={styles.playHeader}>
   <div className={styles.playIdentity}><button onClick={onExit} aria-label="Return to the world map"><ArrowLeft size={19}/></button><CountryFlag iso2={country.iso2} name={country.name} size={42}/><div><h1>{country.name}</h1><p>Level 1: {availability?.title}</p>{!authored&&<small>Environment preview · {labels[difficulty-1]}</small>}</div></div>
   {authored?<div className={styles.referenceProgress} aria-label="Level route">
    <progress aria-label="Level progress" value={distance} max={100}/>
    {checkpointMarks.map((mark,index)=><i key={index} className={index<=activeCheckpoint?styles.checkpointEarned:undefined} style={{left:mark+'%'}} aria-label={index<=activeCheckpoint?'Checkpoint activated':'Checkpoint ahead'}/>)}
    {starMarks.map((star,index)=><span key={star.id} className={`${styles.routeStar} ${stats.collectedStarIds?.includes(star.id)?styles.routeStarEarned:''}`} style={{left:star.percent+'%'}} aria-label={`Star ${index+1}${stats.collectedStarIds?.includes(star.id)?' collected':' ahead'}`}><Star size={25} fill="currentColor"/></span>)}
    <span className={styles.routeExplorer} style={{left:Math.max(2,Math.min(96,distance))+'%'}}><RoutePortrait/></span><span className={styles.routeDestination}><DestinationIcon environment={level.environmentId}/></span>
   </div>:<div className={styles.playProgress} aria-label="Level route"><div><span>Start</span><span>Checkpoint</span><Flag size={12}/></div><progress aria-label="Level progress" value={distance} max={100}/>{checkpointMarks.map((mark,index)=><i key={index} className={index<=activeCheckpoint?styles.checkpointEarned:undefined} style={{left:mark+'%'}} aria-label={index<=activeCheckpoint?'Checkpoint activated':'Checkpoint ahead'}/>)}</div>}
   <div className={styles.playCounters}><span aria-label={`${stats.coins} of ${stats.totalCoins} coins`}><i className={styles.coin}/>{stats.coins}<small>/{stats.totalCoins}</small></span><span aria-label={`${stats.stars} of ${stats.totalStars} stars`}><Star size={23} fill="#efcf65"/>{stats.stars}<small>/{stats.totalStars}</small></span><button onClick={pause} disabled={!['running','paused','discovery'].includes(status)} aria-label={status==='running'?'Pause level':'Resume level'}>{status==='running'?<Pause/>:<Play/>}</button></div>
  </header>
  <div className={styles.playSecondary}><div className={styles.playLives} aria-label={stats.hearts+' hearts remaining'}>{[0,1,2].map(index=><Heart key={index} size={17} fill={index<stats.hearts?'#ff9b91':'none'} color={index<stats.hearts?'#ff9b91':'#afc0bd'}/>)}<span>{formatTime(stats.timeSeconds)}</span></div><button onClick={openGuide} disabled={status!=='running'}><BookOpen size={15}/>{stats.discoveryFound?'Discovery unlocked':'Country guide'}</button></div>
  <p className={styles.controlsHint}>← → / A D to move · Space / ↑ / W to jump · P / Esc to pause</p>
  {(review||preferences.debugMode)&&status==='running'&&<div className={styles.reviewTools}><button onClick={()=>{controller.current?.setReviewView?.(overview?'gameplay':'overview');setOverview(value=>!value);}}>{overview?'Player camera':'Full-level overview'}</button><span>{overview?'Scenery review · gameplay paused':'Gameplay review'}{performance?` · ${performance.fps} FPS · ${performance.drawCalls} draws · ${performance.triangles.toLocaleString()} triangles`:''}</span></div>}
  <div className={styles.touchControls} aria-label="Touch game controls">{(['left','right','jump'] as const).map(action=><button key={action} aria-label={action==='jump'?'Jump':'Move '+action} onPointerDown={event=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);signal(action,true);}} onPointerUp={()=>signal(action,false)} onPointerCancel={()=>signal(action,false)} onLostPointerCapture={()=>signal(action,false)}>{action==='left'?<ArrowLeft/>:action==='right'?<ArrowRight/>:<ArrowUp/>}</button>)}</div>
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

function RoutePortrait(){return <svg viewBox="0 0 36 40" aria-hidden="true"><circle cx="18" cy="20" r="17" fill="#74bde9" stroke="#e0f3ff" strokeWidth="2"/><path d="M7 35Q6 23 18 23T30 35" fill="#1b3764"/><ellipse cx="18" cy="18" rx="9" ry="11" fill="#dca078"/><path d="M9 19L7 11Q8 4 15 7Q19 1 22 7Q30 5 28 14L25 17L22 10L17 12L13 10Z" fill="#28211c"/><circle cx="15" cy="18" r="1.1" fill="#242524"/><circle cx="22" cy="18" r="1.1" fill="#242524"/><path d="M17 24Q20 26 23 23" fill="none" stroke="#985a43" strokeWidth="1"/></svg>;}
/** Finish-marker icons for the route bar, one per authored environment. */
const destinationIcons:Record<string,JSX.Element>={
 'japan-mountain-spring':<><path d="M8 40V29H28V40M10 27V17H26V27M13 15V7H23V15" fill="#f3e4cc" stroke="#8f3438" strokeWidth="2"/><path d="M3 30L18 25L33 30ZM5 18L18 13L31 18ZM10 8L18 3L26 8Z" fill="#d04f4d" stroke="#243d60" strokeWidth="2"/><path d="M16 40V34H21V40M18 3V0" fill="#263e62" stroke="#d1b775"/></>,
 'italy-rome-colosseum':<><path d="M3 40V14Q18 6 33 14V40Z" fill="#e8d3a8" stroke="#7d5a3a" strokeWidth="2"/><path d="M7 38V31Q9 28 11 31V38M15 38V31Q17 28 19 31V38M23 38V31Q25 28 27 31V38M7 25V20Q9 17 11 20V25M15 25V20Q17 17 19 20V25M23 25V20Q25 17 27 20V25" fill="#7d5a3a"/></>,
 'egypt-giza-desert':<><path d="M2 40L15 12L28 40Z" fill="#e7bf74" stroke="#8a5a2b" strokeWidth="2"/><path d="M18 40L27 22L35 40Z" fill="#d9a85c" stroke="#8a5a2b" strokeWidth="2"/><path d="M9 26H21M6 33H24" stroke="#a87a44"/></>,
 'brazil-amazon-canopy':<><path d="M16 40V22M20 40V22" stroke="#6b4b2f" strokeWidth="3"/><circle cx="11" cy="17" r="8" fill="#3f8f3f"/><circle cx="25" cy="15" r="9" fill="#2f7a37"/><circle cx="18" cy="9" r="7" fill="#4fa046"/><path d="M4 41Q18 36 32 41" stroke="#3aa3b5" strokeWidth="3" fill="none"/></>,
 'canada-rockies-alpine':<><path d="M2 40L13 16L19 26L25 12L34 40Z" fill="#6f8796" stroke="#2e4452" strokeWidth="2"/><path d="M10 22L13 16L16 21L14 23ZM22 18L25 12L28 19L25 21Z" fill="#f2f7fa"/><path d="M4 41H32" stroke="#3fb0c4" strokeWidth="3"/></>,
 'australia-reef-coast':<><path d="M2 32Q9 27 16 32T32 32V41H2Z" fill="#2ab3c6"/><path d="M7 36Q9 28 12 36M18 37Q21 30 23 37" stroke="#f08a6a" strokeWidth="2.4" fill="none"/><path d="M24 26V12M24 13Q17 9 13 14M24 13Q31 9 34 14" stroke="#3b8f3c" strokeWidth="2.5" fill="none"/></>,
 'india-taj-gardens':<><path d="M10 40V24H26V40Z" fill="#f5f0e4" stroke="#8c7a5e" strokeWidth="2"/><path d="M11 24Q11 12 18 9Q25 12 25 24Z" fill="#fbf8f0" stroke="#8c7a5e" strokeWidth="2"/><path d="M18 9V4M5 40V18M31 40V18" stroke="#8c7a5e" strokeWidth="2.4"/></>,
 'south-africa-savanna':<><path d="M17 40V24M17 27L10 19M17 27L25 18" stroke="#5e4630" strokeWidth="3"/><ellipse cx="18" cy="16" rx="15" ry="5" fill="#6d843d"/><path d="M2 41H34" stroke="#cfa957" strokeWidth="3"/></>,
 'norway-lofoten-fjords':<><path d="M13 40L15 12H21L23 40Z" fill="#f1ece4" stroke="#33465a" strokeWidth="2"/><path d="M15 21H21M14.5 30H21.5" stroke="#c4473f" strokeWidth="3"/><path d="M13 12L18 5L23 12Z" fill="#c4473f"/><circle cx="18" cy="9.5" r="1.8" fill="#ffe29a"/></>,
 'france-paris-rooftops':<><path d="M18 2L13 40M18 2L23 40M10 40Q18 28 26 40" stroke="#6c5a44" strokeWidth="2.5" fill="none"/><path d="M14 20H22M12 30H24" stroke="#6c5a44" strokeWidth="2"/></>,
 'usa-new-york-harbor':<><path d="M14 40V30H24V40Z" fill="#9a8f7a"/><path d="M16 30V16Q19 13 22 16V30Z" fill="#7ab8a4" stroke="#3f7d6c" strokeWidth="1.5"/><path d="M21 15L25 5" stroke="#3f7d6c" strokeWidth="2"/><path d="M24 2L27 5L24 7Z" fill="#f3c34d"/><path d="M16 14L19 10L22 14" stroke="#3f7d6c" strokeWidth="1.5" fill="none"/></>,
};
function DestinationIcon({environment}:{environment:string}){return <svg viewBox="0 0 36 44" aria-hidden="true">{destinationIcons[environment]||destinationIcons['japan-mountain-spring']}</svg>;}

function Discovery({country,compact=false}:{country:Country;compact?:boolean}){
 // Place, landscape and photo describe the playable level's destination.
 const fact=discoveryFor(country.code),profile=countryProfile(country.code),destination=guideDestination(country.code);
 return <div className={styles.discovery}><h3>{fact?.title||profile?.landmarkName}</h3><p>{fact?.text||country.description}</p>{!compact&&<><dl className={styles.discoveryFacts}>{country.capital.length>0&&<div><dt>Capital / seat</dt><dd>{country.capital.join(' · ')}</dd></div>}<div><dt>Place</dt><dd>{destination?.place}</dd></div><div><dt>Landscape</dt><dd>{destination?.landscape.join(' · ')}</dd></div>{country.languages.length>0&&<div><dt>Languages</dt><dd>{country.languages.slice(0,3).join(' · ')}</dd></div>}</dl><LandmarkPhoto code={country.code}/></>}<a href={fact?.sourceUrl||profile?.sourceUrl} target="_blank" rel="noreferrer">Explore the source <ArrowRight size={12}/></a></div>;
}
