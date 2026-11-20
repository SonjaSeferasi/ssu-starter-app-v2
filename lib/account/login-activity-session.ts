import {accessToken,storedAccessToken} from './session';

// Decoded claims identify UI state only. The API still verifies every token.
export function loginActivityIdentity(token:string|null):string|null {
  if(!token)return null;
  try {
    const payload=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    const claims=JSON.parse(atob(payload));
    return typeof claims.sub==='string'&&claims.sub&&typeof claims.session_id==='string'&&claims.session_id
      ?JSON.stringify([claims.sub,claims.session_id]):null;
  }catch{return null;}
}
export function currentLoginActivityIdentity(){
  return typeof window==='undefined'?null:loginActivityIdentity(storedAccessToken());
}
export function subscribeLoginActivityIdentity(changed:()=>void){
  const storage=(event:StorageEvent)=>{if(event.key===null||event.key==='access_token'||event.key==='socialu_session')changed();};
  window.addEventListener('storage',storage);
  window.addEventListener('socialu-session-changed',changed);
  window.addEventListener('focus',changed);
  return()=>{window.removeEventListener('storage',storage);window.removeEventListener('socialu-session-changed',changed);window.removeEventListener('focus',changed);};
}
// One deadline covers token refresh, transport and body decoding. A timed-out write may
// already have committed, so recovery must describe an unconfirmed result.
export const LOGIN_ACTIVITY_REQUEST_TIMEOUT_MS=10_000;
export async function loginActivityRequest(identity:string|null,path:string,init:RequestInit={}){
  const controller=new AbortController();
  let rejectStopped!:(reason:Error)=>void;
  const stopped=new Promise<never>((_,reject)=>{rejectStopped=reject;});
  const stop=(reason:Error)=>{rejectStopped(reason);controller.abort();};
  const cancelled=()=>stop(new Error('Login Activity request cancelled.'));
  if(init.signal?.aborted)throw new Error('Login Activity request cancelled.');
  init.signal?.addEventListener('abort',cancelled,{once:true});
  const timer=setTimeout(()=>stop(new Error(init.method?.toUpperCase()==='POST'
    ?'Logout is not confirmed. Refresh Login Activity before trying again.'
    :'Loading Login Activity took too long. Please try again.')),LOGIN_ACTIVITY_REQUEST_TIMEOUT_MS);
  try{
    return await Promise.race([(async()=>{
      const token=await accessToken();
      const assertCurrent=()=>{
        if(controller.signal.aborted||!identity||loginActivityIdentity(token)!==identity||currentLoginActivityIdentity()!==identity)
          throw new Error('Your account changed. Please sign in again.');
      };
      assertCurrent();
      const headers=new Headers(init.headers);headers.set('Authorization',`Bearer ${token}`);
      const response=await fetch(path,{...init,signal:controller.signal,headers,cache:'no-store'});
      const data=await response.json();
      assertCurrent();
      return {response,data};
    })(),stopped]);
  }finally{
    clearTimeout(timer);init.signal?.removeEventListener('abort',cancelled);
  }
}
