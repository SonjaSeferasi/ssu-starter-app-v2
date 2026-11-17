import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
const chat=['20261012120000_chat_send_text_message.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261019190100_chat_mark_read.sql'];
const sprint3=['20261026120000_chat_group_invite_friends.sql','20261026120100_chat_send_group_invitation.sql','20261026130000_chat_pending_group_invitations.sql','20261026130100_chat_accept_group_invitation.sql','20261026130200_chat_decline_group_invitation.sql','20261026140000_chat_send_emoji.sql','20261026140100_chat_emoji_in_history.sql','20261026150000_chat_sender_names.sql','20261026160000_chat_name_group.sql','20261026160100_chat_group_name_display.sql','20261026170000_chat_group_name_live.sql','20261026180000_chat_message_notifications.sql','20261026180100_chat_group_invitation_live.sql','20261027120000_chat_reaction_set.sql','20261027120100_chat_react_to_message.sql','20261027120200_chat_reactions_in_history.sql','20261028120000_chat_assign_group_admin.sql','20261028120100_chat_revoke_group_admin.sql','20261028120200_chat_remove_group_member.sql','20261028120300_chat_leave_group.sql','20261028120400_chat_transfer_group_ownership.sql'];
const photo=['20261102120000_chat_send_reply.sql','20261102130000_chat_reply_in_history.sql','20261103120000_chat_send_photo.sql','20261103130000_chat_photo_in_history.sql','20261104120000_chat_delete_photo.sql','20261112120000_chat_photo_in_list_and_notifications.sql','20261116120000_chat_delete_photo_error_order.sql','20261116130000_chat_former_member_history.sql','20261117020000_chat_delete_former_group_conversation.sql'];
const migrations=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql',...chat,...sprint3,...photo];

// SRS-207.7 (#888): a former group member deletes the conversation from their own view.
// The requirement has two halves, and the second is the one worth guarding: "without deleting the
// conversation for remaining group members". Everything a deletion does is one row for one student, so this
// file checks both that the conversation really goes away for them -- list, history and marking read -- and
// that nothing at all changes for the people still in the group.
it('removes a deleted group from one former member\'s view and from nobody else\'s', async () => {
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
const del=(n:number,c:string)=>call('socialu_delete_conversation',n,c);
const find=(r:any,id:string)=>r.conversations.find((x:any)=>x.id===id);
const code=(expected:string)=>(e:any)=>e.code===expected;
const invite=async(owner:number,gid:string,n:number)=>call('socialu_accept_group_invitation',n,(await call('socialu_send_group_invitation',owner,gid,`student${n}`)).invitation.id);

// Student 3 owns a group with 1 and 2. Student 5 is a friend of 1 but never joins it.
for (const n of [2,3,5]) await befriend(1,n);
await befriend(2,3);
const gid=(await call('socialu_create_group',3)).id;
for (const n of [1,2]) await invite(3,gid,n);
await call('socialu_rename_group',3,gid,'Study group');
await send(3,gid,'while student 1 was here');
await send(1,gid,'student 1 speaking');
await call('socialu_remove_group_member',3,gid,'student1');
const afterLeaving=await send(3,gid,'after student 1 left');

// --- before deleting, #1222 applies: it is listed, marked, and readable -----------------------------
assert.equal(find(await list(1),gid).former,true);
assert.equal((await history(1,gid)).messages.length,2);

// --- a current member cannot delete it, and a private conversation is not deletable at all ---------
await assert.rejects(del(2,gid),code('SCH02'),'a current member must leave before deleting');
const dm=(await friends(1,'message','student5')).conversation_id;
await send(5,dm,'hello');
await assert.rejects(del(1,dm),code('SCH01'),'SRS-207.6 and SRS-207.7 are about groups a student has left');
// Someone who was never in the group is told nothing, exactly as SRS-213.1 requires elsewhere.
await assert.rejects(del(5,gid),code('SC404'));

// --- the deletion ----------------------------------------------------------------------------------
assert.deepEqual(await del(1,gid),{conversation_id:String(gid),deleted:true});

// Gone from the list, from the history, and from marking read -- "conversation history" means all three.
assert.equal(find(await list(1),gid),undefined);
await assert.rejects(history(1,gid),code('SC404'),'a direct link must not resurrect a deleted conversation');
await assert.rejects(call('socialu_mark_conversation_read',1,gid),code('SC404'));
// Deleting it twice says the same thing as deleting a conversation that was never theirs.
await assert.rejects(del(1,gid),code('SC404'));
// The DM is untouched: a deletion is per conversation, not a blanket.
assert.ok(find(await list(1),dm));

// --- nothing changed for the people still in the group ---------------------------------------------
const theirs=find(await list(2),gid);
assert.ok(theirs,'the group must still be listed for a current member');
assert.equal(theirs.former,false);
assert.equal(theirs.member_count,2);
assert.equal(theirs.last_message.text,'after student 1 left');
const kept=await history(2,gid);
assert.equal(kept.messages.length,3);
assert.ok(kept.messages.some((m:any)=>m.id===String(afterLeaving.id)));
// The messages themselves are still there; only one student's view of them changed.
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.messages WHERE conversation_id=$1',[gid])).rows[0].n,3);
// Exactly one hidden row was written, and it belongs to the student who asked.
const hidden=(await db.query<any>('SELECT student_id::text AS s FROM socialu.hidden_conversations WHERE conversation_id=$1',[gid])).rows;
assert.equal(hidden.length,1);
assert.equal(hidden[0].s,'1');

// --- rejoining undoes it, and leaving again does not re-apply it -----------------------------------
// hidden_at is compared against the newest membership, so an old deletion expires on rejoining rather
// than silently hiding the group the next time this student leaves.
await invite(3,gid,1);
const back=find(await list(1),gid);
assert.ok(back,'rejoining must bring the conversation back');
assert.equal(back.former,false);
// Rejoining restores the conversation, not the messages said while they were away: can_read_message
// matches each membership row's own window, so the one sent between the two is still not theirs.
const rejoined=await history(1,gid);
assert.equal(rejoined.messages.length,2);
assert.ok(!rejoined.messages.some((m:any)=>m.id===String(afterLeaving.id)));
await call('socialu_leave_group',1,gid);
const again=find(await list(1),gid);
assert.ok(again,'leaving again must not reuse the earlier deletion');
assert.equal(again.former,true);
// And it can be deleted again, as a fresh choice.
assert.equal((await del(1,gid)).deleted,true);
assert.equal(find(await list(1),gid),undefined);
} finally { await db.close(); }
});
