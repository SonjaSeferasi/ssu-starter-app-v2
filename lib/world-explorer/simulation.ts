import {traceLight} from './light-puzzle';
import {validateLevel} from './level-manifest';
import type {CountryStats,EnemyState,GateState,HazardDefinition,HazardPhase,LevelDefinition,PlatformDefinition,PlatformState,SimulationEvent,SimulationInput,SimulationState,SimulationStatus,WindPhase,WindZoneDefinition} from './game-types';
import {referenceCameraFrame} from './game-camera';
import {platformSurfaceY} from './platform-surface';

export const FIXED_STEP=1/60;
const approach=(value:number,target:number,delta:number)=>value<target?Math.min(target,value+delta):Math.max(target,value-delta);
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const ease=(t:number)=>t*t*(3-2*t);

/** Offset of a moving platform from its base at a time. Without `pause` this is
 * the original sine motion; with `pause` it eases between two held endpoints.
 * A pendulum swings on its rope, rising toward each end of its arc. */
export function platformOffset(platform:PlatformDefinition,time:number){
 let wave=0;
 if(platform.motion&&platform.pause){
  const period=platform.period,cycle=(((time/period+platform.phase/(Math.PI*2))%1)+1)%1*period,hold=platform.pause,move=(period-2*hold)/2;
  wave=cycle<hold?-1:cycle<hold+move?-1+2*ease((cycle-hold)/move):cycle<2*hold+move?1:1-2*ease((cycle-2*hold-move)/move);
 }else if(platform.motion)wave=Math.sin(time*Math.PI*2/platform.period+platform.phase);
 if(platform.motion==='pendulum'){const length=platform.length||4,angle=Math.asin(Math.min(.95,platform.amplitude/length))*wave;return{x:length*Math.sin(angle),y:length*(1-Math.cos(angle))};}
 const offset=wave*platform.amplitude,bob=platform.bob?Math.sin(time*Math.PI*4/platform.period+platform.phase)*platform.bob:0;
 return platform.motion==='horizontal'?{x:offset,y:bob}:{x:0,y:platform.motion==='vertical'?offset:0};
}

/** Deterministic gust cycle: calm, then a warning, then a gust that ramps in
 * and out so a player is never shoved by a sudden invisible force. */
export function windAt(zone:WindZoneDefinition,time:number):{phase:WindPhase;strength:number}{
 const cycle=((time+zone.phase)%zone.period+zone.period)%zone.period,gust=zone.period-zone.duration,warning=gust-zone.warning;
 if(cycle>=gust){const t=cycle-gust;return{phase:'gust',strength:clamp(Math.min(t,zone.duration-t)/.35,0,1)};}
 return{phase:cycle>=warning?'warning':'calm',strength:0};
}

/** Deterministic eruption cycle for a timed hazard (geyser, wave, calving ice):
 * calm, then a visible warning, then an active spell that hurts. A hazard
 * without a cycle is always active. `strength` ramps the visual in and out. */
export function hazardAt(hazard:HazardDefinition,time:number):{phase:HazardPhase;strength:number}{
 const c=hazard.cycle;if(!c)return{phase:'active',strength:1};
 const cycle=((time+c.phase)%c.period+c.period)%c.period,active=c.period-c.active,warning=active-c.warning;
 if(cycle>=active){const t=cycle-active;return{phase:'active',strength:clamp(Math.min(t,c.active-t)/.2,0,1)};}
 return{phase:cycle>=warning?'warning':'calm',strength:cycle>=warning?(cycle-warning)/c.warning:0};
}

/** A crumbled ledge has no collision until it is restored; a switch-raised
 * platform has none while it is sunk. */
export const solidPlatform=(platform:PlatformState)=>(!platform.collapsePhase||platform.collapsePhase==='stable'||platform.collapsePhase==='shaking')&&(!platform.raise||(platform.raised??0)>.6);

/** Pure, deterministic side-scrolling simulation. Rendering never changes its
 * positions or collision definitions; it reads the result of fixed 60Hz ticks. */
export class LevelSimulation{
 readonly level:LevelDefinition;
 readonly platforms:PlatformState[];
 readonly collectedCoins=new Set<string>();
 readonly collectedStars=new Set<string>();
 readonly activatedBlocks=new Set<string>();
 readonly enemies:EnemyState[];
 readonly gates:GateState[];
 readonly lightPuzzles:import('./game-types').LightPuzzleState[];
 private interactQueued=false;
 readonly state:SimulationState;
 private input:SimulationInput={left:false,right:false,jump:false};
 private accumulator=0;
 private jumpBuffer=0;
 private coyote=.12;
 private effectTimer=0;
 private respawnTimer=0;
 private resumeStatus:SimulationStatus='playing';
 private events:SimulationEvent[]=[];
 private pendingDiscovery:string|null=null;
 private enemyOffsets=new Map<string,number>();
 private enemyDirections=new Map<string,1|-1>();
 private enemyAlerts=new Map<string,number>();
 private enemyWaits=new Map<string,number>();
 private alertedEnemies=new Set<string>();
 private windPhases=new Map<string,WindPhase>();
 private hazardPhases=new Map<string,HazardPhase>();
 private pressedSwitches=new Set<string>();

 constructor(level:LevelDefinition){
  this.level=validateLevel(level);this.platforms=this.level.platforms.map(p=>({...p,baseX:p.x,baseY:p.y,dx:0,dy:0,...(p.raise?{y:p.y-p.raise.drop,raised:0,raiseTimer:0}:{})}));
  const spawn=this.position(this.level.spawn);this.state={x:spawn.x,y:spawn.y,z:0,vx:0,vy:0,grounded:true,standing:this.level.spawn.platformId,hearts:3,coins:0,stars:0,checkpointId:null,discoveryFound:false,elapsedSeconds:0,status:'playing',animation:'idle',facing:1,invulnerable:0};
  this.lightPuzzles=(this.level.lightPuzzles||[]).map(p=>({id:p.id,index:p.initialIndex,charge:0,lit:false}));
  this.gates=(this.level.gates||[]).map(gate=>({id:gate.id,open:0,timer:0}));
  this.enemies=(this.level.enemies||[]).map(enemy=>{const platform=this.platforms.find(platform=>platform.id===enemy.platformId)!,x=platform.x+enemy.minOffset;this.enemyOffsets.set(enemy.id,enemy.minOffset);this.enemyDirections.set(enemy.id,1);return{...enemy,x,y:platformSurfaceY(platform,x),z:0,direction:1,state:'PATROL_RIGHT'};});
 }
 /** An independent copy for look-ahead planning and tests; the level is shared
  * because it is never mutated after validation. */
 clone():LevelSimulation{
  const copy=Object.create(LevelSimulation.prototype) as LevelSimulation,source=this as unknown as Record<string,unknown>,target=copy as unknown as Record<string,unknown>;
  for(const [key,value] of Object.entries(source)){
   if(value instanceof Set)target[key]=new Set(value);else if(value instanceof Map)target[key]=new Map(value);
   else if(key==='platforms'||key==='enemies'||key==='gates'||key==='lightPuzzles')target[key]=(value as object[]).map(item=>({...item}));
   else if(key==='events')target[key]=[];else if(key==='level')target[key]=value;
   else target[key]=value&&typeof value==='object'?{...value}:value;
  }
  return copy;
 }
 position(item:{platformId:string;offset:number;height?:number}){const p=this.platforms.find(p=>p.id===item.platformId);if(!p)throw new Error('Missing platform reference.');const x=p.x+item.offset;return{x,y:platformSurfaceY(p,x)+(item.height||0),z:0};}
 wind(zoneId:string){const zone=this.level.zones?.find(zone=>zone.id===zoneId);return zone?windAt(zone,this.state.elapsedSeconds):undefined;}
 setInput(input:SimulationInput){if(input.interact&&!this.input.interact&&this.state.status==='playing')this.interactQueued=true;if(input.jump&&!this.input.jump&&this.state.status==='playing')this.jumpBuffer=this.level.physics.jumpBuffer;this.input={...input};}
 clearInput(){this.interactQueued=false;this.input={left:false,right:false,jump:false};this.jumpBuffer=0;}
 pause(){if(this.state.status==='playing'||this.state.status==='respawning'){this.resumeStatus=this.state.status;this.state.status='paused';this.accumulator=0;this.clearInput();}}
 resume(){if(this.state.status==='paused'||this.state.status==='discovery'){this.state.status=this.state.status==='discovery'?'playing':this.resumeStatus;this.accumulator=0;this.clearInput();}}
 stats():CountryStats{return{hearts:this.state.hearts,coins:this.state.coins,totalCoins:this.level.coins.length,stars:this.state.stars,totalStars:this.level.stars.length,checkpointActive:this.state.checkpointId!==null,checkpointId:this.state.checkpointId,timeSeconds:Math.floor(this.state.elapsedSeconds),discoveryFound:this.state.discoveryFound,collectedStarIds:[...this.collectedStars]};}
 progress(){if(this.state.status==='completed')return 100;const finish=this.position(this.level.finish);return clamp(Math.floor(this.state.x/finish.x*100),0,99);}
 advance(seconds:number):SimulationEvent[]{
  this.events=[];
  if(!Number.isFinite(seconds)||seconds<0)return[];
  if(this.state.status==='paused'||this.state.status==='discovery'||this.state.status==='completed'||this.state.status==='failed'){this.accumulator=0;return[];}
  // Catch ordinary slow frames without letting a backgrounded tab create an
  // unbounded physics backlog. Each collision step remains exactly 1/60 sec.
  this.accumulator=Math.min(.25,this.accumulator+Math.min(seconds,.25));
  while(this.accumulator+1e-9>=FIXED_STEP){this.accumulator-=FIXED_STEP;this.step();if(['discovery','completed','failed'].includes(this.state.status)){this.accumulator=0;break;}}
  return this.events;
 }
 private damage(){
  const s=this.state;if(s.invulnerable>0)return;
  s.hearts--;s.invulnerable=1.4;s.vx=s.vy=0;s.animation='damage';this.events.push({type:'damage'});this.clearInput();
  if(s.hearts<=0){s.status='failed';this.events.push({type:'failed'});return;}
  s.status='respawning';this.respawnTimer=.45;
 }
 private recover(){
  const checkpoint=this.level.checkpoints.find(p=>p.id===this.state.checkpointId)||this.level.spawn,point=this.position(checkpoint),s=this.state;
  s.x=point.x;s.y=point.y;s.z=0;s.vx=s.vy=0;s.grounded=true;s.standing=checkpoint.platformId;s.status='playing';s.animation='respawn';this.effectTimer=.2;this.coyote=this.level.physics.coyoteTime;this.clearInput();this.events.push({type:'respawn'});
 }
 waterSurface(id:string){const basin=this.level.waterBasins?.find(b=>b.id===id);if(!basin)throw new Error('Missing water basin.');const platform=this.platforms.find(p=>p.id===basin.platformId)!;return basin.lowSurface+(basin.highSurface-basin.lowSurface)*(platform.raised??0);}
 private operateLight(dt:number,pressed:Set<string>){
  const turn=this.interactQueued;this.interactQueued=false;
  for(const puzzle of this.level.lightPuzzles||[]){const point=this.position(puzzle),state=this.lightPuzzles.find(s=>s.id===puzzle.id)!;
   if(turn&&this.state.grounded&&this.state.standing===puzzle.platformId&&Math.abs(this.state.x-point.x)<1.25){state.index=(state.index+1)%puzzle.normals.length;this.events.push({type:'mirror-turn',id:puzzle.id});}
   const lit=traceLight(puzzle,point,state.index).lit;if(lit&&!state.lit)this.events.push({type:'light-aligned',id:puzzle.id});state.lit=lit;state.charge=lit?Math.min(puzzle.chargeSeconds,state.charge+dt):0;if(state.charge>=puzzle.chargeSeconds)pressed.add(puzzle.gateId);
  }
 }
 private support(id:string){
  const platform=this.platforms.find(platform=>platform.id===id);if(platform)return solidPlatform(platform)?platform:undefined;
  const block=this.level.discoveryBlocks?.find(block=>'block:'+block.id===id);return block?{id,x:block.x-block.width/2,y:block.y+block.height/2,width:block.width,thickness:block.height,dx:0,dy:0,surface:undefined}:undefined;
 }
 private moveEnemies(dt:number){
  for(const enemy of this.enemies){
   const platform=this.platforms.find(platform=>platform.id===enemy.platformId)!,distance=Math.abs(this.state.x-enemy.x);let alert=this.enemyAlerts.get(enemy.id)||0;
   if(distance>4)this.alertedEnemies.delete(enemy.id);
   if(this.state.status==='playing'&&distance<2.4&&!this.alertedEnemies.has(enemy.id)){this.alertedEnemies.add(enemy.id);alert=.25;}
   const wait=this.enemyWaits.get(enemy.id)||0;
   if(alert>0){this.enemyAlerts.set(enemy.id,Math.max(0,alert-dt));enemy.state='ALERT';enemy.direction=this.state.x<enemy.x?-1:1;}
   else if(wait>0){this.enemyWaits.set(enemy.id,Math.max(0,wait-dt));enemy.state='TURN';enemy.direction=this.enemyDirections.get(enemy.id)||1;}
   else{let direction=this.enemyDirections.get(enemy.id)||1,offset=(this.enemyOffsets.get(enemy.id)??enemy.minOffset)+direction*enemy.speed*dt,turning=false;if(offset>=enemy.maxOffset){offset=enemy.maxOffset;direction=-1;turning=true;}else if(offset<=enemy.minOffset){offset=enemy.minOffset;direction=1;turning=true;}if(turning)this.enemyWaits.set(enemy.id,enemy.turnPause??.2);this.enemyOffsets.set(enemy.id,offset);this.enemyDirections.set(enemy.id,direction);enemy.direction=direction;enemy.state=turning&&(enemy.turnPause??.2)>0?'TURN':direction===1?'PATROL_RIGHT':'PATROL_LEFT';}
   enemy.x=platform.x+(this.enemyOffsets.get(enemy.id)??enemy.minOffset);enemy.y=platformSurfaceY(platform,enemy.x);enemy.z=0;
  }
 }
 /** Horizontal push from active gusts at the player's position; also reports
  * each zone's phase change once so the renderer can warn and play sound. */
 private windDrift(){
  let drift=0;const s=this.state,p=this.level.physics;
  for(const zone of this.level.zones||[]){
   const wind=windAt(zone,s.elapsedSeconds),previous=this.windPhases.get(zone.id);
   if(previous!==undefined&&previous!==wind.phase&&wind.phase!=='calm')this.events.push({type:wind.phase==='warning'?'wind-warning':'wind',id:zone.id});
   this.windPhases.set(zone.id,wind.phase);
   // Feet on the ground resist most of a gust (a player waiting it out on a
   // narrow pillar stays on); a jump feels its full push.
   if(wind.strength>0&&s.x>=zone.x&&s.x<=zone.x+zone.width&&s.y+p.playerHeight>zone.bottom&&s.y<zone.top)drift+=zone.force*wind.strength*(s.grounded?.3:1);
  }
  return drift;
 }
 /** Collapsing ledges shake after first contact, fall away, then return once
  * the player is clear of the spot so a ledge never reappears inside them. */
 private crumble(dt:number){
  const s=this.state;
  for(const platform of this.platforms){
   if(!platform.collapse)continue;
   const phase=platform.collapsePhase||'stable',time=(platform.collapseTime||0)+dt;platform.collapseTime=time;
   if(phase==='shaking'&&time>=platform.collapse.delay){platform.collapsePhase='falling';platform.collapseTime=0;this.events.push({type:'collapse',id:platform.id});}
   else if(phase==='falling'){platform.drop=9*time*time;if(time>1.1){platform.collapsePhase='hidden';platform.collapseTime=0;}}
   else if(phase==='hidden'&&time>=platform.collapse.respawn&&(s.x<platform.baseX-1.5||s.x>platform.baseX+platform.width+1.5)){platform.collapsePhase='stable';platform.collapseTime=0;platform.drop=0;}
  }
 }
 /** Report each timed hazard's warning and eruption once, for sound and visuals. */
 private signalHazards(){
  for(const hazard of this.level.hazards){
   if(!hazard.cycle)continue;const phase=hazardAt(hazard,this.state.elapsedSeconds).phase,previous=this.hazardPhases.get(hazard.id);
   if(previous!==undefined&&previous!==phase&&phase!=='calm')this.events.push({type:phase==='warning'?'hazard-warning':'hazard',id:hazard.id});
   this.hazardPhases.set(hazard.id,phase);
  }
 }
 /** Is the player pressed against a climbable face? Holding jump climbs it. */
 private climbFace(){
  const s=this.state,p=this.level.physics,right=this.input.right&&!this.input.left;if(s.grounded||(!right&&!this.input.left))return false;
  return this.platforms.some(platform=>{
   if(!platform.climbable||!solidPlatform(platform))return false;
   const top=platformSurfaceY(platform,right?platform.x:platform.x+platform.width),face=right?Math.abs(s.x+p.playerRadius-platform.x)<.03:Math.abs(s.x-p.playerRadius-(platform.x+platform.width))<.03;
   return face&&s.y<top-.02&&s.y+p.playerHeight>top-platform.thickness;
  });
 }
 /** Pressure plates hold their gates open while pressed and for `openSeconds`
  * after; a gate warns before closing and never closes onto the player. */
 private operateGates(dt:number){
  const s=this.state,p=this.level.physics,pressed=new Set<string>();
  for(const plate of this.level.switches||[]){
   const point=this.position(plate),on=s.status==='playing'&&s.grounded&&s.standing===plate.platformId&&Math.abs(s.x-point.x)<.75;
   if(!on){this.pressedSwitches.delete(plate.id);continue;}
   if(!this.pressedSwitches.has(plate.id)){this.pressedSwitches.add(plate.id);this.events.push({type:'switch',id:plate.id});}
   plate.gateIds.forEach(id=>pressed.add(id));
  }
  // Switch-raised platforms rise while their plate is held, stay up for their
  // window, and never sink under a player standing on them.
  for(const platform of this.platforms){
   if(!platform.raise)continue;
   const on=s.grounded&&s.standing===platform.id,before=platform.raised??0,timer=platform.raiseTimer??0;
   if(this.pressedSwitches.has(platform.raise.switchId)){if(timer<=0&&before<.5)this.events.push({type:'raise',id:platform.id});platform.raiseTimer=platform.raise.seconds;}
   else if(timer>0){platform.raiseTimer=on?Math.max(timer,dt):timer-dt;if(platform.raiseTimer<=0)this.events.push({type:'lower',id:platform.id});}
   platform.raised=(platform.raiseTimer??0)>0?Math.min(1,before+dt/.5):on?before:Math.max(0,before-dt/.9);
  }
  this.operateLight(dt,pressed);
  for(const gate of this.gates){
   const definition=this.level.gates!.find(item=>item.id===gate.id)!,under=s.x+p.playerRadius>definition.x-.1&&s.x-p.playerRadius<definition.x+definition.width+.1;
   if(pressed.has(gate.id)){if(gate.timer<=0)this.events.push({type:'gate-open',id:gate.id});gate.timer=definition.openSeconds;}
   else if(gate.timer>0){const before=gate.timer;gate.timer=under?Math.max(gate.timer,dt):gate.timer-dt;if(before>1.5&&gate.timer<=1.5)this.events.push({type:'gate-closing',id:gate.id});}
   gate.open=gate.timer>0?Math.min(1,gate.open+dt/.6):under&&gate.open>0?gate.open:Math.max(0,gate.open-dt/1.1);
  }
 }
 private step(){
  const s=this.state,p=this.level.physics,dt=FIXED_STEP;s.elapsedSeconds+=dt;s.invulnerable=Math.max(0,s.invulnerable-dt);this.effectTimer=Math.max(0,this.effectTimer-dt);
  this.crumble(dt);
  if(this.gates.length||this.lightPuzzles.length||this.platforms.some(platform=>platform.raise))this.operateGates(dt);
  for(const platform of this.platforms){const oldX=platform.x,oldY=platform.y,offset=platformOffset(platform,s.elapsedSeconds);platform.x=platform.baseX+offset.x;const basin=this.level.waterBasins?.find(b=>b.platformId===platform.id);platform.y=basin?this.waterSurface(basin.id)+(platform.baseY-basin.highSurface):platform.baseY+offset.y-(platform.drop||0)-(platform.raise?platform.raise.drop*(1-(platform.raised??0)):0);platform.dx=platform.x-oldX;platform.dy=platform.y-oldY;}
  this.signalHazards();
  this.moveEnemies(dt);
  if(s.status==='respawning'){this.respawnTimer-=dt;if(this.respawnTimer<=0)this.recover();return;}
  if(s.status!=='playing')return;
  const drift=this.windDrift();
  this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);this.coyote=s.grounded?p.coyoteTime:Math.max(0,this.coyote-dt);
  let grip=1;
  if(s.grounded&&s.standing){const standing=this.support(s.standing);if(standing){s.x+=standing.dx+((standing as {current?:number}).current||0)*dt;s.y=platformSurfaceY(standing,s.x);if(standing.surface==='ice')grip=p.iceGrip??.3;}else{s.grounded=false;s.standing=null;}}
  const direction=Number(this.input.right)-Number(this.input.left);if(direction)s.facing=direction>0?1:-1;
  s.vx=approach(s.vx,direction*p.runSpeed,p.acceleration*(s.grounded?grip:p.airControl)*dt);
  if(this.jumpBuffer>0&&this.coyote>0){s.vy=p.jumpSpeed;s.grounded=false;s.standing=null;this.coyote=this.jumpBuffer=0;s.animation='jump';this.effectTimer=0;}
  const oldX=s.x,oldY=s.y;s.x+=(s.vx+drift)*dt;
  if(s.grounded&&s.standing){const platform=this.support(s.standing);if(!platform||s.x<platform.x-p.playerRadius*.55||s.x>platform.x+platform.width+p.playerRadius*.55){s.grounded=false;s.standing=null;}else s.y=platformSurfaceY(platform,s.x);}
  // Stairs and joined ground: a walking player steps onto a low riser instead
  // of stopping against it. Only levels that declare `stepHeight` opt in.
  if(s.grounded&&p.stepHeight){for(const platform of this.platforms){if(platform.id===s.standing||!solidPlatform(platform)||s.x+p.playerRadius<=platform.x||s.x-p.playerRadius>=platform.x+platform.width)continue;const rise=platformSurfaceY(platform,s.x)-s.y;if(rise>.04&&rise<=p.stepHeight){s.x=clamp(s.x,platform.x-p.playerRadius*.5,platform.x+platform.width+p.playerRadius*.5);s.y=platformSurfaceY(platform,s.x);s.standing=platform.id;break;}}}
  // A climbable face: holding jump climbs it at a steady speed (a jump's
  // own lift carries on first); pressing in without jump slides down slowly.
  // Past the top the player mantles onto the cap with the climb's momentum.
  const climbing=this.climbFace();if(climbing&&!s.climbing&&this.input.jump)this.events.push({type:'climb'});s.climbing=climbing&&this.input.jump;
  if(!s.grounded){s.vy-=p.gravity*dt;if(climbing)s.vy=this.input.jump?Math.max(s.vy,p.climbSpeed??3.4):Math.max(s.vy,-2.4);s.y+=s.vy*dt;}

  // Swept top/underside tests avoid tunnelling through a cap on a slow frame.
  // A rising platform's own movement this tick is allowed for, so a lift
  // cannot slip upward through a player who is landing on it.
  if(!s.grounded){
   for(const platform of this.platforms){
    const overlaps=s.x+p.playerRadius>platform.x&&s.x-p.playerRadius<platform.x+platform.width;if(!overlaps||!solidPlatform(platform))continue;
    const top=platformSurfaceY(platform,s.x),previousTop=platformSurfaceY({...platform,x:platform.x-platform.dx,y:platform.y-platform.dy},oldX);
    if(s.vy<=0&&oldY>=previousTop-.04&&s.y<=top){
     s.y=top;s.vy=0;s.grounded=true;s.standing=platform.id;s.animation='land';this.effectTimer=.1;
     if(platform.bounce){s.vy=platform.bounce;s.grounded=false;s.standing=null;s.animation='jump';this.coyote=0;this.events.push({type:'bounce',id:platform.id});}
     break;
    }
    const bottom=top-platform.thickness;
    if(s.vy>0&&oldY+p.playerHeight<=bottom+.02&&s.y+p.playerHeight>=bottom){s.y=bottom-p.playerHeight;s.vy=0;}
   }
  }
  // Side walls are solid below the walking cap. Decorations are never colliders.
  for(const platform of this.platforms){
   if(!solidPlatform(platform))continue;
   const top=platformSurfaceY(platform,s.x);
   if(s.y>=top-.04||s.y+p.playerHeight<=top-platform.thickness+.02)continue;
   if(oldX+p.playerRadius<=platform.x&&s.x+p.playerRadius>platform.x){s.x=platform.x-p.playerRadius;s.vx=0;}
   else if(oldX-p.playerRadius>=platform.x+platform.width&&s.x-p.playerRadius<platform.x+platform.width){s.x=platform.x+platform.width+p.playerRadius;s.vx=0;}
  }
  for(const basin of this.level.waterBasins||[])if(s.x>basin.x&&s.x<basin.x+basin.width&&s.y<this.waterSurface(basin.id)-.3){this.damage();return;}
  // A closed or part-open gate is a solid slab standing on the floor: a wall
  // from the side and a ceiling from below. It sinks into the ground to open.
  for(const gate of this.level.gates||[]){
   const open=this.gates.find(item=>item.id===gate.id)!.open,bottom=gate.y-open*gate.height,top=bottom+gate.height,left=gate.x,right=gate.x+gate.width;
   // Subtraction/addition can leave a fully sunk gate a few ulps above its
   // floor. It must not retain an invisible wall at decimal floor heights.
   if(open>=1-1e-6)continue;
   if(s.y<top&&s.y+p.playerHeight>bottom+.02){if(oldX+p.playerRadius<=left+1e-6&&s.x+p.playerRadius>left){s.x=left-p.playerRadius;s.vx=0;}else if(oldX-p.playerRadius>=right-1e-6&&s.x-p.playerRadius<right){s.x=right+p.playerRadius;s.vx=0;}}
   if(s.vy>0&&s.x+p.playerRadius>left&&s.x-p.playerRadius<right&&oldY+p.playerHeight<=bottom+.02&&s.y+p.playerHeight>=bottom){s.y=bottom-p.playerHeight;s.vy=0;}
  }
  for(const block of this.level.discoveryBlocks||[]){
   const left=block.x-block.width/2,right=block.x+block.width/2,bottom=block.y-block.height/2,top=block.y+block.height/2,overlaps=s.x+p.playerRadius>left&&s.x-p.playerRadius<right;
   if(overlaps&&!s.grounded&&s.vy>0&&oldY+p.playerHeight<=bottom+.02&&s.y+p.playerHeight>=bottom){
    s.y=bottom-p.playerHeight;s.vy=0;
    if(!this.activatedBlocks.has(block.id)){this.activatedBlocks.add(block.id);this.events.push({type:'block',id:block.id});if(!s.discoveryFound)this.pendingDiscovery=block.factId;}
   }else if(overlaps&&!s.grounded&&s.vy<=0&&oldY>=top-.03&&s.y<=top){s.y=top;s.vy=0;s.grounded=true;s.standing='block:'+block.id;s.animation='land';this.effectTimer=.1;}
   if(s.y<top-.03&&s.y+p.playerHeight>bottom+.02){if(oldX+p.playerRadius<=left&&s.x+p.playerRadius>left){s.x=left-p.playerRadius;s.vx=0;}else if(oldX-p.playerRadius>=right&&s.x-p.playerRadius<right){s.x=right+p.playerRadius;s.vx=0;}}
  }
  // Ground that continues off-screen to the left ends in a wall, not a fall.
  const leftWall=Math.min(...this.level.platforms.map(platform=>platform.x))+p.playerRadius;
  if(leftWall<-1&&s.x<leftWall){s.x=leftWall;s.vx=Math.max(0,s.vx);}
  if(s.y<p.killY||s.x<Math.min(-1,leftWall-1)){this.damage();return;}
  if(s.invulnerable<=0&&this.level.hazards.some(h=>(!h.cycle||hazardAt(h,s.elapsedSeconds).phase==='active')&&s.x+p.playerRadius>h.x&&s.x-p.playerRadius<h.x+h.width&&s.y<h.y+h.height&&s.y+p.playerHeight>h.y)){this.damage();return;}
  if(s.invulnerable<=0&&this.enemies.some(enemy=>enemy.state!=='DISABLED'&&enemy.state!=='STUNNED'&&Math.abs(s.x-enemy.x)<p.playerRadius+.28&&s.y<enemy.y+(enemy.height??1.06)&&s.y+p.playerHeight>enemy.y+.06)){this.damage();return;}

  for(const [kind,items,collected] of [['coin',this.level.coins,this.collectedCoins],['star',this.level.stars,this.collectedStars]] as const){
   for(const item of items){if(collected.has(item.id))continue;const point=this.position(item);if(Math.abs(s.x-point.x)<(kind==='star'?.47:.43)&&Math.abs(s.y+.8-point.y)<(kind==='star'?.65:.72)){collected.add(item.id);if(kind==='coin')s.coins++;else s.stars++;s.animation='collect';this.effectTimer=.16;this.events.push({type:kind,id:item.id});}}
  }
  if(s.grounded&&s.standing){const standing=this.platforms.find(platform=>platform.id===s.standing);if(standing?.collapse&&(standing.collapsePhase||'stable')==='stable'){standing.collapsePhase='shaking';standing.collapseTime=0;}}
  if(s.grounded){
   const previousCheckpoint=this.level.checkpoints.findIndex(checkpoint=>checkpoint.id===s.checkpointId);
   for(let index=0;index<this.level.checkpoints.length;index++){const checkpoint=this.level.checkpoints[index],point=this.position(checkpoint);if(s.standing===checkpoint.platformId&&s.x>=point.x&&index>previousCheckpoint){s.checkpointId=checkpoint.id;this.events.push({type:'checkpoint',id:checkpoint.id});}}
   const discovery=this.position(this.level.discovery);if(!s.discoveryFound&&(this.pendingDiscovery||(s.standing===this.level.discovery.platformId&&Math.abs(s.x-discovery.x)<.65))){s.discoveryFound=true;s.status='discovery';s.vx=s.vy=0;this.clearInput();this.events.push({type:'discovery',id:this.pendingDiscovery||this.level.discovery.factId});this.pendingDiscovery=null;return;}
   const finish=this.position(this.level.finish);if(s.standing===this.level.finish.platformId&&s.x>=finish.x){s.status='completed';s.animation='celebrate';s.vx=s.vy=0;this.clearInput();this.events.push({type:'finish'});return;}
  }
  if(this.effectTimer<=0)s.animation=s.climbing?'climb':!s.grounded?(s.vy>0?'jump':'fall'):Math.abs(s.vx)>.12?'run':'idle';
 }
}

/** Perspective side-follow framing is bounded to the authored course. */
export function cameraFrame(level:LevelDefinition,x:number,y:number,aspect:number){
 return referenceCameraFrame(level,x,y,aspect);
}
