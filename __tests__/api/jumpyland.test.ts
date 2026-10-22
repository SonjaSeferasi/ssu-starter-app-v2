import { beforeEach, describe, expect, it, vi } from 'vitest';
const {verify,rpc}=vi.hoisted(()=>({verify:vi.fn(),rpc:vi.fn()}));
vi.mock('../../lib/socialu-account',async()=>{const original=await vi.importActual('../../lib/socialu-account');return {...original,verifiedUser:verify,accountClient:()=>({rpc})};});
import {GET,POST} from '../../app/api/jumpyland/route';
import {courses,GRAVITY,JUMP_SPEED,RUN_SPEED,horizontalVelocity,levelAvailable} from '../../components/jumpyland/levels';
const id='11111111-1111-4111-8111-111111111111';
function req(body?:unknown){return new Request('http://localhost/api/jumpyland',{method:body?'POST':'GET',...(body?{body:JSON.stringify(body)}:{})});}
beforeEach(()=>{vi.resetAllMocks();verify.mockResolvedValue({id:'verified-user'});rpc.mockResolvedValue({data:{completed:[]},error:null});});
describe('Jumpyland account API',()=>{
 it('selects the acting account from verified identity, ignoring caller identity',async()=>{expect((await POST(req({action:'start',attemptId:id,level:1,timeZone:'America/New_York',student_id:'victim'}))).status).toBe(200);expect(rpc).toHaveBeenCalledWith('socialu_jumpyland',{p_auth_id:'verified-user',p_action:'start',p_attempt:id,p_level:1,p_zone:'America/New_York'});});
 it('does not read progress for an unauthenticated caller',async()=>{verify.mockRejectedValue(new Error('No session'));expect((await GET(req())).status).toBe(503);expect(rpc).not.toHaveBeenCalled();});
 it.each([{action:'start',attemptId:id,level:4,timeZone:'UTC'},{action:'start',attemptId:'bad',level:1,timeZone:'UTC'},{action:'complete',attemptId:id,coins:9},{action:'complete',attemptId:id,coins:-1},{action:'complete',attemptId:id,coins:1.5}])('rejects invalid requests before storage: %j',async body=>{expect((await POST(req(body))).status).toBe(400);expect(rpc).not.toHaveBeenCalled();});
 it('reports missing migration rather than claiming progress is saved',async()=>{rpc.mockResolvedValue({data:null,error:{code:'PGRST202'}});const r=await GET(req());expect(r.status).toBe(503);expect((await r.json()).code).toBe('JUMPYLAND_SETUP_REQUIRED');});
 it('does not let a result overwrite another account attempt',async()=>{rpc.mockResolvedValue({data:null,error:{code:'42501'}});expect((await POST(req({action:'complete',attemptId:id,coins:2}))).status).toBe(403);});
});
describe('Authored courses are traversable with the actual movement constants',()=>{
 it('contains exactly three sequential courses and bounded coin sets',()=>{expect(courses.map(c=>c.number)).toEqual([1,2,3]);expect(courses.map(c=>c.coins.length)).toEqual([6,7,8]);});
 it('every forward platform can be reached by one grounded jump',()=>{
   for(const course of courses)for(let i=1;i<course.platforms.length;i++){
     const a=course.platforms[i-1],b=course.platforms[i];
     const rise=a.y-b.y;
     const discriminant=JUMP_SPEED**2-2*GRAVITY*rise;
     expect(discriminant,`level ${course.number}, platform ${i} height`).toBeGreaterThan(0);
     const landingTime=(JUMP_SPEED+Math.sqrt(discriminant))/GRAVITY;
     expect(b.x-(a.x+a.width)+30,`level ${course.number}, platform ${i} gap`).toBeLessThan(RUN_SPEED*landingTime);
   }
 });
 it('requires prior completion, supports replay and neutral/opposing inputs',()=>{expect(levelAvailable(2,[])).toBe(false);expect(levelAvailable(3,[1])).toBe(false);expect(levelAvailable(2,[1])).toBe(true);expect(levelAvailable(1,[1,2,3])).toBe(true);expect(horizontalVelocity(true,true)).toBe(0);expect(horizontalVelocity(false,false)).toBe(0);expect(horizontalVelocity(true,false)).toBe(-RUN_SPEED);});
});
