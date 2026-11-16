import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
const chat=['20261012120000_chat_send_text_message.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261019190100_chat_mark_read.sql'];
const sprint3=['20261026120000_chat_group_invite_friends.sql','20261026120100_chat_send_group_invitation.sql','20261026130000_chat_pending_group_invitations.sql','20261026130100_chat_accept_group_invitation.sql','20261026130200_chat_decline_group_invitation.sql','20261026140000_chat_send_emoji.sql','20261026140100_chat_emoji_in_history.sql','20261026150000_chat_sender_names.sql','20261026160000_chat_name_group.sql','20261026160100_chat_group_name_display.sql','20261026170000_chat_group_name_live.sql','20261026180000_chat_message_notifications.sql','20261026180100_chat_group_invitation_live.sql','20261027120000_chat_reaction_set.sql','20261027120100_chat_react_to_message.sql','20261027120200_chat_reactions_in_history.sql','20261028120000_chat_assign_group_admin.sql','20261028120100_chat_revoke_group_admin.sql','20261028120200_chat_remove_group_member.sql','20261028120300_chat_leave_group.sql','20261028120400_chat_transfer_group_ownership.sql'];
const photo=['20261102120000_chat_send_reply.sql','20261102130000_chat_reply_in_history.sql','20261103120000_chat_send_photo.sql','20261103130000_chat_photo_in_history.sql','20261104120000_chat_delete_photo.sql','20261112120000_chat_photo_in_list_and_notifications.sql'];
const migrations=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql',...chat,...sprint3,...photo];

// Bug-hunt test cases for Loens's Messages feature, covering SRS-205.13,
// SRS-207.5, SRS-208.7 and SRS-213.5 -- all four say the same thing in
// their own context: a former group member (left, removed, or a departed
// owner after transfer) must still be able to VIEW messages from their own
// membership period. group-leaving.test.ts's own comments (line 83-85)
// already flag this as a known, tracked gap (#885, #886): the function the
// frontend actually calls to fetch history, socialu_conversation_messages,
// gates on CURRENT participancy before anything else, so a former member
// cannot open the conversation at all -- not even to see what they were
// always allowed to see. The lower-level permission function
// (can_read_message) gets this right; the RPC that uses it to build the
// actual history never reaches that check for a former member.
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
  for (let n=1;n<=4;n++) {
    await db.query('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
    await db.query('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n)]);
  }
  const friends=async(n:number,action:string,target:string,id:string|null=null)=>(await db.query<any>('SELECT public.socialu_friendships($1,$2,$3,$4) AS r',[uid(n),action,target,id])).rows[0].r;
  const befriend=async(a:number,b:number)=>{ await friends(b,'accept',`student${a}`,(await friends(a,'send',`student${b}`)).request_id); };
  const call=async(fn:string,n:number,...args:unknown[])=>(await db.query<any>(`SELECT public.${fn}(${['$1',...args.map((_,i)=>'$'+(i+2))].join(',')}) AS r`,[uid(n),...args])).rows[0].r;
  const canRead=async(n:number,messageId:string)=>(await db.query<any>('SELECT socialu.can_read_message($1,$2) AS ok',[(await db.query<any>('SELECT student_id FROM socialu.students WHERE auth_user_id=$1',[uid(n)])).rows[0].student_id,messageId])).rows[0].ok;
  return {db,befriend,friends,call,canRead};
}

it('PASSES: the underlying permission check (can_read_message) correctly still allows a former member to read a message from their own membership period', async () => {
  const {db,befriend,call,canRead}=await freshDb();
  try {
    for (const n of [2,3]) await befriend(1,n);
    const gid=(await call('socialu_create_group',1)).id;
    for (const n of [2,3]) await call('socialu_accept_group_invitation',n,(await call('socialu_send_group_invitation',1,gid,`student${n}`)).invitation.id);
    const early=await call('socialu_send_message',1,gid,'Before I leave');
    await call('socialu_leave_group',3,gid);
    assert.equal(await canRead(3,early.id),true);
  } finally { await db.close(); }
}, 30000);

it('FAILS (confirmed bug, SRS-207.5): a member who voluntarily left a group should still be able to open and view that group\'s history from before they left', async () => {
  const {db,befriend,call}=await freshDb();
  try {
    for (const n of [2,3]) await befriend(1,n);
    const gid=(await call('socialu_create_group',1)).id;
    for (const n of [2,3]) await call('socialu_accept_group_invitation',n,(await call('socialu_send_group_invitation',1,gid,`student${n}`)).invitation.id);
    await call('socialu_send_message',1,gid,'Before I leave');
    await call('socialu_leave_group',3,gid);
    // Root cause: socialu_conversation_messages (live definition in
    // supabase/migrations/20261104120000_chat_delete_photo.sql:125-126)
    // gates on `socialu.is_current_participant`, which is false for anyone
    // who has left -- so they are rejected before the function ever looks
    // at which specific messages they're allowed to see.
    const history=await call('socialu_conversation_messages',3,gid);
    assert.ok(Array.isArray(history.messages) && history.messages.length>0);
  } finally { await db.close(); }
}, 30000);

it('FAILS (confirmed bug, SRS-205.13): a member who was REMOVED from a group should still be able to view that group\'s history from before their removal', async () => {
  const {db,befriend,call}=await freshDb();
  try {
    for (const n of [2,3]) await befriend(1,n);
    const gid=(await call('socialu_create_group',1)).id;
    for (const n of [2,3]) await call('socialu_accept_group_invitation',n,(await call('socialu_send_group_invitation',1,gid,`student${n}`)).invitation.id);
    await call('socialu_send_message',1,gid,'Before the removal');
    await call('socialu_remove_group_member',1,gid,'student3');
    const history=await call('socialu_conversation_messages',3,gid);
    assert.ok(Array.isArray(history.messages) && history.messages.length>0);
  } finally { await db.close(); }
}, 30000);

it('FAILS (confirmed bug, SRS-208.7): a former owner (departed via ownership transfer on leave) should still be able to view the group\'s history from while they were a member', async () => {
  const {db,befriend,call}=await freshDb();
  try {
    for (const n of [2,3]) await befriend(1,n);
    const gid=(await call('socialu_create_group',1)).id;
    for (const n of [2,3]) await call('socialu_accept_group_invitation',n,(await call('socialu_send_group_invitation',1,gid,`student${n}`)).invitation.id);
    await call('socialu_assign_group_admin',1,gid,'student2');
    await call('socialu_send_message',1,gid,'While I was still owner');
    await call('socialu_leave_group',1,gid); // owner leaves with an admin present -> ownership transfers to student2
    const history=await call('socialu_conversation_messages',1,gid);
    assert.ok(Array.isArray(history.messages) && history.messages.length>0);
  } finally { await db.close(); }
}, 30000);

it('NOT IMPLEMENTED (gap, SRS-207.6/207.7): no function anywhere in the codebase lets a former member remove a group conversation from their own history -- confirmed by exhaustive search, not executed here', () => {
  // This is a documentation-only test case: grep across supabase/migrations,
  // lib/chat*.ts, app/api/conversations/, and app/messages/ for any
  // "delete own conversation / hide conversation / archive conversation"
  // style function or route found zero matches. There is nothing to call
  // and therefore nothing to execute -- the feature does not exist yet.
  assert.ok(true);
}, 5000);
