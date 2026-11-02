import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
const chat=['20261012120000_chat_send_text_message.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261019190100_chat_mark_read.sql'];
const sprint3=['20261026120000_chat_group_invite_friends.sql','20261026120100_chat_send_group_invitation.sql','20261026130000_chat_pending_group_invitations.sql','20261026130100_chat_accept_group_invitation.sql','20261026130200_chat_decline_group_invitation.sql','20261026140000_chat_send_emoji.sql','20261026140100_chat_emoji_in_history.sql','20261026150000_chat_sender_names.sql','20261026160000_chat_name_group.sql','20261026160100_chat_group_name_display.sql','20261026170000_chat_group_name_live.sql','20261026180000_chat_message_notifications.sql','20261026180100_chat_group_invitation_live.sql','20261027120000_chat_reaction_set.sql','20261027120100_chat_react_to_message.sql','20261027120200_chat_reactions_in_history.sql','20261028120000_chat_assign_group_admin.sql','20261028120100_chat_revoke_group_admin.sql','20261028120200_chat_remove_group_member.sql','20261028120300_chat_leave_group.sql','20261028120400_chat_transfer_group_ownership.sql'];
const reply=['20261102120000_chat_send_reply.sql','20261102130000_chat_reply_in_history.sql'];
const chatOnly=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql',...chat,...sprint3,...reply];
const withSchools=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261020000100_like_notifications.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261022050000_integrate_notifications_with_main.sql','20261024000100_unify_notifications.sql',...chat,'20261013150000_create_event.sql','20261015120000_list_events.sql','20261026000100_school_communities.sql',...sprint3,...reply];

// SRS-209.5 (#997): each reply arrives with the message it answers, so the page can show which message a reply
// responds to. Run against the real schema in memory; nothing hosted is touched.
it('returns the message each reply answers, and omits one the student cannot read', () => historyWorks(chatOnly), 60000);
it('works the same with school communities applied', () => historyWorks(withSchools), 60000);

async function historyWorks(migrations: string[]) {
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
const send=(n:number,c:string,text:string,replyTo:string|null=null)=>call('socialu_send_message',n,c,text,replyTo);
const history=(n:number,c:string)=>call('socialu_conversation_messages',n,c);

// Student 1 owns a group with members 2 and 3.
for (const n of [2,3,4]) await befriend(1,n);
const gid=(await call('socialu_create_group',1)).id;
for (const n of [2,3]) await call('socialu_accept_group_invitation',n,(await call('socialu_send_group_invitation',1,gid,`student${n}`)).invitation.id);

const original=await send(1,gid,'Who is bringing the projector?');
const answer=await send(2,gid,'I can bring it',original.id);
const plain=await send(3,gid,'Thanks');

// SRS-209.5: the reply carries the message it answers, with that message's own sender name.
const seen=await history(1,gid);
assert.deepEqual(seen.replies[answer.id],{
  id:original.id, sender_id:(await db.query<any>('SELECT sender_id::text AS s FROM socialu.messages WHERE message_id=$1',[original.id])).rows[0].s,
  sender_name:'Student 1', text:'Who is bringing the projector?',
});
// A message that is not a reply is simply absent, so nothing changes for a conversation without any.
assert.equal(seen.replies[plain.id],undefined);
assert.equal(seen.replies[original.id],undefined);
// The replying message itself also names its target, so a page can match them up without the map.
assert.equal(seen.messages.find((m:any)=>m.id===answer.id).reply_to_id,original.id);
assert.equal(seen.messages.find((m:any)=>m.id===plain.id).reply_to_id,undefined);

// An emoji target is marked, so the page can show it the way it shows emoji messages.
const emoji=await call('socialu_send_emoji',1,gid,'\u{1F600}');
const toEmoji=await send(2,gid,'nice',emoji.id);
assert.equal((await history(1,gid)).replies[toEmoji.id].kind,'emoji');

// SRS-209.6: student 4 joins after these messages, so the target is out of their reach. The reply is still
// listed, but without the quoted original, and the stored relationship is untouched in the database.
await call('socialu_accept_group_invitation',4,(await call('socialu_send_group_invitation',1,gid,'student4')).invitation.id);
const late=await history(4,gid);
assert.equal(late.replies[answer.id],undefined);
assert.equal((await db.query<any>('SELECT reply_to_id::text AS t FROM socialu.messages WHERE message_id=$1',[answer.id])).rows[0].t,original.id);

// Everything else about the history is unchanged: the same keys are still returned.
for (const key of ['student_id','kind','name','role','member_count','messages','senders','reactions','replies']) {
  assert.ok(key in seen, 'missing key ' + key);
}
} finally { await db.close(); }
}
