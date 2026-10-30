'use client';
import {useEffect,useRef,useState,type PointerEvent} from 'react';
import {ArrowUpRight,Check,Code2,ImagePlus,Move,Music2,Pencil,Plus,RotateCw,Save,StickyNote,Trash2,X} from 'lucide-react';
import type {StudentProfile} from '../../lib/profile';
import {boardInput,MAX_BOARD_ITEMS,type BoardItem,type ProfileBoard as Board} from '../../lib/profile-board';
import type {ProfileLook} from '../../lib/profile-space';
import type {ProfileMemory} from '../../lib/profile-memories';
import {findStickers} from '../../lib/profile-stickers';
import {spotifyMusic} from '../../lib/profile-personality';
import {profileFetch} from './profile-view';
import {StickerArt} from './profile-cover';
import {MemoryEditor} from './profile-memories';
import {SpotifyPlayer} from './profile-about-details';
import {handwriting} from './handwriting';
import styles from './profile-board.module.css';
const EMPTY:Board={items:[]};
function safeBoard(value:unknown){try{return value?boardInput(value):EMPTY;}catch{return EMPTY;}}

export function ProfileBoard({profile,look,status,onSaved,onDirtyChange}:{profile:StudentProfile;look:ProfileLook;status:string;onSaved:(look:ProfileLook)=>void;onDirtyChange?:(dirty:boolean)=>void}){
 const saved=safeBoard(look.board);
 const [board,setBoard]=useState<Board>(saved),[editing,setEditing]=useState(false),[selected,setSelected]=useState<string|null>(null);
 const [memories,setMemories]=useState<ProfileMemory[]>([]),[photosReady,setPhotosReady]=useState(false),[uploading,setUploading]=useState(false);
 const [saving,setSaving]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[search,setSearch]=useState('');
 const canvas=useRef<HTMLDivElement>(null),dirtyRef=useRef(false);
 const drag=useRef<{id:string;startX:number;startY:number;x:number;y:number}|null>(null);
 const dirty=JSON.stringify(board)!==JSON.stringify(saved);dirtyRef.current=editing&&dirty&&!saving;
 useEffect(()=>{onDirtyChange?.(editing&&dirty);},[editing,dirty,onDirtyChange]);
 useEffect(()=>()=>onDirtyChange?.(false),[onDirtyChange]);
 useEffect(()=>{if(!editing)setBoard(safeBoard(look.board));},[look.board,editing]);
 useEffect(()=>{let active=true;profileFetch(`/api/profiles/memories?username=${encodeURIComponent(profile.username)}`).then(({response,data})=>{
  if(!response.ok)throw new Error(data.error||'Your photos could not load.');if(active){setMemories(data.memories);setPhotosReady(data.available);}
 }).catch(reason=>{if(active)setError(reason.message);});return()=>{active=false;};},[profile.username]);
 useEffect(()=>{
  const unload=(event:BeforeUnloadEvent)=>{if(dirtyRef.current){event.preventDefault();event.returnValue='';}};
  const link=(event:MouseEvent)=>{if(!dirtyRef.current||event.defaultPrevented||event.button!==0)return;const target=(event.target as Element)?.closest?.('a[href]') as HTMLAnchorElement|null;if(target&&target.target!=='_blank'&&!window.confirm('Leave without saving your board?')){event.preventDefault();event.stopPropagation();}};
  window.addEventListener('beforeunload',unload);document.addEventListener('click',link,true);return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',link,true);};
 },[]);
 const item=board.items.find(value=>value.id===selected);
 function patch(values:Partial<BoardItem>){setBoard(current=>({items:current.items.map(value=>value.id===selected?{...value,...values}:value)}));setMessage('');}
 function add(kind:BoardItem['kind'],values:Partial<BoardItem>={}){
  if(board.items.length>=MAX_BOARD_ITEMS){setError('Use up to 20 items. Remove one to add another.');return;}
  const next:BoardItem={id:crypto.randomUUID(),kind,x:32,y:25,width:kind==='sticker'?14:28,rotation:0,...values};
  setBoard(current=>({items:[...current.items,next]}));setSelected(next.id);setMessage('');
 }
 function startDrag(event:PointerEvent<HTMLDivElement>,value:BoardItem){if(!editing||saving)return;event.preventDefault();setSelected(value.id);event.currentTarget.focus();event.currentTarget.setPointerCapture(event.pointerId);drag.current={id:value.id,startX:event.clientX,startY:event.clientY,x:value.x,y:value.y};}
 function moveDrag(event:PointerEvent<HTMLDivElement>){const point=drag.current,rect=canvas.current?.getBoundingClientRect();if(!point||!rect)return;setBoard(current=>({items:current.items.map(value=>value.id===point.id?{...value,x:Math.max(0,Math.min(100-value.width,point.x+(event.clientX-point.startX)/rect.width*100)),y:Math.max(0,Math.min(68,point.y+(event.clientY-point.startY)/rect.height*100))}:value)}));}
 async function save(){
  if(saving)return;setSaving(true);setError('');setMessage('');
  const controller=new AbortController(),timeout=window.setTimeout(()=>controller.abort(),25000);
  try{const validated=boardInput(board);const {response,data}=await profileFetch('/api/profiles/space',{method:'PATCH',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({field:'board',value:validated})});if(!response.ok)throw new Error(data.error||'Your board could not be saved.');onSaved(data.look);setBoard(data.look.board);dirtyRef.current=false;setEditing(false);setSelected(null);setMessage('Your board is saved. Classmates can see it on your profile.');}
  catch(reason){setError(controller.signal.aborted?'Saving timed out. Your board changes are still here; try again.':reason instanceof Error?reason.message:'Please try again.');}finally{window.clearTimeout(timeout);setSaving(false);}
 }
 function cancel(){if(dirty&&!window.confirm('Discard your unsaved board changes?'))return;setBoard(saved);setEditing(false);setSelected(null);setError('');}
 function starter(){
  const first:BoardItem[]=[{id:crypto.randomUUID(),kind:'note',text:'One step at a time ♡',color:'pink',x:36,y:5,width:25,rotation:-3},{id:crypto.randomUUID(),kind:'sticker',sticker:'star',x:66,y:6,width:12,rotation:8},{id:crypto.randomUUID(),kind:'sticker',sticker:'books',x:69,y:59,width:20,rotation:-4},{id:crypto.randomUUID(),kind:'sticker',sticker:'leaf',x:4,y:54,width:10,rotation:-8}];
  memories.slice(0,3).forEach((photo,index)=>first.push({id:crypto.randomUUID(),kind:'photo',memoryId:photo.id,x:[4,69,35][index],y:[5,25,41][index],width:27,rotation:[-5,4,-2][index]}));setBoard({items:first});
 }
 return <section className={styles.section} aria-labelledby="my-board-title">
  <header className={styles.heading}><div><p>YOUR OWN LITTLE CORNER</p><h2 id="my-board-title">{profile.is_own?'My board':`${profile.name.split(' ')[0]}’s board`}</h2><span>Photos, thoughts and a few favorite things.</span></div>{profile.is_own&&(editing?<div className={styles.actions}><button disabled={saving} onClick={cancel}><X size={16}/>Cancel</button><button className={styles.primary} disabled={saving||!dirty} onClick={save}><Save size={16}/>{saving?'Saving…':'Save board'}</button></div>:<button disabled={status!=='ready'} onClick={()=>{setEditing(true);setMessage('');}}><Pencil size={16}/>Edit board</button>)}</header>
  {message&&<p className={styles.success} role="status"><Check size={16}/>{message}</p>}{error&&<p className={styles.error} role="alert">{error}</p>}
  {status!=='ready'&&profile.is_own&&<p className={styles.hint}>{status==='loading'?'Loading your board…':'Board saving is unavailable. Reload your profile to try again.'}</p>}
  <div className={styles.workspace} data-editing={editing}>
   {editing&&<aside className={styles.editor} aria-label="Board tools"><h3>Add to your board</h3><div className={styles.addTools}><button disabled={saving} onClick={()=>add('note',{text:'Write something here',color:'pink'})}><StickyNote size={17}/>Note</button><button disabled={saving||!photosReady||memories.length>=6} onClick={()=>setUploading(true)}><ImagePlus size={17}/>Upload photo</button><button disabled={saving} onClick={()=>add('project',{title:'My project',text:'What are you working on?'})}><Code2 size={17}/>Project</button><button disabled={saving} onClick={()=>add('music',{url:'',title:''})}><Music2 size={17}/>Music</button></div>
    {!board.items.length&&<button disabled={saving} onClick={starter}>Start with a layout</button>}
    {!!memories.length&&<><h3>Your photos</h3><div className={styles.photoShelf}>{memories.map(photo=><button key={photo.id} disabled={saving} aria-label={`Add ${photo.caption||'saved photo'}`} onClick={()=>add('photo',{memoryId:photo.id})}>{photo.url?<img src={photo.url} alt={photo.caption||'Saved photo'}/>:<ImagePlus size={20}/>}</button>)}</div></>}
    <h3>Stickers</h3><input aria-label="Find board stickers" placeholder="Search stickers" value={search} onChange={event=>setSearch(event.target.value)}/><div className={styles.stickerShelf}>{findStickers('all',search).map(sticker=><button key={sticker.kind} disabled={saving} title={sticker.label} aria-label={`Add ${sticker.label} sticker`} onClick={()=>add('sticker',{sticker:sticker.kind})}><StickerArt kind={sticker.kind}/></button>)}</div>
    {item&&<fieldset disabled={saving} className={styles.fields}><legend>Selected {item.kind}</legend>{item.kind==='project'&&<label>Project title<input value={item.title??''} maxLength={60} onChange={event=>patch({title:event.target.value})}/></label>}{(item.kind==='note'||item.kind==='project')&&<label>{item.kind==='note'?'Your note':'Description'}<textarea value={item.text??''} maxLength={item.kind==='note'?160:180} onChange={event=>patch({text:event.target.value})}/></label>}{(item.kind==='music'||item.kind==='project')&&<label>{item.kind==='music'?'Spotify link':'Project link (optional)'}<input type="url" value={item.url??''} placeholder="https://…" onChange={event=>patch({url:event.target.value})}/></label>}{item.kind==='note'&&<label>Paper color<select value={item.color??'cream'} onChange={event=>patch({color:event.target.value as BoardItem['color']})}><option value="cream">Cream</option><option value="pink">Pink</option><option value="sage">Sage</option></select></label>}<label>Size<input type="range" min={10} max={44} value={item.width} onChange={event=>patch({width:Number(event.target.value),x:Math.min(item.x,100-Number(event.target.value))})}/></label><div className={styles.actions}><button type="button" onClick={()=>patch({rotation:item.rotation>=15?-15:item.rotation+3})}><RotateCw size={15}/>Rotate</button><button type="button" onClick={()=>{setBoard(current=>({items:current.items.filter(value=>value.id!==selected)}));setSelected(null);}}><Trash2 size={15}/>Remove</button></div></fieldset>}
    <p className={styles.hint}>Drag items to move them. Select an item and use arrow keys for small adjustments. Uploaded photos stay in your pinned memories; Save board publishes their positions.</p>
   </aside>}
   <div className={styles.viewport}><div ref={canvas} className={styles.canvas} aria-label="Scrapbook board">
    {!board.items.length&&<div className={styles.empty}><span className={styles.emptySticker}><StickerArt kind="flower"/></span><h3>A little space to make your own.</h3><p>{profile.is_own?'Pin a memory, leave yourself a note, or add a favorite song.':'No board items yet.'}</p>{profile.is_own&&!editing&&<button disabled={status!=='ready'} onClick={()=>setEditing(true)}><Plus size={16}/>Make my board</button>}</div>}
    {board.items.map(value=><div key={value.id} role={editing?'button':undefined} tabIndex={editing?0:undefined} aria-label={editing?`Move ${value.kind}; use arrow keys`:undefined} aria-pressed={editing?selected===value.id:undefined} className={`${styles.item} ${styles[value.kind]} ${editing&&selected===value.id?styles.selected:''}`} data-color={value.color??'cream'} style={{left:`${value.x}%`,top:`${value.y}%`,width:`${value.width}%`,transform:`rotate(${value.rotation}deg)`}} onPointerDown={event=>startDrag(event,value)} onPointerMove={moveDrag} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onKeyDown={event=>{if(!editing||saving)return;if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelected(value.id);return;}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();setSelected(value.id);setBoard(current=>({items:current.items.map(old=>old.id!==value.id?old:{...old,x:Math.max(0,Math.min(100-old.width,old.x+(event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0))),y:Math.max(0,Math.min(68,old.y+(event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0)))})}));}}}>
     <BoardContent item={value} memories={memories} editing={editing}/>
    </div>)}
   </div></div>
  </div>
  <p className={styles.hint}><Move size={14}/> {editing?'Changes stay in this editor until you save.':'On a small screen, swipe across the board to explore.'}</p>
  {uploading&&<MemoryEditor onClose={()=>setUploading(false)} onSaved={photos=>{const added=photos.find(photo=>!memories.some(old=>old.id===photo.id));setMemories(photos);setUploading(false);if(added)add('photo',{memoryId:added.id});}}/>}
 </section>;
}
function BoardContent({item,memories,editing}:{item:BoardItem;memories:ProfileMemory[];editing:boolean}){
 if(item.kind==='sticker')return <StickerArt kind={item.sticker!}/>;
 if(item.kind==='photo'){const photo=memories.find(value=>value.id===item.memoryId);return <><span className={styles.tape}/>{photo?.url?<img draggable={false} src={photo.url} alt={photo.caption||'Pinned memory'}/>:<div className={styles.photoMissing}>Photo unavailable</div>}<p className={handwriting.className}>{photo?.caption||'A moment to keep'}</p></>;}
 if(item.kind==='note')return <><span className={styles.tape}/><p className={handwriting.className}>{item.text}</p></>;
 if(item.kind==='project')return <><div className={styles.projectLabel}><Code2 size={17}/>Featured project</div><div className={styles.projectBody}><h3>{item.title||'My project'}</h3><p>{item.text}</p>{item.url&&!editing&&<a href={item.url} target="_blank" rel="noopener noreferrer">View project<ArrowUpRight size={17}/></a>}</div></>;
 const music=spotifyMusic(item.url??'');if(music&&!editing)return <SpotifyPlayer url={music.url}/>;return <><div className={styles.musicLabel}><Music2 size={16}/>On repeat</div>{music?<a href={music.url} target="_blank" rel="noopener noreferrer" tabIndex={editing?-1:0}>Listen on Spotify <ArrowUpRight size={17}/></a>:<p>Paste a Spotify link in the editor.</p>}</>;
}
