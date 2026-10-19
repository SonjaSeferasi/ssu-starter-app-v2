import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
// SRS-201.1 / SRS-201.2: send and retrieve chat messages against the real schema, in memory (nothing hosted is touched).
it('retrieves saved text messages for participants only, oldest first, in the same shape as the live event', async () => {
const db=new PGlite();
// Minimal stand-ins for Supabase's auth and realtime schemas; realtime.send records what would be broadcast.
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid,created_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
CREATE SCHEMA realtime;CREATE TABLE realtime.messages(extension text,topic text);CREATE TABLE realtime.sent(topic text,event text,payload jsonb);
CREATE FUNCTION realtime.topic() RETURNS text LANGUAGE sql AS 'SELECT NULL::text';
CREATE FUNCTION realtime.send(payload jsonb,event text,topic text,private boolean) RETURNS void LANGUAGE sql AS 'INSERT INTO realtime.sent VALUES($3,$2,$1)';`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
try {
for(const file of ['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261008000300_fix_deferred_post_trigger.sql','20261012120000_chat_send_text_message.sql','20261012230000_srs_100_105_auth.sql','20261013200000_srs_109_113_profile.sql','20261015180000_profile_social.sql','20261015190000_profile_full_name.sql','20261016000100_like_post.sql','20261016001000_optional_profile_bio.sql','20261016010000_friendships.sql','20261016020000_feed_profile_links.sql','20261016030000_edit_profile_username.sql','20261016040000_friend_accept_mutual_follow.sql','20261017000100_unlike_post.sql','20261018000100_post_comments.sql','20261018010000_integrate_profile_feed.sql','20261019120000_chat_conversation_messages.sql','20261019120100_chat_group_structure_check_as_owner.sql','20261019150000_chat_conversation_list.sql','20261019170000_chat_create_group.sql','20261019170100_chat_conversation_role.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));
const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
for (let n=1;n<=4;n++) {
 await db.query('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
 await db.query('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n)]);
}
const friends=async(n:number,action:string,target:string,id:string|null=null)=>(await db.query<any>('SELECT public.socialu_friendships($1,$2,$3,$4) AS r',[uid(n),action,target,id])).rows[0].r;
const send=async(n:number,c:string,text:string)=>(await db.query<any>('SELECT public.socialu_send_message($1,$2,$3) AS m',[uid(n),c,text])).rows[0].m;
const history=async(n:number|string,c:string)=>(await db.query<any>('SELECT public.socialu_conversation_messages($1,$2) AS h',[typeof n==='number'?uid(n):n,c])).rows[0].h;
const texts=async(n:number,c:string)=>(await history(n,c)).messages.map((m:any)=>m.text);
const code=(expected:string)=>(error:any)=>error.code===expected;

// Students 1 and 2 are friends with a private conversation; student 3 is outside it.
await friends(2,'accept','student1',(await friends(1,'send','student2')).request_id);
const cid=(await friends(1,'message','student2')).conversation_id;
const dm={kind:'private',role:null,member_count:null};
assert.deepEqual(await history(1,cid),{student_id:'1',...dm,messages:[]});

// Saved history equals what was broadcast live, so the page can merge both by ID without duplicates.
const hello=await send(1,cid,'Hello'), hi=await send(2,cid,'Hi');
assert.deepEqual(await history(1,cid),{student_id:'1',...dm,messages:[hello,hi]});
assert.deepEqual(await history(2,cid),{student_id:'2',...dm,messages:[hello,hi]});
assert.deepEqual((await db.query<any>("SELECT payload FROM realtime.sent WHERE topic=$1 AND event='message_created'",['student:'+uid(2)])).rows.map(r=>r.payload),[hello,hi]);

// Outsiders, missing conversations and unknown accounts get nothing.
await assert.rejects(history(3,cid),code('SC404'));
await assert.rejects(history(1,'999999'),code('SC404'));
await assert.rejects(history('10000000-0000-0000-0000-000000000009',cid),code('42501'));

// Only successfully sent text messages are returned.
await db.query("INSERT INTO socialu.messages(conversation_id,sender_id,kind,text_content,status) VALUES($1,1,'text','never sent','failed')",[cid]);
assert.deepEqual(await texts(1,cid),['Hello','Hi']);

// The latest 50 messages, oldest first.
for (let i=1;i<=50;i++) await send(i%2+1,cid,`Message ${i}`);
const recent=(await history(1,cid)).messages;
assert.equal(recent.length,50);
assert.equal(recent[0].text,'Message 1'); assert.equal(recent[49].text,'Message 50');
assert.ok(recent.every((m:any,i:number)=>i===0||Date.parse(recent[i-1].sent_at)<=Date.parse(m.sent_at)));

// Group members only see messages from their own membership period (can_read_message).
await db.exec("BEGIN;INSERT INTO socialu.conversations(kind,created_by) VALUES('group',1);INSERT INTO socialu.group_memberships(conversation_id,student_id,role,joined_at) VALUES(currval(pg_get_serial_sequence('socialu.conversations','conversation_id')),1,'owner',now()-interval '2 hours');COMMIT;");
const gid=String((await db.query<any>("SELECT max(conversation_id) AS g FROM socialu.conversations WHERE kind='group'")).rows[0].g);
await send(1,gid,'Before');
await db.exec("UPDATE socialu.messages SET created_at=created_at-interval '1 hour',sent_at=sent_at-interval '1 hour' WHERE text_content='Before'");
await db.query('INSERT INTO socialu.group_memberships(conversation_id,student_id) VALUES($1,4)',[gid]);
await send(1,gid,'After');
assert.deepEqual(await texts(1,gid),['Before','After']);
assert.deepEqual(await texts(4,gid),['After']);
await assert.rejects(history(3,gid),code('SC404'));
// #460: the group's kind, the student's role, and the member count come from the database.
{ const owner=await history(1,gid), member=await history(4,gid);
  assert.deepEqual([owner.kind,owner.role,owner.member_count],['group','owner',2]);
  assert.deepEqual([member.kind,member.role,member.member_count],['group','member',2]); }

// #457: the Messages list shows DMs by the friend's name and groups with member counts, newest activity first.
const conversations=async(n:number)=>(await db.query<any>('SELECT public.socialu_conversation_list($1) AS l',[uid(n)])).rows[0].l;
const mine=await conversations(1);
assert.equal(mine.student_id,'1');
assert.deepEqual(mine.conversations.map((c:any)=>[c.id,c.kind]),[[gid,'group'],[cid,'private']]);
assert.deepEqual(mine.conversations[1],{id:cid,kind:'private',name:'Student 2',username:'student2',member_count:null,last_message:{text:'Message 50',sender_id:'1',sent_at:recent[49].sent_at}});
assert.equal(mine.conversations[0].name,null); assert.equal(mine.conversations[0].member_count,2); assert.equal(mine.conversations[0].last_message.text,'After');
assert.deepEqual((await conversations(4)).conversations.map((c:any)=>c.id),[gid]);
assert.deepEqual((await conversations(3)).conversations,[]);
// A new DM without messages is listed too.
await friends(4,'accept','student3',(await friends(3,'send','student4')).request_id);
const fresh=(await friends(3,'message','student4')).conversation_id;
assert.deepEqual((await conversations(3)).conversations,[{id:fresh,kind:'private',name:'Student 4',username:'student4',member_count:null,last_message:null}]);
// DMs with a blocked student are hidden for both students, like the conversation header.
await friends(2,'block','student1');
assert.deepEqual((await conversations(1)).conversations.map((c:any)=>c.id),[gid]);
assert.deepEqual((await conversations(2)).conversations,[]);

// SRS-202.1 / SRS-203.1 (#454, #459): creating a group makes the creator its first member and only owner.
const create=async(n:number|string)=>(await db.query<any>('SELECT public.socialu_create_group($1) AS g',[typeof n==='number'?uid(n):n])).rows[0].g;
const g2=await create(3);
assert.deepEqual({...g2,id:undefined},{id:undefined,kind:'group',role:'owner',member_count:1});
assert.deepEqual((await db.query<any>('SELECT student_id::int AS s,role,left_at FROM socialu.group_memberships WHERE conversation_id=$1',[g2.id])).rows,[{s:3,role:'owner',left_at:null}]);
assert.equal((await db.query<any>('SELECT created_by::int AS c FROM socialu.conversations WHERE conversation_id=$1',[g2.id])).rows[0].c,3);
assert.deepEqual({...(await history(3,g2.id)),student_id:undefined},{student_id:undefined,kind:'group',role:'owner',member_count:1,messages:[]});
assert.deepEqual((await conversations(3)).conversations.map((c:any)=>[c.id,c.kind,c.member_count]),[[g2.id,'group',1],[fresh,'private',null]]);
await assert.rejects(history(1,g2.id),code('SC404'));
assert.equal((await send(3,g2.id,'First')).text,'First');
assert.deepEqual(await texts(3,g2.id),['First']);
const g3=await create(3);
assert.notEqual(g3.id,g2.id);
assert.equal((await db.query<any>("SELECT count(*)::int AS n FROM socialu.group_memberships WHERE conversation_id IN ($1,$2) AND role='owner' AND left_at IS NULL",[g2.id,g3.id])).rows[0].n,2);
await assert.rejects(create('10000000-0000-0000-0000-000000000009'),code('42501'));

// Browser roles cannot call the server-only functions.
for (const role of ['anon','authenticated']) {
 await db.exec(`SET ROLE ${role}`);
 await assert.rejects(history(1,cid));
 await assert.rejects(conversations(1));
 await assert.rejects(create(1));
 await db.exec('RESET ROLE');
}
} finally { await db.close(); }
}, 30000);
