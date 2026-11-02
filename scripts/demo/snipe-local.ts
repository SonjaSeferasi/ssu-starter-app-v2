import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { befriend, testUid } from '../../__tests__/helpers/dormspace-db';
import { createGroup, createSnipeDatabase } from '../../__tests__/helpers/snipe-db';
import { createSnipeStorage } from '../tests/snipe-local-storage';

// DEVELOPMENT-ONLY local preview of the Snipe UI. Not a route, not imported by the app, never deployed.
// Same isolation as scripts/tests/snipe-basic.browser.ts: the real Next UI and API run against the real schema
// in a disposable in-memory PGlite; only the provider's Auth, Storage and PostgREST HTTP transport is replaced,
// on loopback. No hosted accounts, keys or data. Accounts below are disposable local sample data.
// Run: node node_modules/vite-node/vite-node.mjs scripts/demo/snipe-local.ts
let db: PGlite | undefined, service: Server | undefined, next: ChildProcess | undefined;
let nextLog = '', stopping = false;
const sessions = new Map<string, any>();
const SERVICE_KEY = 'isolated-test-service-key';
// Both private Snipe buckets, including upload-only URLs for direct photo uploads (same stand-in as the browser test).
const storage = createSnipeStorage(SERVICE_KEY);
const PASSWORD = 'SnipeTest123!';
// The same additive migrations as scripts/tests/snipe-basic.browser.ts, each applied once in filename order on top
// of the shared Snipe fixture, plus the group-members bridge the Members dialog needs before it offers Leave group:
// group members, the real group-leave bridge, original-actor sharing permissions and request pagination.
const ADDITIVE_MIGRATIONS = ['supabase/migrations/20261028120000_chat_assign_group_admin.sql', 'supabase/migrations/20261028120300_chat_leave_group.sql',
  'supabase/migrations/20261030040044_snipe_withdrawal_access.sql', 'supabase/migrations/20261030093802_snipe_request_pagination.sql'];
// Bridges the Snipe, report, administrator review, personal sharing, group-members and group-leave controls call
// (lib/snipe.ts, lib/snipe-transport.ts, lib/snipe-sharing.ts, the Members dialog, app/api/conversations/[id]/leave);
// startup fails if one is missing.
const SNIPE_BRIDGES = ['socialu_snipe', 'socialu_snipe_report', 'socialu_snipe_moderation', 'socialu_snipe_photo', 'socialu_snipe_photo_reap',
  'socialu_snipe_sharing', 'socialu_group_members', 'socialu_assign_group_admin', 'socialu_leave_group'];
// Explicit allowlist of RPCs the login, conversation and Snipe pages reach; anything else is refused.
const RPCS = new Set([
  'socialu_auth_guard', 'socialu_session_guard', 'socialu_session', 'socialu_account', 'socialu_account_lifecycle',
  'socialu_conversation_list', 'socialu_conversation_messages', 'socialu_mark_conversation_read', 'socialu_send_message',
  'socialu_friend_conversation', 'socialu_friendships', 'socialu_notifications',
  'socialu_mark_notifications_read', 'socialu_game_room', 'socialu_avatar_customization', 'socialu_dorm',
  'socialu_dormspace_live', 'socialu_profile_view', ...SNIPE_BRIDGES,
]);
const user = (student: number) => ({ id: testUid(student), email: `dorm${student}@salemstate.edu`, email_confirmed_at: '2026-10-19T12:00:00Z', aud: 'authenticated', role: 'authenticated', user_metadata: { full_name: `Dorm Student ${student}`, username: `dorm${student}` } });
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function listen(server: Server) {
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return (server.address() as { port: number }).port;
}

async function cleanup() {
  if (next && next.exitCode === null) {
    const exited = new Promise<void>(resolve => next!.once('exit', () => resolve()));
    next.kill('SIGTERM');
    await Promise.race([exited, delay(5000)]);
    if (next.exitCode === null) next.kill('SIGKILL');
  }
  if (service?.listening) { service.closeAllConnections?.(); await new Promise<void>(resolve => service!.close(() => resolve())); }
  await db?.close().catch(() => {});
}
async function shutdown(code: number) {
  if (stopping) return; stopping = true;
  await cleanup();
  process.exit(code);
}

async function main() {
  process.once('SIGINT', () => void shutdown(0));
  process.once('SIGTERM', () => void shutdown(0));

  db = await createSnipeDatabase(4);
  for (const file of ADDITIVE_MIGRATIONS) await db.exec(readFileSync(file, 'utf8'));
  const present = (await db.query<{ name: string }>("SELECT DISTINCT proname::text AS name FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname::text = ANY($1::text[])", [SNIPE_BRIDGES])).rows.map(row => row.name);
  const missing = SNIPE_BRIDGES.filter(name => !present.includes(name));
  if (missing.length) throw new Error('Missing Snipe bridges: ' + missing.join(', '));
  const bridge = await db.query<any>("SELECT pg_get_functiondef('public.socialu_snipe(uuid,text,bigint,bigint,jsonb)'::regprocedure) AS def");
  if (!bridge.rows[0].def.includes("'next_cursor'")) throw new Error('The Snipe pagination migration was not applied.');
  await befriend(db, 1, 2); await befriend(db, 1, 3);
  const group = await createGroup(db, 1, [2, 3, 4]);
  const database = db;

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
        if (!student || body.password !== PASSWORD) { reply(400, { message: 'Invalid credentials' }); return; }
        const id = randomUUID(), iat = Math.floor(Date.now() / 1000);
        const token = 'e30.' + Buffer.from(JSON.stringify({ sub: testUid(student), iat, exp: iat + 3600, session_id: id })).toString('base64url') + '.local-test';
        await database.query('INSERT INTO auth.sessions VALUES($1,$2,clock_timestamp())', [id, testUid(student)]);
        sessions.set(token, user(student));
        reply(200, { access_token: token, refresh_token: 'local-refresh', expires_in: 3600, expires_at: iat + 3600, token_type: 'bearer', user: user(student) }); return;
      }
      if (path === '/auth/v1/user') {
        const account = sessions.get(request.headers.authorization?.slice(7) || '');
        reply(account ? 200 : 401, account || { message: 'Expired session' }); return;
      }
      // Private Storage stand-in for the two Snipe buckets only; no public or signed READ URLs exist.
      if (storage.handle(request, response, path, url, raw)) return;
      const fn = path.match(/^\/rest\/v1\/rpc\/(socialu_[a-z_]+)$/)?.[1];
      const body = raw.length ? JSON.parse(raw.toString()) : {};
      if (!fn || !RPCS.has(fn) || !Object.keys(body).every(key => /^p_[a-z_]+$/.test(key))) {
        console.error(`[snipe-local] refused ${request.method} ${path}`);
        reply(404, { code: 'PGRST202', message: 'Unknown local preview endpoint' }); return;
      }
      const entries = Object.entries(body);
      const result = await database.query<{ result: any }>(`SELECT public.${fn}(${entries.map(([key], index) => `${key} => $${index + 1}`).join(',')}) AS result`, entries.map(([, value]) => value && typeof value === 'object' ? JSON.stringify(value) : value));
      reply(200, result.rows[0].result);
    } catch (error: any) { reply(400, { code: error.code || 'TEST', message: error.message, details: error.detail ?? null }); }
  });
  const servicePort = await listen(service);
  const reservation = createServer(); const nextPort = await listen(reservation);
  await new Promise<void>(resolve => reservation.close(() => resolve()));
  const base = `http://127.0.0.1:${nextPort}`;
  // Webpack, not Turbopack, for the dev server: avoids Turbopack's known project-root watch problem.
  next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(nextPort)], {
    cwd: process.env.SNIPE_APP_ROOT || process.cwd(),
    env: { ...process.env, SUPABASE_URL: `http://127.0.0.1:${servicePort}`, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${servicePort}`, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, SUPABASE_ANON_KEY: 'isolated-test-anon-key', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'isolated-test-anon-key', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  next.stdout?.on('data', chunk => { nextLog = (nextLog + chunk.toString()).slice(-20000); });
  next.stderr?.on('data', chunk => { nextLog = (nextLog + chunk.toString()).slice(-20000); });
  next.once('exit', code => { if (!stopping) { console.error('[snipe-local] Next exited unexpectedly:', code, nextLog.slice(-3000)); void shutdown(1); } });

  let ready = false;
  for (let attempt = 0; attempt < 200; attempt++) {
    try { if ((await fetch(`${base}/api/conversations/${group}/snipes`)).status === 401) { ready = true; break; } } catch {}
    if (next.exitCode !== null || stopping) break;
    await delay(300);
  }
  if (!ready) throw new Error('Local Next preview did not start: ' + nextLog.slice(-3000));

  console.log(JSON.stringify({
    ready: true,
    note: 'DEVELOPMENT-ONLY local preview. All accounts are disposable local sample data in an in-memory database; nothing is hosted.',
    previewUrl: `${base}/login`,
    conversationUrl: `${base}/messages/${group}`,
    steps: 'Sign in, open the group conversation, press the Snipe toggle, then New Snipe.',
    login: { email: 'dorm1@salemstate.edu', password: PASSWORD, role: 'photographer (disposable sample account)' },
    reviewer: { email: 'dorm2@salemstate.edu', password: PASSWORD, role: 'tagged friend (disposable sample account)' },
    stop: 'Ctrl+C (SIGINT) or SIGTERM',
  }));
}

main().catch(async error => {
  console.error('[snipe-local] startup failed:', error?.message || error);
  await shutdown(1);
});
