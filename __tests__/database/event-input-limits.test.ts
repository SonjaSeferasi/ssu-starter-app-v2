import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
// #1186 and #1187: the database refuses past start times and over-long text, whatever client calls it.
it('refuses past start times and text over the form limits when creating or editing an event', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
for(const file of ['20261008000100_link_supabase_accounts.sql','20261013150000_create_event.sql','20261015120000_list_events.sql','20261027125000_event_dress_code.sql','20261027130000_event_engagement.sql','20261027140000_event_invitations.sql','20261113120000_event_cancellation.sql','20261113130000_event_rsvp.sql','20261113140000_event_update.sql','20261113160000_event_input_limits.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));
// Safe to re-run.
await db.exec(readFileSync(root+'/supabase/migrations/20261113160000_event_input_limits.sql','utf8'));

const uid='00000000-0000-0000-0000-000000000001';
await db.query('INSERT INTO auth.users VALUES($1,$2,now())',[uid,'s1@salemstate.edu']);
await db.query('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',['Student 1','student1','s1@salemstate.edu',uid]);
const call=async(fn:string,...args:unknown[])=>(await db.query<any>(`SELECT public.${fn}(${args.map((_,i)=>'$'+(i+1)).join(',')}) AS r`,args)).rows[0].r;
const code=(expected:string)=>(error:any)=>error.code===expected;
const day=(n:number)=>new Date(Date.now()+n*86400000).toISOString();
const create=(title:string,description:string,location:string,startsAt:string)=>call('socialu_create_event',uid,title,description,location,startsAt);
const count=async()=>(await db.query<any>('SELECT count(*)::int AS n FROM socialu.events')).rows[0].n;

// #1186: a start time that has passed is refused.
await assert.rejects(create('Parade','Floats.','Quad',day(-1)),code('22023'));
await assert.rejects(create('Parade','Floats.','Quad','2020-01-01T10:00:00Z'),code('22023'));
// #1187: the form's limits, counted in characters (an emoji counts once).
await assert.rejects(create('x'.repeat(256),'Floats.','Quad',day(1)),code('22023'));
await assert.rejects(create('Parade','x'.repeat(2001),'Quad',day(1)),code('22023'));
await assert.rejects(create('Parade','Floats.','x'.repeat(256),day(1)),code('22023'));
assert.equal(await count(),0);
// Exactly at the limits, in the future, is saved, and the dress code still works.
const ok=await create('🎃'.repeat(255),'x'.repeat(2000),'x'.repeat(255),day(1));
assert.equal([...ok.title].length,255);
assert.equal((await call('socialu_create_event',uid,'Ball','Dress up.','Hall',day(2),'  Costumes  ')).dress_code,'Costumes');
assert.equal(await count(),2);

// Editing applies the same limits; a valid edit still saves.
const event=ok.event_id;
for (const [t,d,l] of [['x'.repeat(256),'d','l'],['t','x'.repeat(2001),'l'],['t','d','x'.repeat(256)]])
 await assert.rejects(call('socialu_event_update',uid,event,t,d,l,day(2),null),code('22023'));
assert.equal((await call('socialu_event_update',uid,event,'Parade','Floats.','Quad',day(2),null)).title,'Parade');
}, 60000);
