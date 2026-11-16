import { expect, it } from 'vitest';
import { applyMigration, createDorm3dDatabase, DIRECTORY_ONLY, openDorm } from '../helpers/dormspace-3d-db';
import { befriend, friendship, testUid } from '../helpers/dormspace-db';
import { liveCall, liveConnection, liveSession, liveState, prepareLiveDatabase } from '../helpers/dormspace-live-db';

it('protects each owner soundtrack using the real room, session and access rules', async () => {
  const db = await createDorm3dDatabase(4, DIRECTORY_ONLY);
  try {
    await prepareLiveDatabase(db);
    await applyMigration(db, 'supabase/migrations/20261116053034_dormspace_personal_music.sql');
    await openDorm(db, 1); const friendshipId = await befriend(db, 1, 2);
    const room = (student: number) => liveCall(db, student, 'join', { kind: 'room', owner: 'dorm1' }, { state: liveState(0, 0) });
    const music = (student: number, action = 'read', payload = {}, connection = liveConnection(student)) =>
      db.query<{ result: any }>('SELECT public.socialu_dorm_music($1,$2,$3,$4,$5,$6) AS result',
        [testUid(student), liveSession(student), connection, 'dorm1', action, JSON.stringify(payload)]).then(r => r.rows[0].result);
    await expect(music(1)).rejects.toThrow('Open this room');
    await room(1); await room(2);
    expect(await music(1)).toMatchObject({ isOwner: true, track: null });
    const key = `${testUid(1)}/33333333-3333-4333-8333-000000000001.mp3`;
    const saved = await music(1, 'save', { storageKey: key, title: 'Dorm soundtrack' });
    expect(saved.track).toMatchObject({ title: 'Dorm soundtrack', storageKey: key });
    expect(await music(2)).toMatchObject({ isOwner: false, track: { version: saved.track.version } });
    await expect(music(2, 'remove')).rejects.toThrow('Only the room owner');
    await expect(music(3)).rejects.toThrow('not available');
    await expect(music(1, 'read', {}, liveConnection(2))).rejects.toThrow('Open this room');
    await expect(music(1, 'save', { storageKey: `${testUid(2)}/33333333-3333-4333-8333-000000000001.mp3`, title: 'Foreign file' })).rejects.toThrow('valid MP3');
    await friendship(db, 1, 'remove', 2, friendshipId);
    await expect(music(2)).rejects.toThrow('not available');
    expect((await music(1)).track.title).toBe('Dorm soundtrack');
    expect(await music(1, 'remove')).toMatchObject({ oldKey: key, track: null });
    await db.exec('SET ROLE authenticated');
    await expect(music(1)).rejects.toThrow('permission denied');
  } finally { await db.close(); }
}, 60_000);
