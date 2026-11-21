import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FEATURE_RLS, FEATURE_TABLES, INTERNAL_TABLES, asActor, createFeatureRlsDatabase, rejected } from '../helpers/game-feature-rls-db';
import { dormCall, testUid } from '../helpers/dormspace-db';
import { snipeCall } from '../helpers/snipe-db';

describe('Snipe / DormSpace / shared points RLS', () => {
  let fixture: Awaited<ReturnType<typeof createFeatureRlsDatabase>>;
  beforeAll(async () => { fixture = await createFeatureRlsDatabase(process.env.SOCIALU_RLS_BASELINE !== '1'); }, 120000);
  afterAll(async () => { await fixture?.db.close(); });
  const query = async (sql: string, args: unknown[] = []) => (await fixture.db.query<any>(sql, args)).rows;

  it.each(FEATURE_TABLES)('%s is protected, populated and has no raw client grants', async table => {
    expect((await query(`SELECT count(*)::int AS n FROM ${table}`))[0].n, 'Nonempty fixtures prevent vacuous passes').toBeGreaterThan(0);
    expect((await query('SELECT relrowsecurity AS rls FROM pg_class WHERE oid=$1::regclass', [table]))[0].rls).toBe(true);
    for (const role of ['anon', 'authenticated']) {
      const row = (await query("SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') AS allowed", [role, table]))[0];
      expect(row.allowed).toBe(false);
    }
    const column = (await query("SELECT attname FROM pg_attribute WHERE attrelid=$1::regclass AND attnum>0 AND NOT attisdropped AND attidentity<>'a' ORDER BY attnum LIMIT 1", [table]))[0].attname;
    const specimen = (await query(`SELECT row_to_json(t) AS row FROM ${table} t LIMIT 1`))[0].row;
    await asActor(fixture.db, null, async () => {
      expect((await query('SELECT current_user AS role'))[0].role).toBe('anon');
      expect(await query(`SELECT * FROM ${table}`)).toEqual([]);
      expect(await query(`UPDATE ${table} SET ${column}=${column} RETURNING *`)).toEqual([]);
      expect(await query(`DELETE FROM ${table} RETURNING *`)).toEqual([]);
      expect((await rejected(fixture.db, `INSERT INTO ${table} OVERRIDING SYSTEM VALUE
        SELECT (json_populate_record(NULL::${table}, $1::json)).*`, [JSON.stringify(specimen)]))?.code).toBe('42501');
    }, true);
    if (!['socialu.dorms','socialu.dorm_placements','socialu.guestbook_notes'].includes(table)) {
      for (const student of [1, 5]) await asActor(fixture.db, student, async () => {
        expect(await query(`UPDATE ${table} SET ${column}=${column} RETURNING *`)).toEqual([]);
        expect(await query(`DELETE FROM ${table} RETURNING *`)).toEqual([]);
      });
    }
  });

  it('does not expose schema owners, bypass roles or unrelated tables to attack clients', async () => {
    expect(await query("SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') AND (rolsuper OR rolbypassrls)")).toEqual([]);
    expect((await query("SELECT relrowsecurity AS rls FROM pg_class WHERE oid='socialu.students'::regclass"))[0].rls).toBe(false);
    expect(await query("SELECT polname FROM pg_policy WHERE polrelid='socialu.students'::regclass")).toEqual([]);
    for (const role of ['anon','authenticated'])
      expect((await query("SELECT has_schema_privilege($1,'socialu','USAGE') AS allowed", [role]))[0].allowed).toBe(false);
  });

  it('allows owner changes, denies stranger/friend edits and blocks reassignment in both directions', async () => {
    await asActor(fixture.db, 5, async () => {
      expect(await query('SELECT * FROM socialu.dorms WHERE owner_id=1')).toEqual([]);
      expect(await query("UPDATE socialu.dorms SET welcome_text='attacker' WHERE owner_id=1 RETURNING *")).toEqual([]);
      expect(await query('UPDATE socialu.dorms SET owner_id=5 WHERE owner_id=1 RETURNING *')).toEqual([]);
    });
    await asActor(fixture.db, 2, async () => {
      expect(await query('SELECT owner_id FROM socialu.dorms WHERE owner_id=1')).toHaveLength(1);
      expect(await query("UPDATE socialu.dorms SET welcome_text='friend attack' WHERE owner_id=1 RETURNING *")).toEqual([]);
    });
    await asActor(fixture.db, 1, async () => {
      expect(await query("UPDATE socialu.dorms SET welcome_text='Owner save' WHERE owner_id=1 RETURNING welcome_text"))
        .toEqual([{ welcome_text: 'Owner save' }]);
      expect((await rejected(fixture.db, 'UPDATE socialu.dorms SET owner_id=6 WHERE owner_id=1'))?.code).toBe('42501');
      expect(await query('DELETE FROM socialu.dorms WHERE owner_id=1 RETURNING *')).toEqual([]);
    });
    await asActor(fixture.db, 6, async () => {
      expect(await query('INSERT INTO socialu.dorms(owner_id) VALUES(6) RETURNING owner_id')).toHaveLength(1);
      expect((await rejected(fixture.db, 'INSERT INTO socialu.dorms(owner_id) VALUES(5)'))?.code).toBe('42501');
    });
  });

  it('isolates placements and guestbook authors while allowing owner note removal', async () => {
    await asActor(fixture.db, 2, async () => {
      expect(await query('UPDATE socialu.dorm_placements SET x=x WHERE owner_id=1 RETURNING *')).toEqual([]);
      expect(await query('DELETE FROM socialu.dorm_placements WHERE owner_id=1 RETURNING *')).toEqual([]);
      expect(await query('UPDATE socialu.dorm_placements SET x=x WHERE owner_id=2 RETURNING *')).toHaveLength(1);
      expect((await rejected(fixture.db, 'UPDATE socialu.dorm_placements SET owner_id=6 WHERE owner_id=2'))?.code).toBe('42501');
      expect(await query("INSERT INTO socialu.guestbook_notes(dorm_owner_id,author_id,text_content) VALUES(1,2,'Another note') RETURNING *")).toHaveLength(1);
      expect((await rejected(fixture.db, "INSERT INTO socialu.guestbook_notes(dorm_owner_id,author_id,text_content) VALUES(1,3,'Forged note')"))?.code).toBe('42501');
      expect(await query("UPDATE socialu.guestbook_notes SET text_content='Author edit' WHERE author_id=2 RETURNING *")).toHaveLength(2);
      expect((await rejected(fixture.db, 'UPDATE socialu.guestbook_notes SET author_id=3 WHERE author_id=2'))?.code).toBe('42501');
    }, true);
    await asActor(fixture.db, 3, async () => {
      expect(await query("UPDATE socialu.guestbook_notes SET text_content='Not my note' WHERE author_id=2 RETURNING *")).toEqual([]);
      expect(await query('DELETE FROM socialu.guestbook_notes WHERE author_id=2 RETURNING *')).toEqual([]);
    });
    await asActor(fixture.db, 1, async () => {
      expect(await query('DELETE FROM socialu.guestbook_notes WHERE dorm_owner_id=1 RETURNING *')).toHaveLength(1);
    });
  });

  it('hides pending Snipes and private answers, allows published group visibility, denies outsiders', async () => {
    for (const student of [1, 2]) await asActor(fixture.db, student, async () => {
      expect(await query('SELECT * FROM socialu.snipe_requests WHERE snipe_id=$1', [fixture.pending])).toHaveLength(1);
      expect(await query('SELECT * FROM socialu.snipe_tags WHERE snipe_id=$1', [fixture.pending])).toHaveLength(1);
    });
    await asActor(fixture.db, 5, async () => {
      expect(await query('SELECT * FROM socialu.snipe_requests WHERE snipe_id=$1', [fixture.pending])).toEqual([]);
      expect(await query('SELECT * FROM socialu.snipe_requests WHERE snipe_id=$1', [fixture.approved])).toHaveLength(1);
      expect(await query('SELECT * FROM socialu.snipe_tags')).toEqual([]);
      expect(await query('SELECT * FROM socialu.snipe_reports')).toEqual([]);
    });
    await asActor(fixture.db, 6, async () => { expect(await query('SELECT * FROM socialu.snipe_requests')).toEqual([]); });
    await asActor(fixture.db, 1, async () => { expect(await query('SELECT * FROM socialu.snipe_reports')).toHaveLength(1); });
  });

  it('blocks forged consent, publication and report decisions even for the submitter or tagged student', async () => {
    for (const student of [1, 2]) await asActor(fixture.db, student, async () => {
      expect(await query("UPDATE socialu.snipe_requests SET status=status RETURNING *")).toEqual([]);
      expect(await query('UPDATE socialu.snipe_tags SET identity_yes=true,sharing_yes=true RETURNING *')).toEqual([]);
      expect(await query("UPDATE socialu.snipe_reports SET status=status RETURNING *")).toEqual([]);
      for (const table of ['socialu.snipe_requests','socialu.snipe_tags','socialu.snipe_reports'])
        expect(await query(`DELETE FROM ${table} RETURNING *`)).toEqual([]);
    });
  });

  it('shows only personal inventory/participation/points and never lets an owner mint rewards', async () => {
    const personal = ['owned_items','participation_settings','participation_events','streak_instances',
      'participation_days','reminder_dismissals','point_transactions'];
    for (const student of [1, 2, 5]) await asActor(fixture.db, student, async () => {
      for (const table of personal) {
        const rows = await query(`SELECT student_id::int AS id FROM socialu.${table}`);
        expect(rows.every(row => row.id === student)).toBe(true);
        if (student === 1) expect(rows.length, table).toBeGreaterThan(0);
        expect(await query(`UPDATE socialu.${table} SET student_id=student_id RETURNING *`)).toEqual([]);
        expect(await query(`DELETE FROM socialu.${table} RETURNING *`)).toEqual([]);
      }
      expect((await query('SELECT * FROM socialu.level_completions')).length).toBe(student === 1 ? 1 : 0);
    });
  });

  it.each(FEATURE_TABLES.filter(t => !['socialu.dorms','socialu.dorm_placements','socialu.guestbook_notes'].includes(t)))
   ('%s rejects raw inserts with an RLS error, including otherwise-valid rows', async table => {
      // Policy isolation: trigger/FK checks are disabled only in this disposable
      // transaction; CHECK/UNIQUE constraints still apply. A uniqueness/trigger
      // error would FAIL this test instead of being accepted as an RLS denial.
      const specimen = (await query(`SELECT row_to_json(t) AS row FROM ${table} t LIMIT 1`))[0].row;
      for (const student of [null, 1, 5]) await asActor(fixture.db, student, async () => {
        expect((await rejected(fixture.db, `INSERT INTO ${table} OVERRIDING SYSTEM VALUE
          SELECT (json_populate_record(NULL::${table}, $1::json)).*`, [JSON.stringify(specimen)]))?.code).toBe('42501');
      }, true);
    });

  it.each(INTERNAL_TABLES)('%s stays private even to its owner with accidental table grants', async table => {
    for (const student of [1, 5]) await asActor(fixture.db, student, async () => {
      expect(await query(`SELECT * FROM ${table}`)).toEqual([]);
      expect(await query(`DELETE FROM ${table} RETURNING *`)).toEqual([]);
    });
  });

  it('updates use USING and WITH CHECK, and derived views cannot bypass the policies', async () => {
    const updates = await query("SELECT polname,polqual IS NOT NULL AS old_check,polwithcheck IS NOT NULL AS new_check FROM pg_policy WHERE polname='game_rls_update'");
    expect(updates).toHaveLength(3);
    expect(updates.every(row => row.old_check && row.new_check)).toBe(true);
    for (const table of ['points_balances','points_history','dorm_visit_counts'])
      expect((await query('SELECT reloptions FROM pg_class WHERE oid=$1::regclass', [`socialu.${table}`]))[0].reloptions).toContain('security_invoker=true');
  });

  it('keeps the checked application bridges working after RLS', async () => {
    const plant = (await query("SELECT item_id::text AS id FROM socialu.catalog_items WHERE preview_key='dorm-plant'"))[0].id;
    await fixture.db.exec('SET ROLE service_role');
    try {
      expect((await dormCall(fixture.db, 1, 'open')).isOwner).toBe(true);
      expect((await dormCall(fixture.db, 2, 'open', 'dorm1')).isOwner).toBe(false);
      await expect(dormCall(fixture.db, 5, 'open', 'dorm1')).rejects.toMatchObject({ code: '42501' });
      const dorm = await dormCall(fixture.db, 1, 'open');
      expect((await dormCall(fixture.db, 1, 'save', null, { ...dorm, placements: [] })).version).toBe(dorm.version + 1);
      await fixture.db.query('SELECT public.socialu_game_participation($1,$2,$3)', [testUid(1), 'dormspace', 'America/New_York']);
      expect((await fixture.db.query<any>('SELECT public.socialu_points_balance($1) AS result', [testUid(1)])).rows[0].result.balance).toBeGreaterThan(0);
      const purchase = [testUid(1),'purchase',JSON.stringify({ itemId:plant,expectedPrice:1,actionKey:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' })];
      const shop = async () => (await fixture.db.query<any>('SELECT public.socialu_dorm_shop($1,$2,$3::jsonb) AS result',purchase)).rows[0].result;
      expect(await shop()).toMatchObject({ status:'completed',charged:1,replayed:false });
      expect(await shop()).toMatchObject({ status:'completed',charged:1,replayed:true });
    } finally { await fixture.db.exec('RESET ROLE'); }
    expect((await snipeCall(fixture.db, 1, 'list', fixture.group)).snipes.some((r: any) => r.id === fixture.pending)).toBe(true);
    await snipeCall(fixture.db, 2, 'respond', fixture.group, fixture.pending, { identity: true, sharing: true });
    expect((await snipeCall(fixture.db, 5, 'list', fixture.group)).snipes.some((r: any) => r.id === fixture.pending && r.status === 'approved')).toBe(true);
  });

  it('is repeatable without changing application data', async () => {
    const before = await query('SELECT * FROM socialu.point_transactions ORDER BY transaction_id');
    await fixture.db.exec(readFileSync(FEATURE_RLS, 'utf8'));
    expect(await query('SELECT * FROM socialu.point_transactions ORDER BY transaction_id')).toEqual(before);
  });
});
