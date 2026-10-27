import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createDormDatabase,testUid} from '../helpers/dormspace-db';
import {DEFAULT_LOOK,profileLookInput} from '../../lib/profile-space';
import {applyCornerArtwork} from '../../lib/profile-corner-artwork';
it('shows saved card stickers to classmates while preserving all votes and joined students',async()=>{
 const db=await createDormDatabase(3);
 const corner=async(student:number,action='read',username:string|null=null,payload={})=>(await db.query<any>('SELECT public.socialu_profile_corner($1,$2,$3,$4) AS result',[testUid(student),action,username,JSON.stringify(payload)])).rows[0].result;
 try{
  for(const name of ['20261027030000_profile_spaces','20261027040000_profile_corners','20261027050000_profile_decoration_library'])await db.exec(readFileSync(`supabase/migrations/${name}.sql`,'utf8'));
  await corner(1,'create_poll',null,{question:'Movie night?',options:['Comedy','Action'],endsAt:new Date(Date.now()+86400000).toISOString()});
  let before=await corner(1);await corner(2,'vote','dorm1',{id:before.poll.id,choice:1});
  await corner(1,'create_plan',null,{title:'Watch movies',location:'Student center',startsAt:new Date(Date.now()+86400000).toISOString(),capacity:4});
  before=await corner(1);await corner(2,'join_plan','dorm1',{id:before.plan.id});before=await corner(1);
  const look=profileLookInput(applyCornerArtwork(applyCornerArtwork(DEFAULT_LOOK,{card:'poll',stickers:['camera','gamepad']}),{card:'plan',sticker:'camera'}));
  await db.query('SELECT public.socialu_profile_space($1,$2,$3,$4)',[testUid(1),'save_look',null,JSON.stringify(look)]);
  expect((await db.query<any>('SELECT public.socialu_profile_space($1,$2,$3) AS result',[testUid(2),'read','dorm1'])).rows[0].result.look).toEqual(look);
  expect(await corner(1)).toEqual(before);
 }finally{await db.close();}
});
