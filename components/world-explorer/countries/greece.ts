import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cyl,roof} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,column,finishProps,flagMaterial,texturedStone,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Greece: the Acropolis of Athens (SRS-632.3). The Sacred Rock rises behind
 * the route with its long retaining wall; on top stand the Parthenon's Doric
 * colonnade (its south flank broken, as it is today), the Propylaia gateway,
 * the small temple of Athena Nike on its bastion and the Erechtheion with the
 * porch of the six maidens. Below are the arched front of the Odeon of
 * Herodes Atticus and the arcade of the Stoa of Eumenes; white Athens and
 * Lycabettus hill lie beyond. The route passes fallen drums, column stubs,
 * amphorae and olive trees. Scenery only: no colliders, nothing in the lane. */
const C={marble:'#efe7d3',marbleWarm:'#e6d9bb',marbleShade:'#cbbd9f',rock:'#ece4d2',rockDark:'#cfc5b0',wall:'#f0e7d2',earth:'#c9c08f',dark:'#3b3028',white:'#f4f1e8',roofTile:'#c98a5e',
 olive:'#8a9a66',trunk:'#6f5a43',clay:'#b9663f',bronze:'#8a6a3a',rope:'#b58d5a',agave:'#6f8f73',blue:'#0d5eaf'} as const;
const base=europeEnvironment('GRC',{landmark:false});
export const acropolis={rockTop:8.6,rock:[62,180] as const,parthenonX:126,propylaiaX:86,erechtheionX:158,odeonX:60} as const;
const marble=()=>texturedStone('paris-stone','#fbf4e2',1.4,.86);
const openings={frame:C.marbleShade,glass:C.dark};

/** The Greek flag: nine stripes and a white cross on the blue canton. */
function greekFlagTexture(){
 const blue=[13,94,175],white=[255,255,255];
 return pixelTexture(54,(u,v)=>{const row=Math.min(8,Math.floor((1-v)*9));let c=row%2?white:blue;
  if(u<.37&&row<5){const cx=Math.abs(u-.185),cy=Math.abs((1-v)-5/18);c=cx<.037||cy<1/18?white:blue;}
  return[c[0],c[1],c[2],255];},true,false);
}

function sacredRock(root:T.Object3D,finish:number,low:boolean){
 const group=new T.Group();group.name='sacred-rock';root.add(group);const b=new Builder(.5),r=random(3317),[from,to]=acropolis.rock,top=acropolis.rockTop;
 box(b,to-from,top+5,22,C.rock,(from+to)/2,-5,-33);
 // Craggy buttresses and ledges break the south face.
 for(let x=from+1;x<to;x+=low?5:2.6){const h=5+r()*7,w=2.4+r()*2.6;box(b,w,h,1.6+r()*1.6,r()>.5?C.rock:C.rockDark,x,-5,-21.4+r()*.8,(r()-.5)*.3);if(r()>.5)box(b,w*.6,h*.5,1.2,C.rockDark,x+r(),-5+h,-21.8,(r()-.5)*.5);}
 // The long retaining wall of dressed blocks crowns the rock.
 box(b,to-from-10,3.4,1,C.wall,(from+to)/2+3,top-3.2,-21.6);for(let x=from+8;x<to-4;x+=7)box(b,1.2,4.4,1.3,C.wall,x,top-4.2,-21.3);
 // The talus slope below, stepped down to the route.
 for(let step=0;step<3;step++)box(b,finish+90,2.2,5-step,C.earth,finish/2,-5+step*1.9,-17.5-step*1.2);
 // Pale grey-ochre limestone, like the rock itself.
 b.mesh(group,texturedStone('paris-stone','#fff7e8',.5,.97),'acropolis-rock-and-walls');group.userData={landmark:'Acropolis rock',height:top+5};
}

function parthenon(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='parthenon';root.add(group);const b=new Builder(.5),x=acropolis.parthenonX,y=acropolis.rockTop,z=-32,length=35,width=15,h=5.3,flank=17,front=8,spacing=(length-2)/(flank-1),across=(width-2)/(front-1);
 for(let step=0;step<3;step++)box(b,length+1.6-step*.5,.36,width+1.6-step*.5,C.marbleWarm,x,y+step*.36,z);
 const base=y+1.08,ruined=(k:number)=>k>=6&&k<=10;let standing=0;
 for(const side of [1,-1])for(let k=0;k<flank;k++){const broken=side===1&&ruined(k),height=broken?h*(.35+((k*37)%10)/22):h;column(b,x-length/2+1+k*spacing,base,z+side*(width/2-1),.47,height,C.marble,low?8:14);if(!broken)standing++;}
 for(const end of [-1,1])for(let k=1;k<front-1;k++){column(b,x+end*(length/2-1),base,z-width/2+1+k*across,.47,h,C.marble,low?8:14);standing++;}
 // Architrave, triglyph frieze and cornice; missing over the broken south bays.
 const top=base+h,beam=(fromX:number,toX:number,zz:number)=>{box(b,toX-fromX,.62,1.1,C.marble,(fromX+toX)/2,top,zz);box(b,toX-fromX,.6,1.02,C.marbleWarm,(fromX+toX)/2,top+.62,zz);box(b,toX-fromX+.2,.24,1.3,C.marble,(fromX+toX)/2,top+1.22,zz);
  if(!low)for(let tx=fromX+.4;tx<toX;tx+=1.05)box(b,.3,.5,.06,C.marbleShade,tx,top+.67,zz+(zz>z?.52:-.52));};
 beam(x-length/2+.4,x-length/2+1+5.5*spacing,z+width/2-1);beam(x-length/2+1+10.5*spacing,x+length/2-.4,z+width/2-1);beam(x-length/2+.4,x+length/2-.4,z-width/2+1);
 for(const end of [-1,1]){box(b,1.1,1.46,width-1,C.marble,x+end*(length/2-1),top,z);b.add(new T.CylinderGeometry(.02,(width-.6)/2,2.3,3,1),C.marbleWarm,[x+end*(length/2-1),top+1.46+.77,z],[Math.PI/2,0,end>0?Math.PI/2:-Math.PI/2],[1,.5,.66]);}
 // The cella walls stand inside the colonnade.
 box(b,length-9,h*.9,.7,C.marbleWarm,x,base,z-width/2+3.4);box(b,.7,h*.9,width-6.8,C.marbleWarm,x-length/2+4.5,base,z);box(b,.7,h*.9,width-6.8,C.marbleWarm,x+length/2-4.5,base,z);
 b.mesh(group,marble(),'parthenon-doric-colonnade');group.userData={landmark:'Parthenon',order:'Doric',columnsStanding:standing,flankColumns:flank,frontColumns:front};
}

function propylaiaAndNike(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='propylaia';root.add(group);const b=new Builder(.5),x=acropolis.propylaiaX,y=acropolis.rockTop-1.4,z=-27;
 box(b,9,.7,9,C.marbleWarm,x,y,z);for(let k=0;k<6;k++)for(const end of [-1,1])column(b,x+end*3.9,y+.7,z-3.4+k*1.36,.36,4.2,C.marble,low?8:12);
 box(b,8.6,.9,8.2,C.marble,x,y+4.9,z);roof(b,8.8,1.5,8.4,C.marbleWarm,x,y+5.8,z,Math.PI/2);box(b,6.6,4.2,.6,C.marbleWarm,x,y+.7,z-3.9);box(b,6.6,4.2,.6,C.marbleWarm,x,y+.7,z+3.9);
 // The broad ramp and steps climb to the gate from the west.
 for(let step=0;step<8;step++)box(b,1.1,.5+step*.42,7.4,C.marbleShade,x-10+step*1.1,y-3.6,z);
 // Athena Nike: a small Ionic temple on its bastion.
 const nx=x-6.5,nz=-22.6,ny=acropolis.rockTop-1;box(b,5,ny+5,4.2,C.wall,nx,-5,nz);box(b,3.4,.4,2.6,C.marbleWarm,nx,ny,nz);
 for(const end of [-1,1])for(let k=0;k<4;k++)column(b,nx+end*1.4,ny+.4,nz-.95+k*.63,.13,2,C.marble,8);box(b,2.4,1.9,1.9,C.marbleWarm,nx,ny+.4,nz);box(b,3.3,.4,2.5,C.marble,nx,ny+2.45,nz);roof(b,3.4,.7,2.6,C.marbleWarm,nx,ny+2.85,nz,Math.PI/2);
 b.mesh(group,marble(),'propylaia-and-athena-nike');group.userData={landmark:'Propylaia and Temple of Athena Nike'};
}

function erechtheion(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='erechtheion';root.add(group);const b=new Builder(.5),x=acropolis.erechtheionX,y=acropolis.rockTop,z=-37;
 box(b,9.4,.5,5.4,C.marbleWarm,x,y,z);box(b,8.4,4.1,4.4,C.marble,x,y+.5,z);box(b,8.8,.5,4.8,C.marbleWarm,x,y+4.6,z);roof(b,8.9,1.1,4.9,C.marbleWarm,x,y+5.1,z);
 for(let k=0;k<6;k++)column(b,x+4.9,y+.5,z-1.9+k*.76,.2,4,C.marble,low?8:12);box(b,1.2,.5,4.8,C.marbleWarm,x+4.9,y+4.5,z);
 // The porch of the maidens faces south: six figures carry the roof.
 const px=x-2.7,pz=z+3;box(b,3.4,1.5,1.9,C.marbleWarm,px,y+.5,pz);box(b,3.5,.34,2,C.marble,px,y+4.25,pz);
 const maidens:[number,number][]=[[-1.2,.6],[-.4,.6],[.4,.6],[1.2,.6],[-1.2,-.4],[1.2,-.4]];
 for(const [dx,dz] of maidens){cyl(b,.2,.26,1.15,C.marble,px+dx,y+2,pz+dz,8);cyl(b,.17,.2,.62,C.marble,px+dx,y+3.15,pz+dz,8);b.add(new T.SphereGeometry(.15,8,6),C.marble,[px+dx,y+3.9,pz+dz]);cyl(b,.2,.17,.2,C.marbleWarm,px+dx,y+4.03,pz+dz,8);}
 b.mesh(group,marble(),'erechtheion-and-caryatid-porch');group.userData={landmark:'Erechtheion',caryatids:maidens.length};
}

/** The Odeon of Herodes Atticus and the Stoa of Eumenes at the foot of the rock. */
function odeonAndStoa(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='odeon-of-herodes-atticus';root.add(group);const stone=new Builder(.5),plain=new Builder(),x=acropolis.odeonX,y=-1.2,z=-19;
 box(stone,19,8.2,1.3,C.wall,x,y,z);for(let row=0;row<3;row++)for(let k=0;k<(row===2?5:8);k++){const ax=x-8+k*(row===2?4:2.28)+(row===2?0:0);archedWindow(stone,plain,ax,y+.6+row*2.6,z+.66,row?1.1:1.3,row?1.3:1.5,openings);}
 // The curved seating rises behind the stage wall.
 stone.add(new T.CylinderGeometry(9.5,3.2,4.4,low?14:24,4,true,Math.PI/2,Math.PI),C.marbleWarm,[x,y+2.6,z-1.2]);
 for(let k=0;k<(low?8:16);k++){const ax=x+12+k*(low?4.2:2.1);box(stone,low?4.2:2.1,5.4,1,C.wall,ax,y,z-.2);archedWindow(stone,plain,ax,y+.5,z+.31,1.25,2.6,openings);}
 stone.mesh(group,texturedStone('ashlar','#eadfc6',1.1,.95),'odeon-stage-wall-and-stoa');plain.mesh(group,vertexMaterial(.95),'odeon-arch-shadows');group.userData={landmark:'Odeon of Herodes Atticus',arcade:'Stoa of Eumenes'};
}

/** The Olympieion's tall Corinthian columns and Hadrian's Arch, below the rock to the south-east of the start. */
function olympieion(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='olympieion';root.add(group);const b=new Builder(.5),y=-1.2,z=-21,h=6.6;
 const corinthian=(x:number,zz:number,height=h)=>{cyl(b,.34,.4,height*.86,C.marble,x,y+.3,zz,low?8:12);box(b,.95,.3,.95,C.marbleWarm,x,y,zz);cyl(b,.56,.34,height*.1,C.marbleWarm,x,y+.3+height*.86,zz,low?8:12);box(b,1.05,.14,1.05,C.marble,x,y+.3+height*.96,zz);};
 box(b,22,.5,9,C.marbleShade,3,y-.5,z-1.5);
 for(let col=0;col<6;col++)for(const row of [0,-2.2]){if(col===2&&row===0)continue;corinthian(-4+col*1.9,z+row);}
 box(b,10.4,.6,1.1,C.marble,.75,y+.3+h+.14,z-2.2);box(b,3,.6,1.1,C.marble,-3.05,y+.3+h+.14,z);box(b,5.6,.6,1.1,C.marble,3.6,y+.3+h+.14,z);
 corinthian(10,z-1);corinthian(12.4,z-2.6);b.add(new T.CylinderGeometry(.38,.38,5.4,low?8:12),C.marbleWarm,[7.2,y+.4,z+1.2],[0,.5,Math.PI/2]);
 // Hadrian's Arch: an arched gate under a small columned upper storey.
 const ax=17;box(b,1.3,4.6,1,C.marble,ax-2.3,y,z+1);box(b,1.3,4.6,1,C.marble,ax+2.3,y,z+1);box(b,5.9,1.2,1,C.marble,ax,y+3.9,z+1);b.add(new T.TorusGeometry(1.65,.3,6,12,Math.PI),C.marbleWarm,[ax,y+2.6,z+1]);
 for(const dx of [-2.3,-.8,.8,2.3])cyl(b,.13,.15,2.2,C.marble,ax+dx,y+5.1,z+1,8);box(b,5.9,.36,.9,C.marble,ax,y+7.3,z+1);roof(b,2.2,.7,.9,C.marbleWarm,ax,y+7.66,z+1,Math.PI/2);
 b.mesh(group,marble(),'olympieion-columns-and-hadrians-arch');group.userData={landmark:"Temple of Olympian Zeus and Hadrian's Arch",order:'Corinthian'};
}

/** White Athens spreads to the horizon, with Lycabettus hill and its chapel. */
function athens(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='athens-city';root.add(group);const b=new Builder();
 for(let k=0;k<(low?70:150);k++){const x=-60+r()*(finish+140),z=-50-r()*40;if(x>acropolis.rock[0]-4&&x<acropolis.rock[1]+4&&z>-58)continue;const w=2.4+r()*3,h=1.6+r()*3.4;box(b,w,h,3,r()>.25?C.white:'#e6dcc6',x,-4.8,z);if(r()>.7)box(b,w*.5,.5,1.6,'#d6cbb4',x,-4.8+h,z);}
 // Lycabettus: a rounded limestone hill with the white chapel of St George on its summit.
 const lx=finish+46;b.add(new T.SphereGeometry(1,low?12:20,low?8:12),'#8c9478',[lx,-6,-128],[0,0,0],[34,27,24],.08);b.add(new T.SphereGeometry(1,12,8),'#aaa38c',[lx,14,-128],[0,0,0],[9,7.5,8],.08);box(b,1.8,1.4,1.5,C.white,lx,21,-128);b.add(new T.SphereGeometry(.75,10,6,0,Math.PI*2,0,Math.PI/2),C.white,[lx,22.4,-128]);
 b.mesh(group,vertexMaterial(.95),'athens-white-houses-and-lycabettus');group.userData={landmark:'Athens and Lycabettus'};
}

// Route furniture, in a platform's own coordinates, behind the walking lane.
/** A row of ancient column stubs with one fallen drum. */
function ruinRow(b:Builder,from:number,to:number,y:number,z:number,seed:number){
 const r=random(seed),count=Math.max(2,Math.floor((to-from)/1.5));
 for(let k=0;k<count;k++){const x=from+(k+.5)*(to-from)/count,h=.5+r()*2.1;if(r()>.82)continue;cyl(b,.26,.3,h,C.marble,x,y,z,10);box(b,.72,.1,.72,C.marbleWarm,x,y,z);if(h>1.9){cyl(b,.36,.27,.12,C.marble,x,y+h,z,10);box(b,.76,.13,.76,C.marble,x,y+h+.12,z);}}
 b.add(new T.CylinderGeometry(.29,.29,.6,10),C.marbleWarm,[from+.5,y+.29,z+.25],[0,.4,Math.PI/2]);
}
function marbleBlocks(b:Builder,from:number,to:number,y:number,z:number,seed:number){const r=random(seed);for(let x=from;x<to-.35;){const w=Math.min(.6+r()*.7,to-x-.05),h=.34+r()*.3;box(b,w,h,.5,r()>.5?C.marble:C.marbleWarm,x+w/2,y,z,(r()-.5)*.14);if(r()>.6)box(b,w*.7,.3,.44,C.marbleShade,x+w/2,y+h,z,(r()-.5)*.2);x+=w+.06;}}
function amphora(b:Builder,x:number,y:number,z:number){b.add(new T.LatheGeometry([[.05,0],[.13,.05],[.21,.3],[.2,.52],[.09,.72],[.07,.86],[.11,.9]].map(([px,py])=>new T.Vector2(px,py)),10),C.clay,[x,y,z]);for(const side of [-1,1])b.add(new T.TorusGeometry(.09,.02,4,8,Math.PI),C.clay,[x+side*.12,y+.7,z],[0,0,side*-Math.PI/2]);}
function oliveTree(b:Builder,x:number,y:number,z:number,seed:number){cyl(b,.42,.46,.2,C.marbleShade,x,y,z,10);cyl(b,.08,.13,.75,C.trunk,x,y+.2,z,6);for(const [dx,dy,s] of [[0,1.35,.52],[-.34,1.15,.38],[.36,1.2,.4]] as const)b.add(new T.IcosahedronGeometry(s,1),C.olive,[x+dx,y+dy,z],[0,seed+dx,0],[1,.8,1],.14);}
function ropeBarrier(b:Builder,from:number,to:number,y:number,z:number){const posts=Math.max(2,Math.round((to-from)/1.6));for(let k=0;k<=posts;k++){const x=from+k*(to-from)/posts;cyl(b,.03,.04,.8,C.bronze,x,y,z,6);b.add(new T.SphereGeometry(.05,6,5),C.bronze,[x,y+.83,z]);if(k<posts){const step=(to-from)/posts;b.add(new T.TorusGeometry(step*.52,.014,4,8,Math.PI*.6),C.rope,[x+step/2,y+.72+step*.42,z],[0,0,Math.PI*1.2]);}}}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'parthenon-doric-colonnade','propylaia-gateway','temple-of-athena-nike','erechtheion-caryatid-porch','odeon-of-herodes-atticus','stoa-of-eumenes','acropolis-rock-and-walls','olympieion-columns-and-hadrians-arch','athens-and-lycabettus','ancient-column-stubs-and-amphorae']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(40221),detail=new T.Group();detail.name='acropolis-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  sacredRock(detail,finish,low);parthenon(detail,low);propylaiaAndNike(detail,low);erechtheion(detail,low);odeonAndStoa(detail,low);olympieion(detail,low);athens(detail,finish,r,low);
  // The flag flies from the belvedere at the east end of the rock.
  const pole=new Builder();cyl(pole,.06,.08,6,'#d8d8d4',acropolis.rock[1]-3,acropolis.rockTop,-24,6);pole.mesh(detail,vertexMaterial(.6),'belvedere-flagpole');wavingFlag(detail,flagMaterial(greekFlagTexture()),acropolis.rock[1]-2.94,acropolis.rockTop+5.2,-24,2.7,'greece-flag',.66);
  // Olives and cypresses on the slopes below the rock.
  const olives:Placement[]=[],cypress:Placement[]=[];
  for(let k=0;k<(low?16:34);k++)olives.push({x:-40+r()*(finish+90),y:-3.1+Math.floor(r()*3)*1.9,z:-15.6-r()*3,scale:.8+r()*.5,rotation:r()*6});
  for(let k=0;k<(low?8:18);k++)cypress.push({x:-40+r()*(finish+90),y:-1.2+r()*2,z:-18.5-r()*1.6,scale:.8+r()*.6,rotation:r()*6});
  plantGrove(detail,'olive',olives,{low,name:'acropolis-olive-trees'});plantGrove(detail,'cypress',cypress,{low,name:'acropolis-cypresses'});
  const doves=createFlock(detail,{name:'acropolis-doves',count:low?4:9,centre:[acropolis.parthenonX,acropolis.rockTop+9,-30],radius:[26,3,6],speed:.22,size:.7,color:'#f2f0ea',wing:'#d9d6cc',seed:21,glide:true});
  let reduced=context.reducedMotion;doves.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(!reduced)doves.update(time);},setReducedMotion(value){reduced=value;doves.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||t==='climb-wall'||w<3)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.4:REAR-.12,seed=definition.id.length*13+Math.round(definition.x),y=surface(0);
  if(t==='ground'){ruinRow(b,-w/2+.4,w/2-.4,y,rear,seed);if(deep){ropeBarrier(b,-w/2+.5,w/2-.5,y,-1.5);oliveTree(b,w/2-1,surface(w/2-1),-1.9,seed);amphora(b,-w/2+1,surface(-w/2+1),-1.75);}else amphora(b,(seed%2?1:-1)*(w/2-.7),y,REAR+.2);}
  else if(t==='terrace'){marbleBlocks(b,-w/2+.2,w/2-.2,y,rear,seed);cyl(b,.24,.28,1+seed%3*.5,C.marble,(seed%2?1:-1)*(w/2-.8),y,rear+.05,10);if(w>4.5)amphora(b,(seed%2?-1:1)*(w/2-.8),y,REAR+.25);}
  else if(t==='rock'){marbleBlocks(b,-w/2+.3,0,y,rear,seed);for(const x of [w/4,w/2-.6])for(let k=0;k<5;k++)b.add(new T.ConeGeometry(.07,.55,4),C.agave,[x+Math.cos(k*1.26)*.14,surface(x)+.22,rear+Math.sin(k*1.26)*.14],[Math.sin(k*1.26)*.5,0,-Math.cos(k*1.26)*.5]);}
  else if(t==='arch'||t==='stairs'){for(const side of [-1,1])cyl(b,.2,.24,.8+((seed+side)%3)*.4,C.marble,side*(w/2-.35),surface(side*(w/2-.35)),rear,10);}
  finishProps(root,b,glow,'acropolis-ruins-and-olives');
 },
};
