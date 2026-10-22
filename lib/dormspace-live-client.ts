'use client';
import { createClient } from '@supabase/supabase-js';
import { storedAccessToken } from './account/session';
import type { LiveEvent } from './dormspace-multiplayer';

export function subscribeToDormSpace(onEvent: (event: LiveEvent)=>void,onStatus: (live: boolean)=>void) {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token=storedAccessToken();
  if (!url || !key || !token) { onStatus(false); return ()=>{}; }
  let userId: string;
  try { const claims=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); userId=claims.sub; }
  catch { onStatus(false); return ()=>{}; }
  if (!userId) { onStatus(false); return ()=>{}; }
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const channel=client.channel(`dormspace:${userId}`,{config:{private:true}})
    .on('broadcast',{event:'dormspace_event'},({payload})=>{ if(!disposed) onEvent(payload as LiveEvent); });
  let disposed=false;
  const refresh=()=>{ const latest=storedAccessToken(); if(latest) void client.realtime.setAuth(latest).catch(()=>onStatus(false)); };
  void client.realtime.setAuth(token).then(()=>{if(!disposed)channel.subscribe(status=>{if(!disposed)onStatus(status==='SUBSCRIBED');});}).catch(()=>onStatus(false));
  window.addEventListener('socialu-session-changed',refresh);
  return ()=>{ disposed=true; window.removeEventListener('socialu-session-changed',refresh); void client.removeChannel(channel).finally(()=>client.realtime.disconnect()); };
}
