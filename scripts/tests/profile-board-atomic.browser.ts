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
  ]) await db.exec(readFileSync(`supabase/migrations/${name}`,'utf8'));
  await db.query('INSERT INTO auth.sessions VALUES($1,$2,clock_timestamp())',[sessionId,testUid(1)]);
  await db.query('SELECT public.socialu_profile_space($1,$2,NULL,$3)',[testUid(1),'save_look',JSON.stringify({...DEFAULT_LOOK,hometown:'Original'})]);
  record('migration applied to disposable database');
  service = createServer(async (request,response) => {
    const reply = (status:number,data:unknown) => { response.writeHead(status,{'Content-Type':'application/json'}); response.end(JSON.stringify(data)); };
    try {
      const path = new URL(request.url!,'http://localhost').pathname;
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

it('retains a newer hometown, theme and decorations when a real board save resumes',async () => {
  const context = await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript((value: string) => localStorage.setItem('access_token',value),token);
  const boardPage = await context.newPage(), profilePage = await context.newPage();
  try {
    await boardPage.goto(base+'/profile',{waitUntil:'domcontentloaded'});
    await profilePage.goto(base+'/profile',{waitUntil:'domcontentloaded'});
    await boardPage.getByRole('tab',{name:'My Board',exact:true}).click();
    await boardPage.getByRole('button',{name:'Edit board',exact:true}).click();
    await boardPage.getByRole('button',{name:'Note',exact:true}).click();
    await boardPage.locator('fieldset textarea').fill('Bug 1223: my board and newer profile changes both survive.');
    await boardPage.screenshot({path:`${artifacts}/01-board-draft.png`,fullPage:true});
    pauseBoard = true;
    const saved = boardPage.waitForResponse((r:any) => r.url().includes('/api/profiles/space') && r.request().method() === 'PATCH');
    saved.catch(() => {});
    await boardPage.getByRole('button',{name:'Save board',exact:true}).click();
    await expect.poll(() => Boolean(releaseBoard),{timeout:10000}).toBe(true);
    const hometown = await api(profilePage,'PATCH',{field:'hometown',value:'New Salem'});
    expect(hometown.status).toBe(200); record('new hometown committed by second tab',{hometown:hometown.data.look.hometown});
    const current = await api(profilePage,'GET');
    const updated = {...current.data.look,theme:'midnight',stickers:[{id:'new-star',kind:'star',x:50,y:50,rotation:0}]};
    const decoration = await api(profilePage,'PUT',{look:updated});
    expect(decoration.status,JSON.stringify(decoration.data)).toBe(200); record('new theme and decorations committed by second tab',{theme:'midnight',stickers:updated.stickers});
    releaseBoard!();
    const result = await saved;
    expect(result.status()).toBe(200);
    const body = await result.json();
    expect(body.look).toMatchObject({hometown:'New Salem',theme:'midnight',stickers:updated.stickers,board:{items:[{text:'Bug 1223: my board and newer profile changes both survive.'}]}});
    record('board API confirmed both changes',{hometown:body.look.hometown,theme:body.look.theme,stickers:body.look.stickers,board:body.look.board});
    await boardPage.getByText('Your board is saved. Classmates can see it on your profile.',{exact:true}).waitFor();
    await boardPage.screenshot({path:`${artifacts}/02-save-confirmed.png`,fullPage:true});
    await boardPage.reload({waitUntil:'domcontentloaded'});
    await boardPage.getByRole('tab',{name:'My Board',exact:true}).click();
    await boardPage.getByText('Bug 1223: my board and newer profile changes both survive.',{exact:true}).waitFor();
    const fresh = await api(boardPage,'GET');
    expect(fresh.data.look).toEqual(body.look);
    record('fresh page read retained both changes',fresh.data.look);
    await boardPage.screenshot({path:`${artifacts}/03-after-reload.png`,fullPage:true});
    await boardPage.getByRole('tab',{name:'Posts',exact:true}).click();
    await boardPage.getByText('New Salem',{exact:false}).waitFor();
    await boardPage.screenshot({path:`${artifacts}/04-hometown-after-reload.png`,fullPage:true});
    writeFileSync(`${artifacts}/request-order.json`,JSON.stringify({environment:'local Next production build with disposable PGlite database and fixture Auth/PostgREST transport',events},null,2)+'\n');
  } catch(error) {
    await boardPage.screenshot({path:`${artifacts}/failure.png`,fullPage:true}).catch(() => {});
    console.error(await boardPage.locator('body').innerText().catch(() => ''),nextLog.slice(-2000));
    throw error;
  } finally { await context.close(); }
});
