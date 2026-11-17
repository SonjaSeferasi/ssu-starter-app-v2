'use client';
import React, { useEffect, useRef, useState } from 'react';
import { CompleteAvatar } from './complete-avatar';
import type { CompleteAvatar as Avatar } from '../../lib/avatar-collection';
import type { AvatarAppearance } from '../../lib/game-room';
import { faceCrop, openFacePhoto, renderFaceCrop } from '../../lib/avatar-photo';
import { accessToken } from '../../lib/account/session';
import styles from './photo-face-editor.module.css';

export function PhotoFaceEditor({ avatar, appearance, onSaved, onClose }: {
  avatar: Avatar; appearance: AvatarAppearance; onSaved: (photo: {photoFaceId:string;photoFaceUrl:string})=>void; onClose: ()=>void;
}) {
  const dialog = useRef<HTMLDialogElement>(null), input = useRef<HTMLInputElement>(null), video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null), imageRef = useRef<HTMLImageElement | null>(null), live = useRef(true), generation = useRef(0);
  const [image,setImage] = useState<HTMLImageElement | null>(null), [zoom,setZoom] = useState(1), [x,setX] = useState(.5), [y,setY] = useState(.5);
  const [candidate,setCandidate] = useState(''), [error,setError] = useState(''), [busy,setBusy] = useState(false), [saving,setSaving] = useState(false);
  const [camera,setCamera] = useState(false), [confirm,setConfirm] = useState(false), [saveFailed,setSaveFailed] = useState(false);
  const crop = image ? faceCrop(image.naturalWidth,image.naturalHeight,zoom,x,y) : null;
  const stopCamera = () => { stream.current?.getTracks().forEach(track=>track.stop()); stream.current=null; setCamera(false); };
  useEffect(()=>{ live.current=true; dialog.current?.showModal(); return ()=> { live.current=false; generation.current++; stream.current?.getTracks().forEach(track=>track.stop()); if(imageRef.current) URL.revokeObjectURL(imageRef.current.src); }; },[]);
  useEffect(()=> { if(video.current && stream.current) { video.current.srcObject=stream.current; void video.current.play().catch(()=>{stopCamera();setError('Camera playback failed. Choose an existing photograph instead.');}); } },[camera]);
  useEffect(()=> {
    if (!image || !crop) return;
    try { setCandidate(renderFaceCrop(image,crop)); setSaveFailed(false); }
    catch(failure) {setCandidate('');setError(failure instanceof Error ? failure.message : 'Unable to preview this photograph.');}
  },[image,zoom,x,y]);
  useEffect(()=> {
    const guard = (event: BeforeUnloadEvent)=> { if(image) {event.preventDefault();event.returnValue='';} };
    window.addEventListener('beforeunload',guard); return ()=>window.removeEventListener('beforeunload',guard);
  },[image]);
  async function choose(file?: File) {
    if(!file) return;
    stopCamera(); const ticket=++generation.current; setBusy(true);setError('');
    try { const next=await openFacePhoto(file);
      if(!live.current || ticket!==generation.current) {URL.revokeObjectURL(next.src);return;}
      if(imageRef.current) URL.revokeObjectURL(imageRef.current.src);
      imageRef.current=next;setImage(next);setZoom(1);setX(.5);setY(.5);setSaveFailed(false);
    } catch(failure) {if(live.current && ticket===generation.current) setError(failure instanceof Error ? failure.message : 'Choose another photograph.');}
    finally {if(live.current && ticket===generation.current) setBusy(false);}
  }
  async function startCamera() {
    const ticket=++generation.current;setBusy(true);setError('');
    try {
      if(!navigator.mediaDevices?.getUserMedia) throw new Error();
      const next=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});
      if(!live.current || ticket!==generation.current) {next.getTracks().forEach(track=>track.stop());return;}
      stream.current=next;setCamera(true);
    } catch {if(live.current) setError('Camera access is unavailable or was denied. Choose an existing photograph instead.');}
    finally {if(live.current) setBusy(false);}
  }
  async function capture() {
    try {
      if(!video.current?.videoWidth) throw new Error();
      const canvas=document.createElement('canvas');canvas.width=video.current.videoWidth;canvas.height=video.current.videoHeight;
      canvas.getContext('2d')!.drawImage(video.current,0,0);
      const blob=await new Promise<Blob | null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));
      if(!blob) throw new Error(); await choose(new File([blob],'camera.jpg',{type:'image/jpeg'}));
    } catch {stopCamera();setError('The camera could not capture a photograph. Choose an existing photograph instead.');}
  }
  function leave() {if(saving) return; if(image || busy) setConfirm(true); else {stopCamera();onClose();}}
  async function save() {
    if(!candidate || !crop || saving || busy) return;
    setSaving(true);setError('');setSaveFailed(false);
    try {
      const token=await accessToken();if(!token) throw new Error('Please sign in again before saving.');
      const response=await fetch('/api/game-room/photo',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({image:candidate,crop})});
      const data=await response.json();if(!response.ok) throw new Error(data.error || 'The photograph could not be saved.');
      if(!data.photoFaceId || !data.photoFaceUrl) throw new Error('The save could not be confirmed.');
      onSaved(data);
    } catch(failure) {setSaveFailed(true);setError((failure instanceof Error ? failure.message : 'The photograph could not be saved.')+' Your photograph and crop are retained. The editor still shows your previously confirmed face until a save is confirmed.');}
    finally {if(live.current) setSaving(false);}
  }
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="photo-editor-title" onCancel={event=>{event.preventDefault();leave();}}>
    <div className={styles.heading}><h2 id="photo-editor-title">Your photographic face</h2><button onClick={leave} disabled={saving}>Close editor</button></div>
    {confirm ? <section className={styles.confirm} aria-label="Unsaved photograph"><h3>Keep your changes?</h3><p>Your photograph has not been saved.</p><div className={styles.actions}><button autoFocus onClick={()=>setConfirm(false)}>Keep Editing</button><button onClick={()=>{stopCamera();onClose();}}>Discard Changes</button></div></section> : <>
      <p className={styles.intro}>Choose a photograph, position your face in the crop, then save when you are happy. The photograph stays photographic.</p>
      <div className={styles.actions}><button disabled={busy||saving} onClick={()=>input.current?.click()}>{error ? 'Choose Another Photograph' : 'Choose Photograph'}</button><button disabled={busy||saving||camera} onClick={()=>void startCamera()}>Take Photograph</button></div>
      <input hidden ref={input} type="file" accept=".jpg,.jpeg,.png,.webp,.heic,image/jpeg,image/png,image/webp,image/heic" onChange={event=>{void choose(event.target.files?.[0]);event.target.value='';}} />
      <p>JPG/JPEG, PNG, WebP or HEIC · Maximum 10 MB</p>
      {busy && <p role="status">Preparing your photograph…</p>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {camera && <section aria-label="Camera"><video ref={video} autoPlay playsInline muted /><div className={styles.actions}><button onClick={()=>void capture()}>Capture Photograph</button><button onClick={stopCamera}>Cancel Camera</button></div></section>}
      {image && crop && <div className={styles.grid}><div><div className={styles.crop}><img src={image.src} alt="Photograph to crop" /><div className={styles.selection} style={{left:`${crop.x*100}%`,top:`${crop.y*100}%`,width:`${crop.width*100}%`,height:`${crop.height*100}%`}} /></div><div className={styles.sliders}>
        <label>Crop size<input type="range" aria-label="Crop size" min="1" max="4" step=".01" value={zoom} disabled={saving||busy} onChange={e=>setZoom(Number(e.target.value))} /></label>
        <label>Horizontal position<input type="range" aria-label="Horizontal position" min="0" max="1" step=".01" value={x} disabled={saving||busy} onChange={e=>setX(Number(e.target.value))} /></label>
        <label>Vertical position<input type="range" aria-label="Vertical position" min="0" max="1" step=".01" value={y} disabled={saving||busy} onChange={e=>setY(Number(e.target.value))} /></label>
      </div></div><div className={styles.preview}><p>Photographic face preview · not saved</p><CompleteAvatar avatar={avatar} look={appearance} photoFaceUrl={candidate} /></div></div>}
      <div className={styles.actions}><button className={styles.save} disabled={!candidate||saving||busy||camera} onClick={()=>void save()}>{saving ? 'Saving photograph…' : saveFailed ? 'Retry' : 'Save Photograph'}</button></div>
    </>}
  </dialog>;
}
