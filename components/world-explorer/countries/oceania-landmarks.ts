import * as T from 'three';
import {Builder} from '../kit/common';
import {box,cyl,cone,dome,roof,house,mound,townRow,type LandmarkContext} from './europe-landmarks';

/** Original, stylized landmark compositions for the Oceania adventures, built
 * from the same parametric parts as the European ones plus a few Pacific
 * shapes (stacked basalt columns, undercut limestone islets, a trilithon).
 * Each follows the source description of its place. They are scenery only
 * and never colliders. Coordinates: x along the route, y up from the scenery
 * ground, z away from the camera (negative is further). */
const P=(x:number,y:number,z:number):[number,number,number]=>[x,y,z];
/** A low island: a flattened sand mound with a darker rim. */
function islet(b:Builder,x:number,y:number,z:number,r:number,sand:string,rim:string){b.add(new T.CylinderGeometry(r*.9,r,.5,20),rim,P(x,y+.25,z));b.add(new T.SphereGeometry(r*.9,18,6,0,Math.PI*2,0,Math.PI/2),sand,P(x,y+.5,z),[0,0,0],[1,.12,1]);}
/** A round thatched hut. */
function hut(b:Builder,x:number,y:number,z:number,r:number,wall:string,thatch:string){cyl(b,r,r,r*1.1,wall,x,y,z,10);cone(b,r*1.35,r*1.4,thatch,x,y+r*1.1,z,10);}
/** A wall of basalt columns laid in alternating courses, as at Nan Madol. */
function cribWall(b:Builder,x0:number,x1:number,y:number,z:number,courses:number,c:string,cDark:string){
 for(let k=0;k<courses;k++){const along=k%2===0,yy=y+k*.42+.21;
  if(along)b.add(new T.CylinderGeometry(.2,.2,x1-x0,6),k%4===0?c:cDark,P((x0+x1)/2,yy,z),[0,0,Math.PI/2]);
  else for(let x=x0+.2;x<x1;x+=.55)b.add(new T.CylinderGeometry(.2,.2,1.2,6),k%4===1?cDark:c,P(x,yy,z),[Math.PI/2,0,0]);}
}
/** A limestone islet undercut by the sea: a narrow foot under a forested cap. */
function mushroomIslet(b:Builder,x:number,y:number,z:number,r:number,h:number,rock:string,green:string){b.add(new T.CylinderGeometry(r*.55,r*.42,h,14),rock,P(x,y+h/2,z));b.add(new T.SphereGeometry(r,16,8,0,Math.PI*2,0,Math.PI/2),green,P(x,y+h-.2,z),[0,0,0],[1,.75,1]);}

type Compose=(b:Builder,c:LandmarkContext)=>void;
export const oceaniaLandmarks:Record<string,Compose>={
 // Levuka: a waterfront row of wooden shopfronts with verandas below forested hills, and the wharf.
 'levuka-waterfront':(b,c)=>{const {x,y,z,palette:p}=c;mound(b,x+6,y,z-34,26,12,p.foliage);townRow(b,c,x-26,x+16,z-6,'stucco');
  for(let k=0;k<10;k++){const px=x-24+k*4.2;box(b,3.8,.2,1.6,'#e8e0cc',px,y+3.2,z-4.2);for(const dx of [-1.7,1.7])cyl(b,.08,.08,3.2,'#e8e0cc',px+dx,y,z-3.5,6);}
  for(let k=0;k<8;k++)cyl(b,.2,.2,2.6,'#5e4a36',x+20+k*1.6,y-.6,z+2,6);box(b,13,.3,3,'#8a6a4c',x+25.6,y+2,z+2);},
 // Phoenix Islands: a ring of low atoll islets in deep water.
 'phoenix-atoll':(b,{x,y,z,palette:p})=>{for(let k=0;k<7;k++){const a=k/7*Math.PI*1.4+.2;islet(b,x+Math.cos(a)*22,y,z-30+Math.sin(a)*10,3+((k*5)%3),p.ground,p.rock);}},
 // Bikini: a ring of 23 islands around a lagoon; a few islets suggest the ring.
 'bikini-lagoon':(b,{x,y,z,palette:p})=>{for(let k=0;k<9;k++){const a=k/9*Math.PI*1.6+.1;islet(b,x+Math.cos(a)*28,y,z-34+Math.sin(a)*12,2.2+((k*7)%3)*.8,p.ground,p.rock);}box(b,1.2,1.6,1.2,'#d8d2c2',x-4,y+.3,z-12);},
 // Nan Madol: rectangular enclosures of crosswise basalt columns on islets, separated by canals.
 'nan-madol-walls':(b,{x,y,z,palette:p})=>{const dark='#2c2c32';
  for(const [ox,oz,w,d,h] of [[0,-18,14,10,9],[-18,-12,9,7,5],[17,-14,8,7,4]] as const){box(b,w+2,.6,d+2,p.rock,x+ox,y,z+oz);cribWall(b,x+ox-w/2,x+ox+w/2,y+.6,z+oz+d/2,h,p.stone,dark);cribWall(b,x+ox-w/2,x+ox+w/2,y+.6,z+oz-d/2,h,p.stone,dark);
   for(const s of [-1,1])for(let k=0;k<h;k++)b.add(new T.CylinderGeometry(.2,.2,d,6),k%2?p.stone:dark,P(x+ox+s*w/2,y+.6+k*.42+.21,z+oz),[Math.PI/2,0,0]);}},
 // Buada: grey coral-limestone pinnacles around the rain-fed lake.
 'buada-pinnacles':(b,{x,y,z,r,palette:p})=>{for(let k=0;k<24;k++){const a=r()*Math.PI*2,d=12+r()*10;cone(b,.6+r()*.8,2+r()*3.5,k%3?p.rock:p.stone,x+Math.cos(a)*d,y,z-22+Math.sin(a)*d*.5,7);}},
 // Aoraki / Mount Cook country: ice blocks and a grey moraine ridge on the valley floor below the snowy range.
 'aoraki-glacier':(b,{x,y,z,palette:p})=>{for(let k=0;k<6;k++)b.add(new T.BoxGeometry(2.6,1.2,1.4),'#cfe2ea',P(x-2+k*2.4,y+.6+k*.1,z-22),[0,k*.4,0]);
  for(let k=0;k<5;k++)b.add(new T.SphereGeometry(2.2,8,5,0,Math.PI*2,0,Math.PI/2),p.rock,P(x-8+k*4.5,y,z-26),[0,0,0],[1.4,.5,1]);},
 // Rock Islands: forested limestone islets undercut into mushroom shapes.
 'rock-islands':(b,{x,y,z,r,palette:p})=>{for(let k=0;k<11;k++)mushroomIslet(b,x-30+k*6+r()*3,y-1.6,z-6-r()*9,1.6+r()*2,3+r()*3,p.rock,p.foliage);},
 // Kuk: swamp gardens drained by straight ditches, with thatched huts.
 'kuk-ditches':(b,{x,y,z,palette:p})=>{for(let k=0;k<6;k++){box(b,30,.25,2.6,'#6a8a44',x-4,y,z-14-k*4);box(b,30,.08,.9,'#3c4a3a',x-4,y+.02,z-16-k*4);}
  for(let k=0;k<4;k++)hut(b,x+16+k*4,y,z-12-(k%2)*6,1.4,'#8a7050',p.roof);},
 // To Sua: a deep round pit in the lava field with sea water below and a wooden ladder.
 'to-sua-trench':(b,{x,y,z,palette:p})=>{const cx=x,cz=z-18;for(let k=0;k<16;k++){const a=k/16*Math.PI*2;b.add(new T.BoxGeometry(3.4,6,1.6),p.rock,P(cx+Math.cos(a)*8,y-3,cz+Math.sin(a)*8),[0,-a+Math.PI/2,0]);}
  b.add(new T.CylinderGeometry(7.4,7.4,.3,24),'#2fc0b8',P(cx,y-5.4,cz));for(const dx of [-.5,.5])box(b,.14,7.4,.14,'#7a5a3e',cx+dx,y-5.6,cz-6.6);for(let k=0;k<12;k++)box(b,1.1,.1,.12,'#8a6a4c',cx,y-5.2+k*.6,cz-6.6);},
 // East Rennell: raised coral cliffs around Lake Tegano.
 'tegano-lake':(b,{x,y,z,r,palette:p})=>{for(let k=0;k<12;k++)box(b,6+r()*4,3+r()*3,3,k%2?p.rock:p.stone,x-30+k*5.5,y,z-36-r()*4);},
 // Ha'amonga 'a Maui: two coral limestone pillars carrying a lintel.
 'trilithon':(b,{x,y,z,palette:p})=>{for(const s of [-1,1])box(b,1.4,5.2,1.4,p.stone,x+s*2.2,y,z-14);box(b,5.8,.5,.9,new T.Color(p.stone).multiplyScalar(.9).getStyle(),x,y+5.2,z-14);mound(b,x,y,z-14,7,.1,p.ground);},
 // Funafuti: low sandy islets with pandanus and nesting turtles on the beach.
 'funafuti-motu':(b,{x,y,z,palette:p})=>{for(let k=0;k<6;k++)islet(b,x-26+k*10,y,z-24-(k%2)*8,2.6+(k%3),p.ground,p.rock);for(let k=0;k<3;k++)dome(b,.5,'#5e6e46',x-6+k*2,y+.4,z-20,.45,10);},
 // Roi Mata's Domain: Eretoka, the hat-shaped burial island, offshore; a village on the shore.
 'eretoka-hat':(b,{x,y,z,palette:p})=>{b.add(new T.CylinderGeometry(9,10,.8,24),p.ground,P(x+6,y+.4,z-40));dome(b,4.5,p.foliage,x+6,y+.8,z-40,1.1,16);
  for(let k=0;k<3;k++){box(b,3.4,1.6,2.4,'#8a7050',x-14+k*5,y,z-12);roof(b,3.8,1.6,2.8,p.roof,x-14+k*5,y+1.6,z-12);}
  house(b,x-24,y,z-14,3,1.4,2.2,'#7a6448',p.roof,0,1.2);},
};
