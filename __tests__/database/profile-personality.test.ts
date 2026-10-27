import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createDormDatabase, testUid } from '../helpers/dormspace-db';

it('saves only the owner, respects blocked profiles, validates input and preserves existing profiles', async () => {
  const db = await createDormDatabase(2);
  try {
    const sql = readFileSync('supabase/migrations/20261027020000_profile_personality.sql', 'utf8');
    await db.query("UPDATE socialu.student_profiles SET bio='Existing bio' WHERE student_id=1");
    await db.exec(sql); await db.exec(sql);
    const call = async (student: number, action = 'read', username: string | null = null, prompt = 'building', answer = '', interests: string[] = [], spotify = '') =>
      (await db.query<any>('SELECT public.socialu_profile_personality($1,$2,$3,$4,$5,$6,$7) AS p', [testUid(student), action, username, prompt, answer, interests, spotify])).rows[0].p;
    expect(await call(1)).toEqual({ prompt: 'building', answer: '', interests: [], spotifyUrl: '' });
    const music = 'https://open.spotify.com/track/0Lr4kGOYn9l83EjuK6cZFQ';
    expect((await call(1, 'save', null, 'building', 'My project', ['Music'], music)).spotifyUrl).toBe(music);
    expect((await call(2, 'read', 'dorm1')).answer).toBe('My project');
    await expect(call(2, 'save', 'dorm1', 'up_for', 'Overwrite')).rejects.toThrow(/own profile/);
    await expect(call(1, 'save', null, 'building', 'x'.repeat(101))).rejects.toThrow();
    await expect(call(1, 'save', null, 'building', '', ['Music','Music'])).rejects.toThrow(/valid prompt/);
    await expect(call(1, 'save', null, 'building', '', ['Other'])).rejects.toThrow();
    await expect(call(1, 'save', null, 'building', '', [], music)).rejects.toThrow();
    await expect(call(1, 'save', null, 'building', '', ['Music'], 'https://evil.example/track/0Lr4kGOYn9l83EjuK6cZFQ')).rejects.toThrow();
    expect((await db.query<any>('SELECT bio FROM socialu.student_profiles WHERE student_id=1')).rows[0].bio).toBe('Existing bio');
    await db.query('INSERT INTO socialu.student_blocks(blocker_id,blocked_id) VALUES(1,2)');
    await expect(call(2, 'read', 'dorm1')).rejects.toThrow(/not available/);
    expect((await call(1, 'save')).spotifyUrl).toBe('');
    await db.exec('SET ROLE authenticated');
    await expect(call(1)).rejects.toThrow(/permission denied/);
  } finally { await db.close(); }
}, 30000);
