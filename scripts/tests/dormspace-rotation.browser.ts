import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { furnitureSprites, itemArt } from '../../components/dormspace/pixel-art';
import { placementSize, type Rotation } from '../../lib/dormspace-rules';
import { befriend, createDormDatabase, dormCall, friendship, testUid } from '../../__tests__/helpers/dormspace-db';

// The real Next UI and API run against real schema/functions in PGlite. Only the provider's
// Auth/Storage/PostgREST HTTP transport is replaced. This service binds to loopback and is never shipped.
let db: PGlite, service: Server, next: ChildProcess, browser: any, owner: any, visitor: any;
let base = '', nextLog = '', failSave = false, failReload = false, signingIn: any;
const sessions = new Map<string, any>();
const artifacts = process.env.DORMSPACE_EVIDENCE_DIR || 'tmp/dormspace-rotation';
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
  await db.exec(readFileSync('supabase/migrations/20261020021507_dormspace_rotation.sql', 'utf8'));
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

const rotations: Rotation[] = [0, 90, 180, 270];
const toSource = (art: {w: number; h: number; px: [number, number, number, number, string][]}) => 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${art.w}" height="${art.h}" viewBox="0 0 ${art.w} ${art.h}" shape-rendering="crispEdges">${art.px.map(([x,y,w,h,c]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`).join('')}</svg>`);

it('exports and visually checks all furniture views and every sitting/sleeping animation frame', async () => {
  const page = await browser.newPage({ viewport: { width: 800, height: 1000 } });
  const keys = Object.keys(itemArt).filter(key => key !== 'window');
  const cells: {key: string; rotation: Rotation; action: string; frame: number; w: number; h: number; source: string}[] = [];
  const previews = (actions: boolean) => keys.filter(key => !actions || furnitureSprites(key)!.action).map(key => rotations.map(rotation => {
    const sprites = furnitureSprites(key, rotation)!;
    const art = actions ? sprites.action!.frames[0] : sprites.idle;
    return `<div class="cell"><strong>${key.replace('dorm-','')} · ${rotation}°</strong><img src="${toSource(art)}" style="width:${art.w * 1.8}px;height:${art.h * 1.8}px"></div>`;
  }).join('')).join('');
  for (const actions of [false, true]) {
    await page.setContent(`<style>body{margin:0;background:#f6ecd2;font:14px system-ui}main{display:grid;grid-template-columns:repeat(4,190px);gap:4px;padding:8px}.cell{height:210px;background:#ead4a6;display:flex;align-items:center;flex-direction:column;justify-content:space-between;padding:8px;box-sizing:border-box}.cell img{image-rendering:pixelated;object-fit:contain}</style><main>${previews(actions)}</main>`);
    await page.locator('img').evaluateAll(async (images: HTMLImageElement[]) => { await Promise.all(images.map(image => image.decode())); });
    await page.screenshot({ path: `${artifacts}/${actions ? 'action-views' : 'furniture-views'}.png`, fullPage: true });
  }
  for (const key of keys) for (const rotation of rotations) {
    const sprites = furnitureSprites(key, rotation)!;
    cells.push({ key, rotation, action: 'idle', frame: 0, w: sprites.idle.w, h: sprites.idle.h, source: toSource(sprites.idle) });
    sprites.action?.frames.forEach((art, frame) => cells.push({ key, rotation, action: key === 'bed' ? 'sleeping' : 'sitting', frame, w: art.w, h: art.h, source: toSource(art) }));
  }
  const atlas = await page.evaluate(async (cells: any[]) => {
    const canvas = document.createElement('canvas'); canvas.width = 8 * 96; canvas.height = Math.ceil(cells.length / 8) * 112;
    const context = canvas.getContext('2d')!; context.imageSmoothingEnabled = false;
    const metadata = [];
    for (let index = 0; index < cells.length; index++) {
      const {source, ...cell} = cells[index], x = index % 8 * 96 + 12, y = Math.floor(index / 8) * 112 + 112 - cell.h;
      const image = new Image(); image.src = source; await image.decode(); context.drawImage(image, x, y);
      metadata.push({ ...cell, x, y });
    }
    return { png: canvas.toDataURL('image/png').split(',')[1], metadata };
  }, cells);
  writeFileSync(`${artifacts}/furniture-sprites.png`, Buffer.from(atlas.png, 'base64'));
  writeFileSync(`${artifacts}/furniture-sprites.json`, JSON.stringify({ image: 'furniture-sprites.png', cellWidth: 96, cellHeight: 112, sprites: atlas.metadata }, null, 2));
  expect(cells).toHaveLength(76); // 44 furniture views, plus 32 action frames.
  await page.close();
});

it('rotates before and after placement, preserves a blocked turn, and saves a rotated move across sessions', async () => {
  owner = await signIn(3); await openOwn(owner); await decorate(owner);
  await owner.getByRole('button', { name: 'Bed', exact: true }).click();
  const rotate = owner.getByRole('button', { name: 'Rotate clockwise ↻', exact: true });
  await rotate.click();
  expect(await owner.getByRole('img', { name: 'Bed preview, left view', exact: true }).count()).toBe(1);
  let response = owner.waitForResponse((r: any) => r.url().endsWith('/api/dorm') && r.request().method() === 'PUT');
  await owner.getByLabel('Floor', { exact: true }).getByRole('button', { name: 'Place at column 2, row 2', exact: true }).click();
  expect((await response).status()).toBe(200); await saved(owner);
  const bed = owner.locator('[data-item-key="bed"]');
  expect(await bed.getAttribute('data-rotation')).toBe('90');
  const initial = (await api(owner, '/api/dorm')).data;
  const bedId = initial.catalog.find((item: any) => item.previewKey === 'bed').id;
  await owner.getByLabel('Placed furniture', { exact: true }).selectOption(bedId);
  for (const rotation of [180, 270, 0]) {
    response = owner.waitForResponse((r: any) => r.url().endsWith('/api/dorm') && r.request().method() === 'PUT');
    await owner.getByLabel('Dorm movement area', { exact: true }).focus(); await owner.keyboard.press('r');
    expect((await response).status()).toBe(200); await saved(owner);
    expect(await bed.getAttribute('data-rotation')).toBe(String(rotation));
  }
  response = owner.waitForResponse((r: any) => r.url().endsWith('/api/dorm') && r.request().method() === 'PUT');
  await owner.getByLabel('Floor', { exact: true }).getByRole('button', { name: 'Place at column 9, row 4', exact: true }).click();
  expect((await response).status()).toBe(200); await saved(owner);
  await owner.getByLabel('Placed furniture', { exact: true }).selectOption(bedId);
  const before = (await api(owner, '/api/dorm')).data;
  await rotate.click();
  await owner.getByRole('alert').filter({ hasText: 'outside the room' }).waitFor();
  expect(await bed.getAttribute('data-rotation')).toBe('0');
  expect((await api(owner, '/api/dorm')).data).toEqual(before);
  response = owner.waitForResponse((r: any) => r.url().endsWith('/api/dorm') && r.request().method() === 'PUT');
  await owner.getByLabel('Floor', { exact: true }).getByRole('button', { name: 'Place at column 2, row 2', exact: true }).click();
  expect((await response).status()).toBe(200); await saved(owner);
  const stored = (await api(owner, '/api/dorm')).data;
  expect(stored.placements[0].rotation).toBe(90);
  await owner.getByRole('button', { name: 'Window', exact: true }).click();
  expect(await rotate.count()).toBe(0);
  await owner.context().close();
  owner = await signIn(3); await openOwn(owner);
  expect((await api(owner, '/api/dorm')).data.placements).toEqual(stored.placements);
  expect(await owner.locator('[data-item-key="bed"]').getAttribute('data-rotation')).toBe('90');
  await owner.getByRole('button', { name: 'Sleep in Bed', exact: true }).click(); await owner.keyboard.press('e');
  await decorate(owner); await owner.getByLabel('Placed furniture', { exact: true }).selectOption(bedId);
  response = owner.waitForResponse((r: any) => r.url().endsWith('/api/dorm') && r.request().method() === 'PUT');
  await owner.getByRole('button', { name: 'Rotate clockwise ↻', exact: true }).click();
  expect((await response).status()).toBe(200); await saved(owner);
  await owner.getByRole('button', { name: 'Done decorating', exact: true }).click();
  await owner.getByLabel('Dorm movement area', { exact: true }).focus(); await owner.keyboard.press('e');
  expect(await owner.getByRole('img', { name: 'Sleeping in bed', exact: true }).getAttribute('data-facing')).toBe('180');
  await owner.keyboard.press('e');
  // Move the bed over the standing avatar. Decorating must leave a clear spot to keep walking.
  await decorate(owner); await owner.getByLabel('Placed furniture', { exact: true }).selectOption(bedId);
  response = owner.waitForResponse((r: any) => r.url().endsWith('/api/dorm') && r.request().method() === 'PUT');
  await owner.getByLabel('Floor', { exact: true }).getByRole('button', { name: 'Place at column 3, row 4', exact: true }).click();
  expect((await response).status()).toBe(200); await saved(owner);
  const relocated = await owner.locator('[data-dorm-avatar]').evaluate((element: HTMLElement) => {
    const box = element.getBoundingClientRect(), area = element.parentElement!.getBoundingClientRect();
    return { x: Math.round((box.x + box.width / 2 - area.x) / box.width - 0.5), y: Math.round((box.y + box.height * 0.9 - area.y) / box.width - 0.9) };
  });
  expect(relocated.x >= 2 && relocated.x < 4 && relocated.y >= 3 && relocated.y < 6).toBe(false);
  await owner.context().close();
});

it('sleeps and sits in every orientation with correct action sprites, nighttime and safe exits', async () => {
  owner = await signIn(3);
  for (const rotation of rotations) {
    const room = (await api(owner, '/api/dorm')).data;
    const id = (key: string) => room.catalog.find((item: any) => item.previewKey === key).id;
    const placements = [{ itemId: id('bed'), x: 1, y: 1, rotation }, { itemId: id('chair'), x: 7, y: 1, rotation },
      { itemId: id('dorm-sofa'), x: 1, y: 4, rotation }, { itemId: id('dorm-armchair'), x: 7, y: 4, rotation },
      { itemId: id('window'), x: 5, y: 0, rotation: 0 }];
    expect((await api(owner, '/api/dorm', 'PUT', { ...room, placements })).status).toBe(200);
    await owner.goto(base + '/game-room/dormspace'); await owner.getByRole('heading', { name: /DormHall/ }).waitFor(); await openOwn(owner);
    const section = owner.getByRole('region', { name: 'My Dorm', exact: true });
    const savedBefore = (await api(owner, '/api/dorm')).data;
    for (const [action, kind, key, label] of [
      ['Sleep in Bed', 'sleeping', 'bed', 'Sleeping in bed'], ['Sit in Chair', 'sitting', 'chair', 'Avatar sitting in chair'],
      ['Sit on Sofa', 'sitting', 'dorm-sofa', 'Avatar sitting on sofa'], ['Sit in Armchair', 'sitting', 'dorm-armchair', 'Avatar sitting in armchair'],
    ]) {
      await owner.getByRole('button', { name: action, exact: true }).click();
      expect(await section.getAttribute('data-pose')).toBe(kind);
      const pose = owner.getByRole('img', { name: label, exact: true });
      expect(await pose.getAttribute('data-facing')).toBe(String(rotation));
      expect(await pose.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
      expect(await pose.locator('img').evaluate((image: HTMLElement) => getComputedStyle(image).animationName)).not.toBe('none');
      if (kind === 'sleeping') expect(await owner.getByRole('img', { name: 'Window at night with moon and stars', exact: true }).count()).toBe(1);
      await owner.getByLabel('Dorm movement area', { exact: true }).screenshot({ path: `${artifacts}/${key}-${rotation}-${kind}.png` });
      await owner.keyboard.press('e');
      expect(await section.getAttribute('data-pose')).toBe('standing');
      expect(await section.getAttribute('data-time')).toBe('day');
      await owner.keyboard.press('e');
      expect(await section.getAttribute('data-pose')).toBe(kind);
      await owner.keyboard.press('ArrowDown');
      expect(await section.getAttribute('data-pose')).toBe('standing');
      const point = await owner.locator('[data-dorm-avatar]').evaluate((element: HTMLElement) => {
        const box = element.getBoundingClientRect(), area = element.parentElement!.getBoundingClientRect();
        return { x: Math.round((box.x + box.width / 2 - area.x) / box.width - 0.5), y: Math.round((box.y + box.height * 0.9 - area.y) / box.width - 0.9) };
      });
      expect(point.y).toBeLessThan(7);
      expect(placements.filter(p => p.itemId !== id('window')).some(p => {
        const item = room.catalog.find((item: any) => item.id === p.itemId), size = placementSize(item, p.rotation as Rotation);
        return point.x >= p.x && point.x < p.x + size.width && point.y >= p.y && point.y < p.y + size.height;
      })).toBe(false);
    }
    await owner.getByRole('button', { name: 'Sit on Sofa', exact: true }).click();
    await owner.emulateMedia({ reducedMotion: 'reduce' });
    expect(await owner.getByRole('img', { name: 'Avatar sitting on sofa', exact: true }).locator('img').evaluate((image: HTMLElement) => getComputedStyle(image).animationName)).toBe('none');
    await owner.keyboard.press('e'); await owner.emulateMedia({ reducedMotion: 'no-preference' });
    expect((await api(owner, '/api/dorm')).data).toEqual(savedBefore);
  }
  await owner.context().close();
});

it('supports mobile visitors using rotated seats while keeping rotation owner-only', async () => {
  await befriend(db, 3, 2);
  const before = await dormCall(db, 3, 'open');
  visitor = await signIn(2, { width: 390, height: 844 });
  await visitor.getByRole('button', { name: "dorm3's dorm", exact: true }).click();
  await visitor.getByRole('heading', { name: "dorm3's Dorm", exact: true }).waitFor();
  expect(await visitor.getByRole('button', { name: 'Decorate', exact: true }).count()).toBe(0);
  expect(await visitor.getByRole('button', { name: 'Rotate clockwise ↻', exact: true }).count()).toBe(0);
  await visitor.getByRole('button', { name: 'Sit on Sofa', exact: true }).tap();
  expect(await visitor.getByRole('img', { name: 'Avatar sitting on sofa', exact: true }).getAttribute('data-facing')).toBe('270');
  await visitor.getByRole('button', { name: 'Interact: Stand up', exact: true }).tap();
  await visitor.getByRole('button', { name: 'Sleep in Bed', exact: true }).tap();
  await screenshot(visitor, 'rotation-mobile');
  expect(await visitor.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const after = await dormCall(db, 3, 'open');
  expect(after.version).toBe(before.version); expect(after.placements).toEqual(before.placements);
  await visitor.context().close();
});

it('keeps movement and resting animation off the layout path in a furnished rotated room', async () => {
  owner = await signIn(3);
  const room = (await api(owner, '/api/dorm')).data;
  const id = (key: string) => room.catalog.find((item: any) => item.previewKey === key).id;
  const placements = [
    ['bed', 0, 1, 90], ['dorm-sofa', 4, 1, 90], ['dorm-armchair', 8, 4, 270], ['chair', 7, 0, 180],
    ['dorm-bookshelf', 0, 0, 180], ['dorm-wardrobe', 9, 0, 90], ['dorm-coffee-table', 4, 4, 90],
    ['dorm-nightstand', 3, 3, 180], ['dorm-plant', 8, 3, 270], ['dorm-rug', 4, 1, 90], ['window', 5, 0, 0],
  ].map(([key,x,y,rotation]) => ({ itemId: id(key as string), x, y, rotation }));
  expect((await api(owner, '/api/dorm', 'PUT', { ...room, placements })).status).toBe(200);
  await openOwn(owner);
  const client = await owner.context().newCDPSession(owner);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await client.send('Performance.enable');
  const results = [];
  for (const action of ['walking', 'running', 'sleeping', 'sitting']) {
    if (action === 'running') await owner.getByRole('button', { name: 'Run', exact: true }).click();
    if (action === 'sleeping') await owner.getByRole('button', { name: 'Sleep in Bed', exact: true }).click();
    if (action === 'sitting') { await owner.keyboard.press('e'); await owner.getByRole('button', { name: 'Sit on Sofa', exact: true }).click(); }
    const movement = action === 'walking' || action === 'running';
    await owner.getByLabel('Dorm movement area', { exact: true }).focus();
    if (movement) await owner.keyboard.down(action === 'walking' ? 'ArrowRight' : 'ArrowLeft');
    const start = await client.send('Performance.getMetrics');
    const frames = await owner.evaluate(() => new Promise<number[]>((resolve) => {
      const samples: number[] = []; let previous = 0, first = 0;
      const tick = (now: number) => { if (!first) first = now; if (previous) samples.push(now - previous); previous = now;
        if (now - first >= 1200) resolve(samples); else requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }));
    const end = await client.send('Performance.getMetrics');
    if (movement) await owner.keyboard.up(action === 'walking' ? 'ArrowRight' : 'ArrowLeft');
    const metric = (name: string) => end.metrics.find((m: any) => m.name === name).value - start.metrics.find((m: any) => m.name === name).value;
    results.push({ action, frames: frames.length, fps: frames.length * 1000 / frames.reduce((sum: number, delta: number) => sum + delta, 0), layouts: metric('LayoutCount') });
    expect(frames.length).toBeGreaterThan(20); expect(metric('LayoutCount')).toBeLessThan(20);
  }
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await client.detach();
  writeFileSync(`${artifacts}/furnished-rotation-performance.json`, JSON.stringify(results, null, 2));
  console.info('Furnished rotation performance (4x CPU slowdown)', results);
  await owner.context().close();
});

