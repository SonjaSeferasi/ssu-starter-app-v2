import {validateLevel} from './level-manifest';
import {headroomConflicts,playRoute} from './level-analysis';
import {analyzeDifficulty} from './difficulty';
import {criticalPath,criticalPlatforms,finishNode,optionalPath,reachable,routeGraphFor,startNode} from './route-graph';
import type {LevelDefinition,RouteEdge,RouteGraph} from './game-types';

export type ValidationCheck={id:number;name:string;ok:boolean;detail:string};
export type ValidationReport={levelId:string;ok:boolean;checks:ValidationCheck[];completionSeconds?:number};

/** Timings an edge is tried at: across the slowest relevant cycle (moving
 * platform, swing, gust or a timed hazard beside the edge), so a jump that
 * only works at one lucky moment fails. Static edges are tried once. */
function timings(level:LevelDefinition,platformIds:string[]){
 const span=level.platforms.filter(p=>platformIds.includes(p.id)),left=Math.min(...span.map(p=>p.x))-1,right=Math.max(...span.map(p=>p.x+p.width))+1;
 const periods=[...span.filter(p=>p.motion).map(p=>p.period),...(level.zones||[]).map(z=>z.period),...level.hazards.filter(h=>h.cycle&&h.x<right&&h.x+h.width>left).map(h=>h.cycle!.period)];
 const period=periods.length?Math.max(...periods):0;return period?[0,.25,.5,.75].map(f=>f*period):[0];
}

/** Physically verify one edge: start on the edge's source platform at each
 * timing and let the input-only bot try to reach the target without damage.
 * A gate edge starts where its pressure plate is, so the gate can open. */
export function verifyEdge(level:LevelDefinition,graph:RouteGraph,edge:RouteEdge){
 const node=new Map(graph.nodes.map(n=>[n.id,n])),from=node.get(edge.from)!.platformId,to=node.get(edge.to)!.platformId;

 let start=from;
 if(edge.action==='PASS_GATE'){const plate=(level.switches||[]).find(s=>s.platformId===from)||(level.switches||[])[0];if(plate)start=plate.platformId;}
 // A switch-raised platform is sunk until its plate is pressed: start on the
 // plate's platform and play the route from there through this edge.
 const raised=[from,to].map(id=>level.platforms.find(p=>p.id===id)!.raise).find(Boolean),plate=raised&&(level.switches||[]).find(s=>s.id===raised.switchId);
 let route=start===from?[from,to]:[start,from,to].filter((id,i,list)=>list.indexOf(id)===i);
 if(plate&&plate.platformId!==from){
  start=plate.platformId;const critical=criticalPlatforms(graph),order=critical.includes(from)?critical:optionalPath(graph),a=order.indexOf(start),b=order.indexOf(from);
  route=a>=0&&b>a?[...order.slice(a,b+1).filter((id,i,list)=>list.indexOf(id)===i),to]:[start,from,to];
 }
 const failures:number[]=[];
 for(const time of timings(level,[from,to])){
  const run=playRoute(level,route,{start:{platformId:start,time,offset:start===level.spawn.platformId?level.spawn.offset:undefined},stopAt:to,maxFrames:1800});
  if(run.damage>0||!run.visited.includes(to))failures.push(Math.round(time*100)/100);
 }
 return{ok:!failures.length,failures};
}

/** The 15 checks every level must pass before it is offered for human review.
 * Graph checks run first; physics checks drive the real simulation. */
export function validateLevelDesign(source:LevelDefinition,options:{physics?:boolean}={}):ValidationReport{
 const checks:ValidationCheck[]=[],check=(name:string,ok:boolean,detail:string)=>{checks.push({id:checks.length+1,name,ok,detail});};
 let level:LevelDefinition;
 try{level=validateLevel(source);check('Manifest schema and bounds',true,'validateLevel accepted the configuration.');}
 catch(error){check('Manifest schema and bounds',false,String(error instanceof Error?error.message:error));return{levelId:String((source as {id?:string}).id),ok:false,checks};}
 const graph=routeGraphFor(level),start=startNode(graph),finish=finishNode(graph),platformIds=new Set(level.platforms.map(p=>p.id));
 check('One START on the spawn and one FINISH on the goal',graph.nodes.filter(n=>n.type==='START').length===1&&graph.nodes.filter(n=>n.type==='FINISH').length===1&&start?.platformId===level.spawn.platformId&&finish?.platformId===level.finish.platformId,`START ${start?.platformId??'missing'}, FINISH ${finish?.platformId??'missing'}.`);
 const covered=new Set(graph.nodes.map(n=>n.platformId)),orphans=[...platformIds].filter(id=>!covered.has(id));
 check('Every playable platform is part of the route graph',!orphans.length,orphans.length?`Not in the graph: ${orphans.join(', ')}.`:`${graph.nodes.length} nodes cover ${platformIds.size} platforms.`);
 const path=criticalPath(graph);
 check('FINISH is reachable from START by mandatory edges',path.length>1,path.length?`Critical path of ${path.length} nodes.`:'No mandatory path.');
 const fromStart=start?reachable(graph,start.id):new Set<string>(),unreached=graph.nodes.filter(n=>!fromStart.has(n.id)).map(n=>n.id);
 check('Every node is reachable from START',!unreached.length,unreached.length?`Unreachable: ${unreached.join(', ')}.`:'All nodes reachable.');
 const dead=graph.nodes.filter(n=>finish&&!reachable(graph,n.id).has(finish.id)).map(n=>n.id);
 check('No dead ends: every node can still reach FINISH',!dead.length,dead.length?`Dead ends: ${dead.join(', ')}.`:'Optional branches all rejoin the route.');
 const pathPlatforms=criticalPlatforms(graph),finishX=level.platforms.find(p=>p.id===level.finish.platformId)!.x,checkpointXs=level.checkpoints.map(c=>level.platforms.find(p=>p.id===c.platformId)!.x+c.offset).sort((a,b)=>a-b);
 const spacing=[0,...checkpointXs,finishX].slice(1).map((x,i,list)=>x-(i?list[i-1]:0)),offPath=level.checkpoints.filter(c=>!pathPlatforms.includes(c.platformId)).map(c=>c.id);
 check('Checkpoints lie on the critical path and split it fairly',!offPath.length&&level.checkpoints.length>0&&Math.max(...spacing)<=finishX*.6,offPath.length?`Off the path: ${offPath.join(', ')}.`:`Largest stretch without a checkpoint: ${Math.max(...spacing).toFixed(1)} units of ${finishX.toFixed(1)}.`);
 const loose=[...level.coins,...level.stars].filter(item=>!covered.has(item.platformId)).map(item=>item.id),hiddenStars=level.stars.filter(star=>pathPlatforms.includes(star.platformId)&&graph.nodes.find(n=>n.platformId===star.platformId)?.type!=='OPTIONAL_REWARD');
 check('Collectibles sit on graph nodes; stars reward an optional route',!loose.length&&hiddenStars.length<level.stars.length,loose.length?`Off-graph collectibles: ${loose.join(', ')}.`:`${level.stars.length-hiddenStars.length} of 3 stars are off the critical path.`);
 const blocked=headroomConflicts(level,pathPlatforms);
 check('No solid geometry intrudes into headroom on the critical path',!blocked.length,blocked.length?blocked.map(b=>`${b.blocker} over ${b.under}`).join('; '):'Headroom clear.');
 const difficulty=analyzeDifficulty(level),extreme=difficulty.jumps.filter(j=>j.gapPercent>85||j.stepPercent>70);
 check('Every mandatory jump fits the measured jump envelope',!extreme.length,`Dmax ${difficulty.envelope.dmax.toFixed(2)}, Hmax ${difficulty.envelope.hmax.toFixed(2)}; hardest gap ${Math.max(0,...difficulty.jumps.map(j=>j.gapPercent)).toFixed(0)}%, step ${Math.max(0,...difficulty.jumps.map(j=>j.stepPercent)).toFixed(0)}%.`);
 check('Measured tier matches the declared tier',!level.difficultyTier||difficulty.measuredTier===level.difficultyTier,`Declared ${level.difficultyTier??'none'}, measured ${difficulty.measuredTier} (score ${difficulty.score.toFixed(2)}).`);
 const unpaired=(level.gates||[]).filter(gate=>!(level.switches||[]).some(s=>s.gateIds.includes(gate.id)&&level.platforms.find(p=>p.id===s.platformId)!.x<gate.x)).map(g=>g.id);
 check('Every gate is opened by a plate placed before it',!unpaired.length,unpaired.length?`No earlier plate for: ${unpaired.join(', ')}.`:`${(level.gates||[]).length} gate(s) paired.`);
 if(options.physics===false)return{levelId:level.id,ok:checks.every(c=>c.ok),checks};
 const mandatory=graph.edges.filter(e=>e.mandatory),failed=mandatory.map(edge=>({edge,result:verifyEdge(level,graph,edge)})).filter(item=>!item.result.ok);
 check('Physics: every mandatory edge succeeds at every timing',!failed.length,failed.length?failed.map(f=>`${f.edge.from}→${f.edge.to} fails at t=${f.result.failures.join('/')}`).join('; '):`${mandatory.length} edges verified at up to 4 timings each.`);
 const optional=graph.edges.filter(e=>!e.mandatory),optionalFailed=optional.map(edge=>({edge,result:verifyEdge(level,graph,edge)})).filter(item=>!item.result.ok);
 check('Physics: every optional edge succeeds at every timing',!optionalFailed.length,optionalFailed.length?optionalFailed.map(f=>`${f.edge.from}→${f.edge.to} fails at t=${f.result.failures.join('/')}`).join('; '):`${optional.length} optional edges verified.`);
 const runs=[0,.7,1.9,3.1].map(wait=>({wait,run:playRoute(level,pathPlatforms,{wait,maxFrames:20000})})),bad=runs.filter(r=>r.run.simulation.state.status!=='completed'||r.run.damage>0);
 const seconds=runs[0].run.simulation.state.elapsedSeconds,target=level.design?.targetDurationSeconds;
 check('Physics: full runs from four start delays finish without damage',!bad.length,bad.length?bad.map(b=>`wait ${b.wait}s: ${b.run.simulation.state.status}, ${b.run.damage} hit(s)`).join('; '):`Completed in ${seconds.toFixed(1)} s with no damage at every start delay.`);
 check('Completion time suits the target duration',!target||(seconds>=target*.35&&seconds<=target*1.3),target?`Bot ${seconds.toFixed(1)} s vs target ${target} s (a person exploring takes longer).`:'No target declared.');
 return{levelId:level.id,ok:checks.every(c=>c.ok),checks,completionSeconds:seconds};
}
