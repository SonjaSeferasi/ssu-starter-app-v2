import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createDormDatabase, testUid } from '../helpers/dormspace-db';

const migration = (name: string) => readFileSync(`supabase/migrations/${name}.sql`, 'utf8');

it('keeps old answers, saves several prompts, more interests, and styled hello notes', async () => {
  const db = await createDormDatabase(3);
  try {
    for (const name of ['20261027020000_profile_personality', '20261027030000_profile_spaces', '20261027050000_profile_decoration_library']) await db.exec(migration(name));
    await db.query("SELECT public.socialu_profile_personality($1,'save',NULL,'up_for','Coffee',ARRAY['Coding'],'')", [testUid(1)]);
    await db.query("SELECT public.socialu_profile_space($1,'add_note','dorm1',NULL,'Old note',NULL)", [testUid(2)]);
    const sql = migration('20261027060000_profile_about_and_hello_notes');
    await db.exec(sql); await db.exec(sql);

    const about = async (student: number, action = 'read', username: string | null = null, answers: unknown = [], interests: string[] = []) =>
      (await db.query<any>('SELECT public.socialu_profile_personality($1,$2,$3,$4,$5,$6) AS p', [testUid(student), action, username, JSON.stringify(answers), interests, ''])).rows[0].p;
    expect(await about(2, 'read', 'dorm1')).toEqual({ answers: [{ prompt: 'up_for', answer: 'Coffee' }], interests: ['Coding'], spotifyUrl: '' });
    const answers = [{ prompt: 'building', answer: ' A campus app ' }, { prompt: 'fun_fact', answer: 'I juggle' }];
    expect((await about(1, 'save', null, answers, ['Gaming', 'Food'])).answers).toEqual([{ prompt: 'building', answer: 'A campus app' }, { prompt: 'fun_fact', answer: 'I juggle' }]);
    expect((await about(1, 'save', null, [], [])).answers).toEqual([]);
    await db.exec(sql);
    expect((await about(1)).answers).toEqual([]);
    for (const bad of [[answers[0], answers[0]], [{ prompt: 'nope', answer: 'x' }], [{ prompt: 'building', answer: ' ' }], [...answers, { prompt: 'ask_me', answer: 'a' }, { prompt: 'up_for', answer: 'b' }]])
      await expect(about(1, 'save', null, bad)).rejects.toThrow();
    await expect(about(1, 'save', null, [], ['Skydiving'])).rejects.toThrow();
    await expect(about(2, 'save', 'dorm1', answers)).rejects.toThrow(/own profile/);

    const space = async (student: number, action: string, text: string | null, color = 'yellow', doodle = 'none') =>
      (await db.query<any>('SELECT public.socialu_profile_space($1,$2,$3,NULL,$4,NULL,$5,$6) AS s', [testUid(student), action, 'dorm1', text, color, doodle])).rows[0].s;
    expect((await space(1, 'read', null)).notes[0]).toMatchObject({ text: 'Old note', color: 'yellow', doodle: 'none' });
    expect((await space(3, 'add_note', 'Study crew soon?', 'green', 'smile')).notes[0]).toMatchObject({ text: 'Study crew soon?', color: 'green', doodle: 'smile' });
    await db.exec("UPDATE socialu.profile_hellos SET created_at=now()-INTERVAL '2 minutes'");
    await expect(space(3, 'add_note', 'Hi', 'neon')).rejects.toThrow(/color and doodle/);
    await expect(space(3, 'add_note', 'Hi', 'pink', 'skull')).rejects.toThrow(/color and doodle/);

    const look = (stickers: unknown[]) => ({ palette: 'sage', frame: 'rounded', cover: 'meadow', layout: 'about-first', stickers });
    const saveLook = (value: unknown) => db.query<any>("SELECT public.socialu_profile_space($1,'save_look',NULL,$2) AS s", [testUid(1), JSON.stringify(value)]);
    const sized = look([{ id: 'a', kind: 'star', x: 50, y: 50, rotation: 30, scale: 1.75 }, { id: 'b', kind: 'coffee', x: 30, y: 40, rotation: 0 }]);
    expect((await saveLook(sized)).rows[0].s.look).toEqual(sized);
    for (const scale of [0.3, 2.5, '1']) await expect(saveLook(look([{ id: 'a', kind: 'star', x: 50, y: 50, rotation: 0, scale }]))).rejects.toThrow(/valid sticker|inside the cover/);

    await db.exec('SET ROLE authenticated');
    await expect(about(1)).rejects.toThrow(/permission denied/);
    await expect(space(1, 'read', null)).rejects.toThrow(/permission denied/);
  } finally { await db.close(); }
}, 30000);
