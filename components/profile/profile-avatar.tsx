'use client';
import {useState} from 'react';
import {UserRound} from 'lucide-react';
import styles from './profile.module.css';

// A failed or expired photo must never leave broken-image text inside a frame.
export function Avatar({url,name,className='',onPhotoError,onPhotoLoad}:{
  url:string|null;name:string;className?:string;onPhotoError?:()=>void;onPhotoLoad?:()=>void;
}){
  const [failedUrl,setFailedUrl]=useState<string|null>(null);
  const visible=Boolean(url&&failedUrl!==url);
  return <span className={`${styles.avatar} ${className}`}>
    {visible?<img src={url!} alt={`${name}'s profile photo`} decoding="async"
      onLoad={onPhotoLoad} onError={()=>{setFailedUrl(url);onPhotoError?.();}}/>
      :<UserRound role="img" aria-label={url?'Profile photo unavailable':'Default profile avatar'}/>}
  </span>;
}
