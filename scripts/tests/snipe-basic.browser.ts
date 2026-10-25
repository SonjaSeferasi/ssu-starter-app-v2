import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import sharp from 'sharp';
import { befriend, testUid } from '../../__tests__/helpers/dormspace-db';
import { createGroup, createSnipeDatabase } from '../../__tests__/helpers/snipe-db';

// SRS-510 to 514 basic acceptance: the real Next UI and API run against the real schema and functions in
// PGlite. Only the provider's Auth, Storage and PostgREST HTTP transport is replaced, on loopback; no hosted
// accounts, keys or data. Students: 1 photographer, 2 and 3 tagged friends, 4 an untagged group member.
let db: PGlite, service: Server, next: ChildProcess, browser: any;
let base = '', nextLog = '', group = '', dropNextCreate = false;
const pages: Record<string, any> = {};
const sessions = new Map<string, any>();
const objects = new Map<string, { bytes: Buffer; type: string }>();
const signedSnipeKeys: string[] = [];
const leakedKeys: string[] = [];
// Must match SNIPE_BUCKET in lib/snipe.ts and the migration (not imported: lib/snipe pulls in server modules).
const SNIPE_BUCKET = 'socialu-snipe-photos';
const otherBucketRequests: string[] = [];
const artifacts = process.env.SNIPE_EVIDENCE_DIR || 'tmp/snipe-basic';
const desktop = { width: 1280, height: 900 }, phone = { width: 390, height: 844 };
const user = (student: number) => ({ id: testUid(student), email: `dorm${student}@salemstate.edu`, email_confirmed_at: '2026-10-19T12:00:00Z', aud: 'authenticated', role: 'authenticated', user_metadata: { full_name: `Dorm Student ${student}`, username: `dorm${student}` } });
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function listen(server: Server) {
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return (server.address() as { port: number }).port;
}
async function api(page: any, path: string, method = 'GET', body?: unknown) {
  return page.evaluate(async ({ path, method, body }: { path: string; method: string; body: unknown }) => {
    const response = await fetch(path, { method, cache: 'no-store', headers: { Authorization: `Bearer ${localStorage.getItem('access_token') || sessionStorage.getItem('access_token') || ''}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    return { status: response.status, type: response.headers.get('content-type'), cache: response.headers.get('cache-control'), text };
  }, { path, method, body });
}
async function signIn(student: number, viewport = desktop) {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width < 600 });
  const page = await context.newPage();
  // Nothing returned to the browser may contain a private storage reference.
  page.on('response', async (response: any) => {
    if (!response.url().includes('/api/')) return;
    const text = await response.text().catch(() => '');
    if (text.includes('snipe/' + testUid(1)) || text.includes('storage_key')) leakedKeys.push(response.url());
  });
  await page.goto(base + '/login', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => { const form = document.querySelector('form'); return form && Object.keys(form).some(key => key.startsWith('__reactProps$')); });
  await page.getByRole('textbox', { name: 'University email or username' }).fill(`dorm${student}@salemstate.edu`);
  await page.getByLabel('Password', { exact: true }).fill('SnipeTest123!');
  const loginResponse = page.waitForResponse((response: any) => response.url().endsWith('/api/auth/login') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const login = await loginResponse;
  if (!login.ok()) throw new Error(`Test account sign-in failed: ${login.status()} ${await login.text()}`);
  await page.waitForFunction(() => Boolean(localStorage.getItem('access_token') || sessionStorage.getItem('access_token')));
  return page;
}
async function openSnipes(page: any) {
  await page.goto(`${base}/messages/${group}`);
  await page.getByRole('heading', { name: /Group chat/ }).waitFor();
  const toggle = page.getByRole('button', { name: /^Snipe/ });
  await toggle.waitFor();
  // Keyboard: the panel opens from the focused toggle.
  await toggle.focus(); await page.keyboard.press('Enter');
  await page.getByText('Rewards are not connected yet', { exact: false }).waitFor();
  return page;
}
const card = (page: any) => page.getByRole('article', { name: 'Snipe by Dorm Student 1' }).first();
async function screenshot(page: any, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifacts}/${name}.png`, fullPage: true });
}
async function photoBlob(page: any) {
  const image = card(page).getByRole('img', { name: 'Snipe by Dorm Student 1' });
  await image.waitFor();
  await page.waitForFunction((el: HTMLImageElement) => el.complete && el.naturalWidth > 0, await image.elementHandle());
  return image.getAttribute('src') as Promise<string>;
}
const snipeRows = async () => (await db.query<any>('SELECT snipe_id::text AS id, status FROM socialu.snipe_requests ORDER BY snipe_id')).rows;

beforeAll(async () => {
  mkdirSync(artifacts, { recursive: true });
  db = await createSnipeDatabase(4);
  await befriend(db, 1, 2); await befriend(db, 1, 3);
  group = await createGroup(db, 1, [2, 3, 4]);
  service = createServer(async (request, response) => {
    const url = new URL(request.url!, 'http://localhost');
    const path = decodeURIComponent(url.pathname);
    const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(chunk as Buffer);
    const raw = Buffer.concat(chunks);
    const reply = (status: number, data: unknown) => { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(data)); };
    try {
      if (path === '/auth/v1/token') {
        const body = JSON.parse(raw.toString() || '{}');
        const student = Number(/^dorm([1-4])@salemstate.edu$/.exec(body.email || '')?.[1]);
        if (!student || body.password !== 'SnipeTest123!') { reply(400, { message: 'Invalid credentials' }); return; }
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
      // Private Storage stand-in for the dedicated Snipe bucket only (SNIPE_BUCKET in lib/snipe.ts): no public
      // or signed Snipe URLs exist and the general media bucket is never used; the server reads bytes directly.
      if (path.startsWith('/storage/v1/') && !path.includes(SNIPE_BUCKET)) otherBucketRequests.push(path);
      if (path === `/storage/v1/bucket/${SNIPE_BUCKET}`) { reply(200, { id: SNIPE_BUCKET, name: SNIPE_BUCKET, public: false }); return; }
      if (path.startsWith('/storage/v1/object/sign/')) {
        if (path.includes('snipe/')) signedSnipeKeys.push(path);
        reply(404, { statusCode: '404', error: 'not_found', message: 'Object not found' }); return;
      }
      if (path === `/storage/v1/object/${SNIPE_BUCKET}` && request.method === 'DELETE') {
        for (const key of JSON.parse(raw.toString()).prefixes) objects.delete(key);
        reply(200, []); return;
      }
      if (path.startsWith(`/storage/v1/object/${SNIPE_BUCKET}/`)) {
        const key = path.slice(`/storage/v1/object/${SNIPE_BUCKET}/`.length);
        if (request.method === 'POST') {
          if (objects.has(key)) { reply(409, { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' }); return; }
          objects.set(key, { bytes: raw, type: String(request.headers['content-type']) });
          reply(200, { Key: `${SNIPE_BUCKET}/${key}`, Id: randomUUID() }); return;
        }
        const object = objects.get(key);
        if (!object) { reply(404, { statusCode: '404', error: 'not_found', message: 'Object not found' }); return; }
        response.writeHead(200, { 'Content-Type': object.type }); response.end(object.bytes); return;
      }
      const fn = path.match(/^\/rest\/v1\/rpc\/(socialu_[a-z_]+)$/)?.[1];
      const body = raw.length ? JSON.parse(raw.toString()) : {};
      if (!fn || !Object.keys(body).every(key => /^p_[a-z_]+$/.test(key))) { reply(404, { code: 'PGRST202', message: 'Unknown local test endpoint' }); return; }
      const entries = Object.entries(body);
      const result = await db.query<{ result: any }>(`SELECT public.${fn}(${entries.map(([key], index) => `${key} => $${index + 1}`).join(',')}) AS result`, entries.map(([, value]) => value && typeof value === 'object' ? JSON.stringify(value) : value));
      // Lost connection after the database committed: the server cannot know the outcome.
      if (fn === 'socialu_snipe' && body.p_action === 'create' && dropNextCreate) { dropNextCreate = false; request.socket.destroy(); return; }
      reply(200, result.rows[0].result);
    } catch (error: any) { reply(400, { code: error.code || 'TEST', message: error.message, details: error.detail ?? null }); }
  });
  const servicePort = await listen(service);
  const reservation = createServer(); const nextPort = await listen(reservation);
  await new Promise<void>(resolve => reservation.close(() => resolve()));
  base = `http://127.0.0.1:${nextPort}`;
  next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(nextPort)], {
    cwd: process.env.SNIPE_APP_ROOT || process.cwd(),
    env: { ...process.env, SUPABASE_URL: `http://127.0.0.1:${servicePort}`, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${servicePort}`, SUPABASE_SERVICE_ROLE_KEY: 'isolated-test-service-key', SUPABASE_ANON_KEY: 'isolated-test-anon-key', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'isolated-test-anon-key', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  next.stdout?.on('data', chunk => { nextLog += chunk.toString(); });
  next.stderr?.on('data', chunk => { nextLog += chunk.toString(); });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(`${base}/api/conversations/${group}/snipes`)).status === 401) { ready = true; break; } } catch {}
    if (next.exitCode !== null) break;
    await delay(300);
  }
  if (!ready) throw new Error('Local Next test app did not start: ' + nextLog.slice(-3000));
  const playwright = await import(/* @vite-ignore */ process.env.SOCIALU_PLAYWRIGHT_MODULE || 'playwright');
  browser = await playwright.chromium.launch({ headless: true, ...(process.env.SNIPE_BROWSER_EXECUTABLE ? { executablePath: process.env.SNIPE_BROWSER_EXECUTABLE } : {}) });
}, 120000);

afterEach(async context => {
  if (context.task.result?.state === 'fail') {
    for (const [name, page] of Object.entries(pages)) if (page && !page.isClosed()) {
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

it('uploads, reviews, approves, persists, withdraws and then blocks the photo', async () => {
  // A real JPEG with embedded metadata; the stored copy must be re-encoded without it.
  const photo = await sharp({ create: { width: 900, height: 600, channels: 3, background: '#000000', noise: { type: 'gaussian', mean: 120, sigma: 50 } } })
    .withExif({ IFD0: { Copyright: 'SocialU acceptance owner' } }).jpeg().toBuffer();

  const photographer = pages.photographer = await openSnipes(await signIn(1));
  await photographer.getByRole('button', { name: 'New Snipe' }).click();
  // Only current friends who are in this conversation are offered; the untagged member 4 is not a friend.
  expect(await photographer.getByRole('checkbox').count()).toBe(2);
  await photographer.getByLabel(/^Photo/).setInputFiles({ name: 'snipe.jpg', mimeType: 'image/jpeg', buffer: photo });
  await photographer.getByRole('img', { name: 'Selected Snipe photo preview' }).waitFor();
  await photographer.getByRole('checkbox', { name: /Dorm Student 2/ }).check();
  await photographer.getByRole('button', { name: 'Submit Snipe' }).click();
  await photographer.getByText('Snipe submitted.', { exact: false }).waitFor();
  await card(photographer).getByText('Pending', { exact: true }).waitFor();
  expect(await photoBlob(photographer)).toMatch(/^blob:/);
  await screenshot(photographer, 'desktop-photographer-pending');

  const [pending] = await snipeRows();
  expect(pending.status).toBe('pending');
  const stored = [...objects.entries()].filter(([key]) => key.startsWith(`snipe/${testUid(1)}/`));
  expect(stored).toHaveLength(1);
  expect((await sharp(stored[0][1].bytes).metadata()).exif).toBeUndefined();
  const photoPath = `/api/conversations/${group}/snipes/${pending.id}/photo`;

  // SRS-512.2: the untagged member sees no request, placeholder or photo while it is pending.
  const member = pages.member = await openSnipes(await signIn(4));
  expect(JSON.parse((await api(member, `/api/conversations/${group}/snipes`)).text).snipes).toEqual([]);
  expect(await member.getByRole('article').count()).toBe(0);
  expect((await api(member, photoPath)).status).toBe(404);

  // SRS-511.2 to 511.4 on a phone: two separate questions, nothing preselected; one saved answer never fills the other.
  const tagged = pages.tagged = await openSnipes(await signIn(2, phone));
  await tagged.getByRole('button', { name: /^Snipe.*1 to review/ }).waitFor();
  expect(await photoBlob(tagged)).toMatch(/^blob:/);
  const identity = card(tagged).getByRole('group', { name: 'Is this you?' });
  const sharing = card(tagged).getByRole('group', { name: 'Do you approve sharing this photo in this conversation?' });
  for (const question of [identity, sharing]) {
    for (const radio of await question.getByRole('radio').all()) expect(await radio.isChecked()).toBe(false);
    expect(await question.getByRole('button', { name: 'Save answer' }).isDisabled()).toBe(true);
  }
  await identity.getByRole('radio', { name: 'Yes' }).press('Space');
  await identity.getByRole('button', { name: 'Save answer' }).press('Enter');
  await card(tagged).getByText('Is this you? Yes', { exact: true }).waitFor();
  expect(await sharing.getByRole('radio', { name: 'Yes' }).isChecked()).toBe(false);
  await card(tagged).getByText('Pending', { exact: true }).waitFor();
  expect(await tagged.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await screenshot(tagged, 'mobile-tagged-review');
  await sharing.getByRole('radio', { name: 'Yes' }).check();
  await sharing.getByRole('button', { name: 'Save answer' }).click();
  await card(tagged).getByText('Approved', { exact: true }).waitFor();
  await card(tagged).getByText('Verified: Dorm Student 2').waitFor();

  // SRS-512.10/512.11: the outcome persists for the photographer, a fresh session and other members.
  await photographer.reload(); await openSnipes(photographer);
  await card(photographer).getByText('Approved', { exact: true }).waitFor();
  expect(await photoBlob(photographer)).toMatch(/^blob:/);
  await tagged.context().close();
  const returning = pages.tagged = await openSnipes(await signIn(2, phone));
  await card(returning).getByText('Approved', { exact: true }).waitFor();
  await member.reload(); await openSnipes(member);
  await card(member).getByText('Verified: Dorm Student 2').waitFor();
  expect(await photoBlob(member)).toMatch(/^blob:/);
  expect(await card(member).getByRole('button', { name: /Remove|Withdraw/ }).count()).toBe(0);
  await screenshot(member, 'desktop-member-approved');
  const image = await api(member, photoPath);
  expect([image.status, image.type, image.cache]).toEqual([200, 'image/jpeg', 'private, no-store, max-age=0']);

  // SRS-511.12, 514.4 to 514.7: confirmed withdrawal removes the Snipe for everyone; bytes stop being served.
  await card(returning).getByRole('button', { name: 'Withdraw sharing permission' }).click();
  await card(returning).getByRole('group', { name: 'Confirm' }).getByRole('button', { name: 'Confirm' }).click();
  await card(returning).getByText('Snipe removed', { exact: true }).waitFor();
  await card(returning).getByText('Removed', { exact: true }).waitFor();
  await screenshot(returning, 'mobile-tagged-removed');
  for (const page of [photographer, returning, member]) expect((await api(page, photoPath)).status).toBe(404);
  await member.reload(); await openSnipes(member);
  await card(member).getByText('Snipe removed', { exact: true }).waitFor();
  expect(await card(member).getByRole('img', { name: 'Snipe by Dorm Student 1' }).count()).toBe(0);
  await photographer.reload(); await openSnipes(photographer);
  await card(photographer).getByText('Reason: Sharing permission withdrawn').waitFor();
  await screenshot(photographer, 'desktop-photographer-removed');
  // SRS-513.1: the pair cooldown remains after removal; the friend is offered again only after 24 hours.
  await photographer.getByRole('button', { name: 'New Snipe' }).click();
  expect(await photographer.getByRole('checkbox', { name: /Dorm Student 2/ }).isDisabled()).toBe(true);

  expect((await snipeRows()).map(row => row.status)).toEqual(['removed']);
  expect(signedSnipeKeys).toEqual([]);
  expect(otherBucketRequests).toEqual([]);
  expect(leakedKeys).toEqual([]);
  for (const page of [photographer, returning, member]) await page.context().close();
});

it('returns the saved Snipe when the response is lost after commit, without a second request', async () => {
  const before = (await snipeRows()).length;
  const photographer = pages.photographer = await openSnipes(await signIn(1));
  await photographer.getByRole('button', { name: 'New Snipe' }).click();
  await photographer.getByLabel(/^Photo/).setInputFiles({ name: 'retry.png', mimeType: 'image/png',
    buffer: await sharp({ create: { width: 320, height: 240, channels: 3, background: '#c0ddcb' } }).png().toBuffer() });
  await photographer.getByRole('checkbox', { name: /Dorm Student 3/ }).check();
  dropNextCreate = true;
  await photographer.getByRole('button', { name: 'Submit Snipe' }).click();
  await photographer.getByRole('button', { name: 'Try again' }).waitFor();
  expect(await snipeRows()).toHaveLength(before + 1);
  await photographer.getByRole('button', { name: 'Try again' }).click();
  await photographer.getByText('This Snipe was already submitted.').waitFor();
  expect(await snipeRows()).toHaveLength(before + 1);
  // The committed photo was kept on the uncertain outcome and is still the one served to the reviewer.
  const tagged = pages.tagged = await openSnipes(await signIn(3, phone));
  expect(await photoBlob(tagged)).toMatch(/^blob:/);
  await screenshot(tagged, 'mobile-retry-review');
  expect(otherBucketRequests).toEqual([]);
  expect(leakedKeys).toEqual([]);
  for (const page of [photographer, tagged]) await page.context().close();
});
