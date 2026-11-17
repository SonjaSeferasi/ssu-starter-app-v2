import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cyl,roof} from './europe-landmarks';
import {Builder,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,bandedFlagTexture,bench,finishProps,flagMaterial,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Ireland: Bru na Boinne (SRS-632.18). Across the River Boyne the great
 * mound of Newgrange rises from the meadows: a grass dome behind a curving
 * wall of white quartz studded with dark cobbles, a ring of grey kerbstones
 * at its foot, the passage entrance under its roof-box and, before it, the
 * entrance stone carved with spirals. Tall standing stones ring the front,
 * and smaller mounds lie along the ridge. Around them spread small green
 * fields between hedges and dry-stone walls, with sheep, a whitewashed
 * thatched cottage, hawthorn trees and a rainbow over the far hills. Swans
 * ride the river. The route carries carved stones, stone walls, ferns and
 * wildflowers. Scenery only: nothing collides. */
const C={meadow:'#7fb45c',meadowDark:'#69a04e',field:'#8cc064',mound:'#74aa52',quartz:'#f4f2ea',cobble:'#4a4a4c',kerb:'#9a968c',kerbDark:'#7f7b72',stone:'#b0aca0',white:'#f8f6ee',thatch:'#b79a5a',thatchDark:'#9a8048',
 door:'#b23a2e',glass:'#2a3540',hedge:'#3f7a3f',wool:'#f4f1e6',face:'#2a2a2c',iron:'#22262a',wood:'#7a5c40',leaf:'#4a7d3f',fern:'#4f8f48',flower:'#f2d24a',clover:'#e85a9a',swan:'#fbfaf5',beak:'#e8892a',hill:'#6a9f52'} as const;
// The meadows, the mounds and the field walls are built here on a level bank.
const base=europeEnvironment('IRL',{landmark:false,flat:true,town:false});
export const boyne={bankTop:-1,newgrangeX:84,newgrangeZ:-37,radius:13,knowthX:30,dowthX:142} as const;

function meadows(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='boyne-meadows-and-fields';root.add(group);const s=new Builder(),w=new Builder(),top=boyne.bankTop,from=-60,to=finish+100;
 box(s,to-from,top+4.4,72,C.meadow,(from+to)/2,-4.4,-52.5);for(let k=0;k<(low?14:28);k++)s.add(new T.SphereGeometry(1,8,5),C.meadowDark,[from+k*(to-from)/(low?14:28)+r()*3,-3.4,-16.4],[0,0,0],[4,2.5,1.2]);
 // Small fields, each a slightly different green, between hedges and dry-stone walls.
 for(let k=0;k<Math.ceil((to-from)/16);k++){const fx=from+8+k*16;box(s,15.4,.06,22,k%2?C.field:C.meadowDark,fx,top,-64);if(k%2)box(w,.5,.9,22,C.hedge,fx+8,top,-64);else for(let j=0;j<(low?8:16);j++)w.add(new T.DodecahedronGeometry(.42,0),j%2?C.stone:C.kerb,[fx+8,top+.3,-53.4-j*(low?2.7:1.36)],[j,j*2,0],[1,.9,1.3]);}
 for(let x=from;x<to;x+=low?2.6:1.3)w.add(new T.DodecahedronGeometry(.44,0),(Math.floor(x)%2)?C.stone:C.kerb,[x,top+.3,-52.6],[x,x*2,0],[1.3,.9,1]);
 s.mesh(group,vertexMaterial(.97),'meadows-and-small-fields');w.mesh(group,vertexMaterial(.95),'hedges-and-dry-stone-walls');group.userData={feature:'Boyne meadows and field walls'};
}

/** A grass-domed passage mound with a kerb of great stones. */
function mound(s:Builder,k:Builder,x:number,y:number,z:number,radius:number,wall:number,dome:number,low:boolean){
 const segments=low?16:28;cyl(s,radius,radius,wall,C.mound,x,y,z,segments);s.add(new T.SphereGeometry(1,segments,low?6:10,0,Math.PI*2,0,Math.PI/2),C.mound,[x,y+wall,z],[0,0,0],[radius,dome,radius]);
 const stones=Math.round(radius*(low?1.6:3));for(let j=0;j<stones;j++){const a=j/stones*Math.PI*2;k.add(new T.DodecahedronGeometry(.5,0),j%3?C.kerb:C.kerbDark,[x+Math.cos(a)*(radius+.25),y+.35,z+Math.sin(a)*(radius+.25)],[0,-a,0],[1.5,.9,.7]);}
}

function newgrange(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='newgrange-passage-tomb';root.add(group);const s=new Builder(),k=new Builder(),q=new Builder(),x=boyne.newgrangeX,y=boyne.bankTop,z=boyne.newgrangeZ,radius=boyne.radius;
 mound(s,k,x,y,z,radius,2.8,3.6,low);
 // The front is faced with white quartz, dotted with rounded granite cobbles.
 const segments=low?16:32;q.add(new T.CylinderGeometry(radius+.06,radius+.06,2.8,segments,1,true,-Math.PI*.42,Math.PI*.84),C.quartz,[x,y+1.4,z]);
 for(let j=0;j<(low?30:80);j++){const a=-Math.PI*.4+((j*37)%100)/100*Math.PI*.8,h=.3+((j*53)%100)/100*2.2;k.add(new T.SphereGeometry(.14,6,4),C.cobble,[x+Math.sin(a)*(radius+.1),y+h,z+Math.cos(a)*(radius+.1)],[0,0,0],[1,1,.5]);}
 // The entrance: a dark passage between upright stones, the roof-box above it, and the carved entrance stone in front.
 const front=z+radius;box(k,2.2,2,.3,'#1c1c1e',x,y,front+.02);for(const side of [-1,1])box(k,.5,2.2,.7,C.kerb,x+side*1.3,y,front+.2);box(k,3.4,.4,.9,C.kerbDark,x,y+2.1,front+.2);box(k,1.4,.5,.3,'#1c1c1e',x,y+2.5,front+.1);box(k,2,.26,.8,C.kerb,x,y+3,front+.2);
 k.add(new T.DodecahedronGeometry(1,0),C.kerb,[x,y+.55,front+1.5],[0,.2,0],[1.7,.6,.42]);for(const [dx,dy,size] of [[-.7,.62,.26],[0,.7,.3],[.7,.6,.24],[-.3,.36,.16],[.38,.34,.18]] as const)for(const scale of [1,.55])q.add(new T.TorusGeometry(size*scale,.03,4,low?8:12),'#5e5a52',[x+dx,y+dy,front+1.92]);
 // The great circle: tall stones standing before the mound.
 for(const [dx,h] of [[-12,2.2],[-7.4,2.8],[-3.4,2],[4.2,2.6],[8.6,2.1],[13,2.7]] as const)k.add(new T.DodecahedronGeometry(1,0),dx%2?C.kerb:C.stone,[x+dx,y+h*.5,front+4.4+Math.abs(dx)*.12],[.1,dx,.08],[.62,h*.56,.44]);
 s.mesh(group,vertexMaterial(.97),'newgrange-grass-dome');q.mesh(group,vertexMaterial(.85),'white-quartz-wall-and-spirals');k.mesh(group,vertexMaterial(.95),'kerbstones-entrance-and-standing-stones');group.userData={landmark:'Newgrange',kerbstones:Math.round(radius*(low?1.6:3)),standingStones:6};
}

function lesserMounds(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='knowth-and-dowth-mounds';root.add(group);const s=new Builder(),k=new Builder(),y=boyne.bankTop;
 mound(s,k,boyne.knowthX,y,-36,8,1.4,2.8,low);for(const [dx,dz,radius] of [[-12,3,2.6],[-8,-9,2.2],[11,2,2.8],[9,-8,2.2],[0,10,2]] as const)mound(s,k,boyne.knowthX+dx,y,-36+dz,radius,.5,1.3,low);mound(s,k,boyne.dowthX,y,-38,9,1.2,3.4,low);
 s.mesh(group,vertexMaterial(.97),'lesser-mound-domes');k.mesh(group,vertexMaterial(.95),'lesser-mound-kerbs');group.userData={landmark:'Knowth and Dowth',mounds:7};
}

function cottageAndFlock(root:T.Object3D,finish:number,flag:T.Material,r:()=>number,low:boolean){
 const group=new T.Group();group.name='thatched-cottage-and-sheep';root.add(group);const s=new Builder(),p=new Builder(),y=boyne.bankTop,cx=4,cz=-25;
 box(s,8,2.4,4.4,C.white,cx,y,cz-2.2);roof(p,8.7,2.6,5.2,C.thatch,cx,y+2.4,cz-2.2);box(p,8.9,.26,5.4,C.thatchDark,cx,y+2.3,cz-2.2);box(p,.9,1.8,.08,C.door,cx-.6,y,cz+.04);for(const dx of [-2.8,1.6,3])box(p,.8,.8,.08,C.glass,cx+dx,y+1,cz+.04);for(const dx of [-3.6,3.6])box(p,.7,1.4,.7,C.white,cx+dx,y+3.6,cz-2.2);
 for(let k=0;k<(low?6:12);k++)p.add(new T.DodecahedronGeometry(.38,0),k%2?C.stone:C.kerb,[cx-6+k*1.05,y+.28,cz+2.6],[k,k*2,0],[1.3,.9,1]);cyl(p,.05,.08,5.4,C.white,cx+6.4,y,cz+1.6,6);
 // Sheep graze the meadow.
 for(let k=0;k<(low?10:22);k++){const sx=-40+r()*(finish+120),sz=-20-r()*9;if(Math.abs(sx-boyne.newgrangeX)<boyne.radius+6&&sz<-19||Math.abs(sx-cx)<7)continue;const turn=r()>.5?1:-1;s.add(new T.SphereGeometry(1,8,6),C.wool,[sx,y+.56,sz],[0,0,0],[.52,.36,.34]);p.add(new T.SphereGeometry(.15,6,5),C.face,[sx+turn*.56,y+.62,sz]);for(const dx of [-.26,.26])for(const dz of [-.14,.14])box(p,.06,.3,.06,C.face,sx+dx,y,sz+dz);}
 s.mesh(group,vertexMaterial(.95),'cottage-walls-and-fleeces');p.mesh(group,vertexMaterial(.8),'thatch-door-and-sheep-faces');wavingFlag(group,flag,cx+6.46,y+4.6,cz+1.6,2,'ireland-flag',.6);group.userData={feature:'Thatched cottage and sheep'};
}

/** A faint rainbow over the far hills. */
function rainbow(root:T.Object3D,finish:number,low:boolean){
 const group=new T.Group();group.name='boyne-rainbow';root.add(group);['#e0403a','#f08a2a','#f2d53c','#57b45a','#3f8fd0','#6a58c0'].forEach((color,index)=>{const arc=new T.Mesh(new T.TorusGeometry(30-index*.7,.36,4,low?24:48,Math.PI),new T.MeshBasicMaterial({color,transparent:true,opacity:.32,depthWrite:false}));arc.name='rainbow-band';arc.castShadow=false;group.add(arc);});group.position.set(finish*.62,-3,-104);group.userData={feature:'Rainbow'};
}

function swans(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='boyne-swans';root.add(group);const b=new Builder();for(let k=0;k<(low?2:4);k++){const x=k*1.9,z=(k%2)*1.3;b.add(new T.SphereGeometry(1,10,7),C.swan,[x,-2.3,z],[0,0,0],[.52,.26,.3]);const a=new T.Vector3(x+.34,-2.2,z),m=new T.Vector3(x+.5,-1.85,z),t=new T.Vector3(x+.42,-1.55,z),h=new T.Vector3(x+.6,-1.56,z);b.strut(a,m,.07,C.swan,6,.9);b.strut(m,t,.06,C.swan,6,.9);b.strut(t,h,.06,C.swan,6,.8);b.strut(h,new T.Vector3(x+.76,-1.62,z),.035,C.beak,5,.5);}
 b.mesh(group,vertexMaterial(.7),'swans');group.userData={animated:true};return group;
}

// Route furniture, in a platform's own coordinates, behind the walking lane.
/** A kerbstone carved with spirals. */
function carvedStone(b:Builder,x:number,y:number,z:number){b.add(new T.DodecahedronGeometry(1,0),C.kerb,[x,y+.42,z],[0,.2,0],[1,.46,.34]);for(const [dx,size] of [[-.4,.2],[.1,.24],[.52,.17]] as const)for(const scale of [1,.5])b.add(new T.TorusGeometry(size*scale,.025,4,10),'#5e5a52',[x+dx,y+.5,z+.31]);}
function stoneWall(b:Builder,from:number,to:number,y:number,z:number){for(let x=from,k=0;x<=to;x+=.5,k++){b.add(new T.DodecahedronGeometry(.3,0),k%2?C.stone:C.kerb,[x,y+.24,z],[k,k*2,0],[1.1,.9,1]);if(k%2)b.add(new T.DodecahedronGeometry(.26,0),C.kerbDark,[x+.2,y+.62,z],[k*3,k,0],[1.1,.8,1]);}}
function ferns(b:Builder,x:number,y:number,z:number,seed:number){for(let k=0;k<6;k++){const a=k/6*Math.PI*2+seed;b.strut(new T.Vector3(x,y,z),new T.Vector3(x+Math.cos(a)*.42,y+.34,z+Math.sin(a)*.26),.05,C.fern,4,.2);}for(let k=0;k<4;k++)b.add(new T.SphereGeometry(.06,6,4),k%2?C.flower:C.clover,[x+.5+k*.2,y+.2+(k%2)*.1,z+.1]);}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'newgrange-quartz-wall-and-grass-dome','entrance-stone-spirals-and-roof-box','kerbstones-and-standing-stones','knowth-and-dowth-mounds','small-fields-hedges-and-stone-walls','thatched-cottage-and-sheep','rainbow-and-river-swans']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(35341),detail=new T.Group();detail.name='boyne-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  meadows(detail,finish,r,low);newgrange(detail,low);lesserMounds(detail,low);cottageAndFlock(detail,finish,flagMaterial(bandedFlagTexture([['#169b62',1],['#ffffff',1],['#ff883e',1]],true)),r,low);rainbow(detail,finish,low);
  const far=new T.Group();far.name='meath-hills';detail.add(far);const hills=new Builder();for(const [dx,w,h] of [[-40,50,8],[30,56,10],[100,50,9],[170,56,11],[240,50,8]] as const)hills.add(new T.SphereGeometry(1,low?12:18,low?8:10),C.hill,[dx,-4.4,-88],[0,0,0],[w,h+3.4,12],.08);hills.mesh(far,vertexMaterial(.97),'green-ridge');
  const thorns:Placement[]=[];for(let k=0;k<(low?12:26);k++){const x=-50+r()*(finish+150),z=-22-r()*30;if(Math.hypot(x-boyne.newgrangeX,z-boyne.newgrangeZ)>boyne.radius+5&&Math.hypot(x-boyne.knowthX,z+36)>16&&Math.hypot(x-boyne.dowthX,z+38)>12)thorns.push({x,y:boyne.bankTop,z,scale:.6+r()*.4,rotation:r()*6});}plantGrove(detail,'plane',thorns,{low,name:'hawthorn-trees'});
  const birds=swans(detail,low),rooks=createFlock(detail,{name:'boyne-rooks',count:low?6:12,centre:[boyne.newgrangeX,9,-30],radius:[40,3,8],speed:.26,size:.6,color:'#26282c',wing:'#1a1c20',seed:103,glide:false});
  let reduced=context.reducedMotion;const drift=(time:number)=>{birds.position.set(20+((time*.22)%(finish+10)),Math.sin(time*.9)*.02,-9+Math.sin(time*.17)*2.2);};drift(0);rooks.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;drift(time);rooks.update(time);},setReducedMotion(value){reduced=value;rooks.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.6)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*67+Math.round(definition.x),from=-w/2+.4,to=w/2-.4;
  if(t==='ground'){stoneWall(b,from,to,Math.min(surface(from),surface(to)),rear);carvedStone(b,from+1.2,surface(from+1.2),-1.6);ferns(b,to-1.4,surface(to-1.4),-1.4,seed);if(w>5)bench(b,0,surface(0),-1.9);if(w>8){b.add(new T.DodecahedronGeometry(1,0),C.kerb,[to-2.8,surface(to-2.8)+.9,-2.1],[.1,seed,.08],[.5,1,.36]);ferns(b,from+3,surface(from+3),-1.5,seed+4);}}
  else if(t==='rock'){ferns(b,0,surface(0),rear+.3,seed);if(w>3.2)b.add(new T.DodecahedronGeometry(.4,0),C.kerbDark,[from+.2,surface(from+.2)+.25,rear+.2],[seed,seed*2,0]);}
  else if(t==='stairs'){for(let x=from;x<=to;x+=1.2){cyl(b,.07,.08,.9,C.wood,x,surface(x),rear,6);}}
  finishProps(root,b,glow,'boyne-stones-walls-and-ferns');
 },
};
