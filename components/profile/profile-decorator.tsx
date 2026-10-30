'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent, type DragEvent } from 'react';
import { ArrowLeft, BringToFront, Check, Frame, LockKeyhole, Minus, Move, Palette, Plus, Redo2, RotateCw, Trash2, Undo2, MessageCircle, Grip, Leaf, Smile, Search } from 'lucide-react';
import type { StudentProfile } from '../../lib/profile';
import type { FeedPost } from '../feed/types';
import { SPACE_COVERS, SPACE_PALETTES, STICKER_SCALE, STICKER_SHELF, type ProfileLook, type SpaceSticker, type SpaceStickerKind } from '../../lib/profile-space';
import { DECORATION_AREAS, CARD_FINISHES, areaStickers, withAreaStickers, stickerPosition, positionedSticker, type DecorationArea } from '../../lib/profile-space';
import { PROFILE_THEMES, applyProfileTheme } from '../../lib/profile-themes';
import { ProfileThemeArtwork } from './profile-theme-artwork';
import { countryByCode,countryFlag } from '../../lib/profile-countries';
import { FRAME_OPTIONS, FRAME_COLLECTIONS, framesInCollection, type FrameCollection } from '../../lib/profile-frames';
import { STICKER_CATEGORIES, findStickers, type StickerCategory } from '../../lib/profile-stickers';
import { Avatar, PostGrid, profileFetch, useProfileGate } from './profile-view';
import { ProfileBoard } from './profile-board';
import { ProfileContentTabs, type ProfileCategory } from './profile-content-tabs';
import { clearProfileLookDraft, readProfileLookDraft, sameProfileLook, saveProfileLook, writeProfileLookDraft } from '../../lib/profile-look-save';
import { SessionNotice } from '../navigation/section-page';
import { ConfirmDialog } from '../friends/confirm-dialog';
import { CoverArtwork, ProfileStickerLayer, StickerArt, STICKER_LABELS } from './profile-cover';
import { AboutDetails } from './profile-about-details';
import { ProfileHellos } from './profile-hellos';
import { EMPTY_PERSONALITY } from '../../lib/profile-personality';
import { useProfileSpace } from './use-profile-space';
import spaceStyles from './profile-space.module.css';
import styles from './profile-decorator.module.css';
import { ProfilePortrait } from './profile-portrait';

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const same=sameProfileLook;
const sizeOf=(sticker:SpaceSticker)=>sticker.scale??1;
const resized=(scale:number)=>clamp(Math.round(scale*100)/100,STICKER_SCALE.min,STICKER_SCALE.max);
const turned=(degrees:number)=>Math.round(((degrees%360)+540)%360-180);
const CORNERS=['nw','ne','sw','se'] as const;

function Decorator({profile}: {profile:StudentProfile}) {
  const router=useRouter();
  const space=useProfileSpace(profile.username);
  const [look,setLook]=useState(space.look);
  const [past,setPast]=useState<ProfileLook[]>([]);const [future,setFuture]=useState<ProfileLook[]>([]);
  const [area,setArea]=useState<DecorationArea>('cover');
  const [dragGhost,setDragGhost]=useState<{id:string;kind:SpaceStickerKind;x:number;y:number;width:number;rotation:number}|null>(null);
  const [visitorPreview,setVisitorPreview]=useState(false);
  const [personality,setPersonality]=useState(EMPTY_PERSONALITY);
  useEffect(()=>{let active=true;profileFetch(`/api/profiles/personality?username=${encodeURIComponent(profile.username)}`).then(({response,data})=>{if(response.ok&&active)setPersonality(data.personality);}).catch(()=>{});return()=>{active=false;};},[profile.username]);
  const [selected,setSelected]=useState<string|null>(null);
  const [tab,setTab]=useState<'theme'|'frames'|'stickers'|'layout'>('theme');
  const [stickerCategory,setStickerCategory]=useState<StickerCategory>('all');
  const [stickerSearch,setStickerSearch]=useState('');
  const [frameCollection,setFrameCollection]=useState<FrameCollection>('all');
  const matchingStickers=findStickers(stickerCategory,stickerSearch);
  const [coverPhoto,setCoverPhoto]=useState<File|null>(null);
  const [photoPreview,setPhotoPreview]=useState<string|null>(null);
  const photoRef=useRef<File|null>(null);photoRef.current=coverPhoto;
  useEffect(()=>{if(!coverPhoto){setPhotoPreview(null);return;}const url=URL.createObjectURL(coverPhoto);setPhotoPreview(url);return()=>URL.revokeObjectURL(url);},[coverPhoto]);
  const [saving,setSaving]=useState(false);const [error,setError]=useState('');
  const [leaveTo,setLeaveTo]=useState<string|null>(null);
  const [posts,setPosts]=useState<FeedPost[]|null>(null);
  const [postsError,setPostsError]=useState(false);
  const [previewCategory,setPreviewCategory]=useState<ProfileCategory>('posts');
  const [previewCount,setPreviewCount]=useState<number|null>(null);
  const [recovered,setRecovered]=useState(false);
  const initialized=useRef(false);
  const skipDraftWrite=useRef(false);
  const savedLook=useRef(space.look);
  const saveLock=useRef(false);
  const lookRef=useRef(look);lookRef.current=look;
  const toolbar=useRef<HTMLElement>(null);
  useEffect(()=>{const element=toolbar.current;if(!element)return;const update=()=>element.parentElement?.style.setProperty('--decorator-toolbar-height',`${element.getBoundingClientRect().height}px`);const observer=new ResizeObserver(update);observer.observe(element);update();return()=>observer.disconnect();},[]);
  const stages=useRef<Partial<Record<DecorationArea,HTMLDivElement|null>>>({});
  // One gesture at a time: move the sticker, resize it from a corner, or turn it with the rotate handle.
  const drag=useRef<{mode:'move'|'resize'|'rotate';area:DecorationArea;id:string;before:ProfileLook;startX:number;startY:number;x:number;y:number;width:number;height:number;centerX:number;centerY:number;distance:number;angle:number;scale:number;rotation:number;offsetX:number;offsetY:number;stickerWidth:number}|null>(null);
  const dirty=initialized.current&&(!same(look,savedLook.current)||Boolean(coverPhoto));
  const dirtyRef=useRef(false);dirtyRef.current=dirty;
  const activeSticker=DECORATION_AREAS.flatMap(item=>areaStickers(look,item)).find(sticker=>sticker.id===selected);
  const currentStickers=areaStickers(look,area);
  const areaLabel=(value:DecorationArea)=>value==='cover'?'Cover':value==='about'?'About me':'Hello notes';
  useEffect(()=>{
    if(!['ready','preview'].includes(space.status))return;
    savedLook.current=space.look;
    if(initialized.current)return;
    let draft:ProfileLook|null=null;
    try{draft=readProfileLookDraft(window.sessionStorage,profile.username);}catch{/* Storage may be disabled. */}
    initialized.current=true;skipDraftWrite.current=true;
    setLook(draft??space.look);setPast([]);setFuture([]);setSelected(null);setRecovered(Boolean(draft&&!same(draft,space.look)));
  },[space.look,space.status,profile.username]);
  useEffect(()=>{
    if(!initialized.current)return;
    if(skipDraftWrite.current){skipDraftWrite.current=false;return;}
    try{
      if(same(look,savedLook.current))clearProfileLookDraft(window.sessionStorage,profile.username);
      else writeProfileLookDraft(window.sessionStorage,profile.username,look);
    }catch{/* Keep editing in memory when session storage is unavailable. */}
  },[look,profile.username]);
  useEffect(()=>{
    let active=true;
    profileFetch(`/api/profiles/content?username=${encodeURIComponent(profile.username)}&category=posts`).then(({response,data})=>{
      if(!response.ok)throw new Error();
      if(active)setPosts(data.posts.slice(0,3));
    }).catch(()=>{if(active)setPostsError(true);});
    return()=>{active=false;};
  },[profile.username]);
  useEffect(()=>{
    const onUnload=(event:BeforeUnloadEvent)=>{if(dirtyRef.current){event.preventDefault();event.returnValue='';}};
    const onClick=(event:MouseEvent)=>{
      if(!dirtyRef.current||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey)return;
      const link=(event.target as Element|null)?.closest?.('a[href]') as HTMLAnchorElement|null;
      if(!link||link.target==='_blank'||link.origin!==location.origin||link.pathname===location.pathname)return;
      event.preventDefault();event.stopPropagation();setLeaveTo(link.pathname+link.search+link.hash);
    };
    window.addEventListener('beforeunload',onUnload);document.addEventListener('click',onClick,true);
    return()=>{window.removeEventListener('beforeunload',onUnload);document.removeEventListener('click',onClick,true);};
  },[]);
  function commit(next:ProfileLook) {
    if(same(next,look))return;
    setPast(items=>[...items.slice(-29),look]);setLook(next);setFuture([]);setError('');
  }
  function undo() {const previous=past[past.length-1];if(!previous)return;setFuture(items=>[look,...items]);setLook(previous);setPast(items=>items.slice(0,-1));setSelected(null);}
  function redo() {const next=future[0];if(!next)return;setPast(items=>[...items,look]);setLook(next);setFuture(items=>items.slice(1));setSelected(null);}
  function stickerArea(id:string) { return DECORATION_AREAS.find(item=>areaStickers(look,item).some(sticker=>sticker.id===id))??area; }
  function stickerChange(id:string,values:Partial<SpaceSticker>) {const target=stickerArea(id);commit(withAreaStickers(look,target,areaStickers(look,target).map(sticker=>sticker.id===id?{...sticker,...values}:sticker)));}
  function addSticker(kind:SpaceStickerKind,point?:{x:number;y:number},target:DecorationArea=area) {
    if(areaStickers(look,target).length>=8)return;
    const id=crypto.randomUUID();
    commit(withAreaStickers(look,target,[...areaStickers(look,target),{id,kind,...positionedSticker(point??{x:25+areaStickers(look,target).length%3*25,y:35+Math.floor(areaStickers(look,target).length/3)*15}),rotation:0}]));
    setArea(target);setSelected(id);
    const surface=stages.current[target];
    if(surface&&surface.getBoundingClientRect().top>innerHeight*.55)surface.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  function dropSticker(event:DragEvent<HTMLDivElement>,target:DecorationArea) {
    const kind=event.dataTransfer.getData('application/x-socialu-sticker');
    if(!STICKER_SHELF.some(item=>item===kind)||saving||visitorPreview||!['ready','preview'].includes(space.status))return;
    event.preventDefault();const rect=event.currentTarget.getBoundingClientRect();
    addSticker(kind as SpaceStickerKind,{x:clamp((event.clientX-rect.left)/rect.width*100,0,100),y:clamp((event.clientY-rect.top)/rect.height*100,0,100)},target);
  }
  function startDrag(event:PointerEvent<HTMLElement>,sticker:SpaceSticker,mode:'move'|'resize'|'rotate'='move',target:DecorationArea=stickerArea(sticker.id)) {
    if(saving||visitorPreview)return;
    event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);setSelected(sticker.id);setArea(target);
    if(mode==='move')event.currentTarget.focus();
    const rect=stages.current[target]!.getBoundingClientRect();
    const box=(event.currentTarget.closest('[data-placed]')??event.currentTarget).getBoundingClientRect();
    const centerX=box.left+box.width/2,centerY=box.top+box.height/2;
    drag.current={mode,area:target,id:sticker.id,before:look,startX:event.clientX,startY:event.clientY,x:stickerPosition(sticker).x,y:stickerPosition(sticker).y,width:rect.width,height:rect.height,
      centerX,centerY,distance:Math.max(1,Math.hypot(event.clientX-centerX,event.clientY-centerY)),angle:Math.atan2(event.clientY-centerY,event.clientX-centerX)*180/Math.PI,scale:sizeOf(sticker),rotation:sticker.rotation,offsetX:event.clientX-centerX,offsetY:event.clientY-centerY,stickerWidth:((event.currentTarget.closest('[data-placed]')??event.currentTarget) as HTMLElement).clientWidth};
  }
  function moveDrag(event:PointerEvent<HTMLElement>) {
    const moving=drag.current;if(!moving)return;
    if(moving.mode==='move'){
      const rect=stages.current[moving.area]?.getBoundingClientRect();const sticker=areaStickers(lookRef.current,moving.area).find(item=>item.id===moving.id);
      const outside=rect&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom);
      setDragGhost(outside&&sticker?{id:sticker.id,kind:sticker.kind,x:event.clientX-moving.offsetX,y:event.clientY-moving.offsetY,width:moving.stickerWidth,rotation:sticker.rotation}:null);
    }
    let values:Partial<SpaceSticker>;
    if(moving.mode==='resize')values={scale:resized(moving.scale*Math.hypot(event.clientX-moving.centerX,event.clientY-moving.centerY)/moving.distance)};
    else if(moving.mode==='rotate')values={rotation:turned(moving.rotation+Math.atan2(event.clientY-moving.centerY,event.clientX-moving.centerX)*180/Math.PI-moving.angle)};
    else values=positionedSticker({x:clamp(moving.x+(event.clientX-moving.startX)/moving.width*100,0,100),y:clamp(moving.y+(event.clientY-moving.startY)/moving.height*100,0,100)});
    setLook(current=>withAreaStickers(current,moving.area,areaStickers(current,moving.area).map(sticker=>sticker.id===moving.id?{...sticker,...values}:sticker)));
  }
  function bringToFront(id:string) {
    const target=stickerArea(id),items=areaStickers(look,target),sticker=items.find(item=>item.id===id);
    if(sticker)commit(withAreaStickers(look,target,[...items.filter(item=>item.id!==id),sticker]));
  }
  function removeSticker(id:string) {const target=stickerArea(id);commit(withAreaStickers(look,target,areaStickers(look,target).filter(item=>item.id!==id)));setSelected(null);}
  function moveToArea(id:string,target:DecorationArea) {
    if(areaStickers(look,target).length>=8){setError('This area already has eight stickers. Remove one first.');return;}
    const from=stickerArea(id),sticker=areaStickers(look,from).find(item=>item.id===id);if(!sticker||from===target)return;
    commit(withAreaStickers(withAreaStickers(look,from,areaStickers(look,from).filter(item=>item.id!==id)),target,[...areaStickers(look,target),sticker]));setArea(target);
  }
  function endDrag(event:PointerEvent<HTMLElement>) {
    const moving=drag.current;drag.current=null;setDragGhost(null);if(!moving)return;
    if(event.type==='pointercancel'){setLook(moving.before);return;}
    let next=lookRef.current;
    if(moving.mode==='move'&&event.type==='pointerup'){
      const target=DECORATION_AREAS.find(item=>{const rect=stages.current[item]?.getBoundingClientRect();return rect&&event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom;});
      if(target&&target!==moving.area){
        const sticker=areaStickers(next,moving.area).find(item=>item.id===moving.id),rect=stages.current[target]!.getBoundingClientRect();
        if(sticker&&areaStickers(next,target).length<8){
          const point={x:clamp((event.clientX-moving.offsetX-rect.left)/rect.width*100,0,100),y:clamp((event.clientY-moving.offsetY-rect.top)/rect.height*100,0,100)};
          next=withAreaStickers(withAreaStickers(next,moving.area,areaStickers(next,moving.area).filter(item=>item.id!==sticker.id)),target,[...areaStickers(next,target),{...sticker,...positionedSticker(point)}]);setLook(next);setArea(target);
        }else setError('This area already has eight stickers. Remove one first.');
      }
    }
    if(!same(moving.before,next)){setPast(items=>[...items.slice(-29),moving.before]);setFuture([]);}
  }
  function stickerKey(event:KeyboardEvent<HTMLButtonElement>,sticker:SpaceSticker) {
    const step=event.shiftKey?5:1;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
      event.preventDefault();stickerChange(sticker.id,positionedSticker({x:clamp(stickerPosition(sticker).x+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0),0,100),y:clamp(stickerPosition(sticker).y+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0),0,100)}));
    }else if(['+','=','-','_'].includes(event.key)){
      event.preventDefault();stickerChange(sticker.id,{scale:resized(sizeOf(sticker)+(event.key==='-'||event.key==='_'?-.1:.1))});
    }else if(event.key==='['||event.key===']'){
      event.preventDefault();stickerChange(sticker.id,{rotation:turned(sticker.rotation+(event.key==='['?-15:15))});
    }else if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();removeSticker(sticker.id);}
  }
  function renderStickers(target:DecorationArea) {
    if(visitorPreview)return <ProfileStickerLayer look={look} area={target}/>;
    return <div className={styles.editorStickerLayer}>{areaStickers(look,target).map(sticker=>{
            const active=sticker.id===selected;const point=stickerPosition(sticker);
            const gesture={onPointerMove:moveDrag,onPointerUp:endDrag,onPointerCancel:endDrag,onLostPointerCapture:endDrag};
            return <div key={sticker.id} data-placed data-ghost={dragGhost?.id===sticker.id} className={styles.placed} data-selected={active} style={{left:`${point.x}%`,top:`${point.y}%`,transform:`translate(-50%,-50%) rotate(${sticker.rotation}deg)`,['--scale' as string]:sizeOf(sticker)}}>
              <button type="button" className={styles.movable} aria-label={`${STICKER_LABELS[sticker.kind]} sticker. Arrow keys move, plus and minus resize, brackets rotate, Delete removes.`} aria-pressed={active} disabled={saving||space.status==='loading'||space.status==='error'} onFocus={()=>{setSelected(sticker.id);setArea(target);}} onPointerDown={event=>startDrag(event,sticker,'move',target)} {...gesture} onKeyDown={event=>stickerKey(event,sticker)}><StickerArt kind={sticker.kind}/></button>
              {active&&!saving&&<>
                <span className={styles.rotateHandle} aria-hidden="true" title="Drag to rotate" onPointerDown={event=>startDrag(event,sticker,'rotate',target)} {...gesture}><RotateCw size={10}/></span>
                {CORNERS.map(corner=><span key={corner} className={styles.resizeHandle} data-corner={corner} aria-hidden="true" title="Drag to resize" onPointerDown={event=>startDrag(event,sticker,'resize',target)} {...gesture}/>)}
              </>}
            </div>;
          })}</div>;
  }
  function surfaceProps(target:DecorationArea) {return {
    ref:(element:HTMLDivElement|null)=>{stages.current[target]=element;},
    'data-active-area':!visitorPreview&&area===target,
    onDragOver:(event:DragEvent<HTMLDivElement>)=>{if(!visitorPreview&&event.dataTransfer.types.includes('application/x-socialu-sticker'))event.preventDefault();},
    onDrop:(event:DragEvent<HTMLDivElement>)=>dropSticker(event,target),
    onPointerDown:(event:PointerEvent<HTMLDivElement>)=>{if(visitorPreview)return;if(!(event.target as Element).closest('[data-placed],button')){setSelected(null);setArea(target);}},
  };}
  async function save() {
    if(saveLock.current||space.status!=='ready')return;saveLock.current=true;setSaving(true);setError('');
    try {
      const confirmed=await saveProfileLook(lookRef.current,profileFetch,45000,photoRef.current);
      savedLook.current=confirmed;dirtyRef.current=false;
      try{clearProfileLookDraft(window.sessionStorage,profile.username);}catch{/* The server save is already confirmed. */}
      router.push('/profile?look=saved');router.refresh();
    }catch(reason){setError(reason instanceof Error?reason.message:'Unable to save your look. Your changes are still here.');setSaving(false);}
    finally{saveLock.current=false;}
  }
  function leave(target:string) {dirtyRef.current=false;setLeaveTo(null);router.push(target);}
  return <main className={`${styles.page} ${spaceStyles.theme}`} data-palette={look.palette} data-design-theme={look.theme} data-frame={look.frame}>
    <header ref={toolbar} className={styles.toolbar}><Link href="/" className={styles.brand} aria-label="SocialU home">SocialU<Leaf size={19}/></Link><Link href="/profile" className={styles.breadcrumb}><ArrowLeft size={14}/>My profile</Link><span>Decorate my space</span><div><button type="button" className={styles.visitorButton} aria-pressed={visitorPreview} onClick={()=>{if(!visitorPreview&&previewCategory==='saved')setPreviewCategory('posts');setVisitorPreview(value=>!value);setSelected(null);}}>{visitorPreview?'Back to editing':'Preview as visitor'}</button>{space.status==='preview'&&<small className={styles.previewTag}>Preview · saving unavailable</small>}<button disabled={saving} onClick={()=>dirtyRef.current?setLeaveTo('/profile'):leave('/profile')}>Cancel</button><button disabled={saving||space.status!=='ready'} onClick={save}>{saving?'Saving…':'Save my look'}</button></div></header>
    {(error||dirty||recovered)&&<div className={styles.saveNotice} data-error={Boolean(error)} role={error?'alert':'status'}><span>{error|| (recovered?'Recovered your unsaved look. Save it when you’re ready.':coverPhoto?'Unsaved changes. Save my look to upload your cover photo and apply your decorations.':'Unsaved changes. Save my look to apply them to your profile.')}</span>{error&&<button type="button" disabled={saving||space.status!=='ready'} onClick={save}>Try saving again</button>}</div>}
    {space.status==='error'&&<p className={styles.error} role="alert">Your saved look couldn’t load. <button onClick={space.reload}>Retry</button></p>}
    {space.status==='loading'&&<p className={styles.notice} role="status">Loading your space…</p>}
    <div className={styles.workspace}>
      <aside className={styles.panel} aria-label="Decoration controls">
        <h1>Make it yours</h1><p>Your profile. Your personality.</p>{space.status==='preview'&&<p className={styles.mobilePreview}>Preview only · saving isn’t available yet.</p>}
        <div className={styles.tabs} aria-label="Decoration categories">{(['theme','frames','stickers','layout'] as const).map(item=><button type="button" key={item} aria-pressed={tab===item} onClick={()=>setTab(item)}>{item==='theme'?<Palette size={17}/>:item==='frames'?<Frame size={17}/>:item==='stickers'?<Smile size={17}/>:<Grip size={17}/>}<span>{item==='layout'?'Cards':item[0].toUpperCase()+item.slice(1)}</span></button>)}</div>
        <fieldset disabled={saving||visitorPreview||space.status==='loading'||space.status==='error'} className={styles.fields}>
          {tab==='theme'&&<>
            <legend className={styles.srOnly}>Theme</legend><h2>Choose your theme</h2><div className={styles.themeChoices}>{PROFILE_THEMES.map(theme=><button key={theme.id} type="button" aria-label={`${theme.label} theme`} aria-pressed={look.theme===theme.id} onClick={()=>commit(applyProfileTheme(look,theme.id))}><div><ProfileThemeArtwork theme={theme.id}/>{look.theme===theme.id&&<span className={styles.themeCheck}><Check size={12}/></span>}</div><span>{theme.label}</span></button>)}</div><h2>Accent color</h2><div className={styles.palettes}>{SPACE_PALETTES.map(palette=><button key={palette} type="button" aria-label={`${palette} palette`} aria-pressed={look.palette===palette} data-color={palette} onClick={()=>commit({...look,palette})}>{look.palette===palette&&<Check size={18}/>}</button>)}</div>
            {tab==='theme'&&<><h2>Cover style</h2><div className={styles.covers}>{SPACE_COVERS.map(cover=><button type="button" key={cover} aria-pressed={!coverPhoto&&!look.coverKey&&look.cover===cover} onClick={()=>{setCoverPhoto(null);const {coverKey,...rest}=look;commit({...rest,cover});}}><div><CoverArtwork cover={cover} theme={look.theme} thumbnail/></div><span>{cover==='meadow'?(look.theme?'Theme artwork':'Campus'):cover[0].toUpperCase()+cover.slice(1)}</span></button>)}</div><div className={styles.coverUpload}><label htmlFor="profile-cover-photo">Upload your own cover photo</label><input id="profile-cover-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>5000000){setError('Choose a JPG, PNG, or WebP cover photo up to 5 MB.');return;}setCoverPhoto(file);setError('');}}/><p>JPG, PNG or WebP · up to 5 MB. A wide photo works best. Your photo uploads when you save and appears in place of the theme artwork.</p>{coverPhoto&&<><p role="status">Selected: {coverPhoto.name}</p><button type="button" onClick={()=>setCoverPhoto(null)}>Cancel photo change</button></>}{look.coverKey&&!coverPhoto&&<button type="button" onClick={()=>{const {coverKey,...rest}=look;commit(rest);}}>Use theme artwork</button>}</div></>}
          </>}
          {tab==='frames'&&<><legend className={styles.srOnly}>Photo frames</legend><h2>Choose a frame <small>{FRAME_OPTIONS.length} styles</small></h2><p className={styles.help}>A little detail around your photo. Your face stays in view.</p><select className={styles.frameCollection} aria-label="Frame collection" value={frameCollection} onChange={event=>setFrameCollection(event.target.value as FrameCollection)}>{FRAME_COLLECTIONS.map(collection=><option key={collection.id} value={collection.id}>{collection.label}</option>)}</select><div className={styles.frames} aria-label="Available photo frames">{framesInCollection(frameCollection).map(frame=><button type="button" key={frame.id} aria-label={`${frame.label} frame`} aria-pressed={look.frame===frame.id} onClick={()=>commit({...look,frame:frame.id})}><ProfilePortrait frame={frame.id} className={styles.frameThumbnail}><Avatar url={profile.photo_url} name={profile.name}/></ProfilePortrait><span>{frame.label}</span></button>)}</div></>}
          {tab==='stickers'&&<>
            <legend className={styles.srOnly}>Stickers</legend><label className={styles.areaPicker}>Decorate<select aria-label="Area to decorate" value={area} onChange={event=>{setArea(event.target.value as DecorationArea);setSelected(null);}}>{DECORATION_AREAS.map(item=><option key={item} value={item}>{areaLabel(item)}</option>)}</select></label><h2>Sticker shelf <small>{currentStickers.length}/8 on {areaLabel(area).toLowerCase()}</small></h2><p className={styles.help}>Choose an area, then tap a sticker or drag it onto a card.</p>
            <label className={styles.stickerSearch}><Search size={14} aria-hidden="true"/><input type="search" aria-label="Search stickers" placeholder="Find a sticker…" value={stickerSearch} onChange={event=>setStickerSearch(event.target.value)}/></label>
            <div className={styles.stickerCategories} aria-label="Sticker categories">{STICKER_CATEGORIES.map(category=><button type="button" key={category.id} aria-pressed={stickerCategory===category.id} onClick={()=>setStickerCategory(category.id)}>{category.label}</button>)}</div>
            <p className={styles.stickerResults} role="status">{matchingStickers.length} {matchingStickers.length===1?'sticker':'stickers'}</p>
            {matchingStickers.length?<div className={styles.shelf} aria-label="Available stickers">{matchingStickers.map(({kind,label})=><button type="button" key={kind} aria-label={`Add ${label} sticker`} disabled={currentStickers.length>=8} draggable={!saving&&currentStickers.length<8} onDragStart={event=>{event.dataTransfer.setData('application/x-socialu-sticker',kind);event.dataTransfer.effectAllowed='copy';}} onClick={()=>addSticker(kind)}><StickerArt kind={kind}/><span>{label}</span></button>)}</div>:<div className={styles.noStickers}><p>No stickers found.</p><button type="button" onClick={()=>{setStickerSearch('');setStickerCategory('all');}}>Show all stickers</button></div>}
            {activeSticker&&<div className={styles.stickerTools}><label className={styles.areaPicker}>Move sticker to<select aria-label="Move selected sticker to area" value={stickerArea(activeSticker.id)} onChange={event=>moveToArea(activeSticker.id,event.target.value as DecorationArea)}>{DECORATION_AREAS.map(item=><option key={item} value={item}>{areaLabel(item)}</option>)}</select></label><p>{STICKER_LABELS[activeSticker.kind]} sticker · {Math.round(sizeOf(activeSticker)*100)}%</p><div>
              <button type="button" aria-label="Make sticker smaller" disabled={sizeOf(activeSticker)<=STICKER_SCALE.min} onClick={()=>stickerChange(activeSticker.id,{scale:resized(sizeOf(activeSticker)-.1)})}><Minus size={14}/>Smaller</button>
              <button type="button" aria-label="Make sticker bigger" disabled={sizeOf(activeSticker)>=STICKER_SCALE.max} onClick={()=>stickerChange(activeSticker.id,{scale:resized(sizeOf(activeSticker)+.1)})}><Plus size={14}/>Bigger</button>
              <button type="button" onClick={()=>stickerChange(activeSticker.id,{rotation:turned(activeSticker.rotation+15)})}><RotateCw size={14}/>Rotate</button>
              <button type="button" disabled={areaStickers(look,stickerArea(activeSticker.id)).at(-1)?.id===activeSticker.id} onClick={()=>bringToFront(activeSticker.id)}><BringToFront size={14}/>Bring to front</button>
              <button type="button" onClick={()=>removeSticker(activeSticker.id)}><Trash2 size={14}/>Remove</button>
            </div><p className={styles.help}>Drag a corner to resize · drag the round handle to rotate.</p></div>}
          </>}
          {tab==='layout'&&<><h2>Card finish</h2>{(['about','notes'] as const).map(card=><label className={styles.areaPicker} key={card}>{areaLabel(card)}<select aria-label={`${areaLabel(card)} card finish`} value={look.cardFinishes?.[card]??'clean'} onChange={event=>commit({...look,cardFinishes:{about:look.cardFinishes?.about??'clean',notes:look.cardFinishes?.notes??'clean',[card]:event.target.value as 'paper'|'sticky'|'clean'}})}>{CARD_FINISHES.map(finish=><option key={finish} value={finish}>{finish==='sticky'?'Sticky note':finish[0].toUpperCase()+finish.slice(1)}</option>)}</select></label>)}<legend className={styles.srOnly}>Card layout</legend><h2>What comes first?</h2><p className={styles.help}>Choose the first cards classmates see alongside your posts.</p><div className={styles.layouts}>{(['about-first','campus-first'] as const).map(layout=><button type="button" key={layout} aria-pressed={look.layout===layout} onClick={()=>commit({...look,layout})}><strong>{layout==='about-first'?'A little more personal':'Around campus'}</strong><span>{layout==='about-first'?'About me → Hello notes → Campus':'Student card → Events → About me'}</span></button>)}</div></>}
        </fieldset>
      </aside>
      <section className={styles.previewArea} aria-label="Live decoration preview">
        <header className={styles.previewToolbar}><span>LIVE PREVIEW</span><div><button aria-label="Undo decoration change" disabled={!past.length||saving||visitorPreview} onClick={undo}><Undo2 size={17}/></button><button aria-label="Redo decoration change" disabled={!future.length||saving||visitorPreview} onClick={redo}><Redo2 size={17}/></button><small><LockKeyhole size={13}/>Only you can edit</small></div></header>
        <div className={styles.preview}>
          <div {...surfaceProps('cover')} className={styles.stage} aria-label="Profile cover decoration area"><CoverArtwork cover={look.cover} theme={look.theme} photoUrl={photoPreview||(look.coverKey?space.coverUrl:null)}/>{renderStickers('cover')}</div>
          <div className={styles.previewIdentity}><ProfilePortrait frame={look.frame} className={styles.photo}><Avatar url={profile.photo_url} name={profile.name}/></ProfilePortrait><div><div className={styles.identityHeading}><h2>{profile.name}</h2><span className={styles.previewVerified}><Check size={13}/>Campus verified</span></div><p>@{profile.username}</p><span>{[profile.major,profile.class_year].filter(Boolean).join(' · ')}</span><small>{profile.university}</small><p className={styles.previewStats}><strong>{profile.post_count}</strong> posts <span>·</span> <strong>{profile.friend_count}</strong> friends</p></div></div>
          <div className={styles.previewCards} data-order={look.layout}>
            <div {...surfaceProps('about')} className={`${styles.cardCanvas} ${spaceStyles.cardSurface}`} data-finish={look.cardFinishes?.about??'clean'} aria-label="About me decoration area"><section className={styles.aboutPreview}><h3>A little about me</h3>{(look.hometown||look.homeCountry)&&<p className={styles.hometownPreview}>{countryFlag(look.homeCountry??'')} From {[look.hometown,countryByCode(look.homeCountry??'')?.name].filter(Boolean).join(', ')}</p>}<AboutDetails profile={profile} personality={personality}/></section>{renderStickers('about')}</div>
            <div {...surfaceProps('notes')} className={`${styles.cardCanvas} ${spaceStyles.cardSurface}`} data-finish={look.cardFinishes?.notes??'clean'} aria-label="Hello notes decoration area"><ProfileHellos profile={{...profile,is_own:true}} notes={space.notes.map(note=>({...note,canRemove:false}))} status={space.status} onUpdate={()=>{}} onRetry={space.reload}/>{renderStickers('notes')}</div>
            {look.layout==='campus-first'&&<section className={styles.campusPreview}><h3>Around campus</h3><p>{profile.university}</p><span>Student card & campus events</span></section>}
          </div>
          <section className={styles.previewPosts}>
            <ProfileContentTabs value={previewCategory} onChange={setPreviewCategory} own={!visitorPreview} prefix="decoration" panelId="decoration-content" className={styles.previewContentTabs}/>
            <div id="decoration-content" role="tabpanel" aria-labelledby={`decoration-tab-${previewCategory}`} tabIndex={0} className={styles.previewContent}>
              {previewCategory==='board'?<ProfileBoard profile={{...profile,is_own:false}} look={look} status={space.status} onSaved={()=>{}}/>:previewCategory==='posts'?<><h3>Your posts</h3>{postsError?<p>Your recent posts couldn’t load.</p>:posts===null?<p role="status">Loading your posts…</p>:!posts.length?<p>Your photos and campus moments will appear here.</p>:<div className={styles.postSamples}>{posts.map(post=><article key={post.postId}>{post.photos[0]&&<img src={post.photos[0].url} alt="Your post photo"/>}<p>{post.textContent||'A campus moment'}</p></article>)}</div>}</>
                :<><h3>{previewCategory==='tagged'?'Tagged posts':'Saved posts'}{previewCount!==null&&<small> · {previewCount}</small>}</h3>{previewCategory==='saved'&&<p className={styles.help}><LockKeyhole size={12}/>Only you can see your saved posts.</p>}<PostGrid username={profile.username} category={previewCategory} own onCount={setPreviewCount}/></>}
            </div>
          </section>
        </div>
        <p className={styles.previewHelp}><Move size={14}/>Decorate the cover, About me, and hello notes. Drag to move · corners to resize · round handle to rotate.</p>
      </section>
    </div>
    {dragGhost&&<div className={styles.dragGhost} aria-hidden="true" style={{left:dragGhost.x,top:dragGhost.y,width:dragGhost.width,transform:`translate(-50%,-50%) rotate(${dragGhost.rotation}deg)`}}><StickerArt kind={dragGhost.kind}/></div>}
    {leaveTo&&<ConfirmDialog title="Discard decoration changes?" busy={saving} error="" confirmLabel="Discard changes" onConfirm={()=>{try{clearProfileLookDraft(window.sessionStorage,profile.username);}catch{}leave(leaveTo);}} onClose={()=>setLeaveTo(null)}>Your unsaved look will be lost.</ConfirmDialog>}
  </main>;
}

function DecoratorLoader() {
  const [profile,setProfile]=useState<StudentProfile|null>(null);const [error,setError]=useState('');
  useEffect(()=>{let active=true;profileFetch('/api/profiles').then(({response,data})=>{if(!response.ok)throw new Error(data.error||'Unable to load your profile.');if(active)setProfile(data.profile);}).catch(reason=>{if(active)setError(reason.message);});return()=>{active=false;};},[]);
  if(error)return <main className={styles.page}><p className={styles.error} role="alert">{error}</p><Link href="/profile">Back to profile</Link></main>;
  if(!profile)return <main className={styles.page}><p role="status">Loading your profile…</p></main>;
  return <Decorator profile={profile}/>;
}
export function ProfileDecorator() {const gate=useProfileGate();return gate==='ready'?<DecoratorLoader/>:<SessionNotice state={gate}/>;}
