import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl,roof} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,bench,finishProps,flagMaterial,lampPost,pointedWindow,texturedStone,wavingFlag,windowGrid} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Belarus: Mir Castle by its pond (SRS-632.24). The castle stands square on
 * the far shore: red-brick walls patterned with white plaster niches, a
 * tower at each corner under a pointed roof, the taller gate tower in the
 * middle of the front, and the pale Renaissance palace wing rising inside.
 * In the park beside it are the brick chapel with its side tower, old lime
 * trees and lawns; painted wooden houses stand along the lane; a stork
 * keeps its nest on a pole; and swans and a rowing boat share the pond.
 * The route carries lamps, fences, flower beds and a stork's nest.
 * Scenery only: nothing collides. */
const C={brick:'#f0d8cc',brickPlain:'#a8553b',white:'#f6f3ea',trim:'#fbf8ef',plaster:'#efe6cf',roof:'#8f4634',roofDark:'#763a2c',glass:'#27343f',lawn:'#86b062',lawnDark:'#74a054',gold:'#d6a938',
 blue:'#5f8fc0',green:'#5f9a6a',yellow:'#e3c25a',carve:'#fbf8ef',iron:'#22262a',wood:'#7a5c40',leaf:'#4a7d3f',stork:'#fbfaf5',storkWing:'#1c1c1e',beak:'#d8402f',nest:'#7a6248',swan:'#fbfaf5',flower:'#e85a7a'} as const;
const base=europeEnvironment('BLR',{landmark:false,town:false});
export const mir={shoreTop:-1,shoreZ:-24,castleX:86,castleZ:-36,size:26,chapelX:34} as const;
const brickwork=()=>texturedStone('sandstone-blocks','#c47a66',2.2,.94);

function shore(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='castle-pond-shore';root.add(group);const s=new Builder(),top=mir.shoreTop,from=-60,to=finish+100;
 box(s,to-from,top+4.4,66,C.lawn,(from+to)/2,-4.4,mir.shoreZ-33);for(let k=0;k<(low?16:34);k++)s.add(new T.SphereGeometry(1,8,5),C.lawnDark,[from+k*(to-from)/(low?16:34)+r()*3,-3.4,mir.shoreZ+.2],[0,0,0],[4,2.5,1.4]);
 // Reeds at the water's edge.
 for(let k=0;k<(low?40:110);k++){const x=from+r()*(to-from);box(s,.05,.9+r()*.6,.05,'#6f8f4a',x,-2.4,mir.shoreZ+1.4+r()*.8);}box(s,to-from,.06,2.2,'#d9cfb4',(from+to)/2,top,mir.shoreZ-3);
 s.mesh(group,vertexMaterial(.97),'park-lawns-reeds-and-path');group.userData={feature:'Castle pond and park'};
}

/** A castle tower: square below, eight-sided above, banded with white niches under a pointed roof. */
function tower(s:Builder,w:Builder,p:Builder,x:number,y:number,z:number,size:number,h:number){
 box(s,size,h*.55,size,C.brick,x,y,z);cyl(s,size*.52,size*.56,h*.45,C.brick,x,y+h*.55,z,8);
 for(const level of [.16,.36]){box(w,size+.08,.26,size+.08,C.white,x,y+h*level,z);for(const dx of [-.28,0,.28])archedWindow(w,p,x+dx*size,y+h*level+.5,z+size/2+.03,size*.16,h*.1,{frame:C.white,glass:C.white});}
 for(let k=0;k<8;k++){const a=k/8*Math.PI*2+Math.PI/8;w.add(new T.BoxGeometry(size*.2,h*.12,.1),C.white,[x+Math.sin(a)*size*.5,y+h*.72,z+Math.cos(a)*size*.5],[0,a,0]);p.add(new T.BoxGeometry(size*.1,h*.08,.12),C.glass,[x+Math.sin(a)*size*.5,y+h*.88,z+Math.cos(a)*size*.5],[0,a,0]);}
 cyl(w,size*.58,size*.58,.24,C.white,x,y+h,z,8);cone(p,size*.62,h*.3,C.roof,x,y+h+.2,z,8);p.add(new T.SphereGeometry(.12,6,5),C.gold,[x,y+h*1.3+.3,z]);
}

function castle(root:T.Object3D,flag:T.Material,low:boolean){
 const group=new T.Group();group.name='mir-castle';root.add(group);const s=new Builder(.5),w=new Builder(),p=new Builder(),x=mir.castleX,y=mir.shoreTop,z=mir.castleZ,half=mir.size/2;
 // Curtain walls with a row of white blind arches, and the gate tower in the middle of the front.
 box(s,mir.size,6,1.6,C.brick,x,y,z);for(let k=0;k<(low?6:12);k++){const ax=x-half+2.4+k*(mir.size-4.8)/(low?5:11);if(Math.abs(ax-x)>2.6){archedWindow(w,p,ax,y+3.4,z+.82,1.1,1.6,{frame:C.white,glass:C.white});box(p,.3,.8,.1,C.glass,ax,y+1.6,z+.82);}}box(w,mir.size,.3,1.7,C.white,x,y+5.7,z);
 for(const side of [-1,1]){box(s,1.6,6,mir.size,C.brick,x+side*half,y,z-half);tower(s,w,p,x+side*half,y,z+.3,4.4,9.4);tower(s,w,p,x+side*half,y,z-mir.size+.3,4,8.4);}
 tower(s,w,p,x,y,z+.8,4.6,10.6);archedWindow(s,p,x,y,z+3.12,2,3,{frame:C.white,glass:'#2a2622'});
 // The palace wing inside the walls.
 box(w,mir.size-6,8,7,C.plaster,x,y,z-mir.size+5);windowGrid(w,p,x,y+3,z-mir.size+8.52,mir.size-7,4.6,low?6:10,2,{wall:C.plaster,trim:C.trim,glass:C.glass,roof:C.roof},true,low);roof(p,mir.size-5.6,2.4,7.4,C.roofDark,x,y+8,z-mir.size+5);
 cyl(p,.06,.09,6.4,C.white,x-half-5,y,z+4,6);s.mesh(group,brickwork(),'castle-brick-walls-and-towers');w.mesh(group,vertexMaterial(.92),'white-plaster-niches-and-palace-wing');p.mesh(group,vertexMaterial(.65),'castle-pointed-roofs-and-windows');
 wavingFlag(group,flag,x-half-4.94,y+5.6,z+4,2.2,'belarus-flag',.5);group.userData={landmark:'Mir Castle',towers:5};
}

function park(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='chapel-and-village';root.add(group);const s=new Builder(.5),w=new Builder(),p=new Builder(),y=mir.shoreTop,x=mir.chapelX,z=-34;
 // The chapel: brick, with a rose window and a slender tower set to one side.
 box(s,6,5.4,9,C.brick,x,y,z-4.5);roof(p,6.3,2.6,9.3,C.roofDark,x,y+5.4,z-4.5,Math.PI/2);s.add(new T.CylinderGeometry(.02,3,2.6,3,1),C.brick,[x,y+6.7,z+.1],[0,-Math.PI/2,0],[.1,1,1]);p.add(new T.CylinderGeometry(1,1,.08,16),C.gold,[x,y+4,z+.04],[Math.PI/2,0,0]);p.add(new T.CylinderGeometry(.7,.7,.1,16),'#3f6fae',[x,y+4,z+.06],[Math.PI/2,0,0]);archedWindow(s,p,x,y,z+.02,1.4,2.6,{frame:C.white,glass:'#33261e'});
 box(s,2,9,2,C.brick,x+4,y,z-.6);pointedWindow(s,p,x+4,y+6,z+.42,.7,2,low,{frame:C.white,glass:C.glass});cone(p,1.4,3,C.roof,x+4,y+9,z-.6,4);p.add(new T.SphereGeometry(.1,6,5),C.gold,[x+4,y+12.1,z-.6]);
 // Painted wooden houses with carved white window frames, behind picket fences.
 for(let k=0;k<(low?4:7);k++){const hx=mir.castleX+mir.size/2+12+k*6.4,wall=[C.blue,C.green,C.yellow][k%3],hz=-28-(k%2)*3;if(hx>finish+92)break;box(w,4.6,2.6,4,wall,hx,y,hz-2);for(let j=1;j<5;j++)box(p,4.62,.03,.02,'#3a3a3a',hx,y+j*.52,hz+.02);for(const dx of [-1.2,1.2]){box(w,1,1.1,.08,C.carve,hx+dx,y+.9,hz+.04);box(p,.7,.8,.1,C.glass,hx+dx,y+1,hz+.05);w.add(new T.ConeGeometry(.5,.3,3),C.carve,[hx+dx,y+2.14,hz+.04],[0,0,0],[1,1,.1]);}roof(p,5,1.6,4.4,C.roofDark,hx,y+2.6,hz-2);for(let f=0;f<8;f++)box(w,.1,.7,.06,C.white,hx-2.6+f*.74,y,hz+1.4);box(w,5.4,.06,.06,C.white,hx,y+.5,hz+1.4);}
 // A stork on its nest.
 const sx=mir.castleX-mir.size/2-9;cyl(p,.12,.16,6.4,C.wood,sx,y,-28,6);cyl(p,.9,.6,.4,C.nest,sx,y+6.4,-28,10);p.add(new T.SphereGeometry(.3,8,6),C.stork,[sx,y+7.5,-28],[0,0,0],[1.5,1,.8]);box(p,.5,.26,.5,C.storkWing,sx-.2,y+7.46,-28);for(const dz of [-.08,.08])box(p,.04,.7,.04,C.beak,sx,y+6.8,-28+dz);p.strut(new T.Vector3(sx+.36,y+7.6,-28),new T.Vector3(sx+.5,y+8.2,-28),.06,C.stork,5,.8);p.strut(new T.Vector3(sx+.5,y+8.2,-28),new T.Vector3(sx+.94,y+8.1,-28),.035,C.beak,4,.4);
 s.mesh(group,brickwork(),'chapel-brick-walls');w.mesh(group,vertexMaterial(.92),'painted-wooden-houses-and-fences');p.mesh(group,vertexMaterial(.7),'chapel-roof-rose-window-and-stork');group.userData={feature:'Chapel, wooden houses and a stork nest'};
}

/** Red over green, with the white-and-red ornament at the hoist. */
const belarusFlag=()=>pixelTexture(96,(u,v)=>u<.12?((Math.floor(u*80)+Math.floor(v*40))%2?[255,255,255,255]:[206,23,32,255]):v>1/3?[206,23,32,255]:[0,122,61,255],true,false);

function pondLife(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='pond-swans-and-rowing-boat';root.add(group);const b=new Builder();for(let k=0;k<(low?2:4);k++){const x=k*2.2,z=(k%2)*1.6-8;b.add(new T.SphereGeometry(1,10,7),C.swan,[x,-2.3,z],[0,0,0],[.52,.26,.3]);const a=new T.Vector3(x+.34,-2.2,z),m=new T.Vector3(x+.5,-1.85,z),t=new T.Vector3(x+.42,-1.55,z),h=new T.Vector3(x+.6,-1.56,z);b.strut(a,m,.07,C.swan,6,.9);b.strut(m,t,.06,C.swan,6,.9);b.strut(t,h,.06,C.swan,6,.8);b.strut(h,new T.Vector3(x+.76,-1.62,z),.035,'#e8892a',5,.5);}
 b.add(new T.SphereGeometry(1,8,5),C.wood,[14,-2.36,-12],[0,0,0],[1.7,.3,.56]);box(b,.5,.1,1,'#c9b88a',14,-2.2,-12);for(const side of [-1,1])b.strut(new T.Vector3(14,-2.1,-12),new T.Vector3(14.3,-2.4,-12+side*1.4),.03,C.wood,4,1);
 b.mesh(group,vertexMaterial(.75),'swans-and-boat');group.userData={animated:true};return group;
}

// Route furniture, in a platform's own coordinates, behind the walking lane.
function picket(b:Builder,from:number,to:number,y:number,z:number){for(let x=from;x<=to+.01;x+=.5)box(b,.1,.7,.05,C.white,x,y,z);box(b,to-from,.06,.05,C.white,(from+to)/2,y+.45,z);}
function flowerBed(b:Builder,x:number,y:number,z:number,seed:number){box(b,1.6,.16,.7,'#7a5c40',x,y,z);for(let k=0;k<8;k++)b.add(new T.SphereGeometry(.1,6,4),k%3?C.flower:'#f2d24a',[x-.6+((seed+k*3)%7)*.2,y+.26,z-.2+(k%3)*.2]);}
function storkPole(b:Builder,x:number,y:number,z:number){cyl(b,.07,.09,2.6,C.wood,x,y,z,6);cyl(b,.5,.34,.24,C.nest,x,y+2.6,z,10);b.add(new T.SphereGeometry(.18,8,6),C.stork,[x,y+3.26,z],[0,0,0],[1.5,1,.8]);box(b,.3,.16,.3,C.storkWing,x-.12,y+3.24,z);for(const dz of [-.05,.05])box(b,.025,.4,.025,C.beak,x,y+2.84,z+dz);b.strut(new T.Vector3(x+.2,y+3.3,z),new T.Vector3(x+.3,y+3.7,z),.04,C.stork,5,.8);b.strut(new T.Vector3(x+.3,y+3.7,z),new T.Vector3(x+.56,y+3.64,z),.025,C.beak,4,.4);}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'red-brick-towers-with-white-niches','gate-tower-and-curtain-walls','renaissance-palace-wing','brick-chapel-and-side-tower','painted-wooden-houses','stork-on-its-nest','pond-swans-and-rowing-boat']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(37500),detail=new T.Group();detail.name='mir-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  shore(detail,finish,r,low);castle(detail,flagMaterial(belarusFlag()),low);park(detail,finish,r,low);
  const limes:Placement[]=[];for(let k=0;k<(low?18:40);k++){const x=-50+r()*(finish+150),z=-28-r()*30;if(Math.abs(x-mir.castleX)>mir.size/2+5&&Math.abs(x-mir.chapelX-2)>7&&!(x>mir.castleX+mir.size/2+8&&z>-34))limes.push({x,y:mir.shoreTop,z,scale:.9+r()*.6,rotation:r()*6});}plantGrove(detail,'plane',limes,{low,name:'park-lime-trees'});
  const pond=pondLife(detail,low),rooks=createFlock(detail,{name:'mir-jackdaws',count:low?6:12,centre:[mir.castleX,12,-38],radius:[26,3,8],speed:.3,size:.55,color:'#26282c',wing:'#1a1c20',seed:137,glide:false});
  let reduced=context.reducedMotion;const drift=(time:number)=>{pond.position.set(24+((time*.2)%(finish-10)),Math.sin(time*.9)*.02,Math.sin(time*.15)*2);};drift(0);rooks.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;drift(time);rooks.update(time);},setReducedMotion(value){reduced=value;rooks.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.8)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*97+Math.round(definition.x),from=-w/2+.3,to=w/2-.3,y=surface(0);
  if(t==='ground'){picket(b,from,to,Math.min(surface(from),surface(to)),rear);lampPost(b,glow,from+.3,surface(from+.3),-1.3);flowerBed(b,from+1.8,surface(from+1.8),-1.5,seed);bench(b,to-1.2,surface(to-1.2),-1.9);if(w>8){storkPole(b,.4,y,-2.2);flowerBed(b,to-3.2,surface(to-3.2),-1.5,seed+3);}}
  else if(t==='rooftop'){for(let x=from;x<=to;x+=1)box(b,.5,.6,.4,C.brickPlain,x,surface(x),rear);box(b,w-.6,.3,.44,C.brickPlain,0,y-.02,rear);if(w>4){cyl(b,.04,.05,1.8,C.iron,to-.4,surface(to-.4)+.6,rear,5);box(b,.6,.4,.03,'#ce1720',to-.08,surface(to-.4)+2,rear);}}
  else if(t==='rock'){b.add(new T.SphereGeometry(.34,7,5),C.leaf,[0,surface(0)+.16,rear+.3],[0,0,0],[1.4,.6,1]);}
  finishProps(root,b,glow,'mir-fences-flowers-and-storks');
 },
};
