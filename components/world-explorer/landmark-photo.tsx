'use client';
import {useEffect,useState} from 'react';
import type {LandmarkImage} from '../../lib/world-explorer/media';
import styles from './world-explorer.module.css';

/** A supplementary real-world reference, with its attribution attached. */
export function LandmarkPhoto({code}:{code:string}){
 const [photo,setPhoto]=useState<LandmarkImage|null>(null);
 useEffect(()=>{
  setPhoto(null);if(code==='ANTARCTICA')return;
  const controller=new AbortController();
  void fetch('/api/world-explorer/media/'+code,{signal:controller.signal}).then(response=>response.ok?response.json():null).then(data=>{if(!controller.signal.aborted&&data?.image)setPhoto(data.image);}).catch(()=>{});
  return()=>controller.abort();
 },[code]);
 if(!photo)return null;
 return <figure className={styles.landmarkPhoto}><a href={photo.pageUrl} target="_blank" rel="noreferrer"><img src={photo.url} alt={photo.title} loading="lazy" referrerPolicy="no-referrer" onError={()=>setPhoto(null)}/></a><figcaption><a href={photo.pageUrl} target="_blank" rel="noreferrer">{photo.title}</a> · {photo.author} · <a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a> · Wikimedia Commons</figcaption></figure>;
}
