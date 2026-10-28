'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,BookOpen,Check,Compass,Flag,Globe2,MapPin,Mountain,Play,Search,Settings,Snowflake,Star,Trophy,X} from 'lucide-react';
import {countries,continents,countriesForContinent,countryByCode,type Country,type ContinentId} from '../../lib/world-explorer/catalog';
import {loadExplorerProgress,saveExplorerProgress,recordCountryResult,mergeExplorerProgress,continentProgress,overallProgress,type ExplorerProgress} from '../../lib/world-explorer-progress';
import {loadAccountProgress,saveAccountResult} from '../../lib/world-explorer/progress-client';
import {discoveryFor} from '../../lib/world-explorer-discoveries';
import {countryProfile} from '../../lib/world-explorer/profiles';
import {CountryFlag} from './country-flag';
import {LandmarkPhoto} from './landmark-photo';
import {CountryRun,type RunOutcome} from './country-run';
import {PreferencesControls} from './preferences-panel';
import {defaultExplorerPreferences,loadExplorerPreferences,saveExplorerPreferences,type ExplorerPreferences} from '../../lib/world-explorer/preferences';
import {levelAvailability} from '../../lib/world-explorer/level-manifest';
import styles from './world-explorer.module.css';

const order:ContinentId[]=['north-america','south-america','europe','africa','asia','oceania','antarctica'];
const labels=['Discovery','Adventure','Hard','Expert'];
const featured:Record<ContinentId,string>={'north-america':'USA','south-america':'BRA',europe:'FRA',africa:'EGY',asia:'JPN',oceania:'AUS',antarctica:'ANTARCTICA'};
const introductions:Record<string,string>={
 'north-america':'From northern mountain trails to Central America and the Caribbean.',
 'south-america':'Follow a new route through each of twelve countries.',
 europe:'A journey through forty-three countries, one destination at a time.',
 africa:'Fifty-four countries. Many landscapes. A continent of discoveries.',
 asia:'Explore forty-seven countries across the largest continent.',
 oceania:'Discover fourteen countries across Australia and the Pacific.',
 antarctica:'One icy expedition on the continent with no countries.',
};
const antarctica:Country={code:'ANTARCTICA',iso2:'',name:'Antarctica',officialName:'Antarctica expedition',continent:'antarctica',subregion:'Antarctic region',capital:[],languages:[],currencies:[],lat:-80,lng:0,flag:'❄',biome:'alpine',landmark:'Antarctic ice sheet',description:'Antarctica is a continent devoted to peace and scientific cooperation under the Antarctic Treaty. This expedition is separate from the 193 country levels.',sources:['https://www.ats.aq/e/antarctictreaty.html']};
type AtlasController={select:(id:string|null)=>void;locate?:(lat:number,lng:number)=>void;destroy:()=>void};

function difficultyFor(index:number,total:number):1|2|3|4{
 if(total===1)return 3;
 const portion=index/Math.max(1,total-1);
 return portion>.84?4:portion>.52?3:portion>.18?2:1;
}
function countryList(id:ContinentId){
 if(id==='antarctica')return[antarctica];
 const all=countriesForContinent(id),first=all.find(country=>country.code===featured[id]);
 return first?[first,...all.filter(country=>country.code!==first.code)]:all;
}
function currencyLabel(code:string){try{const name=new Intl.DisplayNames(['en'],{type:'currency'}).of(code);return name&&name!==code?`${name} (${code})`:code;}catch{return code;}}

export default function WorldExplorer(){
 const atlasElement=useRef<HTMLDivElement>(null),atlas=useRef<AtlasController|null>(null);
 const atlasCountry=useRef<Country|null>(null);
 const accountEpoch=useRef(0);
 const latestSave=useRef('');
 const [continent,setContinent]=useState<ContinentId>('asia');
 const [selected,setSelected]=useState<Country|null>(null),[playing,setPlaying]=useState<Country|null>(null);
 const [progress,setProgress]=useState<ExplorerProgress>({version:1,countries:{}});
 const [panel,setPanel]=useState<'journey'|'passport'|'sources'|'settings'|'achievements'|null>(null),[query,setQuery]=useState('');
 const [atlasError,setAtlasError]=useState(''),[storageWarning,setStorageWarning]=useState('');
 const [challenge,setChallenge]=useState(false),[replay,setReplay]=useState(0);
 const [preferences,setPreferences]=useState<ExplorerPreferences>(defaultExplorerPreferences),[storageChannel,setStorageChannel]=useState<'account'|'device'>('device'),[saveMessage,setSaveMessage]=useState('Progress stays on this device');
 const [liveStatus,setLiveStatus]=useState<'idle'|'loading'|'available'|'bundled'>('idle');
 const [liveFacts,setLiveFacts]=useState<{capital:string;sourceUrl:string;retrievedAt:string}|null>(null);
 const [countryApi,setCountryApi]=useState<{capital:string;sourceUrl:string;retrievedAt:string}|null>(null);
 const choose=useCallback((id:string)=>{if(order.includes(id as ContinentId)){const region=id as ContinentId;setContinent(region);setSelected(countryList(region).find(c=>c.code===featured[region])||countryList(region)[0]);setQuery('');setPanel('journey');}},[]);
 useEffect(()=>{
  let current=true;
  setPreferences(loadExplorerPreferences());
  const hydrate=()=>{
   const request=++accountEpoch.current,local=loadExplorerProgress();setProgress(local);setStorageChannel('device');
   void loadAccountProgress(local).then(result=>{if(current&&request===accountEpoch.current){setProgress(previous=>mergeExplorerProgress(previous,result.progress));setStorageChannel(result.storage);setSaveMessage(result.message||(result.storage==='account'?'Passport connected to your SocialU account':'Progress stays on this device'));}});
  };
  const sessionChanged=()=>{setPlaying(null);hydrate();};hydrate();window.addEventListener('socialu-session-changed',sessionChanged);
  const params=new URLSearchParams(window.location.search),code=params.get('country')?.toUpperCase();
  const destination=code==='ANTARCTICA'?antarctica:countryByCode(code);
  if(destination){setContinent(destination.continent);setSelected(destination);if(params.get('play')==='1')setPlaying(destination);else setPanel('journey');}else setSelected(countryByCode('JPN')||null);
  return()=>{current=false;window.removeEventListener('socialu-session-changed',sessionChanged);};
 },[]);
 useEffect(()=>{
  if(!atlasElement.current||playing)return;
  let disposed=false,controller:AtlasController|undefined;
  import('./atlas-scene').then(({mountAtlas})=>{
   if(disposed||!atlasElement.current)return;
   controller=mountAtlas(atlasElement.current,choose);atlas.current=controller;controller.select(atlasCountry.current?.continent||continent);if(atlasCountry.current)controller.locate?.(atlasCountry.current.lat,atlasCountry.current.lng);setAtlasError('');
  }).catch(()=>{if(!disposed)setAtlasError('The 3D atlas could not open. You can still choose a continent below.');});
  return()=>{disposed=true;controller?.destroy();atlas.current=null;};
 // Atlas remounts only when returning from play, not every selection.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[!!playing,choose]);
 useEffect(()=>{atlas.current?.select(continent);},[continent]);
 useEffect(()=>{
  setLiveFacts(null);
  setCountryApi(null);
  if(!selected||selected.code==='ANTARCTICA'){setLiveStatus('idle');return;}
  const abort=new AbortController();setLiveStatus('loading');
  void fetch('/api/world-explorer/countries/'+selected.code,{signal:abort.signal}).then(r=>r.ok?r.json():null).then(data=>{if(!abort.signal.aborted){setLiveStatus(data?.source==='world-bank'?'available':'bundled');if(data?.live&&typeof data.live.capital==='string'&&typeof data.live.retrievedAt==='string'&&typeof data.live.sourceUrl==='string'&&data.live.sourceUrl.startsWith('https://api.worldbank.org/'))setLiveFacts(data.live);if(data?.countryApi&&typeof data.countryApi.capital==='string'&&typeof data.countryApi.retrievedAt==='string'&&typeof data.countryApi.sourceUrl==='string'&&data.countryApi.sourceUrl.startsWith('https://countries.dev/'))setCountryApi(data.countryApi);}}).catch(()=>{if(!abort.signal.aborted)setLiveStatus('bundled');});
  return()=>abort.abort();
 },[selected?.code]);
 const list=countryList(continent),active=selected&&selected.continent===continent?selected:list.find(c=>c.code===featured[continent])||list[0];
 atlasCountry.current=active;
 const current=continents.find(c=>c.id===continent)!,done=continentProgress(progress,continent),overall=overallProgress(progress);
 const index=active?list.findIndex(c=>c.code===active.code):0;
 const difficulty=challenge?4:difficultyFor(index,list.length);
 const activeLevel=active?levelAvailability(active.code):undefined;
 const totalStars=Object.values(progress.countries).reduce((sum,item)=>sum+item.starsEarned,0),totalCoins=Object.values(progress.countries).reduce((sum,item)=>sum+item.bestCoins,0),totalDiscoveries=Object.values(progress.countries).reduce((sum,item)=>sum+item.discoveredFactIds.length,0);
 const filtered=list.filter(c=>(c.name+' '+c.code).toLocaleLowerCase().includes(query.toLocaleLowerCase()));
 useEffect(()=>{if(active)atlas.current?.locate?.(active.lat,active.lng);},[active?.code]);
 useEffect(()=>{if(playing||!panel)return;const close=(event:KeyboardEvent)=>{if(event.code==='Escape')setPanel(null);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[playing,panel]);
 useEffect(()=>{
  if(playing||!panel||panel==='journey')return;const dialog=document.querySelector<HTMLElement>('[data-explorer-modal]'),previous=document.activeElement as HTMLElement|null;if(!dialog)return;
  dialog.querySelector<HTMLElement>('button,a,input,select')?.focus();
  const trap=(event:KeyboardEvent)=>{if(event.key!=='Tab')return;const controls=Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select')),first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}};
  window.addEventListener('keydown',trap);return()=>{window.removeEventListener('keydown',trap);if(previous?.isConnected)previous.focus();};
 },[playing,panel]);
 function saveResult(country:Country,completed:boolean,coins:number,result:RunOutcome,runId:string){
  const outcome={completed,coins,...result},epoch=accountEpoch.current;
  latestSave.current=runId;setSaveMessage('Saving your passport…');let deviceSaved=true;
  setProgress(previous=>{const next=recordCountryResult(previous,country.code,outcome);deviceSaved=saveExplorerProgress(next);if(!deviceSaved)setStorageWarning('Progress could not be stored on this device. Keep this page open to retain this session.');return next;});
  void saveAccountResult(country.code,outcome,runId).then(saved=>{if(epoch===accountEpoch.current&&latestSave.current===runId){setStorageChannel(saved.storage);setSaveMessage(saved.storage==='account'?'Passport saved to your SocialU account':deviceSaved?(saved.message||'Result saved on this device'):'Progress is available in this session. This browser could not save it.');}});
 }
 function updatePreferences(value:ExplorerPreferences){setPreferences(value);if(!saveExplorerPreferences(value))setStorageWarning('Settings apply for this session. This browser could not store them.');}
 function launch(country:Country){setSelected(country);setPlaying(country);setPanel(null);}
 function nextCountry(){
  if(!playing)return;
  const route=countryList(playing.continent),i=route.findIndex(c=>c.code===playing.code),next=route[i+1];
  if(next)setSelected(next);setPlaying(null);setPanel('journey');
 }
 return <main className={styles.explorer}>
  {!playing&&<div className={styles.atlas} ref={atlasElement} aria-label="Interactive 3D world map"/>}
  {!playing&&<div className={styles.vignette}/>}
  <header className={styles.header}>
   <Link href="/game-room" className={styles.back}><ArrowLeft size={17}/><span>Game Room</span></Link>
   <div className={styles.brand}><span><Globe2 size={28}/> World Explorer</span><p>LEARN THROUGH ADVENTURE</p></div>
   <nav aria-label="Explorer tools"><button onClick={()=>setPanel(panel==='passport'?null:'passport')} disabled={!!playing}><BookOpen size={20}/><span>Passport</span></button><button onClick={()=>setPanel(panel==='achievements'?null:'achievements')} disabled={!!playing}><Trophy size={20}/><span>Milestones</span></button><button onClick={()=>setPanel(panel==='settings'?null:'settings')} disabled={!!playing}><Settings size={20}/><span>Settings</span></button><button onClick={()=>setPanel(panel==='sources'?null:'sources')} disabled={!!playing}><Compass size={20}/><span>Field guide</span></button></nav>
  </header>
  {playing?<CountryRun key={playing.code+'-'+replay} country={playing} preferences={preferences} saveStatus={saveMessage} onPreferences={updatePreferences} difficulty={challenge?4:difficultyFor(countryList(playing.continent).findIndex(c=>c.code===playing.code),countryList(playing.continent).length)} onExit={()=>{setPlaying(null);setPanel('journey');}} onResult={(completed,coins,result,runId)=>saveResult(playing,completed,coins,result,runId)} onRetry={()=>setReplay(v=>v+1)} onNext={nextCountry}/>:<>
   <section className={styles.intro} aria-label="World Explorer introduction"><p className={styles.eyebrow}>JUMPYLAND · WORLD EXPLORER</p><h1>A world of<br/>discovery.</h1><p>Begin in Japan’s spring mountains.<br/>A real 3D adventure, one country at a time.</p><button className={styles.playButton} onClick={()=>launch(countryByCode('JPN')!)}><Play size={17}/>Play Japan prototype<ArrowRight size={17}/></button><span className={styles.edition}><span/> 193 country profiles · Japan prototype · country previews</span></section>
   <div className={styles.mapHint}><MapPin size={15}/> Choose a continent on the map</div>
   {atlasError&&<p role="alert" className={styles.atlasError}>{atlasError}</p>}
   <section className={styles.travelDeck} aria-label="Choose a continent">
    <div className={styles.deckTitle}><span className={styles.eyebrow}>THE ADVENTURE ATLAS</span><h2>Choose your continent</h2><p>{overall.completed} of 193 countries discovered</p></div>
    <div className={styles.continents}>{order.map(id=>{const item=continents.find(c=>c.id===id)!,p=continentProgress(progress,id);return <button key={id} onClick={()=>choose(id)} aria-pressed={continent===id} className={continent===id?styles.selectedContinent:undefined} style={{'--continent-color':item.color} as React.CSSProperties}><span className={styles.continentIllustration} data-continent={id}>{id==='antarctica'?<Snowflake/>:id==='europe'?<Flag/>:id==='africa'?<Compass/>:<Mountain/>}<span className={styles.miniSun}/></span><strong>{item.name}</strong><small>{id==='antarctica'?'1 expedition':item.count+' countries'}</small><span className={styles.miniProgress}><i style={{width:((p.completed/Math.max(1,p.total))*100)+'%'}}/></span></button>;})}</div>
    <button className={styles.startButton} onClick={()=>{setSelected(active);setPanel('journey');}}>Start journey <ArrowRight size={20}/></button>
   </section>
   <footer className={styles.mapFooter}><span>Made with Natural Earth · UN member-state scope</span><button onClick={()=>setPanel('sources')}>Geography and sources</button><span>{storageChannel==='account'?'SocialU account passport':'Device passport'}</span></footer>
  </>}
  {!playing&&panel==='journey'&&<aside className={styles.journeyPanel} aria-labelledby="journey-heading">
   <button className={styles.closePanel} onClick={()=>setPanel(null)} aria-label="Close country selection"><X size={20}/></button>
   <p className={styles.eyebrow}>CHOOSE YOUR NEXT DESTINATION</p><h2 id="journey-heading">{current.name}</h2><p className={styles.journeyIntro}>{introductions[continent]}</p>
   <div className={styles.routeProgress}><span>{done.completed} / {done.total} {continent==='antarctica'?'expedition':'countries'}</span><progress value={done.completed} max={done.total||1}/></div>
   <label className={styles.search}><Search size={17}/><input type="search" placeholder="Find a country…" aria-label="Find a country" value={query} onChange={e=>setQuery(e.target.value)}/></label>
   <div className={styles.countryList} aria-label={current.name+' levels'}>{filtered.map(country=>{const n=list.findIndex(c=>c.code===country.code),complete=progress.countries[country.code]?.completed,availability=levelAvailability(country.code);return <button key={country.code} className={active?.code===country.code?styles.selectedCountry:undefined} onClick={()=>setSelected(country)} aria-pressed={active?.code===country.code}><span className={styles.levelNumber}>{complete?<Check size={16}/>:String(n+1).padStart(2,'0')}</span><span><strong>{country.name}</strong><small>{availability?.stage==='prototype'?'1 playable prototype':'Environment preview'} · {labels[difficultyFor(n,list.length)-1]}</small></span><span className={styles.countryCode}><CountryFlag iso2={country.iso2} name={country.name} size={23}/></span></button>;})}{!filtered.length&&<p>No countries match your search.</p>}</div>
   {active&&<section className={styles.countryDetail} aria-label="Selected destination"><div className={styles.countryHeading}><CountryFlag iso2={active.iso2} name={active.name} size={40}/><div><h3>{active.name}</h3><p>{activeLevel?.title||active.subregion} · {labels[difficulty-1]}</p><small className={styles.prototypeBadge}>{activeLevel?.stage==='prototype'?'PLAYABLE PROTOTYPE · VISUAL REVIEW PENDING':'DEVELOPMENT PREVIEW'}</small></div></div>
    <p className={styles.developmentNote}>{activeLevel?.stage==='prototype'?'Follow the cherry blossom trail, collect three stars and discover Mount Fuji. This prototype is still awaiting browser and device review.':'Explore this country’s sourced scenery concept. Its final level design, visual review and device testing remain in development.'}</p>
    <p>{active.description}</p>
    {continent!=='antarctica'&&<dl><div><dt>Capital / seat</dt><dd>{active.capital.join(' · ')||'No official capital listed'}</dd></div><div><dt>Languages</dt><dd>{active.languages.slice(0,4).join(' · ')||'See country sources'}</dd></div><div><dt>Currency</dt><dd>{active.currencies.map(currencyLabel).join(' · ')||'See country sources'}</dd></div></dl>}
    {countryProfile(active.code)&&<p className={styles.landmarkNote}><MapPin size={12}/> {countryProfile(active.code)?.landmarkName}</p>}
    <p>{countryProfile(active.code)?.features.join(' · ')}</p>
    <details className={styles.sourceDetail}><summary>Country sources{liveStatus==='available'?' · World Bank refreshed':''}</summary><a href={countryProfile(active.code)?.sourceUrl||active.sources[0]} target="_blank" rel="noreferrer">View source for this destination</a>{liveFacts&&<p>World Bank lists {liveFacts.capital||'no capital in its record'}. Retrieved {new Date(liveFacts.retrievedAt).toLocaleDateString('en-US',{timeZone:'UTC'})}. This is the provider’s administrative listing; the country snapshot retains multi-capital notes. <a href={liveFacts.sourceUrl} target="_blank" rel="noreferrer">API record</a></p>}{countryApi&&<p>countries.dev lists {countryApi.capital||'no capital in its record'}. Retrieved {new Date(countryApi.retrievedAt).toLocaleDateString('en-US',{timeZone:'UTC'})}. <a href={countryApi.sourceUrl} target="_blank" rel="noreferrer">Country API record</a></p>}</details>
    <LandmarkPhoto key={active.code} code={active.code}/>
    <label className={styles.challenge}><input type="checkbox" checked={challenge} onChange={e=>setChallenge(e.target.checked)}/><span><strong>Expert challenge</strong><small>A tougher route with tighter jumps</small></span><Trophy size={18}/></label>
    <button className={styles.playButton} onClick={()=>launch(active)}><Play size={17} fill="currentColor"/> {activeLevel?.stage==='prototype'?(progress.countries[active.code]?.completed?'Replay Japan prototype':'Play Japan prototype'):'Explore environment preview'} <ArrowRight size={19}/></button>
    <small className={styles.factStatus}>{continent==='antarctica'?'Antarctic Treaty reference':liveStatus==='loading'?'Checking optional country metadata…':liveStatus==='available'?'World Bank metadata available · sourced country snapshot':'Bundled country facts · external services are optional'}</small>
   </section>}
  </aside>}
  {!playing&&(panel==='passport'||panel==='sources')&&<div className={styles.modalBackdrop}><section className={styles.modal} data-explorer-modal role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className={styles.closePanel} onClick={()=>setPanel(null)} aria-label="Close dialog"><X/></button>{panel==='passport'?<><p className={styles.eyebrow}>YOUR TRAVEL JOURNAL</p><h2 id="modal-title">Explorer passport</h2><p>Record discoveries and stamps from your prototype adventures.</p><div className={styles.passportCount}><strong>{overall.completed}</strong><span>of 193 country stamps</span></div><div className={styles.passportSummary}><span><strong>{totalStars}</strong>Stars earned</span><span><strong>{totalCoins}</strong>Best coins</span><span><strong>{totalDiscoveries}</strong>Discoveries</span></div><p role="status" className={styles.muted}>{saveMessage}</p><div className={styles.stamps}>{countries.filter(c=>progress.countries[c.code]?.completed).map(c=><span key={c.code}><Check size={16}/>{c.name}<small>{progress.countries[c.code]?.starsEarned||0} ?</small></span>)}{!overall.completed&&<p>Your first discovery is waiting. Choose a continent to begin.</p>}</div><p>{progress.countries.ANTARCTICA?.completed?'✓ Antarctica expedition completed':'Antarctica expedition: not completed yet'}</p><p className={styles.muted}>Prototype journal. Each country?s release readiness is shown separately.</p></>:<><p className={styles.eyebrow}>A LITTLE CONTEXT FOR YOUR JOURNEY</p><h2 id="modal-title">The explorer’s field guide</h2><p>Browse 193 UN member-country profiles and a separate Antarctica expedition. Japan is the first authored playable prototype; other destinations remain environment previews. Visual approval and real-device performance review are required before a level is marked release-ready.</p><h3>How the continents are grouped</h3><p>Country groups follow UN M49. Northern America, Central America and the Caribbean form North America here. Russia is grouped with Europe; Cyprus, Türkiye and the Caucasus countries follow the UN’s Asia grouping. Antarctica is a continent, not a country.</p><h3>Landscapes and difficulty</h3><p>Each level uses a representative landscape, not a claim that an entire country shares one climate. Routes are game designs. Discovery through Expert difficulty reflects progression, not real-world travel safety.</p><h3>Free data and attribution</h3><ul><li><a href="https://www.un.org/en/about-us/member-states" target="_blank" rel="noreferrer">United Nations membership</a> and <a href="https://unstats.un.org/unsd/methodology/m49/" target="_blank" rel="noreferrer">M49 regions</a></li><li><a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noreferrer">Natural Earth</a> public-domain map geometry</li><li><a href="https://github.com/mledoze/countries" target="_blank" rel="noreferrer">Open country facts</a> and optional <a href="https://datahelpdesk.worldbank.org/knowledgebase/articles/889392" target="_blank" rel="noreferrer">World Bank API</a> metadata, without an API key</li><li><a href="https://countries.dev/" target="_blank" rel="noreferrer">countries.dev</a> optional country metadata; national flags from <a href="https://github.com/lipis/flag-icons" target="_blank" rel="noreferrer">flag-icons</a> (MIT)</li><li><a href="https://data.unesco.org/explore/dataset/whc001/" target="_blank" rel="noreferrer">UNESCO heritage metadata</a> (CC BY-SA 4.0), supplemented with linked official place sources</li><li>Optional photographs from <a href="https://commons.wikimedia.org/wiki/Commons:API" target="_blank" rel="noreferrer">Wikimedia Commons</a>; each photo retains its own author, licence and file-page link</li><li><a href="https://www.ats.aq/e/antarctictreaty.html" target="_blank" rel="noreferrer">Antarctic Treaty</a> expedition context</li></ul><p className={styles.muted}>Snapshot checked October 27, 2026. Boundaries are a general map presentation; this is not a legal boundary reference.</p></>}</section></div>}
  {!playing&&(panel==='settings'||panel==='achievements')&&<div className={styles.modalBackdrop}><section className={styles.modal} data-explorer-modal role="dialog" aria-modal="true" aria-labelledby="preferences-title"><button className={styles.closePanel} onClick={()=>setPanel(null)} aria-label="Close dialog"><X/></button>{panel==='settings'?<><p className={styles.eyebrow}>MAKE THE ADVENTURE YOURS</p><h2 id="preferences-title">Adventure settings</h2><p>Audio starts after your first movement or tap. Your settings stay on this device.</p><PreferencesControls value={preferences} onChange={updatePreferences}/></>:<><p className={styles.eyebrow}>SMALL STEPS, GREAT DISCOVERIES</p><h2 id="preferences-title">Explorer milestones</h2><p>Milestones reflect the results in your current passport.</p><div className={styles.milestones}>{[
   {title:'First journey',description:'Complete your first route.',earned:overall.completed>0,icon:<Flag/>},
   {title:'Japan star seeker',description:'Find all three stars on the Japan trail.',earned:(progress.countries.JPN?.starsEarned||0)>=3,icon:<Star/>},
   {title:'A curious explorer',description:'Activate an in-level discovery point.',earned:totalDiscoveries>0,icon:<BookOpen/>},
   {title:'Across continents',description:'Complete a route in three populated continents.',earned:order.filter(id=>id!=='antarctica'&&continentProgress(progress,id).completed>0).length>=3,icon:<Globe2/>}
  ].map(item=><div key={item.title}>{item.earned?<Check/>:item.icon}<span><strong>{item.title}</strong><small>{item.earned?'Unlocked · ':''}{item.description}</small></span></div>)}</div></>}</section></div>}
  {storageWarning&&<p role="alert" className={styles.storageWarning}>{storageWarning}<button onClick={()=>setStorageWarning('')} aria-label="Dismiss storage message"><X size={14}/></button></p>}
 </main>;
}
