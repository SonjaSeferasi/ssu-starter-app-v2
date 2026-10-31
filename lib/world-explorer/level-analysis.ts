import {FIXED_STEP,LevelSimulation,platformOffset} from './simulation';
import {platformSurfaceY} from './platform-surface';
import type {LevelDefinition,PlatformDefinition,SimulationEvent} from './game-types';

/** Authoring checks shared by tests and level designers. They read the same
 * physics block as the game, so a changed jump height re-validates every route. */
export type Leap={from:string;to:string;gap:number;rise:number;reach:number;ok:boolean};

/** Reachable envelope of a platform's walking surface over its motion. */
export const extent=(p:PlatformDefinition)=>{
 if(p.motion==='pendulum'){const length=p.length||4,rise=length*(1-Math.cos(Math.asin(Math.min(.95,p.amplitude/length))));return{left:p.x-p.amplitude,right:p.x+p.width+p.amplitude,top:p.y+rise,low:p.y,bottom:p.y-p.thickness,leftY:p.y,rightY:p.y};}
 const h=p.motion==='horizontal'?p.amplitude:0,v=p.motion==='vertical'?p.amplitude:0,bob=p.bob||0,slope=p.slope||0;
 return{left:p.x-h,right:p.x+p.width+h,top:p.y+Math.max(0,slope)+v+bob,low:p.y+Math.min(0,slope)-v-bob,bottom:p.y+Math.min(0,slope)-v-bob-p.thickness,leftY:p.y,rightY:p.y+slope};
};

/** Worst-case horizontal gap and rise for each consecutive pair in a route,
 * against the farthest a running jump can travel at that height. */
export function routeLeaps(level:LevelDefinition,route:string[]):Leap[]{
 const {gravity,jumpSpeed,runSpeed,playerRadius}=level.physics,byId=new Map(level.platforms.map(p=>[p.id,p]));
 return route.slice(1).map((id,i)=>{
  const a=byId.get(route[i])!,b=byId.get(id)!,ea=extent(a),eb=extent(b);
  // A player waits for a moving platform, so a leap is judged at the closest
  // approach of the two platforms, from the top of its travel (riding a lift up).
  // Slopes and stairs are judged at the edges the player actually leaves from and lands on.
  const gap=Math.max(0,eb.left-ea.right),rise=(b.motion?eb.low:eb.leftY)-(a.motion?ea.top:ea.rightY);
  const discriminant=jumpSpeed**2-2*gravity*rise,reach=discriminant>0?runSpeed*(jumpSpeed+Math.sqrt(discriminant))/gravity:0;
  const reverse=b.x+b.width<=a.x;return{from:a.id,to:b.id,gap,rise,reach,ok:!reverse&&discriminant>0&&gap+playerRadius*2+.4<reach};
 });
}

/** Platforms whose solid body intrudes into the standing space above a route
 * platform would act as an invisible wall for a walking player. */
export function headroomConflicts(level:LevelDefinition,route:string[]){
 const byId=new Map(level.platforms.map(p=>[p.id,p])),height=level.physics.playerHeight,conflicts:{under:string;blocker:string}[]=[];
 for(const id of route){
  const floor=byId.get(id)!,f=extent(floor);
  for(const other of level.platforms){
   if(other.id===floor.id)continue;const o=extent(other);
   if(o.right<=f.left+.05||o.left>=f.right-.05)continue;
   if(o.top<=f.low+.05)continue;
   if(o.bottom<f.top+height+.05)conflicts.push({under:floor.id,blocker:other.id});
  }
 }
 return conflicts;
}

/** The bonus path a player follows for every star: the upper route, then the
 * main route after the point where the two rejoin. */
export function starPath(level:LevelDefinition){
 const main=level.mainRoute||[],upper=level.upperRoute||[],join=main.indexOf(upper.at(-1)||'');
 return join>=0?[...upper,...main.slice(join+1)]:upper;
}

/** A jump plan: hold right until `release` frames, or throughout. A climb plan
 * also keeps jump held, which is how a player climbs a climbable face. */
type Plan={release:number;hold:'right'|'none';jumpHold?:boolean};
const plans:Plan[]=[{release:999,hold:'right'},{release:30,hold:'none'},{release:22,hold:'none'},{release:16,hold:'none'},{release:10,hold:'none'},{release:5,hold:'none'},{release:0,hold:'none'},{release:999,hold:'right',jumpHold:true}];
/** Optional detours that make a run less tidy than a speed-runner's: on first
 * landing on a named platform, `pause` idles there and `backtrack` walks back
 * along it (never off it) for the given time before carrying on. */
export type Detour={platformId:string;kind:'pause'|'backtrack';seconds:number};

/** An input-driven player for automated route tests. It only presses left,
 * right and jump; a look-ahead copy of the real simulation decides when a
 * jump or a moving landing is safe. It never teleports or edits the state. */
export function playRoute(level:LevelDefinition,route:string[],options:{collectStars?:boolean;collectCoins?:boolean;maxFrames?:number;start?:{platformId:string;offset?:number;time?:number};stopAt?:string;wait?:number;detours?:Detour[]}={}){
 const simulation=new LevelSimulation(level),index=new Map(route.map((id,i)=>[id,i])),visited:string[]=[],events:SimulationEvent[]=[];
 const unsafe=(list:SimulationEvent[])=>list.some(event=>event.type==='damage'||event.type==='failed');
 // A validator may start the player on any route platform at a chosen time:
 // the clock and moving platforms are set first, then the player stands there.
 if(options.start){
  const s=simulation.state,time=options.start.time||0;s.elapsedSeconds=time;
  for(const platform of simulation.platforms){const offset=platformOffset(platform,time);platform.x=platform.baseX+offset.x;platform.y=platform.baseY+offset.y-(platform.raise?platform.raise.drop:0);}
  const host=simulation.platforms.find(p=>p.id===options.start!.platformId)!;s.x=host.x+(options.start.offset??Math.min(.6,host.width/2));s.y=platformSurfaceY(host,s.x);s.standing=host.id;s.grounded=true;
 }
 // An optional idle at the start shifts every later timing (gusts, lifts, patrols).
 for(let frame=0;frame<Math.round((options.wait||0)*60);frame++){simulation.setInput({left:false,right:false,jump:false});simulation.advance(FIXED_STEP);}
 let target=0,air:Plan|null=null,airFrames=0,backing=0,furthest=-Infinity,progressAt=0;const hits:{x:number;y:number;standing:string|null}[]=[],skipped=new Set<string>(),tries=new Map<string,number>();
 const detours=new Map((options.detours||[]).map(d=>[d.platformId,d])),detourKind:{value?:Detour['kind']}={};let detourFrames=0;
 // Simulate a plan from now; succeed when standing on a later route platform
 // (or this one, beyond an obstacle) for a settled moment without damage.
 const attempt=(plan:Plan,jump:boolean,from:number,horizon=110)=>{
  const copy=simulation.clone(),startX=copy.state.x;let settled=0;
  for(let frame=0;frame<(plan.jumpHold?Math.max(horizon,260):horizon);frame++){
   const right=plan.hold==='right'||frame<plan.release;copy.setInput({left:false,right,jump:jump&&(!!plan.jumpHold||frame<2)});
   const happened=copy.advance(FIXED_STEP);if(unsafe(happened))return false;
   if(copy.state.status==='discovery')copy.resume();
   if(copy.state.status==='completed')return true;
   if(options.stopAt&&happened.some(event=>event.type==='bounce'&&event.id===options.stopAt))return true;
   const at=copy.state.grounded&&copy.state.standing?index.get(copy.state.standing):undefined;
   // Landing anywhere off this route (another branch) is not this route's move.
   if(copy.state.grounded&&copy.state.standing&&at===undefined&&!copy.state.standing.startsWith('block:'))return false;
   if(at!==undefined&&(at>from||(at===from&&copy.state.x>startX+.6&&frame>8))){if(++settled>=14)return true;}else if(!copy.state.grounded)settled=0;
  }
  return false;
 };
 const walkSafe=(frames:number)=>{const ice=simulation.platforms.find(p=>p.id===simulation.state.standing)?.surface==='ice';frames=ice?Math.ceil(frames/(level.physics.iceGrip??.3)):frames;const copy=simulation.clone();copy.setInput({left:false,right:true,jump:false});for(let i=0;i<frames;i++){if(unsafe(copy.advance(FIXED_STEP)))return false;if(copy.state.status==='discovery')copy.resume();}return copy.state.grounded;};
 for(let frame=0;frame<(options.maxFrames??30000);frame++){
  const s=simulation.state;
  if(s.status==='discovery')simulation.resume();
  if(s.status==='completed'||s.status==='failed')break;
  // Give up after 40 s without new ground: a stuck bot must not run forever.
  if(s.x>furthest+.5){furthest=s.x;progressAt=frame;}else if(frame-progressAt>2400)break;
  if(options.stopAt&&s.grounded&&s.standing===options.stopAt){if(visited.at(-1)!==s.standing)visited.push(s.standing);break;}
  if(s.grounded&&s.standing&&index.has(s.standing)){const at=index.get(s.standing)!;if(at>=target){target=at;if(visited.at(-1)!==s.standing)visited.push(s.standing);}}
  if(detours.size&&s.grounded&&s.standing&&detours.has(s.standing)){const detour=detours.get(s.standing)!;detours.delete(s.standing);detourFrames=Math.round(detour.seconds*60);detourKind.value=detour.kind;}
  if(detourFrames>0&&s.grounded){
   detourFrames--;let left=false;
   if(detourKind.value==='backtrack'){const copy=simulation.clone();copy.setInput({left:true,right:false,jump:false});left=true;for(let i=0;i<14;i++){if(unsafe(copy.advance(FIXED_STEP))||copy.state.standing!==s.standing){left=false;break;}}}
   simulation.setInput({left,right:false,jump:false});events.push(...simulation.advance(FIXED_STEP));progressAt=frame;continue;
  }
  let input={left:false,right:true,jump:false};
  // A run-up: step back from an edge, as a person would, before a long jump.
  if(backing>0&&s.grounded){backing--;simulation.setInput({left:true,right:false,jump:false});const happened=simulation.advance(FIXED_STEP);events.push(...happened);continue;}
  if(!s.grounded){
   if(air){input.right=air.hold==='right'||airFrames<air.release;input.jump=!!air.jumpHold;airFrames++;}
  }else{
   air=null;airFrames=0;
   const here=simulation.platforms.find(p=>p.id===s.standing);
   // Optional collectibles on this platform: walk through low ones before
   // leaving it; reach high or overhanging ones with a proven jump.
   // Enemy avoidance always takes priority over collecting.
   const threatened=simulation.enemies.some(enemy=>enemy.platformId===s.standing&&enemy.x>s.x-.4&&enemy.x-s.x<4.6);
   const wanted=here&&!threatened?[...(options.collectStars?simulation.level.stars.map(item=>({item,collected:simulation.collectedStars,low:1.35})):[]),...(options.collectCoins?simulation.level.coins.map(item=>({item,collected:simulation.collectedCoins,low:1.45})):[])].filter(({item,collected,low})=>item.platformId===here.id&&!collected.has(item.id)&&!skipped.has(item.id)&&simulation.position(item).x>=s.x-(item.height>low?1.5:.3)).sort((a,b)=>a.item.offset-b.item.offset)[0]:undefined;
   const reachableOnFoot=wanted&&here&&wanted.item.height<=wanted.low&&wanted.item.offset<=here.width-.25;
   if(wanted&&reachableOnFoot&&walkSafe(12))input={left:false,right:true,jump:false};
   else if(wanted&&here){
    // Prefer a running jump that the look-ahead proves collects the item and
    // lands safely; otherwise stop beneath it and jump straight up.
    const target=wanted.item,running=plans.find(plan=>{const copy=simulation.clone();let got=false;for(let f=0;f<110;f++){copy.setInput({left:false,right:plan.hold==='right'||f<plan.release,jump:f<2});const happened=copy.advance(FIXED_STEP);if(unsafe(happened))return false;if(copy.state.status==='discovery')copy.resume();if(copy.collectedStars.has(target.id)||copy.collectedCoins.has(target.id))got=true;if(got&&copy.state.grounded&&f>6)return index.has(copy.state.standing||'');}return false;});
    const x=simulation.position(target).x,distance=x-s.x,grip=here.surface==='ice'?level.physics.iceGrip??.3:1,stopping=s.vx*s.vx/(2*level.physics.acceleration*grip)+.06,beyond=x>here.x+here.width-.3;
    if(running){input={left:false,right:running.hold==='right'||running.release>0,jump:true};air=running;airFrames=1;tries.set(target.id,(tries.get(target.id)||0)+1);}
    // An arc item past the edge is tried on the way to the edge, then given up.
    else if(beyond&&here.x+here.width-s.x>.45)input={left:false,right:true,jump:false};
    else if(beyond||(tries.get(target.id)||0)>=3)skipped.add(target.id);
    else if(Math.abs(distance)>Math.max(.12,stopping))input={left:distance<0,right:distance>0,jump:false};
    else{input={left:false,right:false,jump:Math.abs(s.vx)<.12};if(input.jump){air={release:0,hold:'none'};airFrames=1;tries.set(target.id,(tries.get(target.id)||0)+1);}}
   }else{
    const edge=here?here.x+here.width-s.x:99,enemyAhead=simulation.enemies.some(enemy=>enemy.platformId===s.standing&&enemy.x>s.x-.2&&enemy.x-s.x<4.6),windy=(simulation.level.zones||[]).some(zone=>s.x>zone.x-6&&s.x<zone.x+zone.width+2);
    // A timed hazard ahead (geyser, wave, falling ice) is judged by look-ahead too.
    const erupting=simulation.level.hazards.some(h=>h.cycle&&h.x+h.width>s.x-.4&&h.x-s.x<5.5);
    // A pressure plate ahead on this platform is walked onto, never hopped over.
    const plateAhead=(simulation.level.switches||[]).some(plate=>plate.platformId===s.standing&&simulation.position(plate).x>s.x-.3);
    if(plateAhead&&!enemyAhead&&walkSafe(10)){/* keep walking right */}
    // Before a timed hazard, walk on only while there is still room to stop
    // safely; otherwise stop and wait for the calm, and jump only if waiting
    // where you stand is not safe either.
    else if(erupting&&!enemyAhead&&edge>1.6&&!windy){
     const stopSafe=(walk:number)=>{const copy=simulation.clone();for(let f=0;f<walk+45;f++){copy.setInput({left:false,right:f<walk,jump:false});if(unsafe(copy.advance(FIXED_STEP)))return false;if(copy.state.status==='discovery')copy.resume();}return copy.state.grounded;};
     if(stopSafe(10)){/* keep walking right */}
     else if(stopSafe(0))input={left:false,right:false,jump:false};
     else{const chosen=plans.find(plan=>attempt(plan,true,target));if(chosen){input={left:false,right:chosen.hold==='right'||chosen.release>0,jump:true};air=chosen;airFrames=1;}else input={left:true,right:false,jump:false};}
    }
    else if(edge<5.5||enemyAhead||windy||erupting){
     if(!walkSafe(40)||edge<1.6||enemyAhead){
      const chosen=plans.find(plan=>attempt(plan,true,target));
      if(chosen){input={left:false,right:chosen.hold==='right'||chosen.release>0,jump:true};air=chosen;airFrames=1;}
      // With no safe jump, back away from an approaching enemy, else wait at the edge.
      else if(simulation.enemies.some(enemy=>enemy.platformId===s.standing&&Math.abs(enemy.x-s.x)<2.2))input={left:true,right:false,jump:false};
      else if(!walkSafe(18)&&!attempt({release:999,hold:'right'},false,target)){
       // Creep toward the edge while a few more steps are safe, then wait there.
       input={left:false,right:edge>.7&&walkSafe(8),jump:false};
       const room=here?s.x-here.x:0,full=simulation.clone();full.state.vx=level.physics.runSpeed;
       // Standing at the edge with no jump that works: if a running jump would, back up for one.
       if(Math.abs(s.vx)<.15&&room>1.6&&edge<1.2&&!here?.motion&&!simulation.enemies.some(enemy=>enemy.platformId===s.standing)){if(plans.some(plan=>{const copy=full.clone();for(let f=0;f<110;f++){copy.setInput({left:false,right:plan.hold==='right'||f<plan.release,jump:f<2});if(unsafe(copy.advance(FIXED_STEP)))return false;const at=copy.state.grounded&&copy.state.standing?index.get(copy.state.standing):undefined;if(at!==undefined&&at>target&&f>10)return true;}return false;}))backing=Math.min(36,Math.round((room-.6)/level.physics.runSpeed*60));}
      }
     }
    }
   }
  }
  const before={x:simulation.state.x,y:simulation.state.y,standing:simulation.state.standing};
  simulation.setInput(input);const happened=simulation.advance(FIXED_STEP);events.push(...happened);
  // A bounce pad is reached when it launches the player; nobody stands on one.
  if(options.stopAt&&happened.some(event=>event.type==='bounce'&&event.id===options.stopAt)){visited.push(options.stopAt);break;}
  if(happened.some(event=>event.type==='damage'))hits.push(before);
  // A respawn returns to an earlier checkpoint; resume the route from there.
  if(happened.some(event=>event.type==='respawn')){target=index.get(simulation.state.standing||'')??0;air=null;}
 }
 return{simulation,visited,events,hits,discoveries:events.filter(event=>event.type==='discovery').length,damage:events.filter(event=>event.type==='damage').length};
}
