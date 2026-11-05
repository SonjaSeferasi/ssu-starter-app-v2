import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { befriend, createDormDatabase, friendship, testUid } from '../../__tests__/helpers/dormspace-db';
import { prepareLiveDatabase } from '../../__tests__/helpers/dormspace-live-db';
import { credit, DIRECTORY_MIGRATION, SHOP_MIGRATION } from '../../__tests__/helpers/dormspace-3d-db';

// The real Next UI and APIs over the real schema/functions in a disposable PGlite database. Only the
// provider Auth/PostgREST HTTP transport is replaced (loopback only). Four synthetic accounts; no real
// students, messages or points. Chromium must provide WebGL (SwiftShader in headless mode).
let db: PGlite, service: Server, next: ChildProcess, browser: any, owner: any, friend: any, stranger: any;
let base = '', nextLog = '', friendRequest = '';
const sessions = new Map<string, any>();
const artifacts = process.env.DORMSPACE_EVIDENCE_DIR || 'tmp/dormspace-3d';
const user = (student: number) => ({ id: testUid(student), email: `dorm${student}@salemstate.edu`, email_confirmed_at: '2026-11-04T12:00:00Z', aud: 'authenticated', role: 'authenticated', user_metadata: { full_name: `Dorm Student ${student}`, username: `dorm${student}` } });
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function listen(server: Server) {
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return (server.address() as { port: number }).port;
}
async function api(page: any, path: string, method = 'GET', body?: unknown) {
  return page.evaluate(async ({ path, method, body }: { path: string; method: string; body: unknown }) => {
    const response = await fetch(path, { method, headers: { Authorization: `Bearer ${localStorage.getItem('access_token') || sessionStorage.getItem('access_token') || ''}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, data: await response.json() };
  }, { path, method, body });
}
// Bounded wait that never rejects: resolves to `fallback` on error or timeout (cleanup and diagnostics only).
const within = <T,>(work: Promise<T> | undefined, ms: number, fallback: T): Promise<T> =>
  Promise.race([Promise.resolve(work as Promise<T>).catch(() => fallback), delay(ms).then(() => fallback)]);

// Bounded, redacted per-page diagnostics for failures: console errors/warnings, page errors, failed
// requests and 5xx responses (paths only, never query strings, tokens or request bodies).
const DESKTOP = { width: 1024, height: 720 };
const logs = new WeakMap<object, string[]>();
const scrub = (text: string) => text
  .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [redacted]')
  .replace(/\b(?:e30|eyJ[\w-]*)\.[\w-]+\.[\w-]+/g, '[token]')
  .replace(/((?:access|refresh)_token)["']?\s*[:=]\s*["']?[^\s"',}&]+/gi, '$1=[redacted]');
const redact = (text: string) => scrub(text).slice(0, 300);
const pathOf = (url: string) => { try { return new URL(url).pathname; } catch { return '(unparseable url)'; } };
function watch(page: any) {
  const log: string[] = []; logs.set(page, log);
  const push = (entry: string) => { log.push(redact(entry)); if (log.length > 30) log.shift(); };
  page.on('console', (message: any) => { if (message.type() === 'error' || message.type() === 'warning') push(`console.${message.type()}: ${message.text()}`); });
  page.on('pageerror', (error: Error) => push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request: any) => push(`requestfailed: ${request.method()} ${pathOf(request.url())} ${request.failure()?.errorText ?? ''}`));
  page.on('response', (response: any) => { if (response.status() >= 500) push(`http ${response.status()}: ${pathOf(response.url())}`); });
}
async function describePage(page: any) {
  if (!page || page.isClosed()) return '(page closed)';
  const attribute = (selector: string, name: string) => within<string | null>(page.locator(selector).first().getAttribute(name, { timeout: 1500 }), 2500, '(none)');
  const alerts = await within<string[]>(page.locator('[role="alert"]').allInnerTexts(), 2500, []);
  return [`route=${pathOf(page.url())} engine=${await attribute('div[data-engine]', 'data-engine')} scene=${await attribute('[data-scene]', 'data-scene')}`,
    `alerts=${JSON.stringify(alerts.slice(0, 5).map(redact))}`, ...(logs.get(page) ?? [])].join('\n');
}

async function signIn(student: number, viewport = DESKTOP) {
  const mobile = viewport.width < 600;
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile });
  const page = await context.newPage();
  watch(page);
  try {
    // The login page navigates itself after saving the session (it honours ?redirect=). Waiting for that
    // navigation, instead of calling goto() while it is pending, avoids racing the app's redirect.
    await page.goto(`${base}/login?redirect=${encodeURIComponent('/game-room/dormspace')}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => { const form = document.querySelector('form'); return form && Object.keys(form).some(key => key.startsWith('__reactProps$')); });
    await page.getByRole('textbox', { name: 'University email or username' }).fill(`dorm${student}@salemstate.edu`);
    await page.getByLabel('Password', { exact: true }).fill('DormTest123!');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL((url: URL) => url.pathname !== '/login', { timeout: 30000 });
    if (pathOf(page.url()) !== '/game-room/dormspace') await page.goto(base + '/game-room/dormspace');
    // Fail fast (with the real state) if the engine settles on anything other than ready.
    const settled = page.locator('div[data-engine]:not([data-engine="loading"])');
    await settled.waitFor({ timeout: 60000 });
    const state = await settled.getAttribute('data-engine');
    if (state !== 'ready') throw new Error(`the 3D engine settled as "${state}", not "ready"`);
    await page.locator('[data-scene="hall"]').waitFor({ timeout: 30000 });
    return page;
  } catch (error) {
    await within(page.screenshot({ path: `${artifacts}/signin-failure-dorm${student}.png`, timeout: 5000 }), 7000, undefined);
    const details = await within(describePage(page), 10000, '(diagnostics timed out)');
    await within(context.close(), 5000, undefined);
    throw new Error(`signIn(dorm${student}) failed: ${(error as Error).message}\n${details}`);
  }
}
const closePage = async (page: any) => { if (page && !page.isClosed()) await within(page.context().close(), 5000, undefined); };
const shot = (page: any, name: string) => page.screenshot({ path: `${artifacts}/${name}.png`, timeout: 15000 });
const blur = (page: any) => page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
async function hold(page: any, key: string, ms: number) { await blur(page); await page.keyboard.down(key); await delay(ms); await page.keyboard.up(key); }
async function openOwnRoom(page: any) {
  await page.getByRole('button', { name: 'My room' }).first().click();
  await page.locator('[data-scene="room"]').waitFor();
  await page.getByText('My room', { exact: true }).first().waitFor();
}
async function placeFromInventory(page: any, name: string, column: number, row: number) {
  await page.getByRole('region', { name: 'Inventory' }).getByRole('button', { name }).click();
  await page.getByLabel('Column').fill(String(column));
  await page.getByLabel('Row').fill(String(row));
  await page.getByText('This spot is free.').waitFor();
  await page.getByRole('button', { name: /^(Place|Move) here$/ }).click();
  await page.getByText('✓ All changes saved').waitFor();
}

beforeAll(async () => {
  mkdirSync(artifacts, { recursive: true });
  db = await createDormDatabase(4);
  for (const file of ['20261020013144_dormspace_furnishings.sql', '20261020021507_dormspace_rotation.sql'])
    await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
  await prepareLiveDatabase(db, 0);
  await db.exec(readFileSync('supabase/migrations/20261026000100_school_communities.sql', 'utf8'));
  await db.exec(readFileSync(DIRECTORY_MIGRATION, 'utf8'));
  await db.exec(readFileSync(SHOP_MIGRATION, 'utf8'));
  friendRequest = await befriend(db, 1, 2);
  await credit(db, 2, 400);
  service = createServer(async (request, response) => {
    const path = new URL(request.url!, 'http://localhost').pathname;
    let raw = ''; for await (const chunk of request) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    const reply = (status: number, data: unknown) => { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(data)); };
    try {
      if (path === '/auth/v1/token') {
        const student = Number(/^dorm([1-4])@salemstate.edu$/.exec(body.email || '')?.[1]);
        if (!student || body.password !== 'DormTest123!') { reply(400, { message: 'Invalid credentials' }); return; }
        const id = randomUUID(), iat = Math.floor(Date.now() / 1000);
        const token = 'e30.' + Buffer.from(JSON.stringify({ sub: testUid(student), iat, exp: iat + 3600, session_id: id })).toString('base64url') + '.local-test';
        await db.query('INSERT INTO auth.sessions VALUES($1,$2,clock_timestamp())', [id, testUid(student)]);
        sessions.set(token, user(student));
        reply(200, { access_token: token, refresh_token: 'local-refresh', expires_in: 3600, expires_at: iat + 3600, token_type: 'bearer', user: user(student) });
        return;
      }
      if (path === '/auth/v1/user') { const account = sessions.get(request.headers.authorization?.slice(7) || ''); reply(account ? 200 : 401, account || { message: 'Expired session' }); return; }
      const fn = path.match(/^\/rest\/v1\/rpc\/(socialu_[a-z_]+)$/)?.[1];
      if (!fn || !Object.keys(body).every(key => /^p_[a-z_]+$/.test(key))) { reply(404, { code: 'PGRST202', message: 'Unknown local test endpoint' }); return; }
      const entries = Object.entries(body);
      const result = await db.query<{ result: unknown }>(`SELECT public.${fn}(${entries.map(([key], index) => `${key} => $${index + 1}`).join(',')}) AS result`,
        entries.map(([, value]) => value && typeof value === 'object' ? JSON.stringify(value) : value));
      reply(200, result.rows[0].result);
    } catch (error: any) { reply(400, { code: error.code || 'TEST', message: error.message }); }
  });
  const servicePort = await listen(service);
  const reservation = createServer(), nextPort = await listen(reservation);
  await new Promise<void>(resolve => reservation.close(() => resolve()));
  base = `http://127.0.0.1:${nextPort}`;
  next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(nextPort)], {
    cwd: process.env.DORMSPACE_APP_ROOT || process.cwd(),
    env: { ...process.env, SUPABASE_URL: `http://127.0.0.1:${servicePort}`, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${servicePort}`, SUPABASE_SERVICE_ROLE_KEY: 'isolated-test-service-key', SUPABASE_ANON_KEY: 'isolated-test-anon-key', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'isolated-test-anon-key', NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  next.stdout?.on('data', chunk => { nextLog += chunk.toString(); });
  next.stderr?.on('data', chunk => { nextLog += chunk.toString(); });
  let ready = false;
  for (let attempt = 0; attempt < 120 && !ready; attempt++) {
    try { ready = (await fetch(base + '/api/dorm/hall')).status === 401; } catch { /* starting */ }
    if (next.exitCode !== null) break;
    if (!ready) await delay(300);
  }
  if (!ready) throw new Error('Local Next test app did not start: ' + nextLog.slice(-3000));
  const playwright = await import(/* @vite-ignore */ process.env.SOCIALU_PLAYWRIGHT_MODULE || 'playwright');
  browser = await playwright.chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'], ...(process.env.DORMSPACE_BROWSER_EXECUTABLE ? { executablePath: process.env.DORMSPACE_BROWSER_EXECUTABLE } : {}) });
}, 120000);
afterEach(async context => {
  if (context.task.result?.state === 'fail') {
    for (const [name, page] of [['owner', owner], ['friend', friend], ['stranger', stranger]] as const) {
      if (!page || page.isClosed()) continue;
      await within(page.screenshot({ path: `${artifacts}/failure-${name}.png`, timeout: 5000 }), 7000, undefined);
      console.error(`[${name}] ${await within(describePage(page), 10000, '(diagnostics timed out)')}`);
    }
    console.error(scrub(nextLog.slice(-2500)));
  }
});
// Cleanup must finish even when setup failed part-way: every step is optional, bounded and independent.
const bounded = (work: Promise<unknown> | undefined, ms = 10000) => within(work, ms, undefined);
afterAll(async () => {
  for (const page of [owner, friend, stranger]) await closePage(page);
  await bounded(browser?.close());
  if (next && next.exitCode === null && !next.killed) {
    const exited = new Promise(resolve => next.once('exit', resolve));
    next.kill('SIGTERM');
    await bounded(exited, 5000);
    if (next.exitCode === null) next.kill('SIGKILL');
  }
  if (service?.listening) {
    const closed = new Promise<void>(resolve => service.close(() => resolve()));
    service.closeAllConnections?.(); // keep-alive sockets from Next would otherwise delay close()
    await bounded(closed);
  }
  await bounded(db?.close());
}, 60000);

it('shows every same-school student the same doors and keeps non-friend rooms locked', async () => {
  owner = await signIn(1);
  await owner.getByText('Your room 101').waitFor();
  expect(await owner.locator('[data-dormspace-canvas]').count()).toBe(1);
  // Unobstructed first hall frame (spawned beside door 101, looking down the corridor), before any overlay.
  await delay(800);
  await shot(owner, 'hall-owner-view');
  await owner.getByRole('button', { name: 'Elevator & doors' }).click();
  await owner.getByRole('button', { name: 'Enter room 102, dorm2' }).waitFor();
  await owner.getByRole('button', { name: 'Room 103 is locked · friends only' }).waitFor();
  await shot(owner, 'hall-owner-elevator');
  stranger = await signIn(3);
  await stranger.getByText('Your room 103').waitFor();
  await stranger.getByRole('button', { name: 'Elevator & doors' }).click();
  await stranger.getByRole('button', { name: 'Room 101 is locked · friends only' }).waitFor();
  expect((await api(stranger, '/api/dorm?owner=dorm1')).status).toBe(403);
  const fromStranger = (await api(stranger, '/api/dorm/hall?floor=1')).data, fromOwner = (await api(owner, '/api/dorm/hall?floor=1')).data;
  expect(fromStranger.doors.map((d: any) => d.roomNumber + d.username)).toEqual(fromOwner.doors.map((d: any) => d.roomNumber + d.username));
  // The stranger is not needed again: release its context (and WebGL canvas) now.
  await closePage(stranger); stranger = null;
  // A block withholds identity but keeps the door number.
  await friendship(db, 4, 'block', 1);
  await owner.reload(); await owner.locator('[data-scene="hall"]').waitFor();
  await owner.getByRole('button', { name: 'Elevator & doors' }).click();
  await owner.getByRole('button', { name: 'Room 104 is locked' }).waitFor();
}, 240000);

it('decorates with keyboard coordinates, turns, stores and keeps the saved layout after reload', async () => {
  // The previous case leaves the elevator drawer open; close exactly that drawer.
  await owner.getByRole('button', { name: 'Close elevator' }).click();
  await openOwnRoom(owner);
  await owner.getByRole('button', { name: 'Decorate' }).click();
  await placeFromInventory(owner, 'Chair', 5, 4);
  await owner.getByLabel('Placed furniture').selectOption({ label: 'Chair' });
  await blur(owner); await owner.keyboard.press('r');
  await owner.getByText('✓ All changes saved').waitFor();
  let dorm = (await api(owner, '/api/dorm')).data;
  expect(dorm.placements).toContainEqual(expect.objectContaining({ x: 4, y: 3, rotation: 90 }));
  // The doorway is reserved: the ghost turns red and Place is disabled.
  await owner.getByRole('region', { name: 'Inventory' }).getByRole('button', { name: 'Desk' }).click();
  await owner.getByLabel('Column').fill('5'); await owner.getByLabel('Row').fill('7');
  await owner.getByText('That spot is outside the room. Keep the whole item inside the room.').or(owner.getByText('That spot blocks the doorway. Leave the entrance clear.')).first().waitFor();
  expect(await owner.getByRole('button', { name: 'Place here' }).isDisabled()).toBe(true);
  await owner.getByRole('button', { name: 'Cancel' }).click();
  await shot(owner, 'room-decorating');
  await owner.getByRole('button', { name: 'Done decorating' }).click();
  await owner.reload(); await owner.locator('[data-scene="hall"]').waitFor();
  dorm = (await api(owner, '/api/dorm')).data;
  expect(dorm.placements).toContainEqual(expect.objectContaining({ x: 4, y: 3, rotation: 90 }));
  expect(dorm.owned.length).toBeGreaterThanOrEqual(4);
}, 240000);

it('sits on a chair, sleeps in a bed with a shared night window, and opens the guestbook', async () => {
  await openOwnRoom(owner);
  // Walking up from the entrance stops against the chair (collision), within reach.
  await hold(owner, 'w', 1100);
  await owner.getByText('Sit in chair').first().waitFor();
  await blur(owner); await owner.keyboard.press('e');
  await owner.locator('[data-pose="sitting"]').waitFor();
  await shot(owner, 'room-sitting');
  await blur(owner); await owner.keyboard.press('e');
  await owner.locator('[data-pose="standing"]').waitFor();
  await owner.getByRole('button', { name: 'Decorate' }).click();
  await owner.getByLabel('Placed furniture').selectOption({ label: 'Chair' });
  await owner.getByRole('button', { name: 'Store in inventory' }).click();
  await owner.getByText('✓ All changes saved').waitFor();
  await placeFromInventory(owner, 'Bed', 4, 2);
  await owner.getByRole('button', { name: 'Done decorating' }).click();
  await hold(owner, 's', 300); await hold(owner, 'w', 1100);
  await owner.getByText('Sleep in bed').first().waitFor();
  await blur(owner); await owner.keyboard.press('e');
  await owner.locator('[data-pose="sleeping"][data-time="night"]').waitFor();
  await shot(owner, 'room-sleeping-night');
  await blur(owner); await owner.keyboard.press('e');
  await owner.getByRole('button', { name: 'Guestbook' }).click();
  const guestbook = owner.getByRole('dialog', { name: 'My Guestbook' });
  await guestbook.waitFor();
  await guestbook.getByRole('button', { name: 'Close', exact: true }).click();
  await guestbook.waitFor({ state: 'hidden' });
}, 240000);

it('shows a friend visitor live, denies their edits and evicts them when the friendship ends', async () => {
  friend = await signIn(2);
  await friend.getByRole('button', { name: 'Elevator & doors' }).click();
  await friend.getByRole('button', { name: 'Enter room 101, dorm1' }).click();
  await friend.getByText("dorm1's room").waitFor();
  expect(await friend.getByRole('button', { name: 'Decorate' }).count()).toBe(0);
  // The save API never addresses another student's room: a visitor's PUT can only target their own.
  const before = (await api(owner, '/api/dorm')).data;
  await api(friend, '/api/dorm', 'PUT', { version: before.version, placements: [] });
  expect((await api(owner, '/api/dorm')).data.placements).toEqual(before.placements);
  await owner.getByRole('list', { name: 'Players here' }).getByText('dorm2').waitFor({ timeout: 15000 });
  await shot(friend, 'room-visitor');
  await friendship(db, 1, 'remove', 2, friendRequest);
  await friend.getByText("You're no longer friends with dorm1, so your visit ended.").waitFor({ timeout: 10000 });
  await friend.locator('[data-scene="hall"]').waitFor();
}, 240000);

it('buys with shared points after a final confirmation and recovers a lost response without a second charge', async () => {
  // The DormSpace HUD shows the server balance before the shop is opened.
  await friend.getByText('Shared points: 400', { exact: true }).waitFor();
  await friend.getByRole('button', { name: 'Furniture shop' }).click();
  await friend.getByText('Shared balance: 400 points').waitFor();
  const plant = friend.locator('[data-offer-state="available"]').filter({ hasText: 'Plant' });
  await plant.getByRole('button', { name: 'Buy' }).click();
  const dialog = friend.getByRole('dialog', { name: 'Buy Plant?' });
  await dialog.getByText('Purchases are final.', { exact: false }).waitFor();
  await dialog.getByText('150 points', { exact: false }).first().waitFor();
  await shot(friend, 'shop-confirm');
  await dialog.getByRole('button', { name: 'Buy for 150 points' }).click();
  await friend.getByText('Plant is yours').waitFor();
  await friend.getByText('Shared balance: 250 points').waitFor();
  // Drop the next response after the server has committed it: the key is kept and checked.
  let dropped = false;
  await friend.route('**/api/dorm/shop', async (route: any) => {
    if (route.request().method() === 'POST' && !dropped) { dropped = true; await route.fetch(); await route.abort('connectionreset'); } else await route.continue();
  });
  await friend.locator('[data-offer-state="available"]').filter({ hasText: 'Rug' }).getByRole('button', { name: 'Buy' }).click();
  await friend.getByRole('dialog', { name: 'Buy Rug?' }).getByRole('button', { name: 'Buy for 200 points' }).click();
  const unknown = friend.getByRole('dialog', { name: 'Purchase not confirmed' });
  await unknown.waitFor();
  await unknown.getByRole('button', { name: 'Check purchase' }).click();
  await friend.getByText(/Rug is yours \(already completed earlier; you were charged once\)/).waitFor();
  await friend.getByText('Shared balance: 50 points').waitFor();
  await friend.getByText('Shared points: 50', { exact: true }).waitFor();
  expect(Number((await db.query<{ n: string }>(`SELECT count(*) AS n FROM socialu.point_transactions WHERE student_id=2 AND category='purchase'`)).rows[0].n)).toBe(2);
  // Insufficient points are labelled and cannot be bought.
  await friend.locator('[data-offer-state="insufficient"]').filter({ hasText: 'Sofa' }).getByText('Insufficient points').waitFor();
  await friend.getByRole('button', { name: 'Close furniture shop' }).click();
  // Bought items are placeable immediately in their own room.
  await openOwnRoom(friend);
  await friend.getByRole('button', { name: 'Decorate' }).click();
  await placeFromInventory(friend, 'Plant', 1, 1);
}, 240000);

it('works on a phone layout and keeps the legacy versions available', async () => {
  // Only the phone needs a live canvas here.
  await closePage(owner); await closePage(friend); owner = null; friend = null;
  const phone = await signIn(3, { width: 390, height: 844 });
  await phone.getByRole('button', { name: /^Interact: Enter 103/ }).waitFor();
  expect(await phone.locator('[aria-label="Turn camera left"]').isVisible()).toBe(true);
  expect(await phone.locator('[role="presentation"]').first().isVisible()).toBe(true); // joystick on touch
  await shot(phone, 'mobile-hall');
  await phone.goto(base + '/game-room/dormspace/campus');
  await phone.getByRole('heading', { name: /DormHall/ }).waitFor();
  await phone.goto(base + '/game-room/dormspace/classic');
  await phone.getByText('Saved original version').waitFor();
  await phone.context().close();
}, 240000);
