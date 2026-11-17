'use client';
import {accessToken,storedAccessToken} from '../account/session';
import {clearGuestProgress,emptyExplorerProgress,loadAccountDeviceProgress,loadExplorerProgress,mergeExplorerProgress,sanitizeExplorerProgress,saveExplorerProgress,type ExplorerProgress,type ExplorerRunResult} from '../world-explorer-progress';

export type ProgressStorageResult={storage:'account'|'device';message?:string};
export type ProgressLoadResult=ProgressStorageResult&{progress:ExplorerProgress};
const localMessage='Progress stays on this device. Sign in to sync your passport.';
const offlineMessage='Account sync is unavailable. Progress stays on this device and can sync on your next visit.';

class ProgressRequestError extends Error {constructor(message:string,public code?:string){super(message);}}
async function passportRequest(token:string,body?:Record<string,unknown>){
 const response=await fetch('/api/world-explorer/progress',{method:body?'POST':'GET',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},cache:'no-store',...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(6000)});
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw new ProgressRequestError(data?.error||offlineMessage,data?.code);
 const safe=sanitizeExplorerProgress(data?.progress);
 if(!safe.accountId)throw new ProgressRequestError(offlineMessage);
 return safe;
}
function failure(error:unknown){return error instanceof ProgressRequestError&&error.code==='EXPLORER_SETUP_REQUIRED'?'Account sync needs the World Explorer database update. Progress stays on this device.':offlineMessage;}

/** The signed-in account, read from the session token already on this device.
 * It only selects the device cache; the server still derives the owner of every
 * account write from the verified session and never from this value. */
function tokenOwner(token:string|null|undefined){
 try{
  const part=token?.split('.')[1];if(!part)return undefined;
  const claims=JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/')));
  return sanitizeExplorerProgress({version:1,countries:{},accountId:claims?.sub}).accountId;
 }catch{return undefined;}
}
function ownedCache(owner:string):ExplorerProgress{return{...loadAccountDeviceProgress(owner),accountId:owner};}

/** Device progress for the current session before the network answers. A
 * signed-in student starts from their own account cache, so a result recorded
 * during an outage is stored for that account and not in the anonymous key. */
export function sessionDeviceProgress():ExplorerProgress{
 let owner:string|undefined;
 try{owner=tokenOwner(storedAccessToken());}catch{owner=undefined;}
 return owner?ownedCache(owner):loadExplorerProgress();
}

/** Reconcile best scores without incrementing attempts. The owner is resolved
 * from the session before the account request, so an outage keeps progress in
 * that account's cache. An anonymous passport is claimed by the first account
 * that signs in and is then cleared; it is never offered to a second account. */
export async function loadAccountProgress(local:ExplorerProgress):Promise<ProgressLoadResult>{
 let progress=sanitizeExplorerProgress(local);
 const store=()=>{if(saveExplorerProgress(progress)&&progress.accountId)clearGuestProgress();};
 try{
  const token=await accessToken();
  if(!token)return{progress:progress.accountId?emptyExplorerProgress():progress,storage:'device',message:localMessage};
  const owner=tokenOwner(token);
  if(owner)progress=mergeExplorerProgress(progress,ownedCache(owner));
  const remote=await passportRequest(token),cached=loadAccountDeviceProgress(remote.accountId!);
  progress=mergeExplorerProgress(progress,mergeExplorerProgress(cached,remote));
  if(Object.keys(progress.countries).length){
   const uploaded=await passportRequest(token,{action:'merge',progress:{version:1,countries:progress.countries}});
   progress=mergeExplorerProgress(progress,uploaded);
  }
  store();
  return{progress,storage:'account'};
 }catch(error){
  // Preserve valid device data on an outage; the UI must keep the device badge.
  store();
  return{progress,storage:'device',message:failure(error)};
 }
}

/** The same runId is reused for retries of a network request, so the database
 * records that run once. Caller saves its device result before invoking this. */
export async function saveAccountResult(code:string,result:ExplorerRunResult,runId:string):Promise<ProgressStorageResult>{
 try{
  const token=await accessToken();if(!token)return{storage:'device',message:localMessage};
  await passportRequest(token,{action:'result',code:code.toUpperCase(),runId,completed:result.completed,coins:result.coins,stars:result.stars??0,elapsedMs:result.elapsedMs??0,discoveryFound:result.discoveryFound??false});
  return{storage:'account'};
 }catch(error){return{storage:'device',message:failure(error)};}
}
