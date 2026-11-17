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
const viewerSessionId=randomUUID();
const sessionId = randomUUID(), issued = Math.floor(Date.now()/1000);
const token = 'e30.' + Buffer.from(JSON.stringify({sub:testUid(1),iat:issued,exp:issued+3600,session_id:sessionId})).toString('base64url') + '.local-fixture';
const viewerToken='e30.'+Buffer.from(JSON.stringify({sub:testUid(2),iat:issued,exp:issued+3600,session_id:viewerSessionId})).toString('base64url')+'.viewer-fixture';
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
    '20261027080000_profile_memories.sql','20261116210000_atomic_profile_board_save.sql','20261117020000_board_photo_ownership.sql',
  ]) await db.exec(readFileSync(`supabase/migrations/${name}`,'utf8'));
  await db.query('INSERT INTO auth.sessions VALUES($1,$2,clock_timestamp()),($3,$4,clock_timestamp())',[sessionId,testUid(1),viewerSessionId,testUid(2)]);
  await db.exec("INSERT INTO socialu.profile_memories(student_id,storage_key,caption) VALUES(1,'owner-photo','Owner campus memory')");
  await db.query('SELECT public.socialu_profile_space($1,$2,NULL,$3)',[testUid(1),'save_look',JSON.stringify({...DEFAULT_LOOK,hometown:'Original'})]);
  record('migration applied to disposable database');
  service = createServer(async (request,response) => {
    const reply = (status:number,data:unknown) => { response.writeHead(status,{'Content-Type':'application/json'}); response.end(JSON.stringify(data)); };
    try {
      const path = new URL(request.url!,'http://localhost').pathname;
      if(path.includes('/object/sign/media/'))return reply(200,{signedURL:'/fixture-photo.png'});
      if(path.endsWith('/fixture-photo.png')){response.writeHead(200,{'Content-Type':'image/png'});response.end(readFileSync('public/profile-space/campus-watercolor-v1.png'));return;}
      if (path === '/auth/v1/user') {
        const who=request.headers.authorization===`Bearer ${token}`?1:request.headers.authorization===`Bearer ${viewerToken}`?2:0;const valid=Boolean(who);
        return reply(valid ? 200 : 401,valid ? {id:testUid(who),email:`dorm${who}@salemstate.edu`,email_confirmed_at:new Date().toISOString(),aud:'authenticated',role:'authenticated'} : {message:'Invalid local session'});
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

it('persists the owner contract, renders an authorized visitor and enforces ownership/block boundaries',async()=>{
 const owner=await browser.newContext({viewport:{width:1440,height:1000}}),viewer=await browser.newContext({viewport:{width:1440,height:1000}});
 await owner.addInitScript((v:string)=>localStorage.setItem('access_token',v),token);await viewer.addInitScript((v:string)=>localStorage.setItem('access_token',v),viewerToken);
 const a=await owner.newPage(),b=await viewer.newPage();
 const board=boardInput({items:[
 {id:'contract-note',kind:'note',text:'1039: my saved board, visible to classmates',color:'pink',x:3.25,y:7.125,width:25,rotation:-9},
 {id:'contract-photo',kind:'photo',memoryId:1,x:35.5,y:10.25,width:30,rotation:6},
 {id:'contract-sticker',kind:'sticker',sticker:'star',x:75,y:6,width:15,rotation:12},
 {id:'contract-project',kind:'project',title:'Owner project',text:'A verified saved project card',url:'https://example.edu/project',x:4,y:46,width:28,rotation:0},
 {id:'contract-music',kind:'music',url:'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',x:40,y:48,width:40,rotation:-3}
 ]});
 const trace:any={environment:'Actual local production UI/API and real SQL on disposable PGlite; two isolated browser contexts; Auth/PostgREST/media signing fixtures',board};
 try{
 await a.goto(base+'/profile',{waitUntil:'domcontentloaded'});await b.goto(base+'/profile',{waitUntil:'domcontentloaded'});
 const saved=await api(a,'PATCH',{field:'board',value:board});expect(saved.status).toBe(200);expect(saved.data.look.board).toEqual(board);expect(saved.data.look.hometown).toBe('Original');
 const stored=(await db.query<any>('SELECT look FROM socialu.profile_spaces WHERE student_id=1')).rows[0].look;expect(stored.board).toEqual(board);trace.postgresRoundTrip=true;trace.unrelatedLookPreserved=true;
 await a.reload({waitUntil:'domcontentloaded'});await a.getByRole('tab',{name:'My Board',exact:true}).click();await a.getByRole('button',{name:'Edit board',exact:true}).waitFor();await a.getByText('1039: my saved board, visible to classmates',{exact:true}).waitFor();
 await a.evaluate(()=>window.scrollTo(0,0));await a.screenshot({path:artifacts+'/01-owner-saved-contract.png',fullPage:true});
 await b.goto(base+'/students/dorm1',{waitUntil:'domcontentloaded'});await b.getByRole('tab',{name:'My Board',exact:true}).click();await b.getByText('1039: my saved board, visible to classmates',{exact:true}).waitFor();
 expect(await b.getByRole('button',{name:'Edit board',exact:true}).count()).toBe(0);expect(await b.getByRole('button',{name:'Save board',exact:true}).count()).toBe(0);
 const view=await b.evaluate(async()=>{const r=await fetch('/api/profiles/space?username=dorm1',{headers:{Authorization:'Bearer '+localStorage.getItem('access_token')}});return {status:r.status,data:await r.json()};});
 expect(view.status).toBe(200);expect(view.data.look.board).toEqual(board);trace.visitorReadExact=true;trace.visitorHasNoEditControls=true;
 await expect.poll(()=>b.getByRole('img',{name:'Owner campus memory',exact:true}).evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
 await b.evaluate(()=>window.scrollTo(0,0));await b.screenshot({path:artifacts+'/02-authorized-visitor-readonly.png',fullPage:true});
 const attack={items:[{id:'intruder-note',kind:'note',text:'Must not overwrite the owner',color:'cream',x:10,y:10,width:28,rotation:0}]};
 const forged=await api(b,'PATCH',{field:'board',value:attack,username:'dorm1',auth_id:testUid(1),studentId:1});
 expect(forged.status).toBe(200); // owner-only route saves the verified caller's own board, ignoring forged owner fields
 expect((await db.query<any>('SELECT look FROM socialu.profile_spaces WHERE student_id=1')).rows[0].look.board).toEqual(board);
 expect((await db.query<any>('SELECT look FROM socialu.profile_spaces WHERE student_id=2')).rows[0].look.board).toEqual(attack);trace.forgedOwnerFieldsIgnored=true;
 await expect(db.query('SELECT public.socialu_profile_space($1,$2,$3,$4)',[testUid(2),'save_look','dorm1',JSON.stringify({...DEFAULT_LOOK,board:attack})])).rejects.toMatchObject({code:'42501'});trace.explicitForeignWriteDenied=true;
 await db.exec('INSERT INTO socialu.student_blocks(blocker_id,blocked_id) VALUES(1,2)');
 const denied=await b.evaluate(async()=>{const r=await fetch('/api/profiles/space?username=dorm1',{headers:{Authorization:'Bearer '+localStorage.getItem('access_token')}});return {status:r.status,data:await r.json()};});expect(denied.status).toBe(404);trace.blockedVisitor=denied;
 await b.reload({waitUntil:'domcontentloaded'});await expect.poll(()=>b.getByRole('tab',{name:'My Board',exact:true}).count()).toBe(0);await b.evaluate(()=>window.scrollTo(0,0));await b.screenshot({path:artifacts+'/03-blocked-visitor-denied.png',fullPage:true});
 expect((await api(a,'GET')).data.look.board).toEqual(board);trace.ownerStillReadsAfterBlock=true;trace.result='passed';
 }catch(e){trace.result='failed';trace.error=String(e);throw e;}finally{writeFileSync(artifacts+'/contract-ownership-trace.json',JSON.stringify(trace,null,2));await owner.close();await viewer.close();}
},60000);
