'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {ArrowLeft,History,RefreshCw} from 'lucide-react';
import {profileFetch} from '../profile/profile-view';
import type {LoginEntry,LoginHistory} from '../../lib/login-activity';
import styles from './login-activity.module.css';
export function LoginActivity(){
  const [entries,setEntries]=useState<LoginEntry[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  useEffect(()=>{
    let ignore=false;
    setLoading(true);setError('');
    (async()=>{
      try{
        const {response,data}=await profileFetch('/api/account/login-activity');
        if(!response.ok)throw new Error(data.error||'Could not load your login activity.');
        if(!ignore)setEntries((data as LoginHistory).entries);
      }catch(reason){if(!ignore)setError(reason instanceof Error?reason.message:'Please try again.');}
      finally{if(!ignore)setLoading(false);}
    })();return()=>{ignore=true;};
  },[revision]);
  return <main className={styles.page}>
    <Link href="/profile/settings" className={styles.back}><ArrowLeft size={18}/>Account settings</Link>
    <section className={styles.panel} aria-labelledby="login-activity-title">
      <header className={styles.header}><div><p className={styles.eyebrow}>ACCOUNT SECURITY</p><h1 id="login-activity-title">Login Activity</h1><p>Review the sign-ins recorded for your account.</p></div><button type="button" onClick={()=>setRevision(x=>x+1)} disabled={loading}><RefreshCw size={16}/>Refresh</button></header>
      <div aria-live="polite" aria-busy={loading}>
        {loading?<p className={styles.notice} role="status">Loading your activity…</p>:error?<div className={styles.notice} role="alert"><p>{error}</p><button type="button" onClick={()=>setRevision(x=>x+1)}>Try again</button><Link href="/login">Go to sign in</Link></div>:!entries.length?<div className={styles.notice}><History size={28}/><h2>No login activity yet</h2><p>New sign-ins will appear here once they are recorded.</p></div>:<ul className={styles.list} aria-label="Recorded sign-ins">{entries.map((entry,index)=><li key={entry.id} className={styles.entry}><History size={20} aria-hidden="true"/><div><strong>Sign-in record {index+1}</strong></div></li>)}</ul>}
      </div>
      <p className={styles.footnote}>Only your account can view this activity. Older sign-ins from before history recording was enabled may be unavailable.</p>
    </section>
  </main>;
}
