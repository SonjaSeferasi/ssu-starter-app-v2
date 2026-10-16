'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, UserPlus, UserCheck } from 'lucide-react';
import type { Relationship } from '../../lib/friendships';
import { friendsRequest } from './client';
import { ConfirmDialog } from './confirm-dialog';
import styles from './friends.module.css';
export function FriendActions({ username, initial, onChanged, inProfile=false }: {username:string;initial?:Relationship;onChanged?:()=>void;inProfile?:boolean}) {
  const router=useRouter();
  const [relation,setRelation]=useState<Relationship|null>(initial??null);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [confirm,setConfirm]=useState<'remove'|'block'|'unblock'|null>(null);
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    if(initial)return;
    const refresh=()=>setRetry(value=>value+1);
    window.addEventListener('focus',refresh);
    return ()=>window.removeEventListener('focus',refresh);
  },[initial]);
  useEffect(()=>{
    if(initial){setRelation(initial);setError('');return;}
    let active=true;setError('');setRelation(null);
    friendsRequest(`?view=relation&username=${encodeURIComponent(username)}`).then(data=>{if(active)setRelation(data);}).catch(reason=>{if(active)setError(reason.message);});
    return ()=>{active=false;};
  },[username,initial,retry]);
  async function act(action:string) {
    if(busy)return;setBusy(true);setError('');
    try {
      const data=await friendsRequest('',{action,username,requestId:relation?.request_id});
      if(action==='message'){router.push(`/messages/${encodeURIComponent(data.conversation_id)}`);return;}
      setRelation(action==='unblock'?{state:'none',request_id:null}:data);setConfirm(null);
      window.dispatchEvent(new Event('socialu-connections-changed'));
      onChanged?.();
      if(action==='block'&&inProfile)router.push('/friends?view=blocked');
    } catch(reason){setError(reason instanceof Error?reason.message:'Unable to update your connection.');}
    finally{setBusy(false);}
  }
  return <div className={styles.connectionActions}>
    <div className={styles.actions}>
      {!relation && <button disabled className={styles.secondary}>Loading connection…</button>}
      {relation?.state==='none' && <button disabled={busy} onClick={()=>void act('send')}><UserPlus/>Add friend</button>}
      {relation?.state==='sent' && <button disabled={busy} className={styles.secondary} onClick={()=>void act('cancel')}>Cancel request</button>}
      {relation?.state==='received' && <><button disabled={busy} onClick={()=>void act('accept')}><UserCheck/>Accept</button><button disabled={busy} className={styles.secondary} onClick={()=>void act('decline')}>Decline</button></>}
      {relation?.state==='friends' && <><button disabled={busy} onClick={()=>void act('message')}><MessageCircle/>Message</button><button disabled={busy} className={styles.secondary} onClick={()=>{setError('');setConfirm('remove');}}>Remove friend</button></>}
      {relation?.state==='blocked'?<button disabled={busy} className={styles.secondary} onClick={()=>{setError('');setConfirm('unblock');}}>Unblock</button>:relation&&<button disabled={busy} className={styles.quiet} onClick={()=>{setError('');setConfirm('block');}}>Block</button>}
    </div>
    {relation?.state==='sent' && <p className={styles.note} role="status">Friend request sent. When accepted, you’ll follow each other.</p>}
    {error&&!confirm&&<p role="alert" className={styles.error}>{error} <button className={styles.quiet} onClick={()=>{setError('');if(initial)onChanged?.();else setRetry(x=>x+1);}}>Refresh</button></p>}
    {confirm&&<ConfirmDialog title={`${confirm==='remove'?'Remove friend':confirm==='block'?'Block student':'Unblock student'}?`} confirmLabel={confirm==='remove'?'Remove friend':confirm==='block'?'Block':'Unblock'} busy={busy} error={error} onClose={()=>setConfirm(null)} onConfirm={()=>void act(confirm)}>
      <p>{confirm==='remove'?`Remove @${username} from your friends? Your conversation history is kept, but you will need a new connection or messaging consent to continue chatting.`:confirm==='block'?`Block @${username}? This ends your friendship and pending requests, removes follows, and prevents direct contact. They won't be notified.`:`Unblock @${username}? This does not restore your previous friendship or follows. Either of you can send a new friend request.`}</p>
    </ConfirmDialog>}
  </div>;
}
