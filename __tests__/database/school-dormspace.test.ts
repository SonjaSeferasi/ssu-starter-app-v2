import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createDormDatabase, testUid } from '../helpers/dormspace-db';
import { liveCall, liveState, prepareLiveDatabase } from '../helpers/dormspace-live-db';

it('isolates hallway players and realtime messages by school', async () => {
  const db = await createDormDatabase();
  try {
    for (const file of ['20261020013144_dormspace_furnishings.sql', '20261020021507_dormspace_rotation.sql'])
      await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
    await prepareLiveDatabase(db);
    await db.exec(readFileSync('supabase/migrations/20261026000100_school_communities.sql', 'utf8'));
    await db.query("SELECT socialu.ensure_school('dorm3@example.edu')");
    await db.query("UPDATE auth.users SET email='dorm3@example.edu' WHERE id=$1", [testUid(3)]);
    await db.query("UPDATE socialu.students SET university_email='dorm3@example.edu' WHERE student_id=3");
    const hall = { kind: 'hall', floor: 1 };
    await liveCall(db, 1, 'join', hall, { state: liveState(20, 20) });
    await liveCall(db, 2, 'join', hall, { state: liveState(20, 20) });
    const other = await liveCall(db, 3, 'join', hall, { state: liveState(20, 20) });
    expect(other.players.map((p: any) => p.username)).toEqual(['dorm3']);
    expect((await liveCall(db, 1, 'sync')).players.map((p: any) => p.username)).toEqual(['dorm1', 'dorm2']);
    await liveCall(db, 1, 'say', {}, { text: 'Our school', messageId: '33333333-3333-4333-8333-333333333333' });
    expect((await liveCall(db, 3, 'sync')).messages).toHaveLength(0);
    expect((await liveCall(db, 2, 'sync')).messages).toHaveLength(1);
    const events = (await db.query<any>("SELECT topic FROM public.test_live_events WHERE payload->>'type'='message'")).rows;
    expect(events.map(e => e.topic)).toEqual([`dormspace:${testUid(2)}`]);
  } finally { await db.close(); }
}, 30000);
