import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import sharp from 'sharp';
import { befriend, friendship, testUid } from '../../__tests__/helpers/dormspace-db';
import { createGroup, createSnipeDatabase } from '../../__tests__/helpers/snipe-db';

// SRS-510 to 514 and 525 acceptance: the real Next UI and API run against the real schema and functions in
// PGlite. Only the provider's Auth, Storage and PostgREST HTTP transport is replaced, on loopback; no hosted
// accounts, keys or data. Students: 1 photographer and group owner, 2 and 3 tagged friends (also friends of
// each other, with a direct message), 4 an untagged group member.
let db: PGlite, service: Server, next: ChildProcess, browser: any;
let base = '', nextLog = '', group = '', dm = '', dropNextCreate = false;
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
    if (/snipe\/00000000-0000-4000-8000-/.test(text) || text.includes('storage_key')) leakedKeys.push(response.url());
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
const cardBy = (page: any, student: number) => page.getByRole('article', { name: `Snipe by Dorm Student ${student}` }).first();
const card = (page: any) => cardBy(page, 1);
// SRS-514.10: the manager-only report queue and one report in it.
const queue = (page: any) => page.getByRole('region', { name: 'Reports to review' });
const queued = (page: any) => queue(page).getByRole('group', { name: /^Report #\d+$/ });
const noOverflow = (page: any) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
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
const reportRows = async () => (await db.query<any>('SELECT reporter_id::int AS reporter, reason, status FROM socialu.snipe_reports ORDER BY report_id')).rows;
const resolvedBy = async () => (await db.query<any>('SELECT status, resolved_by::int AS resolver FROM socialu.snipe_reports ORDER BY report_id')).rows;
async function photoBlobBy(page: any, student: number) {
  const image = cardBy(page, student).getByRole('img', { name: `Snipe by Dorm Student ${student}` });
  await image.waitFor();
  await page.waitForFunction((el: HTMLImageElement) => el.complete && el.naturalWidth > 0, await image.elementHandle());
  return image.getAttribute('src') as Promise<string>;
}
// Submits one Snipe through the real composer (photo upload, friend selection).
async function submitSnipe(page: any, friend: number, color: string) {
  await page.getByRole('button', { name: 'New Snipe' }).click();
  await page.getByLabel(/^Photo/).setInputFiles({ name: 'snipe.png', mimeType: 'image/png',
    buffer: await sharp({ create: { width: 480, height: 360, channels: 3, background: color } }).png().toBuffer() });
  await page.getByRole('img', { name: 'Selected Snipe photo preview' }).waitFor();
  await page.getByRole('checkbox', { name: new RegExp(`Dorm Student ${friend}`) }).check();
  await page.getByRole('button', { name: 'Submit Snipe' }).click();
  await page.getByText('Snipe submitted.', { exact: false }).waitFor();
  return (await snipeRows()).at(-1)!.id as string;
}
// The real report form, as a member uses it.
async function reportSnipe(page: any, student: number, reason: string) {
  await cardBy(page, student).getByRole('button', { name: 'Report Snipe' }).click();
  const form = cardBy(page, student).getByRole('form', { name: 'Report this Snipe' });
  await form.getByLabel('Why are you reporting this Snipe?').fill(reason);
  await form.getByRole('button', { name: 'Send report' }).click();
  await cardBy(page, student).getByRole('status', { name: 'Report receipt' }).getByText('Report received. Thank you.').waitFor();
}
const receipt = (page: any) => card(page).getByRole('status', { name: 'Report receipt' });

beforeAll(async () => {
  mkdirSync(artifacts, { recursive: true });
  db = await createSnipeDatabase(4);
  await befriend(db, 1, 2); await befriend(db, 1, 3); await befriend(db, 2, 3);
  group = await createGroup(db, 1, [2, 3, 4]);
  dm = (await friendship(db, 2, 'message', 3)).conversation_id;
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
  // Webpack, as the production build already supports: Turbopack infers its root from lockfiles above this
  // checkout and watches sibling checkouts too, so edits elsewhere recompile and reload pages without end.
  next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(nextPort)], {
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

  // SRS-514.8, 514.9, 514.11: the untagged member reports the published Snipe with a required reason (keyboard),
  // sees a receipt only once it is stored, and the photo stays published for everyone while it waits for review.
  // Any current member may report it, the photographer included, who also keeps the separate Remove action.
  expect(await card(photographer).getByRole('button', { name: 'Report Snipe' }).count()).toBe(1);
  expect(await card(photographer).getByRole('button', { name: 'Remove Snipe' }).count()).toBe(1);
  await card(member).getByRole('button', { name: 'Report Snipe' }).press('Enter');
  const reportForm = card(member).getByRole('form', { name: 'Report this Snipe' });
  const reasonBox = reportForm.getByLabel('Why are you reporting this Snipe?');
  await expect.poll(() => reasonBox.evaluate((el: Element) => el === document.activeElement)).toBe(true);
  // Escape cancels without sending anything and returns focus to Report.
  await member.keyboard.press('Escape');
  const reportButton = card(member).getByRole('button', { name: 'Report Snipe' });
  await expect.poll(() => reportButton.evaluate((el: Element) => el === document.activeElement)).toBe(true);
  await reportButton.press('Enter');
  const send = reportForm.getByRole('button', { name: 'Send report' });
  expect(await send.isDisabled()).toBe(true);
  await reasonBox.fill('   ');
  expect(await send.isDisabled()).toBe(true);
  expect(await reportRows()).toEqual([]);
  await reasonBox.fill('  Posted without asking me.  ');
  await send.click();
  await receipt(member).getByText('Report received. Thank you.').waitFor();
  await receipt(member).getByText('Your reason: Posted without asking me.').waitFor();
  expect(await reportRows()).toEqual([{ reporter: 4, reason: 'Posted without asking me.', status: 'unresolved' }]);
  expect(await card(member).getByRole('button', { name: 'Report Snipe' }).count()).toBe(0);
  await card(member).getByText('Approved', { exact: true }).waitFor();
  expect(await photoBlob(member)).toMatch(/^blob:/);
  await screenshot(member, 'desktop-member-report-receipt');
  // The receipt comes from the stored report: it survives a reload and a new phone session.
  await member.reload(); await openSnipes(member);
  await receipt(member).getByText('Your reason: Posted without asking me.').waitFor();
  expect(await photoBlob(member)).toMatch(/^blob:/);
  const memberPhone = pages.memberPhone = await openSnipes(await signIn(4, phone));
  await receipt(memberPhone).getByText('Waiting for review by a group administrator', { exact: false }).waitFor();
  expect(await memberPhone.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await screenshot(memberPhone, 'mobile-member-report-receipt');
  await memberPhone.context().close();
  // A repeated report (lost response, double submit) returns the same stored report; nothing is duplicated.
  const reportPath = `/api/conversations/${group}/snipes/${pending.id}/report`;
  const again = await api(member, reportPath, 'POST', { reason: 'Posted without asking me.' });
  expect([again.status, JSON.parse(again.text).created]).toEqual([200, false]);
  const changed = await api(member, reportPath, 'POST', { reason: 'Something else' });
  expect([changed.status, JSON.parse(changed.text).code]).toEqual([409, 'SNIPE_ALREADY_REPORTED']);
  expect(await reportRows()).toHaveLength(1);
  // Reporting changed nothing for the photographer: still Approved, same photo, same reward, no report details.
  await photographer.reload(); await openSnipes(photographer);
  await card(photographer).getByText('Approved', { exact: true }).waitFor();
  expect(await photoBlob(photographer)).toMatch(/^blob:/);
  expect(await receipt(photographer).count()).toBe(0);
  expect(await ledgerRows()).toEqual([{ student: 1, points: 25 }]);

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
  // The member's receipt stays on the removed Snipe; Report is no longer offered.
  await receipt(member).getByText('Your reason: Posted without asking me.').waitFor();
  expect(await card(member).getByRole('button', { name: 'Report Snipe' }).count()).toBe(0);
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
  expect(await reportRows()).toEqual([{ reporter: 4, reason: 'Posted without asking me.', status: 'unresolved' }]);
  expect(signedSnipeKeys).toEqual([]);
  expect(otherBucketRequests).toEqual([]);
  expect(leakedKeys).toEqual([]);
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
  // A pending (unpublished) retry earns nothing.
  expect(await ledgerRows()).toEqual([{ student: 1, points: 25 }]);
  expect(otherBucketRequests).toEqual([]);
  expect(leakedKeys).toEqual([]);
  for (const page of [photographer, tagged]) await page.context().close();
});

it('lets the group owner review reports: dismiss, a fresh report, then remove with confirmation', async () => {
  // SRS-514.10: the owner's queue already holds member 4's report from the first test, on a Snipe the tagged
  // friend withdrew since; it shows the removed state and can be closed without another confirmation.
  const owner = pages.owner = await openSnipes(await signIn(1));
  await queue(owner).waitFor();
  await expect.poll(() => queued(owner).count()).toBe(1);
  await queued(owner).getByText('Reason: Posted without asking me.').waitFor();
  await queued(owner).getByText('Snipe removed', { exact: true }).waitFor();
  expect(await queued(owner).getByRole('img').count()).toBe(0);
  await screenshot(owner, 'desktop-owner-queue-removed-snipe');
  await queued(owner).getByRole('button', { name: 'Resolve as removed' }).click();
  await queue(owner).getByText(/resolved: Snipe removed\./).waitFor();
  await queue(owner).getByText('No reports are waiting for review in this group.').waitFor();
  expect(await resolvedBy()).toEqual([{ status: 'removed', resolver: 1 }]);

  // A new published Snipe: photographer 2 tags 3 through the composer; 3 approves both questions.
  const photographer = pages.photographer = await openSnipes(await signIn(2));
  const id = await submitSnipe(photographer, 3, '#9fc5e8');
  const tagged = pages.tagged = await openSnipes(await signIn(3));
  const answered = await api(tagged, `/api/conversations/${group}/snipes/${id}`, 'PATCH', { action: 'respond', identity: true, sharing: true });
  expect([answered.status, JSON.parse(answered.text).snipe.status]).toEqual([200, 'approved']);
  expect(await ledgerRows()).toEqual([{ student: 1, points: 25 }, { student: 2, points: 25 }]);
  const photoPath = `/api/conversations/${group}/snipes/${id}/photo`;

  // Ordinary members and tagged friends never get the queue, a decision or an admin removal.
  const member = pages.member = await openSnipes(await signIn(4));
  expect(await photoBlobBy(member, 2)).toMatch(/^blob:/);
  expect(await cardBy(member, 2).getByRole('button', { name: /Remove|Withdraw/ }).count()).toBe(0);
  for (const page of [member, tagged]) {
    expect(await queue(page).count()).toBe(0);
    expect((await api(page, `/api/conversations/${group}/snipes/reports`)).status).toBe(403);
    expect((await api(page, `/api/conversations/${group}/snipes/${id}/admin-removal`, 'POST')).status).toBe(403);
  }
  await reportSnipe(member, 2, 'Taken at a private party.');
  const memberDecision = await api(member, `/api/conversations/${group}/snipes/reports/2`, 'PATCH', { decision: 'removed' });
  expect([memberDecision.status, JSON.parse(memberDecision.text).code]).toEqual([403, 'SNIPE_MODERATION_NOT_ALLOWED']);

  // SRS-514.10, 514.12: the owner sees the reason and the photo, and dismisses. The Snipe stays published.
  // Refreshing the Snipe list refreshes the queue with it.
  await owner.getByRole('region', { name: 'Snipe', exact: true }).getByRole('button', { name: 'Refresh', exact: true }).click();
  await queued(owner).getByText('Reason: Taken at a private party.').waitFor();
  await queued(owner).getByText('Reported by Dorm Student 4', { exact: false }).waitFor();
  await queued(owner).getByRole('img', { name: 'Reported Snipe by Dorm Student 2' }).waitFor();
  // The owner can also remove it directly from its card (SRS-514.1); here the report is decided instead.
  await cardBy(owner, 2).getByRole('button', { name: 'Remove as group admin' }).waitFor();
  await screenshot(owner, 'desktop-owner-report-queue');
  await queued(owner).getByRole('button', { name: 'Dismiss report' }).click();
  await queue(owner).getByText(/dismissed\. The Snipe stays visible\./).waitFor();
  await queue(owner).getByText('No reports are waiting for review in this group.').waitFor();
  expect((await resolvedBy()).at(-1)).toEqual({ status: 'dismissed', resolver: 1 });
  for (const page of [owner, member, tagged, photographer]) expect((await api(page, photoPath)).status).toBe(200);
  // The reporter sees the decision after a refresh, the photo is still shown, and they can report again.
  await member.reload(); await openSnipes(member);
  await cardBy(member, 2).getByRole('status', { name: 'Report receipt' }).getByText('Reviewed: dismissed', { exact: false }).waitFor();
  expect(await photoBlobBy(member, 2)).toMatch(/^blob:/);
  await reportSnipe(member, 2, 'Still unwanted after review.');

  // SRS-514.13 on a phone: the owner removes through the queue, after confirming.
  const ownerPhone = pages.ownerPhone = await openSnipes(await signIn(1, phone));
  await queued(ownerPhone).getByText('Reason: Still unwanted after review.').waitFor();
  await queued(ownerPhone).getByRole('button', { name: 'Remove Snipe' }).click();
  const confirm = queued(ownerPhone).getByRole('group', { name: 'Confirm removal' });
  await confirm.getByText('Points already awarded are kept.', { exact: false }).waitFor();
  expect(await noOverflow(ownerPhone)).toBe(true);
  await screenshot(ownerPhone, 'mobile-owner-confirm-removal');
  // Keep it backs out without changing anything.
  await confirm.getByRole('button', { name: 'Keep it' }).click();
  expect((await snipeRows()).at(-1)!.status).toBe('approved');
  await queued(ownerPhone).getByRole('button', { name: 'Remove Snipe' }).click();
  await queued(ownerPhone).getByRole('group', { name: 'Confirm removal' }).getByRole('button', { name: 'Confirm removal' }).click();
  await queue(ownerPhone).getByText(/resolved: Snipe removed\./).waitFor();
  await queue(ownerPhone).getByText('No reports are waiting for review in this group.').waitFor();
  // The refreshed list shows the placeholder; no photo (or blob) stays on the owner's card.
  await cardBy(ownerPhone, 2).getByText('Snipe removed', { exact: true }).waitFor();
  expect(await cardBy(ownerPhone, 2).getByRole('img').count()).toBe(0);
  expect(await noOverflow(ownerPhone)).toBe(true);
  await screenshot(ownerPhone, 'mobile-owner-report-removed');

  // SRS-514.6: the photo is no longer served to anyone; SRS-514.7: members see the placeholder.
  for (const page of [owner, ownerPhone, member, tagged, photographer]) expect((await api(page, photoPath)).status).toBe(404);
  expect((await snipeRows()).at(-1)!.status).toBe('removed');
  expect((await resolvedBy()).at(-1)).toEqual({ status: 'removed', resolver: 1 });
  await member.reload(); await openSnipes(member);
  await cardBy(member, 2).getByText('Snipe removed', { exact: true }).waitFor();
  await cardBy(member, 2).getByRole('status', { name: 'Report receipt' }).getByText('Reviewed: Snipe removed', { exact: false }).waitFor();
  expect(await cardBy(member, 2).getByRole('button', { name: 'Report Snipe' }).count()).toBe(0);
  await screenshot(member, 'desktop-member-report-removed');
  // SRS-524.4: the photographer keeps the points; repeating the decision changes nothing.
  await photographer.reload(); await openSnipes(photographer);
  await cardBy(photographer, 2).getByText('Reason: Removed by a group administrator').waitFor();
  await cardBy(photographer, 2).getByRole('group', { name: 'Snipe reward' }).getByText('Removing a Snipe doesn’t take its points back.', { exact: false }).waitFor();
  await balance(photographer).getByText('25 points', { exact: true }).waitFor();
  const repeat = await api(owner, `/api/conversations/${group}/snipes/${id}/admin-removal`, 'POST');
  expect([repeat.status, JSON.parse(repeat.text).snipe.status]).toEqual([200, 'removed']);
  expect(await ledgerRows()).toEqual([{ student: 1, points: 25 }, { student: 2, points: 25 }]);
  expect(signedSnipeKeys).toEqual([]);
  expect(leakedKeys).toEqual([]);
  for (const page of [owner, ownerPhone, member, tagged, photographer]) await page.context().close();
});

it('keeps direct-message Snipes free of report and administrator controls', async () => {
  // SRS-510.1, 514.3, 514.14 in a real direct message: 3 photographs 2; 2 answers on a phone.
  const photographer = pages.photographer = await openSnipes(await signIn(3), dm, /Dorm Student 2|Conversation/);
  const id = await submitSnipe(photographer, 2, '#f6b26b');
  const tagged = pages.tagged = await openSnipes(await signIn(2, phone), dm, /Dorm Student 3|Conversation/);
  // The ordinary message layout stays in place under the panel.
  await tagged.getByText(/Send a message to start the conversation|No messages to show yet/).waitFor();
  for (const question of ['Is this you?', 'Do you approve sharing this photo in this conversation?']) {
    const fieldset = cardBy(tagged, 3).getByRole('group', { name: question });
    await fieldset.getByRole('radio', { name: 'Yes' }).check();
    await fieldset.getByRole('button', { name: 'Save answer' }).click();
  }
  await cardBy(tagged, 3).getByText('Approved', { exact: true }).waitFor();
  expect(await photoBlobBy(tagged, 3)).toMatch(/^blob:/);
  expect(await ledgerRows()).toEqual([{ student: 1, points: 25 }, { student: 2, points: 25 }, { student: 3, points: 25 }]);
  // No report, queue or administrator controls for either participant, and the API refuses them too.
  for (const page of [tagged, photographer]) {
    if (page === photographer) { await page.reload(); await openSnipes(page, dm, /Dorm Student 2|Conversation/); }
    expect(await queue(page).count()).toBe(0);
    expect(await cardBy(page, 3).getByRole('button', { name: /Report|group admin/ }).count()).toBe(0);
    for (const [path, method, body] of [['/reports', 'GET', undefined], [`/${id}/report`, 'POST', { reason: 'spam' }], [`/${id}/admin-removal`, 'POST', undefined]] as const) {
      const res = await api(page, `/api/conversations/${dm}/snipes${path}`, method, body);
      expect([res.status, JSON.parse(res.text).code], `${path}`).toEqual([403, 'SNIPE_REPORT_NOT_ALLOWED']);
    }
  }
  expect(await noOverflow(tagged)).toBe(true);
  await screenshot(tagged, 'mobile-dm-tagged-approved');
  // SRS-514.3: the photographer removes it with confirmation; the photo stops for both, points are kept.
  await cardBy(photographer, 3).getByRole('button', { name: 'Remove Snipe' }).click();
  await cardBy(photographer, 3).getByRole('group', { name: 'Confirm' }).getByRole('button', { name: 'Confirm' }).click();
  await cardBy(photographer, 3).getByText('Snipe removed', { exact: true }).waitFor();
  await cardBy(photographer, 3).getByRole('group', { name: 'Snipe reward' }).getByText('Removing a Snipe doesn’t take its points back.', { exact: false }).waitFor();
  for (const page of [photographer, tagged]) expect((await api(page, `/api/conversations/${dm}/snipes/${id}/photo`)).status).toBe(404);
  await screenshot(photographer, 'desktop-dm-photographer-removed');
  expect(await ledgerRows()).toEqual([{ student: 1, points: 25 }, { student: 2, points: 25 }, { student: 3, points: 25 }]);
  expect(leakedKeys).toEqual([]);
  for (const page of [photographer, tagged]) await page.context().close();
});
