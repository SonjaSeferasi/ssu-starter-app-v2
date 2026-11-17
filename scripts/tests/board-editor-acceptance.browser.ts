import { afterAll, beforeAll, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { createDormDatabase, testUid } from '../../__tests__/helpers/dormspace-db';
import { DEFAULT_LOOK } from '../../lib/profile-space';

// Real Next UI/API + actual SQL/migration in disposable PGlite. Only Supabase's
// Auth/PostgREST transport is replaced. Never connects to the hosted database.
const artifacts = process.env.BOARD_EVIDENCE_DIR || 'tmp/board-1041';
let db: PGlite, service: Server, next: ChildProcess, browser: any;
let base = '', nextLog = '', failNextBoard=false;
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
      if(fn==='socialu_save_profile_board'&&failNextBoard){failNextBoard=false;return reply(400,{code:'22023',message:'Controlled acceptance failure: keep this draft.'});}
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
  await browser?.close(); next?.kill('SIGTERM');
  await new Promise<void>(resolve => service ? service.close(() => resolve()) : resolve());
  await db?.close();
});

const boardSection=(page:any)=>page.locator('section[aria-labelledby="my-board-title"]');
async function arrange(page:any,kind:string,x:number,y:number,width:number,turns:number){
 const card=page.getByRole('button',{name:`Move ${kind}; use arrow keys`,exact:true});await card.press('Enter');
 const slider=page.locator('fieldset input[type="range"]');await slider.press('Home');for(let i=10;i<width;i++)await slider.press('ArrowRight');
 const pos=await card.evaluate((e:HTMLElement)=>({x:parseFloat(e.style.left),y:parseFloat(e.style.top)}));
 for(let i=0;i<Math.abs(x-pos.x);i++)await card.press(x<pos.x?'ArrowLeft':'ArrowRight');
 for(let i=0;i<Math.abs(y-pos.y);i++)await card.press(y<pos.y?'ArrowUp':'ArrowDown');
 for(let i=0;i<turns;i++)await page.getByRole('button',{name:'Rotate',exact:true}).click();
}
async function geometry(page:any){return boardSection(page).locator('div[style*="rotate("]').evaluateAll((els:HTMLElement[])=>els.filter(e=>e.style.left&&e.style.top&&e.style.width).map(e=>({left:e.style.left,top:e.style.top,width:e.style.width,transform:e.style.transform})));}
it('edits every card type, preserves a rejected draft, saves exact layout and exposes visitor read-only controls',async()=>{
 const owner=await browser.newContext({viewport:{width:1440,height:1000}}),visitor=await browser.newContext({viewport:{width:1440,height:1000}});await owner.addInitScript((t:string)=>localStorage.setItem('access_token',t),token);await visitor.addInitScript((t:string)=>localStorage.setItem('access_token',t),viewerToken);
 const page=await owner.newPage(),viewer=await visitor.newPage();const trace:any={environment:'Actual local production UI/API and real SQL in disposable PGlite; fixture Auth/PostgREST/media signing; rejected save is an explicitly injected test fault'};
 try{
 await page.goto(base+'/profile',{waitUntil:'domcontentloaded'});await page.getByRole('tab',{name:'My Board',exact:true}).click();await page.getByRole('button',{name:'Edit board',exact:true}).click();
 await page.getByRole('button',{name:'Note',exact:true}).click();await page.locator('fieldset textarea').fill('1041: all five editable cards');await arrange(page,'note',2,5,28,1);
 await page.getByRole('button',{name:'Add Owner campus memory',exact:true}).click();await arrange(page,'photo',35,8,30,2);
 await page.getByRole('button',{name:'Add Star sticker',exact:true}).click();await arrange(page,'sticker',80,5,15,4);
 await page.getByRole('button',{name:'Project',exact:true}).click();await page.getByLabel('Project title',{exact:true}).fill('1041 project');await page.locator('fieldset textarea').fill('My editor saves this card');await page.getByLabel('Project link (optional)',{exact:true}).fill('https://example.edu/project');await arrange(page,'project',2,45,30,0);
 await page.getByRole('button',{name:'Music',exact:true}).click();await page.getByLabel('Spotify link',{exact:true}).fill('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC');await arrange(page,'music',40,48,42,10);
 // Actual pointer drag supplements keyboard movement.
 const note=page.getByRole('button',{name:'Move note; use arrow keys',exact:true});await note.scrollIntoViewIfNeeded();const box=await note.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+20,box.y+box.height/2+10,{steps:5});await page.mouse.up();expect(parseFloat(await note.evaluate((e:HTMLElement)=>e.style.left))).toBeGreaterThan(2);trace.pointerAndKeyboardMovement=true;
 await page.getByRole('button',{name:'Note',exact:true}).click();await page.locator('fieldset textarea').fill('Temporary card to remove');await page.getByRole('button',{name:'Remove',exact:true}).click();expect(await boardSection(page).getByRole('button',{name:/^Move /}).count()).toBe(5);expect(await page.getByText('Temporary card to remove',{exact:true}).count()).toBe(0);trace.removal=true;
 const before=await geometry(page);expect(before).toHaveLength(5);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:artifacts+'/01-all-five-cards-editable.png',fullPage:true});
 failNextBoard=true;const failed=page.waitForResponse((r:any)=>r.url().endsWith('/api/profiles/space')&&r.request().method()==='PATCH');await page.getByRole('button',{name:'Save board',exact:true}).click();expect((await failed).status()).toBe(400);await page.getByRole('alert').filter({hasText:'Controlled acceptance failure'}).waitFor();expect(await geometry(page)).toEqual(before);expect((await api(page,'GET')).data.look.board).toBeUndefined();trace.failedSavePreservesDraft=true;
 const warning=page.waitForEvent('dialog');page.once('dialog',(d:any)=>d.dismiss());await page.getByRole('button',{name:'Cancel',exact:true}).click();expect((await warning).message()).toContain('Discard your unsaved board');expect(await geometry(page)).toEqual(before);trace.unsavedCancelWarningKeepsDraft=true;
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:artifacts+'/02-failed-save-draft-retained.png',fullPage:true});
 const saved=page.waitForResponse((r:any)=>r.url().endsWith('/api/profiles/space')&&r.request().method()==='PATCH');await page.getByRole('button',{name:'Save board',exact:true}).click();const response=await saved;expect(response.status()).toBe(200);const expected=response.request().postDataJSON().value;expect((await response.json()).look.board).toEqual(expected);await page.getByRole('button',{name:'Edit board',exact:true}).waitFor();expect((await api(page,'GET')).data.look.board).toEqual(expected);trace.exactSavedBoard=expected;
 await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('tab',{name:'My Board',exact:true}).click();await page.getByRole('button',{name:'Edit board',exact:true}).waitFor();expect(await geometry(page)).toEqual(before);await expect.poll(()=>page.getByRole('img',{name:'Owner campus memory',exact:true}).evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);trace.reloadRestoresExactGeometry=true;
 for(const tab of ['Posts','Tagged','Saved','My Board']){await page.getByRole('tab',{name:tab,exact:true}).click();}await page.getByRole('button',{name:'Edit board',exact:true}).waitFor();trace.ownerTabsAvailable=true;
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:artifacts+'/03-owner-saved-reloaded-layout.png',fullPage:true});
 await viewer.goto(base+'/students/dorm1',{waitUntil:'domcontentloaded'});await viewer.getByRole('tab',{name:'My Board',exact:true}).click();await viewer.getByText('1041: all five editable cards',{exact:true}).waitFor();expect(await geometry(viewer)).toEqual(before);expect(await viewer.getByRole('button',{name:'Edit board',exact:true}).count()).toBe(0);expect(await viewer.getByRole('tab',{name:'Saved',exact:true}).count()).toBe(0);trace.visitorReadonlyAndSavedPrivate=true;await viewer.evaluate(()=>window.scrollTo(0,0));await viewer.screenshot({path:artifacts+'/04-visitor-no-edit-controls.png',fullPage:true});trace.result='passed';trace.events=events;
 }catch(e){trace.result='failed';trace.error=String(e);throw e;}finally{writeFileSync(artifacts+'/editor-acceptance-trace.json',JSON.stringify(trace,null,2));await owner.close();await visitor.close();}
},90000);
