import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
const chat=['20261012120000_chat_send_text_message.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261019190100_chat_mark_read.sql'];
const sprint3=['20261026120000_chat_group_invite_friends.sql','20261026120100_chat_send_group_invitation.sql','20261026130000_chat_pending_group_invitations.sql','20261026130100_chat_accept_group_invitation.sql','20261026130200_chat_decline_group_invitation.sql','20261026140000_chat_send_emoji.sql','20261026140100_chat_emoji_in_history.sql','20261026150000_chat_sender_names.sql','20261026160000_chat_name_group.sql','20261026160100_chat_group_name_display.sql','20261026170000_chat_group_name_live.sql','20261026180000_chat_message_notifications.sql','20261026180100_chat_group_invitation_live.sql','20261027120000_chat_reaction_set.sql','20261027120100_chat_react_to_message.sql','20261027120200_chat_reactions_in_history.sql','20261028120000_chat_assign_group_admin.sql','20261028120100_chat_revoke_group_admin.sql','20261028120200_chat_remove_group_member.sql','20261028120300_chat_leave_group.sql','20261028120400_chat_transfer_group_ownership.sql'];
const photo=['20261102120000_chat_send_reply.sql','20261102130000_chat_reply_in_history.sql','20261103120000_chat_send_photo.sql','20261103130000_chat_photo_in_history.sql','20261104120000_chat_delete_photo.sql','20261112120000_chat_photo_in_list_and_notifications.sql','20261116120000_chat_delete_photo_error_order.sql','20261116130000_chat_former_member_history.sql','20261117020000_chat_delete_former_group_conversation.sql','20261117040000_chat_react_to_photo.sql','20261117050000_chat_sender_photo_in_history.sql','20261117160000_chat_private_read_status.sql'];
const migrations=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql',...chat,...sprint3,...photo];

// SRS-211.8 (#1283): the sender is told their private message has been read. SRS-211.9: a group message
// never carries that. The happy path is one line; what is worth guarding is everything the field must NOT
// say -- on a group message, on a message the student received, or about when it was read.
it('tells a sender their private message was read, and never says so in a group', async () => {
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
for (let n=1;n<=3;n++) {
 await db.query('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
 await db.query('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n)]);
}
const friends=async(n:number,action:string,target:string,id:string|null=null)=>(await db.query<any>('SELECT public.socialu_friendships($1,$2,$3,$4) AS r',[uid(n),action,target,id])).rows[0].r;
const befriend=async(a:number,b:number)=>{ await friends(b,'accept',`student${a}`,(await friends(a,'send',`student${b}`)).request_id); };
const call=async(fn:string,n:number,...args:unknown[])=>(await db.query<any>(`SELECT public.${fn}(${['$1',...args.map((_,i)=>'$'+(i+2))].join(',')}) AS r`,[uid(n),...args])).rows[0].r;
const send=(n:number,c:string,text:string)=>call('socialu_send_message',n,c,text,null);
const history=(n:number,c:string)=>call('socialu_conversation_messages',n,c);
const markRead=(n:number,c:string)=>call('socialu_mark_conversation_read',n,c);
const msg=(h:any,id:string)=>h.messages.find((m:any)=>m.id===String(id));

for (const n of [2,3]) await befriend(1,n);
await befriend(2,3);

// --- a private conversation -------------------------------------------------------------------------
const dm=(await friends(1,'message','student2')).conversation_id;
const first=await send(1,dm,'did you see this?');

// Before the recipient opens it, the sender is told false -- not nothing. The field is present because
// this IS a private message of theirs; its value is simply not yet true.
const beforeRead=msg(await history(1,dm),first.id);
assert.equal(beforeRead.read,false);

// The recipient opens the conversation (SRS-212.5), and now the sender is told.
await markRead(2,dm);
assert.equal(msg(await history(1,dm),first.id).read,true);

// --- what the recipient sees ------------------------------------------------------------------------
// Student 2 is not the sender, so they are told nothing about this message's read state at all.
const theirView=msg(await history(2,dm),first.id);
assert.ok(!Object.prototype.hasOwnProperty.call(theirView,'read'),
  'a message the student received must carry no read field');

// Their own reply behaves the same way from their side.
const reply=await send(2,dm,'just now');
assert.equal(msg(await history(2,dm),reply.id).read,false);
assert.ok(!Object.prototype.hasOwnProperty.call(msg(await history(1,dm),reply.id),'read'));

// --- SRS-211.9: a group never carries a receipt -------------------------------------------------------
const gid=(await call('socialu_create_group',1)).id;
for (const n of [2,3]) await call('socialu_accept_group_invitation',n,(await call('socialu_send_group_invitation',1,gid,`student${n}`)).invitation.id);
const inGroup=await send(1,gid,'anyone around?');
await markRead(2,gid);
await markRead(3,gid);
// Both other members have now read it. The sender is still told nothing: absent, not false.
const groupSeen=msg(await history(1,gid),inGroup.id);
assert.ok(!Object.prototype.hasOwnProperty.call(groupSeen,'read'),
  'SRS-211.9: a group message must carry no read field even when everyone has read it');
// And the reads really were recorded, so the absence above is the rule and not an empty table.
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.message_reads WHERE message_id=$1',[inGroup.id])).rows[0].n,2);

// --- it says whether, never when ----------------------------------------------------------------------
// read_at is on the row and is deliberately not exposed.
assert.equal(JSON.stringify(await history(1,dm)).includes('read_at'),false);
} finally { await db.close(); }
});
