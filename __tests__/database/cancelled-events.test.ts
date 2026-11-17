import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
// UR-404: cancelled events leave the active list and appear in each involved student's cancelled list (Cancelled, History).
it('lists cancelled events for their host, invited students and students who were going, newest first', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
for(const file of ['20261008000100_link_supabase_accounts.sql','20261013150000_create_event.sql','20261015120000_list_events.sql','20261027125000_event_dress_code.sql','20261027130000_event_engagement.sql','20261027140000_event_invitations.sql','20261113120000_event_cancellation.sql','20261113130000_event_rsvp.sql','20261113140000_event_update.sql','20261113160000_event_input_limits.sql','20261117170000_cancelled_events.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));
// Safe to re-run.
await db.exec(readFileSync(root+'/supabase/migrations/20261117170000_cancelled_events.sql','utf8'));

// 1 hosts; 2 is invited; 3 is going; 4 is an uninvolved classmate.
const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
for (let n=1;n<=4;n++) {
 await db.query('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
 await db.query('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n)]);
}
const call=async(fn:string,...args:unknown[])=>(await db.query<any>(`SELECT public.${fn}(${args.map((_,i)=>'$'+(i+1)).join(',')}) AS r`,args)).rows[0].r;
const day=(n:number)=>new Date(Date.now()+n*86400000).toISOString();
const create=async(title:string)=>(await call('socialu_create_event',uid(1),title,'Floats.','Quad',day(2))).event_id;
const titles=async(n:number)=>(await call('socialu_cancelled_events',uid(n))).map((e:any)=>e.title);

const parade=await create('Halloween Parade');
const bonfire=await create('Bonfire');
const still=await create('Still On');
await call('socialu_event_invite',uid(1),parade,JSON.stringify(['2']));
await call('socialu_event_react',uid(3),parade,'going');
await call('socialu_event_react',uid(3),bonfire,'going');
for (const n of [1,2,3,4]) assert.deepEqual(await call('socialu_cancelled_events',uid(n)),[]);

// The host cancels two events: they leave the active list and appear, newest cancellation first.
await call('socialu_event_cancel',uid(1),parade,'Rain is forecast.');
await db.query("UPDATE socialu.events SET cancelled_at=now()-interval '1 hour' WHERE event_id=$1",[parade]);
await call('socialu_event_cancel',uid(1),bonfire,null);
assert.deepEqual((await call('socialu_list_events',uid(4))).map((e:any)=>e.event_id),[still]);
assert.deepEqual(await titles(1),['Bonfire','Halloween Parade']);
const mine=(await call('socialu_cancelled_events',uid(1)))[1];
assert.deepEqual([mine.status,mine.cancellation_note,mine.hosted_by_me,mine.creator_username],['cancelled','Rain is forecast.',true,'student1']);
assert.ok(mine.cancelled_at);
// The invited student sees the event they were invited to; the student who was going sees both; others see none.
assert.deepEqual(await titles(2),['Halloween Parade']);
assert.equal((await call('socialu_cancelled_events',uid(2)))[0].hosted_by_me,false);
assert.deepEqual(await titles(3),['Bonfire','Halloween Parade']);
assert.deepEqual(await titles(4),[]);
// The cancelled event is kept, not erased, so its page still shows the notice to the people it concerns.
assert.equal((await call('socialu_event_detail',uid(2),parade)).status,'cancelled');

// Only the server can call it; browsers cannot.
for (const role of ['anon','authenticated'])
 assert.equal((await db.query<any>("SELECT has_function_privilege($1,'public.socialu_cancelled_events(uuid)','EXECUTE') AS ok",[role])).rows[0].ok,false);
}, 60000);
