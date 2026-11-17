import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {createDormDatabase,testUid} from '../helpers/dormspace-db';
it('saves only own photo atomically; keeps it for outfits and removes it for a default face',async()=>{
 const db=await createDormDatabase(2);
 try {
  await db.exec(readFileSync('supabase/migrations/20261117060000_avatar_photo_faces.sql','utf8'));
  const read=async(student:number)=>(await db.query<{result:any}>('SELECT public.socialu_game_room($1,$2) result',['read',testUid(student)])).rows[0].result;
  const photo=async(student:number,key:string|null=null,crop:any={x:0,y:0,width:1,height:1})=>(await db.query<{result:any}>('SELECT public.socialu_avatar_photo($1,$2,$3,$4) result',[testUid(student),key,key?500:null,JSON.stringify(crop)])).rows[0].result;
  const original=await read(1);await read(2);
  const key=`avatar-face/${testUid(1)}/11111111-1111-4111-8111-111111111111.jpg`;
  const saved=await photo(1,key);expect(saved.key).toBe(key);expect(await photo(2)).toBe(null);
  expect((await read(1)).appearance.faceId).toBe(null);
  await expect(photo(2,key)).rejects.toThrow('Invalid photograph');
  await expect(photo(1,key.replace('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'),{x:.8,y:0,width:.5,height:1})).rejects.toThrow();
  expect(await photo(1)).toEqual(saved);
  expect((await db.query('SELECT * FROM socialu.avatar_photo_faces')).rows).toHaveLength(1);
  await db.query('SELECT public.socialu_game_room($1,$2,$3,$4,$5)',['save_avatar',testUid(1),null,original.appearance.outfitId,null]);
  expect(await photo(1)).toEqual(saved);
  await db.query('SELECT public.socialu_game_room($1,$2,$3,$4,$5)',['save_avatar',testUid(1),null,original.appearance.outfitId,original.appearance.faceId]);
  expect(await photo(1)).toBe(null);
  await db.exec('SET ROLE authenticated');await expect(photo(1)).rejects.toThrow('permission denied');
 } finally {await db.close();}
},30000);
