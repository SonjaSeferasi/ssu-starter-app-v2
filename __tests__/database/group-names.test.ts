import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
const chat=['20261012120000_chat_send_text_message.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261019190100_chat_mark_read.sql'];
const sprint3=['20261026120000_chat_group_invite_friends.sql','20261026120100_chat_send_group_invitation.sql','20261026130000_chat_pending_group_invitations.sql','20261026130100_chat_accept_group_invitation.sql','20261026130200_chat_decline_group_invitation.sql','20261026140000_chat_send_emoji.sql','20261026140100_chat_emoji_in_history.sql','20261026150000_chat_sender_names.sql','20261026160000_chat_name_group.sql','20261026160100_chat_group_name_display.sql','20261026170000_chat_group_name_live.sql'];
// The migrations chat.test.ts uses, and main's latest set including LN's school communities.
const chatOnly=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql',...chat,...sprint3];
const withSchools=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261020000100_like_notifications.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261022050000_integrate_notifications_with_main.sql','20261024000100_unify_notifications.sql',...chat,'20261013150000_create_event.sql','20261015120000_list_events.sql','20261026000100_school_communities.sql',...sprint3];
// SRS-202.5 / SRS-202.6 (#837, #841): name a group and show its name, against the real schema in memory
// (nothing hosted is touched).
it('lets the owner or an administrator name a group, and shows the name to its members', () => namesWork(chatOnly), 60000);
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
const friends=async(n:number,action:string,target:string,id:string|null=null)=>(await db.query<any>('SELECT public.socialu_friendships($1,$2,$3,$4) AS r',[uid(n),action,target,id])).rows[0].r;
const befriend=async(a:number,b:number)=>{ await friends(b,'accept',`student${a}`,(await friends(a,'send',`student${b}`)).request_id); };
const call=async(fn:string,n:number|string,...args:unknown[])=>(await db.query<any>(`SELECT public.${fn}(${['$1',...args.map((_,i)=>'$'+(i+2))].join(',')}) AS r`,[typeof n==='number'?uid(n):n,...args])).rows[0].r;
const rename=(n:number,c:string,name:unknown)=>call('socialu_rename_group',n,c,name);
const listed=async(n:number,c:string)=>(await call('socialu_conversation_list',n)).conversations.find((x:any)=>x.id===c);
const stored=async(c:string)=>(await db.query<any>('SELECT group_name FROM socialu.conversations WHERE conversation_id=$1',[c])).rows[0].group_name;
const code=(expected:string)=>(error:any)=>error.code===expected;

// Student 1 owns a group with member 2; student 3 has a pending invitation; student 4 is outside it.
for (const n of [2,3,4]) await befriend(1,n);
const dm=(await friends(1,'message','student2')).conversation_id;
const gid=(await call('socialu_create_group',1)).id;
await call('socialu_accept_group_invitation',2,(await call('socialu_send_group_invitation',1,gid,'student2')).invitation.id);
await call('socialu_send_group_invitation',1,gid,'student3');

// SRS-202.6: groups start without a name, so the page shows "Group chat".
assert.equal((await call('socialu_conversation_messages',1,gid)).name,null);
assert.equal((await listed(1,gid)).name,null);
assert.equal((await call('socialu_pending_group_invitations',3)).invitations[0].group_name,null);

// SRS-202.5 (#834): only the owner or an administrator can name it; nothing is saved otherwise.
await assert.rejects(rename(2,gid,'Mine now'),code('SCG01'));
await assert.rejects(rename(4,gid,'Outsider'),code('SC404'));
await assert.rejects(rename(3,gid,'Not yet'),code('SC404'));
await assert.rejects(rename(1,dm,'Private chat'),code('SCG01'));
for (const bad of ['','   ','x'.repeat(51),null]) await assert.rejects(rename(1,gid,bad),code('SCG02'));
await assert.rejects(call('socialu_rename_group','10000000-0000-0000-0000-000000000009',gid,'Nobody'),code('42501'));
assert.equal(await stored(gid),null);

// The owner names it: extra spaces and line breaks are tidied, and 50 characters is allowed.
assert.deepEqual(await rename(1,gid,'  Study \n  group  '),{id:gid,name:'Study group'});
assert.equal((await rename(1,gid,'y'.repeat(50))).name,'y'.repeat(50));
assert.deepEqual(await rename(1,gid,'CSC 351 Team 🎉'),{id:gid,name:'CSC 351 Team 🎉'});
// An administrator can rename it too.
await db.query("UPDATE socialu.group_memberships SET role='administrator' WHERE conversation_id=$1 AND student_id=2",[gid]);
assert.equal((await rename(2,gid,'Study buddies')).name,'Study buddies');

// #844: each saved name is sent live to every current member's channel; the invited student, outsiders and
// refused renames get nothing.
const renames=async(n:number)=>(await db.query<any>("SELECT payload FROM realtime.sent WHERE topic=$1 AND event='conversation_updated'",['student:'+uid(n)])).rows.map(r=>r.payload);
const sent=['Study group','y'.repeat(50),'CSC 351 Team 🎉','Study buddies'].map((name)=>({conversation_id:gid,name}));
assert.deepEqual(await renames(1),sent);
assert.deepEqual(await renames(2),sent);
assert.deepEqual(await renames(3),[]);
assert.deepEqual(await renames(4),[]);

// SRS-202.6 (#839): members see the name in the history, the Messages list and the pending invitation.
for (const n of [1,2]) {
  assert.equal((await call('socialu_conversation_messages',n,gid)).name,'Study buddies');
  assert.equal((await listed(n,gid)).name,'Study buddies');
}
assert.equal((await call('socialu_pending_group_invitations',3)).invitations[0].group_name,'Study buddies');
// DMs are unchanged: they still show the friend's name, and the history has no group name.
assert.equal((await listed(1,dm)).name,'Student 2');
assert.equal((await call('socialu_conversation_messages',1,dm)).name,null);
// Everything else in the history is as before.
const hello=await call('socialu_send_message',2,gid,'Hello');
assert.deepEqual((await call('socialu_conversation_messages',1,gid)).messages,[hello]);

// The table itself refuses names on private conversations and untidy names.
await assert.rejects(db.query("UPDATE socialu.conversations SET group_name='Pair' WHERE conversation_id=$1",[dm]));
await assert.rejects(db.query("UPDATE socialu.conversations SET group_name=' Padded' WHERE conversation_id=$1",[gid]));
assert.equal(await stored(gid),'Study buddies');

// The replaced list keeps LN's school rule where her migration is installed.
const listDef=(await db.query<any>("SELECT pg_get_functiondef('public.socialu_conversation_list(uuid)'::regprocedure) AS d")).rows[0].d;
assert.equal(listDef.includes('socialu.community_unavailable(me, m.peer_id)'),migrations===withSchools);
assert.ok(listDef.includes('socialu.is_current_participant(m.conversation_id, me)'));

// Server-only: browsers (anon, authenticated) cannot call the new or replaced functions directly.
for (const fn of ['public.socialu_rename_group(uuid,bigint,text)','public.socialu_conversation_messages(uuid,bigint)','public.socialu_conversation_list(uuid)','public.socialu_pending_group_invitations(uuid)']) {
 for (const role of ['anon','authenticated']) assert.equal((await db.query<any>('SELECT has_function_privilege($1,$2,$3) AS ok',[role,fn,'EXECUTE'])).rows[0].ok,false);
 assert.equal((await db.query<any>('SELECT has_function_privilege($1,$2,$3) AS ok',['service_role',fn,'EXECUTE'])).rows[0].ok,true);
}
} finally { await db.close(); }
}
