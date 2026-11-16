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
export async function loginActivityRequest(identity:string|null,path:string,init:RequestInit={}){
  const token=await accessToken();
  const assertCurrent=()=>{
    if(init.signal?.aborted||!identity||loginActivityIdentity(token)!==identity||currentLoginActivityIdentity()!==identity)
      throw new Error('Your account changed. Please sign in again.');
  };
  assertCurrent();
  const headers=new Headers(init.headers);headers.set('Authorization',`Bearer ${token}`);
  const response=await fetch(path,{...init,headers,cache:'no-store'});
  const data=await response.json();
  assertCurrent();
  return {response,data};
}
