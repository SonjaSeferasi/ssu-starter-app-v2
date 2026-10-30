import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import sharp from 'sharp';
import { befriend, testUid } from '../../__tests__/helpers/dormspace-db';
import { createGroup, createSnipeDatabase } from '../../__tests__/helpers/snipe-db';
import { SNIPE_BUCKET, SNIPE_STAGING_BUCKET, createSnipeStorage } from './snipe-local-storage';

// SRS-510 to 514 and 525 acceptance: the real Next UI and API run against the real schema and functions in
// PGlite. Only the provider's Auth, Storage and PostgREST HTTP transport is replaced, on loopback; no hosted
// accounts, keys or data. Students: 1 photographer, 2 and 3 tagged friends, 4 an untagged group member (and,
// in the large-photo scenario, a newly added friend). Photos go from the browser straight to the Storage
// stand-in through an upload-only URL (SRS-510.2 direct transport); the app only receives small JSON.
const SERVICE_KEY = 'isolated-test-service-key';
let db: PGlite, service: Server, next: ChildProcess, browser: any;
let base = '', nextLog = '', group = '', dropNextAccept = false;
const pages: Record<string, any> = {};
const sessions = new Map<string, any>();
const storage = createSnipeStorage(SERVICE_KEY);
const objects = storage.objects;
const leakedKeys: string[] = [];
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
  // Not 'networkidle': cold-start compiles and app polling can keep the network busy. The hydration wait
  // below is the real readiness check before any field is touched.
  await page.goto(base + '/login', { waitUntil: 'domcontentloaded' });
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
async function openSnipes(page: any, conversation = group, heading: RegExp = /Group chat/) {
  await page.goto(`${base}/messages/${conversation}`);
  // The open conversation's own header (its "Conversation" region), not the Messages list or sidebar, which
  // can hold the same names and stay in the DOM, hidden, on phones.
  const open = page.getByRole('region', { name: 'Conversation', exact: true });
  await open.getByRole('heading', { level: 2, name: heading }).waitFor();
  const toggle = open.getByRole('button', { name: /^Snipe/ });
  await toggle.waitFor();
  // Keyboard: the panel opens from the focused toggle.
  await toggle.focus(); await page.keyboard.press('Enter');
  await page.getByText('Snipes stay in this conversation only.', { exact: false }).waitFor();
  return page;
}
const card = (page: any) => page.getByRole('article', { name: 'Snipe by Dorm Student 1' }).first();
// SRS-521.1: the signed-in student's confirmed shared balance inside the Snipe panel.
const balance = (page: any) => page.getByRole('status').filter({ hasText: /shared (points )?balance/ });
const ledgerRows = async () => (await db.query<any>('SELECT student_id::int AS student, points_change::int AS points FROM socialu.point_transactions ORDER BY transaction_id')).rows;
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
// The committed (re-encoded) object of one Snipe, looked up the way the photo route does.
async function committedObject(snipeId: string) {
  const key = (await db.query<any>(`SELECT m.storage_key FROM socialu.media_assets m JOIN socialu.snipe_requests r ON r.photo_id = m.asset_id
    WHERE r.snipe_id = $1`, [snipeId])).rows[0].storage_key as string;
  return { key, object: objects.get(`${SNIPE_BUCKET}/${key}`) };
}
// Every request the browser sends to this app (not to Storage): method, path, content type and body size.
function recordAppRequests(page: any) {
  const seen: { method: string; path: string; type: string; bytes: number }[] = [];
  page.on('request', (request: any) => {
    if (!request.url().startsWith(base + '/api/')) return;
    seen.push({ method: request.method(), path: new URL(request.url()).pathname, type: request.headers()['content-type'] || '', bytes: request.postDataBuffer()?.length ?? 0 });
  });
  return seen;
}
// Deterministic incompressible pixels (xorshift32), so the PNG is several MB yet well inside 4096 × 4096.
async function noisePng(width: number, height: number) {
  const pixels = Buffer.alloc(width * height * 3);
  let x = 0x2545f491;
  for (let i = 0; i < pixels.length; i++) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; pixels[i] = x & 0xff; }
  return sharp(pixels, { raw: { width, height, channels: 3 } }).png().toBuffer();
}
const transportClean = () => {
  expect(storage.log.signedReads).toEqual([]);
  expect(storage.log.otherBuckets).toEqual([]);
  expect(storage.log.browserReads).toEqual([]);
  expect(leakedKeys).toEqual([]);
};

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
      // Private Storage stand-in for the two Snipe buckets only (scripts/tests/snipe-local-storage.ts): no public
      // or signed READ URLs exist and the general media bucket is never used.
      if (storage.handle(request, response, path, url, raw)) return;
      const fn = path.match(/^\/rest\/v1\/rpc\/(socialu_[a-z_]+)$/)?.[1];
      const body = raw.length ? JSON.parse(raw.toString()) : {};
      if (!fn || !Object.keys(body).every(key => /^p_[a-z_]+$/.test(key))) { reply(404, { code: 'PGRST202', message: 'Unknown local test endpoint' }); return; }
      const entries = Object.entries(body);
      const result = await db.query<{ result: any }>(`SELECT public.${fn}(${entries.map(([key], index) => `${key} => $${index + 1}`).join(',')}) AS result`, entries.map(([, value]) => value && typeof value === 'object' ? JSON.stringify(value) : value));
      // Lost connection after the database committed the acceptance: the server cannot know the outcome.
      if (fn === 'socialu_snipe_photo' && body.p_action === 'accept' && dropNextAccept) { dropNextAccept = false; request.socket.destroy(); return; }
      reply(200, result.rows[0].result);
    } catch (error: any) { reply(400, { code: error.code || 'TEST', message: error.message, details: error.detail ?? null }); }
  });
  const servicePort = await listen(service);
  const reservation = createServer(); const nextPort = await listen(reservation);
  await new Promise<void>(resolve => reservation.close(() => resolve()));
  base = `http://127.0.0.1:${nextPort}`;
  next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(nextPort)], {
    cwd: process.env.SNIPE_APP_ROOT || process.cwd(),
    env: { ...process.env, SUPABASE_URL: `http://127.0.0.1:${servicePort}`, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${servicePort}`, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, SUPABASE_ANON_KEY: 'isolated-test-anon-key', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'isolated-test-anon-key', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
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

it('shows the open conversation header on a phone without horizontal overflow', async () => {
  // SRS-510.1/#622: at 390 × 844 the open conversation's own title must stay visible and readable next to the
  // Snipe toggle, for a member (Members only) and for the owner (Invite and Members). Before the fix the title
  // was 0 px wide and the header 374 px tall (tmp/tools/snipe-transport-evidence/mobile-header-before-fix.png).
  for (const { student, role, actions } of [
    { student: 2, role: 'member', actions: ['Members'] },
    { student: 1, role: 'owner', actions: ['Invite', 'Members'] },
  ]) {
    const phonePage = pages[`mobileHeader-${role}`] = await signIn(student, phone);
    await phonePage.goto(`${base}/messages/${group}`);
    const open = phonePage.getByRole('region', { name: 'Conversation', exact: true });
    await open.waitFor();
    const toggle = open.getByRole('button', { name: /^Snipe/ });
    await toggle.waitFor();
    // The group's actions only appear once its details have loaded (the owner's Invite too).
    for (const action of actions) await open.getByRole('button', { name: action, exact: true }).waitFor();
    // Actual geometry of the header and its parts, recorded before any visibility assertion.
    const geometry = await phonePage.evaluate((actions: string[]) => {
      const size = (el: Element | null) => {
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width * 100) / 100, height: Math.round(rect.height * 100) / 100 };
      };
      const region = document.querySelector('section[aria-label="Conversation"]');
      const header = region?.querySelector('header') || null;
      const title = header?.querySelector('h2') || null;
      const buttons = [...(header?.querySelectorAll('button') ?? [])];
      return {
        document: { scrollWidth: document.documentElement.scrollWidth, innerWidth },
        region: size(region), header: size(header), title: size(title), titleParent: size(title?.parentElement || null),
        back: size(header?.querySelector('a[aria-label="Back to Messages"]') || null),
        actions: Object.fromEntries(actions.map(action => [action, size(buttons.find(b => b.textContent?.trim() === action) || null)])),
      };
    }, actions);
    console.log(`mobile-conversation-header-${role}`, JSON.stringify(geometry));
    await screenshot(phonePage, `mobile-conversation-header-${role}-after-fix`);
    const heading = open.getByRole('heading', { level: 2, name: /Group chat/ });
    expect(await heading.isVisible()).toBe(true);
    // A real line of text, not one letter per line.
    const titleBox = await heading.boundingBox();
    expect(titleBox?.width ?? 0).toBeGreaterThan(40);
    expect(titleBox?.height ?? Infinity).toBeLessThan(120);
    const headerBox = await open.locator('header').first().boundingBox();
    expect(headerBox?.height ?? Infinity).toBeLessThan(260);
    for (const action of actions) {
      const button = open.getByRole('button', { name: action, exact: true });
      expect(await button.isVisible()).toBe(true);
      const box = await button.boundingBox();
      expect((box?.x ?? Infinity) + (box?.width ?? 0)).toBeLessThanOrEqual(phone.width);
    }
    expect(await toggle.isVisible()).toBe(true);
    expect(await phonePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await phonePage.context().close();
  }
});

it('uploads, reviews, approves, persists, withdraws and then blocks the photo', async () => {
  // A real JPEG with embedded metadata; the stored copy must be re-encoded without it.
  const photo = await sharp({ create: { width: 900, height: 600, channels: 3, background: '#000000', noise: { type: 'gaussian', mean: 120, sigma: 50 } } })
    .withExif({ IFD0: { Copyright: 'SocialU acceptance owner' } }).jpeg().toBuffer();

  const photographer = pages.photographer = await openSnipes(await signIn(1));
  await balance(photographer).getByText('0 points', { exact: true }).waitFor();
  await photographer.getByRole('button', { name: 'New Snipe' }).click();
  // SRS-528.2: reward, sharing, expiry and cooldown rules are shown before submission.
  const rules = photographer.getByRole('group', { name: 'Snipe rules' });
  await rules.getByText('You earn 25 points for each tagged friend who answers Yes to “Is this you?”', { exact: false }).waitFor();
  await rules.getByText('Every tagged friend must approve sharing', { exact: false }).waitFor();
  await rules.getByText('Requests close after 24 hours', { exact: false }).waitFor();
  // Only current friends who are in this conversation are offered; the untagged member 4 is not a friend.
  expect(await photographer.getByRole('checkbox').count()).toBe(2);
  await photographer.getByLabel(/^Photo/).setInputFiles({ name: 'snipe.jpg', mimeType: 'image/jpeg', buffer: photo });
  await photographer.getByRole('img', { name: 'Selected Snipe photo preview' }).waitFor();
  await photographer.getByRole('checkbox', { name: /Dorm Student 2/ }).check();
  await photographer.getByText('Up to 25 points if published and your friend confirms it’s them.').waitFor();
  await screenshot(photographer, 'desktop-photographer-rules');
  await photographer.getByRole('button', { name: 'Submit Snipe' }).click();
  await photographer.getByText('Snipe submitted.', { exact: false }).waitFor();
  await card(photographer).getByText('Pending', { exact: true }).waitFor();
  expect(await photoBlob(photographer)).toMatch(/^blob:/);
  await screenshot(photographer, 'desktop-photographer-pending');

  const [pending] = await snipeRows();
  expect(pending.status).toBe('pending');
  const stored = [...objects.entries()].filter(([key]) => key.startsWith(`${SNIPE_BUCKET}/snipe/${testUid(1)}/`));
  expect(stored).toHaveLength(1);
  expect((await sharp(stored[0][1].bytes).metadata()).exif).toBeUndefined();
  // The original went to staging through the upload URL and was deleted once the re-encoded copy was accepted.
  expect(storage.log.signedUploads.map(({ bytes, type, status }) => ({ bytes, type, status }))).toEqual([{ bytes: photo.length, type: 'image/jpeg', status: 200 }]);
  expect([...objects.keys()].filter((key) => key.startsWith(`${SNIPE_STAGING_BUCKET}/`))).toEqual([]);
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
  // SRS-525.1: publication credited the photographer once, in the shared ledger; the tagged friend gets nothing.
  expect(await ledgerRows()).toEqual([{ student: 1, points: 25 }]);
  expect(await card(tagged).getByRole('group', { name: 'Snipe reward' }).count()).toBe(0);
  await balance(tagged).getByText('0 points', { exact: true }).waitFor();

  // SRS-512.10/512.11, 525.6, 521.1: the outcome and the frozen reward persist for the photographer after a
  // refresh and in a new session on another device, for the tagged friend in a fresh session, and for members.
  await photographer.reload(); await openSnipes(photographer);
  await card(photographer).getByText('Approved', { exact: true }).waitFor();
  expect(await photoBlob(photographer)).toMatch(/^blob:/);
  const reward = card(photographer).getByRole('group', { name: 'Snipe reward' });
  await reward.getByText('Reward: 25 points', { exact: true }).waitFor();
  await reward.getByText('1 verified friend × 25 points per friend = 25 points', { exact: true }).waitFor();
  await balance(photographer).getByText('25 points', { exact: true }).waitFor();
  await screenshot(photographer, 'desktop-photographer-reward');
  const photographerPhone = pages.photographerPhone = await openSnipes(await signIn(1, phone));
  await card(photographerPhone).getByRole('group', { name: 'Snipe reward' }).getByText('Reward: 25 points', { exact: true }).waitFor();
  await balance(photographerPhone).getByText('25 points', { exact: true }).waitFor();
  expect(await photographerPhone.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await screenshot(photographerPhone, 'mobile-photographer-reward-new-session');
  await photographerPhone.context().close();
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
  // SRS-524.4, 527.7: removal keeps the awarded points and the reward explanation, without the photo.
  await card(photographer).getByRole('group', { name: 'Snipe reward' }).getByText('Removing a Snipe doesn’t take its points back.', { exact: false }).waitFor();
  await balance(photographer).getByText('25 points', { exact: true }).waitFor();
  expect(await ledgerRows()).toEqual([{ student: 1, points: 25 }]);
  await screenshot(photographer, 'desktop-photographer-removed');
  // SRS-513.1: the pair cooldown remains after removal; the friend is offered again only after 24 hours.
  await photographer.getByRole('button', { name: 'New Snipe' }).click();
  expect(await photographer.getByRole('checkbox', { name: /Dorm Student 2/ }).isDisabled()).toBe(true);

  expect((await snipeRows()).map(row => row.status)).toEqual(['removed']);
  transportClean();
  for (const page of [photographer, returning, member]) await page.context().close();
});

it('returns the saved Snipe when the response is lost after commit, without a second request', async () => {
  const before = (await snipeRows()).length;
  const photographer = pages.photographer = await openSnipes(await signIn(1));
  // SRS-524.1: the earlier reward is still in the shared balance in yet another session.
  await balance(photographer).getByText('25 points', { exact: true }).waitFor();
  await photographer.getByRole('button', { name: 'New Snipe' }).click();
  await photographer.getByLabel(/^Photo/).setInputFiles({ name: 'retry.png', mimeType: 'image/png',
    buffer: await sharp({ create: { width: 320, height: 240, channels: 3, background: '#c0ddcb' } }).png().toBuffer() });
  await photographer.getByRole('checkbox', { name: /Dorm Student 3/ }).check();
  dropNextAccept = true;
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
  // A pending (unpublished) retry earns nothing.
  expect(await ledgerRows()).toEqual([{ student: 1, points: 25 }]);
  transportClean();
  for (const page of [photographer, tagged]) await page.context().close();
});

it('uploads a full-size photo larger than the 4.5 MB function limit directly to private storage', async () => {
  // > 4.5 MB (the hosted function request cap) and within the approved 10,000,000 bytes and 4096 × 4096 pixels.
  const photo = await noisePng(1800, 1200);
  expect(photo.length).toBeGreaterThan(4_500_000);
  expect(photo.length).toBeLessThanOrEqual(10_000_000);
  // Students 2 and 3 are in their pair cooldown from the scenarios above; student 4 becomes a friend now.
  await befriend(db, 1, 4);
  const before = (await snipeRows()).length;
  const uploadsBefore = storage.log.signedUploads.length;

  const photographer = pages.photographer = await openSnipes(await signIn(1));
  const appRequests = recordAppRequests(photographer);
  await photographer.getByRole('button', { name: 'New Snipe' }).click();
  await photographer.getByLabel(/^Photo/).setInputFiles({ name: 'full-size.png', mimeType: 'image/png', buffer: photo });
  await photographer.getByRole('img', { name: 'Selected Snipe photo preview' }).waitFor();
  await photographer.getByRole('checkbox', { name: /Dorm Student 4/ }).check();
  await photographer.getByRole('button', { name: 'Submit Snipe' }).click();
  await photographer.getByText('Snipe submitted.', { exact: false }).waitFor();
  await card(photographer).getByText('Pending', { exact: true }).waitFor();
  await screenshot(photographer, 'desktop-photographer-large-photo');

  // The app only received small JSON: begin and finalize. No multipart and no image body ever reached it.
  const writes = appRequests.filter((request) => request.method !== 'GET' && request.path.includes('/snipes'));
  expect(writes.map((request) => request.path)).toEqual([`/api/conversations/${group}/snipes/uploads`, `/api/conversations/${group}/snipes/uploads/finalize`]);
  for (const request of writes) {
    expect(request.type).toMatch(/^application\/json/);
    expect(request.bytes).toBeLessThan(1024);
  }
  expect(appRequests.some((request) => /multipart|image\//.test(request.type) || request.bytes > 1024)).toBe(false);
  // The original crossed the network once, straight to the staging bucket, through its upload-only URL.
  expect(storage.log.signedUploads.slice(uploadsBefore)).toEqual([{ path: expect.stringMatching(new RegExp(`^${SNIPE_STAGING_BUCKET}/stage/${testUid(1)}/[0-9a-f-]{36}\\.png$`)),
    bytes: photo.length, type: 'image/png', status: 200 }]);
  const stagedPath = storage.log.signedUploads[uploadsBefore].path;
  expect(objects.has(stagedPath)).toBe(false);

  const rows = await snipeRows();
  expect(rows).toHaveLength(before + 1);
  const newest = rows[rows.length - 1];
  expect(newest.status).toBe('pending');
  const committed = await committedObject(newest.id);
  expect(committed.key).toMatch(new RegExp(`^snipe/${testUid(1)}/[0-9a-f-]{36}/[0-9a-f]{64}/[0-9a-f-]{36}\\.png$`));
  expect(committed.object!.bytes.length).toBeGreaterThan(4_500_000);
  expect(await sharp(committed.object!.bytes).metadata()).toMatchObject({ format: 'png', width: 1800, height: 1200 });

  // The tagged friend's private read is a stream from the authorized route: no Content-Length, no caching.
  const tagged = pages.tagged = await openSnipes(await signIn(4));
  expect(await photoBlob(tagged)).toMatch(/^blob:/);
  const photoPath = `/api/conversations/${group}/snipes/${newest.id}/photo`;
  const read = await tagged.evaluate(async (path: string) => {
    const response = await fetch(path, { cache: 'no-store', headers: { Authorization: `Bearer ${localStorage.getItem('access_token') || sessionStorage.getItem('access_token') || ''}` } });
    const bytes = (await response.arrayBuffer()).byteLength;
    return { status: response.status, type: response.headers.get('content-type'), length: response.headers.get('content-length'),
      cache: response.headers.get('cache-control'), nosniff: response.headers.get('x-content-type-options'), corp: response.headers.get('cross-origin-resource-policy'), bytes };
  }, photoPath);
  expect(read).toEqual({ status: 200, type: 'image/png', length: null, cache: 'private, no-store, max-age=0', nosniff: 'nosniff', corp: 'same-origin', bytes: committed.object!.bytes.length });
  await screenshot(tagged, 'desktop-tagged-large-photo');
  // A member who was not tagged still cannot read the pending photo.
  const member = pages.member = await openSnipes(await signIn(2));
  expect((await api(member, photoPath)).status).toBe(404);
  transportClean();
  for (const page of [photographer, tagged, member]) await page.context().close();
});
