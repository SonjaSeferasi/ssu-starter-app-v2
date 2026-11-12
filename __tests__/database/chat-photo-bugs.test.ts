import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
const chat=['20261012120000_chat_send_text_message.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261019190100_chat_mark_read.sql'];
const sprint3=['20261026120000_chat_group_invite_friends.sql','20261026120100_chat_send_group_invitation.sql','20261026130000_chat_pending_group_invitations.sql','20261026130100_chat_accept_group_invitation.sql','20261026130200_chat_decline_group_invitation.sql','20261026140000_chat_send_emoji.sql','20261026140100_chat_emoji_in_history.sql','20261026150000_chat_sender_names.sql','20261026160000_chat_name_group.sql','20261026160100_chat_group_name_display.sql','20261026170000_chat_group_name_live.sql','20261026180000_chat_message_notifications.sql','20261026180100_chat_group_invitation_live.sql','20261027120000_chat_reaction_set.sql','20261027120100_chat_react_to_message.sql','20261027120200_chat_reactions_in_history.sql','20261028120000_chat_assign_group_admin.sql','20261028120100_chat_revoke_group_admin.sql','20261028120200_chat_remove_group_member.sql','20261028120300_chat_leave_group.sql','20261028120400_chat_transfer_group_ownership.sql'];
const photo=['20261102120000_chat_send_reply.sql','20261102130000_chat_reply_in_history.sql','20261103120000_chat_send_photo.sql','20261103130000_chat_photo_in_history.sql','20261104120000_chat_delete_photo.sql'];
const migrations=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql',...chat,...sprint3,...photo];

// Bug-hunt test cases for Loens's Messages (chat) feature, run against the
// real schema the same way every other PGlite test in this repo is. Each
// test case below is independent (its own fresh in-memory database) and
// asserts ONE specific, correct/intended behavior, so every pass or fail is
// visible on its own rather than one test stopping at its first failure.
// 2 of the 6 cases pass (documenting behavior that already works correctly);
// 4 fail, each failure a confirmed, reproducible bug.

async function freshDb() {
  const db=new PGlite();
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid', true), '')::uuid$$;
CREATE SCHEMA realtime;CREATE TABLE realtime.messages(extension text,topic text);CREATE TABLE realtime.sent(topic text,event text,payload jsonb);
CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql AS $$SELECT nullif(current_setting('test.topic', true), '')$$;
CREATE FUNCTION realtime.send(payload jsonb,event text,topic text,private boolean) RETURNS void LANGUAGE sql AS 'INSERT INTO realtime.sent VALUES($3,$2,$1)';`);
  await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
  for(const file of migrations) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));
  const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
  for (let n=1;n<=3;n++) {
    await db.query('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
    await db.query('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n)]);
  }
  const friends=async(n:number,action:string,target:string,id:string|null=null)=>(await db.query<any>('SELECT public.socialu_friendships($1,$2,$3,$4) AS r',[uid(n),action,target,id])).rows[0].r;
  const befriend=async(a:number,b:number)=>{ await friends(b,'accept',`student${a}`,(await friends(a,'send',`student${b}`)).request_id); };
  const call=async(fn:string,n:number,...args:unknown[])=>(await db.query<any>(`SELECT public.${fn}(${['$1',...args.map((_,i)=>'$'+(i+2))].join(',')}) AS r`,[uid(n),...args])).rows[0].r;
  const sendPhoto=(n:number,c:string,key:string)=>call('socialu_send_photo',n,c,key,'image/jpeg',1200000,null,null,null);
  const list=(n:number)=>call('socialu_conversation_list',n);
  const notifications=(n:number)=>call('socialu_message_notifications',n);
  const findConvo=(result:any,id:string)=>result.conversations.find((c:any)=>c.id===id);
  return {db,friends,befriend,call,sendPhoto,list,notifications,findConvo};
}

it('PASSES: the unread flag correctly includes a photo-only message (no kind filter on that query)', async () => {
  const {db,befriend,friends,sendPhoto,list,findConvo}=await freshDb();
  try {
    await befriend(1,2);
    const dm=(await friends(1,'message','student2')).conversation_id;
    await sendPhoto(1,dm,'chat_photo/a/1/photo.jpg');
    const theirView=findConvo(await list(2),dm);
    assert.equal(theirView.unread,true);
  } finally { await db.close(); }
}, 30000);

it('FAILS (confirmed bug): a photo-only conversation should show that photo as its Messages-list preview, not "No messages yet"', async () => {
  const {db,befriend,friends,sendPhoto,list,findConvo}=await freshDb();
  try {
    await befriend(1,2);
    const dm=(await friends(1,'message','student2')).conversation_id;
    await sendPhoto(1,dm,'chat_photo/a/1/photo.jpg');
    const theirView=findConvo(await list(2),dm);
    // Root cause: socialu_conversation_list's last-message lookup
    // (supabase/migrations/20261026160100_chat_group_name_display.sql:98)
    // filters `msg.kind IN ('text','emoji')`, never updated when photo
    // messages were added two migrations later (20261103120000). last_message
    // stays null for a photo-only conversation.
    assert.ok(theirView.last_message);
  } finally { await db.close(); }
}, 30000);

it('FAILS (confirmed bug): the conversation with the most recent activity (a photo, just sent) should sort to the top of the list', async () => {
  const {db,befriend,friends,call,sendPhoto,list}=await freshDb();
  try {
    // An OLDER DM gets a real text message first; a NEWER DM gets ONLY a
    // photo, sent strictly afterward -- correct behavior puts the photo DM
    // on top, since it's the more recently active conversation.
    await befriend(1,3);
    const oldDm=(await friends(1,'message','student3')).conversation_id;
    await call('socialu_send_message',1,oldDm,'Hey, long time');
    await befriend(1,2);
    const photoDm=(await friends(1,'message','student2')).conversation_id;
    await sendPhoto(1,photoDm,'chat_photo/a/1/photo.jpg');
    // Root cause: the sort key is coalesce(last_sent, joined_at), and
    // last_sent comes from the same kind-filtered subquery as the bug
    // above, so it stays null for the photo DM and it sorts by its much
    // older joined_at instead.
    const listForSender=await list(1);
    assert.equal(listForSender.conversations[0].id,photoDm);
  } finally { await db.close(); }
}, 30000);

it('FAILS (confirmed bug): an unread photo-only message should generate a notification (bell badge / Notifications -> Messages tab)', async () => {
  const {db,befriend,friends,sendPhoto,notifications}=await freshDb();
  try {
    await befriend(1,2);
    const dm=(await friends(1,'message','student2')).conversation_id;
    await sendPhoto(1,dm,'chat_photo/a/1/photo.jpg');
    // Root cause: socialu_message_notifications (20261026180000.sql:43) has
    // the identical `kind IN ('text','emoji')` filter -- the same bug as the
    // two cases above, in a second function.
    const notifsForRecipient=await notifications(2);
    assert.ok(notifsForRecipient.notifications.some((n:any)=>n.conversation_id===dm));
  } finally { await db.close(); }
}, 30000);

it('PASSES: a non-participant deleting an actual sent photo gets the generic "conversation not available" answer', async () => {
  const {db,befriend,friends,call}=await freshDb();
  try {
    await befriend(1,2);
    const dm=(await friends(1,'message','student2')).conversation_id;
    const photoMsg=await call('socialu_send_photo',2,dm,'chat_photo/b/1/pic.jpg','image/jpeg',900000,null,null,null);
    // student3 is a stranger, never a participant of this conversation.
    await assert.rejects(call('socialu_delete_photo',3,photoMsg.id),(e:any)=>e.code==='SC404');
  } finally { await db.close(); }
}, 30000);

it('FAILS (confirmed bug): a non-participant deleting a non-photo message should get the SAME "conversation not available" answer, not a different one that reveals it is not a photo', async () => {
  const {db,befriend,friends,call}=await freshDb();
  try {
    await befriend(1,2);
    const dm=(await friends(1,'message','student2')).conversation_id;
    const textMsg=await call('socialu_send_message',1,dm,'hello');
    // Root cause: socialu_delete_photo (supabase/migrations/20261104120000_
    // chat_delete_photo.sql:62-72) checks kind/status BEFORE participant
    // membership. A text message always fails that first check (SCD02,
    // "that photo is no longer available") regardless of who's asking, so
    // the participant check is never reached -- contradicting this same
    // file's own stated design rule (line 28, citing SRS-213.1: "missing
    // and forbidden look the same"). A stranger can distinguish "not a
    // photo" from "not your conversation" by error code alone.
    await assert.rejects(call('socialu_delete_photo',3,textMsg.id),(e:any)=>e.code==='SC404');
  } finally { await db.close(); }
}, 30000);
