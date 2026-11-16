import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { createDormDatabase, dormCall, testUid } from './dormspace-db';

export const DIRECTORY_MIGRATION = 'supabase/migrations/20261104050601_dormspace_3d_directory.sql';
export const SHOP_MIGRATION = 'supabase/migrations/20261104050639_dormspace_points_shop.sql';
const run = (db: PGlite, file: string) => db.exec(readFileSync(file, 'utf8'));

/** Which 3D migrations to apply. The two are independent, so each behaviour group can run alone:
 * the directory needs the school community migration; the shop only the furnishings migrations.
 * `beforeShop` runs after the furnishings migrations and before the shop migration (existing owners). */
export type Dorm3dMigrations = { directory: boolean; shop: boolean; beforeShop?: (db: PGlite) => Promise<void> };
export const DIRECTORY_ONLY: Dorm3dMigrations = { directory: true, shop: false };
export const SHOP_ONLY: Dorm3dMigrations = { directory: false, shop: true };

/** Real schema + DormSpace furnishings in a disposable PGlite, plus the selected 3D migrations (real SQL). */
export async function createDorm3dDatabase(students: number, migrations: Dorm3dMigrations) {
  const db = await createDormDatabase(students);
  await run(db, 'supabase/migrations/20261020013144_dormspace_furnishings.sql');
  await run(db, 'supabase/migrations/20261020021507_dormspace_rotation.sql');
  if (migrations.directory) {
    await run(db, 'supabase/migrations/20261026000100_school_communities.sql');
    await run(db, DIRECTORY_MIGRATION);
  }
  if (migrations.shop) {
    await migrations.beforeShop?.(db);
    await run(db, SHOP_MIGRATION);
  }
  return db;
}
export const applyMigration = run;

export async function directoryCall(db: PGlite, student: number, action: string, payload: object = {}) {
  return (await db.query<{ result: any }>('SELECT public.socialu_dorm_directory($1,$2,$3) AS result', [testUid(student), action, JSON.stringify(payload)])).rows[0].result;
}
export async function shopCall(db: PGlite, student: number, action: string, payload: object = {}) {
  return (await db.query<{ result: any }>('SELECT public.socialu_dorm_shop($1,$2,$3) AS result', [testUid(student), action, JSON.stringify(payload)])).rows[0].result;
}
export const openDorm = (db: PGlite, student: number) => dormCall(db, student, 'open');

/** Test-only balance seeding: one real reward rule and one daily-participation credit row. Foreign keys to
 * participation tables are bypassed for this fixture row only (session_replication_role); the
 * ledger's CHECK constraints still apply. Purchases afterwards use the real triggers. */
export async function credit(db: PGlite, student: number, points: number, date = '2026-11-01') {
  await db.exec(`INSERT INTO socialu.reward_rules(category,points_per_unit,eligibility_text)
    SELECT 'daily_participation',1,'Test fixture rule' WHERE NOT EXISTS (SELECT 1 FROM socialu.reward_rules WHERE eligibility_text='Test fixture rule')`);
  await db.exec('SET session_replication_role = replica');
  try {
    await db.query(`INSERT INTO socialu.point_transactions(student_id,category,points_change,action_key,reward_rule_id,reward_units,participation_date)
      VALUES($1,'daily_participation',$2,gen_random_uuid(),(SELECT rule_id FROM socialu.reward_rules WHERE eligibility_text='Test fixture rule'),1,$3)`, [student, points, date]);
  } finally { await db.exec('SET session_replication_role = origin'); }
}
export async function balance(db: PGlite, student: number) {
  return Number((await db.query<{ balance: string }>('SELECT balance FROM socialu.points_balances WHERE student_id=$1', [student])).rows[0].balance);
}
export async function itemId(db: PGlite, key: string) {
  return String((await db.query<{ item_id: string }>('SELECT item_id FROM socialu.catalog_items WHERE preview_key=$1', [key])).rows[0].item_id);
}
/** Moves a student to another school (domain-derived, as at registration). */
export async function moveToSchool(db: PGlite, student: number, email: string) {
  await db.query('SELECT socialu.ensure_school($1)', [email]);
  await db.query('UPDATE auth.users SET email=$1 WHERE id=$2', [email, testUid(student)]);
  await db.query('UPDATE socialu.students SET university_email=$1 WHERE student_id=$2', [email, student]);
}
