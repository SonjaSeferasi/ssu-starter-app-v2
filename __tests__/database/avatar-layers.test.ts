import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createDormDatabase,testUid} from '../helpers/dormspace-db';

it('saves and reloads complete layered looks while preserving legacy avatars and ownership rules',async()=>{
 const db=await createDormDatabase(2);
 const avatar=async(student:number,appearance?:Record<string,unknown>)=>(await db.query<{data:any}>(
  'SELECT public.socialu_avatar_customization($1,$2::jsonb) AS data',[testUid(student),appearance?JSON.stringify(appearance):null])).rows[0].data;
 try{
  const before=(await db.query<{data:any}>("SELECT public.socialu_game_room('read',$1) AS data",[testUid(1)])).rows[0].data;
  await db.exec(readFileSync('supabase/migrations/20261018020000_avatar_layers.sql','utf8'));
  await db.exec('SET ROLE service_role');
  const initial=await avatar(1);
  expect(initial.appearance).toEqual(before.appearance);
  const selected={...initial.appearance,faceStyle:'round-glasses',shirtColor:'navy',pantsColor:'denim',skinTone:'tone-6',headStyle:'hijab-cream',topStyle:'cardigan',topColor:'green',bottomStyle:'wide-leg',bottomColor:'olive'};
  expect((await avatar(1,selected)).appearance).toMatchObject(selected);
  expect((await avatar(1)).appearance).toMatchObject(selected);
  const other=await avatar(2);
  expect(other.appearance).not.toHaveProperty('headStyle');
  await expect(avatar(1,{...selected,headStyle:'not-a-style'})).rejects.toThrow();
  await expect(avatar(1,{...selected,outfitId:'999999'})).rejects.toThrow();
  expect((await avatar(1)).appearance).toMatchObject(selected);
  // Returning to the original collection deliberately clears only v2 fields.
  const classic={outfitId:selected.outfitId,faceId:selected.faceId,faceStyle:'natural',shirtColor:'navy',pantsColor:'denim'};
  const restored=await avatar(1,classic);
  expect(restored.appearance).toMatchObject(classic);
  expect(restored.appearance).not.toHaveProperty('skinTone');
  await db.exec('RESET ROLE');
  for(const role of ['authenticated','anon'])expect((await db.query<{allowed:boolean}>(
   "SELECT has_function_privilege($1,'public.socialu_avatar_customization(uuid,jsonb)','EXECUTE') AS allowed",[role])).rows[0].allowed).toBe(false);
 }finally{await db.close();}
},25000);
