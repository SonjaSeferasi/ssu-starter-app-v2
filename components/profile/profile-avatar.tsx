'use client';
import {useEffect,useState} from 'react';
import {UserRound} from 'lucide-react';
import {accessToken} from '../../lib/account/session';
import styles from './profile.module.css';

// A failed or expired photo must never leave broken-image text inside a frame.
export function Avatar({url,name,username,className='',onPhotoError,onPhotoLoad}:{
  url:string|null;name:string;username?:string;className?:string;onPhotoError?:()=>void;onPhotoLoad?:()=>void;
}){
  const [failedUrl,setFailedUrl]=useState<string|null>(null);
  const [recovered,setRecovered]=useState<{source:string;username:string;url:string;failed:boolean}|null>(null);
  useEffect(()=>{
    if(!url||!username||failedUrl!==url)return;
    const controller=new AbortController();let objectUrl:string|undefined;
    (async()=>{
      const token=await accessToken();
      if(!token||controller.signal.aborted)return;
      const response=await fetch(`/api/profiles/photo?username=${encodeURIComponent(username)}`,{
        headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:controller.signal,
      });
      if(!response.ok)return;
      const blob=await response.blob();
      if(controller.signal.aborted||!blob.type.startsWith('image/'))return;
      objectUrl=URL.createObjectURL(blob);
      setRecovered({source:url,username,url:objectUrl,failed:false});
    })().catch(()=>{});
    return ()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[url,username,failedUrl]);
  const recovery=recovered?.source===url&&recovered.username===username&&!recovered.failed?recovered.url:null;
  const source=failedUrl===url?recovery:url;
  return <span className={`${styles.avatar} ${className}`}>
    {source?<img src={source} alt={`${name}'s profile photo`} decoding="async"
      onLoad={onPhotoLoad} onError={()=>{
        if(source===recovery)setRecovered(current=>current?{...current,failed:true}:null);
        else {setFailedUrl(url);onPhotoError?.();}
      }}/>
      :<UserRound role="img" aria-label={url?'Profile photo unavailable':'Default profile avatar'}/>}
  </span>;
}
