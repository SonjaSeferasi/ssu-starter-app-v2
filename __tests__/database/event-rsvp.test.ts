import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
// UR-403: an invited student accepts an event invitation, recorded as the RSVP 'attending'.
it('records an invited student’s acceptance as an RSVP that they plan to attend', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
for(const file of ['20261008000100_link_supabase_accounts.sql','20261013150000_create_event.sql','20261015120000_list_events.sql','20261027125000_event_dress_code.sql','20261027130000_event_engagement.sql','20261027140000_event_invitations.sql','20261113120000_event_cancellation.sql','20261113130000_event_rsvp.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));
// Safe to re-run.
await db.exec(readFileSync(root+'/supabase/migrations/20261113130000_event_rsvp.sql','utf8'));

// Student 1 hosts; 2 and 3 are invited; 4 is a classmate who was not invited.
const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
for (let n=1;n<=4;n++) {
 await db.query('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
 await db.query('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n)]);
}
const call=async(fn:string,...args:unknown[])=>(await db.query<any>(`SELECT public.${fn}(${args.map((_,i)=>'$'+(i+1)).join(',')}) AS r`,args)).rows[0].r;
const code=(expected:string)=>(error:any)=>error.code===expected;
const create=async(title:string)=>(await call('socialu_create_event',uid(1),title,'Costumes and floats.','Main Quad',new Date(Date.now()+86400000).toISOString())).event_id;
const rsvp=async(event:string,n:number)=>(await db.query<any>('SELECT rsvp FROM socialu.event_invitations WHERE event_id=$1 AND invitee_id=$2',[event,n])).rows[0]?.rsvp;
const event=await create('Halloween Parade');
await call('socialu_event_invite',uid(1),event,JSON.stringify(['2','3']));
assert.equal(await rsvp(event,2),'pending');

// The invited student accepts: the RSVP records that they plan to attend.
assert.deepEqual(await call('socialu_event_rsvp',uid(2),event,'attending'),{event_id:event,rsvp:'attending'});
assert.equal(await rsvp(event,2),'attending');
// Only their own invitation changes.
assert.equal(await rsvp(event,3),'pending');
// They see it on their invitation, and the host sees it on the invitation list.
assert.equal((await call('socialu_my_event_invitations',uid(2)))[0].rsvp,'attending');
assert.deepEqual((await call('socialu_event_invitations',uid(1),event)).map((s:any)=>[s.username,s.rsvp]),[['student2','attending'],['student3','pending']]);
// Accepting again is harmless; they can change their mind until the event starts.
assert.equal((await call('socialu_event_rsvp',uid(2),event,'attending')).rsvp,'attending');
assert.equal((await call('socialu_event_rsvp',uid(3),event,'not_attending')).rsvp,'not_attending');
assert.equal((await call('socialu_event_rsvp',uid(3),event,'attending')).rsvp,'attending');

// Only invited students can answer, with a known response, to an event they can see.
await assert.rejects(call('socialu_event_rsvp',uid(4),event,'attending'),code('SE403'));
await assert.rejects(call('socialu_event_rsvp',uid(1),event,'attending'),code('SE403'));
for (const bad of ['pending','yes','',null]) await assert.rejects(call('socialu_event_rsvp',uid(2),event,bad),code('22023'));
await assert.rejects(call('socialu_event_rsvp',uid(2),'999','attending'),code('SE404'));

// Once the event starts, or once it is cancelled, the RSVP can no longer change.
const started=await create('Bonfire');
await call('socialu_event_invite',uid(1),started,JSON.stringify(['2']));
await db.query("UPDATE socialu.events SET starts_at=now()-interval '1 hour' WHERE event_id=$1",[started]);
await assert.rejects(call('socialu_event_rsvp',uid(2),started,'attending'),code('SE409'));
assert.equal(await rsvp(started,2),'pending');
await call('socialu_event_cancel',uid(1),event,null);
await assert.rejects(call('socialu_event_rsvp',uid(2),event,'not_attending'),code('SE404'));

// Only the server can call the new function; browsers cannot.
for (const role of ['anon','authenticated'])
 assert.equal((await db.query<any>("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok",[role,'public.socialu_event_rsvp(uuid,bigint,text)'])).rows[0].ok,false);
}, 60000);
