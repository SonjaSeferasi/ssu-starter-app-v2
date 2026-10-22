import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createDormDatabase, testUid } from '../helpers/dormspace-db';

it('lists only verified active members of the viewer school, honoring blocks, search and pagination', async () => {
  const db = await createDormDatabase(6);
  try {
    for (const file of ['20261026000100_school_communities.sql', '20261026000200_campus_members.sql'])
      await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
    await db.query("SELECT socialu.ensure_school('dorm4@example.edu')");
    await db.query("UPDATE auth.users SET email='dorm4@example.edu' WHERE id=$1", [testUid(4)]);
    await db.query("UPDATE socialu.students SET university_email='dorm4@example.edu' WHERE student_id=4");
    await db.query('UPDATE auth.users SET email_confirmed_at=NULL WHERE id=$1', [testUid(5)]);
    await db.query('UPDATE socialu.students SET reverification_required=true WHERE student_id=6');
    const list = async (student=1, query='', offset=0) => (await db.query<any>('SELECT public.socialu_campus_members($1,$2,$3) AS members', [testUid(student), query, offset])).rows[0].members;
    expect((await list()).map((m: any) => m.username)).toEqual(['dorm1', 'dorm2', 'dorm3']);
    expect((await list())[0]).toEqual({ username: 'dorm1', name: 'Dorm Student 1', photo_key: null, is_me: true });
    expect((await list(4)).map((m: any) => m.username)).toEqual(['dorm4']);
    expect((await list(1,'DORM2')).map((m: any) => m.username)).toEqual(['dorm2']);
    expect((await list(1,'',2)).map((m: any) => m.username)).toEqual(['dorm3']);
    await db.query('INSERT INTO socialu.student_blocks(blocker_id,blocked_id) VALUES(2,1)');
    await db.query('UPDATE socialu.students SET is_active=false WHERE student_id=3');
    expect((await list()).map((m: any) => m.username)).toEqual(['dorm1']);
    await expect(list(3)).rejects.toThrow(/active university/);
    await expect(list(1,'',-1)).rejects.toThrow(/Invalid member search/);
    expect((await db.query<any>("SELECT has_function_privilege('authenticated','public.socialu_campus_members(uuid,text,integer)','EXECUTE') AS allowed")).rows[0].allowed).toBe(false);
  } finally { await db.close(); }
}, 30000);
