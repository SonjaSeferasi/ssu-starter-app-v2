import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
const chat=['20261012120000_chat_send_text_message.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261019190100_chat_mark_read.sql'];
const sprint3=['20261026120000_chat_group_invite_friends.sql','20261026120100_chat_send_group_invitation.sql','20261026130000_chat_pending_group_invitations.sql','20261026130100_chat_accept_group_invitation.sql','20261026130200_chat_decline_group_invitation.sql','20261026140000_chat_send_emoji.sql','20261026140100_chat_emoji_in_history.sql','20261026150000_chat_sender_names.sql','20261026160000_chat_name_group.sql','20261026160100_chat_group_name_display.sql','20261026170000_chat_group_name_live.sql','20261026180000_chat_message_notifications.sql','20261026180100_chat_group_invitation_live.sql','20261027120000_chat_reaction_set.sql','20261027120100_chat_react_to_message.sql','20261027120200_chat_reactions_in_history.sql','20261028120000_chat_assign_group_admin.sql','20261028120100_chat_revoke_group_admin.sql','20261028120200_chat_remove_group_member.sql','20261028120300_chat_leave_group.sql','20261028120400_chat_transfer_group_ownership.sql'];
const photo=['20261102120000_chat_send_reply.sql','20261102130000_chat_reply_in_history.sql','20261103120000_chat_send_photo.sql','20261103130000_chat_photo_in_history.sql','20261104120000_chat_delete_photo.sql','20261112120000_chat_photo_in_list_and_notifications.sql'];
const migrations=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql',...chat,...sprint3,...photo];

// #1106: the student who sent a photo removes it, and nobody else can. Run against the real schema in
// memory; nothing hosted is touched.
it('lets only the sender delete a photo, and keeps the conversation intact', async () => {
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
const sendPhoto=(n:number,c:string,key:string,dKey:string|null=null)=>
  call('socialu_send_photo',n,c,key,'image/jpeg',1200000,dKey,dKey?'image/jpeg':null,dKey?90000:null);
const send=(n:number,c:string,text:string,replyTo:string|null=null)=>call('socialu_send_message',n,c,text,replyTo);
const del=(n:number|string,id:string)=>call('socialu_delete_photo',n,id);
const history=(n:number,c:string)=>call('socialu_conversation_messages',n,c);
const code=(expected:string)=>(error:any)=>error.code===expected;
const rows=async(sql:string,p:unknown[]=[])=>(await db.query<any>(sql,p)).rows;

// Student 1 owns a group with members 2 and 3; student 5 is outside it.
for (const n of [2,3,5]) await befriend(1,n);
const gid=(await call('socialu_create_group',1)).id;
for (const n of [2,3]) await call('socialu_accept_group_invitation',n,(await call('socialu_send_group_invitation',1,gid,`student${n}`)).invitation.id);

const photo1=await sendPhoto(2,gid,'chat_photo/b/1/one.jpg','chat_photo/b/1/one-display.jpg');

// Nobody but the sender. The group OWNER is refused too: owning the group is not owning the photo.
await assert.rejects(del(1,photo1.id),code('SCD01'));
await assert.rejects(del(3,photo1.id),code('SCD01'));
// Someone outside the conversation gets the conversation answer, not the ownership one, so a message id
// cannot be probed from outside (SRS-213.1).
await assert.rejects(del(5,photo1.id),code('SC404'));
// Still there after all of that.
assert.equal((await rows('SELECT count(*)::int AS n FROM socialu.deleted_messages'))[0].n,0);

// The sender deletes it, and gets back both stored objects for the API to remove.
const gone=await del(2,photo1.id);
assert.equal(gone.already_deleted,false);
assert.deepEqual(gone.storage_keys.sort(),['chat_photo/b/1/one-display.jpg','chat_photo/b/1/one.jpg']);

// The message row is untouched: the CHECK on messages requires a photo to keep its asset_id, and a reply
// may point at it. What goes away is the photograph, not the row.
const row=(await rows('SELECT kind,asset_id,status FROM socialu.messages WHERE message_id=$1',[photo1.id]))[0];
assert.equal(row.kind,'photo');
assert.notEqual(row.asset_id,null);
assert.equal(row.status,'sent');

// Everyone is told, on the same channels the send used.
const sent=await rows("SELECT payload FROM realtime.sent WHERE event='message_deleted' AND payload->>'id'=$1",[photo1.id]);
assert.equal(sent.length,3);

// The history still shows the message, marked, and hands out no keys for it -- so no new link can be signed.
const h=await history(3,gid);
const shown=h.messages.find((m:any)=>m.id===photo1.id);
assert.equal(shown.kind,'photo');
assert.equal(shown.deleted,true);
assert.equal(h.photos[photo1.id],undefined);

// Deleting again is not an error, so a retry after a dropped connection is harmless -- and it names no
// objects the second time, because the first call already had them removed.
const again=await del(2,photo1.id);
assert.equal(again.already_deleted,true);
assert.deepEqual(again.storage_keys,[]);
assert.equal((await rows('SELECT count(*)::int AS n FROM socialu.deleted_messages'))[0].n,1);

// A photo with no display copy returns just the one object.
const photo2=await sendPhoto(1,gid,'chat_photo/a/1/solo.png');
assert.deepEqual((await del(1,photo2.id)).storage_keys,['chat_photo/a/1/solo.png']);

// A reply that answered a deleted photo survives: the row stays, so the foreign key stays valid, and the
// history leaves the target out so the page says "Original message unavailable" (SRS-209.6).
const photo3=await sendPhoto(1,gid,'chat_photo/a/1/replied.jpg');
const answer=await send(3,gid,'nice shot',photo3.id);
await del(1,photo3.id);
const h2=await history(3,gid);
assert.ok(h2.messages.some((m:any)=>m.id===answer.id));
assert.equal((await rows('SELECT reply_to_id::text AS t FROM socialu.messages WHERE message_id=$1',[answer.id]))[0].t,photo3.id);
assert.equal(h2.replies[answer.id],undefined);

// Text and emoji messages cannot be deleted through this: it is a photo feature.
const words=await send(1,gid,'just text');
await assert.rejects(del(1,words.id),code('SCD02'));
// Nor can a message that does not exist, and it looks the same as one that is not a photo.
await assert.rejects(del(1,'999999'),code('SCD02'));

// The account rule is the one every chat function applies.
await assert.rejects(del('10000000-0000-0000-0000-000000000009',photo1.id),code('42501'));

// Once the sender has left the group they are no longer a participant, so they can no longer delete there.
const photo4=await sendPhoto(3,gid,'chat_photo/c/1/leaving.jpg');
await call('socialu_leave_group',3,gid);
await assert.rejects(del(3,photo4.id),code('SC404'));

// A private conversation works the same way.
await befriend(1,4);
const dm=(await friends(1,'message','student4')).conversation_id;
const dmPhoto=await sendPhoto(1,dm,'chat_photo/a/2/dm.jpg');
await assert.rejects(del(4,dmPhoto.id),code('SCD01'));
assert.equal((await del(1,dmPhoto.id)).already_deleted,false);
} finally { await db.close(); }
}, 60000);
