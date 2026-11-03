import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
const chat=['20261012120000_chat_send_text_message.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261019190100_chat_mark_read.sql'];
const sprint3=['20261026120000_chat_group_invite_friends.sql','20261026120100_chat_send_group_invitation.sql','20261026130000_chat_pending_group_invitations.sql','20261026130100_chat_accept_group_invitation.sql','20261026130200_chat_decline_group_invitation.sql','20261026140000_chat_send_emoji.sql','20261026140100_chat_emoji_in_history.sql','20261026150000_chat_sender_names.sql','20261026160000_chat_name_group.sql','20261026160100_chat_group_name_display.sql','20261026170000_chat_group_name_live.sql','20261026180000_chat_message_notifications.sql','20261026180100_chat_group_invitation_live.sql','20261027120000_chat_reaction_set.sql','20261027120100_chat_react_to_message.sql','20261027120200_chat_reactions_in_history.sql','20261028120000_chat_assign_group_admin.sql','20261028120100_chat_revoke_group_admin.sql','20261028120200_chat_remove_group_member.sql','20261028120300_chat_leave_group.sql','20261028120400_chat_transfer_group_ownership.sql'];
const photo=['20261102120000_chat_send_reply.sql','20261102130000_chat_reply_in_history.sql','20261103120000_chat_send_photo.sql'];
const migrations=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql',...chat,...sprint3,...photo];

// SRS-201.6 (#1022): a participant sends a chosen photo, and the photo and its message are saved together.
// Run against the real schema in memory; nothing hosted is touched.
it('saves a sent photo with its message, and refuses what it must not accept', async () => {
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
// The route's arguments, in order, with the display copy left out unless a test supplies one.
const sendPhoto=(n:number|string,c:string,key:string,type='image/jpeg',bytes=1200000,dKey:string|null=null,dType:string|null=null,dBytes:number|null=null)=>
  call('socialu_send_photo',n,c,key,type,bytes,dKey,dType,dBytes);
const row=async(sql:string,params:unknown[])=>(await db.query<any>(sql,params)).rows[0];
const code=(expected:string)=>(error:any)=>error.code===expected;

// Student 1 owns a group with members 2 and 3; student 5 is outside it. 1 and 2 also share a DM.
for (const n of [2,3,5]) await befriend(1,n);
const dm=(await friends(1,'message','student2')).conversation_id;
const gid=(await call('socialu_create_group',1)).id;
for (const n of [2,3]) await call('socialu_accept_group_invitation',n,(await call('socialu_send_group_invitation',1,gid,`student${n}`)).invitation.id);

// SRS-201.6: the photo is sent, and the message that shows it is saved with the asset that holds it.
const sent=await sendPhoto(1,gid,'chat_photo/a/1/one.jpg');
assert.equal(sent.kind,'photo');
assert.equal(sent.text,'');
assert.ok(sent.asset_id);
const saved=await row('SELECT kind,asset_id::text AS asset,text_content,status FROM socialu.messages WHERE message_id=$1',[sent.id]);
assert.equal(saved.kind,'photo');
assert.equal(saved.asset,sent.asset_id);
assert.equal(saved.status,'sent');
// The schema gives a photo message no text of its own, which is why the page sends a caption separately.
assert.equal(saved.text_content,null);

// The asset is the sender's, recorded for chat, with the bytes that were stored.
const asset=await row('SELECT owner_id::text AS owner,storage_key,upload_context,mime_type,byte_count::int AS bytes FROM socialu.media_assets WHERE asset_id=$1',[sent.asset_id]);
assert.equal(asset.owner,sent.sender_id);
assert.equal(asset.storage_key,'chat_photo/a/1/one.jpg');
assert.equal(asset.upload_context,'chat_photo');
assert.equal(asset.mime_type,'image/jpeg');
assert.equal(asset.bytes,1200000);

// It reaches every current member over realtime, as text and emoji messages do.
const broadcast=(await db.query<any>("SELECT payload FROM realtime.sent WHERE event='message_created' AND payload->>'id'=$1",[sent.id])).rows;
assert.equal(broadcast.length,3);
assert.equal(broadcast[0].payload.kind,'photo');
// The storage key is never broadcast: it is only useful with a signed URL, which only the server can make.
assert.equal(broadcast[0].payload.storage_key,undefined);

// SRS-201.6 (#1026): a display copy is stored as its own asset and linked to the original.
const withCopy=await sendPhoto(1,gid,'chat_photo/a/1/two.jpg','image/jpeg',4000000,'chat_photo/a/1/two-display.jpg','image/jpeg',240000);
const link=await row('SELECT display_asset_id::text AS d FROM socialu.chat_photo_displays WHERE asset_id=$1',[withCopy.asset_id]);
assert.ok(link);
const copy=await row('SELECT storage_key,byte_count::int AS bytes,owner_id::text AS owner,upload_context FROM socialu.media_assets WHERE asset_id=$1',[link.d]);
assert.equal(copy.storage_key,'chat_photo/a/1/two-display.jpg');
assert.equal(copy.bytes,240000);
assert.equal(copy.upload_context,'chat_photo');
// The copy belongs to the same student: require_media would refuse it against anyone else.
assert.equal(copy.owner,withCopy.sender_id);
// The message still points at the ORIGINAL, so SRS-201.7 can choose which to show.
assert.notEqual(withCopy.asset_id,link.d);
assert.equal((await row('SELECT asset_id::text AS a FROM socialu.messages WHERE message_id=$1',[withCopy.id])).a,withCopy.asset_id);

// A photo with no display copy records no link, rather than a row pointing at itself.
assert.equal(await row('SELECT asset_id FROM socialu.chat_photo_displays WHERE asset_id=$1',[sent.asset_id]),undefined);

// A private conversation accepts a photo too: SRS-201.6 is about conversations, not only groups.
assert.equal((await sendPhoto(1,dm,'chat_photo/a/2/dm.png','image/png',900000)).kind,'photo');

// SRS-201.4 / SRS-201.5 as the database keeps them: a format with no chat_photo policy row, and a file over
// the seeded 15 MB limit, are refused with a code the API can turn into a sentence.
await assert.rejects(sendPhoto(1,gid,'chat_photo/a/1/bad.gif','image/gif',1000),code('SCF01'));
await assert.rejects(sendPhoto(1,gid,'chat_photo/a/1/huge.jpg','image/jpeg',15000001),code('SCF01'));
// Exactly the limit is accepted, which is the boundary lib/chat-photo.ts is held to as well.
assert.equal((await sendPhoto(1,gid,'chat_photo/a/1/exact.jpg','image/jpeg',15000000)).kind,'photo');
// An empty file could never be stored: media_assets has CHECK (byte_count > 0).
await assert.rejects(sendPhoto(1,gid,'chat_photo/a/1/empty.jpg','image/jpeg',0),code('SCF01'));
// A display copy is held to the same policy as the original.
await assert.rejects(sendPhoto(1,gid,'chat_photo/a/1/ok.jpg','image/jpeg',1000,'chat_photo/a/1/ok-display.gif','image/gif',500),code('SCF01'));

// A refused send leaves nothing behind: the asset and the message are written in one transaction.
const before=(await db.query<any>('SELECT count(*)::int AS n FROM socialu.media_assets')).rows[0].n;
await assert.rejects(sendPhoto(1,gid,'chat_photo/a/1/rolled.jpg','image/jpeg',1000,'chat_photo/a/1/rolled-display.gif','image/gif',500),code('SCF01'));
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.media_assets')).rows[0].n,before);
assert.equal((await db.query<any>("SELECT count(*)::int AS n FROM socialu.media_assets WHERE storage_key='chat_photo/a/1/rolled.jpg'")).rows[0].n,0);

// An upload that was never stored is refused rather than saved as a message pointing at nothing.
await assert.rejects(sendPhoto(1,gid,'   ','image/jpeg',1000),code('SCF02'));

// A student outside the conversation cannot send into it, and missing and forbidden look the same (SRS-213.1).
await assert.rejects(sendPhoto(5,gid,'chat_photo/e/1/no.jpg'),code('SC404'));
await assert.rejects(sendPhoto(1,'999999','chat_photo/a/9/no.jpg'),code('SC404'));
// The account rule is the same one every chat function applies.
await assert.rejects(sendPhoto('10000000-0000-0000-0000-000000000009',gid,'chat_photo/x/1/no.jpg'),code('42501'));

// Two sends cannot share a stored object: media_assets.storage_key is UNIQUE, so a repeated key is refused
// rather than quietly attaching one student's photo to another student's message.
await assert.rejects(sendPhoto(2,gid,'chat_photo/a/1/one.jpg'),code('23505'));

// A member who has left the group can no longer send a photo into it.
await call('socialu_leave_group',3,gid);
await assert.rejects(sendPhoto(3,gid,'chat_photo/c/1/after.jpg'),code('SC404'));
} finally { await db.close(); }
}, 60000);
