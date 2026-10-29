import type {LevelDefinition} from './game-types';

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

/** Frame the authored Japan composition: broad left cliff, lower bridge and
 * elevated reward together. Small jumps stay inside a vertical dead zone. */
export function referenceCameraFrame(level:LevelDefinition,x:number,y:number,aspect:number){
 const first=level.platforms[0],last=level.platforms.find(p=>p.id===level.finish.platformId)!;
 if(level.countryId!=='JP'){
  const lead=aspect<1?2.8:5.5,finish=last.x+last.width;
  return{x:clamp(x+lead,first.x+lead,Math.max(first.x+lead,finish-lead)),y:clamp(y+3.6,2.8,5.8),z:aspect<1?25:19,lookY:clamp(y+1.9,1.3,3.9)};
 }
 const ratio=Math.max(.35,Math.min(aspect,2.4)),z=ratio<1?29:24;
 const visibleWidth=2*Math.tan(44*Math.PI/360)*z*ratio,lead=visibleWidth*.18;
 const spawnPlatform=level.platforms.find(p=>p.id===level.spawn.platformId)!;
 const initialCenter=spawnPlatform.x+level.spawn.offset+lead;
 const rise=clamp((y-1.8)*.35,0,1.25);
 return{x:clamp(x+lead,initialCenter,Math.max(initialCenter,last.x+last.width-visibleWidth*.2)),y:4.4+rise,z,lookY:1.35+rise};
}
