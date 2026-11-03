import * as T from 'three';
import {Builder,v3} from '../../kit/common';

/** Original procedural building studies for the Africa levels. Each helper
 * adds to a Builder, so a whole town merges into one draw. None of these is a
 * measured model of a protected monument; they follow the building tradition
 * (Sudano-Sahelian mud brick, Mediterranean whitewash, thatched rondavels,
 * dry-stone walling...) at game scale. */
type V=[number,number,number];

/** Sudano-Sahelian adobe: a battered wall with rounded parapet cones and
 * protruding toron beams, as on the mosques of Djenné and Agadez. */
export function adobeWall(b:Builder,at:V,w:number,h:number,d:number,colour='#b9875a',torons=true){
 const [x,y,z]=at;b.add(new T.CylinderGeometry(.5,.5,1,4,1).rotateY(Math.PI/4),colour,[x,y+h/2,z],[0,0,0],[w*1.38,h,d*1.38],.06);
 for(let i=0;i<=Math.round(w/1.4);i++){const px=x-w/2+i*w/Math.round(w/1.4);b.add(new T.ConeGeometry(.32,1.3,7),colour,[px,y+h+.5,z+d/2-.25],[0,0,0],[1,1,1],.05);if(torons)for(let k=1;k<Math.floor(h/1.4);k++)b.add(new T.CylinderGeometry(.05,.05,.7,5).rotateX(Math.PI/2),'#5a432e',[px,y+k*1.4,z+d/2+.2]);}
}
/** A tapering mud-brick minaret with toron beams and a cone finial. */
export function adobeTower(b:Builder,at:V,h:number,base=1.6,colour='#b9875a'){
 const [x,y,z]=at;b.add(new T.CylinderGeometry(base*.42,base*.72,h,4,1).rotateY(Math.PI/4),colour,[x,y+h/2,z],[0,0,0],[1,1,1],.05);
 for(let k=1;k<h/1.1;k++)for(const s of [-1,0,1])b.add(new T.CylinderGeometry(.045,.045,.8,5).rotateX(Math.PI/2),'#5a432e',[x+s*base*.28*(1-k*1.1/h*.4),y+k*1.1,z+base*.5*(1-k*1.1/h*.4)]);
 b.add(new T.ConeGeometry(base*.35,1.2,8),colour,[x,y+h+.5,z]);b.add(new T.SphereGeometry(.16,8,6),'#e9dcc0',[x,y+h+1.2,z]);
}
/** Whitewashed cube house with a door, small windows and an optional dome. */
export function cubeHouse(b:Builder,at:V,size:[number,number,number],palette:{wall:string;door:string;trim?:string},dome=false){
 const [x,y,z]=at,[w,h,d]=size;b.add(new T.BoxGeometry(w,h,d),palette.wall,[x,y+h/2,z],[0,0,0],[1,1,1],.03);
 b.add(new T.BoxGeometry(.7,1.3,.06),palette.door,[x,y+.65,z+d/2+.03]);b.add(new T.CylinderGeometry(.35,.35,.06,10,1,false,0,Math.PI).rotateX(Math.PI/2).rotateZ(Math.PI/2),palette.door,[x,y+1.3,z+d/2+.03]);
 for(const s of [-1,1])if(w>2.2)b.add(new T.BoxGeometry(.4,.5,.06),palette.trim||palette.door,[x+s*w*.3,y+h*.65,z+d/2+.03]);
 b.add(new T.BoxGeometry(w+.12,.14,d+.12),palette.trim||palette.wall,[x,y+h+.07,z]);
 if(dome)b.add(new T.SphereGeometry(Math.min(w,d)*.36,12,8,0,Math.PI*2,0,Math.PI/2),palette.trim||palette.wall,[x,y+h+.1,z]);
}
/** Round thatched hut (rondavel): mud wall, conical grass roof, door. */
export function rondavel(b:Builder,at:V,radius=1.2,palette:{wall:string;thatch:string;door?:string}={wall:'#b98b5f',thatch:'#c9a35a'}){
 const [x,y,z]=at;b.add(new T.CylinderGeometry(radius,radius*1.04,1.5,14),palette.wall,[x,y+.75,z],[0,0,0],[1,1,1],.05);
 b.add(new T.ConeGeometry(radius*1.32,1.7,16),palette.thatch,[x,y+2.3,z],[0,0,0],[1,1,1],.08);b.add(new T.ConeGeometry(.12,.5,6),palette.thatch,[x,y+3.3,z]);
 b.add(new T.BoxGeometry(.6,1.05,.08),palette.door||'#3d2c20',[x,y+.53,z+radius+.01]);
}
/** A fortified tower-house (Batammariba takienta, Saharan ksar): mud
 * turrets with thatched or flat caps joined by a wall. */
export function towerHouse(b:Builder,at:V,palette:{wall:string;cap:string},turrets=3,flat=false){
 const [x,y,z]=at;for(let i=0;i<turrets;i++){const a=i/turrets*Math.PI*2,tx=x+Math.cos(a)*1.1,tz=z+Math.sin(a)*.8,h=2.4+(i%2)*.5;b.add(new T.CylinderGeometry(.62,.72,h,12),palette.wall,[tx,y+h/2,tz],[0,0,0],[1,1,1],.05);b.add(flat?new T.CylinderGeometry(.7,.66,.18,12):new T.ConeGeometry(.9,1.2,12),palette.cap,[tx,y+h+(flat?.09:.55),tz]);}
 b.add(new T.CylinderGeometry(1.35,1.4,1.3,16),palette.wall,[x,y+.65,z],[0,0,0],[1,.9,.75],.04);b.add(new T.BoxGeometry(.55,.9,.1),'#3d2c20',[x,y+.45,z+1.08]);
}
/** A house on stilts over water with a thatched or tin roof and a ladder. */
export function stiltHouse(b:Builder,at:V,w=2.6,d=2.2,palette:{wood:string;roof:string;wall?:string}={wood:'#6b5138',roof:'#b99a5a'}){
 const [x,y,z]=at;for(const sx of [-1,1])for(const sz of [-1,1])b.add(new T.CylinderGeometry(.07,.08,2.6,6),palette.wood,[x+sx*w*.42,y+1.3,z+sz*d*.42]);
 b.add(new T.BoxGeometry(w+.3,.14,d+.3),palette.wood,[x,y+2.6,z]);b.add(new T.BoxGeometry(w,1.5,d),palette.wall||'#8a6a48',[x,y+3.4,z],[0,0,0],[1,1,1],.06);
 const roof=new T.CylinderGeometry(.01,1,1,4,1);roof.rotateY(Math.PI/4);b.add(roof,palette.roof,[x,y+4.7,z],[0,0,0],[w*.95,1.1,d*.95],.08);
 for(let k=0;k<5;k++)b.add(new T.BoxGeometry(.5,.05,.06),palette.wood,[x+w*.2,y+.5*k+.2,z+d/2+.35]);
}
/** A wooden boat: dhow or dugout pirogue, with optional lateen sail. */
export function boat(b:Builder,at:V,length:number,palette:{hull:string;trim:string;sail?:string},rotation=0){
 const [x,y,z]=at,g=new T.SphereGeometry(1,14,6,0,Math.PI*2,Math.PI/2,Math.PI/2);g.scale(length/2,.45,.42);g.rotateZ(Math.PI);b.add(g,palette.hull,[x,y+.45,z],[0,rotation,0],[1,1,1],.05);
 b.add(new T.BoxGeometry(length*.94,.06,.86),palette.trim,[x,y+.46,z],[0,rotation,0]);
 if(palette.sail){b.add(new T.CylinderGeometry(.04,.05,length*.7,5),'#5a432e',[x,y+length*.35,z],[0,rotation,0]);const s=new T.BufferGeometry();s.setAttribute('position',new T.Float32BufferAttribute([-length*.45,length*.62,0,length*.32,length*.12,0,-length*.05,length*.12,0],3));s.computeVertexNormals();b.add(s,palette.sail,[x,y+.2,z],[0,rotation,0]);}
}
/** Dry-stone coursed wall (Great Zimbabwe), with a chevron band near the top. */
export function dryStoneWall(b:Builder,at:V,w:number,h:number,d=1,colour='#9b8f7c',chevron=true){
 const [x,y,z]=at;b.add(new T.BoxGeometry(w,h,d),colour,[x,y+h/2,z],[0,0,0],[1,1,1],.05);
 for(let yy=.3;yy<h;yy+=.3)b.add(new T.BoxGeometry(w+.02,.02,d+.02),'#7f7462',[x,y+yy,z]);
 if(chevron)for(let i=0;i<w/.5;i++)b.add(new T.BoxGeometry(.32,.06,.04),'#c2b59c',[x-w/2+.25+i*.5,y+h-.5+(i%2?.08:-.08),z+d/2+.01],[0,0,i%2?.6:-.6]);
}
/** A free-standing column with a simple capital and base. */
export function pillar(b:Builder,at:V,h:number,r:number,colour:string,broken=0){
 const [x,y,z]=at,hh=h*(1-broken);b.add(new T.BoxGeometry(r*2.6,.3,r*2.6),colour,[x,y+.15,z]);b.add(new T.CylinderGeometry(r*.92,r,hh,12),colour,[x,y+.3+hh/2,z],[0,0,0],[1,1,1],.05);
 if(!broken)b.add(new T.BoxGeometry(r*2.5,.32,r*2.5),colour,[x,y+.3+hh+.16,z]);
}
/** A lighthouse with banded tower and lantern. */
export function lighthouse(b:Builder,at:V,h:number,bands:[string,string]){
 const [x,y,z]=at;for(let i=0;i<6;i++)b.add(new T.CylinderGeometry(.9-(i+1)*.06,.9-i*.06,h/6,14),bands[i%2],[x,y+h/12+i*h/6,z]);
 b.add(new T.CylinderGeometry(.5,.5,.9,10),'#f7e7a8',[x,y+h+.45,z]);b.add(new T.ConeGeometry(.65,.7,10),'#2f3a40',[x,y+h+1.25,z]);
}
/** A colonial fort bastion: thick sloping walls, crenellations, a gun port. */
export function fortWall(b:Builder,at:V,w:number,h:number,colour='#e8e1d0'){
 const [x,y,z]=at;b.add(new T.BoxGeometry(w,h,2),colour,[x,y+h/2,z],[0,0,0],[1,1,1],.03);
 for(let i=0;i<w/.9;i++)b.add(new T.BoxGeometry(.45,.5,.5),colour,[x-w/2+.3+i*.9,y+h+.25,z+.75]);
 b.add(new T.CylinderGeometry(.18,.18,.4,8).rotateX(Math.PI/2),'#2b2b2b',[x,y+h*.6,z+1.05]);
}
/** A cylinder bundle used for termite mounds: tall, fluted, earth-red. */
export function termiteMound(b:Builder,at:V,h:number,colour='#b0633e'){
 const [x,y,z]=at;for(let i=0;i<5;i++){const a=i*1.3,rr=.35+(i%2)*.12;b.add(new T.ConeGeometry(rr,h*(.6+(i%3)*.2),7),colour,[x+Math.cos(a)*.3,y+h*(.3+(i%3)*.1),z+Math.sin(a)*.25],[0,0,0],[1,1,1],.08);}
}
/** A stele carved with false windows and doors (Aksumite style). */
export function stele(b:Builder,at:V,h:number,colour='#8a8578'){
 const [x,y,z]=at;b.add(new T.BoxGeometry(1.1,h,.6),colour,[x,y+h/2,z],[0,0,0],[1,1,1],.03);const top=new T.CylinderGeometry(.55,.55,.6,12,1,false,0,Math.PI);top.rotateX(Math.PI/2);top.rotateZ(Math.PI/2);b.add(top,colour,[x,y+h,z]);
 for(let k=1;k<h/1.3;k++)for(const s of [-1,1])b.add(new T.BoxGeometry(.24,.32,.04),'#5f5b52',[x+s*.25,y+k*1.3,z+.31]);
}
export const point=(x:number,y:number,z:number)=>v3(x,y,z);
