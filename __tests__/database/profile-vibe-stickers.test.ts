import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createDormDatabase, testUid } from '../helpers/dormspace-db';
import { VIBE_ICONS } from '../../lib/profile-corner';

it('persists every vibe sticker, preserves existing cards, and keeps owner and blocking checks',async()=>{
  const db=await createDormDatabase(3);
  const migrate=(name:string)=>db.exec(readFileSync(`supabase/migrations/${name}.sql`,'utf8'));
  const call=async(student:number,action='read',username:string|null=null,payload={})=>(await db.query<any>('SELECT public.socialu_profile_corner($1,$2,$3,$4) AS result',[testUid(student),action,username,JSON.stringify(payload)])).rows[0].result;
  try {
    for(const name of ['20261027030000_profile_spaces','20261027040000_profile_corners','20261027050000_profile_decoration_library'])await migrate(name);
    await call(1,'save_vibe',null,{text:'Coffee time',icon:'coffee'});
    await call(1,'save_goals',null,{goals:[{id:'one',text:'Visit the library',done:false}]});
    const before=await call(1);
    await migrate('20261027070000_profile_vibe_stickers');await migrate('20261027070000_profile_vibe_stickers');
    expect(await call(2,'read','dorm1')).toEqual({...before,stickerVibes:true});
    expect(VIBE_ICONS).toHaveLength(90);expect(new Set(VIBE_ICONS).size).toBe(90);
    for(const icon of VIBE_ICONS){
      await call(1,'save_vibe',null,{text:'My mood',icon});
      expect((await call(2,'read','dorm1')).vibe.icon).toBe(icon);
    }
    for(const icon of ['unknown','leaf',null,'<script>'])await expect(call(1,'save_vibe',null,{text:'No',icon})).rejects.toThrow();
    await expect(call(2,'save_vibe','dorm1',{text:'Forged',icon:'cat'})).rejects.toThrow(/own cards/);
    await db.exec('INSERT INTO socialu.student_blocks(blocker_id,blocked_id) VALUES(1,3)');
    await expect(call(3,'read','dorm1')).rejects.toThrow(/not available/);
    await call(1,'save_vibe',null,{clear:true});expect((await call(1)).vibe).toBeNull();
  } finally { await db.close(); }
});
