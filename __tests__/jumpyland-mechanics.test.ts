import {costumes,emptyLoadout,runCostume} from '../components/jumpyland/wardrobe';
import {describe,it,expect} from 'vitest';
import {collectPower,freshPowers,takeHit,canCollectPower,enemyDifficulty,POWER_DURATION} from '../components/jumpyland/powers';
import {courses,GRAVITY,JUMP_SPEED,RUN_SPEED} from '../components/jumpyland/levels';
import {surfaceY} from '../components/jumpyland/terrain';
describe('Jumpyland run-scoped powers and difficulty',()=>{
 it('absorbs one hit, grants a short grace period, then exposes the player again',()=>{
   const shield=collectPower(freshPowers(),'shield',0),hit=takeHit(shield,100);
   expect(hit.survived).toBe(true);expect(hit.state.shield).toBe(false);
   expect(takeHit(hit.state,300).survived).toBe(true);
   expect(takeHit(hit.state,1600).survived).toBe(false);
 });
 it('times power expiry against the run clock, refreshes duration and resets on retry',()=>{
   let state=collectPower(freshPowers(),'doubleJump',2000);
   state=collectPower(state,'rapid',3000);
   expect(state.doubleJumpUntil).toBe(2000+POWER_DURATION);expect(state.rapidUntil).toBe(3000+POWER_DURATION);
   expect(collectPower(state,'rapid',8000).rapidUntil).toBe(8000+POWER_DURATION);
   expect(freshPowers()).toEqual({shield:false,doubleJumpUntil:0,rapidUntil:0,invulnerableUntil:0,nimbusUntil:0,saiyanUntil:0,flowerUntil:0,starUntil:0,rasenganUntil:0,chidoriUntil:0,cloneUntil:0,clones:0});
 });
 it('raises attack speed gradually while preserving a visible reaction window',()=>{
   const a=enemyDifficulty(1),b=enemyDifficulty(2),c=enemyDifficulty(3);
   expect(a.projectileSpeed).toBeLessThan(b.projectileSpeed);expect(b.projectileSpeed).toBeLessThan(c.projectileSpeed);
   expect(a.cooldown).toBeGreaterThan(c.cooldown);expect(c.windup).toBeGreaterThanOrEqual(700);
 });
 it('places every power above a real ledge reachable by an ordinary jump or drop',()=>{
   for(const course of courses){
     expect(new Set(course.powers.map(p=>p.kind)).size).toBeGreaterThanOrEqual(3);
     course.ledges.forEach((p,index)=>{
       const reachable=[...course.platforms,...course.ledges].some(previous=>{
         if(previous===p)return false;
         const rise=previous.y-p.y,disc=JUMP_SPEED**2-2*GRAVITY*rise;
         return disc>0&&p.x>previous.x&&p.x-(previous.x+previous.width)+30<RUN_SPEED*(JUMP_SPEED+Math.sqrt(disc))/GRAVITY;
       });
       expect(reachable).toBe(true);
       expect(course.powers.some(power=>power.x>=p.x&&power.x<=p.x+p.width&&power.y<p.y)).toBe(true);
     });
   }
 });
 it('uses a smooth terrain profile with unchanged takeoff edges and matching heights',()=>{
   for(const course of courses)for(const p of [...course.platforms,...course.ledges]){
     expect(surfaceY(p,p.x)).toBe(p.y);expect(surfaceY(p,p.x+p.width)).toBeCloseTo(p.y);
     expect(surfaceY(p,p.x+p.width/2)).toBeLessThan(p.y-6);
     for(let x=p.x+1;x<p.x+p.width;x++)expect(Math.abs(surfaceY(p,x)-surfaceY(p,x-1))).toBeLessThan(1);
   }
 });
});

describe('Run-only wardrobe selection',()=>{
 it('offers distinct themed costumes without replacing the saved appearance',()=>{
   expect(new Set(costumes.map(c=>c.id)).size).toBe(8);
   expect(costumes.filter(c=>c.world===1).map(c=>c.name)).toEqual(['Mario','Luigi']);
   expect(costumes.filter(c=>c.world===2).map(c=>c.name)).toEqual(['Goku','Vegeta','Piccolo']);
   expect(costumes.filter(c=>c.world===3).map(c=>c.name)).toEqual(['Naruto','Sasuke','Kakashi']);
   expect(runCostume({...emptyLoadout,costume:'naruto'},1)).toBeUndefined();
   expect(runCostume({...emptyLoadout,costume:'naruto'},3)?.name).toBe('Naruto');
   expect(emptyLoadout).toEqual({costume:null,power:null,shield:false});
 });
});

describe('Dragon World rare abilities',()=>{
 it('gates Super Saiyan behind Dragon Balls and only places the rare pickups in world two',()=>{
   expect(canCollectPower('saiyan',2,2)).toBe(false);expect(canCollectPower('saiyan',2,3)).toBe(true);expect(canCollectPower('saiyan',1,6)).toBe(false);
   expect(courses[1].powers.filter(p=>['saiyan','nimbus'].includes(p.kind)).map(p=>p.kind)).toEqual(['nimbus','saiyan']);
   expect(courses.filter(c=>c.number!==2).flatMap(c=>c.powers).some(p=>['saiyan','nimbus'].includes(p.kind))).toBe(false);
 });
 it('limits flight and the golden aura to the run clock and ends protection on expiry',()=>{
   let p=collectPower(freshPowers(),'nimbus',1000);p=collectPower(p,'saiyan',2000);
   expect(p.nimbusUntil).toBe(13000);expect(p.saiyanUntil).toBe(17000);expect(takeHit(p,16999).survived).toBe(true);expect(takeHit(p,17000).survived).toBe(false);
 });
});


describe('Optional moving terrain routes',()=>{
 it('replaces existing upper ledges without adding another platform above the main path',async()=>{
  const {movingLandings,landingPosition}=await import('../components/jumpyland/platform-motion');
  for(const c of courses){const rides=movingLandings(c);expect(rides).toHaveLength(3);expect(new Set(rides.map(r=>r.x)).size).toBe(3);
   for(const ride of rides){expect(c.ledges.some(p=>p.x===ride.x&&p.y===ride.y)).toBe(true);for(let t=0;t<ride.period;t+=100){const at=landingPosition(ride,t);expect(Math.abs(at.y-ride.y)).toBeLessThanOrEqual(14);expect(Math.abs(at.x-ride.x)).toBeLessThanOrEqual(24);}}
  }
 });
 it('returns the same position for a paused clock and loops without a jump',async()=>{
  const {movingLandings,landingPosition}=await import('../components/jumpyland/platform-motion');
  for(const p of movingLandings(courses[0])){expect(landingPosition(p,500)).toEqual(landingPosition(p,500));expect(landingPosition(p,0).x).toBeCloseTo(landingPosition(p,p.period).x);expect(landingPosition(p,0).y).toBeCloseTo(landingPosition(p,p.period).y);}
 });
});


describe('Theme-specific abilities and enemies',()=>{
 it('keeps themed pickups exclusive to their world',()=>{
  for(const [world,kinds] of [[1,['flower','star']],[3,['rasengan','chidori','clone']]] as const){
   for(const kind of kinds){expect(courses[world-1].powers.some(p=>p.kind===kind)).toBe(true);expect(canCollectPower(kind,world,0)).toBe(true);expect(canCollectPower(kind,2,8)).toBe(false);}
  }
 });
 it('expires Star protection and consumes two clones one hit at a time with collision grace',()=>{
  const star=collectPower(freshPowers(),'star',500);expect(takeHit(star,10499).survived).toBe(true);expect(takeHit(star,10500).survived).toBe(false);
  const clone=takeHit(collectPower(freshPowers(),'clone',0),200);expect(clone.survived).toBe(true);expect(clone.state.clones).toBe(1);expect(takeHit(clone.state,300).state.clones).toBe(1);const second=takeHit(clone.state,1800);expect(second.survived).toBe(true);expect(second.state.clones).toBe(0);expect(takeHit(second.state,3400).survived).toBe(false);
 });
 it('uses short-range Chidori, rotating Rasengan, bouncing fireball and distinct enemy rosters',async()=>{
  const {weaponFor,enemyKind}=await import('../components/jumpyland/combat');
  const base=freshPowers(),chi=weaponFor(3,collectPower(base,'chidori',0),1),ras=weaponFor(3,collectPower(base,'rasengan',0),1);
  expect(chi.life*chi.speed/1000).toBeLessThan(300);expect(chi.pierce).toBe(true);expect(ras.key).toBe('rasengan');expect(weaponFor(1,collectPower(base,'flower',0),1).key).toBe('fireball');expect(weaponFor(3,base,1).key).toBe('shuriken');
  expect(new Set([0,1,2].map(i=>enemyKind(1,i))).size).toBe(3);expect(enemyKind(2,0)).not.toBe(enemyKind(2,1));expect(new Set([0,1,2].map(i=>enemyKind(3,i))).size).toBe(3);
 });
});
