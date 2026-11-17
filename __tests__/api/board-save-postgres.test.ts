import {afterAll,beforeAll,beforeEach,expect,it,vi} from 'vitest';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import type {PGlite} from '@electric-sql/pglite';
import {createDormDatabase,testUid} from '../helpers/dormspace-db';
import {DEFAULT_LOOK} from '../../lib/profile-space';
const {client}=vi.hoisted(()=>({client:vi.fn()}));
vi.mock('../../lib/supabase',()=>({getSupabaseClient:client}));
import {PATCH} from '../../app/api/profiles/space/route';
let db:PGlite,mode='normal';const calls:{fn:string;args:any}[]=[],checks:string[]=[];
const token=(n:number)=>'e30.'+Buffer.from(JSON.stringify({sub:testUid(n),iat:1791849600,session_id:`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`})).toString('base64url')+'.test';
const board={items:[{id:'api-note',kind:'note',text:'API and PostgreSQL agree',color:'pink',x:12.75,y:22.125,width:31,rotation:-6}]};
const request=(n:number|null,value:any=board,extra:any={})=>new Request('http://localhost/api/profiles/space?username=dorm1',{method:'PATCH',headers:{'Content-Type':'application/json',...(n===null?{}:{Authorization:'Bearer '+token(n)})},body:JSON.stringify({field:'board',value,...extra})});
const reverse=(value:any):any=>Array.isArray(value)?value.map(reverse):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reverse(v)])):value;
const stored=async(n:number)=>(await db.query<any>('SELECT look FROM socialu.profile_spaces WHERE student_id=$1',[n])).rows[0]?.look;
beforeAll(async()=>{
 db=await createDormDatabase(2);
 for(const f of ['20261027030000_profile_spaces.sql','20261027050000_profile_decoration_library.sql','20261027080000_profile_memories.sql','20261116210000_atomic_profile_board_save.sql','20261117020000_board_photo_ownership.sql'])await db.exec(readFileSync('supabase/migrations/'+f,'utf8'));
 await db.query('INSERT INTO auth.sessions VALUES($1,$2,now()),($3,$4,now())',['10000000-0000-4000-8000-000000000001',testUid(1),'10000000-0000-4000-8000-000000000002',testUid(2)]);
},30000);
beforeEach(async()=>{
 mode='normal';calls.length=0;vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','fixture-service');await db.exec('DELETE FROM socialu.profile_spaces');
 await db.query('SELECT public.socialu_profile_space($1,$2,NULL,$3)',[testUid(1),'save_look',JSON.stringify({...DEFAULT_LOOK,hometown:'Original'})]);
 client.mockReturnValue({auth:{getUser:async(t:string)=>{const n=[1,2].find(n=>t===token(n));return {data:{user:n?{id:testUid(n),email_confirmed_at:'2026-11-01T12:00:00Z'}:null},error:n?null:{message:'Invalid fixture token'}};}},rpc:async(fn:string,args:any)=>{
  calls.push({fn,args});
  if(mode==='missing'&&fn==='socialu_save_profile_board')return {data:null,error:{code:'PGRST202'}};
  try{
   if(mode==='compete-reorder'&&fn==='socialu_save_profile_board')await db.query('SELECT public.socialu_profile_space($1,$2,NULL,$3)',[testUid(1),'save_look',JSON.stringify({...DEFAULT_LOOK,hometown:'Concurrent update',theme:'midnight'})]);
   const entries=Object.entries(args);const result=await db.query<any>(`SELECT public.${fn}(${entries.map(([k],i)=>`${k} => $${i+1}`).join(',')}) AS r`,entries.map(([,v])=>v&&typeof v==='object'?JSON.stringify(v):v));
   let data=result.rows[0].r;
   if(fn==='socialu_profile_space'&&args.p_action==='read'){
    if(mode==='compete-reorder')data=reverse(data);
    if(mode==='unconfirmed')data={...data,look:{...data.look,board:{items:[]}}};
   }
   return {data,error:null};
  }catch(e:any){return {data:null,error:{code:e.code,message:e.message}};}
 }});
});
afterAll(async()=>{vi.unstubAllEnvs();await db?.close();if(process.env.BOARD_API_EVIDENCE_DIR){mkdirSync(process.env.BOARD_API_EVIDENCE_DIR,{recursive:true});writeFileSync(process.env.BOARD_API_EVIDENCE_DIR+'/api-postgres-checks.json',JSON.stringify({environment:'Actual PATCH handler and PostgreSQL RPCs in disposable PGlite; Auth provider fixture; injected confirmation/order/unavailable faults explicitly labeled',checks},null,2));}});
it('merges the verified owner board with a concurrent look write and accepts reordered JSONB confirmation',async()=>{
 mode='compete-reorder';const r=await PATCH(request(1));expect(r.status).toBe(200);const data=await r.json();expect(data.look.board).toEqual(board);expect(data.look.hometown).toBe('Concurrent update');expect(data.look.theme).toBe('midnight');expect((await stored(1)).board).toEqual(board);
 expect(calls.find(c=>c.fn==='socialu_save_profile_board')?.args.p_auth_id).toBe(testUid(1));checks.push('Concurrent look fields preserved; exact board confirmed despite JSONB key order');
});
it('ignores forged owner fields and changes only the authenticated caller board',async()=>{
 const before=await stored(1);const r=await PATCH(request(2,board,{username:'dorm1',auth_id:testUid(1),studentId:1}));expect(r.status).toBe(200);expect(await stored(1)).toEqual(before);expect((await stored(2)).board).toEqual(board);checks.push('Forged owner fields cannot change another student board');
});
it('rejects missing authentication before database access',async()=>{
 expect((await PATCH(request(null))).status).toBe(401);expect(calls).toEqual([]);checks.push('Unauthenticated save rejected before RPC');
});
it('rejects out-of-bounds and duplicate-ID inputs without changing PostgreSQL',async()=>{
 const before=await stored(1);
 for(const bad of [{items:[{...board.items[0],x:99}]},{items:[board.items[0],board.items[0]]}])expect((await PATCH(request(1,bad))).status).toBe(400);
 expect(calls.some(c=>c.fn==='socialu_save_profile_board')).toBe(false);expect(await stored(1)).toEqual(before);checks.push('Invalid geometry/duplicate IDs rejected without a write');
});
it('never reports success when an injected confirmation omits the saved board',async()=>{
 mode='unconfirmed';const r=await PATCH(request(1));expect(r.status).toBe(503);expect((await r.json()).error).toContain('could not be confirmed');expect((await stored(1)).board).toEqual(board);expect(calls.filter(c=>c.fn==='socialu_save_profile_board')).toHaveLength(1);checks.push('Unconfirmed response produces 503, not false success or a second write');
});
it('fails in preview mode without falling back to a stale full-look save',async()=>{
 mode='missing';const before=await stored(1);const r=await PATCH(request(1));expect(r.status).toBe(503);expect((await r.json()).code).toBe('SPACE_PREVIEW');expect(await stored(1)).toEqual(before);expect(calls.some(c=>c.fn==='socialu_profile_space'&&c.args.p_action==='save_look')).toBe(false);checks.push('Unavailable atomic RPC safely returns preview with no legacy overwrite fallback');
});
