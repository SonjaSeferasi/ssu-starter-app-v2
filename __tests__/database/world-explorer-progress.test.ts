import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createDormDatabase,testUid} from '../helpers/dormspace-db';

it('persists a private passport through the real restricted bridge, dedupes runs and merges without erasing best results',async()=>{
 const db=await createDormDatabase(2);
 const call=async(student:number,action:string,payload={})=>(await db.query<{data:any}>('SELECT public.socialu_world_explorer($1,$2,$3::jsonb) AS data',[action,testUid(student),JSON.stringify(payload)])).rows[0].data;
 const runId='10000000-0000-4000-8000-000000000001';
 const result={code:'JPN',runId,completed:true,coins:18,stars:2,elapsedMs:90000,discoveryFound:true};
 try{
  await db.exec(readFileSync('supabase/migrations/20261027000200_world_explorer_progress.sql','utf8'));
  const count=(await db.query<{total:number}>('SELECT count(*)::INTEGER AS total FROM socialu.world_explorer_destinations')).rows[0].total;expect(count).toBe(194);
  await db.exec('SET ROLE service_role');expect((await call(1,'read')).countries).toEqual({});
  const first=await call(1,'result',result);expect(first.countries.JPN).toMatchObject({completed:true,bestCoins:18,starsEarned:2,attempts:1,discoveredFactIds:['mount-fuji'],bestTimeMs:90000});
  const duplicate=await call(1,'result',{...result,coins:30,stars:3});expect(duplicate).toEqual(first);
  const failed=await call(1,'result',{...result,runId:'10000000-0000-4000-8000-000000000002',completed:false,coins:3,stars:0,elapsedMs:0,discoveryFound:false});expect(failed.countries.JPN).toMatchObject({completed:true,bestCoins:18,starsEarned:2,attempts:2,bestTimeMs:90000});
  const merged=await call(1,'merge',{version:1,countries:{JPN:{completed:true,bestCoins:12,starsEarned:3,attempts:1,discoveredFactIds:[],bestTimeMs:80000}}});expect(merged.countries.JPN).toMatchObject({bestCoins:18,starsEarned:3,attempts:2,discoveredFactIds:['mount-fuji'],bestTimeMs:80000});
  expect((await call(1,'merge',{version:1,countries:{JPN:{completed:false,bestCoins:1,starsEarned:0,attempts:0,discoveredFactIds:[]}}})).countries.JPN).toEqual(merged.countries.JPN);
  expect((await call(2,'read')).countries).toEqual({});expect((await call(2,'result',result)).countries.JPN.attempts).toBe(1);
  await expect(call(1,'result',{...result,code:'VAT',runId:'10000000-0000-4000-8000-000000000003'})).rejects.toThrow();
  await expect(call(1,'result',{...result,code:'USA'})).rejects.toThrow();
  await expect(call(1,'result',{...result,stars:4})).rejects.toThrow();
  await expect(call(1,'merge',{version:1,countries:{JPN:{completed:true,bestCoins:1,starsEarned:1,attempts:1,discoveredFactIds:['unverified-fact']}}})).rejects.toThrow();
  await db.exec('SET ROLE authenticated');await expect(call(1,'read')).rejects.toThrow();await expect(db.query('SELECT * FROM socialu.world_explorer_progress')).rejects.toThrow();
 }finally{await db.close();}
},30000);
