import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
// UR-404: the creator cancels an event; invited students still see it, marked cancelled, with the notice.
it('lets only the creator cancel an upcoming event and shows the cancellation to invited students', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
for(const file of ['20261008000100_link_supabase_accounts.sql','20261013150000_create_event.sql','20261015120000_list_events.sql','20261027125000_event_dress_code.sql','20261027130000_event_engagement.sql','20261027140000_event_invitations.sql','20261113120000_event_cancellation.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));
// Safe to re-run.
await db.exec(readFileSync(root+'/supabase/migrations/20261113120000_event_cancellation.sql','utf8'));

// Student 1 creates the event; 2 is invited; 3 is going but not invited; 4 is a classmate with no link to the event.
const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
for (let n=1;n<=4;n++) {
 await db.query('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
 await db.query('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n)]);
}
const call=async(fn:string,...args:unknown[])=>(await db.query<any>(`SELECT public.${fn}(${args.map((_,i)=>'$'+(i+1)).join(',')}) AS r`,args)).rows[0].r;
const code=(expected:string)=>(error:any)=>error.code===expected;
const create=async(title:string)=>(await call('socialu_create_event',uid(1),title,'Costumes and floats.','Main Quad',new Date(Date.now()+86400000).toISOString())).event_id;
const event=await create('Halloween Parade');
await call('socialu_event_invite',uid(1),event,JSON.stringify(['2']));
await call('socialu_event_react',uid(3),event,'going');

// Only the creator can cancel; the note is limited to 300 characters.
await assert.rejects(call('socialu_event_cancel',uid(2),event,null),code('SE403'));
await assert.rejects(call('socialu_event_cancel',uid(1),event,'x'.repeat(301)),code('22023'));
await assert.rejects(call('socialu_event_cancel',uid(1),'999',null),code('SE404'));
assert.equal((await call('socialu_event_detail',uid(2),event)).status,'active');

// The creator confirms: the event is marked cancelled, with when and why.
const cancelled=await call('socialu_event_cancel',uid(1),event,'  Rain is forecast.  ');
assert.equal(cancelled.status,'cancelled');
assert.equal(cancelled.cancellation_note,'Rain is forecast.');
assert.ok(cancelled.cancelled_at);
const row=(await db.query<any>('SELECT status,cancelled_at,cancellation_note FROM socialu.events WHERE event_id=$1',[event])).rows[0];
assert.equal(row.status,'cancelled');
// Cancelling again is harmless and keeps the first notice.
assert.deepEqual(await call('socialu_event_cancel',uid(1),event,'Another reason'),cancelled);

// The invited student still sees the event and the invitation, both marked cancelled with the notice.
const seen=await call('socialu_event_detail',uid(2),event);
assert.deepEqual([seen.status,seen.cancellation_note],['cancelled','Rain is forecast.']);
const mine=await call('socialu_my_event_invitations',uid(2));
assert.deepEqual(mine.map((i:any)=>[i.title,i.status,i.cancellation_note]),[['Halloween Parade','cancelled','Rain is forecast.']]);
// The creator and students who were going can still open it; anyone else cannot, and it leaves the public list.
assert.equal((await call('socialu_event_detail',uid(1),event)).status,'cancelled');
assert.equal((await call('socialu_event_detail',uid(3),event)).status,'cancelled');
await assert.rejects(call('socialu_event_detail',uid(4),event),code('SE404'));
assert.deepEqual((await call('socialu_list_events',uid(4))).map((e:any)=>e.event_id),[]);
// A cancelled event takes no more likes, attendance or invitations.
await assert.rejects(call('socialu_event_react',uid(2),event,'like'),code('SE404'));
await assert.rejects(call('socialu_event_invite',uid(1),event,JSON.stringify(['4'])),code('SE404'));

// An event that has already started can no longer be cancelled.
const started=await create('Bonfire');
await db.query("UPDATE socialu.events SET starts_at=now()-interval '1 hour' WHERE event_id=$1",[started]);
await assert.rejects(call('socialu_event_cancel',uid(1),started,null),code('SE409'));
// A cancelled event always records when; an active one never does.
await assert.rejects(db.query("UPDATE socialu.events SET status='cancelled' WHERE event_id=$1",[started]),code('23514'));

// Only the server can call the new function; browsers cannot.
for (const role of ['anon','authenticated'])
 assert.equal((await db.query<any>("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok",[role,'public.socialu_event_cancel(uuid,bigint,text)'])).rows[0].ok,false);
}, 60000);
