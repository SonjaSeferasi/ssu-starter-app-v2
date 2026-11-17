import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cyl,roof} from './europe-landmarks';
import {Builder,random,vertexMaterial,type Placement} from '../kit/common';
import {createHeightfield,mountainColor,ridgedRange} from '../kit/landform';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {FACES,REAR,archedWindow,bandedFlagTexture,battlementTower,finishProps,flagMaterial,lampPost,pottedTree,pyramid,texturedStone,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Spain: the Alhambra above the Darro (SRS-632.2). The red fortress crowns
 * its hill across the river: the Alcazaba with the Torre de la Vela and its
 * bell, the long crenellated curtain wall, the Comares Tower, the tiled roofs
 * of the Nasrid palaces, the Palace of Charles V, the white Generalife among
 * cypresses, the Albayzin's white houses and the snow of the Sierra Nevada.
 * The route carries what the palaces are known for: slender-columned arcades,
 * tiled dados, a pool and fountain, myrtle hedges and potted orange trees. A
 * stylized study: scenery only, no colliders, nothing in the walking lane. */
const C={wall:'#c98862',wallDark:'#a86a48',trim:'#dba27c',earth:'#b08a62',plaster:'#f1ebdd',ochre:'#e3c896',tile:'#b5633c',tileDark:'#93492c',marble:'#f3eee2',glass:'#2a2422',
 water:'#4f9aa8',myrtle:'#3f6b3c',pot:'#b96a42',trunk:'#6b4a32',leaf:'#3f7a3a',orange:'#f28c1e',brass:'#b88a3a',blue:'#2f6f9f',green:'#3f8a6a',white:'#f6f3ea',stone:'#cdbb98'} as const;
const base=europeEnvironment('ESP',{landmark:false});
export const alhambra={hillTop:1.2,wallZ:-21,wall:[8,168] as const,velaX:16,comaresX:84,generalifeX:166} as const;
const tapia=()=>texturedStone('sandstone-blocks','#f0b48e',1.2,.95);
const windows={frame:C.trim,glass:C.glass};

function hill(root:T.Object3D,finish:number){
 const group=new T.Group();group.name='sabika-hill';root.add(group);const b=new Builder(.5),from=-46,to=finish+60;
 box(b,to-from,alhambra.hillTop+4.4,26,C.earth,(from+to)/2,-4.4,-30);
 // A stepped, buttressed scarp drops to the river.
 for(let x=from+2;x<to;x+=6.5){box(b,5.6,2.2,1.4,'#a37f58',x,-2.4,-16.6);box(b,1.1,alhambra.hillTop+2.6,1,'#9a7650',x+3.1,-2.4,-16.9);}
 b.mesh(group,texturedStone('sandstone-cliff','#e9c39c',.8,.97),'sabika-red-earth-scarp');group.userData={feature:'Sabika hill above the Darro'};
}

function fortress(root:T.Object3D,flag:T.Material,low:boolean){
 const group=new T.Group();group.name='alhambra-fortress';root.add(group);const stone=new Builder(.5),plain=new Builder(),y=alhambra.hillTop,z=alhambra.wallZ,[from,to]=alhambra.wall;
 // Curtain wall with pyramid-capped merlons.
 box(stone,to-from,5,1.3,C.wall,(from+to)/2,y,z);box(stone,to-from,.3,1.5,C.trim,(from+to)/2,y+4.2,z);
 for(let x=from+.4;x<to;x+=low?1.9:.95){box(stone,.5,.62,.4,C.wall,x,y+5,z+.4);pyramid(stone,.02,.25,.28,C.trim,x,y+5.62,z+.4);}
 const towers=[[alhambra.velaX,4.4,12.6],[24.5,3,8.4],[31.5,3.4,9.6],[41,3,7.6],[56,3,8],[alhambra.comaresX,5.6,12],[100,2.7,8.6],[113,3.4,7.2],[128,3,8.6],[142,2.8,7.6],[158,3.4,9.2]] as const;
 for(const [x,w,h] of towers){
  battlementTower(stone,x,y,z+.6,w,h,{wall:C.wall,trim:C.trim},'pyramid');
  // Paired horseshoe windows high on each visible face.
  for(const [turn,dx,dz] of FACES){if(dz<0)continue;const face=new Builder(),glass=new Builder();for(const offset of w>4?[-.9,.9]:[0]){archedWindow(face,glass,offset-.24,h*.62,.02,.36,.8,windows,true);archedWindow(face,glass,offset+.24,h*.62,.02,.36,.8,windows,true);}
   if(w>4)for(const offset of [-1.2,0,1.2])archedWindow(face,glass,offset,h*.32,.02,.5,1,windows,true);
   stone.parts.push(face.geometry().applyMatrix4(new T.Matrix4().makeRotationY(turn).setPosition(x+dx*w/2,y,z+.6+dz*w/2)));plain.parts.push(glass.geometry().applyMatrix4(new T.Matrix4().makeRotationY(turn).setPosition(x+dx*w/2,y,z+.6+dz*w/2)));}
 }
 // Torre de la Vela: its bell gable and the flag.
 const vx=alhambra.velaX,vy=y+12.6;box(stone,1.7,1.9,.4,C.wall,vx,vy+.6,z+.6);archedWindow(stone,plain,vx,vy+.9,z+.82,.7,.75,windows);plain.add(new T.SphereGeometry(.26,10,8,0,Math.PI*2,0,Math.PI*.6),C.brass,[vx,vy+1.55,z+.6]);pyramid(stone,.02,.95,.45,C.trim,vx,vy+2.5,z+.6);
 cyl(plain,.05,.05,3.4,'#3a3a3a',vx+1.6,vy+.6,z+.6,5);
 // Comares Tower: the tallest, with a tiled lantern roof.
 pyramid(plain,.3,2.3,1.4,C.tile,alhambra.comaresX,y+12.6,z+.6);
 // Nasrid palaces: plastered halls and tiled hip roofs step along behind the wall.
 const r=random(4410);
 for(let x=60;x<122;x+=4.6+r()*2.4){const w=4+r()*2.6,h=3.6+r()*2.6,pz=z-3.4-r()*4;box(stone,w,h,4.4,r()>.5?C.ochre:C.plaster,x,y,pz);pyramid(plain,w*.12,w*.56,1.3+r()*.5,r()>.5?C.tile:C.tileDark,x,y+h,pz);
  if(!low)for(let k=0;k<Math.floor(w/1.4);k++)archedWindow(stone,plain,x-w/2+.9+k*1.4,y+h*.5,pz+2.21,.42,.8,windows,true);}
 // Palace of Charles V: a square Renaissance block of rusticated stone.
 box(stone,9,6.6,7,C.stone,50,y,z-7);box(stone,9.3,.4,7.3,C.trim,50,y+3.2,z-7);box(stone,9.3,.45,7.3,C.trim,50,y+6.6,z-7);
 for(let k=0;k<6;k++){box(plain,.7,1.5,.08,C.glass,46.4+k*1.45,y+1.1,z-3.46);plain.add(new T.CircleGeometry(.42,12),C.glass,[46.4+k*1.45,y+4.9,z-3.45]);}
 // Santa Maria's bell tower rises behind.
 box(stone,2.2,10.4,2.2,C.ochre,72,y,z-9);pyramid(plain,.05,1.35,2.2,C.tile,72,y+10.4,z-9);for(const [turn,dx,dz] of FACES){void turn;box(plain,dx?.08:.7,1.2,dz?.08:.7,C.glass,72+dx*1.11,y+8.4,z-9+dz*1.11);}
 stone.mesh(group,tapia(),'alhambra-red-walls-and-towers');plain.mesh(group,vertexMaterial(.82),'alhambra-tiled-roofs-and-windows');
 wavingFlag(group,flag,vx+1.65,vy+3.4,z+.6,2.2,'spain-flag',.62);group.userData={landmark:'Alhambra',towers:towers.length,style:'Nasrid fortress and palaces'};
}

/** The Generalife: white summer palace with a long arcade, among cypresses. */
function generalife(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='generalife';root.add(group);const b=new Builder(),x=alhambra.generalifeX+14,y=alhambra.hillTop+3,z=-31;
 box(b,34,3,10,'#8f9a62',x,alhambra.hillTop,z);box(b,22,3.4,4.2,C.white,x,y,z);roof(b,22.4,1.3,4.6,C.tile,x,y+3.4,z);
 for(let k=0;k<(low?7:13);k++){const ax=x-9.6+k*(low?3.2:1.6);cyl(b,.09,.1,1.9,C.marble,ax,y+.2,z+2.2,8);b.add(new T.CircleGeometry(.62,12,0,Math.PI),C.glass,[ax+.8,y+2.1,z+2.13]);}
 box(b,22,.5,.3,C.white,x,y+2.7,z+2.2);box(b,5.2,5.6,4.6,C.white,x+13,y,z);pyramid(b,.2,3,1.6,C.tile,x+13,y+5.6,z);box(b,5,5,4.4,C.white,x-13,y,z);pyramid(b,.2,2.9,1.5,C.tileDark,x-13,y+5,z);
 b.mesh(group,vertexMaterial(.9),'generalife-white-pavilions');group.userData={landmark:'Generalife'};
}

/** The Albayzin: white houses with tiled roofs climbing the facing hill. */
function albayzin(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='albayzin';root.add(group);const b=new Builder(),r=random(9911);
 for(let k=0;k<(low?26:54);k++){const x=-44+r()*46,row=Math.floor(r()*5),z=-18.5-row*3.4,y=alhambra.hillTop+row*1.25,w=2+r()*1.8,h=1.8+r()*1.6;
  box(b,w,h+row*1.25+1,2.6,r()>.2?C.white:C.plaster,x,alhambra.hillTop-.6,z);roof(b,w+.3,.6+r()*.3,2.9,r()>.4?C.tile:C.tileDark,x,y+h+.4,z);if(!low)box(b,.4,.6,.06,C.glass,x+(r()-.5)*w*.5,y+h*.5,z+1.31);}
 box(b,2,9.5,2,C.plaster,-18,alhambra.hillTop+3.6,-30);pyramid(b,.05,1.25,1.8,C.tile,-18,alhambra.hillTop+13.1,-30);
 b.mesh(group,vertexMaterial(.92),'albayzin-white-houses');group.userData={landmark:'Albayzin'};
}

// Route furniture, in a platform's own coordinates, behind the walking lane.
/** A Nasrid arcade: slender marble columns carrying horseshoe arches under a tiled eave. */
function arcade(b:Builder,from:number,to:number,y:number,z:number){
 const bays=Math.max(2,Math.round((to-from)/1.15)),step=(to-from)/bays;
 for(let k=0;k<=bays;k++){const x=from+k*step;cyl(b,.055,.065,1.75,C.marble,x,y,z,8);box(b,.22,.16,.22,C.marble,x,y+1.75,z);}
 for(let k=0;k<bays;k++){const x=from+(k+.5)*step;b.add(new T.TorusGeometry(step*.43,.07,5,12,Math.PI*1.2),C.plaster,[x,y+1.95,z],[0,0,-Math.PI*.1]);}
 box(b,to-from+.3,.5,.16,C.plaster,(from+to)/2,y+2.45,z);for(let k=0;k<Math.round((to-from)/.3);k++)box(b,.2,.1,.05,[C.blue,C.green,C.ochre][k%3],from+.15+k*.3,y+2.55,z+.09);
 roof(b,to-from+.5,.34,.6,C.tile,(from+to)/2,y+2.95,z);
}
/** A dado of glazed tiles along a low wall. */
function tiledWall(b:Builder,from:number,to:number,y:number,z:number){box(b,to-from,.7,.18,C.plaster,(from+to)/2,y,z);box(b,to-from+.1,.08,.24,C.trim,(from+to)/2,y+.7,z);for(let k=0;k<Math.round((to-from)/.24);k++)box(b,.2,.34,.03,[C.blue,C.white,C.green,C.ochre][k%4],from+.12+k*.24,y+.18,z+.1);}
/** A long pool between myrtle hedges, with a low fountain. */
function pool(b:Builder,from:number,to:number,y:number,z:number){box(b,to-from,.1,.72,C.marble,(from+to)/2,y,z);box(b,to-from-.2,.05,.5,C.water,(from+to)/2,y+.08,z);for(const side of [-.5,.5])box(b,to-from,.34,.2,C.myrtle,(from+to)/2,y,z+side);
 cyl(b,.2,.24,.16,C.marble,(from+to)/2,y+.1,z,12);cyl(b,.02,.03,.5,'#bfe3ea',(from+to)/2,y+.26,z,5);}
function merlonWall(b:Builder,from:number,to:number,y:number,z:number){box(b,to-from,.62,.26,C.wall,(from+to)/2,y,z);for(let x=from+.25;x<to;x+=.7){box(b,.34,.36,.26,C.wall,x,y+.62,z);pyramid(b,.02,.17,.2,C.trim,x,y+.98,z);}}
const orangeTree=(b:Builder,x:number,y:number,z:number,seed:number)=>pottedTree(b,x,y,z,1,{pot:C.pot,trunk:C.trunk,leaf:C.leaf,fruit:C.orange},seed);

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'alhambra-red-walls-and-towers','torre-de-la-vela-bell','comares-tower','nasrid-palace-roofs','palace-of-charles-v','generalife-arcade','albayzin-white-houses','sierra-nevada-snow','nasrid-arcades-pools-and-tiles']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(77120),detail=new T.Group();detail.name='alhambra-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  const flag=flagMaterial(bandedFlagTexture([['#aa151b',1],['#f1bf00',2],['#aa151b',1]]));
  hill(detail,finish);fortress(detail,flag,low);generalife(detail,low);albayzin(detail,low);
  // The Sierra Nevada stands snow-capped behind the city.
  const sierra=createHeightfield(detail,{name:'sierra-nevada',x:finish/2,y:-8,z:-150,width:finish+300,depth:64,segments:[low?40:90,low?14:28],height:ridgedRange(6120,{peaks:9,height:52,sharpness:1.45}),color:mountainColor({snowLine:27,treeLine:12,rock:'#8d857c',forest:'#5c7048',snow:'#f4f6f8'})});sierra.userData.landmark='Sierra Nevada';
  // Cypresses line the walls and gardens; palms and elms fill the slope.
  const cypress:Placement[]=[],palms:Placement[]=[];
  for(let k=0;k<(low?16:34);k++)cypress.push({x:alhambra.wall[0]+r()*(finish+40-alhambra.wall[0]),y:alhambra.hillTop,z:-18.4-r()*1.6,scale:.9+r()*.7,rotation:r()*6});
  for(let k=0;k<(low?8:16);k++)cypress.push({x:alhambra.generalifeX+r()*30,y:alhambra.hillTop+3,z:-26-r()*3,scale:1.1+r()*.6,rotation:r()*6});
  for(let k=0;k<(low?4:8);k++)palms.push({x:20+r()*130,y:alhambra.hillTop,z:-18.2-r(),scale:.8+r()*.4,rotation:r()*6});
  plantGrove(detail,'cypress',cypress,{low,name:'alhambra-cypresses'});plantGrove(detail,'date-palm',palms,{low,name:'alhambra-palms'});
  const swifts=createFlock(detail,{name:'granada-swifts',count:low?5:11,centre:[finish*.5,13,-20],radius:[34,3,6],speed:.34,size:.55,color:'#2c2c30',wing:'#3a3a40',seed:13,glide:false});
  let reduced=context.reducedMotion;swifts.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(!reduced)swifts.update(time);},setReducedMotion(value){reduced=value;swifts.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='water-raft'||t==='mechanical'||w<3.5)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.5:REAR-.15,seed=definition.id.length*7+Math.round(definition.x);
  if(t==='ground'){arcade(b,-w/2+.5,w/2-.5,surface(0),rear);if(deep){pool(b,-w/2+1.4,w/2-1.4,surface(0),-1.55);orangeTree(b,-w/2+.7,surface(-w/2+.7),-1.55,seed);orangeTree(b,w/2-.7,surface(w/2-.7),-1.55,seed+2);}else tiledWall(b,-w/2+.4,w/2-.4,surface(0),REAR);}
  else if(t==='terrace'){merlonWall(b,-w/2+.2,w/2-.2,surface(0),rear);orangeTree(b,(seed%2?1:-1)*(w/2-.8),surface(0),REAR+.1,seed);if(w>5)lampPost(b,glow,(seed%2?-1:1)*(w/2-.8),surface(0),REAR,C.brass);}
  else if(t==='arch'&&w>6){tiledWall(b,-w/2+.4,w/2-.4,surface(0),rear);for(const x of [-w/2+1,0,w/2-1])orangeTree(b,x,surface(x),REAR+.1,seed+Math.round(x));}
  else if(t==='stairs')merlonWall(b,-w/2+.2,w/2-.2,Math.min(surface(-w/2+.2),surface(w/2-.2)),rear);
  finishProps(root,b,glow,'alhambra-court-furniture');
 },
};
