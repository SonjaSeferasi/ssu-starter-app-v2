import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { furnitureSprites } from '../../components/dormspace/pixel-art';
import { type Rotation } from '../../lib/dormspace-rules';
import { defaultPixelLook, pixelHairstyles, pixelLookKey, pixelOutfits, resolveDormAvatar, type PixelAvatarLook } from '../../lib/dormspace-avatar';
import { faceDetails, shirtColors, pantsColors, sampleFaceStyles } from '../../lib/game-room';
import { pixelAvatarLayers, pixelAvatarSprites, type AvatarPiece, type AvatarPose } from '../../components/dormspace/avatar-pieces';
import { Canvas, paint, type Art } from '../../components/dormspace/pixel-painter';
import { befriend, createDormDatabase, dormCall, friendship, testUid } from '../../__tests__/helpers/dormspace-db';

// The real Next UI and API run against real schema/functions in PGlite. Only the provider's
// Auth/Storage/PostgREST HTTP transport is replaced. This service binds to loopback and is never shipped.
let db: PGlite, service: Server, next: ChildProcess, browser: any, owner: any, visitor: any;
let base = '', nextLog = '', failSave = false, failReload = false, failAvatarReads = false, signingIn: any;
const sessions = new Map<string, any>();
const artifacts = process.env.DORMSPACE_EVIDENCE_DIR || 'tmp/dormspace-pixel-avatar';
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
  await page.waitForFunction(() => { const form = document.querySelector('form'); return form && Object.keys(form).some(key => key.startsWith('__reactProps$')); });
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
  // Additional supported outfits are test fixtures only; no ownership grants run in the hosted app.
  await db.exec(`INSERT INTO socialu.catalog_items(kind,name,preview_key,purchasable) VALUES ('outfit','Study day','sample-study',false),('outfit','Weekend','sample-weekend',false);
    INSERT INTO socialu.owned_items(student_id,item_id) SELECT s.student_id,c.item_id FROM socialu.students s CROSS JOIN socialu.catalog_items c WHERE c.kind='outfit' ON CONFLICT DO NOTHING;`);
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
      if (fn === 'socialu_avatar_customization' && !body.p_appearance && failAvatarReads) { reply(503, { code: '08006', message: 'Simulated avatar outage' }); return; }
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

const toSource = (art: Art) => 'data:image/svg+xml,' + encodeURIComponent(toSvg(art));
const toSvg = (art: Art) => `<svg xmlns="http://www.w3.org/2000/svg" width="${art.w}" height="${art.h}" viewBox="0 0 ${art.w} ${art.h}" shape-rendering="crispEdges">${art.px.map(([x,y,w,h,c]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`).join('')}</svg>`;
const rotations: Rotation[] = [0, 90, 180, 270];
const directions = ['down', 'up', 'left', 'right'] as const;
async function assertLook(page: any, look: PixelAvatarLook) {
  await page.waitForFunction((key: string) => document.querySelector('[data-dorm-avatar] [data-avatar-look]')?.getAttribute('data-avatar-look') === key, pixelLookKey(look));
}

it('exports separate transparent pixel pieces for every option and a complete visual reference', async () => {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1000 } });
  const looks: {label: string; look: PixelAvatarLook}[] = [
    ...pixelHairstyles.map(hair => ({ label: sampleFaceStyles[hair].label, look: { ...defaultPixelLook, hair, body: hair === 'sample-long-waves' || hair === 'sample-ponytail' || hair === 'sample-curly-bob' ? 'female' as const : 'male' as const } })),
    ...pixelOutfits.map(outfit => ({ label: outfit === 'sample-campus' ? 'Campus hoodie' : outfit === 'sample-study' ? 'Study day' : 'Weekend', look: { ...defaultPixelLook, outfit, shirt: outfit === 'sample-study' ? 'cream' as const : outfit === 'sample-weekend' ? 'green' as const : 'navy' as const } })),
    ...faceDetails.map(face => ({ label: face.name, look: { ...defaultPixelLook, face: face.id } })),
    ...shirtColors.map(shirt => ({ label: `${shirt.name} shirt`, look: { ...defaultPixelLook, shirt: shirt.id } })),
    ...pantsColors.map(pants => ({ label: `${pants.name} pants`, look: { ...defaultPixelLook, pants: pants.id } })),
  ];
  const html = (entries: typeof looks) => entries.map(({label, look}) => `<div class="cell"><strong>${label}</strong><div>${directions.map(d => `<img src="${toSource(pixelAvatarSprites(look).walk[d][0])}" width="48" height="88">`).join('')}</div></div>`).join('');
  await page.setContent(`<style>body{margin:0;background:#f6ecd2;font:13px system-ui}h1{padding:15px;margin:0}main{display:grid;grid-template-columns:repeat(4,244px);gap:4px;padding:4px}.cell{height:130px;background:#e4cfaa;display:flex;align-items:center;flex-direction:column;justify-content:space-around}.cell img{image-rendering:pixelated}</style><h1>DormSpace · saved Game Room pixel options</h1><main>${html(looks)}</main>`);
  await page.locator('img').evaluateAll(async (images: HTMLImageElement[]) => { await Promise.all(images.map(image => image.decode())); });
  await page.screenshot({ path: `${artifacts}/avatar-options.png`, fullPage: true });
  const actionLook = { ...defaultPixelLook, hair: 'sample-long-waves' as const, body: 'female' as const, face: 'glasses-freckles' as const, shirt: 'purple' as const, pants: 'olive' as const };
  await page.setContent(`<style>body{margin:0;background:#f6ecd2;font:14px system-ui}main{display:grid;grid-template-columns:repeat(4,244px);gap:4px;padding:4px}.cell{height:220px;background:#e4cfaa;display:flex;align-items:center;flex-direction:column;justify-content:space-around}.cell img{image-rendering:pixelated}</style><main>${['bed','chair','dorm-sofa','dorm-armchair'].map(key => rotations.map(rotation => {
    const art = furnitureSprites(key, rotation, actionLook)!.action!.frames[0];
    return `<div class="cell"><strong>${key} · ${rotation}°</strong><img src="${toSource(art)}" width="${art.w * 2}" height="${art.h * 2}"></div>`;
  }).join('')).join('')}</main>`);
  await page.locator('img').evaluateAll(async (images: HTMLImageElement[]) => { await Promise.all(images.map(image => image.decode())); });
  await page.screenshot({ path: `${artifacts}/custom-avatar-actions.png`, fullPage: true });
  const pieceFolder = `${artifacts}/pieces`; mkdirSync(pieceFolder, { recursive: true });
  const variants: {id: string; piece: AvatarPiece; look: PixelAvatarLook}[] = [];
  for (const hair of pixelHairstyles) for (const piece of ['hair-back', 'hair-front'] as const) variants.push({ id: `${piece}-${hair}`, piece, look: { ...defaultPixelLook, hair } });
  for (const body of ['male','female'] as const) for (const outfit of pixelOutfits) for (const shirt of shirtColors) variants.push({ id: `shirt-${body}-${outfit}-${shirt.id}`, piece: 'shirt', look: { ...defaultPixelLook, body, outfit, shirt: shirt.id } });
  for (const pants of pantsColors) variants.push({ id: `pants-${pants.id}`, piece: 'pants', look: { ...defaultPixelLook, pants: pants.id } });
  for (const body of ['male','female'] as const) {
    variants.push({ id: `body-${body}`, piece: 'body', look: { ...defaultPixelLook, body } });
    for (const face of faceDetails) variants.push({ id: `face-${body}-${face.id}`, piece: 'face', look: { ...defaultPixelLook, body, face: face.id } });
  }
  for (const piece of ['head', 'shoes', 'backpack'] as const) variants.push({ id: piece, piece, look: defaultPixelLook });
  const metadata = [];
  for (const variant of variants) {
    const canvas = new Canvas(24 * 5, 44 * 4), cells = [];
    for (const [row, facing] of directions.entries()) for (const [column, [pose, frame]] of ([['walk', 0], ['walk', 1], ['sit', 0], ['sit', 1], ['sleep', 0]] as [AvatarPose, 0 | 1][]).entries()) {
      const layer = pixelAvatarLayers(variant.look, facing, pose, frame).find(x => x.piece === variant.piece);
      if (layer) paint(canvas, layer.art, column * 24, row * 44);
      cells.push({ facing, pose, frame, x: column * 24, y: row * 44, w: 24, h: 44 });
    }
    const art = canvas.art(); writeFileSync(`${pieceFolder}/${variant.id}.svg`, toSvg(art));
    const png = await page.evaluate(async ({src,w,h}: any) => { const c = document.createElement('canvas'); c.width=w; c.height=h;
      const ctx=c.getContext('2d')!;ctx.imageSmoothingEnabled=false;const img=new Image();img.src=src;await img.decode();ctx.drawImage(img,0,0);return c.toDataURL('image/png').split(',')[1]; }, {src:toSource(art),w:art.w,h:art.h});
    writeFileSync(`${pieceFolder}/${variant.id}.png`, Buffer.from(png, 'base64'));
    metadata.push({ id: variant.id, piece: variant.piece, png: `pieces/${variant.id}.png`, svg: `pieces/${variant.id}.svg`, cells });
  }
  writeFileSync(`${artifacts}/pieces.json`, JSON.stringify({ width: 24, height: 44, layerOrder: pixelAvatarLayers(defaultPixelLook, 'down').map(x => x.piece), sheets: metadata }, null, 2));
  expect(variants).toHaveLength(73); expect(looks).toHaveLength(28);
  await page.close();
});

it('carries a saved Game Room selection into hall, movement, every resting orientation and fresh sessions', async () => {
  owner = await signIn(3);
  await owner.goto(base + '/game-room');
  await owner.getByRole('button', { name: 'Female', exact: true }).click();
  await owner.getByRole('button', { name: 'Hair', exact: true }).click();
  await owner.getByRole('button', { name: 'High ponytail', exact: true }).click();
  await owner.getByRole('button', { name: 'Face', exact: true }).click();
  await owner.getByRole('button', { name: 'Glasses & freckles', exact: true }).click();
  await owner.getByRole('button', { name: 'Outfit', exact: true }).click();
  await owner.getByRole('button', { name: 'Study day', exact: true }).click();
  await owner.getByRole('button', { name: 'Shirt color: Purple', exact: true }).click();
  await owner.getByRole('button', { name: 'Pants color: Olive', exact: true }).click();
  await owner.getByRole('button', { name: 'Save avatar', exact: true }).click();
  await owner.getByText('Avatar saved.', { exact: true }).waitFor();
  const readback = await api(owner, '/api/game-room');
  const look = resolveDormAvatar(readback.data).look;
  expect(look).toEqual({ hair: 'sample-ponytail', body: 'female', outfit: 'sample-study', face: 'glasses-freckles', shirt: 'purple', pants: 'olive' });
  // An unsaved preview must never reach DormSpace.
  await owner.getByRole('button', { name: 'Shirt color: Burgundy', exact: true }).click();
  await owner.getByRole('link', { name: 'Open DormSpace', exact: true }).click();
  await owner.getByRole('heading', { name: /DormHall/ }).waitFor(); await assertLook(owner, look);
  const savedAppearance = (await api(owner, '/api/game-room')).data.appearance;
  for (const [key, facing] of [['ArrowRight','right'],['ArrowUp','up'],['ArrowLeft','left'],['ArrowDown','down']]) {
    await owner.getByLabel('DormHall movement area', { exact: true }).focus(); await owner.keyboard.press(key);
    expect(await owner.locator('[data-dorm-avatar] [data-avatar-look]').getAttribute('data-facing')).toBe(facing);
  }
  await screenshot(owner, 'custom-avatar-hall');
  for (const rotation of rotations) {
    const room = (await api(owner, '/api/dorm')).data, id = (key: string) => room.catalog.find((x: any) => x.previewKey === key).id;
    const placements = [{ itemId: id('bed'), x: 1, y: 1, rotation }, { itemId: id('chair'), x: 7, y: 1, rotation },
      { itemId: id('dorm-sofa'), x: 1, y: 4, rotation }, { itemId: id('dorm-armchair'), x: 7, y: 4, rotation }, { itemId: id('window'), x: 5, y: 0, rotation: 0 }];
    expect((await api(owner, '/api/dorm', 'PUT', { ...room, placements })).status).toBe(200);
    await owner.goto(base + '/game-room/dormspace'); await owner.getByRole('heading', { name: /DormHall/ }).waitFor(); await openOwn(owner); await assertLook(owner, look);
    for (const [action, label, key] of [['Sleep in Bed','Sleeping in bed','bed'], ['Sit in Chair','Avatar sitting in chair','chair'], ['Sit on Sofa','Avatar sitting on sofa','dorm-sofa'], ['Sit in Armchair','Avatar sitting in armchair','dorm-armchair']]) {
      await owner.getByRole('button', { name: action, exact: true }).click();
      const pose = owner.getByRole('img', { name: label, exact: true });
      expect(await pose.getAttribute('data-avatar-look')).toBe(pixelLookKey(look));
      expect(await pose.getAttribute('data-facing')).toBe(String(rotation));
      expect(decodeURIComponent(await pose.locator('img').getAttribute('src')).match(/<rect[\s\S]*/)?.[0]).toBe(toSvg(furnitureSprites(key, rotation, look)!.action!.sheet).match(/<rect[\s\S]*/)?.[0]);
      if (key === 'bed') { await owner.getByRole('img', { name: 'Window at night with moon and stars', exact: true }).waitFor();
        if (rotation === 90) await screenshot(owner, 'custom-avatar-sleeping'); }
      if (key === 'dorm-sofa' && rotation === 270) await screenshot(owner, 'custom-avatar-sitting');
      await owner.keyboard.press('e'); await assertLook(owner, look);
    }
  }
  expect((await api(owner, '/api/game-room')).data.appearance).toEqual(savedAppearance);
  await owner.context().close(); owner = await signIn(3); await assertLook(owner, look); await owner.context().close();
});

it('refreshes saved looks on return, retains the last look on outages and retries an initial failure', async () => {
  failAvatarReads = true; owner = await signIn(4);
  await owner.getByRole('button', { name: 'Retry avatar', exact: true }).waitFor(); await assertLook(owner, defaultPixelLook);
  failAvatarReads = false; await owner.getByRole('button', { name: 'Retry avatar', exact: true }).click();
  await owner.getByRole('button', { name: 'Retry avatar', exact: true }).waitFor({ state: 'detached' });
  const data = (await api(owner, '/api/game-room')).data;
  const body = { outfitId: data.outfits.find((x: any) => x.assetKey === 'sample-weekend').id, faceId: data.faces.find((x: any) => x.assetKey === 'sample-locs').id, faceStyle: 'square-glasses', shirtColor: 'burgundy', pantsColor: 'khaki' };
  const updated = await api(owner, '/api/game-room', 'PUT', body); expect(updated.status).toBe(200);
  const look = resolveDormAvatar(updated.data).look;
  await owner.evaluate(() => window.dispatchEvent(new Event('focus'))); await assertLook(owner, look);
  failAvatarReads = true; await owner.evaluate(() => window.dispatchEvent(new Event('focus')));
  await owner.getByRole('button', { name: 'Retry avatar', exact: true }).waitFor(); await assertLook(owner, look);
  failAvatarReads = false; await owner.getByRole('button', { name: 'Retry avatar', exact: true }).click();
  await owner.getByRole('button', { name: 'Retry avatar', exact: true }).waitFor({ state: 'detached' });
  expect((await api(owner, '/api/game-room')).data.appearance).toEqual(body);
  await owner.context().close();
});

it('uses the visitor’s own pixel pieces on mobile without changing the host’s appearance or layout', async () => {
  await befriend(db, 3, 2); visitor = await signIn(2, { width: 390, height: 844 });
  const data = (await api(visitor, '/api/game-room')).data;
  const selected = await api(visitor, '/api/game-room', 'PUT', { outfitId: data.outfits[0].id, faceId: data.faces.find((x: any) => x.assetKey === 'sample-crew-cut').id, faceStyle: 'round-glasses', shirtColor: 'cream', pantsColor: 'black' });
  expect(selected.status).toBe(200); const look = resolveDormAvatar(selected.data).look;
  await visitor.evaluate(() => window.dispatchEvent(new Event('focus'))); await assertLook(visitor, look);
  const hostRoom = await dormCall(db, 3, 'open');
  const hostId = (key: string) => hostRoom.catalog.find((x: any) => x.previewKey === key).id;
  await dormCall(db, 3, 'save', null, { ...hostRoom, placements: [{ itemId: hostId('bed'), x: 1, y: 1, rotation: 90 }, { itemId: hostId('dorm-sofa'), x: 1, y: 4, rotation: 270 }] });
  const before = await dormCall(db, 3, 'open');
  const hostAvatar = (await db.query<any>('SELECT public.socialu_avatar_customization($1) AS result', [testUid(3)])).rows[0].result.appearance;
  await visitor.getByRole('button', { name: "dorm3's dorm", exact: true }).tap(); await visitor.getByRole('heading', { name: "dorm3's Dorm", exact: true }).waitFor();
  await assertLook(visitor, look); await visitor.getByRole('button', { name: 'Sit on Sofa', exact: true }).tap();
  expect(await visitor.getByRole('img', { name: 'Avatar sitting on sofa', exact: true }).getAttribute('data-avatar-look')).toBe(pixelLookKey(look));
  expect(await visitor.getByRole('button', { name: 'Decorate', exact: true }).count()).toBe(0);
  expect(await visitor.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await screenshot(visitor, 'custom-avatar-mobile-visitor');
  const after = await dormCall(db, 3, 'open');
  expect(after.placements).toEqual(before.placements); expect(after.version).toBe(before.version);
  expect(after.visitCount).toBe(before.visitCount + 1);
  expect((await db.query<any>('SELECT public.socialu_avatar_customization($1) AS result', [testUid(3)])).rows[0].result.appearance).toEqual(hostAvatar);
  await visitor.context().close();
});


it('keeps the customized pixel avatar smooth while walking, running, sleeping and sitting', async () => {
  owner = await signIn(3);
  const catalog = (await api(owner, '/api/game-room')).data;
  const customized = await api(owner, '/api/game-room', 'PUT', { outfitId: catalog.outfits[0].id, faceId: catalog.faces.find((x: any) => x.assetKey === 'sample-long-waves').id, faceStyle: 'glasses-freckles', shirtColor: 'purple', pantsColor: 'olive' });
  expect(customized.status).toBe(200);
  const savedAvatar = resolveDormAvatar(customized.data).look;
  await owner.evaluate(() => window.dispatchEvent(new Event('focus')));
  await assertLook(owner, savedAvatar);
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
  writeFileSync(`${artifacts}/custom-avatar-performance.json`, JSON.stringify(results, null, 2));
  console.info('Customized avatar performance (4x CPU slowdown)', results);
  await owner.context().close();
});

