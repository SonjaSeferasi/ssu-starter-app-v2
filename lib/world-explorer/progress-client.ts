'use client';
import {accessToken} from '../account/session';
import {emptyExplorerProgress,loadAccountDeviceProgress,mergeExplorerProgress,sanitizeExplorerProgress,saveExplorerProgress,type ExplorerProgress,type ExplorerRunResult} from '../world-explorer-progress';

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

/** Reconcile best scores without incrementing attempts. Account caches are
 * isolated from the legacy anonymous key, including after signing out. */
export async function loadAccountProgress(local:ExplorerProgress):Promise<ProgressLoadResult>{
 let progress=sanitizeExplorerProgress(local);
 try{
  const token=await accessToken();
  if(!token)return{progress:progress.accountId?emptyExplorerProgress():progress,storage:'device',message:localMessage};
  const remote=await passportRequest(token),cached=loadAccountDeviceProgress(remote.accountId!);
  progress=mergeExplorerProgress(progress,mergeExplorerProgress(cached,remote));
  if(Object.keys(progress.countries).length){
   const uploaded=await passportRequest(token,{action:'merge',progress:{version:1,countries:progress.countries}});
   progress=mergeExplorerProgress(progress,uploaded);
  }
  saveExplorerProgress(progress);
  return{progress,storage:'account'};
 }catch(error){
  // Preserve valid device data on an outage; the UI must keep the device badge.
  saveExplorerProgress(progress);
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
