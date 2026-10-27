'use client';
import { UserRound } from 'lucide-react';
import styles from './profile.module.css';

// Shared with navigation and chat; importing an avatar must not load the profile editor.
export function Avatar({url,name,className=''}:{url:string|null;name:string;className?:string}) {
  return <span className={`${styles.avatar} ${className}`}>{url?<img src={url} alt={`${name}'s profile photo`}/>:<UserRound aria-label="Default profile avatar"/>}</span>;
}
