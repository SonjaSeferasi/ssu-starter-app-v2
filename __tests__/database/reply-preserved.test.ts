import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
const chat=['20261012120000_chat_send_text_message.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261019190100_chat_mark_read.sql'];
const sprint3=['20261026120000_chat_group_invite_friends.sql','20261026120100_chat_send_group_invitation.sql','20261026130000_chat_pending_group_invitations.sql','20261026130100_chat_accept_group_invitation.sql','20261026130200_chat_decline_group_invitation.sql','20261026140000_chat_send_emoji.sql','20261026140100_chat_emoji_in_history.sql','20261026150000_chat_sender_names.sql','20261026160000_chat_name_group.sql','20261026160100_chat_group_name_display.sql','20261026170000_chat_group_name_live.sql','20261026180000_chat_message_notifications.sql','20261026180100_chat_group_invitation_live.sql','20261027120000_chat_reaction_set.sql','20261027120100_chat_react_to_message.sql','20261027120200_chat_reactions_in_history.sql','20261028120000_chat_assign_group_admin.sql','20261028120100_chat_revoke_group_admin.sql','20261028120200_chat_remove_group_member.sql','20261028120300_chat_leave_group.sql','20261028120400_chat_transfer_group_ownership.sql'];
const reply=['20261102120000_chat_send_reply.sql','20261102130000_chat_reply_in_history.sql'];
const chatOnly=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql',...chat,...sprint3,...reply];

// SRS-209.6 (#1000, #1002): the relationship between a reply and the message it answers is retained while both
// messages remain in the conversation. Run against the real schema in memory; nothing hosted is touched.
it('keeps a reply pointing at its target through membership and role changes, and refuses to orphan it', () => preserved(chatOnly), 60000);

async function preserved(migrations: string[]) {
const db=new PGlite();
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
const send=(n:number,c:string,text:string,replyTo:string|null=null)=>call('socialu_send_message',n,c,text,replyTo);
const history=(n:number,c:string)=>call('socialu_conversation_messages',n,c);
const storedTarget=async(id:string)=>(await db.query<any>('SELECT reply_to_id::text AS t FROM socialu.messages WHERE message_id=$1',[id])).rows[0].t;

for (const n of [2,3]) await befriend(1,n);
const gid=(await call('socialu_create_group',1)).id;
for (const n of [2,3]) await call('socialu_accept_group_invitation',n,(await call('socialu_send_group_invitation',1,gid,`student${n}`)).invitation.id);

const original=await send(1,gid,'Who is bringing the projector?');
const answer=await send(2,gid,'I can bring it',original.id);
assert.equal(await storedTarget(answer.id),original.id);

// The relationship survives the group being renamed.
await call('socialu_rename_group',1,gid,'Project team');
assert.equal(await storedTarget(answer.id),original.id);

// It survives role changes: student 2 becomes administrator, then is demoted again.
await call('socialu_assign_group_admin',1,gid,'student2');
assert.equal(await storedTarget(answer.id),original.id);
await call('socialu_revoke_group_admin',1,gid,'student2');
assert.equal(await storedTarget(answer.id),original.id);

// It survives the target's own sender leaving the group. Student 1 is the owner, so hand the group over first.
await call('socialu_assign_group_admin',1,gid,'student2');
await call('socialu_leave_group',1,gid);
assert.equal(await storedTarget(answer.id),original.id);
// And student 2, who can still read both, is still shown the quote.
const afterLeaving=await history(2,gid);
assert.equal(afterLeaving.replies[answer.id].id,original.id);
assert.equal(afterLeaving.replies[answer.id].sender_name,'Student 1');

// It survives a regular member being removed.
await call('socialu_remove_group_member',2,gid,'student3');
assert.equal(await storedTarget(answer.id),original.id);

// The schema refuses to orphan a reply: the foreign key on (reply_to_id, conversation_id) has no ON DELETE
// action, so a message that is still answered cannot simply be deleted out from under its reply.
await assert.rejects(
  db.query('DELETE FROM socialu.messages WHERE message_id=$1',[original.id]),
  (error: any) => error.code === '23503',
);
assert.equal(await storedTarget(answer.id),original.id);
// Deleting the reply itself is not blocked by that key, and leaves the target untouched.
await db.query('DELETE FROM socialu.messages WHERE message_id=$1',[answer.id]);
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.messages WHERE message_id=$1',[original.id])).rows[0].n,1);
} finally { await db.close(); }
}
