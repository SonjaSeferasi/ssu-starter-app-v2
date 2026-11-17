// Evidence fixture for #1217 (photo in the Messages list and in notifications) and #1222 (a former group
// member keeps read-only access to their own history).
//
// It runs the real Next UI and the real API routes against the real migrations in a disposable in-memory
// PGlite database. Only Supabase's Auth and PostgREST transport is replaced, by the small server below.
// It NEVER connects to the hosted database, so taking evidence cannot write to, or read from, live data.
//
// Same shape as scripts/tests/profile-board-atomic.browser.ts (Linh, #1223), with the browser left out:
// this one seeds, serves, prints the sign-in tokens and stays up so a browser can be driven against it
// by hand.
//
//   node scripts/tests/chat-evidence-fixture.mjs            # fixed build (the state on main)
//   node scripts/tests/chat-evidence-fixture.mjs --before   # without the two fixes, for the before shots
//
// --before omits 20261112120000 (#1217) and 20261116130000 (#1222) so the older function bodies stay in
// place. The client code is the fixed client in both runs, because the point of the pair is to show what
// the database change does.

import { PGlite } from '@electric-sql/pglite';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const BEFORE = process.argv.includes('--before');
const APP_PORT = Number(process.env.CHAT_EVIDENCE_PORT || 3123);
const root = process.cwd();

const chat = ['20261012120000_chat_send_text_message.sql', '20261019120000_chat_conversation_messages.sql', '20261019120100_chat_group_structure_check_as_owner.sql', '20261019150000_chat_conversation_list.sql', '20261019170000_chat_create_group.sql', '20261019170100_chat_conversation_role.sql', '20261019190000_chat_unread_status.sql', '20261019190100_chat_mark_read.sql'];
const sprint3 = ['20261026120000_chat_group_invite_friends.sql', '20261026120100_chat_send_group_invitation.sql', '20261026130000_chat_pending_group_invitations.sql', '20261026130100_chat_accept_group_invitation.sql', '20261026130200_chat_decline_group_invitation.sql', '20261026140000_chat_send_emoji.sql', '20261026140100_chat_emoji_in_history.sql', '20261026150000_chat_sender_names.sql', '20261026160000_chat_name_group.sql', '20261026160100_chat_group_name_display.sql', '20261026170000_chat_group_name_live.sql', '20261026180000_chat_message_notifications.sql', '20261026180100_chat_group_invitation_live.sql', '20261027120000_chat_reaction_set.sql', '20261027120100_chat_react_to_message.sql', '20261027120200_chat_reactions_in_history.sql', '20261028120000_chat_assign_group_admin.sql', '20261028120100_chat_revoke_group_admin.sql', '20261028120200_chat_remove_group_member.sql', '20261028120300_chat_leave_group.sql', '20261028120400_chat_transfer_group_ownership.sql'];
const photo = ['20261102120000_chat_send_reply.sql', '20261102130000_chat_reply_in_history.sql', '20261103120000_chat_send_photo.sql', '20261103130000_chat_photo_in_history.sql', '20261104120000_chat_delete_photo.sql', '20261112120000_chat_photo_in_list_and_notifications.sql', '20261116120000_chat_delete_photo_error_order.sql', '20261116130000_chat_former_member_history.sql', '20261117020000_chat_delete_former_group_conversation.sql', '20261117040000_chat_react_to_photo.sql', '20261117050000_chat_sender_photo_in_history.sql'];
const base = ['20261008000100_link_supabase_accounts.sql', '20261008000200_feed_functions.sql', '20261008000300_fix_deferred_post_trigger.sql', '20261012230000_srs_100_105_auth.sql', '20261013200000_srs_109_113_profile.sql', '20261015180000_profile_social.sql', '20261015190000_profile_full_name.sql', '20261016000100_like_post.sql', '20261016001000_optional_profile_bio.sql', '20261016010000_friendships.sql', '20261016020000_feed_profile_links.sql', '20261016030000_edit_profile_username.sql', '20261016040000_friend_accept_mutual_follow.sql', '20261017000100_unlike_post.sql', '20261018000100_post_comments.sql', '20261018010000_integrate_profile_feed.sql'];

const withoutFixes = new Set(['20261112120000_chat_photo_in_list_and_notifications.sql', '20261116130000_chat_former_member_history.sql']);
const migrations = [...base, ...chat, ...sprint3, ...photo].filter((f) => !(BEFORE && withoutFixes.has(f)));

// The three accounts LP tests with. They are seeded here as local rows with the same names, so the
// screenshots read like the accounts the team already knows; the hosted accounts themselves are not used
// and not reachable from this fixture.
const uid = (n) => `00000000-0000-0000-0000-00000000000${n}`;
const names = { 1: 'Loens', 2: 'Test1', 3: 'Test 2' };
const usernames = { 1: 'loens', 2: 'test1', 3: 'test2' };
const everyone = [1, 2, 3];

const db = new PGlite();
const call = async (fn, n, ...args) =>
  (await db.query(`SELECT public.${fn}(${['$1', ...args.map((_, i) => '$' + (i + 2))].join(',')}) AS r`, [uid(n), ...args])).rows[0].r;

async function seed() {
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid', true), '')::uuid$$;
CREATE SCHEMA realtime;CREATE TABLE realtime.messages(extension text,topic text);CREATE TABLE realtime.sent(topic text,event text,payload jsonb);
CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql AS $$SELECT nullif(current_setting('test.topic', true), '')$$;
CREATE FUNCTION realtime.send(payload jsonb,event text,topic text,private boolean) RETURNS void LANGUAGE sql AS 'INSERT INTO realtime.sent VALUES($3,$2,$1)';`);
  await db.exec(readFileSync(root + '/supabase/schema.sql', 'utf8'));
  for (const file of migrations) await db.exec(readFileSync(root + '/supabase/migrations/' + file, 'utf8'));

  for (const n of everyone) {
    await db.query('INSERT INTO auth.users VALUES($1,$2,now())', [uid(n), `${usernames[n]}@salemstate.edu`]);
    await db.query(
      'INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',
      [names[n], usernames[n], `${usernames[n]}@salemstate.edu`, uid(n)],
    );
    // The pages read the signed-in student through socialu_account('read'), which answers from
    // student_profiles, not from students. Registration creates both rows; the chat tests only ever needed
    // the first, so the fixture adds the second.
    await db.query(
      'INSERT INTO socialu.student_profiles(student_id,bio) SELECT student_id,$1 FROM socialu.students WHERE auth_user_id=$2',
      [`${names[n]} on SocialU.`, uid(n)],
    );
  }

  const friends = async (n, action, target, id = null) =>
    (await db.query('SELECT public.socialu_friendships($1,$2,$3,$4) AS r', [uid(n), action, target, id])).rows[0].r;
  const befriend = async (a, b) => {
    await friends(b, 'accept', usernames[a], (await friends(a, 'send', usernames[b])).request_id);
  };
  // A group invitation only reaches a current friend (SCI02), so the owner below must be friends with
  // everyone they invite, not just with Loens.
  await befriend(1, 2);
  await befriend(1, 3);
  await befriend(2, 3);

  // ---- #1217: student 1's newest conversation ends in a photo -----------------------------------------
  // An older text conversation exists too, so the ordering the fix restores is visible: before the fix a
  // photo did not count as activity, so this quieter conversation sat above the one with the photo.
  // The order matters. Test1's text is the OLDEST, Test 2's text is in the middle, and Test1's photo is the
  // newest thing in either conversation. Before the fix a photo was not activity, so the list ranked Test 2
  // above Test1 and showed Test1's old text as the preview; after it, Test1's conversation is on top and
  // reads "Photo". Sending the photo last is what makes both halves of the defect visible in one screenshot.
  const withPhoto = (await friends(1, 'message', usernames[2])).conversation_id;
  await call('socialu_send_message', 2, withPhoto, 'Found the poster for the showcase:', null);

  const quiet = (await friends(1, 'message', usernames[3])).conversation_id;
  await call('socialu_send_message', 3, quiet, 'Are we still meeting at the library at 4?', null);

  await call('socialu_send_photo', 2, withPhoto, 'chat_photo/2/1/showcase.jpg', 'image/jpeg', 820000, null, null, null);

  // ---- #1222: Loens is removed from a group they were in ----------------------------------------------
  // Removed rather than left, because the notice has to be true for someone who did not choose to go.
  // Test 2 owns the group, so that the removal is done to Loens by somebody else.
  const group = (await call('socialu_create_group', 3)).id;
  for (const n of [1, 2]) {
    await call('socialu_accept_group_invitation', n, (await call('socialu_send_group_invitation', 3, group, usernames[n])).invitation.id);
  }
  await call('socialu_rename_group', 3, group, 'CSC 281 Project');
  await call('socialu_send_message', 3, group, 'Posting the sprint plan here so it is in one place.', null);
  await call('socialu_send_message', 1, group, 'I will take the messaging items this sprint.', null);
  await call('socialu_send_message', 2, group, 'Sounds good — I will pick up the profile ones.', null);
  await call('socialu_remove_group_member', 3, group, usernames[1]);
  // Said after the removal: it must never reach Loens, in the history or in the list preview.
  await call('socialu_send_message', 3, group, 'Reminder: demo is Friday, members only.', null);

  return { quiet, withPhoto, group };
}

function token(n) {
  const issued = Math.floor(Date.now() / 1000);
  const claims = { sub: uid(n), iat: issued, exp: issued + 36000, session_id: uid(n) };
  return 'e30.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.local-fixture';
}

const tokens = Object.fromEntries(everyone.map((n) => [n, token(n)]));

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server.address().port;
}

const ids = await seed();

// Stands in for Supabase Auth and PostgREST. Only socialu_* RPCs with p_* arguments are reachable, which is
// the same surface the hosted project exposes to the service role.
const service = createServer(async (request, response) => {
  const reply = (status, data) => {
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(data));
  };
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (path === '/auth/v1/user') {
      const bearer = (request.headers.authorization || '').replace('Bearer ', '');
      const n = Object.keys(tokens).find((k) => tokens[k] === bearer);
      return reply(n ? 200 : 401, n
        ? { id: uid(n), email: `${usernames[n]}@salemstate.edu`, email_confirmed_at: new Date().toISOString(), aud: 'authenticated', role: 'authenticated' }
        : { message: 'Invalid local session' });
    }
    let raw = '';
    for await (const chunk of request) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    const fn = path.match(/^\/rest\/v1\/rpc\/(socialu_[a-z_]+)$/)?.[1];
    if (!fn || !Object.keys(body).every((key) => /^p_[a-z_]+$/.test(key))) return reply(404, { code: 'PGRST202', message: 'Unavailable fixture endpoint' });
    const entries = Object.entries(body);
    const result = await db.query(
      `SELECT public.${fn}(${entries.map(([key], i) => `${key} => $${i + 1}`).join(',')}) AS result`,
      entries.map(([, value]) => (value && typeof value === 'object' ? JSON.stringify(value) : value)),
    );
    return reply(200, result.rows[0].result);
  } catch (error) {
    reply(400, { code: error.code || 'FIXTURE', message: error.message });
  }
});

const servicePort = await listen(service);

// No NEXT_PUBLIC_SUPABASE_ANON_KEY on purpose: the browser Realtime client returns null without it and the
// page settles on "Live updates unavailable" instead of retrying a socket this fixture does not serve.
const next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(APP_PORT)], {
  env: {
    ...process.env,
    SUPABASE_URL: `http://127.0.0.1:${servicePort}`,
    NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${servicePort}`,
    SUPABASE_SERVICE_ROLE_KEY: 'local-fixture-service-key',
    SUPABASE_ANON_KEY: 'local-fixture-anon-key',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
next.stdout.on('data', (c) => { log += c; process.stdout.write(c); });
next.stderr.on('data', (c) => { log += c; process.stderr.write(c); });

const appBase = `http://127.0.0.1:${APP_PORT}`;
for (let attempt = 0; attempt < 300; attempt++) {
  try { if ((await fetch(appBase + '/api/conversations')).status === 401) break; } catch {}
  if (next.exitCode !== null) throw new Error(log);
  await new Promise((r) => setTimeout(r, 300));
}

console.log('\n================ CHAT EVIDENCE FIXTURE READY ================');
console.log('mode             :', BEFORE ? 'BEFORE (fixes omitted)' : 'AFTER (main)');
console.log('migrations loaded:', migrations.length);
console.log('app              :', appBase);
console.log('conversation ids :', JSON.stringify(ids));
console.log('students         :', JSON.stringify(names));
for (const n of everyone) console.log(`token ${names[n].padEnd(8)}  : ${tokens[n]}`);
console.log('=============================================================\n');

const shutdown = async () => {
  next.kill('SIGTERM');
  await new Promise((r) => service.close(() => r()));
  await db.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
