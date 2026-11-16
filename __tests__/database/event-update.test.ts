import {PGlite} from '@electric-sql/pglite';
import {it} from 'vitest';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=process.cwd();
// SRS-404.1-404.6: the creator edits an upcoming event; the saved values replace the old ones. Nobody else can.
it('replaces the title and other details for the creator only, before the event starts', async () => {
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);`);
await db.exec(readFileSync(root+'/supabase/schema.sql','utf8'));
for(const file of ['20261008000100_link_supabase_accounts.sql','20261013150000_create_event.sql','20261015120000_list_events.sql','20261027125000_event_dress_code.sql','20261027130000_event_engagement.sql','20261027140000_event_invitations.sql','20261113120000_event_cancellation.sql','20261113130000_event_rsvp.sql','20261113140000_event_update.sql']) await db.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));
// Safe to re-run.
await db.exec(readFileSync(root+'/supabase/migrations/20261113140000_event_update.sql','utf8'));

// Student 1 hosts; student 2 is a classmate.
const uid=(n:number)=>`00000000-0000-0000-0000-00000000000${n}`;
for (let n=1;n<=2;n++) {
 await db.query('INSERT INTO auth.users VALUES($1,$2,now())',[uid(n),`s${n}@salemstate.edu`]);
 await db.query('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$2,$3,$4,now())',[`Student ${n}`,`student${n}`,`s${n}@salemstate.edu`,uid(n)]);
}
const call=async(fn:string,...args:unknown[])=>(await db.query<any>(`SELECT public.${fn}(${args.map((_,i)=>'$'+(i+1)).join(',')}) AS r`,args)).rows[0].r;
const code=(expected:string)=>(error:any)=>error.code===expected;
const day=(n:number)=>new Date(Date.now()+n*86400000).toISOString();
const create=async(title:string)=>(await call('socialu_create_event',uid(1),title,'Costumes and floats.','Main Quad',day(1),'Costumes')).event_id;
const update=(n:number,event:string,title:string,description:string,location:string,startsAt:string|null,dress:string|null)=>call('socialu_event_update',uid(n),event,title,description,location,startsAt,dress);
const saved=async(event:string)=>(await db.query<any>('SELECT title,description,location,starts_at,dress_code FROM socialu.events WHERE event_id=$1',[event])).rows[0];
const event=await create('Halloween Parade');
const original=await saved(event);

// SRS-404.1: the creator enters a new title and saves; it replaces the old title everywhere the event is shown.
const renamed=await update(1,event,'  Halloween Costume Parade  ','Costumes and floats.','Main Quad',original.starts_at.toISOString(),'Costumes');
assert.equal(renamed.title,'Halloween Costume Parade');
assert.equal((await saved(event)).title,'Halloween Costume Parade');
assert.equal((await call('socialu_event_detail',uid(2),event)).title,'Halloween Costume Parade');
assert.deepEqual((await call('socialu_list_events',uid(2))).map((e:any)=>e.title),['Halloween Costume Parade']);

// SRS-404.2-404.5: description, location, date and time are replaced the same way; the dress code can be cleared.
const later=day(3);
const edited=await update(1,event,'Halloween Costume Parade','Now with a costume contest.','Library Lawn',later,null);
assert.deepEqual([edited.description,edited.location,edited.dress_code],['Now with a costume contest.','Library Lawn',null]);
assert.equal(new Date(edited.starts_at).toISOString(),later);
assert.equal((await saved(event)).location,'Library Lawn');

// SRS-404.6: nobody but the creator can change the event, and nothing is saved when they try.
const before=await saved(event);
await assert.rejects(update(2,event,'Hijacked','x','x',day(2),null),code('SE403'));
assert.deepEqual(await saved(event),before);

// Every field is still required, and the new time must be in the future.
for (const [title,description,location,startsAt] of [['','d','l',day(2)],['t',' ','l',day(2)],['t','d','',day(2)],['t','d','l',null],['t','d','l',day(-1)]])
 await assert.rejects(update(1,event,title as string,description as string,location as string,startsAt as string|null,null),code('22023'));
await assert.rejects(update(1,event,'t','d','l',day(2),'x'.repeat(101)),code('22023'));
assert.deepEqual(await saved(event),before);

// Started, cancelled or missing events cannot be edited.
const started=await create('Bonfire');
await db.query("UPDATE socialu.events SET starts_at=now()-interval '1 hour' WHERE event_id=$1",[started]);
await assert.rejects(update(1,started,'Bonfire','d','l',day(2),null),code('SE409'));
await call('socialu_event_cancel',uid(1),event,null);
await assert.rejects(update(1,event,'Back on','d','l',day(2),null),code('SE404'));
await assert.rejects(update(1,'999','t','d','l',day(2),null),code('SE404'));

// Only the server can call the new function; browsers cannot.
for (const role of ['anon','authenticated'])
 assert.equal((await db.query<any>("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok",[role,'public.socialu_event_update(uuid,bigint,text,text,text,timestamptz,text)'])).rows[0].ok,false);
}, 60000);
