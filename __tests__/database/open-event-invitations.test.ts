import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
// Invitations: every upcoming event another student posted at the school, plus host invitations, each answerable.
it('lists other students’ events as invitations; accept keeps them, decline removes them from invitations only', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
for(const file of ['20261008000100_link_supabase_accounts.sql','20261013150000_create_event.sql','20261015120000_list_events.sql','20261027125000_event_dress_code.sql','20261027130000_event_engagement.sql','20261027140000_event_invitations.sql','20261113120000_event_cancellation.sql','20261113130000_event_rsvp.sql','20261113140000_event_update.sql','20261113160000_event_input_limits.sql','20261117170000_cancelled_events.sql','20261117180000_open_event_invitations.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));
// Safe to re-run.
await db.exec(readFileSync(root+'/supabase/migrations/20261117180000_open_event_invitations.sql','utf8'));

// Students 1-4 at Salem State; student 4 is unverified (not an active account). Other schools are kept apart by
// socialu.event_visible_to, the same rule as the event list (covered by the event engagement tests).
const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
for (let n=1;n<=4;n++) {
 const email=`s${n}@salemstate.edu`;
 await db.query('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),email]);
 await db.query('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,$5)',[`Student ${n}`,`student${n}`,email,uid(n),n===4?null:new Date()]);
}
const call=async(fn:string,...args:unknown[])=>(await db.query<any>(`SELECT public.${fn}(${args.map((_,i)=>'$'+(i+1)).join(',')}) AS r`,args)).rows[0].r;
const code=(expected:string)=>(error:any)=>error.code===expected;
const day=(n:number)=>new Date(Date.now()+n*86400000).toISOString();
const create=async(n:number,title:string,when=day(1))=>(await call('socialu_create_event',uid(n),title,'Details.','Quad',when)).event_id;
const invitations=async(n:number)=>(await call('socialu_my_event_invitations',uid(n))).map((i:any)=>[i.title,i.rsvp,i.invited]);
const shown=async(n:number)=>(await invitations(n)).filter(([,rsvp])=>rsvp!=='not_attending').map(([title])=>title);

const parade=await create(1,'Halloween Parade');
const bonfire=await create(1,'Bonfire',day(2));
const myOwn=await create(2,'Study Group');
const started=await create(1,'Started');
await db.query("UPDATE socialu.events SET starts_at=now()-interval '1 hour' WHERE event_id=$1",[started]);
await call('socialu_event_invite',uid(1),bonfire,JSON.stringify(['2']));

// Student 2 sees every upcoming event another student posted at their school: not their own, not one that has started; the host's invitation is marked as invited.
assert.deepEqual(await invitations(2),[['Halloween Parade','pending',false],['Bonfire','pending',true]]);
assert.deepEqual(await invitations(3),[['Halloween Parade','pending',false],['Study Group','pending',false],['Bonfire','pending',false]]);
await assert.rejects(invitations(4),code('42501'));

// Accept keeps the invitation, now Accepted; the answer to an event they weren't invited to is kept separately,
// so the host's invitation list is unchanged.
assert.deepEqual(await call('socialu_event_rsvp',uid(2),parade,'attending'),{event_id:parade,rsvp:'attending'});
assert.deepEqual(await shown(2),['Halloween Parade','Bonfire']);
assert.equal((await invitations(2))[0][1],'attending');
assert.deepEqual(await call('socialu_event_invitations',uid(1),parade),[]);
// A host invitation records the RSVP on the invitation, as before.
await call('socialu_event_rsvp',uid(2),bonfire,'attending');
assert.deepEqual((await call('socialu_event_invitations',uid(1),bonfire)).map((s:any)=>[s.username,s.rsvp]),[['student2','attending']]);

// Decline removes it from Invitations, for either kind, while the event stays on Events and Trending for everyone.
await call('socialu_event_rsvp',uid(3),parade,'not_attending');
await call('socialu_event_rsvp',uid(2),bonfire,'not_attending');
assert.deepEqual(await shown(3),['Study Group','Bonfire']);
assert.deepEqual(await shown(2),['Halloween Parade']);
assert.ok((await call('socialu_list_events',uid(3))).some((e:any)=>e.event_id===parade));
assert.equal((await call('socialu_event_detail',uid(3),parade)).title,'Halloween Parade');
// Changing their mind brings it back.
await call('socialu_event_rsvp',uid(3),parade,'attending');
assert.deepEqual(await shown(3),['Halloween Parade','Study Group','Bonfire']);

// Hosts don't answer their own events; missing, started or cancelled events, and unknown answers are refused.
await assert.rejects(call('socialu_event_rsvp',uid(2),myOwn,'attending'),code('SE403'));
await assert.rejects(call('socialu_event_rsvp',uid(2),'999','attending'),code('SE404'));
await assert.rejects(call('socialu_event_rsvp',uid(2),started,'attending'),code('SE409'));
await assert.rejects(call('socialu_event_rsvp',uid(2),parade,'maybe'),code('22023'));
await call('socialu_event_cancel',uid(1),parade,null);
await assert.rejects(call('socialu_event_rsvp',uid(3),parade,'not_attending'),code('SE404'));
// A cancelled event the student wasn't invited to leaves their invitations.
assert.deepEqual(await shown(3),['Study Group','Bonfire']);

// Browsers cannot read or write answers directly; only the server functions can.
for (const role of ['anon','authenticated']) {
 assert.equal((await db.query<any>("SELECT has_table_privilege($1,'socialu.event_responses','SELECT') AS ok",[role])).rows[0].ok,false);
 assert.equal((await db.query<any>("SELECT has_function_privilege($1,'public.socialu_my_event_invitations(uuid)','EXECUTE') AS ok",[role])).rows[0].ok,false);
}
}, 60000);
