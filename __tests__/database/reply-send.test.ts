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

// SRS-209.3 (#990, #991): a group participant sends a reply, and the message it answers is saved with it
// (SRS-209.4). Run against the real schema in memory; nothing hosted is touched.
it('saves a reply with the message it answers, and refuses a target it must not accept', () => replyWorks(chatOnly), 60000);
it('works the same with school communities applied', () => replyWorks(withSchools), 60000);

async function replyWorks(migrations: string[]) {
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
const storedTarget=async(id:string)=>(await db.query<any>('SELECT reply_to_id::text AS t FROM socialu.messages WHERE message_id=$1',[id])).rows[0].t;
const code=(expected:string)=>(error:any)=>error.code===expected;

// Student 1 owns a group with members 2 and 3; student 5 is outside it. 1 and 2 also share a DM.
for (const n of [2,3,5]) await befriend(1,n);
const dm=(await friends(1,'message','student2')).conversation_id;
const gid=(await call('socialu_create_group',1)).id;
for (const n of [2,3]) await call('socialu_accept_group_invitation',n,(await call('socialu_send_group_invitation',1,gid,`student${n}`)).invitation.id);

const original=await send(1,gid,'Who is bringing the projector?');

// SRS-209.3 / SRS-209.4: the reply is sent and saved against the message it answers.
const answer=await send(2,gid,'I can bring it',original.id);
assert.equal(answer.reply_to_id,original.id);
assert.equal(await storedTarget(answer.id),original.id);

// An ordinary message still works and records no target, so sending is unaffected by this change.
const plain=await send(3,gid,'Thanks');
assert.equal(plain.reply_to_id,null);
assert.equal(await storedTarget(plain.id),null);

// The reply reaches every current member over realtime, carrying the target with it.
const sent=(await db.query<any>("SELECT payload FROM realtime.sent WHERE event='message_created' AND payload->>'id'=$1",[answer.id])).rows;
assert.equal(sent.length,3);
assert.equal(sent[0].payload.reply_to_id,original.id);

// SRS-209.1: replies are a group feature; a private conversation refuses one.
const dmMessage=await send(1,dm,'Hello there');
await assert.rejects(send(1,dm,'A reply',dmMessage.id),code('SCP02'));

// A target in another conversation is refused: a reply never points across conversations (SRS-209.4).
await assert.rejects(send(1,gid,'Wrong conversation',dmMessage.id),code('SCP01'));
// A target that does not exist is refused, and looks the same as one that is merely out of reach (SRS-213.1).
await assert.rejects(send(1,gid,'No such message','999999'),code('SCP01'));

// A student outside the group cannot reply in it at all; the conversation check comes first.
await assert.rejects(send(5,gid,'Outsider',original.id),code('SC404'));

// A member who joined later cannot reply to a message sent before they joined: can_read_message limits a
// member to their own membership period, so the target is out of reach even though it is in this group.
await befriend(1,4);
await call('socialu_accept_group_invitation',4,(await call('socialu_send_group_invitation',1,gid,'student4')).invitation.id);
await assert.rejects(send(4,gid,'Late arrival',original.id),code('SCP01'));
// But a message sent after they joined is a valid target for them.
const afterJoin=await send(1,gid,'Welcome Student 4');
assert.equal((await send(4,gid,'Thanks!',afterJoin.id)).reply_to_id,afterJoin.id);

// The length and account rules are unchanged by the new parameter.
await assert.rejects(send(1,gid,'',original.id),code('22023'));
await assert.rejects(call('socialu_send_message','10000000-0000-0000-0000-000000000009',gid,'Hi',original.id),code('42501'));

// The old three-argument function is gone, so there is no ambiguity for PostgREST to resolve.
const overloads=(await db.query<any>("SELECT count(*)::int AS n FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace WHERE ns.nspname='public' AND p.proname='socialu_send_message'")).rows[0].n;
assert.equal(overloads,1);
} finally { await db.close(); }
}
