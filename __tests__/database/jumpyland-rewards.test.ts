import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { createDorm3dDatabase, SHOP_ONLY, balance, shopCall, openDorm, itemId } from '../helpers/dormspace-3d-db';
import { testUid } from '../helpers/dormspace-db';

describe('Jumpyland completion rewards use the real shared ledger', () => {
  let db: PGlite;
  const attempt = () => crypto.randomUUID();
  async function call(student: number, action: string, id: string | null = null, level = 1, coins = 0) {
    if (action === 'complete') {
      // Advance only the disposable fixture's start time; production history remains immutable.
      await db.exec('SET session_replication_role=replica');
      try { await db.query("UPDATE socialu.participation_events SET occurred_at=clock_timestamp()-interval '20 seconds' WHERE event_id=$1", [id]); }
      finally { await db.exec('SET session_replication_role=origin'); }
    }
    return (await db.query<{ result: any }>('SELECT public.socialu_jumpyland($1,$2,$3,$4,$5,$6) AS result',
      [action, testUid(student), id, level, coins, 'America/New_York'])).rows[0].result;
  }
  beforeAll(async () => {
    db = await createDorm3dDatabase(4, SHOP_ONLY);
    for (const migration of ['20261015000100_jumpyland.sql', '20261116053032_jumpyland_completion_rewards.sql', '20261116060114_shared_points_balance_read.sql']) {
      await db.exec(readFileSync(`supabase/migrations/${migration}`, 'utf8'));
    }
  }, 60_000);
  afterAll(async () => { await db?.close(); });

  it('awards 25 for each of the three levels and returns the shared account balance', async () => {
    for (let level = 1; level <= 3; level++) {
      const id = attempt();
      await call(1, 'start', id, level);
      const result = await call(1, 'complete', id);
      expect(result).toMatchObject({ reward: { points: 25, attemptId: id }, balance: level * 25 });
      expect(result.completed).toContain(level);
    }
    expect(await balance(db, 1)).toBe(75);
    expect((await db.query<{ result: any }>('SELECT public.socialu_points_balance($1) AS result', [testUid(1)])).rows[0].result.balance).toBe(75);
  });

  it('rejects an implausibly immediate completion without credit', async () => {
    const id = attempt(); await call(3, 'start', id);
    await expect(db.query("SELECT public.socialu_jumpyland('complete',$1,$2,NULL,0,NULL)", [testUid(3), id])).rejects.toThrow('Complete the course');
    expect(await balance(db, 3)).toBe(0);
  });

  it('returns the same reward on a lost-response retry without double credit', async () => {
    const id = attempt(); await call(2, 'start', id);
    await call(2, 'complete', id);
    await Promise.all([call(2, 'complete', id), call(2, 'complete', id)]);
    expect(await balance(db, 2)).toBe(25);
    const rows = await db.query('SELECT * FROM socialu.point_transactions WHERE attempt_id=$1', [id]);
    expect(rows.rows).toHaveLength(1);
    await expect(call(2, 'complete', id, 1, 1)).rejects.toThrow('immutable');
    expect(await balance(db, 2)).toBe(25);
  });

  it('rejects foreign, missing and invalid attempts without credit', async () => {
    const id = attempt(); await call(3, 'start', id);
    await expect(call(4, 'complete', id)).rejects.toThrow('Started attempt required');
    await expect(call(3, 'complete', attempt())).rejects.toThrow('Started attempt required');
    await expect(call(3, 'complete', id, 1, 99)).rejects.toThrow('Invalid coin result');
    expect(await balance(db, 3)).toBe(0); expect(await balance(db, 4)).toBe(0);
  });

  it('funds one real shop purchase and keeps ownership and charge idempotent', async () => {
    await openDorm(db, 4);
    const plant = await itemId(db, 'dorm-plant');
    expect(await shopCall(db, 4, 'purchase', { itemId: plant, expectedPrice: 150, actionKey: attempt() }))
      .toMatchObject({ status: 'rejected', reason: 'insufficient', balance: 0 });
    for (let n = 0; n < 6; n++) {
      const id = attempt(); await call(4, 'start', id); await call(4, 'complete', id);
    }
    const purchase = { itemId: plant, expectedPrice: 150, actionKey: attempt() };
    expect(await shopCall(db, 4, 'purchase', purchase)).toMatchObject({ status: 'completed', charged: 150, balance: 0 });
    expect(await shopCall(db, 4, 'purchase', purchase)).toMatchObject({ status: 'completed', replayed: true, balance: 0 });
    expect((await shopCall(db, 4, 'catalog')).offers.find((o: any) => o.id === plant).state).toBe('owned');
  });
});
