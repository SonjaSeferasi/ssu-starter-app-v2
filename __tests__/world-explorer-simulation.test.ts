import {describe,it,expect} from 'vitest';
import {levelAvailability,levelDefinitionFor,validateLevel} from '../lib/world-explorer/level-manifest';
import {LevelSimulation,FIXED_STEP,cameraFrame} from '../lib/world-explorer/simulation';
import {platformSurfaceY} from '../lib/world-explorer/platform-surface';
import type {LevelDefinition} from '../lib/world-explorer/game-types';

function fixture(motion:null|'horizontal'|'vertical'=null):LevelDefinition{
 const level=levelDefinitionFor('JPN');delete level.mainRoute;delete level.upperRoute;level.enemies=[];level.discoveryBlocks=[];level.platforms=level.platforms.slice(0,2);level.platforms[0]={...level.platforms[0],x:0,y:0,width:8,motion,amplitude:motion?.4:0,period:4};level.platforms[1]={...level.platforms[1],x:10,y:0,width:8,type:'stone',sagDepth:undefined,motion:null,amplitude:0};level.spawn={platformId:level.platforms[0].id,offset:4};level.coins=[{id:'coin-a',platformId:level.platforms[0].id,offset:4,height:1.1}];level.stars=[1,2,3].map((n)=>({id:'star-'+n,platformId:level.platforms[1].id,offset:n,height:1.1}));level.checkpoints=[{id:'check',platformId:level.platforms[1].id,offset:1}];level.discovery={id:'discover',platformId:level.platforms[1].id,offset:5,factId:'mount-fuji'};level.finish={platformId:level.platforms[1].id,offset:7};return validateLevel(level);
}

function driveJapan(route:'main'|'upper',difficulty:1|2|3|4=1,collectLaterStars=false){
 const simulation=new LevelSimulation(levelDefinitionFor('JPN',difficulty)),path=route==='main'?simulation.level.mainRoute!:[...simulation.level.upperRoute!,...simulation.level.mainRoute!.slice(4)],visited=new Set<string>(),events:ReturnType<LevelSimulation['advance']>=[],checkpointSnapshots:LevelSimulation[]=[],clearedEnemies=new Set<string>();let discoveries=0,optional:string|null=null,jumped=false,lastStanding:string|null=null;
 for(let frame=0;frame<16000&&!['completed','failed'].includes(simulation.state.status);frame++){
  if(simulation.state.status==='discovery'){const before=simulation.state.elapsedSeconds;simulation.advance(2);expect(simulation.state.elapsedSeconds).toBe(before);discoveries++;simulation.resume();}
  const s=simulation.state,current=simulation.platforms.find(platform=>platform.id===s.standing);if(current){visited.add(current.id);lastStanding=current.id;}
  if(collectLaterStars&&!optional&&s.grounded){const star=simulation.level.stars.find(item=>item.height>1.6&&item.platformId===s.standing&&!simulation.collectedStars.has(item.id));if(star&&s.x>simulation.position(star).x-1.15){optional=star.id;jumped=false;}}
  if(optional){
   const star=simulation.level.stars.find(item=>item.id===optional)!,target=simulation.position(star).x,distance=target-s.x,stopping=s.vx*s.vx/(2*simulation.level.physics.acceleration)+.08;
   const align=!jumped&&s.grounded&&Math.abs(distance)>Math.max(.16,stopping),shouldJump=!jumped&&s.grounded&&Math.abs(s.vx)<.1&&Math.abs(distance)<.4;
   if(shouldJump)jumped=true;simulation.setInput({left:align&&distance<0,right:align&&distance>0,jump:shouldJump});if(jumped&&s.grounded&&simulation.collectedStars.has(optional)){optional=null;jumped=false;}
  }else{
   let jump=false;if(s.grounded&&current){const index=path.indexOf(current.id),next=simulation.platforms.find(platform=>platform.id===path[index+1]);if(next){const gap=next.x-current.x-current.width,rise=platformSurfaceY(next,next.x)-platformSurfaceY(current,current.x+current.width),walkDown=route==='upper'&&rise<-.5;jump=!walkDown&&(rise>.05||gap>.25)&&s.x>current.x+current.width-.7;}if(simulation.enemies.some(enemy=>enemy.x>s.x-.1&&enemy.x-s.x<2.7))jump=true;}
   // Release horizontal input to settle onto the reward terrace and its
   // descending rocks rather than blindly running off their narrow edges.
   const settle=route==='upper'&&!s.grounded&&((lastStanding==='jp-upper-02'&&simulation.collectedStars.has('jp-star-01'))||lastStanding==='jp-star-terrace'||lastStanding==='jp-descent');
   simulation.setInput({left:false,right:!settle,jump});
  }
  const happened=simulation.advance(FIXED_STEP);events.push(...happened);
  if(happened.some(e=>e.type==='checkpoint'))checkpointSnapshots.push(simulation.clone());
  for(const enemy of simulation.enemies)if(Math.abs(simulation.state.x-enemy.x)<simulation.level.physics.playerRadius+.28&&simulation.state.y>=enemy.y+(enemy.height??1.06))clearedEnemies.add(enemy.id);
 }
 return{simulation,visited,discoveries,events,checkpointSnapshots,clearedEnemies};
}

describe('Japan authored level pipeline and deterministic physics',()=>{
 it('reaches all 30 coins across input-driven lower and bonus runs, and awards every collected item once',()=>{
  // Two complete runs deliberately cover the mutually exclusive opening
  // branches. No state, collectible or position is changed by the driver.
  for(const difficulty of [1,2,3,4] as const){
   const main=driveJapan('main',difficulty,true),upper=driveJapan('upper',difficulty,true),all=new Set([...main.simulation.collectedCoins,...upper.simulation.collectedCoins]);
   expect([...all].sort()).toEqual(main.simulation.level.coins.map(c=>c.id).sort());
   for(const run of [main,upper]){
    expect(run.simulation.state.status).toBe('completed');expect(run.simulation.state.hearts).toBe(3);
    for(const kind of ['coin','star'] as const){const awards=run.events.filter(e=>e.type===kind).map(e=>e.id);expect(new Set(awards).size).toBe(awards.length);expect(awards.length).toBe(kind==='coin'?run.simulation.state.coins:run.simulation.state.stars);}
   }
   expect(upper.simulation.state.stars).toBe(3);
   for(const id of main.simulation.level.mainRoute!)expect(main.visited.has(id),`main ${difficulty}: ${id}`).toBe(true);
   for(const id of upper.simulation.level.upperRoute!)expect(upper.visited.has(id),`upper ${difficulty}: ${id}`).toBe(true);
  }
 });
 it('loads a validated Japan prototype with real playable requirements and honest availability',()=>{
  const level=levelDefinitionFor('JP');expect(level.id).toBe('jp-level-01');expect(level.countryId).toBe('JP');expect(level.platforms.length).toBeGreaterThanOrEqual(6);expect(level.coins).toHaveLength(30);expect(level.stars).toHaveLength(3);expect(level.checkpoints.length).toBeGreaterThan(0);expect(level.platforms.some(p=>p.type==='wooden-bridge'&&p.width>15)).toBe(true);expect(level.platforms.some(p=>p.motion!==null)).toBe(true);expect(level.platforms.at(-1)!.x+level.platforms.at(-1)!.width).toBeGreaterThan(100);expect(level.spawn.offset).toBeGreaterThan(0);expect(level.spawn.offset).toBeLessThan(level.platforms[0].width-1);
  expect(levelAvailability('JPN')).toMatchObject({countryId:'JP',levelId:'jp-level-01',stage:'prototype',releaseReady:false,visualReviewed:false});expect(levelAvailability('EG')).toMatchObject({countryId:'EG',levelId:'eg-level-01',stage:'prototype',releaseReady:false});expect(levelAvailability('ANTARCTICA')).toMatchObject({levelId:'antarctica-expedition',countryId:'ANTARCTICA'});expect(levelAvailability('ZZ')).toBeUndefined();
 });
 it('rejects missing platform references, duplicate IDs, invalid country identity and unsafe geometry before mounting',()=>{
  const level=levelDefinitionFor('JPN');for(const mutate of [(copy:LevelDefinition)=>{copy.stars[0].platformId='missing';},(copy:LevelDefinition)=>{copy.platforms[1].id=copy.platforms[0].id;},(copy:LevelDefinition)=>{copy.countryId='EG';},(copy:LevelDefinition)=>{copy.platforms[0].width=NaN;},(copy:LevelDefinition)=>{copy.enemies![0].maxOffset=30;},(copy:LevelDefinition)=>{copy.enemies![0].platformId='missing';},(copy:LevelDefinition)=>{copy.discoveryBlocks![0].height=NaN;}]){const copy=structuredClone(level);mutate(copy);expect(()=>validateLevel(copy)).toThrow();}
 });
 it('bounds bridge sag, shares deck heights with pickups, and preserves sufficient lower-route headroom',()=>{
  const level=levelDefinitionFor('JPN'),bridge=level.platforms.find(p=>p.id==='jp-lower-bridge')!;
  expect(bridge.y).toBeGreaterThan(-2);expect(bridge.sagDepth).toBe(.22);
  expect(platformSurfaceY(bridge,bridge.x)).toBe(bridge.y);expect(platformSurfaceY(bridge,bridge.x+bridge.width)).toBe(bridge.y);
  expect(platformSurfaceY(bridge,bridge.x+bridge.width/2)).toBeCloseTo(bridge.y-bridge.sagDepth!,8);
  expect(platformSurfaceY(bridge,bridge.x-1)).toBe(bridge.y);
  const simulation=new LevelSimulation(level),coin=level.coins.find(c=>c.platformId===bridge.id)!;
  expect(simulation.position(coin).y).toBeCloseTo(platformSurfaceY(bridge,bridge.x+coin.offset)+coin.height,8);
  const ascent=level.upperRoute!.slice(0,4).map(id=>level.platforms.find(p=>p.id===id)!);
  for(let i=1;i<ascent.length;i++){expect(ascent[i].y-ascent[i-1].y).toBeGreaterThanOrEqual(.8);expect(ascent[i].y-ascent[i-1].y).toBeLessThanOrEqual(1.2);}
  for(const rock of level.platforms.filter(p=>p.route==='upper'))for(let x=rock.x;x<=Math.min(rock.x+rock.width,bridge.x+bridge.width);x+=.1)expect(rock.y-rock.thickness-platformSurfaceY(bridge,x),rock.id).toBeGreaterThan(level.physics.playerHeight+.05);
  for(const sag of [-.1,.51,NaN]){const invalid=structuredClone(level);invalid.platforms.find(p=>p.id===bridge.id)!.sagDepth=sag;expect(()=>validateLevel(invalid)).toThrow('Invalid bridge sag.');}
 });
 it('walks, jumps and respawns on the same curved deck without floating or falling through',()=>{
  const level=fixture();level.platforms[0].type='wooden-bridge';level.platforms[0].sagDepth=.35;level.spawn.offset=1.2;level.checkpoints=[{id:'deck-marker',platformId:level.platforms[0].id,offset:4.5}];const simulation=new LevelSimulation(level),deck=simulation.platforms[0];
  simulation.setInput({left:false,right:true,jump:false});
  for(let frame=0;frame<100&&simulation.state.x<6.5;frame++){simulation.advance(FIXED_STEP);expect(simulation.state.grounded).toBe(true);expect(simulation.state.y).toBeCloseTo(platformSurfaceY(deck,simulation.state.x),8);}
  simulation.setInput({left:false,right:false,jump:false});for(let i=0;i<30;i++)simulation.advance(FIXED_STEP);
  expect(simulation.state.checkpointId).toBe('deck-marker');expect(simulation.state.coins).toBe(1);
  simulation.setInput({left:false,right:false,jump:true});simulation.advance(FIXED_STEP);simulation.clearInput();for(let i=0;i<100;i++)simulation.advance(FIXED_STEP);
  expect(simulation.state.grounded).toBe(true);expect(simulation.state.standing).toBe(deck.id);expect(simulation.state.y).toBeCloseTo(platformSurfaceY(deck,simulation.state.x),8);
  simulation.setInput({left:true,right:false,jump:false});let recovered=false;for(let i=0;i<600;i++)if(simulation.advance(FIXED_STEP).some(event=>event.type==='respawn')){recovered=true;break;}
  expect(recovered).toBe(true);expect(simulation.state.x).toBe(4.5);expect(simulation.state.y).toBeCloseTo(platformSurfaceY(deck,4.5),8);expect(simulation.state.hearts).toBe(2);expect(simulation.state.coins).toBe(1);
 });
 it('finishes the independent lower route without taking any upper rock or collecting the optional upper star',()=>{
  for(const difficulty of [1,4] as const){
   const {simulation,visited,discoveries,events,clearedEnemies}=driveJapan('main',difficulty);
   expect(simulation.state.status,`difficulty ${difficulty}`).toBe('completed');expect(simulation.state.hearts).toBeGreaterThan(0);expect(simulation.state.coins).toBeGreaterThan(10);expect(simulation.collectedStars.has('jp-star-01')).toBe(false);expect(discoveries).toBe(1);expect(simulation.state.checkpointId).toBe('jp-checkpoint-02');expect(visited.has('jp-lower-bridge')).toBe(true);expect([...visited].some(id=>simulation.level.platforms.find(p=>p.id===id)?.route==='upper')).toBe(false);expect([...visited].some(id=>simulation.platforms.find(p=>p.id===id)?.motion!==null)).toBe(true);expect(simulation.progress()).toBe(100);expect(simulation.state.z).toBe(0);
   expect(events.filter(e=>e.type==='checkpoint').map(e=>e.id)).toEqual(['jp-checkpoint-01','jp-checkpoint-02']);expect(events.some(e=>e.type==='damage')).toBe(false);
   expect([...clearedEnemies]).toContain('jp-red-wayfinder');
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
  const level=levelDefinitionFor('JPN'),first=cameraFrame(level,-100,-30,1.8),last=cameraFrame(level,10000,30,1.8);expect(first.x).toBeGreaterThanOrEqual(5);expect(last.x).toBeLessThan(level.platforms.at(-1)!.x+level.platforms.at(-1)!.width);expect(first.y).toBeGreaterThan(0);expect(last.y).toBeLessThan(8);
 });
 it('collects all three optional Japan stars through controlled walking and vertical jumps, then finishes',()=>{
  const {simulation,visited}=driveJapan('upper',1,true);expect(simulation.state.status).toBe('completed');expect(simulation.state.stars).toBe(3);expect(simulation.state.hearts).toBe(3);expect(simulation.collectedStars.size).toBe(3);expect(visited.has('jp-upper-01')).toBe(true);expect(visited.has('jp-upper-02')).toBe(true);expect(visited.has('jp-star-terrace')).toBe(true);expect(simulation.stats().collectedStarIds).toEqual(expect.arrayContaining(['jp-star-01','jp-star-02','jp-star-03']));
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
 it('recovers safely at both authored Japan checkpoints after an enemy hit or missed landing',()=>{
  const run=driveJapan('main'),snapshots=run.checkpointSnapshots;expect(snapshots).toHaveLength(2);
  for(const simulation of snapshots){
   const checkpoint=simulation.level.checkpoints.find(c=>c.id===simulation.state.checkpointId)!,savedCoins=simulation.state.coins;let damage=0,recovered=false;
   for(let frame=0;frame<1500;frame++){
    const s=simulation.state;simulation.setInput({left:false,right:true,jump:s.grounded&&s.standing==='jp-bridge-exit'&&s.x>32.7});
    const events=simulation.advance(FIXED_STEP);damage+=events.filter(e=>e.type==='damage').length;if(events.some(e=>e.type==='respawn')){recovered=true;break;}
   }
   expect(recovered,checkpoint.id).toBe(true);expect(damage).toBe(1);expect(simulation.state.hearts).toBe(2);expect(simulation.state.invulnerable).toBeGreaterThan(.5);
   expect(simulation.state.x).toBeCloseTo(simulation.position(checkpoint).x,8);expect(simulation.state.y).toBeCloseTo(simulation.position(checkpoint).y,8);expect(simulation.state.coins).toBeGreaterThanOrEqual(savedCoins);
   simulation.clearInput();for(let i=0;i<60;i++)simulation.advance(FIXED_STEP);expect(simulation.state.hearts).toBe(2);expect(simulation.state.status).toBe('playing');expect(simulation.state.standing).toBe(checkpoint.platformId);
  }
 });
 it('patrols within both edge markers, turns at the ends and freezes enemies with the paused simulation',()=>{
  const level=fixture();level.spawn.offset=7;level.enemies=[{id:'patrol',platformId:level.platforms[0].id,minOffset:1,maxOffset:6,speed:1.2}];const simulation=new LevelSimulation(level),states=new Set<string>();let min=Infinity,max=-Infinity;
  for(let i=0;i<900;i++){simulation.advance(FIXED_STEP);const enemy=simulation.enemies[0];states.add(enemy.state);min=Math.min(min,enemy.x);max=Math.max(max,enemy.x);}
  expect(min).toBeGreaterThanOrEqual(1);expect(max).toBeLessThanOrEqual(6);expect(states.has('PATROL_LEFT')).toBe(true);expect(states.has('PATROL_RIGHT')).toBe(true);expect(states.has('TURN')).toBe(true);const before=structuredClone(simulation.enemies);simulation.pause();simulation.advance(1);expect(simulation.enemies).toEqual(before);
 });
 it('respawns at an activated checkpoint after enemy contact without removing the enemy',()=>{
  const level=fixture();level.spawn.offset=6;level.checkpoints=[{id:'safe-marker',platformId:level.platforms[0].id,offset:5}];level.enemies=[{id:'guard',platformId:level.platforms[0].id,minOffset:3.8,maxOffset:5.8,speed:1.2}];const simulation=new LevelSimulation(level);let recovered=false,damage=0;
  for(let i=0;i<600;i++){const events=simulation.advance(FIXED_STEP);damage+=events.filter(event=>event.type==='damage').length;if(events.some(event=>event.type==='respawn')){recovered=true;break;}}
  expect(recovered).toBe(true);expect(damage).toBe(1);expect(simulation.state.hearts).toBe(2);expect(simulation.state.x).toBe(5);expect(simulation.enemies).toHaveLength(1);expect(simulation.enemies[0].state).not.toBe('DISABLED');
  for(let i=0;i<30;i++)simulation.advance(FIXED_STEP);expect(simulation.state.hearts).toBe(2);expect(simulation.state.status).toBe('playing');
 });
 it('unlocks a wooden discovery block only on an underside jump hit and opens the fact after safe landing',()=>{
  const level=fixture();level.discoveryBlocks=[{id:'wood-block',x:4,y:2.75,width:1.2,height:.9,factId:'mount-fuji'}];const simulation=new LevelSimulation(level);simulation.advance(.2);expect(simulation.activatedBlocks.size).toBe(0);simulation.setInput({left:false,right:false,jump:true});let blocks=0,discoveries=0;
  for(let i=0;i<180;i++){for(const event of simulation.advance(FIXED_STEP)){if(event.type==='block'){blocks++;expect(simulation.state.grounded).toBe(false);}if(event.type==='discovery'){discoveries++;expect(simulation.state.grounded).toBe(true);}}if(simulation.state.status==='discovery')break;}
  expect(blocks).toBe(1);expect(discoveries).toBe(1);expect(simulation.activatedBlocks.has('wood-block')).toBe(true);simulation.resume();simulation.setInput({left:false,right:false,jump:true});for(let i=0;i<120;i++){const events=simulation.advance(FIXED_STEP);expect(events.some(event=>event.type==='block'||event.type==='discovery')).toBe(false);}expect(simulation.state.discoveryFound).toBe(true);
 });
 it('can walk from the actual start to the discovery block and jump-hit it from the lower bridge',()=>{
  const simulation=new LevelSimulation(levelDefinitionFor('JPN')),block=simulation.level.discoveryBlocks![0];let aligned=false,blocks=0,discovery=0;
  for(let i=0;i<1000&&!aligned;i++){const s=simulation.state,distance=block.x-s.x,stopping=s.vx*s.vx/(2*simulation.level.physics.acceleration)+.035;simulation.setInput({left:distance<-Math.max(.05,stopping),right:distance>Math.max(.05,stopping),jump:false});simulation.advance(FIXED_STEP);aligned=s.standing==='jp-lower-bridge'&&Math.abs(s.x-block.x)<.12&&Math.abs(s.vx)<.12;}
  expect(aligned).toBe(true);simulation.setInput({left:false,right:false,jump:true});for(let i=0;i<180;i++){for(const event of simulation.advance(FIXED_STEP)){if(event.type==='block')blocks++;if(event.type==='discovery')discovery++;}if(simulation.state.status==='discovery')break;}
  expect(blocks).toBe(1);expect(discovery).toBe(1);expect(simulation.state.grounded).toBe(true);expect(simulation.state.standing).toBe('jp-lower-bridge');expect(simulation.state.hearts).toBe(3);
 });
});
