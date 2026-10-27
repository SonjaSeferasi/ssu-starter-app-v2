import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import { REACTIONS } from '../../lib/chat-reactions';
const root=process.cwd();
const chat=['20261012120000_chat_send_text_message.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261019190100_chat_mark_read.sql'];
const sprint3=['20261026120000_chat_group_invite_friends.sql','20261026120100_chat_send_group_invitation.sql','20261026130000_chat_pending_group_invitations.sql','20261026130100_chat_accept_group_invitation.sql','20261026130200_chat_decline_group_invitation.sql','20261026140000_chat_send_emoji.sql','20261026140100_chat_emoji_in_history.sql','20261026150000_chat_sender_names.sql','20261026160000_chat_name_group.sql','20261026160100_chat_group_name_display.sql','20261026170000_chat_group_name_live.sql','20261026180000_chat_message_notifications.sql','20261026180100_chat_group_invitation_live.sql','20261027120000_chat_reaction_set.sql','20261027120100_chat_react_to_message.sql','20261027120200_chat_reactions_in_history.sql'];
// The migrations chat.test.ts uses, and main's latest set including LN's school communities.
const chatOnly=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql',...chat,...sprint3];
const withSchools=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261020000100_like_notifications.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261022050000_integrate_notifications_with_main.sql','20261024000100_unify_notifications.sql',...chat,'20261013150000_create_event.sql','20261015120000_list_events.sql','20261026000100_school_communities.sql',...sprint3];
// SRS-210.1 to SRS-210.6 (#803, #806, #810, #813, #817, #820): react to messages, against the real schema in memory
// (nothing hosted is touched).
it('lets participants add, change and remove one reaction per message, and sends reactions live', () => reactionsWork(chatOnly), 60000);
it('works the same with school communities applied', () => reactionsWork(withSchools), 60000);

async function reactionsWork(migrations: string[]) {
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
const react=(n:number|string,c:string,m:string,emoji:unknown)=>call('socialu_react_to_message',n,c,m,emoji);
const unreact=(n:number|string,c:string,m:string)=>call('socialu_remove_reaction',n,c,m);
const code=(expected:string)=>(error:any)=>error.code===expected;
const live=async(n:number)=>(await db.query<any>("SELECT payload FROM realtime.sent WHERE topic=$1 AND event='reaction_updated'",['student:'+uid(n)])).rows.map(r=>r.payload);
const rows=async()=>(await db.query<any>('SELECT message_id::text AS m,student_id::int AS s,emoji FROM socialu.message_reactions ORDER BY message_id,student_id')).rows;
const [like,heart,laugh,wow,sad,thanks]=REACTIONS.map((reaction)=>reaction.emoji);

// SRS-210.2 (#804, #806): the database holds exactly the approved set the page shows.
assert.deepEqual((await db.query<any>('SELECT emoji FROM socialu.reaction_options ORDER BY emoji')).rows.map(r=>r.emoji),REACTIONS.map((r)=>r.emoji).sort());
assert.equal(heart,'❤️');

for (const n of [2,3,4]) await befriend(1,n);
const dm=(await friends(1,'message','student2')).conversation_id;
const hi=await call('socialu_send_message',2,dm,'Hi');
const reply=await call('socialu_send_message',1,dm,'Hello');

// SRS-210.1 / SRS-210.3 (#807, #810): a participant reacts to a message in a private conversation.
const mine=(emoji:string,count=1)=>({emoji,count,mine:true});
const theirs=(emoji:string,count=1)=>({emoji,count,mine:false});
assert.deepEqual(await react(1,dm,hi.id,like),{conversation_id:dm,message_id:hi.id,reactions:[mine(like)]});
// Live to both participants, each with their own reaction marked.
assert.deepEqual(await live(1),[{conversation_id:dm,message_id:hi.id,reactions:[mine(like)]}]);
assert.deepEqual(await live(2),[{conversation_id:dm,message_id:hi.id,reactions:[theirs(like)]}]);
// SRS-210.6 (#818, #820): reacting again with another emoji replaces it; there is still one reaction per student.
assert.deepEqual((await react(1,dm,hi.id,heart)).reactions,[mine(heart)]);
assert.deepEqual(await rows(),[{m:hi.id,s:1,emoji:heart}]);
// The same emoji again changes nothing and sends nothing.
assert.deepEqual((await react(1,dm,hi.id,heart)).reactions,[mine(heart)]);
assert.equal((await live(2)).length,2);
// The other participant reacts too, even to their own message; counts are per emoji.
assert.deepEqual((await react(2,dm,hi.id,laugh)).reactions,[theirs(heart),mine(laugh)].sort((a,b)=>a.emoji<b.emoji?-1:1));
await react(2,dm,reply.id,heart);
await react(1,dm,reply.id,heart);
assert.deepEqual((await react(1,dm,reply.id,heart)).reactions,[mine(heart,2)]);

// SRS-210.4 (#811, #813): the history returns each message's reactions by message ID; messages are unchanged.
const history=await call('socialu_conversation_messages',1,dm);
assert.deepEqual(history.messages,[hi,reply]);
assert.deepEqual(history.reactions[hi.id],[theirs(laugh),mine(heart)].sort((a,b)=>a.emoji<b.emoji?-1:1));
assert.deepEqual(history.reactions[reply.id],[mine(heart,2)]);
assert.deepEqual((await call('socialu_conversation_messages',2,dm)).reactions[reply.id],[mine(heart,2)]);
const later=await call('socialu_send_message',2,dm,'No reactions here');
assert.equal((await call('socialu_conversation_messages',1,dm)).reactions[later.id],undefined);

// SRS-210.5 (#814, #817): a student removes only their own reaction, live to both.
const before=(await live(2)).length;
assert.deepEqual((await unreact(1,dm,hi.id)).reactions,[theirs(laugh)]);
assert.deepEqual((await live(2)).at(-1),{conversation_id:dm,message_id:hi.id,reactions:[mine(laugh)]});
assert.equal((await live(2)).length,before+1);
// Removing it again changes nothing, sends nothing, and never touches the other student's reaction.
assert.deepEqual((await unreact(1,dm,hi.id)).reactions,[theirs(laugh)]);
assert.equal((await live(2)).length,before+1);
assert.deepEqual(await rows(),[{m:hi.id,s:2,emoji:laugh},{m:reply.id,s:1,emoji:heart},{m:reply.id,s:2,emoji:heart}]);

// Refused: emoji outside the set, messages outside the conversation, outsiders and unknown accounts. Nothing changes.
for (const bad of ['😀','x','',' ','👍👍',null]) await assert.rejects(react(1,dm,hi.id,bad),code('SCR01'));
const gid=(await call('socialu_create_group',1)).id;
const early=await call('socialu_send_message',1,gid,'Before anyone joined');
await assert.rejects(react(1,dm,early.id,like),code('SCR04'));
await assert.rejects(react(1,dm,'999999',like),code('SCR04'));
await assert.rejects(unreact(1,dm,'999999'),code('SCR04'));
await assert.rejects(react(5,dm,hi.id,like),code('SC404'));
await assert.rejects(unreact(5,dm,hi.id),code('SC404'));
await assert.rejects(react(1,'999999',hi.id,like),code('SC404'));
await assert.rejects(react('10000000-0000-0000-0000-000000000009',dm,hi.id,like),code('42501'));
assert.equal((await rows()).length,3);

// Groups: members react to messages from their membership period; invited students, outsiders and members who
// joined later get nothing for earlier messages.
await call('socialu_accept_group_invitation',2,(await call('socialu_send_group_invitation',1,gid,'student2')).invitation.id);
await call('socialu_accept_group_invitation',3,(await call('socialu_send_group_invitation',1,gid,'student3')).invitation.id);
await call('socialu_send_group_invitation',1,gid,'student4');
const group=await call('socialu_send_message',2,gid,'Group hello');
for (const n of [1,2,3]) await react(n,gid,group.id,n===3?thanks:wow);
assert.deepEqual((await react(3,gid,group.id,sad)).reactions,[theirs(wow,2),mine(sad)].sort((a,b)=>a.emoji<b.emoji?-1:1));
assert.deepEqual((await live(1)).at(-1),{conversation_id:gid,message_id:group.id,reactions:[mine(wow,2),theirs(sad)].sort((a,b)=>a.emoji<b.emoji?-1:1)});
assert.deepEqual(await live(4),[]);
assert.deepEqual(await live(5),[]);
await assert.rejects(react(4,gid,group.id,like),code('SC404'));
await assert.rejects(react(3,gid,early.id,like),code('SCR04'));
await react(1,gid,early.id,like);
assert.equal((await live(3)).some((event:any)=>event.message_id===early.id),false);
assert.equal((await live(2)).some((event:any)=>event.message_id===early.id),false);
assert.deepEqual((await call('socialu_conversation_messages',3,gid)).reactions,{[group.id]:[theirs(wow,2),mine(sad)].sort((a,b)=>a.emoji<b.emoji?-1:1)});

// A member who left can no longer react or remove, even on messages from their membership period.
await db.query('UPDATE socialu.group_memberships SET left_at=now() WHERE conversation_id=$1 AND student_id=3',[gid]);
await assert.rejects(react(3,gid,group.id,like),code('SC404'));
await assert.rejects(unreact(3,gid,group.id),code('SC404'));
await assert.rejects(db.query('UPDATE socialu.message_reactions SET emoji=$1 WHERE message_id=$2 AND student_id=3',[like,group.id]),/current conversation participation/);
// Their earlier reaction still counts, and they no longer receive updates.
const sentToThree=(await live(3)).length;
assert.deepEqual((await unreact(1,gid,group.id)).reactions,[theirs(wow),theirs(sad)].sort((a,b)=>a.emoji<b.emoji?-1:1));
assert.equal((await live(3)).length,sentToThree);

// The table rule itself (#807): participants of either kind of conversation only, approved emoji only.
await db.query('DELETE FROM socialu.message_reactions WHERE message_id=$1 AND student_id=2',[hi.id]);
await db.query('INSERT INTO socialu.message_reactions VALUES($1,(SELECT student_id FROM socialu.students WHERE username=$2),$3)',[hi.id,'student2',thanks]);
await assert.rejects(db.query('INSERT INTO socialu.message_reactions VALUES($1,(SELECT student_id FROM socialu.students WHERE username=$2),$3)',[hi.id,'student5',like]),/No access to this message/);
await assert.rejects(db.query('INSERT INTO socialu.message_reactions VALUES($1,(SELECT student_id FROM socialu.students WHERE username=$2),$3)',[reply.id,'student2','😀']));
// Read receipts, which share the trigger, work as before.
await call('socialu_mark_conversation_read',1,dm);
await assert.rejects(db.query('INSERT INTO socialu.message_reads(message_id,student_id) VALUES($1,(SELECT student_id FROM socialu.students WHERE username=$2))',[hi.id,'student5']),/No access to this message/);

// SRS-210.3: no new reactions in a private conversation after a block (as for messages); removing still works.
await friends(2,'block','student1');
await assert.rejects(react(1,dm,later.id,like),code('SCR03'));
assert.deepEqual((await unreact(1,dm,reply.id)).reactions,[theirs(heart)]);

// Server-only: browsers (anon, authenticated) cannot call the new or replaced functions or the helpers directly.
for (const fn of ['public.socialu_react_to_message(uuid,bigint,bigint,text)','public.socialu_remove_reaction(uuid,bigint,bigint)','public.socialu_conversation_messages(uuid,bigint)']) {
 for (const role of ['anon','authenticated']) assert.equal((await db.query<any>('SELECT has_function_privilege($1,$2,$3) AS ok',[role,fn,'EXECUTE'])).rows[0].ok,false);
 assert.equal((await db.query<any>('SELECT has_function_privilege($1,$2,$3) AS ok',['service_role',fn,'EXECUTE'])).rows[0].ok,true);
}
for (const fn of ['socialu.chat_message_reactions(bigint,bigint)','socialu.chat_send_reactions(bigint,bigint)']) {
 for (const role of ['anon','authenticated','service_role']) assert.equal((await db.query<any>('SELECT has_function_privilege($1,$2,$3) AS ok',[role,fn,'EXECUTE'])).rows[0].ok,false);
}
} finally { await db.close(); }
}
