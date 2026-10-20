'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { accessToken, storedAccessToken } from '../../lib/account/session';
import { DormLiveStore } from '../../lib/dormspace-live-store';
import { subscribeToDormSpace } from '../../lib/dormspace-live-client';
import { LIVE_SYNC_MS, LIVE_UPDATE_MS, liveLocationKey, type LiveLocation, type LiveReply, type LiveRoom, type LiveState } from '../../lib/dormspace-multiplayer';
import type { Position } from '../../lib/dormspace-movement';

export type DormLive = {
  store: DormLiveStore; local: LiveState; connectionId: string;
  move: (position: Position)=>void; setLocal: (patch: Partial<LiveState>)=>void;
  say: (text: string,messageId: string)=>Promise<{ok:boolean;error?:string}>;
  reconnect: ()=>void;
  onRestRejected: (callback: (message:string)=>void)=>()=>void;
  onCorrection: (callback:(position:Position)=>void)=>()=>void;
};

export function useDormLive(location: LiveLocation | null,onRoom: (room: LiveRoom)=>void,onDenied: (message:string)=>void): DormLive {
  const key=liveLocationKey(location), [attempt,retry]=useState(0);
  const callbacks=useRef({onRoom,onDenied}); callbacks.current={onRoom,onDenied};
  const joins=useRef<Promise<unknown>>(Promise.resolve());
  const live=useMemo(()=>{
    const store=new DormLiveStore(), rejected=new Set<(message:string)=>void>(),corrections=new Set<(position:Position)=>void>();
    const result: DormLive & { rejectRest:(message:string)=>void;correct:(position:Position)=>void }={store,local:{x:20,y:20,facing:'down',moving:false,sprinting:false,restItemId:null},connectionId:'',
      move(position){Object.assign(result.local,position);},setLocal(patch){Object.assign(result.local,patch);},
      say:async()=>({ok:false,error:'Connect to DormSpace before sending a message.'}),reconnect:()=>retry(n=>n+1),
      onRestRejected(callback){rejected.add(callback);return()=>{rejected.delete(callback);};},rejectRest(message){rejected.forEach(fn=>fn(message));},
      onCorrection(callback){corrections.add(callback);return()=>{corrections.delete(callback);};},correct(position){Object.assign(result.local,position);corrections.forEach(fn=>fn(position));}};
    return result;
  },[key]);

  useEffect(()=>{
    if(!location)return;
    let disposed=false,joined=false,everJoined=false,busy=false,socketLive=false,sequence=0,lastSent=0,lastSync=0,lastSignature='',lastPrune=0,lastToken='';
    let stopSocket=()=>{};
    const connection=crypto.randomUUID(); live.connectionId=connection;
    live.store.setStatus('connecting');
    async function call(action:string,extra:Record<string,unknown>={},keepalive=false) {
      const token=keepalive?storedAccessToken():await accessToken();
      if(token)lastToken=token;
      const controller=new AbortController(),timeout=window.setTimeout(()=>controller.abort(),7000);
      try{const response=await fetch('/api/dorm/live',{method:'POST',cache:'no-store',keepalive,signal:controller.signal,
        headers:{'Content-Type':'application/json',Authorization:`Bearer ${token??(keepalive?lastToken:'')}`},body:JSON.stringify({action,connectionId:connection,...extra})});
      const data=await response.json().catch(()=>({}));
      return {ok:response.ok,status:response.status,data};}finally{window.clearTimeout(timeout);}
    }
    function accept(data:LiveReply) {
      if(disposed||!joined)return;
      live.store.reply(data);
      if(data.players)lastSync=performance.now();
      if(data.room)callbacks.current.onRoom(data.room);
    }
    async function failure(status:number,data:{error?:string;code?:string}) {
      if(disposed)return;
      if(status===401 || status===403){joined=false;stopSocket();live.store.clear();live.store.setStatus('offline',data.error||'Your visit has ended.');callbacks.current.onDenied(data.error||'Your visit has ended.');return;}
      if(data.code==='DS409'){joined=false;stopSocket();live.store.clear();live.store.setStatus('replaced',data.error||'Reconnect to join again.');return;}
      if(data.code==='DS408'){joined=false;stopSocket();live.store.setStatus('connecting');joins.current=joins.current.catch(()=>{}).then(join);return;}
      if(data.code==='DS410'){live.local.restItemId=null;live.rejectRest(data.error||'That furniture is occupied.');return;}
      if(data.code==='DS400'){
        live.local.restItemId=null;live.rejectRest(data.error||'The furniture moved.');
        const sync=await call('sync');if(sync.ok)accept(sync.data);return;
      }
      if(status===400||status===429)return;
      live.store.setStatus(status===503?'unavailable':'offline',data.error||'Connection interrupted. Trying again…');
    }
    async function join() {
      if(disposed)return;
      try{
        if(everJoined||attempt>0){live.local.restItemId=null;live.local.moving=false;live.rejectRest('');}
        const initialState={...live.local};
        const result=await call('join',{location,state:initialState});
        if(disposed){if(result.ok)await call('leave',{},true).catch(()=>{});return;}
        if(!result.ok){await failure(result.status,result.data);return;}
        joined=true;everJoined=true;accept(result.data);
        if(result.data.self?.state&&location?.kind==='room'&&(result.data.self.state.x!==initialState.x||result.data.self.state.y!==initialState.y))live.correct({x:result.data.self.state.x,y:result.data.self.state.y});
        live.store.setStatus('online');
        stopSocket=subscribeToDormSpace(event=>live.store.event(event),value=>{socketLive=value;});
      }catch{if(!disposed)live.store.setStatus('offline','Connection interrupted. Reconnect to join again.');}
    }
    // Serialize joins across Strict Mode and location changes. An old response cannot move the
    // active connection back into a previous room or remove the replacement tab's player.
    joins.current=joins.current.catch(()=>{}).then(join);
    const timer=window.setInterval(()=>{
      if(disposed)return;
      const now=performance.now();
      if(now-lastPrune>1000){live.store.prune();lastPrune=now;}
      if(!joined||busy||document.visibilityState==='hidden')return;
      const signature=JSON.stringify(live.local),sync=now-lastSync>(socketLive?LIVE_SYNC_MS:600);
      if(signature===lastSignature&&!sync||now-lastSent<LIVE_UPDATE_MS)return;
      busy=true;lastSent=now;const state={...live.local};
      void call('update',{state,sequence:++sequence,snapshot:sync}).then(async result=>{
        if(disposed)return;
        if(result.ok){lastSignature=JSON.stringify(state);accept(result.data);live.store.setStatus('online');}
        else await failure(result.status,result.data);
      }).catch(()=>{if(!disposed)live.store.setStatus('offline','Connection interrupted. Trying again…');}).finally(()=>{busy=false;});
    },LIVE_UPDATE_MS);
    live.say=async(text,messageId)=>{
      if(!joined||disposed)return{ok:false,error:'Reconnect before sending a message.'};
      try{const result=await call('say',{text,messageId});if(result.ok){accept(result.data);return{ok:true};}
        await failure(result.status,result.data);return{ok:false,error:result.data.error||'Your message was not sent.'};
      }catch{return{ok:false,error:'Your message was not sent. Check your connection and try again.'};}
    };
    const leaving=()=>{live.local.moving=false;if(joined)void call('leave',{},true).catch(()=>{});};
    const subject=(token:string|null)=>{try{return token?JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sub:null;}catch{return null;}};
    const sessionChanged=()=>{const token=storedAccessToken();if(!token||lastToken&&subject(token)!==subject(lastToken)){disposed=true;joined=false;stopSocket();live.store.clear();live.store.setStatus('offline','Sign in to join DormSpace.');void call('leave',{},true).catch(()=>{});if(token)window.location.reload();}};
    window.addEventListener('pagehide',leaving);window.addEventListener('socialu-session-changed',sessionChanged);window.addEventListener('storage',sessionChanged);
    return()=>{disposed=true;window.clearInterval(timer);stopSocket();live.store.dispose();
      window.removeEventListener('pagehide',leaving);window.removeEventListener('socialu-session-changed',sessionChanged);window.removeEventListener('storage',sessionChanged);
      joins.current=joins.current.catch(()=>{}).then(()=>call('leave',{},true).catch(()=>{}));};
  },[key,attempt,live]);
  return live;
}
