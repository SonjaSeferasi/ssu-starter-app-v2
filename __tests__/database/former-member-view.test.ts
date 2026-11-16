import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
const chat=['20261012120000_chat_send_text_message.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261019190100_chat_mark_read.sql'];
const sprint3=['20261026120000_chat_group_invite_friends.sql','20261026120100_chat_send_group_invitation.sql','20261026130000_chat_pending_group_invitations.sql','20261026130100_chat_accept_group_invitation.sql','20261026130200_chat_decline_group_invitation.sql','20261026140000_chat_send_emoji.sql','20261026140100_chat_emoji_in_history.sql','20261026150000_chat_sender_names.sql','20261026160000_chat_name_group.sql','20261026160100_chat_group_name_display.sql','20261026170000_chat_group_name_live.sql','20261026180000_chat_message_notifications.sql','20261026180100_chat_group_invitation_live.sql','20261027120000_chat_reaction_set.sql','20261027120100_chat_react_to_message.sql','20261027120200_chat_reactions_in_history.sql','20261028120000_chat_assign_group_admin.sql','20261028120100_chat_revoke_group_admin.sql','20261028120200_chat_remove_group_member.sql','20261028120300_chat_leave_group.sql','20261028120400_chat_transfer_group_ownership.sql'];
const photo=['20261102120000_chat_send_reply.sql','20261102130000_chat_reply_in_history.sql','20261103120000_chat_send_photo.sql','20261103130000_chat_photo_in_history.sql','20261104120000_chat_delete_photo.sql','20261112120000_chat_photo_in_list_and_notifications.sql','20261116130000_chat_former_member_history.sql'];
const migrations=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql',...chat,...sprint3,...photo];

// #1222, option (b): a former group member keeps the conversation in their Messages list, read-only.
// chat-former-member-history-access.test.ts (MeriemeSakhs) covers the half she reported -- that the
// history opens at all. This file covers what listing it read-only has to get right: that the group comes
// back into the list and is marked, that nothing CURRENT about the group leaks to someone who has left,
// that every write still refuses them, and that someone who was never a member is still told nothing.
it('lists a departed group read-only without leaking anything current about it', async () => {
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
const call=async(fn:string,n:number,...args:unknown[])=>(await db.query<any>(`SELECT public.${fn}(${['$1',...args.map((_,i)=>'$'+(i+2))].join(',')}) AS r`,[uid(n),...args])).rows[0].r;
const send=(n:number,c:string,text:string)=>call('socialu_send_message',n,c,text,null);
const history=(n:number,c:string)=>call('socialu_conversation_messages',n,c);
const list=(n:number)=>call('socialu_conversation_list',n);
const find=(r:any,id:string)=>r.conversations.find((x:any)=>x.id===id);
const code=(expected:string)=>(e:any)=>e.code===expected;

// Student 1 owns a group with 2 and 3. Student 5 is a friend but never joins it.
for (const n of [2,3,5]) await befriend(1,n);
const gid=(await call('socialu_create_group',1)).id;
for (const n of [2,3]) await call('socialu_accept_group_invitation',n,(await call('socialu_send_group_invitation',1,gid,`student${n}`)).invitation.id);
await call('socialu_rename_group',1,gid,'Study group');
const during=await send(1,gid,'while student 2 was here');
await call('socialu_leave_group',2,gid);
const after=await send(1,gid,'after student 2 left');

// --- the group is back in the departed member's list, and marked -----------------------------------
const theirs=find(await list(2),gid);
assert.ok(theirs,'the group a student has left must still be listed');
assert.equal(theirs.former,true);
assert.equal(theirs.name,'Study group');
// Exactly once: a conversation must not appear twice however many membership rows exist.
assert.equal((await list(2)).conversations.filter((x:any)=>x.id===gid).length,1);

// A current member sees the same group unmarked.
assert.equal(find(await list(3),gid).former,false);
// A private conversation is never "former"; the flag is about group membership only.
const dm=(await friends(1,'message','student5')).conversation_id;
await send(1,dm,'hello');
assert.equal(find(await list(5),dm).former,null);

// --- nothing current about the group reaches someone who left --------------------------------------
// Membership moved on after they left, so the live count is not theirs to see.
assert.equal(theirs.member_count,null);
assert.equal(find(await list(3),gid).member_count,2);
// The preview is their last readable message, not the one sent after they left.
assert.equal(theirs.last_message.text,'while student 2 was here');

const h=await history(2,gid);
assert.equal(h.former,true);
assert.equal(h.member_count,null);
assert.equal(h.role,null,'a former member holds no role, which is what hides the admin controls');
// They see what they could see while they were there, and nothing after.
const texts=h.messages.map((m:any)=>m.text);
assert.ok(texts.includes('while student 2 was here'));
assert.ok(!texts.includes('after student 2 left'));
assert.ok(!h.messages.some((m:any)=>m.id===after.id));
assert.ok(h.messages.some((m:any)=>m.id===during.id));
// 'senders' is only the people in the messages they can read -- not the current membership list.
assert.deepEqual(Object.keys(h.senders).sort(),[String((await db.query<any>('SELECT student_id FROM socialu.students WHERE username=$1',['student1'])).rows[0].student_id)]);

// A current member still gets the full picture.
const h3=await history(3,gid);
assert.equal(h3.former,false);
assert.equal(h3.member_count,2);
assert.ok(h3.messages.some((m:any)=>m.id===after.id));

// --- read-only means read-only ---------------------------------------------------------------------
// Every write refuses them, exactly as before this change.
await assert.rejects(send(2,gid,'can I still talk?'),code('SC404'));
await assert.rejects(call('socialu_send_emoji',2,gid,'\u{1F389}'),code('SC404'));
await assert.rejects(call('socialu_react_to_message',2,gid,during.id,'\u{1F44D}'),code('SC404'));
await assert.rejects(call('socialu_rename_group',2,gid,'my group now'),code('SC404'));
await assert.rejects(call('socialu_send_group_invitation',2,gid,'student5'),code('SC404'));
await assert.rejects(call('socialu_leave_group',2,gid),code('SC404'));
// But marking what they just read as read must work, or their unread dot could never clear.
const marked=await call('socialu_mark_conversation_read',2,gid);
assert.ok(marked.marked>=1);
assert.equal(find(await list(2),gid).unread,false);

// They are not notified about the group any more: notifications are for current participants.
const notifs=await call('socialu_message_notifications',2);
assert.ok(!notifs.notifications.some((n:any)=>n.conversation_id===gid));

// --- someone who was never in it is still told nothing ----------------------------------------------
await assert.rejects(history(5,gid),code('SC404'));
await assert.rejects(call('socialu_mark_conversation_read',5,gid),code('SC404'));
assert.equal(find(await list(5),gid),undefined);

// --- rejoining clears the mark ----------------------------------------------------------------------
await call('socialu_accept_group_invitation',2,(await call('socialu_send_group_invitation',1,gid,'student2')).invitation.id);
const back=find(await list(2),gid);
assert.equal(back.former,false);
assert.equal(back.member_count,3);
assert.equal((await list(2)).conversations.filter((x:any)=>x.id===gid).length,1,'still listed exactly once after rejoining');
assert.equal((await history(2,gid)).former,false);
} finally { await db.close(); }
}, 90000);
