import { expect, it } from 'vitest';
import { applyMigration, createDorm3dDatabase, DIRECTORY_ONLY, moveToSchool, openDorm } from '../helpers/dormspace-3d-db';
import { befriend, friendship, testUid } from '../helpers/dormspace-db';
import { liveCall, liveConnection, liveSession, liveState, prepareLiveDatabase } from '../helpers/dormspace-live-db';

const migration = 'supabase/migrations/20261106075900_dormspace_voice.sql';
const attempt = '33333333-3333-4333-8333-000000000001';
const replacement = '33333333-3333-4333-8333-000000000002';
const identity = (student: number) => `${liveConnection(student)}.${attempt}`;

it('binds voice leases to the real session, location, university, and current access', async () => {
  const db = await createDorm3dDatabase(4, DIRECTORY_ONLY);
  try {
    await prepareLiveDatabase(db);
    await applyMigration(db, migration);
    await moveToSchool(db, 4, 'dorm4@umb.edu');
    await openDorm(db, 1);
    const request = await befriend(db, 1, 2);
    const lease = async (student: number, action = 'join', connection = liveConnection(student), id = attempt) => (
      await db.query<{ result: { channel?: string; error?: string } | null }>(
        'SELECT public.socialu_dorm_voice_lease($1,$2,$3,$4,$5) AS result',
        [testUid(student), liveSession(student), connection, id, action],
      )).rows[0].result;
    const members = async (channel: string) => (
      await db.query<{ result: Record<string, string[]> }>('SELECT public.socialu_dorm_voice_members($1,$2) AS result',
        [channel, [1, 2, 3, 4].map(liveConnection)])).rows[0].result;
    const hall = (student: number, floor = 1) => liveCall(db, student, 'join', { kind: 'hall', floor }, { state: liveState(20, 20) });
    const room = (student: number) => liveCall(db, student, 'join', { kind: 'room', owner: 'dorm1' }, { state: liveState(0, 0) });

    await db.exec('SET ROLE authenticated');
    await expect(lease(1)).rejects.toThrow(/permission denied/);
    await expect(members('hall:1')).rejects.toThrow(/permission denied/);
    await db.exec('SET ROLE service_role');
    expect(await lease(1)).toBeNull();
    await hall(1);
    await hall(3, 2);
    await hall(4);
    const campus = (await lease(1))!.channel!;
    expect((await lease(3))!.channel).toBe(campus);
    expect((await lease(4))!.channel).not.toBe(campus);
    expect(await lease(3, 'join', liveConnection(1))).toBeNull();
    expect(await lease(3, 'join', liveConnection(3), replacement)).toEqual({ error: 'active' });
    expect(await members(campus)).toEqual({ [identity(1)]: [], [identity(3)]: [] });

    await db.exec('RESET ROLE');
    await friendship(db, 1, 'block', 3);
    expect(await members(campus)).toEqual({ [identity(1)]: [identity(3)], [identity(3)]: [identity(1)] });
    await lease(3, 'leave');
    expect(await lease(3)).toEqual({ error: 'blocked' });

    await room(1);
    await room(2);
    await expect(room(3)).rejects.toThrow(/friend/);
    expect(await lease(1, 'renew')).toBeNull();
    await lease(1, 'leave');
    const privateRoom = (await lease(1, 'join', liveConnection(1), replacement))!.channel!;
    expect(privateRoom).not.toBe(campus);
    expect((await lease(2))!.channel).toBe(privateRoom);
    expect(Object.keys(await members(privateRoom))).toHaveLength(2);
    await friendship(db, 1, 'remove', 2, request);
    expect(await lease(2, 'renew')).toBeNull();
    expect(await members(privateRoom)).toEqual({ [`${liveConnection(1)}.${replacement}`]: [] });
    await db.query("UPDATE dormspace_live.voice_leases SET expires_at = clock_timestamp() - interval '1 second' WHERE connection_id=$1", [liveConnection(1)]);
    expect(await members(privateRoom)).toEqual({});
    expect(await lease(1, 'renew', liveConnection(1), replacement)).toBeNull();
  } finally {
    await db.close();
  }
}, 120000);
