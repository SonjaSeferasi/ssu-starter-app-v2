import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createDormDatabase,testUid} from '../helpers/dormspace-db';
import {DEFAULT_LOOK} from '../../lib/profile-space';
it('rejects missing, removed and foreign photos on atomic and full-look saves without changing stored data',async()=>{
 const db=await createDormDatabase(2);
 try{
  for(const name of ['20261027030000_profile_spaces.sql','20261027050000_profile_decoration_library.sql','20261027080000_profile_memories.sql','20261116210000_atomic_profile_board_save.sql'])await db.exec(readFileSync('supabase/migrations/'+name,'utf8'));
  await db.exec("INSERT INTO socialu.profile_memories(student_id,storage_key) VALUES(1,'owner-photo'),(2,'foreign-photo'),(1,'removed-photo')");
  const board=(id:unknown)=>({items:[{id:'photo-test',kind:'photo',x:10,y:10,width:28,rotation:0,memoryId:id}]});
  const save=(id:unknown)=>db.query('SELECT public.socialu_save_profile_board($1,$2)',[testUid(1),JSON.stringify(board(id))]);
  const read=async()=>(await db.query<any>('SELECT look FROM socialu.profile_spaces WHERE student_id=1')).rows[0].look;
  // Baseline reproduction: nonexistent and foreign references were both persisted.
  await save(999999);expect((await read()).board).toEqual(board(999999));
  await save(2);expect((await read()).board).toEqual(board(2));
  const migration=readFileSync('supabase/migrations/20261117020000_board_photo_ownership.sql','utf8');await db.exec(migration);await db.exec(migration);
  await save(1);const before=await read();
  await db.query('DELETE FROM socialu.profile_memories WHERE memory_id=3');
  for(const id of [999999,2,3,'1',null,-1,1.5,9007199254740992]){
   await expect(save(id)).rejects.toMatchObject({code:'22023'});expect(await read()).toEqual(before);
  }
  await expect(db.query('SELECT public.socialu_profile_space($1,$2,NULL,$3)',[testUid(1),'save_look',JSON.stringify({...DEFAULT_LOOK,board:board(2)})])).rejects.toMatchObject({code:'22023'});
  expect(await read()).toEqual(before);
  await expect(db.query('SELECT public.socialu_save_profile_board($1,$2)',[testUid(2),JSON.stringify(board(1))])).rejects.toMatchObject({code:'22023'});
  await db.query('SELECT public.socialu_save_profile_board($1,$2)',[testUid(2),JSON.stringify(board(2))]);
  await db.query('SELECT public.socialu_save_profile_board($1,$2)',[testUid(1),JSON.stringify({items:[]})]);
  expect((await read()).board).toEqual({items:[]});
 }finally{await db.close();}
},30000);
