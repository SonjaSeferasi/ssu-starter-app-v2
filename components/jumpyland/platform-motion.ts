import type {Course,Platform} from './levels';
export type MovingLanding=Platform & {axis:'x'|'y';travel:number;period:number;phase:number};
// Optional rides sit above broad safe landings, so no special equipment or
// perfect timing is required on the main route.
export function movingLandings(course:Course):MovingLanding[]{
 return [1,4,7].filter(i=>course.ledges[i]).map((i,index)=>{
  const p=course.ledges[i];
  return {...p,axis:index===1?'y':'x',travel:index===1?14:24,period:5600+index*700,phase:0};
 });
}
export function landingPosition(p:MovingLanding,elapsed:number){
 const offset=Math.sin(elapsed/p.period*Math.PI*2+p.phase)*p.travel;
 return {x:p.x+(p.axis==='x'?offset:0),y:p.y+(p.axis==='y'?offset:0)};
}
