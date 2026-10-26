import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
const chat=['20261012120000_chat_send_text_message.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261019190100_chat_mark_read.sql'];
const invitations=['20261026120000_chat_group_invite_friends.sql','20261026120100_chat_send_group_invitation.sql'];
// The migrations chat.test.ts uses, and main's latest set including LN's school communities (which replaces
// is_current_participant and adds a same-school check on group memberships), so the invitations work either way.
const chatOnly=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql',...chat,...invitations];
const withSchools=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261020000100_like_notifications.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261022050000_integrate_notifications_with_main.sql','20261024000100_unify_notifications.sql',...chat,'20261013150000_create_event.sql','20261015120000_list_events.sql','20261026000100_school_communities.sql',...invitations];
// SRS-205.1 / SRS-205.2 / SRS-205.3 / SRS-205.4 (#484, #488): choosing and inviting friends to a group, against the
// real schema in memory (nothing hosted is touched).
it('lets only the group owner invite current friends, saving a pending invitation without adding a member', () => invitationsWork(chatOnly), 60000);
it('works the same with school communities applied', () => invitationsWork(withSchools), 60000);

async function invitationsWork(migrations: string[]) {
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
const candidates=async(n:number,c:string,q='')=>(await db.query<any>('SELECT public.socialu_group_invite_friends($1,$2,$3) AS r',[uid(n),c,q])).rows[0].r;
const invite=async(n:number,c:string,username:string)=>(await db.query<any>('SELECT public.socialu_send_group_invitation($1,$2,$3) AS r',[uid(n),c,username])).rows[0].r;
const code=(expected:string)=>(error:any)=>error.code===expected;
const count=async(sql:string,params:unknown[]=[])=>(await db.query<any>(sql,params)).rows[0].n;

// Student 1 is friends with 2, 3 and 5; student 4 is not a friend; student 1 then blocks student 5.
await befriend(1,2); await befriend(1,3); await befriend(1,5);
await friends(1,'block','student5');
const gid=(await db.query<any>('SELECT public.socialu_create_group($1) AS g',[uid(1)])).rows[0].g.id;

// SRS-205.1 (#481): the owner sees current friends only, never non-friends, blocked students or themselves.
assert.deepEqual(await candidates(1,gid),{has_more:false,friends:[
  {username:'student2',name:'Student 2',invited:false},{username:'student3',name:'Student 3',invited:false}]});
assert.deepEqual((await candidates(1,gid,'student3')).friends.map((f:any)=>f.username),['student3']);
assert.deepEqual((await candidates(1,gid,'nobody')).friends,[]);
await assert.rejects(candidates(1,gid,'x'.repeat(101)),code('SCI04'));
// Outsiders cannot tell the group exists; unknown accounts are rejected.
await assert.rejects(candidates(2,gid),code('SC404'));
await assert.rejects(candidates(1,'999999'),code('SC404'));
await assert.rejects(db.query('SELECT public.socialu_group_invite_friends($1,$2,$3)',['10000000-0000-0000-0000-000000000009',gid,'']),code('42501'));

// SRS-205.3 / SRS-205.4 (#485): inviting a friend saves one pending invitation and does not make them a member.
const first=await invite(1,gid,'student2');
assert.equal(first.created,true);
assert.deepEqual({...first.invitation,id:undefined},{id:undefined,conversation_id:gid,username:'student2',status:'pending'});
assert.equal(await count('SELECT count(*)::int AS n FROM socialu.group_memberships WHERE conversation_id=$1 AND left_at IS NULL',[gid]),1);
assert.equal(await count("SELECT count(*)::int AS n FROM socialu.group_invitations WHERE conversation_id=$1 AND invitee_id=2 AND inviter_id=1 AND status='pending'",[gid]),1);
// Inviting again returns the same waiting invitation instead of saving a second one.
const again=await invite(1,gid,'student2');
assert.equal(again.created,false); assert.equal(again.invitation.id,first.invitation.id);
assert.equal(await count('SELECT count(*)::int AS n FROM socialu.group_invitations WHERE conversation_id=$1',[gid]),1);
// The picker now shows that friend as invited.
assert.deepEqual((await candidates(1,gid)).friends.map((f:any)=>[f.username,f.invited]),[['student2',true],['student3',false]]);

// SRS-205.2: non-friends, blocked students, unknown usernames and the owner themselves cannot be invited.
for (const name of ['student4','student5','nobody','student1']) await assert.rejects(invite(1,gid,name),code('SCI02'));
assert.equal(await count('SELECT count(*)::int AS n FROM socialu.group_invitations WHERE conversation_id=$1',[gid]),1);

// A friend who is already a current member is not offered and cannot be invited again.
await db.query("INSERT INTO socialu.group_memberships(conversation_id,student_id,role) VALUES($1,3,'member')",[gid]);
assert.deepEqual((await candidates(1,gid)).friends.map((f:any)=>f.username),['student2']);
await assert.rejects(invite(1,gid,'student3'),code('SCI03'));

// Only the owner or an administrator invites: a regular member is refused, and so are outsiders.
await befriend(3,4);
await assert.rejects(candidates(3,gid),code('SCI01'));
await assert.rejects(invite(3,gid,'student4'),code('SCI01'));
await assert.rejects(invite(2,gid,'student3'),code('SC404'));
await assert.rejects(invite(1,'999999','student2'),code('SC404'));
// A private conversation has no invitations.
const dm=(await friends(1,'message','student2')).conversation_id;
await assert.rejects(candidates(1,dm),code('SCI01'));
await assert.rejects(invite(1,dm,'student3'),code('SCI01'));
assert.equal(await count('SELECT count(*)::int AS n FROM socialu.group_invitations'),1);

// Server-only: browsers (anon, authenticated) cannot call either function directly.
for (const fn of ['public.socialu_group_invite_friends(uuid,bigint,text)','public.socialu_send_group_invitation(uuid,bigint,text)']) {
 for (const role of ['anon','authenticated']) assert.equal((await db.query<any>('SELECT has_function_privilege($1,$2,$3) AS ok',[role,fn,'EXECUTE'])).rows[0].ok,false);
 assert.equal((await db.query<any>('SELECT has_function_privilege($1,$2,$3) AS ok',['service_role',fn,'EXECUTE'])).rows[0].ok,true);
}
} finally { await db.close(); }
}
