import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl,roof} from './europe-landmarks';
import {Builder,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {FACES,QUARTER,REAR,archedWindow,bandedFlagTexture,chimneyStack,column,finishProps,flagMaterial,lampPost,pinnacle,place,pointedWindow,pyramid,texturedStone,turret,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Germany: Aachen Cathedral and the old town (SRS-632.5). Charlemagne's
 * octagon stands at the centre under its pleated dome and lantern, ringed by
 * the sixteen-sided ambulatory; the Gothic choir, a "house of glass" of tall
 * windows between buttresses, runs east; the west tower carries its spire.
 * Beside it are the Gothic town hall with its two towers and the columned
 * rotunda of the Elisenbrunnen spring, and half-timbered houses fill the
 * streets. The route crosses the roofs: chimneys, dormers, geranium boxes and
 * weathercocks, with beer-garden tables and a fountain on the squares.
 * Scenery only: no colliders, nothing in the walking lane. */
const C={stone:'#cdbfa5',stoneDark:'#a99c84',trim:'#e3d8c2',blue:'#8e9499',slate:'#3f5357',slateDark:'#33454a',lead:'#6f8f8a',glass:'#243442',glassBlue:'#35577a',gold:'#d2a63f',iron:'#22262a',
 plaster:'#f2ecdf',timber:'#4a3626',roofRed:'#a8523a',brick:'#93523f',wood:'#7a5c40',white:'#f6f3ea',geranium:'#d32f3a',leaf:'#4a7d3f',water:'#6fa7b8',awningA:'#c33b33',awningB:'#f4f0e4'} as const;
const base=europeEnvironment('DEU',{landmark:false});
export const aachen={ground:-5,octagonX:98,z:-28,townHallX:150,springX:34} as const;
// Pale dressed stone; the Carolingian core keeps its darker bluestone through the vertex colour.
const masonry=()=>texturedStone('paris-stone','#f6eeda',1.3,.92);
const gothic={frame:C.trim,glass:C.glassBlue},romanesque={frame:C.trim,glass:C.glass};
const pin=(b:Builder,x:number,y:number,z:number,size:number,low:boolean)=>pinnacle(b,x,y,z,size,low,{shaft:C.stone,spire:C.trim,finial:C.gold});

function cathedral(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='aachen-cathedral';root.add(group);const stone=new Builder(.5),plain=new Builder(),x=aachen.octagonX,y=aachen.ground,z=aachen.z;
 // The sixteen-sided ambulatory in two storeys, with round-headed windows.
 cyl(stone,7.2,7.4,9.4,C.blue,x,y,z,16);cyl(stone,7.5,7.5,.3,C.trim,x,y+4.6,z,16);cyl(plain,6.2,7.5,1.5,C.slate,x,y+9.4,z,16);
 for(let k=0;k<16;k++){const a=(k+.5)/16*Math.PI*2,face=new Builder(),glass=new Builder();archedWindow(face,glass,0,1.2,.02,1.1,1.9,romanesque);archedWindow(face,glass,0,5.6,.02,1.1,2.1,romanesque);place(stone,face.geometry(),x+Math.sin(a)*7.22,y,z+Math.cos(a)*7.22,a);place(plain,glass.geometry(),x+Math.sin(a)*7.22,y,z+Math.cos(a)*7.22,a);}
 // The octagon rises through it: a gabled drum and the pleated dome with its lantern.
 const drum=y+10.4;cyl(stone,4.4,4.4,5.2,C.blue,x,drum,z,8);
 for(let k=0;k<8;k++){const a=(k+.5)/8*Math.PI*2,face=new Builder(),glass=new Builder();archedWindow(face,glass,0,.8,.02,1.4,2.4,romanesque);face.add(new T.ConeGeometry(1.75,1.5,4),C.blue,[0,5.95,-.2],[0,QUARTER,0],[1,1,.3]);place(stone,face.geometry(),x+Math.sin(a)*4.08,drum,z+Math.cos(a)*4.08,a);place(plain,glass.geometry(),x+Math.sin(a)*4.08,drum,z+Math.cos(a)*4.08,a);}
 plain.add(new T.LatheGeometry([[4.5,0],[4.7,.9],[4.3,2.4],[3.3,4],[1.9,5.2],[.9,5.9],[.75,6.3]].map(([px,py])=>new T.Vector2(px,py)),16),C.lead,[x,drum+5.2,z]);
 for(let k=0;k<16;k++){const a=k/16*Math.PI*2;plain.strut(new T.Vector3(x+Math.sin(a)*4.72,drum+6.1,z+Math.cos(a)*4.72),new T.Vector3(x+Math.sin(a)*1,drum+11,z+Math.cos(a)*1),.09,C.slateDark,5,.6);}
 cyl(plain,.7,.75,1.5,C.lead,x,drum+11.4,z,8);cone(plain,.95,1.7,C.slateDark,x,drum+12.9,z,8);plain.add(new T.SphereGeometry(.22,8,6),C.gold,[x,drum+14.75,z]);
 // The Gothic choir: tall windows between stepped buttresses under a steep roof.
 const cx=x+13.5,choirH=17,bays=6,bay=2.5;box(stone,bays*bay,choirH,6.4,C.stone,cx,y,z);roof(plain,bays*bay+.4,5.2,6.9,C.slate,cx,y+choirH,z);
 for(let k=0;k<=bays;k++){const bx=cx-bays*bay/2+k*bay;for(const side of [1,-1]){box(stone,.5,choirH*.55,1.5,C.stoneDark,bx,y,z+side*3.7);box(stone,.44,choirH+.6,.9,C.stone,bx,y,z+side*3.5);pin(stone,bx,y+choirH+.6,z+side*3.5,.95,low);}
  if(k<bays)pointedWindow(stone,plain,bx+bay/2,y+2.6,z+3.22,1.5,choirH-6.2,low,gothic);}
 // The polygonal east end closes the choir.
 cyl(stone,3.2,3.2,choirH,C.stone,cx+bays*bay/2,y,z,8);cone(plain,3.45,5.2,C.slate,cx+bays*bay/2,y+choirH,z,8);for(const a of [.25,.75]){const px=cx+bays*bay/2+Math.sin(a*Math.PI)*3.22,pz=z+Math.cos(a*Math.PI)*3.22;const face=new Builder(),glass=new Builder();pointedWindow(face,glass,0,2.6,.02,1.3,choirH-6.2,low,gothic);place(stone,face.geometry(),px,y,pz,a*Math.PI);place(plain,glass.geometry(),px,y,pz,a*Math.PI);}
 // The west tower: a square base, a bridge to the octagon and the slender spire.
 const tx=x-12.5;box(stone,5.6,20,5.6,C.stone,tx,y,z);for(const level of [7,13.5,19.6])box(stone,5.9,.3,5.9,C.trim,tx,y+level,z);
 for(const [turn,dx,dz] of FACES){const face=new Builder(),glass=new Builder();pointedWindow(face,glass,0,8,.02,1.4,3.6,low,gothic);for(const offset of [-1.1,1.1])pointedWindow(face,glass,offset,14.6,.02,.8,2.8,low,{frame:C.trim,glass:C.glass});if(dz>0)box(glass,1.8,3.4,.1,'#2c2220',0,0,.05);place(stone,face.geometry(),tx+dx*2.8,y,z+dz*2.8,turn);place(plain,glass.geometry(),tx+dx*2.8,y,z+dz*2.8,turn);}
 for(const sx of [-1,1])for(const sz of [-1,1])turret(stone,plain,tx+sx*2.8,y+13.5,z+sz*2.8,.5,7.4,low,{wall:C.stone,trim:C.trim,cap:C.slateDark,finial:C.gold});
 pyramid(plain,.12,2.9,11.5,C.slateDark,tx,y+20,z);cyl(plain,.05,.05,1.3,C.gold,tx,y+31.5,z,5);plain.add(new T.SphereGeometry(.24,8,6),C.gold,[tx,y+33,z]);
 box(stone,5.5,1.4,2.2,C.stone,x-7.6,y+11,z);box(stone,5.5,9.4,3.2,C.blue,x-8,y,z);
 // Chapels cluster round the ambulatory.
 for(const [dx,dz,w,h] of [[-3,7.6,5,7],[4.5,7.4,4.4,8.2],[-6.6,-6.8,5,7.4]] as const){box(stone,w,h,4,C.stone,x+dx,y,z+dz);pyramid(plain,.3,w*.52,2.4,C.slate,x+dx,y+h,z+dz);if(dz>0)for(const offset of [-w*.22,w*.22])pointedWindow(stone,plain,x+dx+offset,y+1.6,z+dz+2.02,.9,h-4.2,low,gothic);}
 stone.mesh(group,masonry(),'aachen-cathedral-stone');plain.mesh(group,vertexMaterial(.62),'aachen-cathedral-roofs-and-glass');
 group.userData={landmark:'Aachen Cathedral',octagonSides:8,ambulatorySides:16,choirWindows:bays+2,spireTop:y+33};
}

function townHall(root:T.Object3D,flag:T.Material,low:boolean){
 const group=new T.Group();group.name='aachen-town-hall';root.add(group);const stone=new Builder(.5),plain=new Builder(),x=aachen.townHallX,y=aachen.ground,z=-31,w=26,h=12.5;
 box(stone,w,h,7.5,C.stone,x,y,z);roof(plain,w+.5,5.4,8,C.slate,x,y+h,z);box(stone,w+.3,.34,7.8,C.trim,x,y+5.2,z);box(stone,w+.3,.4,7.8,C.trim,x,y+h-.2,z);
 for(let k=0;k<9;k++){const wx=x-w/2+1.9+k*2.78;pointedWindow(stone,plain,wx,y+6.3,z+3.77,1.3,3.4,low,gothic);pointedWindow(stone,plain,wx,y+1.5,z+3.77,1.1,2.2,low,{frame:C.trim,glass:C.glass});if(!low)for(const row of [0,1])box(plain,.42,.5,.3,C.slateDark,wx,y+h+1.2+row*1.7,z+3.2-row*1.3);}
 // Its two towers differ: the Granus tower keeps its old square top, the market tower a tall cap.
 box(stone,4.6,19,4.6,C.stoneDark,x-w/2-1.6,y,z-.6);pyramid(plain,.2,2.9,5,C.slateDark,x-w/2-1.6,y+19,z-.6);for(const sx of [-1,1])for(const sz of [-1,1])turret(stone,plain,x-w/2-1.6+sx*2.3,y+12,z-.6+sz*2.3,.42,7.6,low,{wall:C.stoneDark,trim:C.trim,cap:C.slateDark,finial:C.gold});
 box(stone,4.2,17,4.2,C.stone,x+w/2+1.4,y,z-.6);cyl(plain,2.3,2.9,2.4,C.slate,x+w/2+1.4,y+17,z-.6,8);cyl(stone,1.5,1.6,2.6,C.stone,x+w/2+1.4,y+19.4,z-.6,8);plain.add(new T.SphereGeometry(1.75,12,8,0,Math.PI*2,0,Math.PI/2),C.lead,[x+w/2+1.4,y+22,z-.6],[0,0,0],[1,1.25,1]);cone(plain,.5,3,C.slateDark,x+w/2+1.4,y+24.1,z-.6,8);
 // The outside stair and the fountain of Charlemagne on the market square.
 for(let step=0;step<6;step++)box(stone,6-step*.5,.4,2.4-step*.3,C.trim,x,y+step*.4,z+4.6);
 const fx=x-6,fz=z+8.5;cyl(stone,2,2.1,.7,C.stoneDark,fx,y,fz,12);cyl(plain,1.8,1.8,.1,C.water,fx,y+.62,fz,12);cyl(stone,.4,.5,2.2,C.stoneDark,fx,y+.6,fz,8);cyl(plain,.24,.3,1.3,'#5c6a5f',fx,y+2.8,fz,8);plain.add(new T.SphereGeometry(.24,8,6),'#5c6a5f',[fx,y+4.3,fz]);plain.add(new T.TorusGeometry(.2,.05,5,10),C.gold,[fx,y+4.55,fz],[Math.PI/2,0,0]);
 cyl(plain,.06,.08,6,C.iron,x+w/2-2,y+h+5.4,z,5);stone.mesh(group,masonry(),'town-hall-stone');plain.mesh(group,vertexMaterial(.64),'town-hall-roofs-and-glass');
 wavingFlag(group,flag,x+w/2-1.94,y+h+10.6,z,2.6,'germany-flag',.6);group.userData={landmark:'Aachen Town Hall',towers:2,fountain:'Karlsbrunnen'};
}

/** The Elisenbrunnen: a columned rotunda between two colonnaded wings, over the hot spring. */
function elisenbrunnen(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='elisenbrunnen';root.add(group);const b=new Builder(.5),x=aachen.springX,y=aachen.ground,z=-25;
 box(b,30,.5,6,C.trim,x,y,z);cyl(b,3.6,3.6,.5,C.trim,x,y,z+1,low?12:20);
 for(let k=0;k<(low?6:10);k++){const a=-Math.PI*.42+k/(low?5:9)*Math.PI*.84;column(b,x+Math.sin(a)*3.2,y+.5,z+1+Math.cos(a)*3.2,.24,4.6,C.white,low?8:12);}
 cyl(b,3.7,3.7,.7,C.white,x,y+5.1,z+1,low?12:20);b.add(new T.SphereGeometry(3.5,low?12:20,8,0,Math.PI*2,0,Math.PI/2),C.lead,[x,y+5.8,z+1],[0,0,0],[1,.55,1]);
 for(const side of [-1,1]){for(let k=0;k<(low?4:7);k++)column(b,x+side*(5+k*(low?3.1:1.55)),y+.5,z+2.4,.2,3.8,C.white,low?8:12);box(b,10.4,.6,3.6,C.white,x+side*9.6,y+4.3,z+1);box(b,10,3.8,.5,C.plaster,x+side*9.6,y+.5,z-.6);box(b,4,5.2,4.6,C.white,x+side*16.4,y+.5,z);roof(b,4.4,1.3,5,C.slate,x+side*16.4,y+5.7,z,Math.PI/2);}
 b.mesh(group,texturedStone('paris-stone','#ffffff',1.6,.88),'elisenbrunnen-rotunda-and-colonnades');group.userData={landmark:'Elisenbrunnen',feature:'thermal spring pavilion'};
}

/** Half-timbered houses: white panels in a dark frame of posts, rails and braces. */
function timberHouses(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='half-timbered-houses';root.add(group);const b=new Builder(),y=aachen.ground;let count=0;
 for(let x=-34;x<finish+50;x+=4.6+r()*1.6){if(Math.abs(x-aachen.octagonX)<28||Math.abs(x-aachen.townHallX)<19||Math.abs(x-aachen.springX)<19)continue;
  const w=4+r()*1.6,h=5+r()*2.6,z=-21.5-r()*2.5,front=z+2.01,stories=h>6.2?3:2;count++;box(b,w,h,4,C.plaster,x,y,z);roof(b,w+.5,2.6+r()*1.2,4.5,r()>.5?C.roofRed:C.slate,x,y+h,z);
  for(const post of [-w/2+.1,0,w/2-.1])box(b,.2,h,.06,C.timber,x+post,y,front);for(let s=0;s<=stories;s++)box(b,w,.2,.06,C.timber,x,y+s*h/stories-(s===stories?.2:0),front);
  for(let s=0;s<stories;s++)for(const side of [-1,1]){const bx=x+side*w/4,by=y+s*h/stories+.2,sh=h/stories-.4;
   if(s===0&&side<0&&r()>.4)box(b,.9,sh,.07,'#5a3f2c',bx,by,front);else{box(b,.8,sh*.55,.07,C.glass,bx,by+sh*.3,front);if(!low){box(b,.9,.12,.2,C.wood,bx,by+sh*.22,front+.08);for(let g=0;g<4;g++)b.add(new T.SphereGeometry(.09,6,5),C.geranium,[bx-.3+g*.2,by+sh*.3,front+.14]);}}
   if(!low)b.strut(new T.Vector3(x+side*(w/2-.15),by,front),new T.Vector3(x+side*(w/4+.5),by+sh,front),.07,C.timber,4,1);}
  box(b,.5,1.1,.5,C.brick,x+w*.25,y+h+1.4,z);}
 b.mesh(group,vertexMaterial(.92),'fachwerk-houses');group.userData={feature:'Fachwerk old town',houses:count};
}

// Route furniture, in a platform's own coordinates, behind the walking lane.
function dormer(b:Builder,x:number,y:number,z:number){box(b,.9,.75,.5,C.plaster,x,y,z);box(b,.5,.45,.06,C.glass,x,y+.14,z+.25);roof(b,.6,.4,1.1,C.slate,x,y+.75,z,Math.PI/2);}
function weathercock(b:Builder,x:number,y:number,z:number){cyl(b,.02,.02,1,C.iron,x,y,z,5);box(b,.5,.02,.02,C.iron,x,y+.7,z);box(b,.02,.02,.5,C.iron,x,y+.7,z);box(b,.26,.18,.02,C.gold,x,y+1.02,z);b.add(new T.ConeGeometry(.07,.2,4),C.gold,[x+.2,y+1.13,z],[0,0,-1]);b.add(new T.SphereGeometry(.05,6,5),C.gold,[x-.14,y+1.16,z]);}
function geraniumBox(b:Builder,from:number,to:number,y:number,z:number){box(b,to-from,.16,.2,C.wood,(from+to)/2,y,z);for(let x=from+.08,k=0;x<to;x+=.16,k++){b.add(new T.SphereGeometry(.07,6,5),k%3?C.geranium:'#e85a7a',[x,y+.25+(k%2)*.04,z]);if(k%2)b.add(new T.SphereGeometry(.07,6,5),C.leaf,[x,y+.18,z+.07]);}}
/** A beer-garden set: a trestle table and two benches. */
function beerTable(b:Builder,x:number,y:number,z:number){box(b,1.9,.06,.6,'#c79a5e',x,y+.72,z);for(const side of [-.5,.5])box(b,1.9,.05,.26,'#c79a5e',x,y+.42,z+side);for(const end of [-.75,.75]){box(b,.06,.72,.5,C.iron,x+end,y,z);for(const side of [-.5,.5])box(b,.05,.42,.22,C.iron,x+end,y,z+side);}
 for(const [dx,dz] of [[-.5,.1],[.4,-.12]] as const){cyl(b,.07,.06,.2,'#e9c56a',x+dx,y+.78,z+dz,8);cyl(b,.075,.075,.04,C.white,x+dx,y+.98,z+dz,8);}}
function marketStall(b:Builder,x:number,y:number,z:number){for(const sx of [-.9,.9])for(const sz of [-.4,.4])box(b,.06,2,.06,C.wood,x+sx,y,z+sz);box(b,1.9,.7,.9,C.wood,x,y,z);for(let k=0;k<6;k++)box(b,.34,.05,1.3,k%2?C.awningA:C.awningB,x-.85+k*.34,y+2+Math.abs(k-2.5)*-.02,z,0);for(let k=0;k<5;k++)b.add(new T.SphereGeometry(.09,6,5),k%2?'#c58a3c':'#8a4b2a',[x-.6+k*.3,y+.78,z]);}
function lindenTree(b:Builder,x:number,y:number,z:number,seed:number){box(b,.9,.4,.9,C.stoneDark,x,y,z);cyl(b,.07,.1,1.3,'#5a4636',x,y+.4,z,6);for(const [dx,dy,s] of [[0,2.3,.75],[-.4,1.95,.5],[.42,2,.52]] as const)b.add(new T.IcosahedronGeometry(s,1),C.leaf,[x+dx,y+dy,z],[0,seed+dx,0],[1,.95,1],.14);}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'palatine-chapel-octagon-and-dome','gothic-choir-glass-house','cathedral-west-tower-spire','aachen-town-hall-towers','karlsbrunnen-fountain','elisenbrunnen-rotunda','half-timbered-houses','rooftop-dormers-and-weathercocks','beer-garden-and-market-stalls']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(52064),detail=new T.Group();detail.name='aachen-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  cathedral(detail,low);townHall(detail,flagMaterial(bandedFlagTexture([['#000000',1],['#dd0000',1],['#ffce00',1]])),low);elisenbrunnen(detail,low);timberHouses(detail,finish,r,low);
  // Lindens shade the squares in front of the monuments.
  const lindens:Placement[]=[];for(let k=0;k<(low?10:22);k++)lindens.push({x:-30+r()*(finish+70),y:aachen.ground,z:-17.5-r()*2.5,scale:.8+r()*.4,rotation:r()*6});
  plantGrove(detail,'plane',lindens,{low,name:'aachen-linden-trees'});
  const pigeons=createFlock(detail,{name:'aachen-pigeons',count:low?5:11,centre:[aachen.octagonX,aachen.ground+24,aachen.z],radius:[24,4,7],speed:.26,size:.6,color:'#8f969c',wing:'#6f767c',seed:17,glide:false});
  let reduced=context.reducedMotion;pigeons.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(!reduced)pigeons.update(time);},setReducedMotion(value){reduced=value;pigeons.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||t==='climb-wall'||w<2.8)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.4:REAR-.12,seed=definition.id.length*11+Math.round(definition.x),y=surface(0);
  if(t==='rooftop'){chimneyStack(b,w/2-.9,surface(w/2-.9),rear,2+seed%2,{brick:C.brick,cap:'#6d3a2c',pot:'#d8b08a'});geraniumBox(b,-w/2+.3,w/2-1.6,y,rear+.12);if(w>3.6)dormer(b,-w/2+1.1,surface(-w/2+1.1),rear-.05);if(seed%3===0)weathercock(b,0,y,rear);}
  else if(t==='ground'){if(deep){marketStall(b,-w/2+1.5,y,-2.3);beerTable(b,w/2-1.6,y,-1.9);lindenTree(b,0,y,-2.5,seed);lampPost(b,glow,-w/2+.5,y,-1.3);if(w>9)beerTable(b,2.2,y,-1.55);}else{geraniumBox(b,-w/2+.3,w/2-.3,y,rear+.1);lampPost(b,glow,(seed%2?1:-1)*(w/2-.5),y,REAR);}}
  else if(t==='stairs'){for(let x=-w/2+.2;x<=w/2-.2;x+=.6)box(b,.05,.95,.05,C.iron,x,surface(x),rear);}
  finishProps(root,b,glow,'aachen-roofs-and-squares');
 },
};
