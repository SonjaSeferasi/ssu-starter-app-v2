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
const artifacts = process.env.DORMSPACE_EVIDENCE_DIR || 'tmp/dormspace-campus';
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
    await befriend(db, 1, 2);
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
            reply(200, result.rows[0].result);
        }
        catch (error: any) {
            reply(400, { code: error.code || 'TEST', message: error.message });
        }
    });
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
it('visually checks the rebuilt furniture, all avatar choices, and the original comparison page', async () => {
    owner = await signIn(3);
    await furnish(owner);
    const data = (await api(owner, '/api/game-room')).data;
    expect((await api(owner, '/api/game-room', 'PUT', { outfitId: data.outfits[0].id, faceId: data.faces.find((x: any) => x.assetKey === 'sample-ponytail').id, faceStyle: 'glasses-freckles', shirtColor: 'purple', pantsColor: 'olive' })).status).toBe(200);
    await owner.goto(base + '/dev/dormspace-art');
    await artReady(owner);
    await screenshot(owner, 'campus-furniture');
    for (const tab of ['avatars', 'actions']) {
        await owner.getByRole('button', { name: tab, exact: true }).click();
        await artReady(owner);
        await screenshot(owner, 'campus-' + tab);
    }
    await owner.goto(base + '/game-room/dormspace');
    await owner.getByRole('heading', { name: /DormHall/ }).waitFor();
    await artReady(owner);
    await screenshot(owner, 'campus-hall');
    await openOwn(owner);
    await artReady(owner);
    await screenshot(owner, 'campus-room');
    await owner.getByLabel('Dorm movement area', { exact: true }).screenshot({ path: `${artifacts}/campus-stage.png` });
    const original = (await api(owner, '/api/dorm')).data;
    await owner.goto(base + '/game-room/dormspace/classic');
    await owner.getByRole('heading', { name: /DormHall/ }).waitFor();
    await openOwn(owner);
    await screenshot(owner, 'original-room');
    await owner.getByLabel('Dorm movement area', { exact: true }).screenshot({ path: `${artifacts}/original-stage.png` });
    expect((await api(owner, '/api/dorm')).data.placements).toEqual(original.placements);
    const comparison = await browser.newPage({ viewport: { width: 1400, height: 920 } });
    const before = 'data:image/png;base64,' + readFileSync(`${artifacts}/original-stage.png`).toString('base64'), after = 'data:image/png;base64,' + readFileSync(`${artifacts}/campus-stage.png`).toString('base64');
    await comparison.setContent(`<style>body{margin:0;padding:24px;background:#eaf1e9;font:15px system-ui;color:#284d53}h1{margin:0 0 5px;font-size:28px}p{color:#6b8278;margin:0 0 20px}main{display:grid;grid-template-columns:1fr 1fr;gap:20px}section{background:#f7faf3;border:1px solid #d4dfd2;border-radius:12px;padding:16px;height:760px}h2{font-size:17px;margin:0 0 16px}img{width:100%;height:695px;object-fit:contain;image-rendering:pixelated}</style><h1>DormSpace · original and campus rebuild</h1><p>Same saved furniture and avatar. Original preserved before the rebuild.</p><main><section><h2>Original · 24-pixel tiles</h2><img src="${before}"></section><section><h2>Modern campus · 64-pixel tiles + detailed sprites</h2><img src="${after}"></section></main>`);
    await comparison.locator('img').evaluateAll(async (images: HTMLImageElement[]) => Promise.all(images.map(img => img.decode())));
    await comparison.screenshot({ path: `${artifacts}/comparison.png`, fullPage: true });
    await comparison.close();
    await owner.context().close();
});
it('preserves the saved look, every rotated rest action, decorating, guestbook and clear-floor movement', async () => {
    owner = await signIn(3);
    await avatarSize(owner, 1.25);
    // Observe the actual canvas transforms, including the rotated sleeping head crop.
    // This catches furniture-specific enlargement even when the CSS frame still looks correct.
    await owner.addInitScript(() => {
        (window as any).__campusAvatarDraws = [];
        const original = CanvasRenderingContext2D.prototype.drawImage;
        CanvasRenderingContext2D.prototype.drawImage = function (this: CanvasRenderingContext2D, source: CanvasImageSource, ...args: number[]) {
            if (source instanceof HTMLCanvasElement && source.width === 96 && source.height === 128 && !this.canvas.closest('[data-dorm-avatar]')) {
                const transform = this.getTransform(), sw = args.length === 8 ? args[2] : source.width, sh = args.length === 8 ? args[3] : source.height;
                const dw = args.length === 8 ? args[6] : args.length === 4 ? args[2] : sw;
                const dh = args.length === 8 ? args[7] : args.length === 4 ? args[3] : sh;
                let clipped = false;
                if (args.length === 4) {
                    const pixels = source.getContext('2d')!.getImageData(0, 0, source.width, source.height).data;
                    let left = source.width, right = 0, bottom = 0;
                    for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
                        if (pixels[(y * source.width + x) * 4 + 3] > 32) {
                            left = Math.min(left, x); right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
                        }
                    }
                    clipped = args[0] + left * dw / sw < -.01 || args[0] + right * dw / sw > this.canvas.width + .01 || args[1] + bottom * dh / sh > this.canvas.height + .01;
                }
                (window as any).__campusAvatarDraws.push({ x: Math.hypot(transform.a, transform.b) * dw / sw, y: Math.hypot(transform.c, transform.d) * dh / sh, clipped });
            }
            return (original as any).call(this, source, ...args);
        } as typeof original;
    });
    const game = (await api(owner, '/api/game-room')).data;
    const choice = { outfitId: game.outfits[0].id, faceId: game.faces.find((x: any) => x.assetKey === 'sample-long-waves').id, faceStyle: 'round-glasses', shirtColor: 'burgundy', pantsColor: 'khaki' };
    const save = await api(owner, '/api/game-room', 'PUT', choice);
    expect(save.status).toBe(200);
    const key = pixelLookKey(resolveDormAvatar(save.data).look);
    const hashes = new Set<string>();
    for (const rotation of [0, 90, 180, 270]) {
        const room = (await api(owner, '/api/dorm')).data, id = (key: string) => room.catalog.find((x: any) => x.previewKey === key).id;
        const placements = [['bed', 1, 1], ['chair', 7, 1], ['dorm-sofa', 1, 4], ['dorm-armchair', 7, 4], ['window', 5, 0]].map(([k, x, y]) => ({ itemId: id(k as string), x, y, rotation: k === 'window' ? 0 : rotation }));
        expect((await api(owner, '/api/dorm', 'PUT', { ...room, placements })).status).toBe(200);
        await owner.goto(base + '/game-room/dormspace');
        await owner.getByRole('heading', { name: /DormHall/ }).waitFor();
        await openOwn(owner);
        await artReady(owner);
        const standingSize = await avatarSize(owner);
        expect(standingSize.roomScale).toBeCloseTo(64 * 1.4 / 96, 2);
        expect(await owner.locator('[data-dorm-avatar] [data-avatar-look]').getAttribute('data-avatar-look')).toBe(key);
        for (const [action, label] of [['Sleep in Bed', 'Sleeping in bed'], ['Sit in Chair', 'Avatar sitting in chair'], ['Sit on Sofa', 'Avatar sitting on sofa'], ['Sit in Armchair', 'Avatar sitting in armchair']]) {
            await owner.evaluate(() => { (window as any).__campusAvatarDraws = []; });
            await owner.getByRole('button', { name: action, exact: true }).click();
            await artReady(owner);
            const pose = owner.getByRole('img', { name: label, exact: true });
            expect(await pose.getAttribute('data-avatar-look')).toBe(key);
            expect(await pose.getAttribute('data-facing')).toBe(String(rotation));
            if (action !== 'Sleep in Bed')
                expect(await pose.getAttribute('data-avatar-facing')).toBe(({ 0: 'down', 90: 'right', 180: 'up', 270: 'left' } as Record<number, string>)[rotation]);
            const canvas = pose.locator('canvas');
            expect(await canvas.evaluate((c: HTMLCanvasElement) => c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data.some(v => v !== 0))).toBe(true);
            hashes.add(await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL()));
            const draws = await owner.evaluate(() => (window as any).__campusAvatarDraws as { x: number; y: number; clipped: boolean }[]);
            expect(draws.length, action + ' draws the avatar').toBeGreaterThan(0);
            for (const draw of draws) {
                expect(draw.x, `${action} at ${rotation}° matches the standing model`).toBeCloseTo(standingSize.roomScale, 2);
                expect(draw.y, `${action} at ${rotation}° preserves body proportions`).toBeCloseTo(draw.x, 5);
                expect(draw.clipped, `${action} at ${rotation}° keeps shoes and hands inside the sprite`).toBe(false);
            }
            if (action === 'Sleep in Bed')
                await owner.getByRole('img', { name: 'Window at night with moon and stars', exact: true }).waitFor();
            if (rotation === 90 && action === 'Sleep in Bed')
                await screenshot(owner, 'campus-night');
            if (rotation === 0 && action === 'Sit on Sofa')
                await screenshot(owner, 'campus-seated');
            await owner.keyboard.press('e');
            expect(await owner.getByRole('region', { name: 'My Dorm', exact: true }).getAttribute('data-pose')).toBe('standing');
        }
    }
    expect(hashes.size).toBe(16);
    await owner.getByRole('button', { name: 'Guestbook', exact: true }).click();
    await owner.getByRole('dialog').waitFor();
    await owner.getByRole('button', { name: 'Close', exact: true }).click();
    await decorate(owner);
    const selected = (await api(owner, '/api/dorm')).data;
    const bed = selected.catalog.find((x: any) => x.previewKey === 'bed');
    await owner.getByLabel('Placed furniture', { exact: true }).selectOption(bed.id);
    const savedRotation = owner.waitForResponse((r: any) => r.url().endsWith('/api/dorm') && r.request().method() === 'PUT');
    await owner.getByRole('button', { name: 'Rotate clockwise ↻', exact: true }).click();
    expect((await savedRotation).status()).toBe(200);
    await saved(owner);
    await owner.getByRole('button', { name: 'Done decorating', exact: true }).click();
    await owner.getByLabel('Dorm movement area', { exact: true }).focus();
    await owner.keyboard.down('ArrowDown');
    await delay(1300);
    await owner.keyboard.up('ArrowDown');
    const point = await owner.locator('[data-dorm-avatar]').evaluate((el: HTMLElement) => { const a = el.parentElement!.getBoundingClientRect(), b = el.getBoundingClientRect(); return (b.y + b.height * .9 - a.y) / a.height * 8 - .9; });
    expect(point).toBeLessThan(7);
    expect((await api(owner, '/api/game-room')).data.appearance).toEqual(choice);
    await owner.context().close();
});
it('keeps mobile visits and artifact attribution available without changing the host layout', async () => {
    await befriend(db, 3, 2);
    visitor = await signIn(2, { width: 390, height: 844 });
    const data = (await api(visitor, '/api/game-room')).data;
    const choice = await api(visitor, '/api/game-room', 'PUT', { outfitId: data.outfits[0].id, faceId: data.faces.find((x: any) => x.assetKey === 'sample-crew-cut').id, faceStyle: 'square-glasses', shirtColor: 'cream', pantsColor: 'black' });
    expect(choice.status).toBe(200);
    await visitor.reload();
    await visitor.getByRole('heading', { name: /DormHall/ }).waitFor();
    const before = await dormCall(db, 3, 'open');
    await visitor.getByRole('button', { name: "dorm3's dorm", exact: true }).tap();
    await visitor.getByRole('heading', { name: "dorm3's Dorm", exact: true }).waitFor();
    await artReady(visitor);
    const key = pixelLookKey(resolveDormAvatar(choice.data).look);
    expect(await visitor.locator('[data-dorm-avatar] [data-avatar-look]').getAttribute('data-avatar-look')).toBe(key);
    expect((await avatarSize(visitor)).roomScale).toBeCloseTo(64 * 1.4 / 96, 2);
    expect(await visitor.getByRole('button', { name: 'Decorate', exact: true }).count()).toBe(0);
    await visitor.getByRole('button', { name: 'Sit on Sofa', exact: true }).tap();
    await artReady(visitor);
    expect(await visitor.getByRole('img', { name: 'Avatar sitting on sofa', exact: true }).getAttribute('data-avatar-look')).toBe(key);
    expect(await visitor.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await screenshot(visitor, 'campus-mobile');
    expect((await dormCall(db, 3, 'open')).placements).toEqual(before.placements);
    await visitor.getByRole('link', { name: 'Art credits', exact: true }).tap();
    await visitor.getByRole('heading', { name: 'DormSpace art credits', exact: true }).waitFor();
    expect(await visitor.getByRole('row').count()).toBe(73);
    await visitor.context().close();
});
it('keeps the customized pixel avatar smooth while walking, running, sleeping and sitting', async () => {
    owner = await signIn(3);
    const catalog = (await api(owner, '/api/game-room')).data;
    const customized = await api(owner, '/api/game-room', 'PUT', { outfitId: catalog.outfits[0].id, faceId: catalog.faces.find((x: any) => x.assetKey === 'sample-long-waves').id, faceStyle: 'glasses-freckles', shirtColor: 'purple', pantsColor: 'olive' });
    expect(customized.status).toBe(200);
    const savedAvatar = resolveDormAvatar(customized.data).look;
    await owner.evaluate(() => window.dispatchEvent(new Event('focus')));
    await owner.waitForFunction((key: string) => document.querySelector('[data-dorm-avatar] [data-avatar-look]')?.getAttribute('data-avatar-look') === key, pixelLookKey(savedAvatar));
    const room = (await api(owner, '/api/dorm')).data;
    const id = (key: string) => room.catalog.find((item: any) => item.previewKey === key).id;
    const placements = [
        ['bed', 0, 1, 90], ['dorm-sofa', 4, 1, 90], ['dorm-armchair', 8, 4, 270], ['chair', 7, 0, 180],
        ['dorm-bookshelf', 0, 0, 180], ['dorm-wardrobe', 9, 0, 90], ['dorm-coffee-table', 4, 4, 90],
        ['dorm-nightstand', 3, 3, 180], ['dorm-plant', 8, 3, 270], ['dorm-rug', 4, 1, 90], ['window', 5, 0, 0],
    ].map(([key, x, y, rotation]) => ({ itemId: id(key as string), x, y, rotation }));
    expect((await api(owner, '/api/dorm', 'PUT', { ...room, placements })).status).toBe(200);
    await openOwn(owner);
    const client = await owner.context().newCDPSession(owner);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await client.send('Performance.enable');
    const results = [];
    for (const action of ['walking', 'running', 'sleeping', 'sitting']) {
        if (action === 'running')
            await owner.getByRole('button', { name: 'Run', exact: true }).click();
        if (action === 'sleeping')
            await owner.getByRole('button', { name: 'Sleep in Bed', exact: true }).click();
        if (action === 'sitting') {
            await owner.keyboard.press('e');
            await owner.getByRole('button', { name: 'Sit on Sofa', exact: true }).click();
        }
        const movement = action === 'walking' || action === 'running';
        await owner.getByLabel('Dorm movement area', { exact: true }).focus();
        if (movement)
            await owner.keyboard.down(action === 'walking' ? 'ArrowRight' : 'ArrowLeft');
        if (movement)
            expect((await avatarSize(owner)).roomScale).toBeCloseTo(64 * 1.4 / 96, 2);
        const start = await client.send('Performance.getMetrics');
        const frames = await owner.evaluate(() => new Promise<number[]>((resolve) => {
            const samples: number[] = [];
            let previous = 0, first = 0;
            const tick = (now: number) => {
                if (!first)
                    first = now;
                if (previous)
                    samples.push(now - previous);
                previous = now;
                if (now - first >= 1200)
                    resolve(samples);
                else
                    requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }));
        const end = await client.send('Performance.getMetrics');
        if (movement)
            await owner.keyboard.up(action === 'walking' ? 'ArrowRight' : 'ArrowLeft');
        const metric = (name: string) => end.metrics.find((m: any) => m.name === name).value - start.metrics.find((m: any) => m.name === name).value;
        results.push({ action, frames: frames.length, fps: frames.length * 1000 / frames.reduce((sum: number, delta: number) => sum + delta, 0), layouts: metric('LayoutCount') });
        expect(frames.length).toBeGreaterThan(20);
        expect(metric('LayoutCount')).toBeLessThan(20);
    }
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await client.detach();
    writeFileSync(`${artifacts}/campus-performance.json`, JSON.stringify(results, null, 2));
    console.info('Campus canvas performance (4x CPU slowdown)', results);
    await owner.context().close();
});
