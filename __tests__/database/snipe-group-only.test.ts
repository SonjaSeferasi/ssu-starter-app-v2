import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { befriend, friendship, testUid } from '../helpers/dormspace-db';
import { createGroup, createSnipeDatabase, snipeCall, snipeUpload } from '../helpers/snipe-db';

it('allows group consent workflows while denying every core and staging action in DMs', async () => {
  const db = await createSnipeDatabase(4);
  try {
    await db.exec(readFileSync('supabase/migrations/20261030040044_snipe_withdrawal_access.sql', 'utf8'));
    await db.exec(readFileSync('supabase/migrations/20261030093802_snipe_request_pagination.sql', 'utf8'));
    await db.exec(readFileSync('supabase/migrations/20261031223558_snipe_group_only.sql', 'utf8'));
    await befriend(db, 1, 2);
    const dm = (await friendship(db, 1, 'message', 2)).conversation_id;
    const group = await createGroup(db, 1, [2, 3]);
    const selection = { submission_key: randomUUID(), targets: ['2'], ...snipeUpload(1, randomUUID()) };
    for (const action of ['list', 'prepare', 'create', 'respond', 'withdraw', 'remove', 'photo']) {
      await expect(snipeCall(db, 1, action, dm, '1', selection)).rejects.toMatchObject({ code: 'SC404' });
    }
    for (const action of ['begin', 'claim', 'accept', 'discard', 'release', 'reject']) {
      await expect(db.query('SELECT public.socialu_snipe_photo($1,$2,$3,$4)', [testUid(1), action, dm, '{}']))
        .rejects.toMatchObject({ code: 'SC404' });
    }
    await expect(snipeCall(db, 4, 'list', group)).rejects.toMatchObject({ code: 'SC404' });
    expect((await snipeCall(db, 1, 'list', group)).kind).toBe('group');
    const key = randomUUID();
    const pending = await snipeCall(db, 1, 'create', group, null,
      { submission_key: key, targets: ['2'], ...snipeUpload(1, key) });
    const id = pending.snipe.id;
    expect((await snipeCall(db, 3, 'list', group)).snipes).toEqual([]);
    await snipeCall(db, 2, 'respond', group, id, { identity: true });
    const awaitingSharing = (await snipeCall(db, 2, 'list', group)).snipes[0];
    expect(awaitingSharing.status).toBe('pending');
    expect(awaitingSharing.my_answers).toMatchObject({ identity: true, sharing: null });
    expect((await snipeCall(db, 3, 'list', group)).snipes).toEqual([]);
    await snipeCall(db, 2, 'respond', group, id, { sharing: true });
    expect((await snipeCall(db, 3, 'list', group)).snipes[0].status).toBe('approved');
    await snipeCall(db, 2, 'withdraw', group, id);
    await expect(snipeCall(db, 1, 'photo', group, id)).rejects.toMatchObject({ code: 'SN404' });
    expect((await snipeCall(db, 1, 'list', group)).snipes[0].status).toBe('removed');
    for (const signature of ['public.socialu_snipe(uuid,text,bigint,bigint,jsonb)', 'public.socialu_snipe_photo(uuid,text,bigint,jsonb)']) {
      for (const role of ['anon', 'authenticated', 'service_role']) {
        const result = await db.query<{ ok: boolean }>('SELECT has_function_privilege($1,$2,\'EXECUTE\') AS ok', [role, signature]);
        expect(result.rows[0].ok).toBe(role === 'service_role');
      }
    }
  } finally { await db.close(); }
}, 120000);
