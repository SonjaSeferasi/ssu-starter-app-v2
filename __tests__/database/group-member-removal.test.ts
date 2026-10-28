import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
const chat=['20261012120000_chat_send_text_message.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261019190100_chat_mark_read.sql'];
const sprint3=['20261026120000_chat_group_invite_friends.sql','20261026120100_chat_send_group_invitation.sql','20261026130000_chat_pending_group_invitations.sql','20261026130100_chat_accept_group_invitation.sql','20261026130200_chat_decline_group_invitation.sql','20261026140000_chat_send_emoji.sql','20261026140100_chat_emoji_in_history.sql','20261026150000_chat_sender_names.sql','20261026160000_chat_name_group.sql','20261026160100_chat_group_name_display.sql','20261026170000_chat_group_name_live.sql','20261026180000_chat_message_notifications.sql','20261026180100_chat_group_invitation_live.sql','20261027120000_chat_reaction_set.sql','20261027120100_chat_react_to_message.sql','20261027120200_chat_reactions_in_history.sql','20261028120000_chat_assign_group_admin.sql','20261028120100_chat_revoke_group_admin.sql','20261028120200_chat_remove_group_member.sql'];
// The migrations chat.test.ts uses, and main's latest set including LN's school communities.
const chatOnly=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql',...chat,...sprint3];
const withSchools=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261020000100_like_notifications.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261022050000_integrate_notifications_with_main.sql','20261024000100_unify_notifications.sql',...chat,'20261013150000_create_event.sql','20261015120000_list_events.sql','20261026000100_school_communities.sql',...sprint3];

// SRS-205.10 (#885): the owner or administrator removes a regular member, which ends their current membership
// (SRS-205.11), stops messages sent afterwards (SRS-205.12) and keeps the history they could already see
// (SRS-205.13). Run against the real schema in memory; nothing hosted is touched.
it('lets the owner or administrator remove a regular member, keeping their earlier history', () => removalWorks(chatOnly), 60000);
it('works the same with school communities applied', () => removalWorks(withSchools), 60000);

async function removalWorks(migrations: string[]) {
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
const remove=(n:number|string,c:string,username:unknown)=>call('socialu_remove_group_member',n,c,username);
const current=async(c:string)=>(await db.query<any>('SELECT student_id::int AS s FROM socialu.group_memberships WHERE conversation_id=$1 AND left_at IS NULL ORDER BY student_id',[c])).rows.map(r=>r.s);
const code=(expected:string)=>(error:any)=>error.code===expected;

// Student 1 owns a group; 2 is the administrator; 3 and 4 are regular members; 5 is outside it.
for (const n of [2,3,4,5]) await befriend(1,n);
const dm=(await friends(1,'message','student2')).conversation_id;
const gid=(await call('socialu_create_group',1)).id;
for (const n of [2,3,4]) await call('socialu_accept_group_invitation',n,(await call('socialu_send_group_invitation',1,gid,`student${n}`)).invitation.id);
await call('socialu_assign_group_admin',1,gid,'student2');
const early=await call('socialu_send_message',1,gid,'Before anyone left');
assert.deepEqual(await current(gid),[1,2,3,4]);

// SRS-206.2: a regular member cannot remove anyone; outsiders and DMs are refused too. Nothing changes.
await assert.rejects(remove(3,gid,'student4'),code('SCM01'));
await assert.rejects(remove(5,gid,'student3'),code('SC404'));
await assert.rejects(remove(1,dm,'student2'),code('SCM01'));
await assert.rejects(call('socialu_remove_group_member','10000000-0000-0000-0000-000000000009',gid,'student3'),code('42501'));
// Only a current regular member can be removed: not the owner (SRS-206.6), not the administrator, not yourself,
// not an outsider, and not a name that does not exist.
for (const who of ['student1','student2','student5','nobody','',' ',null]) await assert.rejects(remove(1,gid,who),code('SCM02'));
await assert.rejects(remove(1,gid,'student1'),code('SCM02'));
assert.deepEqual(await current(gid),[1,2,3,4]);

// SRS-205.10 / SRS-205.11: the owner removes a regular member, and the member count follows.
const removed=await remove(1,gid,'student3');
assert.deepEqual(removed,{conversation_id:gid,member_count:3,removed:{student_id:'3',username:'student3',name:'Student 3'}});
assert.deepEqual(await current(gid),[1,2,4]);
// Removing the same student again finds no current member.
await assert.rejects(remove(1,gid,'student3'),code('SCM02'));

// SRS-206.9: the administrator can remove a regular member too, but never the owner.
assert.equal((await remove(2,gid,'student4')).member_count,2);
assert.deepEqual(await current(gid),[1,2]);
await assert.rejects(remove(2,gid,'student1'),code('SCM02'));

// SRS-205.13: the messages the removed student could already see stay readable to them at the data level, which
// is what can_read_message decides for every historical read.
assert.equal((await db.query<any>('SELECT socialu.can_read_message(3,$1) AS ok',[early.id])).rows[0].ok,true);
// SRS-205.12: messages sent after the removal are not theirs to read, and they cannot send or react.
const later=await call('socialu_send_message',1,gid,'After the removal');
assert.equal((await db.query<any>('SELECT socialu.can_read_message(3,$1) AS ok',[later.id])).rows[0].ok,false);
await assert.rejects(call('socialu_send_message',3,gid,'Still here?'),code('SC404'));
await assert.rejects(call('socialu_react_to_message',3,gid,early.id,'\u{1F44D}'),code('SC404'));
// Finding, noted on #885: socialu_conversation_messages still gates on is_current_participant, so a removed
// student cannot open the conversation to see that preserved history. Showing it to them is SRS-205.13's own
// work (and SRS-207.5 / SRS-208.7 for students who leave), not part of removing a member.
await assert.rejects(call('socialu_conversation_messages',3,gid),code('SC404'));

// The group still has exactly one owner, and the removed rows were kept rather than deleted.
assert.equal((await db.query<any>("SELECT count(*)::int AS n FROM socialu.group_memberships WHERE conversation_id=$1 AND role='owner' AND left_at IS NULL",[gid])).rows[0].n,1);
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.group_memberships WHERE conversation_id=$1',[gid])).rows[0].n,4);

// Server-only: browsers (anon, authenticated) cannot call the new function directly.
for (const role of ['anon','authenticated']) assert.equal((await db.query<any>('SELECT has_function_privilege($1,$2,$3) AS ok',[role,'public.socialu_remove_group_member(uuid,bigint,text)','EXECUTE'])).rows[0].ok,false);
assert.equal((await db.query<any>('SELECT has_function_privilege($1,$2,$3) AS ok',['service_role','public.socialu_remove_group_member(uuid,bigint,text)','EXECUTE'])).rows[0].ok,true);
} finally { await db.close(); }
}
