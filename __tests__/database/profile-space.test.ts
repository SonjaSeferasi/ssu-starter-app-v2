import { expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createDormDatabase,testUid } from '../helpers/dormspace-db';
import { DEFAULT_LOOK, SPACE_STICKERS, SPACE_FRAMES } from '../../lib/profile-space';

it('persists owner decorations, controls hello-note access, soft removal, blocking, and rate limits',async()=>{
  const db=await createDormDatabase(4);
  try {
    const sql=readFileSync('supabase/migrations/20261027030000_profile_spaces.sql','utf8');
    await db.exec(sql);await db.exec(sql);
    const library=readFileSync('supabase/migrations/20261027050000_profile_decoration_library.sql','utf8');
    await db.exec(library);await db.exec(library);
    const call=async(student:number,action='read',username:string|null=null,look:unknown=null,text:string|null=null,noteId:number|null=null)=>
      (await db.query<any>('SELECT public.socialu_profile_space($1,$2,$3,$4,$5,$6) AS s',[testUid(student),action,username,look?JSON.stringify(look):null,text,noteId])).rows[0].s;
    expect(await call(1)).toEqual({look:DEFAULT_LOOK,notes:[]});
    const decorated={...DEFAULT_LOOK,palette:'lavender',stickers:[{id:'coffee-1',kind:'coffee',x:20,y:60,rotation:-15},{id:'star-1',kind:'star',x:80,y:30,rotation:15},{id:'planet-1',kind:'planet',x:50,y:50,rotation:0}]};
    await call(1,'save_look',null,decorated);
    expect((await call(2,'read','dorm1')).look).toEqual(decorated);
    const customCover={...decorated,coverKey:`profile-covers/${testUid(1)}/22222222-2222-4222-8222-222222222222.png`};
    await call(1,'save_look',null,customCover);
    expect((await call(2,'read','dorm1')).look).toEqual(customCover);
    const boardLook={...customCover,board:{items:[{id:'saved-note',kind:'note',text:'Small wins',x:12.75,y:30.125,width:28,rotation:-3,color:'pink'},{id:'saved-sticker',kind:'sticker',sticker:'star',x:70,y:50,width:15,rotation:5}]}};
    await call(1,'save_look',null,boardLook);
    expect((await call(1)).look).toEqual(boardLook);
    expect((await call(2,'read','dorm1')).look).toEqual(boardLook);
    await expect(call(2,'save_look','dorm1',boardLook)).rejects.toThrow(/own space/);
    // Exercise every catalog entry through real PostgreSQL to catch API/RPC allowlist drift.
    for(let offset=0;offset<SPACE_STICKERS.length;offset+=8) {
      const look={...DEFAULT_LOOK,stickers:SPACE_STICKERS.slice(offset,offset+8).map((kind,index)=>({id:`sample-${index}`,kind,x:50,y:50,rotation:0}))};
      await call(1,'save_look',null,look);
      expect((await call(2,'read','dorm1')).look).toEqual(look);
    }
    for(const frame of SPACE_FRAMES) {
      const look={...DEFAULT_LOOK,frame};
      await call(1,'save_look',null,look);
      expect((await call(2,'read','dorm1')).look).toEqual(look);
    }
    await call(1,'save_look',null,decorated);
    await expect(call(2,'save_look','dorm1',DEFAULT_LOOK)).rejects.toThrow(/own space/);
    for(const look of [{...decorated,palette:'unsafe'},{...decorated,stickers:[{id:'a',kind:'coffee',x:0,y:30,rotation:0}]},{...decorated,stickers:[{id:'a',kind:'coffee',x:'50',y:30,rotation:0}]}])
      await expect(call(1,'save_look',null,look)).rejects.toThrow(/valid|inside/);
    await expect(call(1,'add_note',null,null,'Hi myself')).rejects.toThrow(/classmate/);
    await expect(call(2,'add_note','dorm1',null,'x'.repeat(161))).rejects.toThrow(/1–160/);
    let notes=(await call(2,'add_note','dorm1',null,'Good luck with finals!')).notes;
    const id=notes[0].id;
    expect(notes[0]).toMatchObject({username:'dorm2',text:'Good luck with finals!',canRemove:true});
    expect((await call(1)).notes[0].canRemove).toBe(true);
    expect((await call(4,'read','dorm1')).notes[0].canRemove).toBe(false);
    await expect(call(4,'remove_note','dorm1',null,null,id)).rejects.toThrow(/not available/);
    await expect(call(2,'add_note','dorm1',null,'Again')).rejects.toThrow(/wait/);
    expect((await call(2,'remove_note','dorm1',null,null,id)).notes).toHaveLength(0);
    expect((await db.query<any>('SELECT removed_at FROM socialu.profile_hellos WHERE note_id=$1',[id])).rows[0].removed_at).toBeTruthy();
    await expect(call(2,'add_note','dorm1',null,'Removed does not reset the limit')).rejects.toThrow(/wait/);
    notes=(await call(3,'add_note','dorm1',null,'Hello!')).notes;
    expect((await call(1,'remove_note',null,null,null,notes[0].id)).notes).toHaveLength(0);
    await db.exec("UPDATE socialu.profile_hellos SET created_at=now()-INTERVAL '2 minutes'");
    await call(2,'add_note','dorm1',null,'You have got this!');
    await db.query('INSERT INTO socialu.student_blocks(blocker_id,blocked_id) VALUES(4,2)');
    expect((await call(4,'read','dorm1')).notes).toHaveLength(0);
    await db.query('INSERT INTO socialu.student_blocks(blocker_id,blocked_id) VALUES(1,2)');
    expect((await call(1)).notes).toHaveLength(0);
    await expect(call(2,'read','dorm1')).rejects.toThrow(/not available/);
    await expect(call(2,'add_note','dorm1',null,'Blocked')).rejects.toThrow(/not available/);
    await db.exec(library);
    expect((await call(1)).look).toEqual(decorated);
    await db.exec('SET ROLE authenticated');
    await expect(call(1)).rejects.toThrow(/permission denied/);
  }finally{await db.close();}
},30000);
