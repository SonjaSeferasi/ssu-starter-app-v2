import {afterAll,beforeAll,expect,it} from 'vitest';
import {createServer,type Server} from 'node:http';
import {spawn,type ChildProcess} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import type {PGlite} from '@electric-sql/pglite';
import {createDormDatabase,testUid} from '../../__tests__/helpers/dormspace-db';

const output=process.env.LOGIN_ACTIVITY_EVIDENCE_DIR || 'documentation/sprint5/login-activity/evidence';
let db:PGlite,service:Server,next:ChildProcess,browser:any,base='',nextLog='';
let holdOlderA=false,releaseOlderA:(()=>void)|undefined;
let holdLogout=false,failLogout=false;const logoutRequests:string[]=[];
const requests:{owner:string;before:string|null}[]=[];
const tokens=new Map<string,number>(),currentSessions=new Map<number,string>();
const issued=Math.floor(Date.now()/1000);
const user=(n:number)=>({id:testUid(n),email:`dorm${n}@salemstate.edu`,email_confirmed_at:'2026-11-01T12:00:00Z',aud:'authenticated',role:'authenticated',user_metadata:{full_name:`Dorm Student ${n}`,username:`dorm${n}`}});
const refreshes=new Map<string,{n:number;session:string}>();
let signInCount=0;let revokeCallerAfterWrite=false;
const tokenFor=(n:number,version='original',session=currentSessions.get(n))=>'e30.'+Buffer.from(JSON.stringify({sub:testUid(n),iat:issued,exp:issued+3600,session_id:session})).toString('base64url')+'.fixture-'+version;
async function listen(server:Server){await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});return(server.address() as {port:number}).port;}
async function signIn(page:any,n:number,remember=true){
 await page.goto(base+'/login',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>{const form=document.querySelector('form');return form&&Object.keys(form).some(k=>k.startsWith('__reactProps$'));});
 await page.getByRole('textbox',{name:'University email or username'}).fill(`dorm${n}@salemstate.edu`);
 await page.getByLabel('Password',{exact:true}).fill('FixturePass123!');
 await page.getByLabel('Remember me',{exact:true}).setChecked(remember);
 const response=page.waitForResponse((r:any)=>r.url().endsWith('/api/auth/login')&&r.request().method()==='POST');response.catch(()=>{});
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 const result=await response;expect(result.status(),await result.text()).toBe(200);
 await page.waitForFunction(()=>Boolean(localStorage.getItem('access_token')||sessionStorage.getItem('access_token')));
}
async function openActivity(page:any){await page.goto(base+'/account/login-activity',{waitUntil:'domcontentloaded'});await page.getByRole('list',{name:'Recorded sign-ins'}).waitFor();}
const rows=(page:any)=>page.getByRole('list',{name:'Recorded sign-ins'}).locator('li');
const labels=(page:any)=>rows(page).locator('strong').allTextContents();
async function screenshot(page:any,name:string){await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${output}/${name}.png`,fullPage:false});}
beforeAll(async()=>{
 mkdirSync(output,{recursive:true});db=await createDormDatabase(2);
 for(const name of ['20261029100000_login_history.sql','20261029101000_complete_login_history.sql','20261029102000_login_activity_status.sql','20261103110000_login_context.sql','20261103111000_selected_session_logout.sql'])await db.exec(readFileSync('supabase/migrations/'+name,'utf8'));
 for(const n of [1,2]){
  for(let i=0;i<30;i++){
   const id=randomUUID();if(i===0)currentSessions.set(n,id);
   const date=n===1?new Date(Date.UTC(2026,10,10,12,-i)):new Date(Date.UTC(2026,10,i<26?11:8,12,-i));
   await db.query('INSERT INTO auth.sessions(id,user_id,created_at) VALUES($1,$2,$3)',[id,testUid(n),date.toISOString()]);
   await db.query('UPDATE socialu.login_history SET device_label=$1,login_location=$2,context_recorded=true WHERE session_id=$3',[`Account ${n===1?'A':'B'} Chrome ${String(i+1).padStart(2,'0')}`,`Fixture ${n===1?'A':'B'} campus`,id]);
  }
  tokens.set(tokenFor(n),n);tokens.set(tokenFor(n,'refreshed'),n);
 }
 service=createServer(async(request,response)=>{
  const reply=(status:number,data:unknown)=>{if(!response.destroyed){response.writeHead(status,{'Content-Type':'application/json'});response.end(JSON.stringify(data));}};
  try{
   const path=new URL(request.url!,'http://localhost').pathname;
   let raw='';for await(const chunk of request)raw+=chunk;const body=raw?JSON.parse(raw):{};
   if(path==='/auth/v1/token'){
    const existing=body.refresh_token?refreshes.get(body.refresh_token):null;
    const n=existing?.n||Number(/^dorm([12])@salemstate.edu$/.exec(body.email||'')?.[1]);
    if(!n||(!existing&&body.password!=='FixturePass123!'))return reply(400,{message:'Invalid fixture sign-in'});
    const session=existing?.session||randomUUID();
    if(!existing){
     signInCount++;
     await db.query('INSERT INTO auth.sessions(id,user_id,created_at) VALUES($1,$2,clock_timestamp())',[session,testUid(n)]);
     await db.query('UPDATE socialu.login_history SET device_label=$1,context_recorded=true WHERE session_id=$2',[`Local QA browser sign-in ${signInCount}`,session]);
    }
    const token=tokenFor(n,'signin-'+signInCount+'-'+Date.now(),session),refresh='fixture-refresh-'+session;
    tokens.set(token,n);refreshes.set(refresh,{n,session});
    return reply(200,{access_token:token,refresh_token:refresh,expires_in:3600,expires_at:issued+3600,token_type:'bearer',user:user(n)});
   }
   if(path==='/auth/v1/user'){
    const n=tokens.get(request.headers.authorization?.slice(7)||'');return reply(n?200:401,n?user(n):{message:'Unknown fixture session'});
   }
   const fn=path.match(/^\/rest\/v1\/rpc\/(socialu_[a-z_]+)$/)?.[1];
   if(!fn||!Object.keys(body).every(key=>/^p_[a-z_]+$/.test(key)))return reply(404,{code:'PGRST202',message:'Unavailable fixture endpoint'});
   if(fn==='socialu_end_login_session'){logoutRequests.push(body.p_history_id);if(failLogout){failLogout=false;return reply(503,{code:'TEST',message:'Controlled test failure'});}}
   if(fn==='socialu_login_history')requests.push({owner:body.p_auth_id===testUid(1)?'A':'B',before:body.p_before_id??null});
   const entries=Object.entries(body);
   const result=await db.query<any>(`SELECT public.${fn}(${entries.map(([key],i)=>`${key} => $${i+1}`).join(',')}) AS result`,entries.map(([,value])=>value&&typeof value==='object'?JSON.stringify(value):value));
   if(fn==='socialu_end_login_session'&&revokeCallerAfterWrite){revokeCallerAfterWrite=false;await db.query('UPDATE socialu.login_history SET revoked_at=clock_timestamp() WHERE session_id=$1',[body.p_current_session]);}
   if(fn==='socialu_login_history'&&body.p_auth_id===testUid(1)&&body.p_before_id&&holdOlderA){
    holdOlderA=false;await new Promise<void>(resolve=>{releaseOlderA=resolve;});
   }
   if(fn==='socialu_end_login_session'&&holdLogout){holdLogout=false;await new Promise<void>(resolve=>{releaseOlderA=resolve;});}
   reply(200,result.rows[0].result);
  }catch(error:any){reply(400,{code:error.code||'TEST',message:error.message});}
 });
 const servicePort=await listen(service),reservation=createServer(),appPort=await listen(reservation);await new Promise<void>(resolve=>reservation.close(()=>resolve()));base=`http://127.0.0.1:${appPort}`;
 next=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(appPort)],{env:{...process.env,SUPABASE_URL:`http://127.0.0.1:${servicePort}`,NEXT_PUBLIC_SUPABASE_URL:`http://127.0.0.1:${servicePort}`,SUPABASE_SERVICE_ROLE_KEY:'fixture-service-key',SUPABASE_ANON_KEY:'fixture-anon-key'},stdio:['ignore','pipe','pipe']});
 next.stdout?.on('data',chunk=>nextLog+=chunk);next.stderr?.on('data',chunk=>nextLog+=chunk);
 for(let attempt=0;attempt<100;attempt++){try{if((await fetch(base+'/api/account/login-activity')).status===401)break;}catch{}if(next.exitCode!==null)throw new Error(nextLog);await new Promise(resolve=>setTimeout(resolve,200));}
 const playwright=await import(/* @vite-ignore */ process.env.SOCIALU_PLAYWRIGHT_MODULE||'playwright');browser=await playwright.chromium.launch({headless:true,executablePath:process.env.LOGIN_ACTIVITY_BROWSER_EXECUTABLE});
},90000);
afterAll(async()=>{releaseOlderA?.();await browser?.close();next?.kill('SIGTERM');await new Promise<void>(resolve=>service?service.close(()=>resolve()):resolve());await db?.close();});


async function pageApi(page:any,path:string,method='GET',body?:unknown){
 return page.evaluate(async({path,method,body}:any)=>{
  const t=sessionStorage.getItem('access_token')||localStorage.getItem('access_token');
  const r=await fetch(path,{method,headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
  return {status:r.status,data:await r.json()};
 },{path,method,body});
}

it('confirms current-session feedback and refuses an unconfirmed preservation response',async()=>{
 const a=await browser.newContext({viewport:{width:1440,height:1000}}),b=await browser.newContext({viewport:{width:1440,height:1000}}),c=await browser.newContext({viewport:{width:1440,height:1000}});
 const caller=await a.newPage(),target=await b.newPage(),third=await c.newPage();
 const trace:any={environment:'Actual local production UI/API and disposable PostgreSQL; Auth/PostgREST adapter; malformed-response and independent-revocation fault injection',checks:[]};
 try{
  await signIn(target,1);await openActivity(target);const t=(await pageApi(target,'/api/account/login-activity')).data.entries.find((e:any)=>e.is_current).id;
  await signIn(caller,1);await openActivity(caller);let history=(await pageApi(caller,'/api/account/login-activity')).data;
  const callerId=history.entries.find((e:any)=>e.is_current).id;let row=rows(caller).nth(history.entries.findIndex((e:any)=>e.id===t));
  await caller.route('**/api/account/login-activity',async(route:any)=>{
   if(route.request().method()==='POST')await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ended:true})});else await route.continue();
  });
  await row.getByRole('button',{name:/Log out/}).click();let dialog=caller.getByRole('dialog');await dialog.getByRole('button',{name:'Log out device',exact:true}).click();
  await dialog.getByText('Remote logout is not fully confirmed. Refresh Login Activity to check both sessions.',{exact:true}).waitFor();
  expect(await caller.getByRole('status').filter({hasText:'current session is still active'}).count()).toBe(0);expect((await pageApi(target,'/api/account/login-activity')).status).toBe(200);
  await screenshot(caller,'01-incomplete-success-is-not-preservation-proof');trace.checks.push('HTTP 200 without explicit preservation confirmation does not produce false success; dialog is recoverable');
  await caller.unroute('**/api/account/login-activity');await dialog.getByRole('button',{name:'Log out device',exact:true}).click();
  await caller.getByRole('status').filter({hasText:'current session is still active'}).waitFor();expect((await pageApi(target,'/api/account/login-activity')).status).toBe(401);
  expect((await pageApi(caller,'/api/auth/session')).status).toBe(200);await screenshot(caller,'02-confirmed-preservation-and-target-ended');
  await caller.reload({waitUntil:'domcontentloaded'});await caller.getByRole('list',{name:'Recorded sign-ins'}).waitFor();history=(await pageApi(caller,'/api/account/login-activity')).data;
  expect(history.entries.find((e:any)=>e.id===callerId)).toMatchObject({active:true,is_current:true});expect(history.entries.find((e:any)=>e.id===t).active).toBe(false);
  await screenshot(caller,'03-current-session-survives-refresh');trace.checks.push('Confirmed response corresponds to actual SQL target revocation, caller authorization and persistence after refresh');
  await signIn(third,1);await openActivity(third);const next=(await pageApi(third,'/api/account/login-activity')).data.entries.find((e:any)=>e.is_current).id;
  await caller.getByRole('button',{name:'Refresh',exact:true}).click();await expect.poll(async()=>(await pageApi(caller,'/api/account/login-activity')).data.entries.some((e:any)=>e.id===next)).toBe(true);
  await caller.getByRole('list',{name:'Recorded sign-ins'}).waitFor();history=(await pageApi(caller,'/api/account/login-activity')).data;row=rows(caller).nth(history.entries.findIndex((e:any)=>e.id===next));
  await row.getByRole('button',{name:/Log out/}).click();revokeCallerAfterWrite=true;await caller.getByRole('dialog').getByRole('button',{name:'Log out device',exact:true}).click();
  await caller.getByRole('dialog').getByRole('alert').filter({hasText:'security action'}).waitFor();
  expect(await caller.getByRole('status').filter({hasText:'current session is still active'}).count()).toBe(0);
  expect((await pageApi(caller,'/api/account/login-activity')).status).toBe(401);expect((await pageApi(third,'/api/account/login-activity')).status).toBe(401);
  await screenshot(caller,'04-independent-caller-revocation-never-claims-preservation');trace.checks.push('An independent caller revocation after the target write produces 401 and no preservation claim; the completed target logout is not undone');
  trace.result='passed';
 }finally{writeFileSync(output+'/current-session-trace.json',JSON.stringify(trace,null,2));await a.close();await b.close();await c.close();}
},60000);
