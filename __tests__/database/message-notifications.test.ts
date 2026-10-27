import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
const chat=['20261012120000_chat_send_text_message.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261019190100_chat_mark_read.sql'];
const sprint3=['20261026120000_chat_group_invite_friends.sql','20261026120100_chat_send_group_invitation.sql','20261026130000_chat_pending_group_invitations.sql','20261026130100_chat_accept_group_invitation.sql','20261026130200_chat_decline_group_invitation.sql','20261026140000_chat_send_emoji.sql','20261026140100_chat_emoji_in_history.sql','20261026150000_chat_sender_names.sql','20261026160000_chat_name_group.sql','20261026160100_chat_group_name_display.sql','20261026170000_chat_group_name_live.sql','20261026180000_chat_message_notifications.sql','20261026180100_chat_group_invitation_live.sql'];
// The migrations chat.test.ts uses, and main's latest set including LN's school communities.
const chatOnly=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql',...chat,...sprint3];
const withSchools=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261020000100_like_notifications.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261022050000_integrate_notifications_with_main.sql','20261024000100_unify_notifications.sql',...chat,'20261013150000_create_event.sql','20261015120000_list_events.sql','20261026000100_school_communities.sql',...sprint3];
// SRS-212.9 (#824): message notifications and live group invitations, against the real schema in memory
// (nothing hosted is touched).
it('notifies other participants of messages they have not seen, and sends new group invitations live', () => notificationsWork(chatOnly), 60000);
it('works the same with school communities applied', () => notificationsWork(withSchools), 60000);

async function notificationsWork(migrations: string[]) {
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
for (let n=1;n<=5;n++) {
 await db.query('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
 await db.query('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n)]);
}
const friends=async(n:number,action:string,target:string,id:string|null=null)=>(await db.query<any>('SELECT public.socialu_friendships($1,$2,$3,$4) AS r',[uid(n),action,target,id])).rows[0].r;
const befriend=async(a:number,b:number)=>{ await friends(b,'accept',`student${a}`,(await friends(a,'send',`student${b}`)).request_id); };
const call=async(fn:string,n:number|string,...args:unknown[])=>(await db.query<any>(`SELECT public.${fn}(${['$1',...args.map((_,i)=>'$'+(i+2))].join(',')}) AS r`,[typeof n==='number'?uid(n):n,...args])).rows[0].r;
const notes=async(n:number)=>(await call('socialu_message_notifications',n)).notifications;
const invitesTo=async(n:number)=>(await db.query<any>("SELECT payload FROM realtime.sent WHERE topic=$1 AND event='group_invitation_created'",['student:'+uid(n)])).rows.map(r=>r.payload);
const code=(expected:string)=>(error:any)=>error.code===expected;
const sender=(n:number)=>({username:`student${n}`,name:`Student ${n}`,photo_key:null});

for (const n of [2,3,4]) await befriend(1,n);
const dm=(await friends(1,'message','student2')).conversation_id;
assert.deepEqual(await notes(1),[]);

// #822: messages from the other student that haven't been seen are one notification, naming the sender and the
// conversation, with how many are new. The sender gets none.
await call('socialu_send_message',2,dm,'Hello');
const latest=await call('socialu_send_message',2,dm,'Are you there?');
assert.deepEqual(await notes(1),[{conversation_id:dm,kind:'private',name:'Student 2',sender:sender(2),text:'Are you there?',
  message_kind:'text',unread_count:2,sent_at:latest.sent_at}]);
assert.deepEqual(await notes(2),[]);
// Opening the conversation (SRS-212.5) clears it; a message read while the chat is open never shows.
await call('socialu_mark_conversation_read',1,dm);
assert.deepEqual(await notes(1),[]);

// #823: a new group invitation is sent live to the invited student only, once.
const gid=(await call('socialu_create_group',1)).id;
const inv3=(await call('socialu_send_group_invitation',1,gid,'student3')).invitation.id;
await call('socialu_send_group_invitation',1,gid,'student4');
await call('socialu_send_group_invitation',1,gid,'student4');
assert.deepEqual(await invitesTo(3),[{invitation_id:inv3,conversation_id:gid}]);
assert.equal((await invitesTo(4)).length,1);
assert.deepEqual(await invitesTo(1),[]);
assert.deepEqual(await invitesTo(5),[]);
await call('socialu_accept_group_invitation',3,inv3);

// Group messages notify the other current members; the invited student who hasn't joined, outsiders and the
// sender get nothing. Unnamed groups have no name; named ones show it.
await call('socialu_send_emoji',3,gid,'👋');
let mine=await notes(1);
assert.equal(mine.length,1);
assert.deepEqual({...mine[0],sent_at:undefined},{conversation_id:gid,kind:'group',name:null,sender:sender(3),text:'👋',message_kind:'emoji',unread_count:1,sent_at:undefined});
for (const n of [3,4,5]) assert.deepEqual(await notes(n),[]);
await call('socialu_rename_group',1,gid,'Study group');
assert.equal((await notes(1))[0].name,'Study group');

// The newest conversation comes first.
await call('socialu_send_message',2,dm,'Back again');
mine=await notes(1);
assert.deepEqual(mine.map((x:any)=>x.conversation_id),[dm,gid]);

// A DM with a blocked student is hidden, as in the Messages list.
await friends(1,'block','student2');
assert.deepEqual((await notes(1)).map((x:any)=>x.conversation_id),[gid]);
await assert.rejects(call('socialu_message_notifications','10000000-0000-0000-0000-000000000009'),code('42501'));

// LN's school rule is applied to the new function where her migration is installed.
const def=(await db.query<any>("SELECT pg_get_functiondef('public.socialu_message_notifications(uuid)'::regprocedure) AS d")).rows[0].d;
assert.equal(def.includes('socialu.community_unavailable(me, m.peer_id)'),migrations===withSchools);

// Server-only: browsers (anon, authenticated) cannot call the new or replaced functions directly.
for (const fn of ['public.socialu_message_notifications(uuid)','public.socialu_send_group_invitation(uuid,bigint,text)']) {
 for (const role of ['anon','authenticated']) assert.equal((await db.query<any>('SELECT has_function_privilege($1,$2,$3) AS ok',[role,fn,'EXECUTE'])).rows[0].ok,false);
 assert.equal((await db.query<any>('SELECT has_function_privilege($1,$2,$3) AS ok',['service_role',fn,'EXECUTE'])).rows[0].ok,true);
}
} finally { await db.close(); }
}
