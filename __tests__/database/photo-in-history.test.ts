import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
const chat=['20261012120000_chat_send_text_message.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261019190100_chat_mark_read.sql'];
const sprint3=['20261026120000_chat_group_invite_friends.sql','20261026120100_chat_send_group_invitation.sql','20261026130000_chat_pending_group_invitations.sql','20261026130100_chat_accept_group_invitation.sql','20261026130200_chat_decline_group_invitation.sql','20261026140000_chat_send_emoji.sql','20261026140100_chat_emoji_in_history.sql','20261026150000_chat_sender_names.sql','20261026160000_chat_name_group.sql','20261026160100_chat_group_name_display.sql','20261026170000_chat_group_name_live.sql','20261026180000_chat_message_notifications.sql','20261026180100_chat_group_invitation_live.sql','20261027120000_chat_reaction_set.sql','20261027120100_chat_react_to_message.sql','20261027120200_chat_reactions_in_history.sql','20261028120000_chat_assign_group_admin.sql','20261028120100_chat_revoke_group_admin.sql','20261028120200_chat_remove_group_member.sql','20261028120300_chat_leave_group.sql','20261028120400_chat_transfer_group_ownership.sql'];
const photo=['20261102120000_chat_send_reply.sql','20261102130000_chat_reply_in_history.sql','20261103120000_chat_send_photo.sql','20261103130000_chat_photo_in_history.sql'];
const migrations=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql',...chat,...sprint3,...photo];

// SRS-201.7 (#1028): a sent photo is part of the conversation history, with the stored objects the API needs
// in order to sign a link. Run against the real schema in memory; nothing hosted is touched.
it('returns photo messages in the history with their stored objects', async () => {
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
const history=(n:number,c:string)=>call('socialu_conversation_messages',n,c);
const send=(n:number,c:string,text:string,replyTo:string|null=null)=>call('socialu_send_message',n,c,text,replyTo);
const sendPhoto=(n:number,c:string,key:string,type='image/jpeg',bytes=1200000,dKey:string|null=null,dType:string|null=null,dBytes:number|null=null)=>
  call('socialu_send_photo',n,c,key,type,bytes,dKey,dType,dBytes);

// Student 1 owns a group with members 2 and 3.
for (const n of [2,3]) await befriend(1,n);
const gid=(await call('socialu_create_group',1)).id;
for (const n of [2,3]) await call('socialu_accept_group_invitation',n,(await call('socialu_send_group_invitation',1,gid,`student${n}`)).invitation.id);

const words=await send(1,gid,'Here is the hall');
const withCopy=await sendPhoto(1,gid,'chat_photo/a/1/big.jpg','image/jpeg',4000000,'chat_photo/a/1/big-display.jpg','image/jpeg',240000);
const noCopy=await sendPhoto(2,gid,'chat_photo/b/1/small.png','image/png',90000);

// SRS-201.7: the photo messages are in the history at all. Before this they were saved and broadcast and
// then vanished on the next reload, because the history selected only text and emoji.
const h=await history(3,gid);
const ids=h.messages.map((m:any)=>m.id);
assert.ok(ids.includes(withCopy.id));
assert.ok(ids.includes(noCopy.id));
const shown=(id:string)=>h.messages.find((m:any)=>m.id===id);
assert.equal(shown(withCopy.id).kind,'photo');
assert.equal(shown(withCopy.id).asset_id,withCopy.asset_id);
// The same shape as the live broadcast, so the page merges both without a special case.
assert.equal(shown(withCopy.id).text,'');

// A text message is untouched by any of this: no kind, no asset, its text intact.
assert.equal(shown(words.id).text,'Here is the hall');
assert.equal(shown(words.id).kind,undefined);
assert.equal(shown(words.id).asset_id,undefined);

// The stored objects, keyed by message ID. Keys, never links: the bucket is private and only the server can
// sign one, so a key reaching the browser would be useless anyway.
assert.equal(h.photos[withCopy.id].storage_key,'chat_photo/a/1/big.jpg');
assert.equal(h.photos[withCopy.id].display_storage_key,'chat_photo/a/1/big-display.jpg');
assert.equal(h.photos[withCopy.id].mime_type,'image/jpeg');
// A photo small enough to need no copy names only the original (SRS-201.6, #1026).
assert.equal(h.photos[noCopy.id].storage_key,'chat_photo/b/1/small.png');
assert.equal(h.photos[noCopy.id].display_storage_key,undefined);
// Only photo messages appear in the map.
assert.equal(h.photos[words.id],undefined);
assert.equal(Object.keys(h.photos).length,2);

// A conversation with no photos gets an empty map, not a missing one, so the page needs no special case.
await befriend(1,4);
const dm=(await friends(1,'message','student4')).conversation_id;
await send(1,dm,'Just words');
assert.deepEqual((await history(1,dm)).photos,{});

// SRS-209.5 with SRS-201.7: a reply to a photo says what it answered. There is no text to quote, so the
// entry carries the kind and an empty text and the page names it rather than quoting nothing.
const answer=await send(3,gid,'Nice shot',withCopy.id);
const h2=await history(3,gid);
assert.equal(h2.replies[answer.id].id,withCopy.id);
assert.equal(h2.replies[answer.id].kind,'photo');
assert.equal(h2.replies[answer.id].text,'');
assert.equal(h2.replies[answer.id].sender_name,'Student 1');

// Reactions are still text and emoji only. socialu_react_to_message (SRS-210, 20261027120100) checks
// `kind IN ('text','emoji')`, so a photo is refused with SCR04. Nothing in SRS-201.7 asks to change that, and
// widening a merged card's function from here would be the wrong place to do it -- so the boundary is written
// down instead, and the page hides the React button on a photo rather than offering an action that must fail.
await assert.rejects(call('socialu_react_to_message',2,gid,withCopy.id,'❤️'),(e:any)=>e.code==='SCR04');
// Reacting to a text message in the same conversation is unaffected.
await call('socialu_react_to_message',2,gid,words.id,'❤️');
const h3=await history(2,gid);
assert.ok(h3.reactions[words.id]);
assert.equal(h3.reactions[withCopy.id],undefined);

// A student who is not a participant cannot read any of it, photos included (SRS-213.1).
await assert.rejects(history(5,gid),(e:any)=>e.code==='SC404');

// Someone who joins later does not get the photos sent before they joined: can_read_message limits a member
// to their own membership period, and the photos map is built from the same rows.
await befriend(1,5);
await call('socialu_accept_group_invitation',5,(await call('socialu_send_group_invitation',1,gid,'student5')).invitation.id);
const late=await history(5,gid);
assert.equal(late.messages.length,0);
assert.deepEqual(late.photos,{});
// And a photo sent after they joined does reach them, with its stored objects.
const after=await sendPhoto(1,gid,'chat_photo/a/1/after.jpg');
const late2=await history(5,gid);
assert.ok(late2.messages.some((m:any)=>m.id===after.id));
assert.equal(late2.photos[after.id].storage_key,'chat_photo/a/1/after.jpg');
} finally { await db.close(); }
}, 60000);
