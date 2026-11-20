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
const tokenFor=(n:number,version='original')=>'e30.'+Buffer.from(JSON.stringify({sub:testUid(n),iat:issued,exp:issued+3600,session_id:currentSessions.get(n)})).toString('base64url')+'.fixture-'+version;
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
    const n=Number(/^dorm([12])@salemstate.edu$/.exec(body.email||'')?.[1]);
    if(!n||body.password!=='FixturePass123!')return reply(400,{message:'Invalid fixture sign-in'});
    return reply(200,{access_token:tokenFor(n),refresh_token:'fixture-refresh-'+n,expires_in:3600,expires_at:issued+3600,token_type:'bearer',user:user(n)});
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

it('shows eligible controls, cancels safely, recovers an error and preserves the caller after logout',async()=>{
 const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'America/New_York'}),page=await context.newPage();
 const trace:any={environment:'Local Next production UI/API with actual PostgreSQL schema/functions in disposable PGlite; provider Auth/PostgREST fixtures. No hosted data.',checks:[]};
 try{
  await signIn(page,1);await openActivity(page);
  const current=rows(page).filter({has:page.getByText('Account A Chrome 01',{exact:true})});
  expect(await current.getByRole('button').count()).toBe(0);trace.checks.push('Current session has no remote logout action');
  const option=page.getByRole('button',{name:'Log out Account A Chrome 02',exact:true});await option.waitFor();
  await screenshot(page,'01-eligible-sessions');
  const before=logoutRequests.length;await option.click();const dialog=page.getByRole('dialog');await expect.poll(()=>dialog.isVisible()).toBe(true);
  await screenshot(page,'02-confirm-before-logout');await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  expect(logoutRequests.length).toBe(before);trace.checks.push('Cancel dismisses without a POST or database revocation');
  await option.click();await page.keyboard.press('Escape');expect(await dialog.isVisible()).toBe(false);expect(logoutRequests.length).toBe(before);trace.checks.push('Escape cancels once before confirmation');
  failLogout=true;await option.click();await dialog.getByRole('button',{name:'Log out device',exact:true}).click();
  await dialog.getByRole('alert').waitFor();expect(await dialog.isVisible()).toBe(true);expect(await dialog.getByRole('button',{name:'Cancel',exact:true}).isEnabled()).toBe(true);
  await screenshot(page,'03-failure-keeps-recovery-controls');trace.checks.push('Failed server response preserves dialog and enables recovery without success feedback');
  await dialog.getByRole('button',{name:'Log out device',exact:true}).click();await page.getByRole('status').filter({hasText:'current session is still active'}).waitFor();
  expect(await option.count()).toBe(0);expect(await current.getByText('Active',{exact:true}).count()).toBe(1);
  await screenshot(page,'04-target-ended-current-active');trace.checks.push('Confirmed SQL revocation removes target action and keeps current session active');
  const target=(await db.query<any>("SELECT session_id,revoked_at FROM socialu.login_history WHERE device_label='Account A Chrome 02'")).rows[0];expect(target.revoked_at).toBeTruthy();
  expect((await db.query<any>("SELECT public.socialu_session_guard('check',$1,$2,now()) AS valid",[testUid(1),target.session_id])).rows[0].valid).toBe(false);
  expect((await db.query<any>("SELECT public.socialu_session_guard('check',$1,$2,now()) AS valid",[testUid(1),currentSessions.get(1)])).rows[0].valid).toBe(true);trace.checks.push('Target authorization fails; caller authorization still passes');
  holdLogout=true;await page.getByRole('button',{name:'Log out Account A Chrome 03',exact:true}).click();await dialog.getByRole('button',{name:'Log out device',exact:true}).click();
  await dialog.getByRole('alert').filter({hasText:'Logout is not confirmed'}).waitFor({timeout:15000});
  expect(await dialog.getByRole('button',{name:'Cancel',exact:true}).isEnabled()).toBe(true);expect(await dialog.getByRole('button',{name:'Log out device',exact:true}).isEnabled()).toBe(true);
  await screenshot(page,'05-timeout-unconfirmed-and-recoverable');trace.checks.push('Held response settles at the deadline with an unconfirmed-result message; controls recover');
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();releaseOlderA?.();await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>page.getByRole('button',{name:'Log out Account A Chrome 03',exact:true}).count()).toBe(0);trace.checks.push('Refresh reconciles a write that committed before its response timed out');
  await screenshot(page,'06-refreshed-authoritative-status');trace.result='passed';
 }finally{writeFileSync(output+'/acceptance-trace.json',JSON.stringify(trace,null,2));await context.close();}
},60000);
