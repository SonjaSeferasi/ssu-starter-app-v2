import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl,roof} from './europe-landmarks';
import {Builder,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,awningStall,bandedFlagTexture,bench,chimneyStack,dormer,finishProps,flagMaterial,flowerBox,lampPost,pointedWindow,railing,settle,texturedStone,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Belgium: a Flemish beguinage on its canal (SRS-632.13). Behind a low
 * white wall lies the green, carpeted with daffodils under tall lime trees
 * and ringed by whitewashed houses with stepped brick gables, green doors
 * and red roofs. The white gatehouse stands at the canal, the brick church
 * with its steep roof and ridge turret closes the green, and the belfry of
 * Bruges rises on the skyline. Swans drift on the canal and a tour boat
 * passes. The route carries lanterns, bicycles, benches, a water pump, a
 * lace stall and flower boxes. Scenery only: nothing collides. */
const C={white:'#f7f4ec',trim:'#fbf9f2',brick:'#a8553b',brickWall:'#f0d8cc',brickDark:'#8c4630',roof:'#a8533a',roofDark:'#8a4332',slate:'#4f5a60',green:'#2f6b46',glass:'#2a3540',lawn:'#7fae5c',daffodil:'#f2d024',
 stone:'#d9d1bd',quay:'#cfc7b3',iron:'#22262a',wood:'#7a5c40',leaf:'#4a7d3f',swan:'#fbfaf5',beak:'#e8892a',boat:'#2f5f4a',gold:'#d6a938'} as const;
const base=europeEnvironment('BEL',{landmark:false,town:false});
export const beguinage={bankTop:-1,greenTop:-.5,gateX:14,green:[24,134],churchX:96,belfryZ:-62} as const;
const brickwork=()=>texturedStone('sandstone-blocks','#c47a66',2.2,.94);

/** A whitewashed house whose gable faces the green and climbs in brick-capped steps. */
function stepGableHouse(s:Builder,p:Builder,x:number,y:number,z:number,w:number,h:number,d:number,low:boolean,seed:number){
 box(s,w,h,d,C.white,x,y,z-d/2);box(s,w+.06,.5,d+.06,C.brick,x,y,z-d/2);roof(p,d,w*.62,w-.3,seed%3?C.roof:C.roofDark,x,y+h,z-d/2,Math.PI/2);
 const steps=5,rise=w*.62/steps;for(let k=0;k<steps;k++){const sw=w*(1-k/steps);box(s,sw+.12,rise+.02,.4,C.white,x,y+h+k*rise,z-.1);for(const side of [-1,1])box(s,w/steps/2,.1,.46,C.brick,x+side*(sw/2-w/steps/4+.06),y+h+(k+1)*rise,z-.1);}box(s,w/steps*.8,.5,.4,C.white,x,y+h+steps*rise,z-.1);
 box(p,.8,1.7,.08,C.green,x-w*.22,y,z+.03);archedWindow(s,p,x+w*.2,y+.7,z+.02,.8,1.3,{frame:C.trim,glass:C.glass});
 for(const dx of low?[0]:[-.22,.22])archedWindow(s,p,x+w*dx,y+h*.62,z+.02,.7,1.1,{frame:C.trim,glass:C.glass});archedWindow(s,p,x,y+h+rise*.8,z+.12,.5,.8,{frame:C.trim,glass:C.glass});
}

function bank(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='beguinage-green';root.add(group);const s=new Builder(),p=new Builder(),flowers=new Builder(),top=beguinage.bankTop,from=-56,to=finish+90,[g0,g1]=beguinage.green;
 box(s,to-from,top+4.4,70,C.quay,(from+to)/2,-4.4,-51.5);
 // The low white wall along the canal, on a brick footing, with a tiled coping.
 box(s,to-from,.5,.5,C.white,(from+to)/2,top,-17);box(s,to-from,.2,.56,C.brick,(from+to)/2,top,-17);box(p,to-from,.12,.7,C.roof,(from+to)/2,top+.5,-17);
 // The green: lawn, gravel paths, and daffodils in drifts.
 // The green is banked up a little behind the wall so the lawn and its flowers show from the route.
 const lawn=beguinage.greenTop;box(p,g1-g0+8,lawn-top,19,C.lawn,(g0+g1)/2,top,-27.5);for(const px of [g0+(g1-g0)*.25,(g0+g1)/2,g0+(g1-g0)*.75])box(p,1.3,.04,13.4,'#d9cfb4',px,lawn,-25.3);box(p,g1-g0,.04,1.2,'#d9cfb4',(g0+g1)/2,lawn,-32);
 for(let k=0;k<(low?70:220);k++){const fx=g0+1+r()*(g1-g0-2),fz=-18.8-r()*12.2;flowers.add(new T.ConeGeometry(.1,.22,5),C.daffodil,[fx,lawn+.34,fz],[Math.PI,0,0]);box(flowers,.03,.26,.03,C.leaf,fx,lawn,fz);}
 s.mesh(group,vertexMaterial(.95),'canal-wall-and-bank');p.mesh(group,vertexMaterial(.9),'lawn-and-paths');flowers.mesh(group,vertexMaterial(.8),'daffodil-drifts');group.userData={feature:'Beguinage green with daffodils'};
}

function houses(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='stepped-gable-houses';root.add(group);const s=new Builder(),p=new Builder(),y=beguinage.bankTop,[g0,g1]=beguinage.green;let count=0;
 // The far row closes the green; shorter rows stand at the canal on either side of it.
 for(let x=g0;x<g1;){const w=4+r()*1.4,h=3.6+r()*1.2;if(Math.abs(x+w/2-beguinage.churchX)>5.4){stepGableHouse(s,p,x+w/2,beguinage.greenTop,-33,w-.14,h,6,low,count);count++;}x+=w;}
 for(const [from,to] of [[-48,beguinage.gateX-5],[g1+3,finish+78]] as const)for(let x=from;x<to;){const w=4+r()*1.4,h=3.4+r();stepGableHouse(s,p,x+w/2,y,-20,w-.14,h,5.4,low,count);count++;x+=w;}
 s.mesh(group,vertexMaterial(.95),'whitewashed-walls-and-brick-steps');p.mesh(group,vertexMaterial(.7),'green-doors-windows-and-red-roofs');group.userData={feature:'Whitewashed houses with stepped gables',houses:count};
}

function gateAndChurch(root:T.Object3D,flag:T.Material,low:boolean){
 // The gatehouse: a white portal with a round arch under a pediment.
 const gate=new T.Group();gate.name='beguinage-gatehouse';root.add(gate);const g=new Builder(),gp=new Builder(),gx=beguinage.gateX,y=beguinage.bankTop;
 box(g,6,5,3,C.white,gx,y,-19.5);box(g,6.4,.3,3.4,C.stone,gx,y+5,-19.5);g.add(new T.CylinderGeometry(.02,3.3,1.5,3,1),C.white,[gx,y+6.05,-18.2],[0,-Math.PI/2,0],[.3,1,1]);archedWindow(g,gp,gx,y,-17.98,2.4,3.6,{frame:C.stone,glass:'#3a2c24'});for(const side of [-1,1])box(g,.4,4.6,.3,C.stone,gx+side*2.4,y,-17.9);
 box(gp,1.2,.5,.06,C.gold,gx,y+4.2,-17.96);cyl(gp,.05,.07,2.6,C.iron,gx,y+6.8,-19.5,5);g.mesh(gate,vertexMaterial(.95),'gatehouse-white-portal');gp.mesh(gate,vertexMaterial(.7),'gatehouse-arch-and-date-stone');wavingFlag(gate,flag,gx+.06,y+8.9,-19.5,1.9,'belgium-flag',.86);gate.userData={landmark:'Beguinage gatehouse'};
 // The church: brick, with tall pointed windows, a steep slate roof and a slender turret on the ridge.
 const church=new T.Group();church.name='beguinage-church';root.add(church);const s=new Builder(.5),p=new Builder(),x=beguinage.churchX,z=-33,cy=beguinage.greenTop,gothic={frame:C.stone,glass:C.glass};
 box(s,6.4,5.2,13,C.brickWall,x,cy,z-6.5);roof(p,6.7,4,13.3,C.slate,x,cy+5.2,z-6.5,Math.PI/2);s.add(new T.CylinderGeometry(.02,3.2,4,3,1),C.brickWall,[x,cy+7.2,z+.1],[0,-Math.PI/2,0],[.1,1,1]);
 pointedWindow(s,p,x,cy+1.6,z+.02,1.6,4.4,low,gothic);box(p,1.3,2,.1,'#3a2a20',x,cy,z+.04);for(const dx of [-2.9,2.9])box(s,.5,4.6,.8,C.brickWall,x+dx,cy,z+.3);
 cyl(p,.5,.56,1.3,C.slate,x,cy+9,z-5,8);cone(p,.62,2.4,C.slate,x,cy+10.3,z-5,8);p.add(new T.SphereGeometry(.09,6,5),C.gold,[x,cy+12.8,z-5]);
 s.mesh(church,brickwork(),'church-brick-walls');p.mesh(church,vertexMaterial(.62),'church-slate-roof-and-turret');church.userData={landmark:'Beguinage church'};
}

function belfry(root:T.Object3D,finish:number,low:boolean){
 const group=new T.Group();group.name='bruges-belfry';root.add(group);const s=new Builder(.5),p=new Builder(),x=finish+6,y=beguinage.bankTop,z=beguinage.belfryZ,gothic={frame:C.stone,glass:C.glass};
 box(s,16,7,7,C.brickWall,x,y,z-3.5);roof(p,16.3,3,7.4,C.roofDark,x,y+7,z-3.5);box(s,5.6,16,5.6,C.brickWall,x,y,z);box(s,6,.3,6,C.stone,x,y+16,z);for(const dx of [-2.9,2.9])for(const dz of [-2.9,2.9]){cyl(s,.5,.5,3,C.brickWall,x+dx,y+14.6,z+dz,8);cone(p,.6,1.3,C.slate,x+dx,y+17.6,z+dz,8);}
 for(const level of [6,11])for(const dx of [-1.2,1.2])pointedWindow(s,p,x+dx,y+level,z+2.82,.9,3.2,low,gothic);
 cyl(s,2.4,2.5,7,C.stone,x,y+16.3,z,8);for(let k=0;k<4;k++){const a=k*Math.PI/2;pointedWindow(s,p,x+Math.sin(a)*2.36,y+17.4,z+Math.cos(a)*2.36+.02,.9,4,low,gothic);}cyl(s,2.7,2.7,.3,C.stone,x,y+23.3,z,8);for(let k=0;k<8;k++){const a=k/8*Math.PI*2;cone(s,.2,.9,C.stone,x+Math.cos(a)*2.5,y+23.6,z+Math.sin(a)*2.5,4);}
 s.mesh(group,brickwork(),'belfry-brick-tower');p.mesh(group,vertexMaterial(.62),'belfry-windows-and-roofs');group.userData={landmark:'Belfry of Bruges'};settle(group,[x,y,z],.72,0);
}

/** A swan: a white body, a curved neck and an orange bill. */
function swan(b:Builder,x:number,z:number,turn:number){
 const dx=Math.cos(turn),dz=Math.sin(turn);b.add(new T.SphereGeometry(1,10,7),C.swan,[x,-2.3,z],[0,-turn,0],[.52,.26,.3]);b.add(new T.ConeGeometry(.16,.4,6),C.swan,[x-dx*.5,-2.2,z-dz*.5],[0,-turn,Math.PI/2-.5]);
 const a=new T.Vector3(x+dx*.34,-2.2,z+dz*.34),m=new T.Vector3(x+dx*.5,-1.85,z+dz*.5),t=new T.Vector3(x+dx*.42,-1.55,z+dz*.42),h=new T.Vector3(x+dx*.6,-1.56,z+dz*.6);b.strut(a,m,.07,C.swan,6,.9);b.strut(m,t,.06,C.swan,6,.9);b.strut(t,h,.06,C.swan,6,.8);b.strut(h,new T.Vector3(x+dx*.76,-1.62,z+dz*.76),.035,C.beak,5,.5);
}
function canalBoat(root:T.Object3D){const b=new Builder();box(b,6,.5,1.7,C.boat,0,0,0);box(b,6.2,.08,1.8,C.gold,0,.5,0);for(let k=0;k<5;k++){box(b,.5,.26,1.3,C.wood,-2+k,.5,0);for(const side of [-.35,.35]){cyl(b,.12,.14,.4,k%2?'#c8402f':'#3f78a8',-2+k,.76,side,6);b.add(new T.SphereGeometry(.12,6,5),'#f2d6bd',[-2+k,1.28,side]);}}const mesh=b.mesh(root,vertexMaterial(.6),'canal-tour-boat');mesh.userData={animated:true};return mesh;}

// Route furniture, in a platform's own coordinates, behind the walking lane.
function bicycle(b:Builder,x:number,y:number,z:number){for(const dx of [-.5,.5])b.add(new T.TorusGeometry(.32,.03,5,14),C.iron,[x+dx,y+.34,z]);const seat=new T.Vector3(x-.18,y+.82,z),bar=new T.Vector3(x+.42,y+.9,z),crank=new T.Vector3(x,y+.36,z);b.strut(new T.Vector3(x-.5,y+.34,z),seat,.025,'#2f6b46',5,1);b.strut(seat,bar,.025,'#2f6b46',5,1);b.strut(crank,seat,.025,'#2f6b46',5,1);b.strut(crank,bar,.025,'#2f6b46',5,1);b.strut(bar,new T.Vector3(x+.5,y+.34,z),.025,'#2f6b46',5,1);box(b,.22,.05,.12,'#3a2a20',x-.18,y+.84,z);box(b,.05,.05,.44,C.iron,x+.42,y+.94,z);box(b,.3,.2,.3,C.wood,x+.6,y+.72,z);}
function daffodils(b:Builder,x:number,y:number,z:number,seed:number){for(let k=0;k<7;k++){const dx=((seed*7+k*13)%10)/10*.9-.45,dz=((seed*3+k*7)%10)/10*.4-.2;box(b,.03,.3,.03,C.leaf,x+dx,y,z+dz);b.add(new T.ConeGeometry(.08,.16,5),C.daffodil,[x+dx,y+.36,z+dz],[Math.PI,0,0]);}}
function waterPump(b:Builder,x:number,y:number,z:number){box(b,.9,.3,.7,C.stone,x,y,z);cyl(b,.12,.14,1.3,C.iron,x,y+.3,z,8);b.add(new T.SphereGeometry(.16,8,6),C.iron,[x,y+1.66,z]);b.strut(new T.Vector3(x,y+1.3,z),new T.Vector3(x+.4,y+1.1,z),.04,C.iron,5,1);b.strut(new T.Vector3(x,y+1.45,z),new T.Vector3(x-.5,y+1.8,z),.035,C.iron,5,1);}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'stepped-gable-whitewashed-houses','beguinage-green-daffodils-and-limes','gatehouse-portal','brick-church-with-ridge-turret','belfry-on-the-skyline','swans-and-canal-boat','bicycles-lanterns-and-lace-stall']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(32056),detail=new T.Group();detail.name='beguinage-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  bank(detail,finish,r,low);houses(detail,finish,r,low);gateAndChurch(detail,flagMaterial(bandedFlagTexture([['#1a1a1a',1],['#fdda24',1],['#ef3340',1]],true)),low);belfry(detail,finish,low);
  const limes:Placement[]=[],[g0,g1]=beguinage.green;for(let k=0;k<(low?12:26);k++)limes.push({x:g0+2+r()*(g1-g0-4),y:beguinage.greenTop,z:-20-r()*10.5,scale:1+r()*.4,rotation:r()*6});plantGrove(detail,'birch',limes,{low,name:'beguinage-lime-trees'});
  const flockOfSwans=new T.Group();flockOfSwans.name='canal-swans';detail.add(flockOfSwans);const sb=new Builder();for(let k=0;k<(low?3:6);k++)swan(sb,k*1.7+r(),r()*2.4-1.2,r()*.8-.4);sb.mesh(flockOfSwans,vertexMaterial(.7),'swans');
  const boat=canalBoat(detail),sparrows=createFlock(detail,{name:'beguinage-sparrows',count:low?6:12,centre:[(g0+g1)/2,7,-26],radius:[36,3,6],speed:.34,size:.45,color:'#7a6a58',wing:'#5c4f42',seed:71,glide:false});
  let reduced=context.reducedMotion;const move=(time:number)=>{const lap=finish+110;boat.position.set(-50+(time*.7)%lap,-2.5+Math.sin(time)*.02,-6.5);flockOfSwans.position.set(30+((time*.25)%(finish+20)),Math.sin(time*.9)*.02,-12.5+Math.sin(time*.2)*1.2);};move(0);sparrows.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;move(time);sparrows.update(time);},setReducedMotion(value){reduced=value;sparrows.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.8)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*43+Math.round(definition.x),y=surface(0);
  if(t==='rooftop'){chimneyStack(b,w/2-.9,surface(w/2-.9),rear,2+seed%2,{brick:C.brick,cap:C.brickDark,pot:'#d8b08a'});flowerBox(b,-w/2+.3,w/2-1.6,y,rear+.12,C.wood,['#d32f3a','#ffffff','#f2d024']);if(w>3.6)dormer(b,-w/2+1.1,surface(-w/2+1.1),rear-.05,C.white,C.glass,C.roof);}
  else if(t==='bridge'){railing(b,-w/2+.25,w/2-.25,y,rear,C.iron,C.gold);lampPost(b,glow,-w/2+.6,surface(-w/2+.6),rear+.3);flowerBox(b,-w/2+1.2,w/2-.5,y+.95,rear,C.wood,['#d32f3a','#e85a7a','#ffffff']);if(w>5)bicycle(b,w/2-1.2,surface(w/2-1.2),rear+.25);}
  else if(t==='ground'){lampPost(b,glow,-w/2+.5,y,-1.3);bicycle(b,-w/2+1.5,y,-1.5);bench(b,w/2-1.3,y,-1.9);daffodils(b,-.2,y,-1.6,seed);daffodils(b,.9,y,-2.2,seed+3);if(w>8){awningStall(b,-w/2+3.6,y,-2.3,{wood:C.wood,stripeA:C.white,stripeB:'#c9d6e6',goods:[C.white,'#f4efe0','#fbf9f2']});waterPump(b,w/2-3.2,y,-2.1);}}
  else if(t==='stairs'){const from=-w/2+.25,to=w/2-.25;railing(b,from,to,Math.min(surface(from),surface(to)),rear,C.iron,C.gold);}
  finishProps(root,b,glow,'beguinage-lanes-and-roofs');
 },
};
