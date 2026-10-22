'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { CHAT_LIMIT } from '../../lib/dormspace-multiplayer';
import { SERVER_LIVE_UI,emptyLiveMessages } from '../../lib/dormspace-live-store';
import { useLiveRoster } from './live-players';
import type { DormLive } from './use-dorm-live';
import styles from './dormspace.module.css';

export function DormLiveChat({live,location}:{live:DormLive;location:string}) {
  const ui=useSyncExternalStore(live.store.subscribeUI,live.store.getUI,()=>SERVER_LIVE_UI);
  const messages=useSyncExternalStore(live.store.subscribeChat,live.store.getMessages,emptyLiveMessages);
  const players=useLiveRoster(live);
  const [draft,setDraft]=useState(''),[sending,setSending]=useState(false),[error,setError]=useState('');
  const retry=useRef<{text:string;id:string}|null>(null),log=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(log.current)log.current.scrollTop=log.current.scrollHeight;},[messages]);
  async function send(event:React.FormEvent) {
    event.preventDefault();if(sending||!draft.trim())return;
    const text=draft.trim();if(retry.current?.text!==text)retry.current={text,id:crypto.randomUUID()};
    setSending(true);setError('');const result=await live.say(text,retry.current!.id);setSending(false);
    if(result.ok){setDraft(current=>current.trim()===text?'':current);retry.current=null;}
    else setError(result.error??'Your message was not sent.');
  }
  return <section className={styles.liveChat} aria-label="Nearby chat">
    <div className={styles.chatHeading}><div><h3>Nearby chat</h3><p>{location} · only players here can hear you</p></div>
      <span className={styles.liveStatus} data-live-status={ui.status} role="status">{ui.status==='online'?`${players.length} ${players.length===1?'player':'players'} here`:ui.status==='connecting'?'Joining…':'Disconnected'}</span>
    </div>
    {ui.notice?<p className={styles.notice}>{ui.notice}</p>:null}
    {ui.status!=='online'&&ui.status!=='connecting'?<button type="button" className={styles.button} onClick={live.reconnect}>Reconnect multiplayer</button>:null}
    <div ref={log} className={styles.chatLog} role="log" aria-label="Nearby messages" aria-live="polite" aria-relevant="additions text">
      {messages.length?messages.map(message=><p key={message.id} data-chat-message={message.id}><strong>{message.username}{message.playerId===ui.selfId?' (you)':''}</strong><span>{message.text}</span></p>):<p className={styles.chatEmpty}>Say hello. Your message will also appear above your avatar.</p>}
    </div>
    <form className={styles.chatForm} onSubmit={send}>
      <label htmlFor="dormspace-chat">Message players here</label>
      <div><input id="dormspace-chat" value={draft} onChange={event=>setDraft(event.target.value)} maxLength={CHAT_LIMIT} autoComplete="off" placeholder="Say something…" disabled={ui.status!=='online'} aria-describedby="dormspace-chat-limit"/>
        <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={sending||ui.status!=='online'||!draft.trim()}>{sending?'Sending…':'Send'}</button></div>
      <span id="dormspace-chat-limit" className={styles.hint}>{draft.length}/{CHAT_LIMIT}</span>
    </form>
    {error?<p className={styles.error} role="alert">{error}</p>:null}
  </section>;
}
