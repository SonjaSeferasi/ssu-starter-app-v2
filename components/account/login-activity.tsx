'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,Check,History,MapPin,Monitor,RefreshCw,ShieldCheck,Smartphone} from 'lucide-react';
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
  const [checkedAt,setCheckedAt]=useState<string|null>(null),[localPreview,setLocalPreview]=useState(false);
  useEffect(()=>{setLocalPreview(['localhost','127.0.0.1','::1'].includes(window.location.hostname));},[]);
  const [cursor,setCursor]=useState<string|null>(null),[nextCursor,setNextCursor]=useState<string|null>(null);
  useEffect(()=>{
    let ignore=false;
    const controller=new AbortController();
    const timeout=setTimeout(()=>{ignore=true;controller.abort();setError('Your activity is taking too long to load. Please try again.');setLoading(false);},20000);
    setLoading(true);setError('');
    (async()=>{
      try{
        const {response,data}=await profileFetch('/api/account/login-activity'+(cursor?'?cursor='+encodeURIComponent(cursor):''),{signal:controller.signal});
        if(!response.ok){if(!ignore&&(response.status===401||response.status===403)){setEntries([]);setNextCursor(null);setCheckedAt(null);}throw new Error(data.error||'Could not load your login activity.');}
        if(!ignore){const history=data as LoginHistory;setEntries(previous=>cursor?[...previous,...history.entries.filter(entry=>!previous.some(old=>old.id===entry.id))]:history.entries);setNextCursor(history.nextCursor);setCheckedAt(new Date().toISOString());}
      }catch(reason){if(!ignore)setError(reason instanceof Error?reason.message:'Please try again.');}
      finally{clearTimeout(timeout);if(!ignore)setLoading(false);}
    })();return()=>{ignore=true;clearTimeout(timeout);controller.abort();};
  },[revision,cursor]);
  function refresh(){setCursor(null);setRevision(x=>x+1);}
  async function endSession(){
    if(!selected||ending)return;
    setEnding(true);setActionError('');setMessage('');
    try{
      const {response,data}=await profileFetch('/api/account/login-activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:selected.id,confirm:true})});
      if(!response.ok)throw new Error(data.error||'Could not log out this device.');
      if(data.ended!==true||data.currentSessionActive!==true)throw new Error('Could not confirm device logout. Refresh your activity and try again.');
      setSelected(null);refresh();setMessage('That session has been logged out. Your current session is still active.');
    }catch(reason){setActionError(reason instanceof Error?reason.message:'Please try again.');}
    finally{setEnding(false);}
  }
  return <main className={styles.page}>
    <Link href="/profile/settings" className={styles.back}><ArrowLeft size={18}/>Account settings</Link>
    <section className={styles.panel} aria-labelledby="login-activity-title">
      <header className={styles.header}><div><p className={styles.eyebrow}>ACCOUNT SECURITY</p><h1 id="login-activity-title">Login Activity</h1><p>See where you’re signed in and manage other devices.</p><p className={styles.zone}>Dates and times shown in {timeZone}.</p></div><button type="button" onClick={refresh} disabled={loading} aria-label="Refresh login activity"><RefreshCw size={16} className={loading?styles.spinning:undefined}/><span>{loading?'Refreshing…':'Refresh'}</span></button></header>
      <div className={styles.privacy}><ShieldCheck size={17} aria-hidden="true"/><span>Only you can see your sign-in history.</span>{checkedAt&&<span className={styles.checked}>Checked {loginTime(checkedAt,timeZone)}</span>}</div>
      {message&&<p className={styles.success} role="status"><Check size={18} aria-hidden="true"/>{message}</p>}
      {error&&<div className={styles.error} role="alert"><p>{error}</p><div><button type="button" disabled={loading} onClick={()=>setRevision(x=>x+1)}>Try again</button><Link href="/login">Go to sign in</Link></div></div>}
      <div aria-live="polite" aria-busy={loading}>
        {loading&&!entries.length?<p className={styles.notice} role="status">Loading your activity…</p>:!entries.length&&!error?<div className={styles.notice}><History size={28}/><h2>No login activity yet</h2><p>New sign-ins will appear here once they are recorded.</p></div>:entries.length>0?<ul className={styles.list} aria-label="Recorded sign-ins">{entries.map((entry,index)=>{
          const isCurrent=entry.is_current&&entry.active;
          const DeviceIcon=/Android|iOS|iPhone|iPad/i.test(entry.device??'')?Smartphone:Monitor;
          return <li key={entry.id} className={`${styles.entry} ${isCurrent?styles.currentEntry:''}`}>
            <div className={styles.deviceIcon}><DeviceIcon size={23} aria-hidden="true"/></div>
            <div className={styles.details}>
              <strong>{entry.device||`Sign-in record ${index+1}`}</strong>
              {!entry.device&&<p className={styles.legacy}>Device details weren’t recorded for this sign-in.</p>}
              <p className={styles.timestamp}><span>Signed in </span><time dateTime={entry.signed_in_at}>{loginDate(entry.signed_in_at,timeZone)}<span aria-hidden="true"> · </span>{loginTime(entry.signed_in_at,timeZone)}</time></p>
              <p className={styles.location}><MapPin size={15} aria-hidden="true"/>{entry.location?<><span>{entry.location}</span><span className={styles.approximate}>Approximate</span></>:<span>Location not recorded</span>}</p>
              <div className={styles.badges}>{isCurrent&&<span className={styles.current}>This session</span>}<span className={entry.active?styles.active:styles.ended}><span className={styles.statusDot} aria-hidden="true"/>{entry.active?'Active':'Ended'}</span></div>
            </div>
            {canEndLoginSession(entry)&&<button className={styles.deviceLogout} type="button" disabled={ending||loading} onClick={()=>{setActionError('');setSelected(entry);}} aria-label={`Log out ${entry.device||'sign-in record '+(index+1)}`}>Log out device</button>}
          </li>;
        })}</ul>:null}
        {entries.length>0&&nextCursor&&<div className={styles.more}><button type="button" disabled={loading} onClick={()=>setCursor(nextCursor)}>{loading?'Loading…':'Load older sign-ins'}</button></div>}
      </div>
      <div className={styles.footnote}><p><strong>About locations</strong><br/>{localPreview?'This local preview does not receive hosting location data. Existing recorded locations still appear when available.':'Locations are approximate and may reflect a VPN or your network provider.'} Older sign-ins may have no recorded location.</p><p>Active status reflects the last successful check. Logging out another device ends its access to SocialU on its next request. You stay signed in here.</p></div>
    </section>
    <dialog ref={confirmation} className={styles.confirmation} aria-labelledby="logout-device-title" onCancel={event=>{if(ending)event.preventDefault();else setSelected(null);}}>
      <h2 id="logout-device-title">Log out this device?</h2>
      <div className={styles.selectedDevice}><strong>{selected?.device||'Selected sign-in'}</strong>{selected&&<p>{loginDate(selected.signed_in_at,timeZone)} · {loginTime(selected.signed_in_at,timeZone)}</p>}{selected?.location&&<p>{selected.location} · Approximate</p>}</div>
      <p>It will need to sign in again to use SocialU. You’ll stay signed in here.</p>
      {actionError&&<p role="alert" className={styles.actionError}>{actionError}</p>}
      <div className={styles.confirmActions}><button type="button" disabled={ending} onClick={()=>setSelected(null)} autoFocus>Cancel</button><button type="button" className={styles.logout} disabled={ending} onClick={endSession}>{ending?'Logging out…':'Log out device'}</button></div>
    </dialog>
  </main>;
}
