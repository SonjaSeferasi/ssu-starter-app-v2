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
  const history=async(id:string)=>(await db.query<any>('SELECT public.socialu_login_history($1) AS result',[id])).rows[0].result;
  expect((await history(u)).entries).toHaveLength(1);expect((await history(other)).entries).toEqual([]);
  await db.query('DELETE FROM auth.sessions WHERE id=$1',[session]);
  expect((await history(u)).entries).toHaveLength(1);
  expect((await db.query<any>('SELECT ended_at FROM socialu.login_history')).rows[0].ended_at).not.toBeNull();
  await db.exec("SET ROLE authenticated");
  await expect(db.query('SELECT public.socialu_login_history($1)',[u])).rejects.toMatchObject({code:'42501'});
  await db.exec('RESET ROLE');
  await db.query('UPDATE socialu.students SET is_active=false WHERE auth_user_id=$1',[u]);
  await expect(history(u)).rejects.toMatchObject({code:'42501'});
 }finally{await db.close();}
},60000);
