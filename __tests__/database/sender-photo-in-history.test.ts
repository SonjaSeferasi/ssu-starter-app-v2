import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
const chat=['20261012120000_chat_send_text_message.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261019190100_chat_mark_read.sql'];
const sprint3=['20261026120000_chat_group_invite_friends.sql','20261026120100_chat_send_group_invitation.sql','20261026130000_chat_pending_group_invitations.sql','20261026130100_chat_accept_group_invitation.sql','20261026130200_chat_decline_group_invitation.sql','20261026140000_chat_send_emoji.sql','20261026140100_chat_emoji_in_history.sql','20261026150000_chat_sender_names.sql','20261026160000_chat_name_group.sql','20261026160100_chat_group_name_display.sql','20261026170000_chat_group_name_live.sql','20261026180000_chat_message_notifications.sql','20261026180100_chat_group_invitation_live.sql','20261027120000_chat_reaction_set.sql','20261027120100_chat_react_to_message.sql','20261027120200_chat_reactions_in_history.sql','20261028120000_chat_assign_group_admin.sql','20261028120100_chat_revoke_group_admin.sql','20261028120200_chat_remove_group_member.sql','20261028120300_chat_leave_group.sql','20261028120400_chat_transfer_group_ownership.sql'];
const photo=['20261102120000_chat_send_reply.sql','20261102130000_chat_reply_in_history.sql','20261103120000_chat_send_photo.sql','20261103130000_chat_photo_in_history.sql','20261104120000_chat_delete_photo.sql','20261112120000_chat_photo_in_list_and_notifications.sql','20261116120000_chat_delete_photo_error_order.sql','20261116130000_chat_former_member_history.sql','20261117020000_chat_delete_former_group_conversation.sql','20261117040000_chat_react_to_photo.sql','20261117050000_chat_sender_photo_in_history.sql'];
const migrations=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql',...chat,...sprint3,...photo];

// SRS-211.2 (#1282): each sender's profile photo travels with the history, as a storage key for the server
// to sign. The risk in touching this function is not the new field -- it is WHO is in the senders map, which
// #1222 deliberately narrows for a former member. This asserts the field arrives and that the boundary has
// not moved an inch.
it('returns each sender profile photo key without widening who is in the senders map', async () => {
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
for (let n=1;n<=4;n++) {
 await db.query('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
 await db.query('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n)]);
 await db.query('INSERT INTO socialu.student_profiles(student_id,bio) SELECT student_id,$1 FROM socialu.students WHERE auth_user_id=$2',['hi',uid(n)]);
}
// Students 2 and 3 have a profile photo; student 4 never set one.
const setPhoto=async(n:number,key:string)=>{
  const row=(await db.query<any>('SELECT student_id FROM socialu.students WHERE auth_user_id=$1',[uid(n)])).rows[0];
  const asset=(await db.query<any>("INSERT INTO socialu.media_assets(owner_id,storage_key,upload_context,mime_type,byte_count) VALUES($1,$2,'profile','image/jpeg',5000) RETURNING asset_id",[row.student_id,key])).rows[0];
  await db.query('UPDATE socialu.student_profiles SET photo_id=$1 WHERE student_id=$2',[asset.asset_id,row.student_id]);
};
await setPhoto(2,'profile/2/face.jpg');
await setPhoto(3,'profile/3/face.jpg');

const friends=async(n:number,action:string,target:string,id:string|null=null)=>(await db.query<any>('SELECT public.socialu_friendships($1,$2,$3,$4) AS r',[uid(n),action,target,id])).rows[0].r;
const befriend=async(a:number,b:number)=>{ await friends(b,'accept',`student${a}`,(await friends(a,'send',`student${b}`)).request_id); };
const call=async(fn:string,n:number,...args:unknown[])=>(await db.query<any>(`SELECT public.${fn}(${['$1',...args.map((_,i)=>'$'+(i+2))].join(',')}) AS r`,[uid(n),...args])).rows[0].r;
const send=(n:number,c:string,text:string)=>call('socialu_send_message',n,c,text,null);
const history=(n:number,c:string)=>call('socialu_conversation_messages',n,c);
const sid=async(n:number)=>String((await db.query<any>('SELECT student_id FROM socialu.students WHERE auth_user_id=$1',[uid(n)])).rows[0].student_id);

for (const n of [2,3,4]) await befriend(1,n);
await befriend(2,3); await befriend(2,4); await befriend(3,4);

// --- a private conversation: the other student's photo comes back as a key ---------------------------
const dm=(await friends(1,'message','student2')).conversation_id;
await send(2,dm,'hello');
const dmSeen=await history(1,dm);
assert.equal(dmSeen.senders[await sid(2)].photo_key,'profile/2/face.jpg');
assert.equal(dmSeen.senders[await sid(2)].name,'Student 2','the name is still there beside it');

// --- a student with no photo gets null, not a missing field -----------------------------------------
const dm4=(await friends(1,'message','student4')).conversation_id;
await send(4,dm4,'hi');
const seen4=await history(1,dm4);
assert.ok(Object.prototype.hasOwnProperty.call(seen4.senders[await sid(4)],'photo_key'));
assert.equal(seen4.senders[await sid(4)].photo_key,null);

// --- the former member boundary from #1222 has not moved --------------------------------------------
// Student 2 owns a group with 1 and 3. Student 1 is removed, then student 3 speaks.
const gid=(await call('socialu_create_group',2)).id;
for (const n of [1,3]) await call('socialu_accept_group_invitation',n,(await call('socialu_send_group_invitation',2,gid,`student${n}`)).invitation.id);
await send(2,gid,'while student 1 was here');
await call('socialu_remove_group_member',2,gid,'student1');
await send(3,gid,'after student 1 left');

// A current member sees every current member, each with their own photo key.
const current=await history(3,gid);
assert.equal(current.senders[await sid(2)].photo_key,'profile/2/face.jpg');
assert.equal(current.senders[await sid(3)].photo_key,'profile/3/face.jpg');

// The former member sees ONLY the senders of messages they may still read -- student 2, who spoke while
// they were there. Student 3 spoke after they left and must not appear at all, photo or no photo.
const former=await history(1,gid);
assert.equal(former.former,true);
assert.equal(former.senders[await sid(2)].photo_key,'profile/2/face.jpg');
assert.equal(former.senders[await sid(3)],undefined,'a sender they cannot read must not appear in the map');
assert.deepEqual(Object.keys(former.senders),[await sid(2)]);
} finally { await db.close(); }
});
