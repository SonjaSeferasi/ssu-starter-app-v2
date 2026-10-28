import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
const chat=['20261012120000_chat_send_text_message.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261019190100_chat_mark_read.sql'];
const sprint3=['20261026120000_chat_group_invite_friends.sql','20261026120100_chat_send_group_invitation.sql','20261026130000_chat_pending_group_invitations.sql','20261026130100_chat_accept_group_invitation.sql','20261026130200_chat_decline_group_invitation.sql','20261026140000_chat_send_emoji.sql','20261026140100_chat_emoji_in_history.sql','20261026150000_chat_sender_names.sql','20261026160000_chat_name_group.sql','20261026160100_chat_group_name_display.sql','20261026170000_chat_group_name_live.sql','20261026180000_chat_message_notifications.sql','20261026180100_chat_group_invitation_live.sql','20261027120000_chat_reaction_set.sql','20261027120100_chat_react_to_message.sql','20261027120200_chat_reactions_in_history.sql','20261028120000_chat_assign_group_admin.sql'];
// The migrations chat.test.ts uses, and main's latest set including LN's school communities.
const chatOnly=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql',...chat,...sprint3];
const withSchools=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261020000100_like_notifications.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261022050000_integrate_notifications_with_main.sql','20261024000100_unify_notifications.sql',...chat,'20261013150000_create_event.sql','20261015120000_list_events.sql','20261026000100_school_communities.sql',...sprint3];

// SRS-204.2 (#883): the group owner gives one current regular member the administrator role, against the real
// schema in memory (nothing hosted is touched). SRS-204.1 picks the member; SRS-204.3/204.4 keep one
// administrator; SRS-204.5 restricts it to the owner; SRS-204.9 leaves ownership alone.
it('lets only the owner make one current regular member the administrator', () => adminWorks(chatOnly), 60000);
it('works the same with school communities applied', () => adminWorks(withSchools), 60000);

async function adminWorks(migrations: string[]) {
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
const assign=(n:number|string,c:string,username:unknown)=>call('socialu_assign_group_admin',n,c,username);
const members=async(n:number,c:string)=>(await call('socialu_group_members',n,c)).members;
const roleOf=async(c:string,student:number)=>(await db.query<any>('SELECT role FROM socialu.group_memberships WHERE conversation_id=$1 AND student_id=$2 AND left_at IS NULL',[c,student])).rows[0]?.role;
const code=(expected:string)=>(error:any)=>error.code===expected;

// Student 1 owns a group with members 2 and 3; student 4 has a pending invitation; student 5 is outside it.
for (const n of [2,3,4,5]) await befriend(1,n);
const dm=(await friends(1,'message','student2')).conversation_id;
const gid=(await call('socialu_create_group',1)).id;
for (const n of [2,3]) await call('socialu_accept_group_invitation',n,(await call('socialu_send_group_invitation',1,gid,`student${n}`)).invitation.id);
await call('socialu_send_group_invitation',1,gid,'student4');

// SRS-204.1: the owner sees the group's current members, owner first, with their roles.
assert.deepEqual((await members(1,gid)).map((m:any)=>[m.username,m.role]),[['student1','owner'],['student2','member'],['student3','member']]);
// Every current member may read the list; the invitee and outsiders may not, and neither is this a DM.
assert.equal((await members(2,gid)).length,3);
await assert.rejects(call('socialu_group_members',4,gid),code('SC404'));
await assert.rejects(call('socialu_group_members',5,gid),code('SC404'));
await assert.rejects(call('socialu_group_members',1,dm),code('SC404'));

// SRS-204.5: regular members, the invitee and outsiders cannot assign; nothing changes.
for (const n of [2,3]) await assert.rejects(assign(n,gid,'student3'),code('SCA01'));
await assert.rejects(assign(4,gid,'student2'),code('SC404'));
await assert.rejects(assign(5,gid,'student2'),code('SC404'));
await assert.rejects(assign(1,dm,'student2'),code('SCA01'));
await assert.rejects(assign('10000000-0000-0000-0000-000000000009',gid,'student2'),code('42501'));
assert.equal(await roleOf(gid,2),'member');

// SRS-204.1: the chosen student must be a current regular member of this group.
for (const bad of ['student4','student5','nobody','',' ',null]) await assert.rejects(assign(1,gid,bad),code('SCA03'));
// The owner cannot hand the administrator role to themselves.
await assert.rejects(assign(1,gid,'student1'),code('SCA03'));

// SRS-204.2: the selected member's role becomes administrator.
assert.deepEqual(await assign(1,gid,'student2'),{conversation_id:gid,member:{student_id:'2',username:'student2',name:'Student 2',role:'administrator'}});
assert.equal(await roleOf(gid,2),'administrator');
// SRS-204.9: ownership is unchanged, and nobody else's role moved.
assert.equal(await roleOf(gid,1),'owner');
assert.equal(await roleOf(gid,3),'member');
assert.deepEqual((await members(1,gid)).map((m:any)=>[m.username,m.role]),[['student1','owner'],['student2','administrator'],['student3','member']]);

// SRS-204.3 / SRS-204.4: a second administrator is refused while the position is filled, including re-assigning
// the same student; the first administrator keeps the role.
await assert.rejects(assign(1,gid,'student3'),code('SCA02'));
await assert.rejects(assign(1,gid,'student2'),code('SCA02'));
assert.equal(await roleOf(gid,2),'administrator');
assert.equal(await roleOf(gid,3),'member');
// Once the position is vacant again, the owner can assign another member.
await db.query("UPDATE socialu.group_memberships SET role='member' WHERE conversation_id=$1 AND student_id=2",[gid]);
assert.equal((await assign(1,gid,'student3')).member.role,'administrator');
assert.equal(await roleOf(gid,3),'administrator');

// The table itself still refuses a second current administrator.
await assert.rejects(db.query("UPDATE socialu.group_memberships SET role='administrator' WHERE conversation_id=$1 AND student_id=2",[gid]));
// A member who left is no longer eligible, even with the administrator position vacant, and the group still has
// exactly one owner.
await db.query('UPDATE socialu.group_memberships SET left_at=now() WHERE conversation_id=$1 AND student_id=2',[gid]);
await db.query("UPDATE socialu.group_memberships SET role='member' WHERE conversation_id=$1 AND student_id=3",[gid]);
await assert.rejects(assign(1,gid,'student2'),code('SCA03'));
assert.equal((await db.query<any>("SELECT count(*)::int AS n FROM socialu.group_memberships WHERE conversation_id=$1 AND role='owner' AND left_at IS NULL",[gid])).rows[0].n,1);

// Server-only: browsers (anon, authenticated) cannot call the new functions directly.
for (const fn of ['public.socialu_assign_group_admin(uuid,bigint,text)','public.socialu_group_members(uuid,bigint)']) {
 for (const role of ['anon','authenticated']) assert.equal((await db.query<any>('SELECT has_function_privilege($1,$2,$3) AS ok',[role,fn,'EXECUTE'])).rows[0].ok,false);
 assert.equal((await db.query<any>('SELECT has_function_privilege($1,$2,$3) AS ok',['service_role',fn,'EXECUTE'])).rows[0].ok,true);
}
} finally { await db.close(); }
}
