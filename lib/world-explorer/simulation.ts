import {validateLevel} from './level-manifest';
import type {CountryStats,LevelDefinition,PlatformState,SimulationEvent,SimulationInput,SimulationState,SimulationStatus} from './game-types';

export const FIXED_STEP=1/60;
const approach=(value:number,target:number,delta:number)=>value<target?Math.min(target,value+delta):Math.max(target,value-delta);
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

/** Pure, deterministic side-scrolling simulation. Rendering never changes its
 * positions or collision definitions; it reads the result of fixed 60Hz ticks. */
export class LevelSimulation{
 readonly level:LevelDefinition;
 readonly platforms:PlatformState[];
 readonly collectedCoins=new Set<string>();
 readonly collectedStars=new Set<string>();
 readonly state:SimulationState;
 private input:SimulationInput={left:false,right:false,jump:false};
 private accumulator=0;
 private jumpBuffer=0;
 private coyote=.12;
 private effectTimer=0;
 private respawnTimer=0;
 private resumeStatus:SimulationStatus='playing';
 private events:SimulationEvent[]=[];

 constructor(level:LevelDefinition){
  this.level=validateLevel(level);this.platforms=this.level.platforms.map(p=>({...p,baseX:p.x,baseY:p.y,dx:0,dy:0}));
  const spawn=this.position(this.level.spawn);this.state={x:spawn.x,y:spawn.y,z:0,vx:0,vy:0,grounded:true,standing:this.level.spawn.platformId,hearts:3,coins:0,stars:0,checkpointId:null,discoveryFound:false,elapsedSeconds:0,status:'playing',animation:'idle',facing:1,invulnerable:0};
 }
 position(item:{platformId:string;offset:number;height?:number}){const p=this.platforms.find(p=>p.id===item.platformId);if(!p)throw new Error('Missing platform reference.');return{x:p.x+item.offset,y:p.y+(item.height||0),z:0};}
 setInput(input:SimulationInput){if(input.jump&&!this.input.jump&&this.state.status==='playing')this.jumpBuffer=this.level.physics.jumpBuffer;this.input={...input};}
 clearInput(){this.input={left:false,right:false,jump:false};this.jumpBuffer=0;}
 pause(){if(this.state.status==='playing'||this.state.status==='respawning'){this.resumeStatus=this.state.status;this.state.status='paused';this.accumulator=0;this.clearInput();}}
 resume(){if(this.state.status==='paused'||this.state.status==='discovery'){this.state.status=this.state.status==='discovery'?'playing':this.resumeStatus;this.accumulator=0;this.clearInput();}}
 stats():CountryStats{return{hearts:this.state.hearts,coins:this.state.coins,totalCoins:this.level.coins.length,stars:this.state.stars,totalStars:this.level.stars.length,checkpointActive:this.state.checkpointId!==null,timeSeconds:Math.floor(this.state.elapsedSeconds),discoveryFound:this.state.discoveryFound};}
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
 private step(){
  const s=this.state,p=this.level.physics,dt=FIXED_STEP;s.elapsedSeconds+=dt;s.invulnerable=Math.max(0,s.invulnerable-dt);this.effectTimer=Math.max(0,this.effectTimer-dt);
  for(const platform of this.platforms){const oldX=platform.x,oldY=platform.y,wave=Math.sin(s.elapsedSeconds*Math.PI*2/platform.period+platform.phase)*platform.amplitude;platform.x=platform.baseX+(platform.motion==='horizontal'?wave:0);platform.y=platform.baseY+(platform.motion==='vertical'?wave:0);platform.dx=platform.x-oldX;platform.dy=platform.y-oldY;}
  if(s.status==='respawning'){this.respawnTimer-=dt;if(this.respawnTimer<=0)this.recover();return;}
  if(s.status!=='playing')return;
  this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);this.coyote=s.grounded?p.coyoteTime:Math.max(0,this.coyote-dt);
  if(s.grounded&&s.standing){const standing=this.platforms.find(platform=>platform.id===s.standing)!;s.x+=standing.dx;s.y=standing.y;}
  const direction=Number(this.input.right)-Number(this.input.left);if(direction)s.facing=direction>0?1:-1;
  s.vx=approach(s.vx,direction*p.runSpeed,p.acceleration*(s.grounded?1:p.airControl)*dt);
  if(this.jumpBuffer>0&&this.coyote>0){s.vy=p.jumpSpeed;s.grounded=false;s.standing=null;this.coyote=this.jumpBuffer=0;s.animation='jump';this.effectTimer=0;}
  const oldX=s.x,oldY=s.y;s.x+=s.vx*dt;
  if(s.grounded&&s.standing){const platform=this.platforms.find(platform=>platform.id===s.standing)!;if(s.x<platform.x-p.playerRadius*.55||s.x>platform.x+platform.width+p.playerRadius*.55){s.grounded=false;s.standing=null;}}
  if(!s.grounded){s.vy-=p.gravity*dt;s.y+=s.vy*dt;}

  // Swept top/underside tests avoid tunnelling through a cap on a slow frame.
  if(!s.grounded){
   for(const platform of this.platforms){
    const overlaps=s.x+p.playerRadius>platform.x&&s.x-p.playerRadius<platform.x+platform.width;if(!overlaps)continue;
    if(s.vy<=0&&oldY>=platform.y-.04&&s.y<=platform.y){s.y=platform.y;s.vy=0;s.grounded=true;s.standing=platform.id;s.animation='land';this.effectTimer=.1;break;}
    const bottom=platform.y-platform.thickness;
    if(s.vy>0&&oldY+p.playerHeight<=bottom+.02&&s.y+p.playerHeight>=bottom){s.y=bottom-p.playerHeight;s.vy=0;}
   }
  }
  // Side walls are solid below the walking cap. Decorations are never colliders.
  for(const platform of this.platforms){
   if(s.y>=platform.y-.04||s.y+p.playerHeight<=platform.y-platform.thickness+.02)continue;
   if(oldX+p.playerRadius<=platform.x&&s.x+p.playerRadius>platform.x){s.x=platform.x-p.playerRadius;s.vx=0;}
   else if(oldX-p.playerRadius>=platform.x+platform.width&&s.x-p.playerRadius<platform.x+platform.width){s.x=platform.x+platform.width+p.playerRadius;s.vx=0;}
  }
  if(s.y<p.killY||s.x<-1){this.damage();return;}
  if(s.invulnerable<=0&&this.level.hazards.some(h=>s.x+p.playerRadius>h.x&&s.x-p.playerRadius<h.x+h.width&&s.y<h.y+h.height&&s.y+p.playerHeight>h.y)){this.damage();return;}

  for(const [kind,items,collected] of [['coin',this.level.coins,this.collectedCoins],['star',this.level.stars,this.collectedStars]] as const){
   for(const item of items){if(collected.has(item.id))continue;const point=this.position(item);if(Math.abs(s.x-point.x)<(kind==='star'?.47:.43)&&Math.abs(s.y+.8-point.y)<(kind==='star'?.65:.72)){collected.add(item.id);if(kind==='coin')s.coins++;else s.stars++;s.animation='collect';this.effectTimer=.16;this.events.push({type:kind,id:item.id});}}
  }
  if(s.grounded){
   for(const checkpoint of this.level.checkpoints){const point=this.position(checkpoint);if(s.standing===checkpoint.platformId&&s.x>=point.x&&!s.checkpointId){s.checkpointId=checkpoint.id;this.events.push({type:'checkpoint',id:checkpoint.id});}}
   const discovery=this.position(this.level.discovery);if(!s.discoveryFound&&s.standing===this.level.discovery.platformId&&Math.abs(s.x-discovery.x)<.65){s.discoveryFound=true;s.status='discovery';s.vx=s.vy=0;this.clearInput();this.events.push({type:'discovery',id:this.level.discovery.factId});return;}
   const finish=this.position(this.level.finish);if(s.standing===this.level.finish.platformId&&s.x>=finish.x){s.status='completed';s.animation='celebrate';s.vx=s.vy=0;this.clearInput();this.events.push({type:'finish'});return;}
  }
  if(this.effectTimer<=0)s.animation=!s.grounded?(s.vy>0?'jump':'fall'):Math.abs(s.vx)>.12?'run':'idle';
 }
}

/** Perspective side-follow framing is bounded to the authored course. */
export function cameraFrame(level:LevelDefinition,x:number,y:number,aspect:number){
 const first=level.platforms[0],last=level.platforms.at(-1)!,finish=last.x+last.width,lead=aspect<1?2.8:5.5;
 return{x:clamp(x+lead,first.x+lead,Math.max(first.x+lead,finish-lead)),y:clamp(y+3.6,2.8,5.8),z:aspect<1?25:19,lookY:clamp(y+1.9,1.3,3.9)};
}
