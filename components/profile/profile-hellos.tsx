'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { Coffee, Flower2, Heart, Pencil, Smile, Star, Sun, Trash2, X, type LucideIcon } from 'lucide-react';
import type { StudentProfile } from '../../lib/profile';
import { HELLO_COLORS, HELLO_DOODLES, helloText, type HelloColor, type HelloDoodle, type ProfileHello } from '../../lib/profile-space';
import { profileFetch } from './profile-view';
import { handwriting } from './handwriting';
import styles from './profile-space.module.css';

const doodleIcons: Record<Exclude<HelloDoodle, 'none'>, LucideIcon> = { heart: Heart, smile: Smile, star: Star, sun: Sun, flower: Flower2, coffee: Coffee };

function Doodle({ kind }: { kind: HelloDoodle }) {
  if (kind === 'none') return null;
  const Icon = doodleIcons[kind];
  return <Icon className={styles.doodle} data-doodle={kind} size={24} strokeWidth={2} aria-hidden="true" />;
}

export function ProfileHellos({profile,notes,status,onUpdate,onRetry}: {
  profile:StudentProfile;notes:ProfileHello[];status:'loading'|'ready'|'preview'|'error';onUpdate:(notes:ProfileHello[])=>void;onRetry:()=>void;
}) {
  const [text,setText]=useState(''); const [color,setColor]=useState<HelloColor>('pink'); const [doodle,setDoodle]=useState<HelloDoodle>('heart');
  const [writing,setWriting]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  useEffect(()=>{setText('');setError('');setWriting(false);},[profile.username]);
  async function send(event:FormEvent) {
    event.preventDefault(); if(busy||status!=='ready')return;
    let message;try{message=helloText(text);}catch(reason){setError((reason as Error).message);return;}
    setBusy(true);setError('');
    try {
      const {response,data}=await profileFetch('/api/profiles/space',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:profile.username,text:message,color,doodle})});
      if(!response.ok)throw new Error(data.error||'Unable to leave your note.');
      onUpdate(data.notes);setText('');setWriting(false);
    }catch(reason){setError(reason instanceof Error?reason.message:'Unable to leave your note.');}finally{setBusy(false);}
  }
  async function remove(noteId:number) {
    if(busy||status!=='ready')return;
    setBusy(true);setError('');
    try {
      const {response,data}=await profileFetch('/api/profiles/space',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:profile.username,noteId})});
      if(!response.ok)throw new Error(data.error||'Unable to remove this note.');
      onUpdate(data.notes);
    }catch(reason){setError(reason instanceof Error?reason.message:'Unable to remove this note.');}finally{setBusy(false);}
  }
  return <section className={styles.noteCard} aria-labelledby="profile-hellos-title">
    <header className={styles.noteHeader}><h2 id="profile-hellos-title">Leave a little hello</h2></header>
    {status==='loading'?<p className={styles.emptyNotes} role="status">Loading notes…</p>:notes.length>0?<ul className={styles.notes}>{notes.map(note=><li key={note.id} className={styles.note} data-color={note.color}>
      <p className={handwriting.className}>{note.text}</p>
      <footer><Doodle kind={note.doodle}/><Link href={`/students/${encodeURIComponent(note.username)}`} className={handwriting.className}>— {note.name}</Link></footer>
      <time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</time>
      {note.canRemove&&<button className={styles.removeNote} disabled={busy} onClick={()=>remove(note.id)} aria-label={`Remove note by ${note.name}`}><Trash2 size={13}/></button>}
    </li>)}</ul>:<p className={styles.emptyNotes}>{profile.is_own?'A small place for hellos from your classmates.':'Be the first to leave a friendly note.'}</p>}
    {!profile.is_own&&(writing?<form className={styles.noteForm} onSubmit={send}>
      <div className={styles.draft} data-color={color}>
        <label htmlFor="profile-hello" className={styles.srOnly}>Write a note</label>
        <textarea id="profile-hello" className={handwriting.className} maxLength={160} autoFocus placeholder="Say hello, share some encouragement…" value={text} onChange={event=>setText(event.target.value)} disabled={busy||status!=='ready'}/>
        <Doodle kind={doodle}/>
      </div>
      <fieldset className={styles.picker} disabled={busy}><legend>Paper</legend>{HELLO_COLORS.map(item=><button key={item} type="button" className={styles.swatch} data-color={item} aria-label={`${item} paper`} aria-pressed={color===item} onClick={()=>setColor(item)}/>)}</fieldset>
      <fieldset className={styles.picker} disabled={busy}><legend>Doodle</legend>{HELLO_DOODLES.map(item=>{
        const Icon=item==='none'?X:doodleIcons[item];
        return <button key={item} type="button" className={styles.doodleChoice} aria-label={item==='none'?'No doodle':`${item} doodle`} aria-pressed={doodle===item} onClick={()=>setDoodle(item)}><Icon size={17} aria-hidden="true"/></button>;
      })}</fieldset>
      <div className={styles.formActions}><span>{text.length}/160</span><button type="button" className={styles.secondaryButton} disabled={busy} onClick={()=>{setWriting(false);setError('');}}>Cancel</button><button type="submit" disabled={busy||status!=='ready'||!text.trim()}>{busy?'Sticking…':'Stick it on'}</button></div>
    </form>:<button type="button" className={styles.writeNote} disabled={status!=='ready'} onClick={()=>setWriting(true)}><Pencil size={17}/>Write a note</button>)}
    {status==='preview'&&<p className={styles.hint}>Notes are in preview. Posting isn’t available yet.</p>}
    {status==='error'&&<p className={styles.error}>Notes couldn’t load. <button className={styles.retry} onClick={onRetry}>Retry</button></p>}
    {error&&<p className={styles.error} role="alert">{error}</p>}
  </section>;
}
