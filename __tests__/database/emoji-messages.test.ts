import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
const chat=['20261012120000_chat_send_text_message.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql','20261019190000_chat_unread_status.sql','20261019190100_chat_mark_read.sql'];
const invitations=['20261026120000_chat_group_invite_friends.sql','20261026120100_chat_send_group_invitation.sql','20261026130000_chat_pending_group_invitations.sql','20261026130100_chat_accept_group_invitation.sql','20261026130200_chat_decline_group_invitation.sql'];
const emoji=['20261026140000_chat_send_emoji.sql','20261026140100_chat_emoji_in_history.sql'];
// The migrations chat.test.ts uses, and main's latest set including LN's school communities (which also changes
// the conversation list), so emoji messages work either way.
const chatOnly=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql',...chat,...invitations,...emoji];
const withSchools=['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261020000100_like_notifications.sql','20261021000100_comment_replies.sql','20261022000000_friend_requests_notifications.sql','20261022010000_notification_read_state.sql','20261022000100_comment_notifications.sql','20261022050000_integrate_notifications_with_main.sql','20261024000100_unify_notifications.sql',...chat,'20261013150000_create_event.sql','20261015120000_list_events.sql','20261026000100_school_communities.sql',...invitations,...emoji];
// SRS-201.8 / SRS-201.9 (#798, #801): send an emoji and see it in history, live updates and the list preview,
// against the real schema in memory (nothing hosted is touched).
it('sends an emoji as its own message and shows it wherever messages are loaded', () => emojiWorks(chatOnly), 60000);
it('works the same with school communities applied', () => emojiWorks(withSchools), 60000);

async function emojiWorks(migrations: string[]) {
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
for (let n=1;n<=4;n++) {
 await db.query('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
 await db.query('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n)]);
}
const friends=async(n:number,action:string,target:string,id:string|null=null)=>(await db.query<any>('SELECT public.socialu_friendships($1,$2,$3,$4) AS r',[uid(n),action,target,id])).rows[0].r;
const befriend=async(a:number,b:number)=>{ await friends(b,'accept',`student${a}`,(await friends(a,'send',`student${b}`)).request_id); };
const call=async(fn:string,n:number|string,...args:unknown[])=>(await db.query<any>(`SELECT public.${fn}(${['$1',...args.map((_,i)=>'$'+(i+2))].join(',')}) AS r`,[typeof n==='number'?uid(n):n,...args])).rows[0].r;
const sendEmoji=(n:number,c:string,value:string)=>call('socialu_send_emoji',n,c,value);
const history=async(n:number,c:string)=>(await call('socialu_conversation_messages',n,c)).messages;
const preview=async(n:number,c:string)=>(await call('socialu_conversation_list',n)).conversations.find((x:any)=>x.id===c)?.last_message;
const broadcasts=async(n:number)=>(await db.query<any>("SELECT payload FROM realtime.sent WHERE topic=$1 AND event='message_created'",['student:'+uid(n)])).rows.map(r=>r.payload);
const saved=async(c:string)=>(await db.query<any>('SELECT count(*)::int AS n FROM socialu.messages WHERE conversation_id=$1',[c])).rows[0].n;
const code=(expected:string)=>(error:any)=>error.code===expected;

// Students 1 and 2 are friends with a private conversation; student 3 is outside it.
await befriend(1,2);
const cid=(await friends(1,'message','student2')).conversation_id;

// SRS-201.8 (#795): an emoji is saved as its own 'emoji' message and sent live to both participants.
const hello=await call('socialu_send_message',1,cid,'Hello');
const laugh=await sendEmoji(2,cid,'😂');
assert.deepEqual({...laugh,id:undefined,sent_at:undefined},{id:undefined,conversation_id:cid,sender_id:'2',text:'😂',sent_at:undefined,kind:'emoji'});
assert.deepEqual((await db.query<any>('SELECT kind,text_content,status FROM socialu.messages WHERE message_id=$1',[laugh.id])).rows[0],{kind:'emoji',text_content:'😂',status:'sent'});
assert.deepEqual(await broadcasts(1),[hello,laugh]);
assert.deepEqual(await broadcasts(2),[hello,laugh]);

// SRS-201.9 (#799): history returns the emoji in the same shape as the live event, so the page merges both;
// text messages keep exactly the fields they had before (no kind).
assert.deepEqual(await history(1,cid),[hello,laugh]);
assert.deepEqual(await history(2,cid),[hello,laugh]);
assert.ok(!('kind' in hello));
// The Messages list preview shows the latest emoji.
assert.deepEqual(await preview(1,cid),{text:'😂',sender_id:'2',sent_at:laugh.sent_at});
// Emoji made of several parts (heart with its style selector, skin tones, families) are saved whole.
for (const value of ['❤️','👍🏽','👨‍👩‍👧‍👦']) assert.equal((await sendEmoji(1,cid,value)).text,value);
assert.equal((await preview(2,cid)).text,'👨‍👩‍👧‍👦');

// Ordinary text, spaces, digits and long values are refused, with nothing saved (the API also checks for
// exactly one emoji before calling the database).
const count=await saved(cid);
for (const value of ['hello','ok👍','😀 😀','1','',' ','😀'.repeat(17)]) await assert.rejects(sendEmoji(1,cid,value),code('SCE01'));
await assert.rejects(call('socialu_send_emoji',1,cid,null),code('SCE01'));
assert.equal(await saved(cid),count);

// SRS-213.1: an outsider cannot send one, nothing is saved, and nothing is broadcast to them.
await assert.rejects(sendEmoji(3,cid,'👋'),code('SC404'));
await assert.rejects(sendEmoji(1,'999999','👋'),code('SC404'));
await assert.rejects(call('socialu_send_emoji','10000000-0000-0000-0000-000000000009',cid,'👋'),code('42501'));
assert.equal(await saved(cid),count);
assert.deepEqual(await broadcasts(3),[]);

// Groups: members send and see emoji; a member sees only messages from their membership period.
await befriend(1,4);
const gid=(await call('socialu_create_group',1)).id;
const party=await sendEmoji(1,gid,'🎉');
const invite=(await call('socialu_send_group_invitation',1,gid,'student4')).invitation.id;
await call('socialu_accept_group_invitation',4,invite);
const wave=await sendEmoji(4,gid,'👋');
assert.equal(wave.kind,'emoji');
assert.deepEqual(await history(1,gid),[party,wave]);
assert.deepEqual(await history(4,gid),[wave]);
assert.deepEqual((await broadcasts(1)).slice(-1),[wave]);
assert.equal((await preview(1,gid)).text,'👋');
await assert.rejects(sendEmoji(3,gid,'👋'),code('SC404'));

// A block stops private emoji like it stops text (SC403), in both directions, with nothing saved.
const dm=(await friends(1,'message','student4')).conversation_id;
await friends(4,'block','student1');
await assert.rejects(sendEmoji(1,dm,'👋'),code('SC403'));
await assert.rejects(sendEmoji(4,dm,'👋'),code('SC403'));
assert.equal(await saved(dm),0);

// The replaced list keeps LN's school rule where it is installed: a DM with a student from another school stays
// hidden like a blocked one (without her migration there are no schools, so it is listed as before).
if (migrations===withSchools) await db.query("SELECT socialu.ensure_school('s9@example.edu')");
else await db.query("INSERT INTO socialu.university_domains(domain,university_id) SELECT 'example.edu',min(university_id) FROM socialu.university");
await db.query("INSERT INTO auth.users VALUES($1,'s9@example.edu',now())",[uid(9)]);
const other=(await db.query<any>("INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES('Student 9','student9','s9@example.edu',$1,now()) RETURNING student_id::int AS id",[uid(9)])).rows[0].id;
const away=(await db.query<any>("INSERT INTO socialu.conversations(kind,created_by,private_student_low,private_student_high) VALUES('private',1,1,$1) RETURNING conversation_id::text AS c",[other])).rows[0].c;
const listed=(await call('socialu_conversation_list',1)).conversations.some((x:any)=>x.id===away);
assert.equal(listed,migrations!==withSchools);

// Server-only: browsers (anon, authenticated) cannot call the new function directly.
const fn='public.socialu_send_emoji(uuid,bigint,text)';
for (const role of ['anon','authenticated']) assert.equal((await db.query<any>('SELECT has_function_privilege($1,$2,$3) AS ok',[role,fn,'EXECUTE'])).rows[0].ok,false);
assert.equal((await db.query<any>('SELECT has_function_privilege($1,$2,$3) AS ok',['service_role',fn,'EXECUTE'])).rows[0].ok,true);
// The replaced history and list functions stay server-only too.
for (const replaced of ['public.socialu_conversation_messages(uuid,bigint)','public.socialu_conversation_list(uuid)'])
 for (const role of ['anon','authenticated']) assert.equal((await db.query<any>('SELECT has_function_privilege($1,$2,$3) AS ok',[role,replaced,'EXECUTE'])).rows[0].ok,false);
} finally { await db.close(); }
}
