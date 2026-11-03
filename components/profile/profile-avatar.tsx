'use client';
import { useState } from 'react';
import { UserRound } from 'lucide-react';
import styles from './profile.module.css';

// Shared with navigation and chat; importing an avatar must not load the profile editor.
// A photo that cannot load (an expired signed link, or a format the browser cannot show) falls back to the default avatar.
export function Avatar({url,name,className=''}:{url:string|null;name:string;className?:string}) {
  const [failed, setFailed] = useState<string | null>(null);
  const shown = url && failed !== url ? url : null;
  return <span className={`${styles.avatar} ${className}`}>{shown?<img src={shown} alt={`${name}'s profile photo`} onError={()=>setFailed(shown)}/>:<UserRound aria-label="Default profile avatar"/>}</span>;
}
