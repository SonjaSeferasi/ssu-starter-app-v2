import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
const chat=['20261012120000_chat_send_text_message.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261019190100_chat_mark_read.sql'];
const sprint3=['20261026120000_chat_group_invite_friends.sql','20261026120100_chat_send_group_invitation.sql','20261026130000_chat_pending_group_invitations.sql','20261026130100_chat_accept_group_invitation.sql','20261026130200_chat_decline_group_invitation.sql','20261026140000_chat_send_emoji.sql','20261026140100_chat_emoji_in_history.sql','20261026150000_chat_sender_names.sql','20261026160000_chat_name_group.sql','20261026160100_chat_group_name_display.sql','20261026170000_chat_group_name_live.sql','20261026180000_chat_message_notifications.sql','20261026180100_chat_group_invitation_live.sql','20261027120000_chat_reaction_set.sql','20261027120100_chat_react_to_message.sql','20261027120200_chat_reactions_in_history.sql','20261028120000_chat_assign_group_admin.sql','20261028120100_chat_revoke_group_admin.sql','20261028120200_chat_remove_group_member.sql','20261028120300_chat_leave_group.sql','20261028120400_chat_transfer_group_ownership.sql'];
const photo=['20261102120000_chat_send_reply.sql','20261102130000_chat_reply_in_history.sql','20261103120000_chat_send_photo.sql','20261103130000_chat_photo_in_history.sql','20261104120000_chat_delete_photo.sql','20261112120000_chat_photo_in_list_and_notifications.sql','20261116120000_chat_delete_photo_error_order.sql','20261116130000_chat_former_member_history.sql','20261117020000_chat_delete_former_group_conversation.sql','20261117040000_chat_react_to_photo.sql'];
const migrations=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql',...chat,...sprint3,...photo];

// SRS-210.1 (#1262): "an existing message" includes a photo. The write paths used to accept only text and
// emoji, so a photo could never carry a reaction. The half worth guarding is the round trip: applying a
// reaction is useless if the history does not hand it back, and those are two different filters.
it('lets a participant react to a photo, change it, remove it, and see it in the history', async () => {
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
const history=(n:number,c:string)=>call('socialu_conversation_messages',n,c);
const react=(n:number,c:string,m:string,e:string)=>call('socialu_react_to_message',n,c,m,e);
const unreact=(n:number,c:string,m:string)=>call('socialu_remove_reaction',n,c,m);
const code=(expected:string)=>(e:any)=>e.code===expected;

await befriend(1,2);
const dm=(await friends(1,'message','student2')).conversation_id;
const photoMsg=await call('socialu_send_photo',1,dm,'chat_photo/1/1/pic.jpg','image/jpeg',900000,null,null,null);
const textMsg=await call('socialu_send_message',1,dm,'and here is the caption',null);
const emoji=(await db.query<any>("SELECT emoji FROM socialu.reaction_options ORDER BY emoji LIMIT 2")).rows;
const [first,second]=[emoji[0].emoji,emoji[1].emoji];

// --- SRS-210.3: the reaction applies to a photo, exactly as it would to text ------------------------
const applied=await react(2,dm,photoMsg.id,first);
assert.equal(applied.message_id,String(photoMsg.id));
assert.ok(applied.reactions.some((r:any)=>r.emoji===first && r.mine===true));

// --- SRS-210.4: and it comes back with the history, which is a different filter ---------------------
// Before #1262 this half already worked, because 20261112120000 widened the history to include photos.
// It is asserted anyway: the fix is only complete if both halves agree.
const seen=await history(2,dm);
assert.ok(seen.messages.some((m:any)=>m.id===String(photoMsg.id) && m.kind==='photo'));
assert.deepEqual(seen.reactions[String(photoMsg.id)].map((r:any)=>r.emoji),[first]);

// The sender sees it too, and knows it is not theirs.
const theirs=await history(1,dm);
assert.equal(theirs.reactions[String(photoMsg.id)][0].mine,false);

// --- SRS-210.6: changing it replaces rather than adds ----------------------------------------------
const changed=await react(2,dm,photoMsg.id,second);
assert.deepEqual(changed.reactions.map((r:any)=>r.emoji),[second]);
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.message_reactions WHERE message_id=$1',[photoMsg.id])).rows[0].n,1);

// --- SRS-210.5: and removing it takes only their own ------------------------------------------------
await react(1,dm,photoMsg.id,first);
await unreact(2,dm,photoMsg.id);
const left=(await history(1,dm)).reactions[String(photoMsg.id)];
assert.deepEqual(left.map((r:any)=>r.emoji),[first]);
assert.equal(left[0].mine,true,"the sender's own reaction survives the other student removing theirs");

// --- the rules that did not move -------------------------------------------------------------------
// A reaction outside the approved set is still refused, on a photo as on anything else (SRS-210.2).
await assert.rejects(react(2,dm,photoMsg.id,'not-an-emoji'),code('SCR01'));
// A student who is not in the conversation is still told nothing (SRS-213.1).
await assert.rejects(react(3,dm,photoMsg.id,first),code('SC404'));
// A removed photo is a tombstone (#1106): the message stays in place so the conversation still reads in
// order, but there is nothing there to react to. Admitting photos admits deleted ones unless this is
// said explicitly, which is what the old text-and-emoji filter was hiding.
await call('socialu_delete_photo',1,photoMsg.id);
await assert.rejects(react(2,dm,photoMsg.id,first),code('SCR04'));
// Removing is deliberately not subject to that rule. Student 1 reacted before the photo was deleted, and
// must not be left with a reaction on a tombstone that they can never take back.
assert.deepEqual((await unreact(1,dm,photoMsg.id)).reactions,[]);
// Text is unaffected throughout.
assert.ok((await react(2,dm,textMsg.id,first)).reactions.some((r:any)=>r.emoji===first));
} finally { await db.close(); }
});
