import {FIXED_STEP,LevelSimulation,hazardAt} from './simulation';
import {platformSurfaceY} from './platform-surface';
import type {LevelDefinition} from './game-types';

/** Bounded input-only smoke driver for the Southeast Asia regional batch. Unlike the
 * authoring solver it performs no speculative simulation clones. It cannot
 * certify arbitrary designs; failures identify a route for manual correction. */
export function playSoutheastAsiaRoute(level:LevelDefinition,path:string[],options:{wait?:number;collect?:boolean;maxFrames?:number;stopAt?:string}={}){
 const simulation=new LevelSimulation(level),visited=new Set<string>(),events:string[]=[],coinEvents:string[]=[],starEvents:string[]=[],checkpointSnapshots:LevelSimulation[]=[];
 let target=0,lastGround=path[0],reward:string|null=null,rewardJump=false,returnPlate:string|null=null;
 for(let frame=0;frame<(options.maxFrames??9000);frame++){
  const s=simulation.state;if(['completed','failed'].includes(s.status))break;if(s.status==='discovery')simulation.resume();
  const here=simulation.platforms.find(p=>p.id===s.standing);
  if(here&&s.grounded){visited.add(here.id);lastGround=here.id;const i=path.indexOf(here.id);if(i>=target)target=i;}
  if(s.grounded&&s.standing===options.stopAt)break;
  const next=simulation.platforms.find(p=>p.id===path[target+1]);
  let left=false,right=true,jump=false,interact=false;
  if(frame<(options.wait??0)*60)right=false;
  else if(options.collect){
   if(!reward&&s.grounded&&here){
    const item=[...level.coins,...level.stars].find(item=>item.platformId===here.id&&!simulation.collectedStars.has(item.id)&&!simulation.collectedCoins.has(item.id)&&simulation.position(item).x>s.x-2.5&&simulation.position(item).x-s.x<1.7);
    if(item){reward=item.id;rewardJump=false;}
   }
  }
  if(reward){
   const item=[...level.coins,...level.stars].find(item=>item.id===reward)!,x=simulation.position(item).x,d=x-s.x,braking=s.vx*s.vx/(2*level.physics.acceleration)+.06;
   right=!rewardJump&&s.grounded&&d>Math.max(.12,braking);left=!rewardJump&&s.grounded&&d< -Math.max(.12,braking);
   if(item.height>1.6&&!rewardJump&&s.grounded&&Math.abs(d)<.4&&Math.abs(s.vx)<.1){jump=true;rewardJump=true;}
   if((item.height<=1.6||rewardJump&&s.grounded)&&(simulation.collectedCoins.has(reward)||simulation.collectedStars.has(reward))){reward=null;rewardJump=false;}
  }else if(s.grounded&&here&&next){
   const currentEnd=here.x+here.width,gap=next.x-currentEnd,rise=platformSurfaceY(next,next.x)-platformSurfaceY(here,currentEnd);
   if(s.x>currentEnd-.72&&(gap>.15||rise>.4))jump=true;
   if(next.motion&&rise>1.65&&s.x>currentEnd-1.3){right=false;jump=false;}
   // Ride an ascending lift until its exit fits a normal jump. This is input
   // waiting, never a change to the platform phase or player position.
   if(here.motion==='vertical'&&rise>1.4&&s.x>currentEnd-1.3){right=false;jump=false;}
   if(here.climbable&&rise>1.7)jump=true;
  }
  if(!s.grounded&&next){
   const previous=simulation.platforms.find(p=>p.id===lastGround)!;
   if(s.x>next.x+next.width*.55||next.y<previous.y-1.5&&s.x>next.x+next.width*.35)right=false;
  }
  if(next?.climbable&&s.x>next.x-.8&&s.x<next.x+next.width&&s.y<next.y+.1){right=true;jump=true;}
  if(simulation.enemies.some(e=>e.x>s.x-.1&&e.x-s.x<2.7)&&s.grounded)jump=true;
  // A missed or expired plate is a real puzzle action: return to it, press it
  // again and then approach the gate. The driver never changes gate state.
  if(!reward&&s.grounded){
   const closed=level.gates?.find(g=>g.x>s.x-.15&&g.x-s.x<1.2&&simulation.gates.find(state=>state.id===g.id)!.timer<=0);
   if(closed)returnPlate=level.switches?.find(p=>p.gateIds.includes(closed.id))?.id||null;
   const plate=returnPlate&&level.switches?.find(p=>p.id===returnPlate);
   if(plate){
    if(plate.gateIds.some(id=>simulation.gates.find(g=>g.id===id)!.timer>0))returnPlate=null;
    else{const point=simulation.position(plate);left=s.x>point.x+.1;right=s.x<point.x-.1;jump=false;}
   }
  }
  if(frame<(options.wait??0)*60)left=right=jump=false;
  // Wait before a warned steam corridor until the entire crossing window is
  // calm. This reads the actual shared hazard cycle and supplies input only.
  if(s.grounded&&right){
   const hazard=level.hazards.find(h=>h.x>s.x+.15&&h.x-s.x<2.4);
   if(hazard&&Array.from({length:10},(_,i)=>hazardAt(hazard,s.elapsedSeconds+i*.15).phase).some(phase=>phase!=='calm'))left=right=jump=false;
  }
  // A real mirror action: approach its pedestal, turn until the receiver is
  // lit, then wait for its charge. No mirror or gate state is injected.
  for(const puzzle of level.lightPuzzles||[]){const point=simulation.position(puzzle),state=simulation.lightPuzzles.find(p=>p.id===puzzle.id)!;if(s.grounded&&s.standing===puzzle.platformId&&s.x<point.x+2&&!reward&&frame>=(options.wait??0)*60&&state.charge<puzzle.chargeSeconds){const delta=point.x-s.x;right=delta>.2;left=delta<-.2;jump=false;if(Math.abs(delta)<.3){right=left=false;interact=!state.lit&&frame%12===0;}}}
  simulation.setInput({left,right,jump,...(level.lightPuzzles?.length?{interact}:{})});
  for(const event of simulation.advance(FIXED_STEP)){events.push(event.type);if(event.type==='coin')coinEvents.push(event.id!);if(event.type==='star')starEvents.push(event.id!);if(event.type==='checkpoint')checkpointSnapshots.push(simulation.clone());}
 }
 return{simulation,visited,events,coinEvents,starEvents,checkpointSnapshots,debug:{reward,returnPlate}};
}

