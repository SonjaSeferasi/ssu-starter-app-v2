import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
// UR-402 (SRS-402.1-402.5): invite registered students to an event, against the real schema, in memory.
it('sends one invitation to every selected student and never creates a duplicate', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
for(const file of ['20261008000100_link_supabase_accounts.sql','20261013150000_create_event.sql','20261015120000_list_events.sql','20261027130000_event_engagement.sql','20261027140000_event_invitations.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));
await db.exec(readFileSync(root+'/supabase/migrations/20261027140000_event_invitations.sql','utf8'));

// Student 1 creates the event; 2-4 are registered classmates (not friends); 5 has not verified their email.
const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
for (let n=1;n<=5;n++) {
 await db.query('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
 await db.query('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,$5)',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n),n===5?null:new Date()]);
}
const call=async(fn:string,...args:unknown[])=>(await db.query<any>(`SELECT public.${fn}(${args.map((_,i)=>'$'+(i+1)).join(',')}) AS r`,args)).rows[0].r;
const code=(expected:string)=>(error:any)=>error.code===expected;
const invite=(n:number,event:string,ids:unknown)=>call('socialu_event_invite',uid(n),event,JSON.stringify(ids));
const rows=async(event:string)=>(await db.query<any>('SELECT invitee_id::text AS id FROM socialu.event_invitations WHERE event_id=$1 ORDER BY invitee_id',[event])).rows.map(r=>r.id);
const names=(list:any[])=>list.map(s=>s.username);
const event=(await call('socialu_create_event',uid(1),'Halloween Parade','Costumes and floats.','Main Quad',new Date(Date.now()+86400000).toISOString())).event_id;

// SRS-402.1: the creator finds registered classmates (not themselves, not unverified accounts), friends or not.
assert.deepEqual(names(await call('socialu_event_invite_candidates',uid(1),event,'')),['student2','student3','student4']);
assert.deepEqual(names(await call('socialu_event_invite_candidates',uid(1),event,'Student 3')),['student3']);
assert.deepEqual(await call('socialu_event_invite_candidates',uid(1),event,'%'),[]);

// SRS-402.2/402.3: one request invites every selected student.
const sent=await invite(1,event,['2','3']);
assert.deepEqual(names(sent.invited),['student2','student3']);
assert.deepEqual(sent.already_invited,[]);
assert.deepEqual(await rows(event),['2','3']);

// Duplicates: inviting the same students again creates nothing new; they are reported as already invited.
const again=await invite(1,event,['2','3','4','4']);
assert.deepEqual(names(again.invited),['student4']);
assert.deepEqual(names(again.already_invited),['student2','student3']);
assert.deepEqual(await rows(event),['2','3','4']);
assert.deepEqual((await invite(1,event,['2'])).invited,[]);
assert.equal((await db.query<any>('SELECT count(*)::int AS n FROM socialu.event_invitations')).rows[0].n,3);
// The table itself also refuses a duplicate row.
await assert.rejects(db.query('INSERT INTO socialu.event_invitations(event_id,invitee_id) VALUES($1,2)',[event]),code('23505'));
// Candidates now show who is already invited.
assert.deepEqual((await call('socialu_event_invite_candidates',uid(1),event,'')).map((s:any)=>s.invited),[true,true,true]);

// SRS-402.5: the creator sees everyone invited and their response; SRS-402.4: each invitee sees the invitation.
assert.deepEqual((await call('socialu_event_invitations',uid(1),event)).map((s:any)=>[s.username,s.rsvp]),[['student2','pending'],['student3','pending'],['student4','pending']]);
const mine=await call('socialu_my_event_invitations',uid(3));
assert.deepEqual(mine.map((i:any)=>[i.title,i.creator_username,i.rsvp]),[['Halloween Parade','student1','pending']]);
assert.deepEqual(await call('socialu_my_event_invitations',uid(1)),[]);

// All or nothing: one student who cannot be invited (the creator, an unverified account, an unknown ID) saves nothing.
const before=await rows(event);
await assert.rejects(invite(1,event,['1']),code('SE422'));
await assert.rejects(invite(1,event,['5']),code('SE422'));
await assert.rejects(invite(1,event,['4','999']),code('SE422'));
assert.deepEqual(await rows(event),before);
// The selection must be 1-50 student IDs.
for (const bad of [[],['abc'],[2],'2',Array.from({length:51},(_,i)=>String(i+10))]) await assert.rejects(invite(1,event,bad),code('22023'));

// Only the creator can invite or see the invitation list.
await assert.rejects(invite(2,event,['3']),code('SE403'));
await assert.rejects(call('socialu_event_invitations',uid(2),event),code('SE403'));
await assert.rejects(call('socialu_event_invite_candidates',uid(2),event,''),code('SE403'));
await assert.rejects(invite(5,event,['3']),code('42501'));
await assert.rejects(invite(1,'999',['3']),code('SE404'));

// Cancelled events disappear from invitations; started events cannot take new invitations.
await db.query("UPDATE socialu.events SET status='cancelled' WHERE event_id=$1",[event]);
assert.deepEqual(await call('socialu_my_event_invitations',uid(3)),[]);
await assert.rejects(invite(1,event,['3']),code('SE404'));
await db.query("UPDATE socialu.events SET status='active', starts_at=now()-interval '1 hour' WHERE event_id=$1",[event]);
await db.query('DELETE FROM socialu.event_invitations WHERE invitee_id=4');
await assert.rejects(invite(1,event,['4']),code('SE409'));

// Only the server can call these functions; browsers cannot.
for (const role of ['anon','authenticated']) for (const fn of ['socialu_event_invite(uuid,bigint,jsonb)','socialu_event_invite_candidates(uuid,bigint,text)','socialu_event_invitations(uuid,bigint)','socialu_my_event_invitations(uuid)'])
 assert.equal((await db.query<any>("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok",[role,'public.'+fn])).rows[0].ok,false);
}, 60000);
