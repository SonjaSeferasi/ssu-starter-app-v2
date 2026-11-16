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


it('keeps rotated starter cards savable and restores their saved angles after reload',async () => {
  const output = process.env.BOARD_ROTATION_EVIDENCE_DIR || 'tmp/board-1224';
  mkdirSync(output,{recursive:true});
  const context = await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript((value: string) => localStorage.setItem('access_token',value),token);
  const page = await context.newPage();
  const trace: any = {environment:'local Next production build with disposable PGlite; fixture Supabase Auth/PostgREST transport',starterStarAngles:[],otherStartingAngles:[]};
  const canvas = page.locator('[aria-label="Scrapbook board"]');
  const angle = (item: any) => item.evaluate((element: HTMLElement) => Number(/rotate\(([-\d.]+)deg\)/.exec(element.style.transform)![1]));
  const shot = async (name: string) => { await page.evaluate(() => window.scrollTo(0,0)); await page.screenshot({path:`${output}/${name}.png`,fullPage:true}); };
  const save = async () => {
    const result = page.waitForResponse((r:any) => r.url().includes('/api/profiles/space') && r.request().method()==='PATCH');
    result.catch(() => {});
    await page.getByRole('button',{name:'Save board',exact:true}).click();
    const response = await result;
    expect(response.status()).toBe(200);
    await page.getByText('Your board is saved. Classmates can see it on your profile.',{exact:true}).waitFor();
    return response.json();
  };
  const reloadBoard = async () => {
    await page.reload({waitUntil:'domcontentloaded'});
    await page.getByRole('tab',{name:'My Board',exact:true}).click();
    await expect.poll(() => page.getByRole('button',{name:'Edit board',exact:true}).isEnabled()).toBe(true);
  };
  try {
    await page.goto(base+'/profile',{waitUntil:'domcontentloaded'});
    expect((await api(page,'PUT',{look:{...DEFAULT_LOOK,hometown:'Original',board:{items:[]}}})).status).toBe(200);
    await reloadBoard();
    await page.getByRole('button',{name:'Edit board',exact:true}).click();
    await page.getByRole('button',{name:'Start with a layout',exact:true}).click();
    const star = canvas.locator(':scope > div[role="button"]').nth(1);
    await star.click();
    trace.starterStarAngles.push(await angle(star));
    expect(trace.starterStarAngles[0]).toBe(8);
    for(let click=0;click<3;click++) {
      await page.getByRole('button',{name:'Rotate',exact:true}).click();
      trace.starterStarAngles.push(await angle(star));
    }
    expect(trace.starterStarAngles).toEqual([8,11,14,15]);
    await shot('01-valid-rotation');
    const saved = await save();
    trace.savedStar = saved.look.board.items.find((item:any) => item.sticker==='star');
    expect(trace.savedStar.rotation).toBe(15);
    trace.saveStatus = 200;
    await shot('02-save-confirmed');
    await reloadBoard();
    expect(await angle(canvas.locator(':scope > div').nth(1))).toBe(15);
    trace.reloadedStar = (await api(page,'GET')).data.look.board.items.find((item:any) => item.sticker==='star');
    expect(trace.reloadedStar).toEqual(trace.savedStar);
    await shot('03-rotation-after-reload');
    // Every starter-layout angle, both bounds, and a fractional near-bound value.
    for(const initial of [-3,8,-4,-8,-5,4,-2,-15,15,14.5]) {
      const item = {id:'rotation-check',kind:'sticker',sticker:'star',x:40,y:25,width:14,rotation:initial};
      expect((await api(page,'PATCH',{field:'board',value:{items:[item]}})).status).toBe(200);
      await reloadBoard();
      await page.getByRole('button',{name:'Edit board',exact:true}).click();
      const selected = canvas.locator(':scope > div[role="button"]').first();
      await selected.click();
      const observed:number[] = [];
      for(let click=0;click<12;click++) {
        await page.getByRole('button',{name:'Rotate',exact:true}).click();
        const rotation = await angle(selected);
        observed.push(rotation);
        expect(() => boardInput({items:[{...item,rotation}]})).not.toThrow();
      }
      const stored = await save();
      expect(stored.look.board.items[0].rotation).toBe(observed.at(-1));
      await reloadBoard();
      expect(await angle(canvas.locator(':scope > div').first())).toBe(observed.at(-1));
      trace.otherStartingAngles.push({initial,observed,saved:stored.look.board.items[0].rotation,reloadConfirmed:true});
    }
    trace.result = 'passed';
    writeFileSync(`${output}/rotation-trace.json`,JSON.stringify(trace,null,2)+'\n');
  } catch(error) {
    const button = page.getByRole('button',{name:'Save board',exact:true});
    if(await button.count() && await button.isEnabled()) {
      await button.click().catch(() => {});
      await page.getByRole('alert').waitFor({timeout:2000}).catch(() => {});
    }
    trace.result = 'failed'; trace.error = String(error);
    trace.visibleError = await page.getByRole('alert').allTextContents();
    await shot('failure').catch(() => {});
    writeFileSync(`${output}/rotation-trace.json`,JSON.stringify(trace,null,2)+'\n');
    throw error;
  } finally { await context.close(); }
});

it('protects dirty boards on Back and Forward while preserving normal navigation',async () => {
  const output=process.env.BOARD_HISTORY_EVIDENCE_DIR || 'tmp/board-1225';
  mkdirSync(output,{recursive:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript((value:string)=>localStorage.setItem('access_token',value),token);
  const page=await context.newPage();
  const trace:any={environment:'local Next production UI/API and real SQL on disposable PGlite; fixture Auth/PostgREST',steps:[]};
  const record=(step:string,detail?:unknown)=>trace.steps.push({step,detail});
  const warning=page.getByRole('dialog',{name:'Leave without saving your board?',exact:true});
  const draft='Keep this unsaved board draft after Stay.';
  const shot=async(name:string)=>{await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${output}/${name}.png`,fullPage:true});};
  const openBoard=async()=>{
    await page.getByRole('tab',{name:'My Board',exact:true}).click();
    await expect.poll(()=>page.getByRole('button',{name:'Edit board',exact:true}).isEnabled()).toBe(true);
  };
  const edit=async(text:string)=>{
    await page.getByRole('button',{name:'Edit board',exact:true}).click();
    await page.getByRole('button',{name:'Note',exact:true}).click();
    await page.locator('fieldset textarea').fill(text);
  };
  const stays=async(direction:'back'|'forward')=>{
    if(direction==='back')await page.goBack({waitUntil:'commit'});else await page.goForward({waitUntil:'commit'});
    await warning.waitFor({timeout:5000});
    expect(new URL(page.url()).pathname).toBe('/profile');
    record(`${direction} warning`,{url:page.url()});
    await shot(direction==='back'?'01-back-warning':'02-forward-warning');
    await warning.getByRole('button',{name:'Stay',exact:true}).click();
    expect(await page.locator('fieldset textarea').inputValue()).toBe(draft);
    record(`${direction} Stay retained draft`);
  };
  try{
    await page.goto(base+'/profile',{waitUntil:'domcontentloaded'});
    expect((await api(page,'PUT',{look:{...DEFAULT_LOOK,board:{items:[]}}})).status).toBe(200);
    await page.getByRole('link',{name:'Campus Feed',exact:true}).click();
    await page.waitForURL(base+'/');
    await page.getByRole('link',{name:'Your profile',exact:true}).click();
    await page.waitForURL(base+'/profile');
    await page.locator('a[href="/events"]').first().click();
    await page.waitForURL(base+'/events');
    await page.goBack({waitUntil:'commit'});
    await page.waitForURL(base+'/profile');
    await openBoard();await edit(draft);
    const historyLength=await page.evaluate(()=>history.length);
    trace.historyLengthBefore=historyLength;
    await stays('back');
    await stays('forward');
    await stays('back');
    expect(await page.evaluate(()=>history.length)).toBe(historyLength);
    record('history length unchanged after repeated Stay',{historyLength});
    await shot('03-stay-retains-draft');
    // Existing native confirmations must still protect links and profile tabs.
    for(const kind of ['tab','link']){
      const dialog=page.waitForEvent('dialog');
      const click=kind==='tab'?page.getByRole('tab',{name:'Posts',exact:true}).click():page.getByRole('link',{name:'Campus Feed',exact:true}).click();
      const prompt=await dialog;expect(prompt.message()).toBe('Leave without saving your board?');
      await prompt.dismiss();await click;
      expect(await page.locator('fieldset textarea').inputValue()).toBe(draft);
      record(`${kind} cancellation retained draft`);
    }
    await page.goBack({waitUntil:'commit'});await warning.waitFor();
    await warning.getByRole('button',{name:'Leave without saving',exact:true}).click();
    await page.waitForURL(base+'/');
    expect((await api(page,'GET')).data.look.board.items).toEqual([]);
    record('confirmed departure reached Campus Feed without saving');
    await page.goForward({waitUntil:'commit'});await page.waitForURL(base+'/profile');
    await openBoard();
    expect(await page.getByText(draft,{exact:true}).count()).toBe(0);
    record('Forward returned normally after confirmed discard');
    await shot('04-confirmed-discard');
    await edit('Saved after choosing Stay.');
    await page.goBack({waitUntil:'commit'});await warning.waitFor();
    await warning.getByRole('button',{name:'Stay',exact:true}).click();
    const response=page.waitForResponse((r:any)=>r.url().includes('/api/profiles/space')&&r.request().method()==='PATCH');
    response.catch(()=>{});
    await page.getByRole('button',{name:'Save board',exact:true}).click();
    expect((await response).status()).toBe(200);
    await page.getByText('Your board is saved. Classmates can see it on your profile.',{exact:true}).waitFor();
    record('draft saved after Stay',{status:200});
    await page.goBack({waitUntil:'commit'});await page.waitForURL(base+'/');
    expect(await warning.count()).toBe(0);
    record('clean Back completed without warning');
    await page.goForward({waitUntil:'commit'});await page.waitForURL(base+'/profile');
    await openBoard();await page.getByText('Saved after choosing Stay.',{exact:true}).waitFor();
    record('saved board restored after clean Back and Forward');
    await shot('05-saved-draft-restored');
    trace.result='passed';
  }catch(error){
    trace.result='failed';trace.error=String(error);trace.urlAtFailure=page.url();
    // Preserve faithful evidence of the original silent departure and lost draft.
    if(new URL(page.url()).pathname==='/'){
      await page.goForward({waitUntil:'commit'}).catch(()=>{});
      await page.getByRole('tab',{name:'My Board',exact:true}).click().catch(()=>{});
      trace.draftVisibleAfterReturn=await page.getByText(draft,{exact:true}).count();
    }
    await shot('failure').catch(()=>{});throw error;
  }finally{
    writeFileSync(`${output}/history-trace.json`,JSON.stringify(trace,null,2)+'\n');
    await context.close();
  }
},90000);
