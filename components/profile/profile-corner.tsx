'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, MapPin, Pencil, Plus, Settings2, Smile, Trash2, Users, X } from 'lucide-react';
import type { StudentProfile } from '../../lib/profile';
import { cornerInput, EMPTY_CORNER, LEGACY_VIBE_ICONS, VIBE_ICONS, type CampusCorner, type CampusGoal, type CornerAction, type VibeIcon } from '../../lib/profile-corner';
import { STICKER_CATEGORIES, findStickers, type StickerCategory } from '../../lib/profile-stickers';
import type { ProfileLook } from '../../lib/profile-space';
import { cornerArtworkFor, type CornerArtwork } from '../../lib/profile-corner-artwork';
import { profileFetch } from './profile-view';
import { StickerArt, STICKER_LABELS } from './profile-cover';
import styles from './profile-corner.module.css';

type Editor = 'vibe' | 'goals' | 'poll' | 'plan';
const titles: Record<Editor, string> = { vibe: 'Today’s vibe', goals: 'Campus bucket list', poll: 'Settle this for me', plan: 'A little study break' };
const dateLabel = (value: string) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const localDate = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export function ProfileCorner({ profile,look,artworkReady,onArtworkSaved }: { profile: StudentProfile;look:ProfileLook;artworkReady:boolean;onArtworkSaved:(look:ProfileLook)=>void }) {
  const artwork=cornerArtworkFor(look);
  const [artworkEditing,setArtworkEditing]=useState<'poll'|'plan'|null>(null);
  const [vibeIcons,setVibeIcons]=useState<readonly VibeIcon[]>(LEGACY_VIBE_ICONS);
  const [corner, setCorner] = useState<CampusCorner>(EMPTY_CORNER);
  const [status, setStatus] = useState<'loading' | 'ready' | 'preview' | 'error'>('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Editor | null>(null);
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [announcement, setAnnouncement] = useState('');
  const requestVersion = useRef(0);
  useEffect(() => {
    let active = true;
    const version = ++requestVersion.current;
    const load = () => profileFetch(`/api/profiles/corner?username=${encodeURIComponent(profile.username)}`)
      .then(({ response, data }) => {
        if (!response.ok) throw new Error(data.error || 'Your campus cards couldn’t load.');
        if (active && version === requestVersion.current) { setVibeIcons(Array.isArray(data.vibeIcons)?data.vibeIcons.filter((item:VibeIcon)=>VIBE_ICONS.includes(item)):LEGACY_VIBE_ICONS); setCorner(data.corner); setStatus(data.available ? 'ready' : 'preview'); setError(''); }
      }).catch(reason => { if (active && version === requestVersion.current) { setStatus('error'); setError(reason.message); } });
    load();
    // A mutation response must not be overwritten by an older focus refresh.
    return () => { active = false; };
  }, [profile.username, revision]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    const refresh = () => { if (!editing && !busy) setRevision(value => value + 1); setNow(Date.now()); };
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [editing, busy]);

  async function save(action: CornerAction, payload: Record<string, unknown>) {
    if (busy || status !== 'ready') throw new Error('Saving is not available yet.');
    const input = cornerInput({ action, payload, username: profile.username });
    requestVersion.current += 1;
    setBusy(true); setError(''); setAnnouncement('');
    try {
      const { response, data } = await profileFetch('/api/profiles/corner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
      if (!response.ok) throw new Error(data.error || 'Your changes couldn’t be saved.');
      setCorner(data.corner); setNow(Date.now()); setAnnouncement('Profile updated.');
    } finally { setBusy(false); }
  }
  function act(action: CornerAction, payload: Record<string, unknown>) {
    save(action, payload).catch(reason => setError(reason.message));
  }
  const poll = corner.poll;
  const plan = corner.plan;
  const pollClosed = !poll || poll.closed || Date.parse(poll.endsAt) <= now;
  const planEnded = !plan || plan.ended || Date.parse(plan.startsAt) <= now;
  const complete = corner.goals.filter(goal => goal.done).length;
  const disabled = busy || status !== 'ready';
  const edit = (kind: Editor) => profile.is_own && <button className={styles.iconButton} aria-label={`Edit ${titles[kind].toLowerCase()}`} onClick={() => setEditing(kind)}><Pencil size={15} /></button>;
  // Visitors see the same four cards; empty ones explain that nothing is shared yet.
  const firstName = profile.name.split(' ')[0] || profile.name;

  return <section className={styles.corner} aria-labelledby="campus-corner-title" aria-busy={busy}>
    <header className={styles.heading}><div><p>A LITTLE MORE PERSONAL</p><h2 id="campus-corner-title">{profile.is_own ? 'My corner of campus' : `${firstName}’s corner of campus`}</h2></div>{profile.is_own && <button className={styles.outline} onClick={() => setEditing('vibe')}><Settings2 size={15} />Customize</button>}</header>
    {status === 'loading' ? <p className={styles.hint} role="status">Loading campus cards…</p> : <div className={styles.grid}>
      <div className={styles.stack}>
        <section className={`${styles.card} ${styles.vibe}`}>
          <header><h3>Today’s vibe</h3>{edit('vibe')}</header>
          <div className={styles.vibeArt}><StickerArt kind={corner.vibe?.icon || 'sun'} /></div>
          {corner.vibe ? <><p className={styles.vibeText}>{corner.vibe.text}</p><p className={styles.hint}>Updated {dateLabel(corner.vibe.updatedAt)}</p></> : profile.is_own ? <div className={styles.empty}><strong>What’s the mood?</strong><p>A small update for the people who stop by.</p></div> : <div className={styles.empty}><strong>No vibe yet.</strong><p>{firstName} hasn’t shared today’s mood.</p></div>}
          {profile.is_own && <button className={styles.outline} onClick={() => setEditing('vibe')}><Pencil size={14} />{corner.vibe ? 'Change vibe' : 'Add your vibe'}</button>}
        </section>
        <section className={styles.card}>
          <header><h3>Campus bucket list</h3>{edit('goals')}</header>
          {corner.goals.length ? <><ul className={styles.goals}>{corner.goals.map(goal => <li key={goal.id}><label><input type="checkbox" checked={goal.done} disabled={!profile.is_own || disabled} onChange={() => act('save_goals', { goals: corner.goals.map(item => item.id === goal.id ? { ...item, done: !item.done } : item) })} /><span className={goal.done ? styles.done : ''}>{goal.text}</span></label></li>)}</ul><div className={styles.progress}><span>{complete} of {corner.goals.length}</span><progress max={corner.goals.length} value={complete} aria-label="Bucket list progress" /></div></> : <div className={styles.empty}><p>{profile.is_own ? 'Big plans or little wins. Keep a few things you’d like to try.' : `${firstName} hasn’t added any goals yet.`}</p></div>}
          {profile.is_own && <button className={styles.textButton} onClick={() => setEditing('goals')}><Plus size={14} />{corner.goals.length ? 'Edit goals' : 'Add a goal'}</button>}
        </section>
      </div>
      <div className={styles.stack}>
        <section className={styles.card}>
          <header><h3>Settle this for me</h3>{edit('poll')}</header>
          <p className={styles.subtitle}>A tiny poll for my campus people.</p>
          {poll ? <><h4 className={styles.question}>{poll.question}</h4><div className={styles.options}>{poll.options.map((option, index) => {
            const percent = poll.totalVotes ? Math.round(option.votes / poll.totalVotes * 100) : 0;
            return <button key={index} disabled={profile.is_own || disabled || pollClosed} aria-pressed={poll.choice === index} onClick={() => act('vote', { id: poll.id, choice: index })} className={poll.choice === index ? styles.chosen : ''}>
              <span className={styles.optionArt}><StickerArt kind={artwork.poll[index]} /></span><strong>{option.text}{poll.choice === index && <Check size={13} />}</strong><span className={styles.result}><span><i style={{ width: `${percent}%` }} /></span>{percent}%</span>
            </button>;
          })}</div><p className={styles.hint}>{poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'} · {pollClosed ? 'Poll ended' : `Ends ${dateLabel(poll.endsAt)}`}</p>{profile.is_own ? !pollClosed && <button className={styles.textButton} disabled={disabled} onClick={() => act('close_poll', { id: poll.id })}>End poll</button> : !pollClosed && <p className={styles.hint}>{poll.choice === null ? 'Choose an option to vote.' : 'Your vote is saved. You can change it until the poll ends.'}</p>}</> : <div className={styles.empty}><div className={styles.pollArt}><StickerArt kind={artwork.poll[0]} /><StickerArt kind={artwork.poll[1]} /></div>{profile.is_own ? <><strong>Give your classmates a say.</strong><p>Ask a question with two ways to go.</p></> : <><strong>No poll right now.</strong><p>Check back later to cast your vote.</p></>}{profile.is_own && <button className={styles.outline} onClick={() => setEditing('poll')}><Plus size={14} />Create a poll</button>}</div>}
          {profile.is_own&&<button type="button" className={styles.textButton} disabled={!artworkReady} onClick={()=>setArtworkEditing('poll')}><Smile size={14}/>Change poll stickers</button>}
        </section>
        <section className={`${styles.card} ${styles.plan}`}>
          <header><h3>Who’s up for a study break?</h3>{edit('plan')}</header>
          <div className={styles.planBody}><div className={styles.planArt}><StickerArt kind={artwork.plan} /></div><div>{plan ? <><span className={styles.planBadge}><Users size={13} />Campus buddy</span><h4>{plan.title}</h4><p className={styles.location}><MapPin size={14} />{plan.location}</p><p className={styles.hint}>{dateLabel(plan.startsAt)}</p></> : profile.is_own ? <div className={styles.empty}><strong>Make a little room for company.</strong><p>Share a time and place for a coffee or study break.</p></div> : <div className={styles.empty}><strong>No plans yet.</strong><p>When {firstName} shares a coffee or study break, you can join here.</p></div>}</div></div>
          {plan ? <><div className={styles.planFooter}><span>{planEnded ? 'This plan has started' : `${Math.max(0, plan.capacity - plan.joinedCount)} spots open`}<small>{plan.joinedCount} of {plan.capacity} people · includes the host</small></span>{profile.is_own ? <button className={styles.outline} disabled={disabled} onClick={() => act('cancel_plan', { id: plan.id })}>Cancel plan</button> : !planEnded && <button className={plan.joined ? styles.outline : styles.primary} disabled={disabled || (!plan.joined && plan.joinedCount >= plan.capacity)} onClick={() => act(plan.joined ? 'leave_plan' : 'join_plan', { id: plan.id })}>{plan.joined ? 'Leave plan' : plan.joinedCount >= plan.capacity ? 'Full' : 'I’m in'}</button>}</div>{plan.people.length > 0 && <p className={styles.guests}>Joining: {plan.people.map((person, index) => <span key={person.username}>{index > 0 && ', '}<Link href={`/students/${encodeURIComponent(person.username)}`}>{person.name}</Link></span>)}</p>}</> : profile.is_own && <button className={styles.outline} onClick={() => setEditing('plan')}><Plus size={14} />Make a plan</button>}
          {profile.is_own&&<button type="button" className={styles.textButton} disabled={!artworkReady} onClick={()=>setArtworkEditing('plan')}><Smile size={14}/>Change study-break sticker</button>}
        </section>
      </div>
    </div>}
    {status === 'preview' && profile.is_own && <p className={styles.hint}>Preview · Saving and student interactions will be available after profile setup is enabled.</p>}
    {(status === 'error' || error) && <p className={styles.error} role="alert">{error || 'Campus cards couldn’t load.'} <button className={styles.textButton} onClick={() => { setError(''); setRevision(value => value + 1); }}>Refresh cards</button></p>}
    <span className={styles.srOnly} role="status">{announcement}</span>
    {artworkEditing&&<CornerArtworkEditor card={artworkEditing} initial={artwork} optionLabels={poll?.options.map(item=>item.text)??['Option 1','Option 2']} onClose={()=>setArtworkEditing(null)} onSaved={value=>{onArtworkSaved(value);setArtworkEditing(null);setAnnouncement('Stickers saved to your profile.');}}/>}
    {editing && <CornerEditor vibeIcons={vibeIcons} kind={editing} corner={corner} available={status === 'ready'} busy={busy} onSelect={setEditing} onClose={() => setEditing(null)} onSave={save} />}
  </section>;
}

function CornerEditor({ vibeIcons, kind, corner, available, busy, onSelect, onClose, onSave }: {
  vibeIcons:readonly VibeIcon[]; kind: Editor; corner: CampusCorner; available: boolean; busy: boolean; onSelect: (kind: Editor) => void; onClose: () => void;
  onSave: (action: CornerAction, payload: Record<string, unknown>) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [stickerSearch,setStickerSearch]=useState('');
  const [stickerCategory,setStickerCategory]=useState<StickerCategory>('all');
  const choices=findStickers(stickerCategory,stickerSearch).filter(item=>vibeIcons.includes(item.kind));
  const [vibe, setVibe] = useState(corner.vibe?.text || '');
  const [icon, setIcon] = useState<VibeIcon>(corner.vibe?.icon || 'sun');
  const [goals, setGoals] = useState<CampusGoal[]>(corner.goals);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [endsAt, setEndsAt] = useState(localDate(new Date(Date.now() + 86400000)));
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const replacing = (kind === 'poll' && corner.poll) || (kind === 'plan' && corner.plan);
  useEffect(() => { setError(''); setConfirmed(false); }, [kind]);
  useEffect(() => {
    const element = dialog.current; const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal(); document.body.style.overflow = 'hidden';
    return () => { element?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (replacing && !confirmed) { setError('Confirm the replacement before saving.'); return; }
    const action: CornerAction = kind === 'vibe' ? 'save_vibe' : kind === 'goals' ? 'save_goals' : kind === 'poll' ? 'create_poll' : 'create_plan';
    const payload = kind === 'vibe' ? { text: vibe, icon } : kind === 'goals' ? { goals } : kind === 'poll' ? { question, options, endsAt: endsAt ? new Date(endsAt).toISOString() : '' } : { title, location, startsAt: startsAt ? new Date(startsAt).toISOString() : '', capacity };
    try { await onSave(action, payload); onClose(); } catch (reason) { setError((reason as Error).message); }
  }
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="corner-editor-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <form onSubmit={submit}>
      <header className={styles.editorHeader}><div><p>MAKE IT YOURS</p><h2 id="corner-editor-title">{titles[kind]}</h2></div><button type="button" className={styles.iconButton} aria-label="Close campus card editor" disabled={busy} onClick={onClose}><X size={20} /></button></header>
      <nav className={styles.editorTabs} aria-label="Choose a campus card">{(Object.keys(titles) as Editor[]).map(item => <button type="button" key={item} aria-pressed={item === kind} disabled={busy} onClick={() => onSelect(item)}>{item === 'vibe' ? 'Vibe' : item === 'goals' ? 'Bucket list' : item === 'poll' ? 'Poll' : 'Plan'}</button>)}</nav>
      <fieldset className={styles.fields} disabled={busy}>
        {kind === 'vibe' && <><label>Find a vibe sticker<input type="search" value={stickerSearch} placeholder="Coffee, cat, gaming…" onChange={event=>setStickerSearch(event.target.value)}/></label><div className={styles.vibeCategories} role="group" aria-label="Vibe sticker categories">{STICKER_CATEGORIES.map(category=><button type="button" key={category.id} aria-pressed={stickerCategory===category.id} onClick={()=>setStickerCategory(category.id)}>{category.label}</button>)}</div><p className={styles.help} role="status">{choices.length} {choices.length===1?'sticker':'stickers'}{vibeIcons.length>6?' to match your mood':''}</p><div className={styles.vibeChoices} aria-label="Vibe stickers">{choices.map(({kind:item,label}) => <button type="button" key={item} aria-label={`${label} vibe`} aria-pressed={icon === item} onClick={() => setIcon(item)}><StickerArt kind={item} /><span>{label}</span></button>)}</div>{!choices.length&&<p className={styles.help}>No stickers found. Try another search or category.</p>}<label>Your vibe<input value={vibe} maxLength={60} required placeholder="Surviving on coffee" onChange={event => setVibe(event.target.value)} /></label><div className={styles.vibePreview}><StickerArt kind={icon} /><p>{vibe || 'Your vibe goes here'}</p></div></>}
        {kind === 'goals' && <><p className={styles.help}>Up to eight things you’d like to try. Tick them off from your profile.</p><div className={styles.goalFields}>{goals.map((goal, index) => <div key={goal.id}><input aria-label={`Goal ${index + 1}`} required maxLength={80} value={goal.text} onChange={event => setGoals(current => current.map(item => item.id === goal.id ? { ...item, text: event.target.value } : item))} /><button type="button" className={styles.iconButton} aria-label={`Remove goal ${index + 1}`} onClick={() => setGoals(current => current.filter(item => item.id !== goal.id))}><Trash2 size={16} /></button></div>)}</div><button type="button" className={styles.outline} disabled={goals.length >= 8} onClick={() => setGoals(current => [...current, { id: crypto.randomUUID(), text: '', done: false }])}><Plus size={14} />Add a goal</button></>}
        {kind === 'poll' && <><label>Your question<input value={question} required maxLength={120} placeholder="Best way to survive finals?" onChange={event => setQuestion(event.target.value)} /></label>{options.map((option, index) => <label key={index}>Option {index + 1}<input value={option} required maxLength={60} placeholder={index === 0 ? 'Coffee + chaos' : 'Study group + snacks'} onChange={event => setOptions(current => current.map((item, i) => i === index ? event.target.value : item))} /></label>)}<label>Voting ends<input type="datetime-local" required value={endsAt} onChange={event => setEndsAt(event.target.value)} /></label><p className={styles.help}>One vote per classmate. They can change their vote until it ends.</p></>}
        {kind === 'plan' && <><label>What’s the plan?<input required value={title} maxLength={100} placeholder="Coffee after class?" onChange={event => setTitle(event.target.value)} /></label><label>Where?<input required value={location} maxLength={100} placeholder="Student center" onChange={event => setLocation(event.target.value)} /></label><div className={styles.fieldRow}><label>When?<input type="datetime-local" required value={startsAt} onChange={event => setStartsAt(event.target.value)} /></label><label>People, including you<input type="number" required min={2} max={20} value={capacity} onChange={event => setCapacity(Number(event.target.value))} /></label></div><p className={styles.help}>Your classmates can join from your profile. Times use your device’s time zone.</p></>}
        {replacing && <label className={styles.confirm}><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />{kind === 'poll' ? 'Start a new poll with zero votes. The current poll will be replaced.' : 'Replace the current plan. Classmates will need to join the new plan.'}</label>}
      </fieldset>
      <footer className={styles.editorFooter}><div aria-live="polite">{error ? <p className={styles.error} role="alert">{error}</p> : <p className={styles.help}>{available ? 'Saved cards are visible on your profile.' : 'Preview only · Saving isn’t enabled yet.'}</p>}{kind === 'vibe' && corner.vibe && <button type="button" className={styles.textButton} disabled={busy || !available} onClick={() => onSave('save_vibe', { clear: true }).then(onClose).catch(reason => setError(reason.message))}>Remove vibe</button>}</div><div><button type="button" className={styles.outline} disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className={styles.primary} disabled={busy || !available || (!!replacing && !confirmed)}>{busy ? 'Saving…' : 'Save to profile'}</button></div></footer>
    </form>
  </dialog>;
}

function CornerArtworkEditor({card,initial,optionLabels,onClose,onSaved}:{card:'poll'|'plan';initial:CornerArtwork;optionLabels:string[];onClose:()=>void;onSaved:(look:ProfileLook)=>void}) {
  const dialog=useRef<HTMLDialogElement>(null),lock=useRef(false);
  const [artwork,setArtwork]=useState(initial),[slot,setSlot]=useState(0);
  const [query,setQuery]=useState(''),[category,setCategory]=useState<StickerCategory>('all');
  const [saving,setSaving]=useState(false),[error,setError]=useState('');
  const choices=findStickers(category,query),selected=card==='poll'?artwork.poll[slot]:artwork.plan;
  useEffect(()=>{const element=dialog.current,previous=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;element?.showModal();document.body.style.overflow='hidden';return()=>{element?.close();document.body.style.overflow=overflow;previous?.focus();};},[]);
  async function save(event:FormEvent){
    event.preventDefault();if(lock.current)return;lock.current=true;setSaving(true);setError('');
    try{
      const body=card==='poll'?{card,stickers:artwork.poll}:{card,sticker:artwork.plan};
      const {response,data}=await profileFetch('/api/profiles/space',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(!response.ok)throw new Error(data.error||'Your stickers couldn’t be saved. Please try again.');
      onSaved(data.look);
    }catch(reason){setError(reason instanceof Error?reason.message:'Your stickers couldn’t be saved.');}finally{lock.current=false;setSaving(false);}
  }
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="card-stickers-title" onCancel={event=>{event.preventDefault();if(!saving)onClose();}}><form onSubmit={save} aria-busy={saving}>
    <header className={styles.editorHeader}><div><p>MAKE IT YOURS</p><h2 id="card-stickers-title">{card==='poll'?'Poll stickers':'Study-break sticker'}</h2></div><button type="button" className={styles.iconButton} disabled={saving} onClick={onClose} aria-label="Close sticker picker"><X size={20}/></button></header>
    <fieldset className={styles.editorFields} disabled={saving}>
      {card==='poll'?<div className={styles.artworkSlots} role="group" aria-label="Choose poll option to decorate">{artwork.poll.map((kind,index)=><button type="button" key={index} aria-pressed={slot===index} onClick={()=>setSlot(index)}><span><StickerArt kind={kind}/></span><strong>{optionLabels[index]||`Option ${index+1}`}</strong><small>{slot===index?'Choosing sticker':'Click to change'}</small></button>)}</div>:<div className={styles.vibePreview}><StickerArt kind={artwork.plan}/><p>{STICKER_LABELS[artwork.plan]}</p></div>}
      <label>Find a sticker<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Movies, games, coffee…"/></label>
      <div className={styles.vibeCategories} role="group" aria-label="Sticker categories">{STICKER_CATEGORIES.map(item=><button type="button" key={item.id} aria-pressed={category===item.id} onClick={()=>setCategory(item.id)}>{item.label}</button>)}</div>
      <p className={styles.help} role="status">{choices.length} stickers</p><div className={styles.vibeChoices} aria-label="Choose card sticker">{choices.map(item=><button type="button" key={item.kind} aria-label={`${item.label} sticker`} aria-pressed={selected===item.kind} onClick={()=>setArtwork(current=>card==='poll'?{...current,poll:current.poll.map((kind,index)=>index===slot?item.kind:kind) as CornerArtwork['poll']}:{...current,plan:item.kind})}><StickerArt kind={item.kind}/><span>{item.label}</span></button>)}</div>{!choices.length&&<p className={styles.help}>No stickers found. Try another search or category.</p>}
    </fieldset>
    <footer className={styles.editorFooter}><div aria-live="polite">{error?<p className={styles.error} role="alert">{error}</p>:<p className={styles.help}>Only the stickers change. Your votes and plans stay.</p>}</div><div><button type="button" className={styles.outline} disabled={saving} onClick={onClose}>Cancel</button><button type="submit" className={styles.primary} disabled={saving}>{saving?'Saving…':'Save stickers'}</button></div></footer>
  </form></dialog>;
}
