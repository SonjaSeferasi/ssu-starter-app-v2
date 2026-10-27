import { expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createDormDatabase,testUid } from '../helpers/dormspace-db';
import { DEFAULT_LOOK, positionedSticker, profileLookInput } from '../../lib/profile-space';
import { PROFILE_THEMES, applyProfileTheme } from '../../lib/profile-themes';
import { STICKER_CATALOG } from '../../lib/profile-stickers';
it('stores decorations on every surface using the existing database setup, including full edge positions',async()=>{
  const db=await createDormDatabase(3);
  const migrate=(name:string)=>db.exec(readFileSync(`supabase/migrations/${name}.sql`,'utf8'));
  const call=async(student:number,action='read',look:unknown=null,username:string|null=null)=>(await db.query<any>('SELECT public.socialu_profile_space(p_auth_id=>$1::uuid,p_action=>$2::text,p_look=>$3::jsonb,p_username=>$4::text) AS result',[testUid(student),action,look?JSON.stringify(look):null,username])).rows[0].result;
  try{
    for(const name of ['20261027020000_profile_personality','20261027030000_profile_spaces','20261027050000_profile_decoration_library'])await migrate(name);
    for(const version of ['existing','latest']){
      if(version==='latest')await migrate('20261027060000_profile_about_and_hello_notes');
      for(const theme of PROFILE_THEMES){const themed=profileLookInput(applyProfileTheme(DEFAULT_LOOK,theme.id));await call(1,'save_look',themed);expect((await call(2,'read',null,'dorm1')).look).toEqual(themed);}
      for(let start=0;start<STICKER_CATALOG.length;start+=8){
        const items=STICKER_CATALOG.slice(start,start+8);
        const look=profileLookInput({...DEFAULT_LOOK,hometown:'Hanoi',homeCountry:'VN',stickers:items.map((item,i)=>({id:`cover-${i}`,kind:item.kind,...positionedSticker({x:i%2?100:0,y:i%2?0:100}),rotation:15,scale:1.3})),cardStickers:{about:items.map((item,i)=>({id:`about-${i}`,kind:item.kind,...positionedSticker({x:100,y:100}),rotation:30,scale:1.5})),notes:items.map((item,i)=>({id:`notes-${i}`,kind:item.kind,...positionedSticker({x:0,y:0}),rotation:-20,scale:0.8}))},cardFinishes:{about:'paper',notes:'sticky'}});
        await call(1,'save_look',look);expect((await call(2,'read',null,'dorm1')).look).toEqual(look);
        await expect(call(2,'save_look',look,'dorm1')).rejects.toThrow(/own space/);
      }
    }
    await db.exec('INSERT INTO socialu.student_blocks(blocker_id,blocked_id) VALUES(1,3)');await expect(call(3,'read',null,'dorm1')).rejects.toThrow(/not available/);
  }finally{await db.close();}
});
