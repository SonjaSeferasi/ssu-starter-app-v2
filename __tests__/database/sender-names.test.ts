import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
const chat=['20261012120000_chat_send_text_message.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261019190100_chat_mark_read.sql'];
const sprint3=['20261026120000_chat_group_invite_friends.sql','20261026120100_chat_send_group_invitation.sql','20261026130000_chat_pending_group_invitations.sql','20261026130100_chat_accept_group_invitation.sql','20261026130200_chat_decline_group_invitation.sql','20261026140000_chat_send_emoji.sql','20261026140100_chat_emoji_in_history.sql','20261026150000_chat_sender_names.sql'];
// The migrations chat.test.ts uses, and main's latest set including LN's school communities.
const chatOnly=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql',...chat,...sprint3];
const withSchools=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261020000100_like_notifications.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261022050000_integrate_notifications_with_main.sql','20261024000100_unify_notifications.sql',...chat,'20261013150000_create_event.sql','20261015120000_list_events.sql','20261026000100_school_communities.sql',...sprint3];
// SRS-211.1 (#832): the history names the sender of each message, against the real schema in memory
// (nothing hosted is touched).
it('returns each sender’s name with the saved messages', () => namesWork(chatOnly), 60000);
it('works the same with school communities applied', () => namesWork(withSchools), 60000);

async function namesWork(migrations: string[]) {
const db=new PGlite();
// Minimal stand-ins for Supabase's auth and realtime schemas, as in chat.test.ts.
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid', true), '')::uuid$$;
CREATE SCHEMA realtime;CREATE TABLE realtime.messages(extension text,topic text);CREATE TABLE realtime.sent(topic text,event text,payload jsonb);
CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql AS $$SELECT nullif(current_setting('test.topic', true), '')$$;
CREATE FUNCTION realtime.send(payload jsonb,event text,topic text,private boolean) RETURNS void LANGUAGE sql AS 'INSERT INTO realtime.sent VALUES($3,$2,$1)';`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
try {
for(const file of migrations) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));
const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
for (let n=1;n<=4;n++) {
 await db.query('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
 await db.query('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n)]);
}
// Student 2 has a display name, which is shown instead of their full name, as elsewhere in SocialU.
await db.exec("INSERT INTO socialu.student_profiles(student_id,display_name) VALUES(2,'Sam')");
const friends=async(n:number,action:string,target:string,id:string|null=null)=>(await db.query<any>('SELECT public.socialu_friendships($1,$2,$3,$4) AS r',[uid(n),action,target,id])).rows[0].r;
const befriend=async(a:number,b:number)=>{ await friends(b,'accept',`student${a}`,(await friends(a,'send',`student${b}`)).request_id); };
const call=async(fn:string,n:number|string,...args:unknown[])=>(await db.query<any>(`SELECT public.${fn}(${['$1',...args.map((_,i)=>'$'+(i+2))].join(',')}) AS r`,[typeof n==='number'?uid(n):n,...args])).rows[0].r;
const history=(n:number,c:string)=>call('socialu_conversation_messages',n,c);
const code=(expected:string)=>(error:any)=>error.code===expected;
const name=(n:number,display=`Student ${n}`)=>({name:display,username:`student${n}`});

// A private conversation names both students, even before anyone has written.
await befriend(1,2); await befriend(1,3);
const dm=(await friends(1,'message','student2')).conversation_id;
assert.deepEqual((await history(1,dm)).senders,{'1':name(1),'2':name(2,'Sam')});
const hello=await call('socialu_send_message',2,dm,'Hello');
const dmHistory=await history(1,dm);
// The messages are returned exactly as before (same fields as the live event).
assert.deepEqual(dmHistory.messages,[hello]);
assert.equal(dmHistory.senders[hello.sender_id].name,'Sam');

// A group names its current members, and the sender of every message the student can read.
const gid=(await call('socialu_create_group',1)).id;
const first=await call('socialu_send_message',1,gid,'Welcome');
for (const n of [2,3]) await call('socialu_accept_group_invitation',n,(await call('socialu_send_group_invitation',1,gid,`student${n}`)).invitation.id);
const fromSam=await call('socialu_send_message',2,gid,'Hi all');
const wave=await call('socialu_send_emoji',3,gid,'👋');
const owner=await history(1,gid);
assert.deepEqual(owner.messages.map((m:any)=>m.id),[first.id,fromSam.id,wave.id]);
assert.deepEqual(owner.senders,{'1':name(1),'2':name(2,'Sam'),'3':name(3)});
for (const m of owner.messages) assert.ok(owner.senders[m.sender_id],'every message has a named sender');
// Student 3 joined after the first message, so they don't see it, but they still get every member's name.
const late=await history(3,gid);
assert.deepEqual(late.messages.map((m:any)=>m.id),[fromSam.id,wave.id]);
assert.deepEqual(Object.keys(late.senders).sort(),['1','2','3']);

// Outsiders get no messages and no names.
await assert.rejects(history(4,gid),code('SC404'));
await assert.rejects(history(4,dm),code('SC404'));

// Server-only, as before: browsers (anon, authenticated) cannot call the replaced function directly.
const fn='public.socialu_conversation_messages(uuid,bigint)';
for (const role of ['anon','authenticated']) assert.equal((await db.query<any>('SELECT has_function_privilege($1,$2,$3) AS ok',[role,fn,'EXECUTE'])).rows[0].ok,false);
assert.equal((await db.query<any>('SELECT has_function_privilege($1,$2,$3) AS ok',['service_role',fn,'EXECUTE'])).rows[0].ok,true);
} finally { await db.close(); }
}
