import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cyl} from './europe-landmarks';
import {Builder,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {FACES,REAR,archedWindow,awningStall,balustrade,bandedFlagTexture,bench,drumDome,finishProps,flagMaterial,lampPost,place,railing,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Ukraine: Kyiv around Saint Sophia (SRS-632.12). Across the water stands
 * the white cathedral under its green roofs and thirteen domes, the central
 * ones gilded; beside it the four-tiered blue-and-white bell tower with its
 * golden cap; the mounted hetman's monument on the square; and, further
 * along, the sky-blue walls and golden domes of St Michael's with its own
 * bell tower. On the wooded Dnipro hills beyond the finish rise the white
 * bell tower and domes of the Lavra. Chestnut trees line the square and a
 * pleasure boat passes. The route carries lamps, benches, sunflowers,
 * painted eggs and small golden cupolas. Scenery only: nothing collides. */
const C={white:'#f6f3ea',trim:'#fbf8ef',green:'#4f8a6a',greenDark:'#3f7258',gold:'#dba830',goldBright:'#f0c24a',blue:'#7fb4d6',blueDark:'#5f97bd',glass:'#27343f',stone:'#d8d0bc',paving:'#cfc7b3',
 rock:'#9a948a',bronze:'#55655c',iron:'#22262a',wood:'#7a5c40',leaf:'#4a7d3f',hill:'#5f8a4a',yellow:'#f2c81e',red:'#c0392b',black:'#2a2a2a'} as const;
// The square, the hills and the monasteries are built here on a level bank.
const base=europeEnvironment('UKR',{landmark:false,flat:true,town:false});
export const kyiv={squareTop:-1,sophiaX:74,bellTowerX:48,monumentX:60,michaelX:126} as const;
const gilding=()=>vertexMaterial(.32,{metalness:.55,emissive:new T.Color('#5a3d05'),emissiveIntensity:.35});
type DomeColors={wall:string;trim:string;dome:string;finial:string;glass:string};
const goldDome=(wall:string):DomeColors=>({wall,trim:C.trim,dome:C.gold,finial:C.goldBright,glass:C.glass});

function square(root:T.Object3D,finish:number,flag:T.Material,low:boolean){
 const group=new T.Group();group.name='sophia-square';root.add(group);const s=new Builder(),p=new Builder(),top=kyiv.squareTop,from=-56,to=finish+90;
 box(s,to-from,top+4.4,66,C.paving,(from+to)/2,-4.4,-49.5);box(s,to-from,.3,.5,C.stone,(from+to)/2,top,-16.7);for(let x=from+2;x<to;x+=low?5:2.5)box(p,.05,.9,.05,C.iron,x,top,-16.7);box(p,to-from-4,.05,.05,C.iron,(from+to)/2,top+.9,-16.7);
 // Flower beds in the national colours and the flag on its mast.
 for(let k=0;k<(low?6:12);k++){const bx=from+14+k*(to-from-28)/(low?5:11);box(s,3.4,.22,1.4,C.stone,bx,top,-19);box(p,3,.12,1,k%2?C.yellow:'#3f78c4',bx,top+.22,-19);}
 cyl(p,.06,.09,7,C.iron,kyiv.monumentX+26,top,-20.5,6);
 s.mesh(group,vertexMaterial(.95),'square-paving-and-beds');p.mesh(group,vertexMaterial(.7),'square-railings-and-flowers');wavingFlag(group,flag,kyiv.monumentX+26.06,top+6.2,-20.5,2.6,'ukraine-flag',.66);group.userData={feature:'Sophia Square'};
}

function sophia(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='saint-sophia-cathedral';root.add(group);const s=new Builder(),p=new Builder(),g=new Builder(),x=kyiv.sophiaX,y=kyiv.squareTop,z=-40,window={frame:C.trim,glass:C.glass};
 // The stepped white body: nave, aisles and galleries under green roofs, with five apses facing the square.
 box(s,18,4.2,12,C.white,x,y,z-6);box(s,12,6,10,C.white,x,y,z-6);box(s,6,7.4,8,C.white,x,y,z-6);box(p,18.3,.3,12.3,C.green,x,y+4.2,z-6);box(p,12.3,.3,10.3,C.green,x,y+6,z-6);
 for(let k=0;k<5;k++){const ax=x-5.6+k*2.8,radius=k===2?1.6:1.15,h=k===2?5.4:3.8;cyl(s,radius,radius,h,C.white,ax,y,z+.2,low?8:12);p.add(new T.SphereGeometry(radius*1.04,low?8:12,6,0,Math.PI*2,0,Math.PI/2),C.green,[ax,y+h,z+.2],[0,0,0],[1,.6,1]);archedWindow(s,p,ax,y+1,z+.2+radius+.02,.5,1.6,window);}
 for(let k=0;k<(low?4:8);k++){const wx=x-8+k*16/(low?3:7);if(Math.abs(wx-x)>6.6)archedWindow(s,p,wx,y+.8,z+.02,.7,2,window);}
 // Thirteen domes: the tall central one and four around it gilded, eight lower ones green with golden caps.
 const tops:number[]=[];tops.push(drumDome(s,g,x,y+7.4,z-6,1.7,2,goldDome(C.white),{low,cross:true,sides:low?8:12}));
 for(const [dx,dz] of [[-3,-3],[3,-3],[-3,3],[3,3]] as const)tops.push(drumDome(s,g,x+dx,y+6.2,z-6+dz,1,1.5,goldDome(C.white),{low,cross:true,sides:8}));
 const lower:[number,number][]=[[-6.6,-4],[6.6,-4],[-6.6,0],[6.6,0],[-6.6,4],[6.6,4],[-3,5],[3,5]];
 for(const [dx,dz] of lower){tops.push(drumDome(s,p,x+dx,y+4.4,z-6+dz,.8,1.1,{wall:C.white,trim:C.trim,dome:C.green,finial:C.goldBright,glass:C.glass},{low,sides:8}));g.add(new T.SphereGeometry(.2,6,5),C.goldBright,[x+dx,y+6.75,z-6+dz]);}
 s.mesh(group,vertexMaterial(.94),'sophia-white-walls-and-apses');p.mesh(group,vertexMaterial(.6),'sophia-green-roofs-and-domes');g.mesh(group,gilding(),'sophia-golden-domes');group.userData={landmark:'Saint Sophia Cathedral',domes:tops.length};
}

/** A tiered bell tower: each stage steps in, with white pilasters and arched bell openings, under a golden cap. */
function bellTower(parent:T.Object3D,name:string,x:number,y:number,z:number,wall:string,scale:number,low:boolean){
 const group=new T.Group();group.name=name;parent.add(group);const s=new Builder(),p=new Builder(),g=new Builder();let level=y;const tiers:[number,number][]=[[4.2,3.2],[3.6,2.9],[3,2.6],[2.4,2.2]];
 tiers.forEach(([w0,h0],index)=>{const w=w0*scale,h=h0*scale;box(s,w,h,w,wall,x,level,z);box(s,w+.3*scale,.24*scale,w+.3*scale,C.trim,x,level+h-.12*scale,z);
  for(const [turn,dx,dz] of FACES){const face=new Builder(),glass=new Builder();archedWindow(face,glass,0,h*.2,.02,w*.3,h*.55,{frame:C.trim,glass:index===0?'#3a2a20':C.glass});for(const side of [-1,1]){box(face,.22*scale,h-.3*scale,.14,C.trim,side*(w/2-.18*scale),0,.07);if(!low)box(face,.14*scale,h-.5*scale,.1,C.trim,side*w*.27,0,.05);}place(s,face.geometry(),x+dx*w/2,level,z+dz*w/2,turn);place(p,glass.geometry(),x+dx*w/2,level,z+dz*w/2,turn);}
  level+=h;});
 g.add(new T.SphereGeometry(1.35*scale,low?10:14,8,0,Math.PI*2,0,Math.PI/2),C.gold,[x,level,z],[0,0,0],[1,1.15,1]);cyl(g,.3*scale,.4*scale,.8*scale,C.gold,x,level+1.5*scale,z,8);g.add(new T.SphereGeometry(.42*scale,8,6),C.goldBright,[x,level+2.6*scale,z],[0,0,0],[1,1.2,1]);box(g,.07,1*scale,.07,C.goldBright,x,level+3*scale,z);box(g,.5*scale,.07,.07,C.goldBright,x,level+3.6*scale,z);
 s.mesh(group,vertexMaterial(.93),name+'-tiers');p.mesh(group,vertexMaterial(.6),name+'-openings');g.mesh(group,gilding(),name+'-golden-cap');group.userData={tiers:tiers.length,top:level+4*scale};return group;
}

/** The hetman on his rearing horse, mace raised, on a granite rock. */
function monument(root:T.Object3D){
 const group=new T.Group();group.name='khmelnytsky-monument';root.add(group);const b=new Builder(),m=new Builder(),x=kyiv.monumentX,y=kyiv.squareTop,z=-22.5;
 for(const [w,h,d,dy] of [[4,.4,3,0],[3,1.4,2.2,.4],[2.2,1,1.6,1.8]] as const)box(b,w,h,d,C.rock,x,y+dy,z,.2);const top=y+2.8;
 box(m,1.9,.75,.6,C.bronze,x,top+.9,z);for(const [dx,lift] of [[-.7,0],[.7,.35]] as const)for(const dz of [-.2,.2])box(m,.14,.95-lift,.14,C.bronze,x+dx,top+lift*.4,z+dz);m.strut(new T.Vector3(x+.8,top+1.5,z),new T.Vector3(x+1.5,top+2.3,z),.2,C.bronze,6,.8);box(m,.6,.3,.26,C.bronze,x+1.7,top+2.25,z);m.strut(new T.Vector3(x-.95,top+1.4,z),new T.Vector3(x-1.5,top+.7,z),.07,C.bronze,5,.6);
 cyl(m,.2,.26,.9,C.bronze,x-.1,top+1.6,z,8);m.add(new T.SphereGeometry(.2,8,6),C.bronze,[x-.1,top+2.7,z]);m.strut(new T.Vector3(x+.05,top+2.3,z),new T.Vector3(x+.9,top+3.1,z+.1),.06,C.bronze,5,1);m.add(new T.SphereGeometry(.12,6,5),C.bronze,[x+.95,top+3.15,z+.1]);
 b.mesh(group,vertexMaterial(.95),'monument-granite-rock');m.mesh(group,vertexMaterial(.6,{metalness:.3}),'monument-horse-and-rider');group.userData={landmark:'Bohdan Khmelnytsky Monument'};
}

function stMichael(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='st-michaels-monastery';root.add(group);const s=new Builder(),p=new Builder(),g=new Builder(),x=kyiv.michaelX,y=kyiv.squareTop,z=-42,window={frame:C.trim,glass:C.glass};
 box(s,13,5,11,C.blue,x,y,z-5.5);box(s,13.3,.3,11.3,C.trim,x,y+5,z-5.5);box(s,7,6.4,8,C.blue,x,y,z-5.5);box(p,13.4,.25,11.4,C.gold,x,y+5.3,z-5.5);
 for(let k=0;k<(low?4:7);k++){const wx=x-5.4+k*10.8/(low?3:6);archedWindow(s,p,wx,y+.7,z+.02,.8,2.6,window);for(const side of [-1,1])box(s,.16,4.8,.12,C.trim,wx+side*.75,y,z+.06);}
 s.add(new T.CylinderGeometry(.02,3.2,1.4,3,1),C.blue,[x,y+5.9,z+.1],[0,-Math.PI/2,0],[.14,1,1]);
 drumDome(s,g,x,y+6.4,z-5.5,1.6,1.9,goldDome(C.blue),{low,cross:true,sides:low?8:12});for(const [dx,dz] of [[-4,-3],[4,-3],[-4,3],[4,3],[0,-4],[0,4.4]] as const)drumDome(s,g,x+dx,y+5.3,z-5.5+dz,.9,1.3,goldDome(C.blue),{low,cross:true,sides:8});
 s.mesh(group,vertexMaterial(.93),'st-michaels-sky-blue-walls');p.mesh(group,vertexMaterial(.6),'st-michaels-windows');g.mesh(group,gilding(),'st-michaels-golden-domes');group.userData={landmark:"St Michael's Golden-Domed Monastery",domes:7};
 bellTower(root,'st-michaels-bell-tower',x-13,y,z+4,C.blue,.82,low);
}

function lavraHills(root:T.Object3D,finish:number,low:boolean){
 const group=new T.Group();group.name='lavra-on-the-dnipro-hills';root.add(group);const hills=new Builder(),s=new Builder(),g=new Builder(),x=Math.max(kyiv.michaelX+40,finish+22),z=-56;
 for(const [dx,w,h] of [[-70,40,8],[-20,34,9],[22,30,7],[60,34,8]] as const)hills.add(new T.SphereGeometry(1,low?12:18,low?8:10),C.hill,[x+dx-40,-4.4,z-6],[0,0,0],[w,h+4.4,12],.08);
 hills.add(new T.SphereGeometry(1,low?12:18,low?8:10),C.hill,[x,-4.4,z],[0,0,0],[30,12.4,13],.08);
 // The Dormition Cathedral's golden domes on the hilltop.
 box(s,7,3,6,C.white,x+6,7.4,z+1);for(const [dx,dz,radius] of [[0,0,1.1],[-2.2,-1.6,.7],[2.2,-1.6,.7],[-2.2,1.6,.7],[2.2,1.6,.7]] as const)drumDome(s,g,x+6+dx,10.4,z+1+dz,radius,1.1,goldDome(C.white),{low,cross:radius>1,sides:8});
 hills.mesh(group,vertexMaterial(.97),'dnipro-wooded-hills');s.mesh(group,vertexMaterial(.93),'lavra-cathedral-walls');g.mesh(group,gilding(),'lavra-golden-domes');
 bellTower(group,'lavra-bell-tower',x-4,7.6,z+2,C.white,.62,low);group.userData={landmark:'Kyiv-Pechersk Lavra'};
}

function pleasureBoat(root:T.Object3D){const b=new Builder();box(b,8,.7,1.9,C.white,0,0,0);box(b,8.2,.1,2,'#3f78c4',0,.7,0);box(b,5.4,.8,1.6,C.glass,-.6,.8,0);box(b,5.6,.08,1.7,C.white,-.6,1.6,0);box(b,.5,.08,1.9,C.yellow,3.2,.82,0);const mesh=b.mesh(root,vertexMaterial(.55),'dnipro-pleasure-boat');mesh.userData={animated:true};return mesh;}

// Route furniture, in a platform's own coordinates, behind the walking lane.
function sunflower(b:Builder,x:number,y:number,z:number,h:number){cyl(b,.03,.04,h,C.leaf,x,y,z,5);b.add(new T.CylinderGeometry(.24,.24,.05,12),C.yellow,[x,y+h+.1,z+.04],[Math.PI/2-.3,0,0]);b.add(new T.CylinderGeometry(.11,.11,.07,10),'#6b4a1e',[x,y+h+.1,z+.07],[Math.PI/2-.3,0,0]);box(b,.26,.02,.1,C.leaf,x+.12,y+h*.5,z,.4);}
/** Painted eggs on little stands. */
function paintedEggs(b:Builder,x:number,y:number,z:number){const paints=[[C.red,C.yellow],['#3f78c4',C.white],[C.black,C.red],[C.yellow,C.green]] as const;paints.forEach(([body,band],k)=>{const ex=x+k*.42;cyl(b,.07,.1,.14,C.wood,ex,y,z,8);b.add(new T.SphereGeometry(.16,10,8),body,[ex,y+.36,z],[0,0,0],[1,1.3,1]);b.add(new T.TorusGeometry(.155,.025,5,12),band,[ex,y+.36,z],[Math.PI/2,0,0]);});}
/** A little golden cupola on a drum, for the cathedral ledges. */
function cupola(b:Builder,x:number,y:number,z:number){cyl(b,.34,.36,.7,C.white,x,y,z,8);cyl(b,.42,.42,.07,C.green,x,y+.7,z,8);b.add(new T.SphereGeometry(.4,10,8),C.gold,[x,y+1.08,z],[0,0,0],[1,1.2,1]);b.add(new T.BoxGeometry(.05,.5,.05),C.gold,[x,y+1.75,z]);b.add(new T.BoxGeometry(.26,.05,.05),C.gold,[x,y+1.82,z]);}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'saint-sophia-thirteen-domes','sophia-bell-tower','khmelnytsky-monument','st-michaels-golden-domes','lavra-bell-tower-on-the-hills','chestnut-trees-and-flower-beds','sunflowers-and-painted-eggs']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(38044),detail=new T.Group();detail.name='kyiv-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  square(detail,finish,flagMaterial(bandedFlagTexture([['#0057b7',1],['#ffd700',1]])),low);sophia(detail,low);bellTower(detail,'sophia-bell-tower',kyiv.bellTowerX,kyiv.squareTop,-33,C.blue,1,low);monument(detail);stMichael(detail,low);lavraHills(detail,finish,low);
  const chestnuts:Placement[]=[];for(let k=0;k<(low?12:28);k++)chestnuts.push({x:-48+r()*(finish+120),y:kyiv.squareTop,z:-24-r()*8,scale:.7+r()*.3,rotation:r()*6});plantGrove(detail,'plane',chestnuts.filter(t=>Math.abs(t.x-kyiv.monumentX)>4&&Math.abs(t.x-kyiv.bellTowerX)>4),{low,name:'kyiv-chestnut-trees'});
  const boat=pleasureBoat(detail),pigeons=createFlock(detail,{name:'kyiv-pigeons',count:low?6:14,centre:[kyiv.sophiaX,9,-26],radius:[30,4,6],speed:.3,size:.55,color:'#8f969c',wing:'#6f767c',seed:53,glide:false});
  let reduced=context.reducedMotion;const sail=(time:number)=>{const lap=finish+110;boat.position.set(-50+(time*.85)%lap,-2.5+Math.sin(time)*.03,-9.5);};sail(0);pigeons.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;sail(time);pigeons.update(time);},setReducedMotion(value){reduced=value;pigeons.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.8)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*37+Math.round(definition.x),y=surface(0);
  if(t==='rooftop'){railing(b,-w/2+.25,w/2-.25,y,rear,C.iron,C.gold);cupola(b,(seed%2?1:-1)*(w/2-.8),y,rear+.1);}
  else if(t==='ground'){lampPost(b,glow,-w/2+.5,y,-1.3);awningStall(b,-w/2+1.9,y,-2.3,{wood:C.wood,stripeA:'#3f78c4',stripeB:C.yellow,goods:[C.yellow,C.red,'#e85a7a',C.white]});for(let k=0;k<3;k++)sunflower(b,-w/2+3.4+k*.45,y,-2.2-(k%2)*.2,1.3+k*.15);if(seed%2)paintedEggs(b,w/2-2.6,y,-1.6);bench(b,w/2-1.3,y,-1.9);if(w>8)lampPost(b,glow,w/2-.5,y,-1.3);}
  else if(t==='terrace'){balustrade(b,-w/2+.25,w/2-.25,y,rear,{rail:C.trim,base:C.stone,baluster:C.white});cupola(b,w/2-.9,y,rear+.1);}
  else if(t==='stairs'){const from=-w/2+.25,to=w/2-.25;railing(b,from,to,Math.min(surface(from),surface(to)),rear,C.iron,C.gold);}
  finishProps(root,b,glow,'kyiv-square-and-ledges');
 },
};
