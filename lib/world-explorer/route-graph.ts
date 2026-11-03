import type {LevelDefinition,RouteAction,RouteEdge,RouteGraph,RouteNode,RouteNodeType} from './game-types';

/** The level's route graph. Redesigned levels author one; older levels get a
 * graph derived from their main and upper platform routes so every level can
 * be validated, measured and compared the same way. */
export function routeGraphFor(level:LevelDefinition):RouteGraph{
 if(level.routeGraph)return level.routeGraph;
 const byId=new Map(level.platforms.map(p=>[p.id,p])),nodes=new Map<string,RouteNode>(),edges:RouteEdge[]=[];
 const typeOf=(id:string):RouteNodeType=>{
  if(id===level.spawn.platformId)return'START';if(id===level.finish.platformId)return'FINISH';
  if(level.checkpoints.some(c=>c.platformId===id))return'CHECKPOINT';if(level.discovery.platformId===id)return'DISCOVERY';
  if((level.enemies||[]).some(e=>e.platformId===id))return'ENEMY_AREA';const p=byId.get(id)!;
  if(p.motion)return'MOVING_PLATFORM';if(p.route==='upper'||p.route==='bonus')return'OPTIONAL_REWARD';return'JUMP_PLATFORM';
 };
 const add=(route:string[]|undefined,mandatory:boolean)=>{
  if(!route)return;
  for(const id of route)if(!nodes.has(id))nodes.set(id,{id,type:typeOf(id),platformId:id});
  for(let i=1;i<route.length;i++){
   const from=route[i-1],to=route[i];if(edges.some(e=>e.from===from&&e.to===to))continue;
   const target=byId.get(to)!,action:RouteAction=target.motion?'RIDE_PLATFORM':'JUMP';edges.push({from,to,action,mandatory});
  }
 };
 add(level.mainRoute||level.platforms.filter(p=>p.route!=='upper'&&p.route!=='bonus').sort((a,b)=>a.x-b.x).map(p=>p.id),true);add(level.upperRoute,false);
 return{nodes:[...nodes.values()],edges};
}

const neighbours=(graph:RouteGraph,from:string,mandatoryOnly:boolean)=>graph.edges.filter(e=>e.from===from&&(!mandatoryOnly||e.mandatory)).map(e=>e.to);
export function reachable(graph:RouteGraph,start:string,mandatoryOnly=false){const seen=new Set([start]),queue=[start];while(queue.length){const id=queue.shift()!;for(const next of neighbours(graph,id,mandatoryOnly))if(!seen.has(next)){seen.add(next);queue.push(next);}}return seen;}
export function startNode(graph:RouteGraph){return graph.nodes.find(n=>n.type==='START');}
export function finishNode(graph:RouteGraph){return graph.nodes.find(n=>n.type==='FINISH');}

/** The mandatory path from START to FINISH (shortest by edges), as nodes. */
export function criticalPath(graph:RouteGraph){
 const start=startNode(graph),finish=finishNode(graph);if(!start||!finish)return[];
 const previous=new Map<string,string>(),queue=[start.id],seen=new Set([start.id]);
 while(queue.length){const id=queue.shift()!;if(id===finish.id)break;for(const next of neighbours(graph,id,true))if(!seen.has(next)){seen.add(next);previous.set(next,id);queue.push(next);}}
 if(!seen.has(finish.id))return[];
 const path=[finish.id];while(path[0]!==start.id)path.unshift(previous.get(path[0])!);
 return path.map(id=>graph.nodes.find(n=>n.id===id)!);
}
/** A full run through every optional branch: the critical path, detouring
 * along each optional chain from where it leaves to where it rejoins. */
export function optionalPath(graph:RouteGraph){
 const critical=criticalPath(graph).map(n=>n.id),out:string[]=[];
 for(let i=0;i<critical.length;i++){
  const id=critical[i];out.push(id);
  const branch=graph.edges.find(e=>e.from===id&&!e.mandatory);if(!branch)continue;
  let at=branch.to;const chain:string[]=[];
  while(!critical.includes(at)&&chain.length<50){chain.push(at);const next=graph.edges.find(e=>e.from===at);if(!next)break;at=next.to;}
  const rejoin=critical.indexOf(at);if(rejoin>i){out.push(...chain);i=rejoin-1;}
 }
 return out.map(id=>graph.nodes.find(n=>n.id===id)!.platformId);
}

/** Platform ids along the critical path, in order (consecutive repeats merged). */
export function criticalPlatforms(graph:RouteGraph){return criticalPath(graph).map(n=>n.platformId).filter((id,i,list)=>id!==list[i-1]);}
