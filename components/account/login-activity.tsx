'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,History,MapPin,Monitor,RefreshCw} from 'lucide-react';
import {profileFetch} from '../profile/profile-view';
import {loginDate,loginTime} from '../../lib/login-activity-format';
import type {LoginEntry,LoginHistory} from '../../lib/login-activity';
import {canEndLoginSession} from '../../lib/login-session-options';
import styles from './login-activity.module.css';
export function LoginActivity(){
  const [timeZone,setTimeZone]=useState('UTC');
  useEffect(()=>{setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);},[]);
  const [entries,setEntries]=useState<LoginEntry[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  const [selected,setSelected]=useState<LoginEntry|null>(null),[ending,setEnding]=useState(false),[actionError,setActionError]=useState(''),[message,setMessage]=useState('');
  const confirmation=useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(selected)confirmation.current?.showModal();else confirmation.current?.close();},[selected]);
  const [cursor,setCursor]=useState<string|null>(null),[nextCursor,setNextCursor]=useState<string|null>(null);
  useEffect(()=>{
    let ignore=false;
    setLoading(true);setError('');
    (async()=>{
      try{
        const {response,data}=await profileFetch('/api/account/login-activity'+(cursor?'?cursor='+encodeURIComponent(cursor):''));
        if(!response.ok)throw new Error(data.error||'Could not load your login activity.');
        if(!ignore){const history=data as LoginHistory;setEntries(previous=>cursor?[...previous,...history.entries.filter(entry=>!previous.some(old=>old.id===entry.id))]:history.entries);setNextCursor(history.nextCursor);}
      }catch(reason){if(!ignore)setError(reason instanceof Error?reason.message:'Please try again.');}
      finally{if(!ignore)setLoading(false);}
    })();return()=>{ignore=true;};
  },[revision,cursor]);
  function refresh(){setCursor(null);setEntries([]);setNextCursor(null);setRevision(x=>x+1);}
  async function endSession(){
    if(!selected||ending)return;
    setEnding(true);setActionError('');setMessage('');
    try{
      const {response,data}=await profileFetch('/api/account/login-activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:selected.id,confirm:true})});
      if(!response.ok)throw new Error(data.error||'Could not log out this device.');
      setSelected(null);refresh();setMessage('That session has been logged out. Your current session is still active.');
    }catch(reason){setActionError(reason instanceof Error?reason.message:'Please try again.');}
    finally{setEnding(false);}
  }
  return <main className={styles.page}>
    <Link href="/profile/settings" className={styles.back}><ArrowLeft size={18}/>Account settings</Link>
    <section className={styles.panel} aria-labelledby="login-activity-title">
      <header className={styles.header}><div><p className={styles.eyebrow}>ACCOUNT SECURITY</p><h1 id="login-activity-title">Login Activity</h1><p>Review the sign-ins recorded for your account.</p><p className={styles.zone}>Dates and times shown in {timeZone}.</p></div><button type="button" onClick={refresh} disabled={loading}><RefreshCw size={16}/>Refresh</button></header>
      {message&&<p className={styles.success} role="status">{message}</p>}
      <div aria-live="polite" aria-busy={loading}>
        {loading&&!entries.length?<p className={styles.notice} role="status">Loading your activity…</p>:error?<div className={styles.notice} role="alert"><p>{error}</p><button type="button" onClick={()=>setRevision(x=>x+1)}>Try again</button><Link href="/login">Go to sign in</Link></div>:!entries.length?<div className={styles.notice}><History size={28}/><h2>No login activity yet</h2><p>New sign-ins will appear here once they are recorded.</p></div>:<ul className={styles.list} aria-label="Recorded sign-ins">{entries.map((entry,index)=><li key={entry.id} className={styles.entry}><Monitor size={20} aria-hidden="true"/><div className={styles.details}><strong>{entry.device||`Sign-in record ${index+1}`}</strong><p className={styles.timestamp}><time dateTime={entry.signed_in_at}>{loginDate(entry.signed_in_at,timeZone)}<span aria-hidden="true"> · </span>{loginTime(entry.signed_in_at,timeZone)}</time></p><p className={styles.location}><MapPin size={14} aria-hidden="true"/>{entry.location?`${entry.location} · Approximate`:'Location unavailable'}</p></div><div className={styles.badges}>{entry.is_current&&entry.active&&<span className={styles.current}>This session</span>}<span className={entry.active?styles.active:styles.ended}>{entry.active?'Active':'Ended'}</span>{canEndLoginSession(entry)&&<button type="button" disabled={ending||loading} onClick={()=>{setActionError('');setSelected(entry);}} aria-label={`Log out ${entry.device||'sign-in record '+(index+1)}`}>Log out</button>}</div></li>)}</ul>}
        {entries.length>0&&nextCursor&&!error&&<div className={styles.more}><button type="button" disabled={loading} onClick={()=>setCursor(nextCursor)}>{loading?'Loading…':'Load older sign-ins'}</button></div>}
      </div>
      <p className={styles.footnote}>Only your account can view this activity. Active status reflects the latest session check; select Refresh to check again. Locations are approximate and can reflect a VPN. Location is unavailable for older records and when the host supplies no location. A logged-out session cannot use authenticated SocialU features again, including after token refresh; that device will be asked to sign in on its next request.</p>
    </section>
    <dialog ref={confirmation} className={styles.confirmation} aria-labelledby="logout-device-title" onCancel={event=>{if(ending)event.preventDefault();else setSelected(null);}}>
      <h2 id="logout-device-title">Log out this device?</h2>
      <p>{selected?.device||'This sign-in'}{selected?.location?` · ${selected.location}`:''}</p>
      <p>It will need to sign in again to use SocialU. You’ll stay signed in here.</p>
      {actionError&&<p role="alert" className={styles.actionError}>{actionError}</p>}
      <div className={styles.confirmActions}><button type="button" disabled={ending} onClick={()=>setSelected(null)} autoFocus>Cancel</button><button type="button" className={styles.logout} disabled={ending} onClick={endSession}>{ending?'Logging out…':'Log out device'}</button></div>
    </dialog>
  </main>;
}
