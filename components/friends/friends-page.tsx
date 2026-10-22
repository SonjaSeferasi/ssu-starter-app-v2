'use client';
import Link from 'next/link';
import { useEffect,useState } from 'react';
import { ArrowLeft,Search,Users } from 'lucide-react';
import type { FriendStudent } from '../../lib/friendships';
import { useProfileGate,Avatar } from '../profile/profile-view';
import { SessionNotice } from '../navigation/section-page';
import { friendsRequest } from './client';
import { FriendActions } from './friend-actions';
import styles from './friends.module.css';
const views={friends:'My friends',incoming:'Received',outgoing:'Sent',discover:'Find students',blocked:'Blocked'};
type View=keyof typeof views;
function Connections(){
  const [view,setView]=useState<View>('friends'),[query,setQuery]=useState(''),[search,setSearch]=useState('');
  const [students,setStudents]=useState<FriendStudent[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [offset,setOffset]=useState(0),[more,setMore]=useState(false),[revision,setRevision]=useState(0);
  useEffect(()=>{const tab=new URLSearchParams(window.location.search).get('view');if(tab&&tab in views)setView(tab as View);},[]);
  useEffect(()=>{const timer=setTimeout(()=>{setSearch(query.trim());setOffset(0);},250);return ()=>clearTimeout(timer);},[query]);
  useEffect(()=>{const refresh=()=>setRevision(x=>x+1);window.addEventListener('focus',refresh);window.addEventListener('socialu-connections-changed',refresh);return ()=>{window.removeEventListener('focus',refresh);window.removeEventListener('socialu-connections-changed',refresh);};},[]);
  useEffect(()=>{
    let active=true;setLoading(true);setError('');
    friendsRequest(`?view=${view}&q=${encodeURIComponent(search)}&offset=${offset}`).then(data=>{if(active){setStudents(data.students);setMore(data.hasMore);}}).catch(reason=>{if(active)setError(reason.message);}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[view,search,offset,revision]);
  function switchView(next:View){setView(next);setQuery('');setSearch('');setOffset(0);window.history.replaceState(null,'',`/friends?view=${next}`);}
  return <main className={styles.page}>
    <Link href="/profile" className={styles.back}><ArrowLeft size={16}/>Back to profile</Link>
    <header className={styles.heading}><span className={styles.eyebrow}>Your campus connections</span><h1>Friends</h1><p>A familiar face. A new conversation. Your people, all in one place.</p></header>
    <nav className={styles.tabs} aria-label="Connections views">{Object.entries(views).map(([key,label])=><button key={key} aria-pressed={view===key} onClick={()=>switchView(key as View)}>{label}</button>)}</nav>
    <label className={styles.search}><Search size={18}/><span className={styles.srOnly}>{view==='friends'?'Search friends by name':'Search students by name or username'}</span><input value={query} onChange={event=>setQuery(event.target.value)} maxLength={100} placeholder={view==='friends'?'Search your friends by name…':'Search by name or username…'}/></label>
    {view==='blocked'&&<p className={styles.note}>Unblocking does not automatically restore a friendship.</p>}
    {view==='discover'&&search.length<2?<div className={styles.empty}><Search/><h2>Find someone you know</h2><p>Enter at least two characters of their name or username.</p></div>:loading?<p role="status" className={styles.empty}>Loading connections…</p>:error?<div role="alert" className={styles.error}>{error}<button onClick={()=>setRevision(x=>x+1)}>Try again</button></div>:!students.length?<div className={styles.empty}><Users/><h2>{search?'No matches found':view==='incoming'?'No pending requests':view==='outgoing'?'No sent requests':view==='blocked'?'No blocked students':'Your connections start here'}</h2><p>{search?'Try a different name or username.':view==='friends'?'Find a classmate and send your first friend request.':'You’re all caught up.'}</p>{view==='friends'&&!search&&<button onClick={()=>switchView('discover')}>Find students</button>}</div>:<ul className={styles.list} aria-label={views[view]}>{students.map(student=><li key={`${student.username}-${student.relationship.state}-${student.relationship.request_id}`} className={styles.student}>
      <div className={styles.identity}><Avatar url={student.photo_url} name={student.name}/><div>{view==='blocked'?<strong>{student.name}</strong>:<Link href={`/students/${encodeURIComponent(student.username)}`}>{student.name}</Link>}<p>@{student.username}</p></div></div>
      <FriendActions username={student.username} initial={student.relationship} onChanged={()=>setRevision(x=>x+1)}/>
    </li>)}</ul>}
    {!loading&&!error&&(offset>0||more)&&<nav className={styles.pagination} aria-label="Connections pages"><button disabled={offset===0} onClick={()=>setOffset(x=>Math.max(0,x-20))}>Previous</button><span>Page {offset/20+1}</span><button disabled={!more} onClick={()=>setOffset(x=>x+20)}>Next</button></nav>}
  </main>;
}
export function FriendsPage(){const gate=useProfileGate();return gate==='ready'?<Connections/>:<SessionNotice state={gate}/>;}
