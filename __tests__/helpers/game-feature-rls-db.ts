import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { befriend, dormCall, testUid } from './dormspace-db';
import { createGroup, createSnipeDatabase, snipeCall, snipeReportCall, snipeStage, snipeUpload, stageCall } from './snipe-db';

export const FEATURE_RLS = 'supabase/migrations/20261119171202_snipe_dormspace_shared_points_rls.sql';
export const FEATURE_TABLES = [
  'socialu.activities', 'socialu.catalog_items', 'socialu.owned_items', 'socialu.room_surfaces',
  'socialu.reserved_room_cells', 'socialu.item_footprints', 'socialu.compatible_item_overlaps',
  'socialu.dorms', 'socialu.dorm_placements', 'socialu.guestbook_notes', 'socialu.counted_dorm_visits',
  'socialu.game_levels', 'socialu.participation_settings', 'socialu.participation_events',
  'socialu.streak_instances', 'socialu.participation_days', 'socialu.reminder_dismissals',
  'socialu.level_completions', 'socialu.snipe_requests', 'socialu.snipe_tags', 'socialu.snipe_reports',
  'socialu.snipe_photo_stages', 'socialu.reward_rules', 'socialu.point_transactions',
  'dormspace_directory.room_assignments', 'dormspace_live.players', 'dormspace_live.messages',
  'dormspace_live.voice_leases', 'dormspace_live.voice_sweep_health', 'dormspace_music.tracks',
] as const;
export const INTERNAL_TABLES = [
  'socialu.snipe_photo_stages', 'dormspace_directory.room_assignments', 'dormspace_live.players',
  'dormspace_live.messages', 'dormspace_live.voice_leases', 'dormspace_live.voice_sweep_health',
  'dormspace_music.tracks',
];
const run = (db: PGlite, name: string) => db.exec(readFileSync(`supabase/migrations/${name}`, 'utf8'));

// Real feature SQL, constraints, authorization and RLS in a disposable PostgreSQL.
// Only provider infrastructure is stubbed; no hosted accounts/data/keys are used.
export async function createFeatureRlsDatabase(applyRls = true) {
  const db = await createSnipeDatabase(6);
  try {
    for (const file of [
      '20261020013144_dormspace_furnishings.sql', '20261020021507_dormspace_rotation.sql',
      '20261020133829_dormspace_multiplayer.sql', '20261030040044_snipe_withdrawal_access.sql',
      '20261030093802_snipe_request_pagination.sql', '20261031223558_snipe_group_only.sql',
      '20261104050601_dormspace_3d_directory.sql', '20261104050639_dormspace_points_shop.sql',
      '20261106075900_dormspace_voice.sql', '20261116053034_dormspace_personal_music.sql',
      '20261116060114_shared_points_balance_read.sql', '20261117030000_game_participation_streaks.sql',
      '20261117050031_dormspace_duplicate_item_ids.sql', '20261117050233_dormspace_placement_rule_feedback.sql',
      '20261117050419_dormspace_preserve_omitted_appearance.sql',
      '20261117080000_participation_calendar_reminders.sql', '20261117150000_daily_participation_reward_update.sql',
    ]) await run(db, file);
    // PGlite has no cron/HTTP extensions. Keep the real table/functions/ACLs;
    // omit only provider extension installation and scheduling from this fixture.
    await db.exec(readFileSync('supabase/migrations/20261116054535_dormspace_voice_managed_cleanup.sql', 'utf8')
      .replace(/^CREATE EXTENSION.*$/gm, '').replace(/^SELECT cron\.schedule.*$/gm, ''));
    await befriend(db, 1, 2); await befriend(db, 1, 3); await befriend(db, 3, 4);
    const group = await createGroup(db, 1, [2, 3, 4, 5]);
    for (const student of [1, 2, 3]) {
      const dorm = await dormCall(db, student, 'open');
      const bed = dorm.catalog.find((i: any) => i.previewKey === 'bed').id;
      await dormCall(db, student, 'save', null, { ...dorm, placements: [{ itemId: bed, x: 0, y: 0 }] });
      await db.query('SELECT public.socialu_game_participation($1,$2,$3)', [testUid(student), 'dormspace', 'America/New_York']);
    }
    await dormCall(db, 2, 'open', 'dorm1');
    await dormCall(db, 2, 'note_add', 'dorm1', { text: 'A real visitor note.' });
    const submit = async (student: number, target: number) => {
      const key = randomUUID();
      return (await snipeCall(db, student, 'create', group, null,
        { submission_key: key, targets: [String(target)], ...snipeUpload(student, key) })).snipe.id as string;
    };
    const pending = await submit(1, 2);
    const approved = await submit(3, 4);
    await snipeCall(db, 4, 'respond', group, approved, { identity: true, sharing: true });
    await snipeReportCall(db, 1, group, approved, { reason: 'Fixture moderation report.' });
    await stageCall(db, 4, 'begin', group, snipeStage(4, randomUUID(), [3]));
    const session = randomUUID(); const connection = randomUUID();
    await db.query('INSERT INTO auth.sessions VALUES ($1,$2,now())', [session, testUid(1)]);
    await db.query(`INSERT INTO dormspace_live.players(student_id,connection_id,session_id,space,state)
      VALUES(1,$1,$2,'hall:1','{}')`, [connection, session]);
    await db.query(`INSERT INTO dormspace_live.messages(student_id,client_id,space,text_content)
      VALUES(1,$1,'hall:1','Private fixture message')`, [randomUUID()]);
    await db.query('INSERT INTO dormspace_live.voice_leases VALUES($1,$2,$3,$4,$5,now()+interval \'1 hour\')',
      [connection, randomUUID(), testUid(1), session, 'private-test-channel']);
    await db.exec(`INSERT INTO dormspace_directory.room_assignments(university_id,room_index,student_id)
      SELECT university_id,0,1 FROM socialu.university ORDER BY university_id LIMIT 1;
      INSERT INTO dormspace_music.tracks VALUES(1,'private-track.mp3','Fixture soundtrack',gen_random_uuid(),now());
      INSERT INTO socialu.reminder_dismissals VALUES(1,current_date);`);
    // A valid immutable completion source; fixture loading alone bypasses its
    // reward-processing triggers. Client attacks below never bypass RLS.
    await db.exec('SET session_replication_role = replica');
    await db.exec(`INSERT INTO socialu.game_levels VALUES(1,'fixture-level-1');
      INSERT INTO socialu.participation_events(event_id,student_id,activity_code,occurred_at,game_level)
      VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,'game1',now(),1);
      INSERT INTO socialu.level_completions VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',now(),0);`);
    await db.exec('SET session_replication_role = origin');
    // An affordable fixture offer lets the post-RLS application smoke test make
    // a real atomic purchase without changing the production catalog or rates.
    await db.exec("UPDATE socialu.catalog_items SET price_points=1 WHERE preview_key='dorm-plant'");
    if (applyRls) await db.exec(readFileSync(FEATURE_RLS, 'utf8'));
    return { db, group, pending, approved };
  } catch (error) { await db.close(); throw error; }
}

// Grant access ONLY inside a rollback transaction to prove the RLS predicate,
// rather than accidentally passing because the private schema/ACL blocked SQL.
// No role used for an attack has BYPASSRLS or owns a tested table.
export async function asActor<T>(db: PGlite, student: number | null, action: () => Promise<T>, ignoreTriggers = false): Promise<T> {
  await db.exec('BEGIN');
  try {
    const schemas = [...new Set(FEATURE_TABLES.map(t => t.split('.')[0]))];
    await db.exec(`GRANT USAGE ON SCHEMA ${schemas.join(',')}, auth TO anon, authenticated;
      GRANT SELECT,INSERT,UPDATE,DELETE ON ${FEATURE_TABLES.join(',')} TO anon, authenticated;
      GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA socialu,dormspace_live TO anon,authenticated;`);
    // Suppress unrelated integrity triggers only for insert-policy probes, so
    // a trigger permission error cannot masquerade as an RLS rejection.
    if (ignoreTriggers) await db.exec('SET LOCAL session_replication_role = replica');
    await db.query("SELECT set_config('test.uid',$1,true)", [student === null ? '' : testUid(student)]);
    await db.exec(`SET LOCAL ROLE ${student === null ? 'anon' : 'authenticated'}`);
    return await action();
  } finally { await db.exec('ROLLBACK'); }
}

export async function rejected(db: PGlite, sql: string, args: unknown[] = []) {
  await db.exec('SAVEPOINT attack');
  try { await db.query(sql, args); return undefined; }
  catch (error) { await db.exec('ROLLBACK TO SAVEPOINT attack'); return error as { code: string; message: string }; }
  finally { await db.exec('RELEASE SAVEPOINT attack'); }
}
