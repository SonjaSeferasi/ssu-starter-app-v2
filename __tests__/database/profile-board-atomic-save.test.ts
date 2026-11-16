import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createDormDatabase, testUid } from '../helpers/dormspace-db';
import { DEFAULT_LOOK } from '../../lib/profile-space';

it('merges board-only writes with current profile data and enforces owner isolation', async () => {
  const db = await createDormDatabase(2);
  try {
    for (const name of ['20261027030000_profile_spaces.sql', '20261027050000_profile_decoration_library.sql', '20261116210000_atomic_profile_board_save.sql']) {
      await db.exec(readFileSync(`supabase/migrations/${name}`, 'utf8'));
    }
    // Reapplying the migration must not reset stored profiles.
    const saveLook = (look: unknown) => db.query('SELECT public.socialu_profile_space($1,$2,NULL,$3)', [testUid(1), 'save_look', JSON.stringify(look)]);
    const saveBoard = async (student: number, board: unknown) => (await db.query<any>('SELECT public.socialu_save_profile_board($1,$2) AS result', [testUid(student), JSON.stringify(board)])).rows[0].result;
    const board = {items:[{id:'note-one',kind:'note',x:20,y:22,width:28,rotation:-3,text:'Small wins',color:'pink'}]};
    const original = {...DEFAULT_LOOK, hometown:'Original'};
    await saveLook(original);
    const latest = {...original, hometown:'New', theme:'midnight', stickers:[{id:'new-star',kind:'star',x:50,y:50,rotation:0}]};
    // This is the competing write committed before the board RPC executes.
    // Passing only the board prevents a stale copy of `original` overwriting it.
    await saveLook(latest);
    expect((await saveBoard(1, board)).look).toEqual({...latest, board});
    await db.exec(readFileSync('supabase/migrations/20261116210000_atomic_profile_board_save.sql', 'utf8'));
    expect((await saveBoard(1, {items:[]})).look).toEqual({...latest, board:{items:[]}});
    expect((await saveBoard(2, board)).look).toEqual({...DEFAULT_LOOK, board});
    expect((await db.query<any>('SELECT look FROM socialu.profile_spaces WHERE student_id=1')).rows[0].look).toEqual({...latest,board:{items:[]}});
    await expect(saveBoard(1, null)).rejects.toThrow(/valid board/);
    await db.exec('SET ROLE authenticated');
    await expect(saveBoard(1, board)).rejects.toThrow(/permission denied/);
  } finally { await db.close(); }
}, 30000);
