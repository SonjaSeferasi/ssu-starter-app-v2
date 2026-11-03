import type {LightPuzzleDefinition} from './game-types';

/** Reflect a normalized incoming ray about the selected mirror normal. */
export function traceLight(p:LightPuzzleDefinition,mirror:{x:number;y:number},index:number){
 const normal=p.normals[index],incoming={x:mirror.x-p.emitter.x,y:mirror.y-p.emitter.y},length=Math.hypot(incoming.x,incoming.y),nl=Math.hypot(...normal);
 const dx=incoming.x/length,dy=incoming.y/length,nx=normal[0]/nl,ny=normal[1]/nl,dot=dx*nx+dy*ny,ray={x:dx-2*dot*nx,y:dy-2*dot*ny};
 const rx=p.receiver.x-mirror.x,ry=p.receiver.y-mirror.y,t=rx*ray.x+ry*ray.y,miss=Math.hypot(rx-t*ray.x,ry-t*ray.y);
 const blocked=(p.occluders||[]).some(box=>{
  let near=0,far=t;for(const [origin,direction,min,max]of [[mirror.x,ray.x,box.x,box.x+box.width],[mirror.y,ray.y,box.y,box.y+box.height]]){if(Math.abs(direction)<1e-8){if(origin<min||origin>max)return false;}else{const a=(min-origin)/direction,b=(max-origin)/direction;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));}}return near<far&&far>0;
 });
 const lit=t>0&&t<=p.range&&miss<=p.receiver.radius&&!blocked,travel=lit?t:p.range;
 return{lit,blocked,ray,end:{x:mirror.x+ray.x*travel,y:mirror.y+ray.y*travel}};
}
