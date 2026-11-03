import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
it('retains real provider sessions, limits owner access and survives session deletion',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
   CREATE SCHEMA auth;CREATE TABLE auth.users(id UUID PRIMARY KEY,email TEXT,email_confirmed_at TIMESTAMPTZ);
   CREATE TABLE auth.sessions(id UUID PRIMARY KEY,user_id UUID REFERENCES auth.users(id),created_at TIMESTAMPTZ,not_after TIMESTAMPTZ);
  `);
  await db.exec(readFileSync('supabase/schema.sql','utf8'));
  for(const file of ['20261008000100_link_supabase_accounts.sql','20261008000200_feed_functions.sql','20261012230000_srs_100_105_auth.sql'])await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
  const u='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002';
  for(const [id,name] of [[u,'one'],[other,'two']]){
   await db.query('INSERT INTO auth.users VALUES($1,$2,now())',[id,name+'@salemstate.edu']);
   await db.query('INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at) VALUES($1,$1,$2,$3,now())',[name,name+'@salemstate.edu',id]);
  }
  const session='10000000-0000-0000-0000-000000000001';
  await db.query("INSERT INTO auth.sessions VALUES($1,$2,'2026-10-28T12:00:00Z',NULL)",[session,u]);
  const migration=readFileSync('supabase/migrations/20261029100000_login_history.sql','utf8');
  await db.exec(migration);await db.exec(migration); // installation and backfill are idempotent
  await db.exec(readFileSync('supabase/migrations/20261029101000_complete_login_history.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20261029102000_login_activity_status.sql','utf8'));
  const history=async(id:string)=>(await db.query<any>('SELECT public.socialu_login_history($1) AS result',[id])).rows[0].result;
  expect((await history(u)).entries).toHaveLength(1);expect(new Date((await history(u)).entries[0].signed_in_at).toISOString()).toBe('2026-10-28T12:00:00.000Z');expect((await history(other)).entries).toEqual([]);
  expect((await history(u)).entries[0].active).toBe(true);
  await db.query('DELETE FROM auth.sessions WHERE id=$1',[session]);
  expect((await history(u)).entries[0].active).toBe(false);
  expect((await history(u)).entries).toHaveLength(1);
  expect((await db.query<any>('SELECT ended_at FROM socialu.login_history')).rows[0].ended_at).not.toBeNull();
  // Equal timestamps and concurrent new records cannot duplicate or skip older pages.
  await db.query("INSERT INTO auth.sessions(id,user_id,created_at) SELECT ('20000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,$1,'2026-10-29T12:00:00Z' FROM generate_series(1,61) n",[u]);
  let page=await history(u), ids=page.entries.map((e:any)=>e.id);
  expect(page.entries).toHaveLength(25);
  await db.query("INSERT INTO auth.sessions(id,user_id,created_at) VALUES('30000000-0000-0000-0000-000000000001',$1,'2026-10-30T12:00:00Z')",[u]);
  while(page.next){page=(await db.query<any>('SELECT public.socialu_login_history($1,$2,$3) AS result',[u,page.next.at,page.next.id])).rows[0].result;ids.push(...page.entries.map((e:any)=>e.id));}
  expect(ids).toHaveLength(62);expect(new Set(ids).size).toBe(62);
  // The application guard, provider expiry and provider deletion all end activity.
  const newest='30000000-0000-0000-0000-000000000001';
  await db.query("UPDATE auth.sessions SET not_after=now()-interval '1 minute' WHERE id=$1",[newest]);
  expect((await history(u)).entries[0].active).toBe(false);
  await db.query('UPDATE auth.sessions SET not_after=NULL WHERE id=$1',[newest]);
  await db.query("INSERT INTO socialu.session_revocations VALUES($1,'2026-11-01T00:00:00Z',$2)",[u,newest]);
  const active=await history(u);expect(active.entries[0].active).toBe(true);expect(active.entries[1].active).toBe(false);
  const current=(await db.query<any>('SELECT public.socialu_login_history($1,NULL,NULL,$2) AS result',[u,newest])).rows[0].result;
  expect(current.entries[0].is_current).toBe(true);expect(current.entries[1].is_current).toBe(false);
  await db.query('UPDATE socialu.session_revocations SET preserved_session=NULL WHERE auth_user_id=$1',[u]);
  expect((await history(u)).entries.every((e:any)=>!e.active)).toBe(true);
  await db.exec("SET ROLE authenticated");
  await expect(db.query('SELECT public.socialu_login_history($1)',[u])).rejects.toMatchObject({code:'42501'});
  await db.exec('RESET ROLE');
  await db.query('UPDATE socialu.students SET is_active=false WHERE auth_user_id=$1',[u]);
  await expect(history(u)).rejects.toMatchObject({code:'42501'});
 }finally{await db.close();}
},60000);
