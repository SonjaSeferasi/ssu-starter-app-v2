import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
// UR-401/403/405: like, comment on and attend events against the real schema, in memory (nothing hosted is touched).
it('lets students like, comment on and attend events, with counts and attendees, for verified students only', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
for(const file of ['20261008000100_link_supabase_accounts.sql','20261013150000_create_event.sql','20261015120000_list_events.sql','20261027125000_event_dress_code.sql','20261027130000_event_engagement.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));
// Applying the dress code and engagement migrations twice is harmless.
for(const file of ['20261027125000_event_dress_code.sql','20261027130000_event_engagement.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));

const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
// Students 1-3 are verified; student 4 has not verified their university email.
for (let n=1;n<=4;n++) {
 const email=`s${n}@salemstate.edu`;
 await db.query('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),email]);
 await db.query('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,$5)',[`Student ${n}`,`student${n}`,email,uid(n),n===4?null:new Date()]);
}
const call=async(fn:string,...args:unknown[])=>(await db.query<any>(`SELECT public.${fn}(${args.map((_,i)=>'$'+(i+1)).join(',')}) AS r`,args)).rows[0].r;
const code=(expected:string)=>(error:any)=>error.code===expected;
const tomorrow=new Date(Date.now()+86400000).toISOString();
const event=(await call('socialu_create_event',uid(1),'Halloween Parade','Costumes and floats.','Main Quad',tomorrow)).event_id;

// Dress code: optional, trimmed, blank means none, at most 100 characters; shown in the list and details.
const costume=(await call('socialu_create_event',uid(1),'Costume Ball','Dress up.','Ballroom',tomorrow,'  Costumes required  '));
assert.equal(costume.dress_code,'Costumes required');
assert.equal((await call('socialu_create_event',uid(1),'Movie','Bring snacks.','Quad',tomorrow,'   ')).dress_code,null);
assert.equal((await call('socialu_create_event',uid(1),'Study','Bring notes.','Library',tomorrow)).dress_code,null);
await assert.rejects(call('socialu_create_event',uid(1),'Gala','Fancy.','Hall',tomorrow,'x'.repeat(101)),code('22023'));
assert.equal((await call('socialu_list_events',uid(2))).find((e:any)=>e.event_id===costume.event_id).dress_code,'Costumes required');
assert.equal((await call('socialu_event_detail',uid(2),costume.event_id)).dress_code,'Costumes required');
await db.exec("DELETE FROM socialu.events WHERE title IN ('Costume Ball','Movie','Study')");

// A new event starts with no engagement.
const [listed]=await call('socialu_list_events',uid(2));
assert.deepEqual({like_count:listed.like_count,liked_by_me:listed.liked_by_me,comment_count:listed.comment_count,going_count:listed.going_count,going_by_me:listed.going_by_me,attendee_preview:listed.attendee_preview},
 {like_count:0,liked_by_me:false,comment_count:0,going_count:0,going_by_me:false,attendee_preview:[]});

// Likes: one per student, repeat is harmless, unlike removes it.
assert.equal((await call('socialu_event_react',uid(2),event,'like')).like_count,1);
assert.equal((await call('socialu_event_react',uid(2),event,'like')).like_count,1);
const liked=await call('socialu_event_react',uid(3),event,'like');
assert.equal(liked.like_count,2); assert.equal(liked.liked_by_me,true);
assert.equal((await call('socialu_event_react',uid(3),event,'unlike')).like_count,1);
assert.equal((await call('socialu_list_events',uid(2)))[0].liked_by_me,true);
assert.equal((await call('socialu_list_events',uid(3)))[0].liked_by_me,false);

// I'm going: who is attending, in the order they joined.
await call('socialu_event_react',uid(3),event,'going');
const going=await call('socialu_event_react',uid(2),event,'going');
assert.equal(going.going_count,2); assert.equal(going.going_by_me,true);
assert.deepEqual(going.attendee_preview,['student3','student2']);
let detail=await call('socialu_event_detail',uid(1),event);
assert.deepEqual(detail.attendees.map((a:any)=>a.username),['student3','student2']);
assert.equal(detail.going_by_me,false);
assert.equal((await call('socialu_event_react',uid(3),event,'not_going')).going_count,1);

// Comments: trimmed, 1-500 characters, oldest first.
const first=await call('socialu_event_comment',uid(2),event,'  Can’t wait!  ');
assert.equal(first.text,'Can’t wait!'); assert.equal(first.author_username,'student2');
await call('socialu_event_comment',uid(1),event,'See you there');
await assert.rejects(call('socialu_event_comment',uid(2),event,'   '),code('22023'));
await assert.rejects(call('socialu_event_comment',uid(2),event,'x'.repeat(501)),code('22023'));
assert.ok(await call('socialu_event_comment',uid(2),event,'x'.repeat(500)));
detail=await call('socialu_event_detail',uid(3),event);
assert.deepEqual(detail.comments.map((c:any)=>c.author_username),['student2','student1','student2']);
assert.equal(detail.comment_count,3);
assert.equal(detail.title,'Halloween Parade');

// Unverified students, unknown events and cancelled events are not available.
await assert.rejects(call('socialu_event_detail',uid(4),event),code('42501'));
await assert.rejects(call('socialu_event_react',uid(4),event,'like'),code('42501'));
await assert.rejects(call('socialu_event_comment',uid(4),event,'hi'),code('42501'));
await assert.rejects(call('socialu_event_detail',uid(2),'999'),code('SE404'));
await assert.rejects(call('socialu_event_react',uid(2),'999','like'),code('SE404'));
await assert.rejects(call('socialu_event_react',uid(2),event,'dance'),code('22023'));
await assert.rejects(call('socialu_event_react','00000000-0000-0000-0000-000000000009',event,'like'),code('42501'));
await db.query("UPDATE socialu.events SET status='cancelled' WHERE event_id=$1",[event]);
await assert.rejects(call('socialu_event_react',uid(2),event,'like'),code('SE404'));
await db.query("UPDATE socialu.events SET status='active' WHERE event_id=$1",[event]);

// Attendance closes once the event has started; likes and comments still work.
await db.query("UPDATE socialu.events SET starts_at=now()-interval '1 hour' WHERE event_id=$1",[event]);
await assert.rejects(call('socialu_event_react',uid(3),event,'going'),code('SE409'));
await assert.rejects(call('socialu_event_react',uid(2),event,'not_going'),code('SE409'));
assert.equal((await call('socialu_event_react',uid(3),event,'like')).like_count,2);

// Events stay listed after they start: upcoming soonest first, then past events, most recent first.
const later=(await call('socialu_create_event',uid(1),'Later','Soon.','Gym',new Date(Date.now()+2*86400000).toISOString())).event_id;
const soon=(await call('socialu_create_event',uid(1),'Soon','Sooner.','Gym',new Date(Date.now()+3600000).toISOString())).event_id;
const old=(await call('socialu_create_event',uid(1),'Old','Long ago.','Gym',new Date(Date.now()+3600000).toISOString())).event_id;
await db.query("UPDATE socialu.events SET starts_at=now()-interval '30 days' WHERE event_id=$1",[old]);
assert.deepEqual((await call('socialu_list_events',uid(2))).map((e:any)=>e.event_id),[soon,later,event,old]);
await db.query('DELETE FROM socialu.events WHERE event_id = ANY($1)',[[later,soon,old]]);

// Deleting an event removes its likes, comments and attendees.
await db.query('DELETE FROM socialu.events WHERE event_id=$1',[event]);
for (const table of ['event_likes','event_comments','event_attendees'])
 assert.equal((await db.query<any>(`SELECT count(*)::int AS n FROM socialu.${table}`)).rows[0].n,0);

// Only the server can call these functions; browsers cannot.
for (const role of ['anon','authenticated']) for (const fn of ['socialu_event_detail(uuid,bigint)','socialu_event_react(uuid,bigint,text)','socialu_event_comment(uuid,bigint,text)','socialu_list_events(uuid)'])
 assert.equal((await db.query<any>('SELECT has_function_privilege($1,$2,\'EXECUTE\') AS ok',[role,'public.'+fn])).rows[0].ok,false);
assert.equal((await db.query<any>("SELECT has_function_privilege('service_role','public.socialu_event_react(uuid,bigint,text)','EXECUTE') AS ok")).rows[0].ok,true);
}, 60000);
