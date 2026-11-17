import { afterAll, beforeAll, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { createDormDatabase, testUid } from '../../__tests__/helpers/dormspace-db';
import { DEFAULT_LOOK } from '../../lib/profile-space';
import { boardInput } from '../../lib/profile-board';

// Real Next UI/API + actual SQL/migration in disposable PGlite. Only Supabase's
// Auth/PostgREST transport is replaced. Never connects to the hosted database.
const artifacts = process.env.BOARD_EVIDENCE_DIR || 'tmp/board-1223';
let db: PGlite, service: Server, next: ChildProcess, browser: any;
let base = '', nextLog = '', pauseBoard = false;
let releaseBoard: (() => void) | undefined;
const events: { step: string; at: string; detail?: unknown }[] = [];
const record = (step: string, detail?: unknown) => events.push({step, at:new Date().toISOString(), ...(detail === undefined ? {} : {detail})});
const sessionId = randomUUID(), issued = Math.floor(Date.now()/1000);
const token = 'e30.' + Buffer.from(JSON.stringify({sub:testUid(1),iat:issued,exp:issued+3600,session_id:sessionId})).toString('base64url') + '.local-fixture';
async function listen(server: Server) {
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0,'127.0.0.1',resolve); });
  return (server.address() as {port:number}).port;
}
async function api(page: any, method: string, body?: unknown) {
  return page.evaluate(async ({method,body}: any) => {
    const response = await fetch('/api/profiles/space',{method,headers:{Authorization:`Bearer ${localStorage.getItem('access_token')}`,'Content-Type':'application/json'},...(body === undefined ? {} : {body:JSON.stringify(body)})});
    return {status:response.status,data:await response.json()};
  },{method,body});
}
beforeAll(async () => {
  mkdirSync(artifacts,{recursive:true});
  db = await createDormDatabase(2);
  for (const name of [
    '20261027020000_profile_personality.sql','20261027030000_profile_spaces.sql',
    '20261027040000_profile_corners.sql','20261027050000_profile_decoration_library.sql',
    '20261027060000_profile_about_and_hello_notes.sql','20261027070000_profile_vibe_stickers.sql',
    '20261027080000_profile_memories.sql','20261116210000_atomic_profile_board_save.sql',
    ...(process.env.BOARD_PHOTO_BASELINE?[]:['20261117020000_board_photo_ownership.sql']),
  ]) await db.exec(readFileSync(`supabase/migrations/${name}`,'utf8'));
  await db.query('INSERT INTO auth.sessions VALUES($1,$2,clock_timestamp())',[sessionId,testUid(1)]);
  await db.query('SELECT public.socialu_profile_space($1,$2,NULL,$3)',[testUid(1),'save_look',JSON.stringify({...DEFAULT_LOOK,hometown:'Original'})]);
  await db.exec("INSERT INTO socialu.profile_memories(student_id,storage_key,caption) VALUES(1,'owner-removed','Removed in another tab'),(2,'foreign-photo','Foreign private photo'),(1,'owner-valid','Still pinned')");
  record('migration applied to disposable database');
  service = createServer(async (request,response) => {
    const reply = (status:number,data:unknown) => { response.writeHead(status,{'Content-Type':'application/json'}); response.end(JSON.stringify(data)); };
    try {
      const path = new URL(request.url!,'http://localhost').pathname;
      if(path.includes('/object/sign/media/'))return reply(200,{signedURL:'/fixture-photo.png'});
      if(path.endsWith('/fixture-photo.png')){response.writeHead(200,{'Content-Type':'image/png'});response.end(readFileSync('public/profile-space/campus-watercolor-v1.png'));return;}
      if(path==='/storage/v1/object/media'&&request.method==='DELETE')return reply(200,[]);
      if (path === '/auth/v1/user') {
        const valid = request.headers.authorization === `Bearer ${token}`;
        return reply(valid ? 200 : 401,valid ? {id:testUid(1),email:'dorm1@salemstate.edu',email_confirmed_at:new Date().toISOString(),aud:'authenticated',role:'authenticated'} : {message:'Invalid local session'});
      }
      let raw = ''; for await (const chunk of request) raw += chunk;
      const body = raw ? JSON.parse(raw) : {};
      const fn = path.match(/^\/rest\/v1\/rpc\/(socialu_[a-z_]+)$/)?.[1];
      if (!fn || !Object.keys(body).every(key => /^p_[a-z_]+$/.test(key))) return reply(404,{code:'PGRST202',message:'Unavailable fixture endpoint'});
      if (fn === 'socialu_save_profile_board' && pauseBoard) {
        pauseBoard = false;
        record('board request paused before database write');
        await new Promise<void>(resolve => { releaseBoard = resolve; });
        record('board database write resumed');
      }
      const entries = Object.entries(body);
      const result = await db.query<any>(`SELECT public.${fn}(${entries.map(([key],i) => `${key} => $${i+1}`).join(',')}) AS result`,entries.map(([,value]) => value && typeof value === 'object' ? JSON.stringify(value) : value));
      return reply(200,result.rows[0].result);
    } catch (error: any) { reply(400,{code:error.code || 'TEST',message:error.message}); }
  });
  const servicePort = await listen(service), reserve = createServer(), appPort = await listen(reserve);
  await new Promise<void>(resolve => reserve.close(() => resolve()));
  base = `http://127.0.0.1:${appPort}`;
  next = spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(appPort)],{env:{...process.env,SUPABASE_URL:`http://127.0.0.1:${servicePort}`,NEXT_PUBLIC_SUPABASE_URL:`http://127.0.0.1:${servicePort}`,SUPABASE_SERVICE_ROLE_KEY:'local-fixture-service-key',SUPABASE_ANON_KEY:'local-fixture-anon-key'},stdio:['ignore','pipe','pipe']});
  next.stdout?.on('data',chunk => nextLog += chunk); next.stderr?.on('data',chunk => nextLog += chunk);
  for (let attempt=0; attempt<100; attempt++) {
    try { if ((await fetch(base+'/api/profiles')).status === 401) break; } catch {}
    if (next.exitCode !== null) throw new Error(nextLog);
    await new Promise(resolve => setTimeout(resolve,200));
  }
  const playwright = await import(/* @vite-ignore */ process.env.SOCIALU_PLAYWRIGHT_MODULE || 'playwright');
  browser = await playwright.chromium.launch({headless:true,executablePath:process.env.BOARD_BROWSER_EXECUTABLE});
});
afterAll(async () => {
  releaseBoard?.();
  await browser?.close(); next?.kill('SIGTERM');
  await new Promise<void>(resolve => service ? service.close(() => resolve()) : resolve());
  await db?.close();
});

it('rejects stale, missing and foreign board photos, keeps the draft and saves a valid owner photo',async()=>{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addInitScript((value:string)=>localStorage.setItem('access_token',value),token);
 const page=await context.newPage(),other=await context.newPage();
 const trace:any={environment:'Actual local production UI/API and real SQL on disposable PGlite; Auth/PostgREST/media signing transport fixtures'};
 try{
 await page.goto(base+'/profile',{waitUntil:'domcontentloaded'});await other.goto(base+'/profile',{waitUntil:'domcontentloaded'});
 await page.getByRole('tab',{name:'My Board',exact:true}).click();await page.getByRole('button',{name:'Edit board',exact:true}).click();
 await page.getByRole('button',{name:'Note',exact:true}).click();await page.locator('fieldset textarea').fill('Keep my draft when a photo disappears.');
 for(let i=0;i<30;i++)await page.getByRole('button',{name:'Move note; use arrow keys',exact:true}).press('ArrowLeft');
 await page.getByRole('button',{name:'Add Removed in another tab',exact:true}).click();
 // Actual authorized memory DELETE in a separate tab leaves this editor shelf stale.
 const removed=await other.evaluate(async()=>{const r=await fetch('/api/profiles/memories',{method:'DELETE',headers:{Authorization:'Bearer '+localStorage.getItem('access_token'),'Content-Type':'application/json'},body:JSON.stringify({memoryId:1})});return r.status;});expect(removed).toBe(200);
 const save=page.waitForResponse((r:any)=>r.url().endsWith('/api/profiles/space')&&r.request().method()==='PATCH');
 await page.getByRole('button',{name:'Save board',exact:true}).click();const response=await save;
 trace.removedPhoto={status:response.status(),body:await response.json()};
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:artifacts+'/01-removed-photo-save-result.png',fullPage:true});
 const photo=(memoryId:number)=>({items:[{id:'photo-test',kind:'photo',x:10,y:10,width:28,rotation:0,memoryId}]});
 trace.missing=await api(other,'PATCH',{field:'board',value:photo(999999)});
 trace.foreign=await api(other,'PATCH',{field:'board',value:photo(2)});
 if(process.env.BOARD_PHOTO_BASELINE){await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('tab',{name:'My Board',exact:true}).click();await page.getByText('Photo unavailable',{exact:true}).waitFor();await page.screenshot({path:artifacts+'/00-invalid-reference-persisted.png',fullPage:true});writeFileSync(artifacts+'/photo-trace.json',JSON.stringify(trace,null,2));expect(response.status()).toBe(400);return;}
 expect(response.status()).toBe(400);expect(trace.missing.status).toBe(400);expect(trace.foreign.status).toBe(400);
 await page.getByRole('alert').filter({hasText:'Choose an existing photo'}).waitFor();
 expect(await page.getByRole('button',{name:'Move note; use arrow keys',exact:true}).textContent()).toContain('Keep my draft');
 expect(await page.getByRole('button',{name:'Move photo; use arrow keys',exact:true}).count()).toBe(1);
 expect((await api(other,'GET')).data.look.board).toBeUndefined();
 trace.draftRetained=true;trace.storedBoardUnchanged=true;
 await page.getByRole('button',{name:'Remove',exact:true}).click();await page.getByRole('button',{name:'Add Still pinned',exact:true}).click();
 const valid=page.waitForResponse((r:any)=>r.url().endsWith('/api/profiles/space')&&r.request().method()==='PATCH');await page.getByRole('button',{name:'Save board',exact:true}).click();expect((await valid).status()).toBe(200);
 await page.getByRole('button',{name:'Edit board',exact:true}).waitFor();
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:artifacts+'/02-valid-owner-photo-saved.png',fullPage:true});
 const stored=(await api(other,'GET')).data.look.board;expect(stored.items.some((v:any)=>v.kind==='note'&&v.text.includes('Keep my draft'))).toBe(true);expect(stored.items.find((v:any)=>v.kind==='photo').memoryId).toBe(3);
 await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('tab',{name:'My Board',exact:true}).click();await page.getByRole('button',{name:'Edit board',exact:true}).waitFor();
 await expect.poll(()=>page.getByText('Photo unavailable',{exact:true}).count()).toBe(0);
 trace.validOwnerPhotoSaved=true;trace.savedNoteAndPhoto=stored;trace.result='passed';
 }finally{writeFileSync(artifacts+'/photo-trace.json',JSON.stringify(trace,null,2));await context.close();}
},60000);
