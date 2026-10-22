import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const testUid = (student: number) => `00000000-0000-4000-8000-${String(student).padStart(12, '0')}`;

// Real PostgreSQL schema/functions in a disposable in-memory database. No hosted data or keys.
export async function createDormDatabase(students = 4) {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id UUID PRIMARY KEY, email TEXT, email_confirmed_at TIMESTAMPTZ);
    CREATE TABLE auth.sessions(id UUID PRIMARY KEY, user_id UUID, created_at TIMESTAMPTZ);`);
  await db.exec(readFileSync(join(process.cwd(), 'supabase/schema.sql'), 'utf8'));
  for (const migration of [
    '20261008000100_link_supabase_accounts.sql',
    '20261008000200_feed_functions.sql',
    '20261008000300_fix_deferred_post_trigger.sql',
    '20261009000100_game_room_navigation.sql',
    '20261012230000_srs_100_105_auth.sql',
    '20261013000100_dormspace.sql',
    '20261013000100_game_room_starter_collection.sql',
    '20261013000200_avatar_trigger_search_paths.sql',
    '20261013000300_starter_ownership_validation.sql',
    '20261013140000_avatar_customization.sql',
    '20261013200000_srs_109_113_profile.sql',
    '20261015180000_profile_social.sql',
    '20261015190000_profile_full_name.sql',
    '20261016001000_optional_profile_bio.sql',
    '20261016010000_friendships.sql',
    '20261016040000_friend_accept_mutual_follow.sql',
  ]) await db.exec(readFileSync(join(process.cwd(), 'supabase/migrations', migration), 'utf8'));
  for (let student = 1; student <= students; student++) {
    await db.query('INSERT INTO auth.users VALUES ($1,$2,now())', [testUid(student), `dorm${student}@salemstate.edu`]);
    await db.query(`INSERT INTO socialu.students(full_name,username,university_email,auth_user_id,email_verified_at)
      VALUES($1,$2,$3,$4,now())`, [`Dorm Student ${student}`, `dorm${student}`, `dorm${student}@salemstate.edu`, testUid(student)]);
    await db.query('INSERT INTO socialu.student_profiles(student_id) VALUES($1)', [student]);
  }
  return db;
}

export async function dormCall(db: PGlite, student: number, action: string, owner: string | null = null, payload = {}) {
  return (await db.query<{ result: any }>('SELECT public.socialu_dorm($1,$2,$3,$4) AS result', [action, testUid(student), owner, JSON.stringify(payload)])).rows[0].result;
}
export async function friendship(db: PGlite, student: number, action: string, target: number, id: string | null = null) {
  return (await db.query<{ result: any }>('SELECT public.socialu_friendships($1,$2,$3,$4) AS result', [testUid(student), action, `dorm${target}`, id])).rows[0].result;
}
export async function befriend(db: PGlite, a: number, b: number) {
  const request = await friendship(db, a, 'send', b);
  await friendship(db, b, 'accept', a, request.request_id);
  return request.request_id as string;
}
