import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { befriend, createDormDatabase, friendship, testUid } from '../../__tests__/helpers/dormspace-db';
import { prepareLiveDatabase } from '../../__tests__/helpers/dormspace-live-db';
import { credit, DIRECTORY_MIGRATION, SHOP_MIGRATION } from '../../__tests__/helpers/dormspace-3d-db';
import { roomSolidCells } from '../../lib/dormspace-rules';

// The real Next UI and APIs over the real schema/functions in a disposable PGlite database. Only the
// provider Auth/PostgREST HTTP transport is replaced (loopback only). Four synthetic accounts; no real
// students, messages or points. Chromium must provide WebGL (SwiftShader in headless mode).
let db: PGlite, service: Server, next: ChildProcess, browser: any, owner: any, friend: any, stranger: any;
let base = '', nextLog = '', friendRequest = '';
const sessions = new Map<string, any>();
const artifacts = process.env.DORMSPACE_EVIDENCE_DIR || 'tmp/dormspace-3d';
const voiceTest = process.env.DORMSPACE_VOICE_TEST === '1';
const voiceMigration = 'supabase/migrations/20261106075900_dormspace_voice.sql';
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
  // The first API 400 per page: its path, the request's `action` name only (no other request field)
  // and the response's code/error text (server messages; never tokens, keys or positions).
  let first400 = false;
  page.on('response', (response: any) => {
    const status = response.status(), path = pathOf(response.url());
    if (status >= 500) { push(`http ${status}: ${path}`); return; }
    if (status !== 400 || first400 || !path.startsWith('/api/')) return;
    first400 = true;
    let action = '(none)';
    try { const value = JSON.parse(response.request().postData() || '{}').action; if (value !== undefined) action = /^[a-z]{1,20}$/.test(String(value)) ? String(value) : '(other)'; } catch { /* not JSON */ }
    void response.json().then((body: any) => push(`http 400: ${path} action=${action} code=${String(body?.code ?? '').slice(0, 40)} error=${String(body?.error ?? '').slice(0, 160)}`))
      .catch(() => push(`http 400: ${path} action=${action} (body unreadable)`));
  });
}
async function describePage(page: any) {
  if (!page || page.isClosed()) return '(page closed)';
  const attribute = (selector: string, name: string) => within<string | null>(page.locator(selector).first().getAttribute(name, { timeout: 1500 }), 2500, '(none)');
  const alerts = await within<string[]>(page.locator('[role="alert"]').allInnerTexts(), 2500, []);
  return [`route=${pathOf(page.url())} engine=${await attribute('div[data-engine]', 'data-engine')} scene=${await attribute('[data-scene]', 'data-scene')}`,
    `alerts=${JSON.stringify(alerts.slice(0, 5).map(redact))}`, ...(logs.get(page) ?? [])].join('\n');
}

// Signs a synthetic account in through the real POST /api/auth/login on the loopback Next server and
// returns the browser storage the login page itself writes for "remember me" (saveSession(..., true):
// localStorage access_token + socialu_session). Tokens never leave this function except via storageState.
async function loginStorage(student: number) {
  const origin = new URL(base).origin;
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) throw new Error('loginStorage is restricted to the loopback test server');
  const response = await fetch(`${origin}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: `dorm${student}@salemstate.edu`, password: 'DormTest123!' }) });
  const data = await response.json().catch(() => ({}));
  const session = data?.session?.session;
  if (!response.ok || typeof session?.access_token !== 'string') throw new Error(`POST /api/auth/login returned ${response.status} without a session (${redact(String(data?.code ?? data?.error ?? ''))})`);
  const stored = { access_token: session.access_token, ...(session.refresh_token ? { refresh_token: session.refresh_token } : {}), ...(session.expires_at ? { expires_at: session.expires_at } : {}) };
  return { cookies: [], origins: [{ origin, localStorage: [{ name: 'access_token', value: stored.access_token }, { name: 'socialu_session', value: JSON.stringify(stored) }] }] };
}

// Visible body text (bounded, scrubbed) for failures where no screenshot could be captured.
async function bodyText(page: any) {
  if (!page || page.isClosed()) return '(page closed)';
  const text = await within<string>(page.locator('body').innerText({ timeout: 2000 }), 3000, '(body text unavailable)');
  return scrub(text.replace(/\s+/g, ' ')).slice(0, 600);
}
// Loads the real 3D route in an existing page (same context and storage) and waits for a ready hall.
async function enter3D(page: any, label: string) {
  try {
    // Direct navigation to the real game route: no client-side redirect to race.
    await page.goto(base + '/game-room/dormspace', { waitUntil: 'domcontentloaded', timeout: voiceTest ? 150000 : 30000 });
    await page.bringToFront();
    // Fail fast (with the real state) if the engine settles on anything other than ready.
    const settled = page.locator('div[data-engine]:not([data-engine="loading"])');
    await settled.waitFor({ timeout: voiceTest ? 120000 : 60000 });
    const state = await settled.getAttribute('data-engine');
    if (state !== 'ready') throw new Error(`the 3D engine settled as "${state}", not "ready"`);
    await page.locator('[data-scene="hall"]').waitFor({ timeout: 30000 });
    return page;
  } catch (error) {
    const captured = await within<unknown>(page.screenshot({ path: `${artifacts}/enter3d-failure-${label}.png`, timeout: 5000 }), 7000, null);
    const details = await within(describePage(page), 10000, '(diagnostics timed out)');
    const text = captured ? '' : `\nbody=${await bodyText(page)}`;
    throw new Error(`enter3D(${label}) failed: ${(error as Error).message}\n${details}${text}`);
  }
}
// Unloads a page's 3D canvas (and live connection) by navigating to a blank page; context/storage stay.
async function park(page: any) {
  if (!page || page.isClosed()) return;
  await page.goto('about:blank');
  expect(await page.locator('[data-dormspace-canvas]').count()).toBe(0);
}

async function signIn(student: number, viewport = DESKTOP) {
  const mobile = viewport.width < 600;
  // A fresh context per account, pre-populated (loopback origin only) with the real login response.
  const storageState = await loginStorage(student);
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile, storageState });
  const page = await context.newPage();
  if (voiceTest) page.setDefaultTimeout(45000);
  watch(page);
  try {
    return await enter3D(page, `dorm${student}`);
  } catch (error) {
    await within(context.close(), 5000, undefined);
    throw new Error(`signIn(dorm${student}) failed: ${(error as Error).message}`);
  }
}
const closePage = async (page: any) => { if (page && !page.isClosed()) await within(page.context().close(), 5000, undefined); };
const shot = (page: any, name: string) => page.screenshot({ path: `${artifacts}/${name}.png`, timeout: 15000 });
const blur = (page: any) => page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
async function hold(page: any, key: string, ms: number) { await blur(page); await page.keyboard.down(key); try { await delay(ms); } finally { await page.keyboard.up(key); } }
// Walks until the interaction prompt appears (frame rate varies widely under software GL), at most `ms`.
async function holdUntil(page: any, key: string, prompt: any, ms = 8000) {
  await blur(page); await page.keyboard.down(key);
  try { await prompt.waitFor({ timeout: ms }); } finally { await page.keyboard.up(key); }
}
type LiveRow = { space: string; state: { x: number; y: number; moving: boolean; restItemId: string | null } };
// The server's own live row for a student, polled until `ready` holds (bounded); fails with what it saw.
async function liveRow(student: number, ready: (row: LiveRow) => boolean, ms = 15000) {
  const until = Date.now() + ms; let row: LiveRow | null = null;
  while (Date.now() < until) {
    row = (await db.query<LiveRow>('SELECT space, state FROM dormspace_live.players WHERE student_id=$1', [student])).rows[0] ?? null;
    if (row && ready(row)) return row;
    await delay(200);
  }
  throw new Error(`dorm${student}'s live row never reached the expected state (last: ${JSON.stringify(row)})`);
}
const readLiveRow = async (student: number) =>
  (await db.query<LiveRow>('SELECT space, state FROM dormspace_live.players WHERE student_id=$1', [student])).rows[0] ?? null;

// Case 3 precondition (standalone under -t): the 1x1 chair case 2 saves, at x4,y3 rotation 90. Saved
// through the real owner PUT /api/dorm when missing. Returns true when it changed the saved layout.
const CHAIR_SPOT = { x: 4, y: 3, rotation: 90 } as const;
async function ensureChair(page: any) {
  const opened = await api(page, '/api/dorm');
  if (opened.status !== 200) throw new Error(`GET /api/dorm returned ${opened.status}`);
  const dorm = opened.data;
  const chair = dorm.catalog.find((item: any) => item.name === 'Chair' && item.surface === 'floor');
  if (!chair) throw new Error('the catalog has no floor item named Chair');
  if (dorm.placements.some((p: any) => p.itemId === chair.id && p.x === CHAIR_SPOT.x && p.y === CHAIR_SPOT.y && (p.rotation ?? 0) === CHAIR_SPOT.rotation)) return false;
  if (!dorm.owned.includes(chair.id)) throw new Error('dorm1 does not own a Chair');
  // Drop any other chair placement and anything covering the target cell, keep the rest as saved.
  const covers = (p: any) => {
    const item = dorm.catalog.find((entry: any) => entry.id === p.itemId);
    const w = item?.surface === 'floor' && (p.rotation === 90 || p.rotation === 270) ? (item?.height ?? 1) : (item?.width ?? 1);
    const h = item?.surface === 'floor' && (p.rotation === 90 || p.rotation === 270) ? (item?.width ?? 1) : (item?.height ?? 1);
    return item?.surface === 'floor' && CHAIR_SPOT.x >= p.x && CHAIR_SPOT.x < p.x + w && CHAIR_SPOT.y >= p.y && CHAIR_SPOT.y < p.y + h;
  };
  const placements = [...dorm.placements.filter((p: any) => p.itemId !== chair.id && !covers(p)), { itemId: chair.id, ...CHAIR_SPOT }];
  const saved = await api(page, '/api/dorm', 'PUT', { version: dorm.version, placements, wallItemId: dorm.wallItemId, floorItemId: dorm.floorItemId });
  if (saved.status !== 200) throw new Error(`PUT /api/dorm (chair setup) returned ${saved.status}: ${redact(String(saved.data?.code ?? ''))} ${redact(String(saved.data?.error ?? ''))}`);
  return true;
}

// Failure-only context for the chair walk: live row before/after, prompt text, page visibility and
// the saved chair placement. Positions are synthetic test data.
async function walkDiagnostics(page: any, before: LiveRow | null) {
  const after = await within(readLiveRow(1), 3000, null);
  const prompt = await within<string[]>(page.locator('[data-scene="room"] [role="status"]:has(kbd)').allInnerTexts(), 2500, []);
  const control = await within<string[]>(page.getByRole('button', { name: /^(Interact: |Nothing nearby)/ }).allInnerTexts(), 2500, []);
  const visibility = await within<unknown>(page.evaluate(() => ({ visibilityState: document.visibilityState, hidden: document.hidden, focused: document.hasFocus(), active: document.activeElement?.tagName ?? null })), 2500, '(unavailable)');
  const promptVisible = await within<boolean | string>(page.getByText('Sit in chair').first().isVisible(), 2500, '(unavailable)');
  const dorm = await within<any>(api(page, '/api/dorm'), 5000, null);
  const chairId = dorm?.data?.catalog?.find((item: any) => item.name === 'Chair')?.id;
  const chairs = dorm?.data?.placements?.filter((p: any) => p.itemId === chairId) ?? '(unavailable)';
  const captured = await within<unknown>(page.screenshot({ path: `${artifacts}/walk-to-chair-failure.png`, timeout: 5000 }), 7000, null);
  return [`liveRow before W=${JSON.stringify(before)}`, `liveRow after W=${JSON.stringify(after)}`,
    `room prompt=${JSON.stringify(prompt.map(redact))} interact control=${JSON.stringify(control.map(redact))} "Sit in chair" visible=${promptVisible}`,
    `page=${JSON.stringify(visibility)}`, `saved chair placements=${JSON.stringify(chairs)} (dorm version ${dorm?.data?.version ?? '?'})`,
    `screenshot=${captured ? `${artifacts}/walk-to-chair-failure.png` : '(not captured)'}`].join('\n');
}

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
  if (voiceTest) await db.exec(readFileSync(voiceMigration, 'utf8'));
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
        entries.map(([key, value]) => key !== 'p_connections' && value && typeof value === 'object' ? JSON.stringify(value) : value));
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
  if (voiceTest) {
    const status = await fetch(base + '/api/dorm/voice', { method: 'POST', signal: AbortSignal.timeout(90000) });
    if (status.status !== 401) throw new Error('Voice API did not start: ' + nextLog.slice(-2000));
  }
  const playwright = await import(/* @vite-ignore */ process.env.SOCIALU_PLAYWRIGHT_MODULE || 'playwright');
  browser = await playwright.chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', ...(voiceTest ?
    ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] : [])], ...(process.env.DORMSPACE_BROWSER_EXECUTABLE ? { executablePath: process.env.DORMSPACE_BROWSER_EXECUTABLE } : {}) });
}, 120000);
afterEach(async context => {
  if (context.task.result?.state === 'fail') {
    for (const [name, page] of [['owner', owner], ['friend', friend], ['stranger', stranger]] as const) {
      if (!page || page.isClosed()) continue;
      const captured = await within<unknown>(page.screenshot({ path: `${artifacts}/failure-${name}.png`, timeout: 5000 }), 7000, null);
      console.error(`[${name}] ${await within(describePage(page), 10000, '(diagnostics timed out)')}${captured ? '' : `\nbody=${await bodyText(page)}`}`);
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
  const fromOwner = (await api(owner, '/api/dorm/hall?floor=1')).data;
  // One active software-GL canvas at a time: unload the owner's hall before the stranger's loads.
  await park(owner);
  stranger = await signIn(3);
  await stranger.getByText('Your room 103').waitFor();
  await stranger.getByRole('button', { name: 'Elevator & doors' }).click();
  await stranger.getByRole('button', { name: 'Room 101 is locked · friends only' }).waitFor();
  await shot(stranger, 'hall-stranger-elevator');
  expect((await api(stranger, '/api/dorm?owner=dorm1')).status).toBe(403);
  const fromStranger = (await api(stranger, '/api/dorm/hall?floor=1')).data;
  expect(fromStranger.doors.map((d: any) => d.roomNumber + d.username)).toEqual(fromOwner.doors.map((d: any) => d.roomNumber + d.username));
  // The stranger is not needed again: release its context (and WebGL canvas) now.
  await closePage(stranger); stranger = null;
  // A block withholds identity but keeps the door number.
  await friendship(db, 4, 'block', 1);
  await enter3D(owner, 'owner-return');
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
  // Standalone preconditions: signed-in owner in the hall, chair saved at x4,y3 rotation 90.
  if (!owner || owner.isClosed()) owner = await signIn(1);
  const changed = await ensureChair(owner);
  if (changed || await owner.locator('[data-scene="hall"]').count() === 0) await enter3D(owner, 'owner-chair-setup');
  await openOwnRoom(owner);
  // The room's live connection really joined (a rejected join would leave no room:1 row).
  const before = await liveRow(1, row => row.space === 'room:1');
  // Walking up from the entrance reaches the chair, then keeps pressing against it: collision holds
  // the player outside every solid cell, and the server's stopped position agrees. Movement and the
  // proximity prompt are asserted separately; software GL can be slow, so the walk is bounded at 22s.
  const sit = owner.getByText('Sit in chair').first();
  const WALK_MS = 22000, started = Date.now();
  await blur(owner); await owner.keyboard.down('w');
  try {
    try {
      await liveRow(1, row => row.space === 'room:1' && (Math.abs(row.state.x - before.state.x) > 0.05 || Math.abs(row.state.y - before.state.y) > 0.05), WALK_MS);
    } catch (error) {
      throw new Error(`movement: holding W did not move dorm1's live position within ${WALK_MS}ms: ${(error as Error).message}\n${await walkDiagnostics(owner, before)}`);
    }
    try {
      await sit.waitFor({ timeout: Math.max(1000, WALK_MS - (Date.now() - started)) });
    } catch (error) {
      throw new Error(`proximity: dorm1 moved but "Sit in chair" did not appear within ${WALK_MS}ms of holding W: ${(error as Error).message}\n${await walkDiagnostics(owner, before)}`);
    }
  } finally { await owner.keyboard.up('w'); }
  await hold(owner, 'w', 800);
  await sit.waitFor();
  const room = (await api(owner, '/api/dorm')).data, floor = room.surfaces.find((s: any) => s.code === 'floor');
  const solid = roomSolidCells(room.catalog, room.placements, floor.height, floor.width);
  const stopped = await liveRow(1, row => row.space === 'room:1' && !row.state.moving);
  expect(solid.has(`${Math.round(stopped.state.x)},${Math.round(stopped.state.y)}`)).toBe(false);
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
  await hold(owner, 's', 300); await holdUntil(owner, 'w', owner.getByText('Sleep in bed').first());
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
  // Standalone: sign the owner in through the real app if an earlier case did not.
  if (!owner || owner.isClosed()) owner = await signIn(1);
  // Unload the owner's canvas while the friend's hall loads and they walk in.
  await park(owner);
  friend = await signIn(2);
  await friend.getByRole('button', { name: 'Elevator & doors' }).click();
  await friend.getByRole('button', { name: 'Enter room 101, dorm1' }).click();
  await friend.getByText("dorm1's room", { exact: true }).waitFor();
  expect(await friend.getByRole('button', { name: 'Decorate' }).count()).toBe(0);
  await liveRow(2, row => row.space === 'room:1');
  await shot(friend, 'room-visitor');
  // With the friend joined, the owner returns to their room (two lighter room canvases at once).
  await enter3D(owner, 'owner-room-return');
  await openOwnRoom(owner);
  // The save API never addresses another student's room: a visitor's PUT can only target their own.
  const before = (await api(owner, '/api/dorm')).data;
  await friend.bringToFront();
  await api(friend, '/api/dorm', 'PUT', { version: before.version, placements: [] });
  await owner.bringToFront();
  expect((await api(owner, '/api/dorm')).data.placements).toEqual(before.placements);
  await owner.getByRole('list', { name: 'Players here' }).getByText('dorm2').waitFor({ timeout: 15000 });
  // Optional evidence only (the roster assertion above is the real check): best-effort, short timeout.
  try {
    await owner.screenshot({ path: `${artifacts}/room-owner-sees-visitor.png`, timeout: 5000 });
  } catch (error) {
    console.warn(`[dormspace-3d] optional screenshot room-owner-sees-visitor skipped: ${(error as Error).message.split('\n')[0]}`);
  }
  // Leave one software-GL canvas: unload the owner's room before the friend's revocation check.
  await park(owner);
  await friend.bringToFront();
  await friendship(db, 1, 'remove', 2, friendRequest);
  // Either revocation path may win: the server's live denial (42501 from socialu_dormspace_live) or
  // the client's access poll. Both return the visitor to the hall with their own precise message.
  await friend.locator('[data-scene="hall"]').waitFor({ timeout: 15000 });
  await friend.getByText("You're no longer friends with dorm1, so your visit ended.", { exact: true })
    .or(friend.getByText('Your visit has ended. Return to the hall to continue.', { exact: true })).first().waitFor({ timeout: 10000 });
}, 240000);

it('buys with shared points after a final confirmation and recovers a lost response without a second charge', async () => {
  // Standalone: sign the friend in if needed, and keep only one software-GL canvas while shopping.
  await park(owner);
  if (!friend || friend.isClosed()) friend = await signIn(2);
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

it.skipIf(!voiceTest)('streams voice only after opt-in and isolates rooms, mic consent, mute and revocation', async () => {
  const viewport = { width: 720, height: 540 };
  owner = await signIn(1, viewport);
  friend = await signIn(2, viewport);
  const voice = (page: any) => page.getByRole('region', { name: /^Voice chat/ });
  // Use Chromium's synthetic microphone only. Count actual capture calls and inspect release.
  for (const page of [owner, friend]) {
    await page.evaluate(() => {
      const devices = navigator.mediaDevices;
      const capture = devices.getUserMedia.bind(devices);
      const observed = { calls: 0, deny: false, tracks: [] as MediaStreamTrack[] };
      Object.assign(window, { observedVoice: observed });
      devices.getUserMedia = async constraints => {
        observed.calls++;
        if (observed.deny) throw new DOMException('Test denial', 'NotAllowedError');
        const stream = await capture(constraints);
        observed.tracks.push(...stream.getAudioTracks());
        return stream;
      };
    });
  }
  const observed = (page: any) => page.evaluate(() => {
    const capture = (window as any).observedVoice;
    return { calls: capture.calls, states: capture.tracks.map((track: MediaStreamTrack) => track.readyState) };
  });
  const join = async (page: any) => {
    await page.bringToFront();
    await voice(page).getByRole('button', { name: 'Join voice', exact: true }).click({ timeout: 20000 });
    await voice(page).getByText('Listening only. Your microphone is off.', { exact: true }).waitFor({ timeout: 30000 });
  };
  await join(owner);
  expect(await observed(owner)).toEqual({ calls: 0, states: [] });
  expect(await voice(owner).getByRole('button', { name: 'Mute dorm2', exact: true }).count()).toBe(0);
  await join(friend);
  await voice(owner).getByRole('button', { name: 'Mute dorm2', exact: true }).waitFor();
  expect(await observed(friend)).toEqual({ calls: 0, states: [] });
  await owner.bringToFront();
  await voice(owner).getByRole('button', { name: 'Enable microphone', exact: true }).click();
  await voice(owner).getByText('Microphone on.', { exact: true }).waitFor();
  expect(await observed(owner)).toEqual({ calls: 1, states: ['live'] });
  await friend.bringToFront();
  const play = voice(friend).getByRole('button', { name: 'Play voice audio' });
  if (await play.isVisible()) await play.click();
  await friend.waitForFunction(() => [...document.querySelectorAll('audio')].some(audio => audio.currentTime > 0 && !audio.paused), undefined, { timeout: 20000 });
  await voice(friend).getByRole('button', { name: 'Mute dorm1', exact: true }).click();
  expect(await friend.locator('audio').first().evaluate((audio: HTMLAudioElement) => audio.muted)).toBe(true);
  await voice(friend).getByRole('button', { name: 'Unmute dorm1', exact: true }).click();
  expect(await friend.locator('audio').first().evaluate((audio: HTMLAudioElement) => audio.muted)).toBe(false);
  await friend.evaluate(() => { (window as any).observedVoice.deny = true; });
  await voice(friend).getByRole('button', { name: 'Enable microphone', exact: true }).click();
  await voice(friend).getByText(/Microphone unavailable or denied/).waitFor();
  expect(await friend.getByRole('textbox', { name: 'Message players here' }).isEnabled()).toBe(true);

  await owner.bringToFront();
  await voice(owner).getByRole('button', { name: 'Mute microphone', exact: true }).click();
  expect(await observed(owner)).toEqual({ calls: 1, states: ['ended'] });
  await shot(owner, 'voice-hall-listen-only');
  await openOwnRoom(owner);
  await voice(owner).getByRole('button', { name: 'Join voice', exact: true }).waitFor();
  await voice(friend).getByRole('button', { name: 'Mute dorm1', exact: true }).waitFor({ state: 'hidden' });
  await join(owner);

  await friend.bringToFront();
  await friend.getByRole('button', { name: 'Elevator & doors' }).click();
  await friend.getByRole('button', { name: 'Enter room 101, dorm1' }).click();
  await friend.locator('[data-scene="room"]').waitFor();
  await join(friend);
  await voice(owner).getByRole('button', { name: 'Mute dorm2', exact: true }).waitFor();
  await friendship(db, 1, 'remove', 2, friendRequest);
  await friend.locator('[data-scene="hall"]').waitFor({ timeout: 20000 });
  await voice(owner).getByRole('button', { name: 'Mute dorm2', exact: true }).waitFor({ state: 'hidden', timeout: 20000 });
  await voice(friend).getByRole('button', { name: 'Join voice', exact: true }).waitFor();
  await closePage(friend); friend = null;
  await closePage(owner); owner = null;
}, 420000);
