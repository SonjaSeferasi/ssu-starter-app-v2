import { createRequire } from 'node:module';
import { prepareLiveDatabase } from '../../__tests__/helpers/dormspace-live-db';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { type Rotation } from '../../lib/dormspace-rules';
import { defaultPixelLook, pixelHairstyles, pixelLookKey, pixelOutfits, resolveDormAvatar, type PixelAvatarLook } from '../../lib/dormspace-avatar';
import { faceDetails, shirtColors, pantsColors, sampleFaceStyles } from '../../lib/game-room';
import { befriend, createDormDatabase, dormCall, friendship, testUid } from '../../__tests__/helpers/dormspace-db';
// The real Next UI and API run against real schema/functions in PGlite. Only the provider's
// Auth/Storage/PostgREST HTTP transport is replaced. This service binds to loopback and is never shipped.
let db: PGlite, service: Server, next: ChildProcess, browser: any, owner: any, visitor: any;
let base = '', nextLog = '', failSave = false, failReload = false, failAvatarReads = false, signingIn: any;
const sessions = new Map<string, any>();
const {WebSocketServer}=createRequire(import.meta.url)('next/dist/compiled/ws');
let realtimeServer:any, eventCursor=0, broadcastQueue:Promise<unknown>=Promise.resolve();
const realtimePeers=new Map<any,{topic:string;joinRef:string|null}>();
function attachRealtime(){
  realtimeServer=new WebSocketServer({noServer:true});
  service.on('upgrade',(request,socket,head)=>{
    if(!request.url?.startsWith('/realtime/v1/websocket')){socket.destroy();return;}
    realtimeServer.handleUpgrade(request,socket,head,(peer:any)=>realtimeServer.emit('connection',peer));
  });
  realtimeServer.on('connection',(peer:any)=>{
    realtimePeers.set(peer,{topic:'',joinRef:null});
    peer.on('close',()=>realtimePeers.delete(peer));
    peer.on('message',(raw:Buffer)=>{
      let packet:any;try{packet=JSON.parse(raw.toString());}catch{return;}
      const [joinRef,ref,topic,event,payload]=Array.isArray(packet)?packet:[packet.join_ref,packet.ref,packet.topic,packet.event,packet.payload];
      const send=(status:string,response:any={})=>peer.send(JSON.stringify([joinRef,ref,topic,'phx_reply',{status,response}]));
      if(event==='phx_join'){
        const account=sessions.get(payload.access_token);
        if(!account||topic!==`realtime:dormspace:${account.id}`||payload.config?.private!==true){send('error',{reason:'Unauthorized private topic'});return;}
        realtimePeers.set(peer,{topic,joinRef});send('ok');
      }else if(event==='heartbeat'||event==='access_token')send('ok');
      else if(event==='phx_leave'){realtimePeers.set(peer,{topic:'',joinRef:null});send('ok');}
      else send('error',{reason:'Client broadcasts are not allowed'});
    });
  });
}
async function flushBroadcasts(){
  broadcastQueue=broadcastQueue.catch(()=>{}).then(async()=>{
    const rows=(await db.query<any>('SELECT * FROM public.test_live_events WHERE id>$1 ORDER BY id',[eventCursor])).rows;
    for(const row of rows){eventCursor=Number(row.id);for(const [peer,info] of realtimePeers){
      if(peer.readyState===1&&info.topic===`realtime:${row.topic}`)peer.send(JSON.stringify([info.joinRef,null,info.topic,'broadcast',{type:'broadcast',event:row.event,payload:row.payload}]));
    }}
  });
  await broadcastQueue;
}
const artifacts = process.env.DORMSPACE_EVIDENCE_DIR || 'tmp/dormspace-multiplayer';
const user = (student: number) => ({ id: testUid(student), email: `dorm${student}@salemstate.edu`, email_confirmed_at: '2026-10-19T12:00:00Z', aud: 'authenticated', role: 'authenticated', user_metadata: { full_name: `Dorm Student ${student}`, username: `dorm${student}` } });
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function listen(server: Server) {
    await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    return (server.address() as {
        port: number;
    }).port;
}
async function api(page: any, path: string, method = 'GET', body?: any) {
    return page.evaluate(async ({ path, method, body }: {
        path: string;
        method: string;
        body: any;
    }) => {
        const response = await fetch(path, { method, headers: { Authorization: `Bearer ${localStorage.getItem('access_token') || sessionStorage.getItem('access_token') || ''}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
        return { status: response.status, data: await response.json() };
    }, { path, method, body });
}
async function signIn(student: number, viewport = { width: 1280, height: 1000 }, controlledClock = false) {
    const context = await browser.newContext({ viewport, hasTouch: viewport.width < 600 });
    const page = await context.newPage();
    if (controlledClock)
        await page.clock.install();
    signingIn = page;
    await page.goto(base + '/login', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => { const form = document.querySelector('form'); return form && Object.keys(form).some(key => key.startsWith('__reactProps$')); });
    await page.getByRole('textbox', { name: 'University email or username' }).fill(`dorm${student}@salemstate.edu`);
    await page.getByLabel('Password', { exact: true }).fill('DormTest123!');
    const loginResponse = page.waitForResponse((response: any) => response.url().endsWith('/api/auth/login') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    const login = await loginResponse;
    if (!login.ok())
        throw new Error(`Test account sign-in failed: ${login.status()} ${await login.text()}`);
    await page.waitForFunction(() => Boolean(localStorage.getItem('access_token') || sessionStorage.getItem('access_token')));
    await page.goto(base + '/game-room/dormspace');
    await page.getByRole('heading', { name: /DormHall/ }).waitFor();
    return page;
}
async function openOwn(page: any) {
    await page.getByRole('button', { name: 'My Dorm', exact: true }).click();
    await page.getByRole('heading', { name: 'My Dorm', exact: true }).waitFor();
}
async function saved(page: any) { await page.getByText('✔ All changes saved', { exact: true }).waitFor(); }
async function decorate(page: any) { await page.getByRole('button', { name: 'Decorate', exact: true }).click(); }
async function screenshot(page: any, name: string) {
    // Reset page scrolling before a full-page capture so the sticky navigation stays at the top.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${artifacts}/${name}.png`, fullPage: true });
}
beforeAll(async () => {
    mkdirSync(artifacts, { recursive: true });
    console.info('Preparing isolated DormSpace browser database.');
    db = await createDormDatabase(23);
    await db.exec(readFileSync('supabase/migrations/20261020013144_dormspace_furnishings.sql', 'utf8'));
    await db.exec(readFileSync('supabase/migrations/20261020021507_dormspace_rotation.sql', 'utf8'));
    await prepareLiveDatabase(db,0);
    await befriend(db,1,2); await befriend(db,1,3);
    // Additional supported outfits are test fixtures only; no ownership grants run in the hosted app.
    await db.exec(`INSERT INTO socialu.catalog_items(kind,name,preview_key,purchasable) VALUES ('outfit','Study day','sample-study',false),('outfit','Weekend','sample-weekend',false);
    INSERT INTO socialu.owned_items(student_id,item_id) SELECT s.student_id,c.item_id FROM socialu.students s CROSS JOIN socialu.catalog_items c WHERE c.kind='outfit' ON CONFLICT DO NOTHING;`);
    await db.exec("INSERT INTO socialu.media_assets(owner_id,storage_key,upload_context,mime_type,byte_count) VALUES(2,'profile/dorm2.png','profile','image/png',100); UPDATE socialu.student_profiles SET photo_id=(SELECT asset_id FROM socialu.media_assets WHERE storage_key='profile/dorm2.png') WHERE student_id=2;");
    service = createServer(async (request, response) => {
        const path = new URL(request.url!, 'http://localhost').pathname;
        let raw = '';
        for await (const chunk of request)
            raw += chunk;
        const body = raw ? JSON.parse(raw) : {};
        const reply = (status: number, data: any) => { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(data)); };
        try {
            if (path === '/auth/v1/token') {
                const student = Number(/^dorm([1-4])@salemstate.edu$/.exec(body.email || '')?.[1]);
                if (!student || body.password !== 'DormTest123!') {
                    reply(400, { message: 'Invalid credentials' });
                    return;
                }
                const id = randomUUID(), iat = Math.floor(Date.now() / 1000);
                const token = 'e30.' + Buffer.from(JSON.stringify({ sub: testUid(student), iat, exp: iat + 3600, session_id: id })).toString('base64url') + '.local-test';
                await db.query('INSERT INTO auth.sessions VALUES($1,$2,clock_timestamp())', [id, testUid(student)]);
                sessions.set(token, user(student));
                reply(200, { access_token: token, refresh_token: 'local-refresh', expires_in: 3600, expires_at: iat + 3600, token_type: 'bearer', user: user(student) });
                return;
            }
            if (path === '/auth/v1/user') {
                const account = sessions.get(request.headers.authorization?.slice(7) || '');
                reply(account ? 200 : 401, account || { message: 'Expired session' });
                return;
            }
            if (path.startsWith('/storage/v1/object/sign/media/')) {
                reply(200, { signedURL: '/object/sign/media/' + path.split('/media/')[1] + '?token=local-private' });
                return;
            }
            if (path.startsWith('/storage/v1/object/sign/')) {
                response.writeHead(200, { 'Content-Type': 'image/png' });
                response.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64'));
                return;
            }
            const fn = path.match(/^\/rest\/v1\/rpc\/(socialu_[a-z_]+)$/)?.[1];
            if (!fn || !Object.keys(body).every(key => /^p_[a-z_]+$/.test(key))) {
                reply(404, { code: 'PGRST202', message: 'Unknown local test endpoint' });
                return;
            }
            if (fn === 'socialu_dorm' && body.p_action === 'save' && failSave) {
                failSave = false;
                reply(503, { code: '08006', message: 'Simulated lost connection' });
                return;
            }
            if (fn === 'socialu_dorm' && body.p_action === 'open' && failReload) {
                failReload = false;
                reply(503, { code: '08006', message: 'Simulated reload failure' });
                return;
            }
            if (fn === 'socialu_avatar_customization' && !body.p_appearance && failAvatarReads) {
                reply(503, { code: '08006', message: 'Simulated avatar outage' });
                return;
            }
            const entries = Object.entries(body);
            const result = await db.query<{
                result: any;
            }>(`SELECT public.${fn}(${entries.map(([key], index) => `${key} => $${index + 1}`).join(',')}) AS result`, entries.map(([, value]) => value && typeof value === 'object' ? JSON.stringify(value) : value));
            await flushBroadcasts();
            reply(200, result.rows[0].result);
        }
        catch (error: any) {
            reply(400, { code: error.code || 'TEST', message: error.message });
        }
    });
    attachRealtime();
    const servicePort = await listen(service);
    console.info('Isolated database transport ready.');
    const reservation = createServer();
    const nextPort = await listen(reservation);
    await new Promise<void>(resolve => reservation.close(() => resolve()));
    base = `http://127.0.0.1:${nextPort}`;
    next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(nextPort)], {
        cwd: process.env.DORMSPACE_APP_ROOT || process.cwd(),
        env: { ...process.env, SUPABASE_URL: `http://127.0.0.1:${servicePort}`, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${servicePort}`, SUPABASE_SERVICE_ROLE_KEY: 'isolated-test-service-key', SUPABASE_ANON_KEY: 'isolated-test-anon-key', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'isolated-test-anon-key', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    next.stdout?.on('data', chunk => { nextLog += chunk.toString(); });
    next.stderr?.on('data', chunk => { nextLog += chunk.toString(); });
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
        try {
            if ((await fetch(base + '/api/dorm')).status === 401) {
                ready = true;
                break;
            }
        }
        catch { }
        if (next.exitCode !== null)
            break;
        await delay(300);
    }
    if (!ready)
        throw new Error('Local Next test app did not start: ' + nextLog.slice(-3000));
    console.info('Local application ready.');
    const playwright = await import(/* @vite-ignore */ process.env.SOCIALU_PLAYWRIGHT_MODULE || 'playwright');
    browser = await playwright.chromium.launch({ headless: true, ...(process.env.DORMSPACE_BROWSER_EXECUTABLE ? { executablePath: process.env.DORMSPACE_BROWSER_EXECUTABLE } : {}) });
}, 90000);
afterEach(async (context) => {
    if (context.task.result?.state === 'fail') {
        for (const [name, page] of [['owner', owner], ['visitor', visitor], ['sign-in', signingIn]] as const)
            if (page && !page.isClosed()) {
                await page.screenshot({ path: `${artifacts}/failure-${name}.png`, fullPage: true }).catch(() => { });
                console.error(name, await page.locator('body').innerText().catch(() => 'Page closed'));
            }
        console.error(nextLog.slice(-2500));
    }
});
afterAll(async () => {
    await browser?.close();
    for(const peer of realtimePeers.keys())peer.terminate();
    await new Promise<void>(resolve=>realtimeServer?realtimeServer.close(()=>resolve()):resolve());
    next?.kill('SIGTERM');
    await new Promise<void>(resolve => service ? service.close(() => resolve()) : resolve());
    await db?.close();
});
async function artReady(page: any) {
    await page.waitForFunction(() => [...document.querySelectorAll('canvas[data-art]')].every(canvas => (canvas as HTMLElement).dataset.ready === 'true'));
    expect(await page.locator('[data-art-error="true"]').count()).toBe(0);
}
async function avatarSize(page: any, widthInCells = 1.4) {
    await page.waitForFunction(() => document.querySelector('[data-dorm-avatar] canvas')?.getAttribute('data-ready') === 'true');
    const size = await page.locator('[data-dorm-avatar]').evaluate((model: HTMLElement) => {
        const frame = model.querySelector('canvas')!.getBoundingClientRect(), bounds = model.getBoundingClientRect();
        return { widthInCells: frame.width / bounds.width, aspect: frame.height / frame.width,
            roomScale: frame.width / 96 / (model.parentElement!.getBoundingClientRect().width / 640) };
    });
    expect(size.widthInCells).toBeCloseTo(widthInCells, 2);
    expect(size.aspect).toBeCloseTo(128 / 96, 2);
    return size;
}
async function furnish(page: any, rotation = 0) {
    const room = (await api(page, '/api/dorm')).data;
    const id = (key: string) => room.catalog.find((x: any) => x.previewKey === key).id;
    const placements = [['bed', 0, 1, rotation], ['dorm-sofa', 4, 1, 90], ['dorm-armchair', 8, 4, 270], ['chair', 7, 0, 180],
        ['dorm-bookshelf', 0, 0, 180], ['dorm-wardrobe', 9, 0, 90], ['dorm-coffee-table', 4, 4, 90], ['dorm-nightstand', 3, 3, 180], ['dorm-plant', 8, 3, 270], ['dorm-rug', 4, 1, 90], ['window', 5, 0, 0]]
        .map(([key, x, y, rotation]) => ({ itemId: id(key as string), x, y, rotation }));
    expect((await api(page, '/api/dorm', 'PUT', { ...room, placements })).status).toBe(200);
}
async function online(page:any){await page.locator('[data-live-status="online"]').waitFor({timeout:30000});}
async function chat(page:any,text:string){await page.getByRole('textbox',{name:'Message players here',exact:true}).fill(text);await page.getByRole('button',{name:'Send',exact:true}).click();}
it('shows real peers and their saved clothing in a shared hall, with smooth movement and scoped speech bubbles',async()=>{
  owner=await signIn(1);await online(owner);
  visitor=await signIn(2);await online(visitor);
  await owner.locator('[data-remote-player="2"]').waitFor();await visitor.locator('[data-remote-player="1"]').waitFor();
  expect([...realtimePeers.values()].filter(p=>p.topic).length).toBeGreaterThanOrEqual(2);
  const game=(await api(visitor,'/api/game-room')).data;
  const save=await api(visitor,'/api/game-room','PUT',{outfitId:game.outfits[0].id,faceId:game.faces.find((x:any)=>x.assetKey==='sample-ponytail').id,faceStyle:'glasses-freckles',shirtColor:'purple',pantsColor:'olive'});
  expect(save.status).toBe(200);const look=pixelLookKey(resolveDormAvatar(save.data).look);
  await owner.waitForFunction((look:string)=>document.querySelector('[data-remote-player="2"] [data-avatar-look]')?.getAttribute('data-avatar-look')===look,look);
  const before=await visitor.locator('[data-remote-player="1"]').getAttribute('style');
  await owner.getByLabel('DormHall movement area',{exact:true}).focus();await owner.keyboard.down('ArrowRight');await delay(550);await owner.keyboard.up('ArrowRight');
  await visitor.waitForFunction((before:string)=>document.querySelector('[data-remote-player="1"]')?.getAttribute('style')!==before,before);
  const stable=await owner.locator('[data-dorm-avatar]').getAttribute('style');
  await owner.getByRole('textbox',{name:'Message players here',exact:true}).pressSequentially('wasd e');
  await delay(250);expect(await owner.locator('[data-dorm-avatar]').getAttribute('style')).toBe(stable);
  await chat(owner,'Hello from the hall!');
  await visitor.getByRole('log').getByText('Hello from the hall!',{exact:true}).waitFor();
  await visitor.locator('[data-speech-player="1"]').filter({hasText:'Hello from the hall!'}).waitFor();
  await screenshot(visitor,'shared-hall-chat');
  await db.exec("UPDATE dormspace_live.messages SET sent_at=clock_timestamp() WHERE student_id=1");
  await chat(owner,'A second message too soon');await owner.getByText('Please wait a moment before sending another message.',{exact:true}).waitFor();
  expect(await owner.getByRole('textbox',{name:'Message players here',exact:true}).inputValue()).toBe('A second message too soon');
  expect(await owner.locator('[data-live-status="online"]').count()).toBe(1);
  await delay(6200);expect(await visitor.locator('[data-speech-player="1"]').count()).toBe(0);
  await visitor.getByRole('log').getByText('Hello from the hall!',{exact:true}).waitFor();
});
it('shares rooms, seating, sleeping and nighttime, without leaking chat into another room',async()=>{
  await furnish(owner);await openOwn(owner);await online(owner);
  await visitor.getByRole('button',{name:"dorm1's dorm",exact:true}).click();await visitor.getByRole('heading',{name:"dorm1's Dorm",exact:true}).waitFor();await online(visitor);
  await owner.locator('[data-remote-player="2"]').waitFor();
  const room=await dormCall(db,1,'open');const chair=room.catalog.find((c:any)=>c.previewKey==='chair');
  await visitor.getByRole('button',{name:'Sit in Chair',exact:true}).click();
  await owner.locator('[data-item-key="chair"][data-occupant-player="2"]').waitFor();
  expect(await owner.locator('[data-item-key="chair"] [data-avatar-facing]').getAttribute('data-avatar-facing')).toBe('up');
  await chat(visitor,'This chair is mine for a minute.');
  await owner.locator('[data-item-key="chair"] [data-speech-player="2"]').waitFor();
  await owner.getByRole('button',{name:'Sit in Chair',exact:true}).click();
  await owner.getByText('Someone is already using that furniture.',{exact:true}).waitFor();
  await owner.getByRole('button',{name:'Sleep in Bed',exact:true}).click();
  await visitor.getByRole('img',{name:'Window at night with moon and stars',exact:true}).waitFor();
  await screenshot(visitor,'shared-room-furniture-chat');
  await owner.keyboard.press('e');await visitor.getByRole('img',{name:'Window during daytime',exact:true}).waitFor();
  await visitor.keyboard.press('e');
  await visitor.getByRole('button',{name:'Exit to DormHall',exact:true}).click();await online(visitor);
  await visitor.getByRole('button',{name:'My Dorm',exact:true}).click();await online(visitor);
  expect(await visitor.locator('[data-remote-player="1"]').count()).toBe(0);
  await chat(owner,'Only people in dorm1 can hear this.');await delay(1000);
  expect(await visitor.getByRole('log').getByText('Only people in dorm1 can hear this.',{exact:true}).count()).toBe(0);
  await visitor.getByRole('button',{name:'Exit to DormHall',exact:true}).click();await online(visitor);
  await owner.getByRole('button',{name:'Exit to DormHall',exact:true}).click();await online(owner);
  await visitor.locator('[data-remote-player="1"]').waitFor();
});
it('recovers after a socket outage, keeps text safe, and removes disconnected or revoked visitors',async()=>{
  for(const peer of realtimePeers.keys())peer.terminate();
  await chat(owner,'Still here after reconnecting.');
  await visitor.getByRole('log').getByText('Still here after reconnecting.',{exact:true}).waitFor();
  await delay(1100);const text='<img src=x onerror="window.chatInjected=true">';await chat(visitor,text);
  await owner.getByRole('log').getByText(text,{exact:true}).waitFor();
  expect(await owner.getByRole('log').locator('img').count()).toBe(0);expect(await owner.evaluate(()=>(window as any).chatInjected)).toBeUndefined();
  await openOwn(owner);await online(owner);await visitor.getByRole('button',{name:"dorm1's dorm",exact:true}).click();await online(visitor);
  await owner.locator('[data-remote-player="2"]').waitFor();
  const relationship=await friendship(db,1,'friends',2);
  const pair=relationship.find((x:any)=>x.username==='dorm2');
  await friendship(db,1,'remove',2,pair.relationship.request_id);
  await visitor.getByRole('heading',{name:/DormHall/}).waitFor();await online(visitor);
  await owner.waitForFunction(()=>!document.querySelector('[data-remote-player="2"]'));
  await chat(owner,'Private room after the visit ended.');await delay(1000);
  expect(await visitor.getByRole('log').getByText('Private room after the visit ended.',{exact:true}).count()).toBe(0);
  await visitor.context().close();
  await owner.context().close();
});
it('keeps mobile bubbles in view, synchronizes furniture changes and cleans up tabs and expired leases',async()=>{
  owner=await signIn(1);const desktopHall=await owner.locator('[data-dorm-avatar]').evaluate((el:HTMLElement)=>el.parentElement!.getBoundingClientRect().width);await openOwn(owner);await online(owner);
  visitor=await signIn(3,{width:390,height:844});await online(visitor);
  expect(await visitor.locator('[data-dorm-avatar]').evaluate((el:HTMLElement)=>el.parentElement!.getBoundingClientRect().width)).toBeCloseTo(desktopHall);
  await visitor.getByRole('button',{name:"dorm1's dorm",exact:true}).tap();await online(visitor);
  await owner.locator('[data-remote-player="3"]').waitFor();
  await visitor.getByLabel('Dorm movement area',{exact:true}).focus();await visitor.keyboard.down('ArrowLeft');await delay(1200);await visitor.keyboard.up('ArrowLeft');
  const text='Campus life is better together! '+ 'cozy '.repeat(30);await chat(visitor,text.trim());
  await owner.getByRole('log').getByText(text.trim(),{exact:true}).waitFor();
  const fits=await visitor.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
  if(!fits)console.info('Mobile overflow',await visitor.evaluate(()=>[...document.querySelectorAll('main *')].map(el=>({tag:el.tagName,class:el.className,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width})).filter(b=>b.right>innerWidth+1).slice(-12)));
  expect(fits).toBe(true);
  const bounds=await visitor.locator('[data-dorm-avatar] [data-speech-player="3"]').boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(391);
  await screenshot(visitor,'mobile-multiplayer-chat');
  const current=(await api(owner,'/api/dorm')).data;
  const changed={...current,placements:current.placements.filter((p:any)=>p.itemId!==current.catalog.find((c:any)=>c.previewKey==='dorm-plant').id)};
  expect((await api(owner,'/api/dorm','PUT',changed)).status).toBe(200);
  await visitor.waitForFunction(()=>!document.querySelector('[data-item-key="dorm-plant"]'));
  // Deleting the presence lease imitates a sleeping laptop; the same tab rejoins automatically.
  await db.exec('DELETE FROM dormspace_live.players WHERE student_id=3');
  for(let attempt=0;attempt<60;attempt++){if((await db.query<any>('SELECT student_id FROM dormspace_live.players WHERE student_id=3')).rows.length)break;await delay(100);}
  expect((await db.query<any>('SELECT student_id FROM dormspace_live.players WHERE student_id=3')).rows).toHaveLength(1);
  await online(visitor);await owner.locator('[data-remote-player="3"]').waitFor();
  const tab=await visitor.context().newPage();await tab.goto(base+'/game-room/dormspace');await online(tab);
  await visitor.locator('[data-live-status="replaced"]').waitFor();
  await owner.getByRole('button',{name:'Exit to DormHall',exact:true}).click();await online(owner);await owner.locator('[data-remote-player="3"]').waitFor();
  await tab.evaluate(()=>{localStorage.removeItem('access_token');sessionStorage.removeItem('access_token');window.dispatchEvent(new Event('socialu-session-changed'));});
  await owner.waitForFunction(()=>!document.querySelector('[data-remote-player="3"]'));
  expect((await db.query<any>('SELECT student_id FROM dormspace_live.players WHERE student_id=3')).rows).toHaveLength(0);
  await visitor.context().close();
  await owner.waitForFunction(()=>!document.querySelector('[data-remote-player="3"]'));
  await owner.context().close();
});
it('keeps remote movement out of room rendering while two customized players walk and run',async()=>{
  owner=await signIn(1);await furnish(owner);await openOwn(owner);await online(owner);
  visitor=await signIn(3);await visitor.getByRole('button',{name:"dorm1's dorm",exact:true}).click();await online(visitor);
  await owner.locator('[data-remote-player="3"]').waitFor();
  const stage=(page:any)=>page.getByLabel('Dorm movement area',{exact:true});
  for(const key of ['ArrowRight','ArrowLeft']){await stage(owner).focus();await owner.keyboard.down(key);await stage(visitor).focus();await visitor.keyboard.down(key);await delay(400);await owner.keyboard.up(key);await visitor.keyboard.up(key);}
  const client=await owner.context().newCDPSession(owner);await client.send('Emulation.setCPUThrottlingRate',{rate:4});await client.send('Performance.enable');
  const results=[];
  for(const action of ['walking','running']){
    if(action==='running')await owner.getByRole('button',{name:'Run',exact:true}).click();
    const key=action==='walking'?'ArrowRight':'ArrowLeft';await stage(owner).focus();await owner.keyboard.down(key);await stage(visitor).focus();await visitor.keyboard.down(key);
    const start=await client.send('Performance.getMetrics');
    const frames=await owner.evaluate(()=>new Promise<number[]>(resolve=>{let first=0,previous=0;const out:number[]=[];function tick(now:number){if(!first)first=now;if(previous)out.push(now-previous);previous=now;if(now-first>=1200)resolve(out);else requestAnimationFrame(tick);}requestAnimationFrame(tick);}));
    const end=await client.send('Performance.getMetrics');await owner.keyboard.up(key);await visitor.keyboard.up(key);
    const layouts=end.metrics.find((m:any)=>m.name==='LayoutCount').value-start.metrics.find((m:any)=>m.name==='LayoutCount').value;
    const fps=frames.length*1000/frames.reduce((a:number,b:number)=>a+b,0);results.push({action,fps,layouts,frames:frames.length});expect(frames.length).toBeGreaterThan(30);expect(layouts).toBeLessThan(30);
  }
  await client.send('Emulation.setCPUThrottlingRate',{rate:1});await client.detach();
  writeFileSync(`${artifacts}/multiplayer-performance.json`,JSON.stringify(results,null,2));console.info('Two-player movement at 4x CPU slowdown:',results);
  await screenshot(owner,'shared-room-players');await owner.context().close();await visitor.context().close();
});
