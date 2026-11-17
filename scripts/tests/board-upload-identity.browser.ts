import { afterAll, beforeAll, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { createDormDatabase, testUid } from '../../__tests__/helpers/dormspace-db';
import { DEFAULT_LOOK } from '../../lib/profile-space';
import { boardInput } from '../../lib/profile-board';

// Real Next UI/API + actual SQL/migration in disposable PGlite. Only Supabase's
// Auth/PostgREST transport is replaced. Never connects to the hosted database.
const storedPhotos=new Map<string,Buffer>();
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
    '20261117020000_board_photo_ownership.sql',
  ]) await db.exec(readFileSync(`supabase/migrations/${name}`,'utf8'));
  await db.query('INSERT INTO auth.sessions VALUES($1,$2,clock_timestamp())',[sessionId,testUid(1)]);
  await db.query('SELECT public.socialu_profile_space($1,$2,NULL,$3)',[testUid(1),'save_look',JSON.stringify({...DEFAULT_LOOK,hometown:'Original'})]);
  record('migration applied to disposable database');
  service = createServer(async (request,response) => {
    const reply = (status:number,data:unknown) => { response.writeHead(status,{'Content-Type':'application/json'}); response.end(JSON.stringify(data)); };
    try {
      const path = new URL(request.url!,'http://localhost').pathname;
      if(path.startsWith('/storage/v1/object/media/')&&request.method==='POST'){
        const chunks:Buffer[]=[];for await(const chunk of request)chunks.push(Buffer.from(chunk));
        const form=await new Request('http://fixture',{method:'POST',headers:{'Content-Type':String(request.headers['content-type'])},body:Buffer.concat(chunks)}).formData();
        const file=Array.from(form.values()).find(value=>typeof value!=='string') as File;
        if(!file)throw Error('Expected uploaded media bytes');
        const key=decodeURIComponent(path.slice('/storage/v1/object/media/'.length));storedPhotos.set(key,Buffer.from(await file.arrayBuffer()));return reply(200,{Key:'media/'+key});
      }
      if(path.startsWith('/storage/v1/object/sign/media/'))return reply(200,{signedURL:'/fixture-photo/'+decodeURIComponent(path.slice('/storage/v1/object/sign/media/'.length))});
      if(path.includes('/fixture-photo/')){const bytes=storedPhotos.get(decodeURIComponent(path.split('/fixture-photo/')[1]));if(!bytes)return reply(404,{error:'Missing fixture media'});response.writeHead(200,{'Content-Type':'image/png'});response.end(bytes);return;}
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

async function upload(page:any,caption:string,file:string,board:boolean){
 await page.getByRole('button',{name:board?'Upload photo':'Add a memory',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'A little moment to keep',exact:true});await dialog.waitFor();
 await dialog.locator('input[type="file"]').setInputFiles(file);
 await dialog.getByPlaceholder('Campus days',{exact:true}).fill(caption);
 const done=page.waitForResponse((r:any)=>r.url().endsWith('/api/profiles/memories')&&r.request().method()==='POST');
 await dialog.getByRole('button',{name:'Pin it',exact:true}).click();
 const response=await done;const data=await response.json();expect(response.status(),JSON.stringify(data)).toBe(200);
 await dialog.waitFor({state:'hidden'});return data;
}
it('inserts exact Y after another-tab X upload, then handles single-tab Z and restores both after reload',async()=>{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addInitScript((value:string)=>localStorage.setItem('access_token',value),token);
 const page=await context.newPage(),other=await context.newPage();const trace:any={environment:'Actual local Next production UI/API/SQL; fixture Auth/PostgREST/private storage transport retaining actual uploaded PNG bytes'};
 try{
 await page.goto(base+'/profile',{waitUntil:'domcontentloaded'});await other.goto(base+'/profile',{waitUntil:'domcontentloaded'});
 await page.getByRole('tab',{name:'My Board',exact:true}).click();await page.getByRole('button',{name:'Edit board',exact:true}).click();
 // Wait until the original shelf was fetched empty; keep that component mounted.
 await expect.poll(()=>page.getByRole('button',{name:'Upload photo',exact:true}).isEnabled()).toBe(true);
 await page.evaluate(()=>(window as any).__boardUploadMarker='same-document');
 const x=await upload(other,'X — older photo from another tab','public/profile-space/campus-watercolor-v1.png',false);
 const y=await upload(page,'Y — photo I just uploaded','public/profile-space/campus-stickers-v2.png',true);
 const yId=y.memories.find((m:any)=>m.caption==='Y — photo I just uploaded').id;
 const photo=page.getByRole('button',{name:'Move photo; use arrow keys',exact:true});
 for(let i=0;i<30;i++)await photo.press('ArrowLeft');
 await expect.poll(()=>photo.locator('img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
 const shown=await photo.textContent();expect(await page.evaluate(()=>(window as any).__boardUploadMarker)).toBe('same-document');
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:artifacts+'/01-after-upload-y.png',fullPage:true});
 const saved=page.waitForResponse((r:any)=>r.url().endsWith('/api/profiles/space')&&r.request().method()==='PATCH');await page.getByRole('button',{name:'Save board',exact:true}).click();expect((await saved).status()).toBe(200);await page.getByRole('button',{name:'Edit board',exact:true}).waitFor();
 const board=(await api(other,'GET')).data.look.board;
 trace.twoTab={orderedMemoryCaptions:y.memories.map((m:any)=>m.caption),createdMemoryId:y.createdMemoryId??null,expectedMemoryId:yId,insertedCaption:shown,persistedMemoryId:board.items[0].memoryId,sameDocument:true};
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:artifacts+'/02-board-saved-y.png',fullPage:true});
 expect(board.items[0].memoryId).toBe(yId);expect(shown).toContain('Y — photo I just uploaded');expect(y.createdMemoryId).toBe(yId);
 await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('tab',{name:'My Board',exact:true}).click();await page.getByRole('button',{name:'Edit board',exact:true}).click();
 const z=await upload(page,'Z — next single-tab upload','public/profile-space/campus-stickers-expanded-v1.png',true);const zId=z.memories.find((m:any)=>m.caption==='Z — next single-tab upload').id;
 expect(z.createdMemoryId).toBe(zId);
 const savedZ=page.waitForResponse((r:any)=>r.url().endsWith('/api/profiles/space')&&r.request().method()==='PATCH');await page.getByRole('button',{name:'Save board',exact:true}).click();expect((await savedZ).status()).toBe(200);await page.getByRole('button',{name:'Edit board',exact:true}).waitFor();
 const final=(await api(other,'GET')).data.look.board;expect(final.items.map((i:any)=>i.memoryId)).toEqual([yId,zId]);trace.singleTab={createdMemoryId:zId,savedMemoryIds:final.items.map((i:any)=>i.memoryId)};
 await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('tab',{name:'My Board',exact:true}).click();await page.getByRole('button',{name:'Edit board',exact:true}).waitFor();
 await expect.poll(()=>page.getByRole('img',{name:'Z — next single-tab upload',exact:true}).count()).toBe(1);
 expect(await page.getByRole('img',{name:'Y — photo I just uploaded',exact:true}).count()).toBe(1);
 for(const caption of ['Y — photo I just uploaded','Z — next single-tab upload'])await expect.poll(()=>page.getByRole('img',{name:caption,exact:true}).evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:artifacts+'/03-reloaded-y-and-z.png',fullPage:true});
 const media=(await db.query<any>('SELECT memory_id,storage_key FROM socialu.profile_memories ORDER BY memory_id')).rows;
 trace.uploadSha256=media.map((m:any)=>({memoryId:m.memory_id,sha256:createHash('sha256').update(storedPhotos.get(m.storage_key)!).digest('hex')}));
 expect(new Set(trace.uploadSha256.map((v:any)=>v.sha256)).size).toBe(3);trace.result='passed';
 }catch(error){trace.result='failed';trace.error=String(error);throw error;}finally{writeFileSync(artifacts+'/upload-trace.json',JSON.stringify(trace,null,2));await context.close();}
},60000);
