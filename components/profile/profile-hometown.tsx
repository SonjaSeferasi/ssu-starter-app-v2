'use client';
import {useRef,useState,type FormEvent} from 'react';
import {MapPin,Pencil} from 'lucide-react';
import {hometownInput} from '../../lib/profile-space';
import {PROFILE_COUNTRIES,countryByCode,countryFlag,countryInput} from '../../lib/profile-countries';
import {profileFetch} from './profile-view';
import styles from './profile-about.module.css';
export function ProfileHometown({value,countryCode,own,ready,onSaved}:{value:string;countryCode:string;own:boolean;ready:boolean;onSaved:(value:string,countryCode:string)=>void}){
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(value),[country,setCountry]=useState(countryCode),[query,setQuery]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false);
 const normalize=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const matching=PROFILE_COUNTRIES.filter(item=>normalize(`${item.name} ${item.code}`).includes(normalize(query.trim())));
 const selected=countryByCode(country);const choices=selected&&!matching.some(item=>item.code===country)?[selected,...matching]:matching;
 const name=countryByCode(countryCode)?.name,label=[value,name].filter(Boolean).join(', ');
 function edit(){setDraft(value);setCountry(countryCode);setQuery('');setError('');setEditing(true);}
 async function save(event:FormEvent){
  event.preventDefault();if(lock.current)return;
  let hometown,selected;try{hometown=hometownInput(draft);selected=countryInput(country);}catch(reason){setError((reason as Error).message);return;}
  lock.current=true;setBusy(true);setError('');
  try{const {response,data}=await profileFetch('/api/profiles/space',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({field:'hometown',value:hometown,countryCode:selected})});if(!response.ok)throw new Error(data.error||'Where you’re from couldn’t be saved.');onSaved(data.look.hometown??'',data.look.homeCountry??'');setEditing(false);}catch(reason){setError(reason instanceof Error?reason.message:'Please try again.');}finally{lock.current=false;setBusy(false);}
 }
 if(!editing)return label?<div className={styles.hometown}>{countryCode?<span className={styles.countryFlag} aria-hidden="true">{countryFlag(countryCode)}</span>:<MapPin size={17} aria-hidden="true"/>}<span><small>Where I’m from</small>{label}</span>{own&&<button type="button" aria-label="Edit where you’re from" disabled={!ready} onClick={edit}><Pencil size={14}/></button>}</div>:own?<button type="button" className={styles.addHometown} disabled={!ready} onClick={edit}><MapPin size={15}/>Add where you’re from</button>:null;
 return <form className={styles.hometownForm} onSubmit={save} aria-busy={busy}>
  <label htmlFor="profile-country-search">Find your country or region<input id="profile-country-search" type="search" value={query} autoFocus placeholder="Search countries…" disabled={busy} onChange={event=>setQuery(event.target.value)}/></label>
  <label htmlFor="profile-country">Country or region<select id="profile-country" value={country} disabled={busy} onChange={event=>{setCountry(event.target.value);setQuery('');}}><option value="">Not shown</option>{choices.map(item=><option key={item.code} value={item.code}>{countryFlag(item.code)} {item.name}</option>)}</select></label>
  {!matching.length&&<p role="status">No matching countries or regions.</p>}
  <label htmlFor="profile-hometown">City or hometown <small>Optional</small><input id="profile-hometown" value={draft} maxLength={80} placeholder="e.g. Hanoi" disabled={busy} onChange={event=>setDraft(event.target.value)}/></label>
  <p>Visible on your profile. Choose “Not shown” and leave the city blank to hide this section.</p>{error&&<p className={styles.hometownError} role="alert">{error}</p>}
  <div><button type="button" disabled={busy} onClick={()=>setEditing(false)}>Cancel</button><button type="submit" disabled={busy}>{busy?'Saving…':'Save'}</button></div>
 </form>;
}
