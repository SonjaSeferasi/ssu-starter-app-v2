import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
const chat=['20261012120000_chat_send_text_message.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261019190100_chat_mark_read.sql'];
const invitations=['20261026120000_chat_group_invite_friends.sql','20261026120100_chat_send_group_invitation.sql','20261026130000_chat_pending_group_invitations.sql','20261026130100_chat_accept_group_invitation.sql','20261026130200_chat_decline_group_invitation.sql'];
// The migrations chat.test.ts uses, and main's latest set including LN's school communities (which adds a
// same-school check on group memberships), so answering invitations works either way.
const chatOnly=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql',...chat,...invitations];
const withSchools=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261020000100_like_notifications.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261022050000_integrate_notifications_with_main.sql','20261024000100_unify_notifications.sql',...chat,'20261013150000_create_event.sql','20261015120000_list_events.sql','20261026000100_school_communities.sql',...invitations];
// SRS-205.5 to SRS-205.9 (#492, #496, #794, #500): presenting, accepting (and joining) and declining group
// invitations, against the real schema in memory (nothing hosted is touched).
it('shows pending invitations to the invited student, who can accept (and join) or decline', () => answersWork(chatOnly), 60000);
it('works the same with school communities applied', () => answersWork(withSchools), 60000);

async function answersWork(migrations: string[]) {
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
const pending=async(n:number)=>(await call('socialu_pending_group_invitations',n)).invitations;
const accept=(n:number,id:string)=>call('socialu_accept_group_invitation',n,id);
const decline=(n:number,id:string)=>call('socialu_decline_group_invitation',n,id);
const code=(expected:string)=>(error:any)=>error.code===expected;
const member=async(n:number,c:string)=>(await db.query<any>('SELECT role FROM socialu.group_memberships WHERE conversation_id=$1 AND student_id=$2 AND left_at IS NULL',[c,n])).rows[0]?.role ?? null;

// Student 1 owns a group and invites friends 2, 3 and 4. Student 5 is not invited.
for (const n of [2,3,4]) await befriend(1,n);
const gid=(await call('socialu_create_group',1)).id;
const before=await call('socialu_send_message',1,gid,'Before you joined');
const ids:Record<number,string>={};
for (const n of [2,3,4]) ids[n]=(await call('socialu_send_group_invitation',1,gid,`student${n}`)).invitation.id;

// SRS-205.5 (#489): each invited student sees only their own pending invitation, with who sent it.
assert.deepEqual(await pending(2),[{id:ids[2],conversation_id:gid,inviter:{username:'student1',name:'Student 1'},member_count:1}]);
assert.deepEqual(await pending(5),[]);
assert.deepEqual(await pending(1),[]);
await assert.rejects(call('socialu_pending_group_invitations','10000000-0000-0000-0000-000000000009'),code('42501'));

// Only the invited student can answer: the inviter and other students get the same "not available" answer.
await assert.rejects(accept(1,ids[2]),code('SCI05'));
await assert.rejects(accept(3,ids[2]),code('SCI05'));
await assert.rejects(decline(5,ids[2]),code('SCI05'));
await assert.rejects(accept(2,'999999'),code('SCI05'));
assert.equal(await member(2,gid),null);

// SRS-205.6 / SRS-205.7 (#493, #791): accepting records it and makes the student a regular member, in one step.
assert.deepEqual(await accept(2,ids[2]),{conversation_id:gid,member_count:2});
assert.equal(await member(2,gid),'member');
assert.equal((await db.query<any>('SELECT status FROM socialu.group_invitations WHERE invitation_id=$1',[ids[2]])).rows[0].status,'accepted');
assert.deepEqual(await pending(2),[]);
// Answering again is refused, in either direction.
await assert.rejects(accept(2,ids[2]),code('SCI05'));
await assert.rejects(decline(2,ids[2]),code('SCI05'));
// The new member can open and use the group: it is in their list, they can send, and they read messages from
// their membership period only (the owner's earlier message stays hidden, SRS-213.4/213.5).
const theirs=(await call('socialu_conversation_list',2)).conversations.find((c:any)=>c.id===gid);
assert.equal(theirs.kind,'group'); assert.equal(theirs.member_count,2);
const hello=await call('socialu_send_message',2,gid,'Thanks for the invite');
const history=await call('socialu_conversation_messages',2,gid);
assert.equal(history.role,'member'); assert.equal(history.member_count,2);
assert.deepEqual(history.messages.map((m:any)=>m.id),[hello.id]);
assert.ok(!history.messages.some((m:any)=>m.id===before.id));
// The owner's pending list for the group no longer offers the new member.
assert.deepEqual((await call('socialu_group_invite_friends',1,gid,'')).friends.map((f:any)=>f.username),['student3','student4']);

// SRS-205.8 / SRS-205.9 (#497): declining records it and the student is never added.
assert.deepEqual(await decline(3,ids[3]),{id:ids[3],status:'declined'});
assert.equal(await member(3,gid),null);
assert.deepEqual(await pending(3),[]);
await assert.rejects(accept(3,ids[3]),code('SCI05'));
await assert.rejects(call('socialu_conversation_messages',3,gid),code('SC404'));

// A student who blocks the inviter no longer sees the invitation and cannot accept it.
await friends(4,'block','student1');
assert.deepEqual(await pending(4),[]);
await assert.rejects(accept(4,ids[4]),code('SCI05'));
assert.equal(await member(4,gid),null);
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.group_memberships WHERE conversation_id=$1 AND left_at IS NULL',[gid])).rows[0].n,2);

// Server-only: browsers (anon, authenticated) cannot call these functions directly.
for (const fn of ['public.socialu_pending_group_invitations(uuid)','public.socialu_accept_group_invitation(uuid,bigint)','public.socialu_decline_group_invitation(uuid,bigint)']) {
 for (const role of ['anon','authenticated']) assert.equal((await db.query<any>('SELECT has_function_privilege($1,$2,$3) AS ok',[role,fn,'EXECUTE'])).rows[0].ok,false);
 assert.equal((await db.query<any>('SELECT has_function_privilege($1,$2,$3) AS ok',['service_role',fn,'EXECUTE'])).rows[0].ok,true);
}
} finally { await db.close(); }
}
