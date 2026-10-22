'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { accessToken,clearSession } from '../../lib/account/session';
import { ConfirmDialog } from './confirm-dialog';
import styles from './friends.module.css';
export function DeactivateAccount(){
  const router=useRouter();
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [password,setPassword]=useState(''),[confirmation,setConfirmation]=useState('');
  async function deactivate(){
    if(busy)return;
    if(!password||confirmation!=='DEACTIVATE'){setError('Enter your current password and type DEACTIVATE.');return;}
    setBusy(true);setError('');
    try{
      const token=await accessToken();
      if(!token)throw new Error('Please sign in again.');
      const response=await fetch('/api/account/deactivate',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({password,confirm:confirmation})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'Unable to deactivate your account.');
      clearSession();window.dispatchEvent(new Event('socialu-session-changed'));router.replace('/login?deactivated=done');
    }catch(reason){setError(reason instanceof Error?reason.message:'Unable to deactivate your account.');}
    finally{setBusy(false);}
  }
  return <div className={styles.deactivation}>
    <h2>Deactivate account</h2><p>Take a break from SocialU. Your profile and data are kept so you can return later.</p>
    <button className={styles.danger} onClick={()=>{setOpen(true);setError('');setPassword('');setConfirmation('');}}>Deactivate account</button>
    {open&&<ConfirmDialog title="Deactivate your account?" busy={busy} error={error} confirmLabel="Deactivate account" onConfirm={()=>void deactivate()} onClose={()=>setOpen(false)}>
      <p>Your profile will be hidden and you will be signed out of all sessions. Your posts, friendships, and messages are kept. To return, sign in and confirm reactivation.</p>
      <label className={styles.field}>Current password<input type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} disabled={busy}/></label>
      <label className={styles.field}>Type DEACTIVATE to confirm<input value={confirmation} onChange={event=>setConfirmation(event.target.value)} disabled={busy} autoComplete="off"/></label>
    </ConfirmDialog>}
  </div>;
}
