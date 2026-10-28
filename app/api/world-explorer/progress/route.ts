import {AccountError,accountClient,accountResponse,jsonBody,verifiedUser} from '../../../../lib/socialu-account';
import {countryByCode} from '../../../../lib/world-explorer/catalog';
import {sanitizeExplorerProgress} from '../../../../lib/world-explorer-progress';

export const dynamic='force-dynamic';
const isRecord=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const integer=(value:unknown,max:number)=>typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<=max;

async function operation(request:Request,action:string,payload:Record<string,unknown>={}){
 const user=await verifiedUser(request);
 const {data,error}=await accountClient().rpc('socialu_world_explorer',{p_action:action,p_auth_id:user.id,p_payload:payload});
 if(error){
  if(error.code==='PGRST202'||error.code==='42883')throw new AccountError('World Explorer account saving needs its database update. Your device progress is still available.',503,'EXPLORER_SETUP_REQUIRED');
  if(error.code==='42501')throw new AccountError('This passport is not available to your account.',403);
  if(error.code==='22023'||error.code==='23514')throw new AccountError('This country result is invalid. Please retry.',400);
  throw new AccountError('Account saving is temporarily unavailable. Your device progress is still available.',503);
 }
 if(!isRecord(data)||data.version!==1||!isRecord(data.countries))throw new AccountError('The account passport response was incomplete. Your device progress is still available.',503);
 // The owner is derived from authentication, never read from the request body.
 const progress={...sanitizeExplorerProgress(data),accountId:user.id.toLowerCase()};
 return Response.json({progress,storage:'account'},{headers:{'Cache-Control':'no-store'}});
}

export async function GET(request:Request){try{return await operation(request,'read');}catch(error){return accountResponse(error);}}
export async function POST(request:Request){try{
 const body=await jsonBody(request);
 if(body.action==='merge'){
  if(Object.keys(body).some(key=>!['action','progress'].includes(key))||!isRecord(body.progress)||body.progress.version!==1||!isRecord(body.progress.countries)||Object.keys(body.progress).some(key=>!['version','countries'].includes(key)))throw new AccountError('Enter a valid device passport.',400);
  // A bounded, allowlisted snapshot can improve best results but cannot award
  // SocialU points or write anybody else's passport.
  const safe=sanitizeExplorerProgress(body.progress);
  return await operation(request,'merge',{version:1,countries:safe.countries});
 }
 if(body.action!=='result'||Object.keys(body).some(key=>!['action','code','runId','completed','coins','stars','elapsedMs','discoveryFound'].includes(key))||typeof body.code!=='string'||(body.code!=='ANTARCTICA'&&!countryByCode(body.code))||body.code!==body.code.toUpperCase()||typeof body.runId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.runId)||typeof body.completed!=='boolean'||!integer(body.coins,10000)||!integer(body.stars,3)||!integer(body.elapsedMs,86400000)||typeof body.discoveryFound!=='boolean')throw new AccountError('Enter a valid country result.',400);
 return await operation(request,'result',{code:body.code,runId:body.runId,completed:body.completed,coins:body.coins,stars:body.stars,elapsedMs:body.elapsedMs,discoveryFound:body.discoveryFound});
}catch(error){return accountResponse(error);}}
