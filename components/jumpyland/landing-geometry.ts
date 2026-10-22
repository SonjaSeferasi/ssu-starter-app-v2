import type {Course,Platform} from './levels';
import {surfaceY} from './terrain';

export const PLAYER_HEIGHT=145;
export const PLAYER_HALF_WIDTH=21;
export const MUSHROOM_PROFILE=[[0,1.47],[.33,1.44],[.58,1.36],[.74,1.23],[.82,1.1]] as const;
export function landingHeight(p:Platform,x:number){
  if(p.kind==='bridge')return p.y+Math.sin(Math.max(0,Math.min(1,(x-p.x)/p.width))*Math.PI)*22;
  if(p.kind==='mushroom'){
    const radius=Math.min(.82,Math.abs((x-p.x)/p.width*2-1)*.82);
    for(let i=1;i<MUSHROOM_PROFILE.length;i++){const a=MUSHROOM_PROFILE[i-1],b=MUSHROOM_PROFILE[i];if(radius<=b[0])return p.y+(1.47-(a[1]+(b[1]-a[1])*(radius-a[0])/(b[0]-a[0])))*135;}
  }
  if(p.kind&&p.kind!=='rock')return p.y;
  // Translation must not change a moving platform's authored ridge shape.
  const origin=(p as Platform&{profileX?:number}).profileX??p.x;
  return surfaceY({...p,x:origin},origin+x-p.x);
}
// The renderer and collision solver use the same underside, in centimeters.
export function landingBottom(course:Course,p:Platform){
  if(p.kind==='deck'||p.kind==='bamboo'||p.kind==='bridge')return p.y+32;
  if(p.kind==='brick')return p.y+50;
  if(p.kind==='mushroom')return p.y+195;
  if(course.number===1&&course.platforms.includes(p))return 1600;
  return p.y+(course.ledges.includes(p)?40:150+p.width*.2);
}
export type Clearance={left:number;right:number;top:number;bottom:number};
export function safeRespawn(base:Platform,preferred:number,blockers:Clearance[]){
  const margin=PLAYER_HALF_WIDTH+5,min=base.x+margin,max=base.x+base.width-margin;
  const candidates=[Math.max(min,Math.min(max,preferred))];
  for(let px=min;px<=max;px+=8)candidates.push(px);
  candidates.sort((a,b)=>Math.abs(a-preferred)-Math.abs(b-preferred));
  for(const x of candidates){
    const y=landingHeight(base,x);
    if(!blockers.some(b=>x+PLAYER_HALF_WIDTH>b.left&&x-PLAYER_HALF_WIDTH<b.right&&b.top<y-2&&b.bottom>y-PLAYER_HEIGHT-8))return{x,y};
  }
  return null;
}
