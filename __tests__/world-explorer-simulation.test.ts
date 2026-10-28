import {describe,it,expect} from 'vitest';
import {levelAvailability,levelDefinitionFor,validateLevel} from '../lib/world-explorer/level-manifest';
import {LevelSimulation,FIXED_STEP,cameraFrame} from '../lib/world-explorer/simulation';
import type {LevelDefinition} from '../lib/world-explorer/game-types';

function fixture(motion:null|'horizontal'|'vertical'=null):LevelDefinition{
 const level=levelDefinitionFor('JPN');level.platforms=level.platforms.slice(0,2);level.platforms[0]={...level.platforms[0],x:0,y:0,width:8,motion,amplitude:motion?.4:0,period:4};level.platforms[1]={...level.platforms[1],x:10,y:0,width:8,motion:null,amplitude:0};level.spawn={platformId:level.platforms[0].id,offset:4};level.coins=[{id:'coin-a',platformId:level.platforms[0].id,offset:4,height:1.1}];level.stars=[1,2,3].map((n)=>({id:'star-'+n,platformId:level.platforms[1].id,offset:n,height:1.1}));level.checkpoints=[{id:'check',platformId:level.platforms[1].id,offset:1}];level.discovery={id:'discover',platformId:level.platforms[1].id,offset:5,factId:'mount-fuji'};level.finish={platformId:level.platforms[1].id,offset:7};return validateLevel(level);
}

describe('Japan authored level pipeline and deterministic physics',()=>{
 it('loads a validated Japan prototype with real playable requirements and honest availability',()=>{
  const level=levelDefinitionFor('JP');expect(level.id).toBe('jp-level-01');expect(level.countryId).toBe('JP');expect(level.platforms.length).toBeGreaterThanOrEqual(6);expect(level.coins).toHaveLength(30);expect(level.stars).toHaveLength(3);expect(level.checkpoints.length).toBeGreaterThan(0);expect(level.platforms.some(p=>p.type==='wooden-bridge')).toBe(true);expect(level.platforms.some(p=>p.motion!==null)).toBe(true);expect(level.platforms.at(-1)!.x+level.platforms.at(-1)!.width).toBeGreaterThan(120);
  expect(levelAvailability('JPN')).toMatchObject({countryId:'JP',levelId:'jp-level-01',stage:'prototype',releaseReady:false,visualReviewed:false});expect(levelAvailability('EG')).toMatchObject({countryId:'EG',levelId:'eg-level-01',stage:'preview',releaseReady:false});expect(levelAvailability('ANTARCTICA')).toMatchObject({levelId:'antarctica-expedition',countryId:'ANTARCTICA'});expect(levelAvailability('ZZ')).toBeUndefined();
 });
 it('rejects missing platform references, duplicate IDs, invalid country identity and unsafe geometry before mounting',()=>{
  const level=levelDefinitionFor('JPN');for(const mutate of [(copy:LevelDefinition)=>{copy.stars[0].platformId='missing';},(copy:LevelDefinition)=>{copy.platforms[1].id=copy.platforms[0].id;},(copy:LevelDefinition)=>{copy.countryId='EG';},(copy:LevelDefinition)=>{copy.platforms[0].width=NaN;}]){const copy=structuredClone(level);mutate(copy);expect(()=>validateLevel(copy)).toThrow();}
 });
 it('reaches the actual finish through input-driven walking and jumping, including moving platforms and a paused discovery',()=>{
  for(const difficulty of [1,4] as const){
   const simulation=new LevelSimulation(levelDefinitionFor('JPN',difficulty));let discoveries=0,landedMoving=false,checkpoint=false;
   for(let frame=0;frame<12000&&simulation.state.status!=='completed'&&simulation.state.status!=='failed';frame++){
    if(simulation.state.status==='discovery'){const before=simulation.state.elapsedSeconds;simulation.advance(2);expect(simulation.state.elapsedSeconds).toBe(before);discoveries++;simulation.resume();}
    const current=simulation.platforms.find(p=>p.id===simulation.state.standing),last=simulation.level.platforms.at(-1)!;
    if(current?.motion)landedMoving=true;
    const jump=!!current&&current.id!==last.id&&simulation.state.grounded&&simulation.state.x>current.x+current.width-.85;
    simulation.setInput({left:false,right:true,jump});simulation.advance(FIXED_STEP);checkpoint ||=simulation.state.checkpointId!==null;
   }
   expect(simulation.state.status,`difficulty ${difficulty}`).toBe('completed');expect(simulation.state.hearts).toBe(3);expect(simulation.state.coins).toBeGreaterThan(10);expect(simulation.state.stars).toBeGreaterThanOrEqual(1);expect(discoveries).toBe(1);expect(checkpoint).toBe(true);expect(landedMoving).toBe(true);expect(simulation.progress()).toBe(100);expect(simulation.state.z).toBe(0);
  }
 });
 it('carries a grounded player in both moving-platform axes and is independent of render-frame partitioning',()=>{
  for(const motion of ['horizontal','vertical'] as const){const simulation=new LevelSimulation(fixture(motion)),initialX=simulation.state.x;for(let i=0;i<30;i++)simulation.advance(FIXED_STEP);expect(simulation.state.grounded).toBe(true);if(motion==='horizontal')expect(simulation.state.x-initialX).toBeCloseTo(simulation.platforms[0].x,6);else expect(simulation.state.y).toBeCloseTo(simulation.platforms[0].y,6);}
  const a=new LevelSimulation(fixture()),b=new LevelSimulation(fixture());a.setInput({left:false,right:false,jump:true});b.setInput({left:false,right:false,jump:true});for(let i=0;i<120;i++)a.advance(1/60);for(let i=0;i<60;i++)b.advance(1/30);expect(a.state).toEqual(b.state);expect(a.state.y).toBe(0);expect(a.state.grounded).toBe(true);
 });
 it('does not double collect on repeated overlap and preserves earned items through a fall and respawn',()=>{
  const simulation=new LevelSimulation(fixture());expect(simulation.advance(FIXED_STEP).filter(e=>e.type==='coin')).toHaveLength(1);for(let i=0;i<20;i++)simulation.advance(FIXED_STEP);expect(simulation.state.coins).toBe(1);
  simulation.setInput({left:true,right:false,jump:false});let recovered=false;for(let i=0;i<300;i++){const events=simulation.advance(FIXED_STEP);if(events.some(e=>e.type==='respawn')){recovered=true;break;}}
  expect(recovered).toBe(true);expect(simulation.state.hearts).toBe(2);expect(simulation.state.x).toBeCloseTo(4);expect(simulation.state.coins).toBe(1);expect(simulation.collectedCoins.has('coin-a')).toBe(true);
 });
 it('allows coyote jumps just after leaving an edge and buffers a new jump immediately before landing',()=>{
  const simulation=new LevelSimulation(fixture());simulation.setInput({left:false,right:true,jump:false});for(let i=0;i<120&&simulation.state.grounded;i++)simulation.advance(FIXED_STEP);expect(simulation.state.grounded).toBe(false);simulation.setInput({left:false,right:true,jump:true});simulation.advance(FIXED_STEP);expect(simulation.state.vy).toBeGreaterThan(0);
  const landing=new LevelSimulation(fixture());landing.setInput({left:false,right:false,jump:true});landing.advance(FIXED_STEP);landing.setInput({left:false,right:false,jump:false});let buffered=false,relaunched=false;
  for(let i=0;i<120;i++){if(!buffered&&landing.state.vy<0&&landing.state.y<.2){landing.setInput({left:false,right:false,jump:true});buffered=true;}landing.advance(FIXED_STEP);if(buffered&&landing.state.vy>1){relaunched=true;break;}}
  expect(buffered).toBe(true);expect(relaunched).toBe(true);
 });
 it('freezes the run clock and clears held controls while paused, and clamps the side camera to course bounds',()=>{
  const simulation=new LevelSimulation(fixture());simulation.setInput({left:false,right:true,jump:false});simulation.advance(.2);const before=structuredClone(simulation.state);simulation.pause();simulation.advance(10);expect(simulation.state.x).toBe(before.x);expect(simulation.state.elapsedSeconds).toBe(before.elapsedSeconds);simulation.resume();simulation.advance(FIXED_STEP);expect(simulation.state.vx).toBeLessThan(before.vx);
  const level=levelDefinitionFor('JPN'),first=cameraFrame(level,-100,-30,1.8),last=cameraFrame(level,10000,30,1.8);expect(first.x).toBeGreaterThanOrEqual(5);expect(last.x).toBeLessThan(level.platforms.at(-1)!.x+level.platforms.at(-1)!.width);expect(first.y).toBeGreaterThan(0);expect(last.y).toBeLessThan(6);
 });
 it('collects all three optional Japan stars through controlled walking and vertical jumps, then finishes',()=>{
  const simulation=new LevelSimulation(levelDefinitionFor('JPN'));let optional:string|null=null,jumped=false;
  for(let frame=0;frame<16000&&simulation.state.status!=='completed'&&simulation.state.status!=='failed';frame++){
   if(simulation.state.status==='discovery')simulation.resume();
   const s=simulation.state,current=simulation.platforms.find(p=>p.id===s.standing),last=simulation.platforms.at(-1)!;
   if(!optional&&s.grounded){const star=simulation.level.stars.find(item=>item.height>1.6&&item.platformId===s.standing&&!simulation.collectedStars.has(item.id));if(star&&s.x>simulation.position(star).x-1.15){optional=star.id;jumped=false;}}
   if(optional){const shouldJump=s.grounded&&!jumped&&Math.abs(s.vx)<.1;if(shouldJump)jumped=true;simulation.setInput({left:false,right:false,jump:shouldJump});if(jumped&&s.grounded&&simulation.collectedStars.has(optional)){optional=null;jumped=false;}}
   else simulation.setInput({left:false,right:true,jump:!!current&&current.id!==last.id&&s.grounded&&s.x>current.x+current.width-.85});
   simulation.advance(FIXED_STEP);
  }
  expect(simulation.state.status).toBe('completed');expect(simulation.state.stars).toBe(3);expect(simulation.state.hearts).toBe(3);expect(simulation.collectedStars.size).toBe(3);
 });
 it('blocks a raised platform side wall, allows jumping onto it and stops after three hazard contacts',()=>{
  const level=fixture();level.platforms[1].x=8;level.platforms[1].y=1;const simulation=new LevelSimulation(level);simulation.setInput({left:false,right:true,jump:false});for(let i=0;i<100;i++)simulation.advance(FIXED_STEP);expect(simulation.state.x).toBeCloseTo(7.8,5);expect(simulation.state.y).toBe(0);
  simulation.setInput({left:false,right:true,jump:true});for(let i=0;i<60;i++)simulation.advance(FIXED_STEP);expect(simulation.state.x).toBeGreaterThan(8);expect(simulation.state.y).toBeGreaterThanOrEqual(1);expect(simulation.state.hearts).toBe(3);
  const dangerous=fixture();dangerous.hazards=[{id:'test-rock-hazard',x:3.5,y:0,width:1,height:1.2}];const hazardRun=new LevelSimulation(dangerous);for(let i=0;i<600&&hazardRun.state.status!=='failed';i++)hazardRun.advance(FIXED_STEP);expect(hazardRun.state.status).toBe('failed');expect(hazardRun.state.hearts).toBe(0);
 });
 it('returns to an activated checkpoint without erasing collected stars',()=>{
  const level=fixture();level.spawn={platformId:level.platforms[1].id,offset:3};level.finish={platformId:level.platforms[0].id,offset:7};level.discovery.platformId=level.platforms[0].id;const simulation=new LevelSimulation(level);simulation.advance(FIXED_STEP);expect(simulation.state.checkpointId).toBe('check');expect(simulation.collectedStars.has('star-3')).toBe(true);
  simulation.setInput({left:false,right:true,jump:false});let recovered=false;for(let i=0;i<600;i++){if(simulation.advance(FIXED_STEP).some(e=>e.type==='respawn')){recovered=true;break;}}
  expect(recovered).toBe(true);expect(simulation.state.x).toBeCloseTo(11);expect(simulation.state.hearts).toBe(2);expect(simulation.collectedStars.has('star-3')).toBe(true);
 });
});
