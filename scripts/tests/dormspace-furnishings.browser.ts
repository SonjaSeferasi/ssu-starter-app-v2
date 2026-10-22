import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { furnitureSprites } from '../../components/dormspace/pixel-art';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { befriend, createDormDatabase, dormCall, friendship, testUid } from '../../__tests__/helpers/dormspace-db';

// The real Next UI and API run against real schema/functions in PGlite. Only the provider's
// Auth/Storage/PostgREST HTTP transport is replaced. This service binds to loopback and is never shipped.
let db: PGlite, service: Server, next: ChildProcess, browser: any, owner: any, visitor: any;
let base = '', nextLog = '', failSave = false, failReload = false, signingIn: any;
const sessions = new Map<string, any>();
const artifacts = process.env.DORMSPACE_EVIDENCE_DIR || 'tmp/dormspace-browser';
const user = (student: number) => ({ id: testUid(student), email: `dorm${student}@salemstate.edu`, email_confirmed_at: '2026-10-19T12:00:00Z', aud: 'authenticated', role: 'authenticated', user_metadata: { full_name: `Dorm Student ${student}`, username: `dorm${student}` } });
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function listen(server: Server) {
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return (server.address() as { port: number }).port;
}
async function api(page: any, path: string, method = 'GET', body?: any) {
  return page.evaluate(async ({ path, method, body }: { path: string; method: string; body: any }) => {
    const response = await fetch(path, { method, headers: { Authorization: `Bearer ${localStorage.getItem('access_token') || sessionStorage.getItem('access_token') || ''}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  }, { path, method, body });
}
async function signIn(student: number, viewport = { width: 1280, height: 1000 }, controlledClock = false) {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width < 600 });
  const page = await context.newPage();
  if (controlledClock) await page.clock.install();
  signingIn = page;
  await page.goto(base + '/login', { waitUntil: 'networkidle' });
  await page.getByRole('textbox', { name: 'University email or username' }).fill(`dorm${student}@salemstate.edu`);
  await page.getByLabel('Password', { exact: true }).fill('DormTest123!');
  const loginResponse = page.waitForResponse((response: any) => response.url().endsWith('/api/auth/login') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const login = await loginResponse;
  if (!login.ok()) throw new Error(`Test account sign-in failed: ${login.status()} ${await login.text()}`);
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
  await befriend(db, 1, 2);
  await db.exec("INSERT INTO socialu.media_assets(owner_id,storage_key,upload_context,mime_type,byte_count) VALUES(2,'profile/dorm2.png','profile','image/png',100); UPDATE socialu.student_profiles SET photo_id=(SELECT asset_id FROM socialu.media_assets WHERE storage_key='profile/dorm2.png') WHERE student_id=2;");
  service = createServer(async (request, response) => {
    const path = new URL(request.url!, 'http://localhost').pathname;
    let raw = ''; for await (const chunk of request) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    const reply = (status: number, data: any) => { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(data)); };
    try {
      if (path === '/auth/v1/token') {
        const student = Number(/^dorm([1-4])@salemstate.edu$/.exec(body.email || '')?.[1]);
        if (!student || body.password !== 'DormTest123!') { reply(400, { message: 'Invalid credentials' }); return; }
        const id = randomUUID(), iat = Math.floor(Date.now() / 1000);
        const token = 'e30.' + Buffer.from(JSON.stringify({ sub: testUid(student), iat, exp: iat + 3600, session_id: id })).toString('base64url') + '.local-test';
        await db.query('INSERT INTO auth.sessions VALUES($1,$2,clock_timestamp())', [id, testUid(student)]);
        sessions.set(token, user(student));
        reply(200, { access_token: token, refresh_token: 'local-refresh', expires_in: 3600, expires_at: iat + 3600, token_type: 'bearer', user: user(student) }); return;
      }
      if (path === '/auth/v1/user') {
        const account = sessions.get(request.headers.authorization?.slice(7) || '');
        reply(account ? 200 : 401, account || { message: 'Expired session' }); return;
      }
      if (path.startsWith('/storage/v1/object/sign/media/')) {
        reply(200, { signedURL: '/object/sign/media/' + path.split('/media/')[1] + '?token=local-private' }); return;
      }
      if (path.startsWith('/storage/v1/object/sign/')) {
        response.writeHead(200, { 'Content-Type': 'image/png' });
        response.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64')); return;
      }
      const fn = path.match(/^\/rest\/v1\/rpc\/(socialu_[a-z_]+)$/)?.[1];
      if (!fn || !Object.keys(body).every(key => /^p_[a-z_]+$/.test(key))) { reply(404, { code: 'PGRST202', message: 'Unknown local test endpoint' }); return; }
      if (fn === 'socialu_dorm' && body.p_action === 'save' && failSave) { failSave = false; reply(503, { code: '08006', message: 'Simulated lost connection' }); return; }
      if (fn === 'socialu_dorm' && body.p_action === 'open' && failReload) { failReload = false; reply(503, { code: '08006', message: 'Simulated reload failure' }); return; }
      const entries = Object.entries(body);
      const result = await db.query<{ result: any }>(`SELECT public.${fn}(${entries.map(([key], index) => `${key} => $${index + 1}`).join(',')}) AS result`, entries.map(([, value]) => value && typeof value === 'object' ? JSON.stringify(value) : value));
      reply(200, result.rows[0].result);
    } catch (error: any) { reply(400, { code: error.code || 'TEST', message: error.message }); }
  });
  const servicePort = await listen(service);
  console.info('Isolated database transport ready.');
  const reservation = createServer(); const nextPort = await listen(reservation);
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
    try { if ((await fetch(base + '/api/dorm')).status === 401) { ready = true; break; } } catch {}
    if (next.exitCode !== null) break;
    await delay(300);
  }
  if (!ready) throw new Error('Local Next test app did not start: ' + nextLog.slice(-3000));
  console.info('Local application ready.');
  const playwright = await import(/* @vite-ignore */ process.env.SOCIALU_PLAYWRIGHT_MODULE || 'playwright');
  browser = await playwright.chromium.launch({ headless: true, ...(process.env.DORMSPACE_BROWSER_EXECUTABLE ? { executablePath: process.env.DORMSPACE_BROWSER_EXECUTABLE } : {}) });
}, 90000);

afterEach(async context => {
  if (context.task.result?.state === 'fail') {
    for (const [name, page] of [['owner', owner], ['visitor', visitor], ['sign-in', signingIn]] as const) if (page && !page.isClosed()) {
      await page.screenshot({ path: `${artifacts}/failure-${name}.png`, fullPage: true }).catch(() => {});
      console.error(name, await page.locator('body').innerText().catch(() => 'Page closed'));
    }
    console.error(nextLog.slice(-2500));
  }
});
afterAll(async () => {
  await browser?.close(); next?.kill('SIGTERM');
  await new Promise<void>(resolve => service ? service.close(() => resolve()) : resolve());
  await db?.close();
});

it('places all eight furnishings, saves overlaps, moves and returns covered rugs, and restores a fresh session', async () => {
  owner = await signIn(3);
  await openOwn(owner);
  await decorate(owner);
  const room = (await api(owner, '/api/dorm')).data;
  const id = (key: string) => room.catalog.find((item: any) => item.previewKey === key).id;
  const floor = owner.getByLabel('Floor', { exact: true });
  const place = async (name: string, x: number, y: number) => {
    await owner.getByRole('button', { name, exact: true }).click();
    const response = owner.waitForResponse((r: any) => r.url().endsWith('/api/dorm') && r.request().method() === 'PUT');
    await floor.getByRole('button', { name: `Place at column ${x + 1}, row ${y + 1}`, exact: true }).click();
    expect((await response).status()).toBe(200); await saved(owner);
  };
  await screenshot(owner, 'furniture-inventory');
  for (const [name, x, y] of [
    ['Rug', 3, 1], ['Sofa', 3, 1], ['Armchair', 7, 4], ['Bookshelf', 0, 0], ['Wardrobe', 8, 0],
    ['Coffee table', 3, 4], ['Nightstand', 2, 3], ['Plant', 7, 2], ['Bed', 0, 2],
  ] as const) await place(name, x, y);
  await owner.getByRole('button', { name: 'Window', exact: true }).click();
  let windowSave = owner.waitForResponse((r: any) => r.url().endsWith('/api/dorm') && r.request().method() === 'PUT');
  await owner.getByLabel('Wall', { exact: true }).getByRole('button', { name: 'Place at column 6, row 1', exact: true }).click();
  expect((await windowSave).status()).toBe(200); await saved(owner);
  // The rug is covered by the sofa but remains selectable in the placed item picker.
  await owner.getByLabel('Placed furniture', { exact: true }).selectOption(id('dorm-rug'));
  let response = owner.waitForResponse((r: any) => r.url().endsWith('/api/dorm') && r.request().method() === 'PUT');
  await owner.getByRole('button', { name: 'Return to inventory', exact: true }).click();
  expect((await response).status()).toBe(200); await saved(owner);
  expect(await owner.getByRole('button', { name: 'Rug', exact: true }).count()).toBe(1);
  await place('Rug', 3, 1);
  await owner.getByLabel('Placed furniture', { exact: true }).selectOption(id('dorm-plant'));
  response = owner.waitForResponse((r: any) => r.url().endsWith('/api/dorm') && r.request().method() === 'PUT');
  await floor.getByRole('button', { name: 'Place at column 8, row 4', exact: true }).click();
  expect((await response).status()).toBe(200); await saved(owner);
  await owner.getByRole('button', { name: 'Done decorating', exact: true }).click();
  const stored = (await api(owner, '/api/dorm')).data;
  expect(stored.placements).toHaveLength(10);
  await owner.getByLabel('Dorm movement area', { exact: true }).screenshot({ path: `${artifacts}/furnished-room.png` });
  await owner.context().close();
  owner = await signIn(3);
  await openOwn(owner);
  expect((await api(owner, '/api/dorm')).data.placements).toEqual(stored.placements);
  // Every furniture sprite is a loaded, cached image rather than a text fallback.
  const images = owner.getByLabel('Floor', { exact: true }).locator('button img');
  expect(await images.count()).toBe(9);
  expect(await images.evaluateAll((elements: HTMLImageElement[]) => elements.every((element) => element.complete && element.naturalWidth > 0))).toBe(true);
  await owner.context().close();
});

it('sits at avatar scale on the sofa and armchair, wakes safely and keeps bed nighttime working', async () => {
  owner = await signIn(3);
  await openOwn(owner);
  const stage = owner.getByLabel('Dorm movement area', { exact: true });
  const section = owner.getByRole('region', { name: 'My Dorm', exact: true });
  const initial = (await api(owner, '/api/dorm')).data;
  for (const [action, label, screenshotName] of [
    ['Sit on Sofa', 'Avatar sitting on sofa', 'sofa-sitting'],
    ['Sit in Armchair', 'Avatar sitting in armchair', 'armchair-sitting'],
  ]) {
    await owner.getByRole('button', { name: action, exact: true }).click();
    expect(await section.getAttribute('data-pose')).toBe('sitting');
    const pose = owner.getByRole('img', { name: label, exact: true });
    const image = pose.locator('img');
    const key = action === 'Sit on Sofa' ? 'dorm-sofa' : 'dorm-armchair';
    const art = furnitureSprites(key)!.idle;
    const body = await pose.boundingBox(), cell = (await owner.getByLabel('Floor', { exact: true }).boundingBox()).width / 10;
    expect(body.width).toBeCloseTo(cell * art.w / 24, 1);
    expect(body.height).toBeCloseTo(cell * art.h / 24, 1);
    const sheet = await image.boundingBox();
    expect(sheet.width).toBeCloseTo(body.width * 2, 1);
    expect(sheet.height).toBeCloseTo(body.height, 1);
    expect(await image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    await stage.screenshot({ path: `${artifacts}/${screenshotName}.png` });
    await owner.keyboard.press('e');
    expect(await section.getAttribute('data-pose')).toBe('standing');
    await owner.keyboard.press('e');
    expect(await section.getAttribute('data-pose')).toBe('sitting');
    await owner.keyboard.press('ArrowDown');
    expect(await section.getAttribute('data-pose')).toBe('standing');
  }
  await owner.getByRole('button', { name: 'Sleep in Bed', exact: true }).click();
  expect(await section.getAttribute('data-time')).toBe('night');
  expect(await owner.getByRole('img', { name: 'Window at night with moon and stars', exact: true }).count()).toBe(1);
  await owner.keyboard.press('e');
  expect(await section.getAttribute('data-time')).toBe('day');
  const after = (await api(owner, '/api/dorm')).data;
  expect(after.version).toBe(initial.version);
  expect(after.placements).toEqual(initial.placements);
  await owner.context().close();
});

it('lets a mobile visitor use the new seats without editing the owner’s furniture', async () => {
  await befriend(db, 3, 2);
  visitor = await signIn(2, { width: 390, height: 844 });
  const original = await dormCall(db, 3, 'open');
  await visitor.getByRole('button', { name: "dorm3's dorm", exact: true }).click();
  await visitor.getByRole('heading', { name: "dorm3's Dorm", exact: true }).waitFor();
  expect(await visitor.getByRole('button', { name: 'Decorate', exact: true }).count()).toBe(0);
  await visitor.getByRole('button', { name: 'Sit on Sofa', exact: true }).tap();
  expect(await visitor.getByRole('img', { name: 'Avatar sitting on sofa', exact: true }).count()).toBe(1);
  await visitor.getByRole('button', { name: 'Interact: Stand up', exact: true }).tap();
  await visitor.getByRole('button', { name: 'Sit in Armchair', exact: true }).tap();
  expect(await visitor.getByRole('img', { name: 'Avatar sitting in armchair', exact: true }).count()).toBe(1);
  await screenshot(visitor, 'furnished-room-mobile');
  const after = await dormCall(db, 3, 'open');
  expect(after.version).toBe(original.version);
  expect(after.placements).toEqual(original.placements);
  await visitor.context().close();
});

