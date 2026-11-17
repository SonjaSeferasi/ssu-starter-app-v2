import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl,roof} from './europe-landmarks';
import {Builder,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {FACES,REAR,archedWindow,awningStall,balustrade,bandedFlagTexture,battlementTower,bench,chimneyStack,dormer,drumDome,finishProps,flagMaterial,flowerBox,lampPost,pinnacle,place,pointedWindow,pottedTree,pyramid,settle,statue,texturedStone,townhouse,turret,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Poland: Krakow's Main Market Square and Wawel (SRS-632.7). Across the
 * Vistula stand the two unequal brick towers of St Mary's Basilica, the
 * taller under its Gothic helm of small turrets and a gilded crown; the long
 * arcaded Cloth Hall with its ornate parapet; the Town Hall Tower with its
 * clock; little domed St Adalbert's and the poet's monument; and the
 * coloured burgher houses of the square. To the right Wawel Hill carries the
 * royal castle and the cathedral with its golden chapel dome. Horse-drawn
 * carriages wait on the square and pigeons wheel overhead. The route carries
 * flower stalls, pretzel carts, lamps and balconies. Scenery only. */
const C={brick:'#f6e6de',brickDark:'#8f4a32',stone:'#e2d6ba',cream:'#efe5c9',trim:'#f6efdc',slate:'#445058',green:'#5f8f80',gold:'#d6a938',glass:'#28343f',red:'#a8553b',iron:'#22262a',
 white:'#f5f2e9',wood:'#7a5c40',blue:'#2f6fae',horse:'#f1ede4',horseDark:'#6b4a32',bronze:'#56645a',leaf:'#4a7d3f',rock:'#b9b09c',quay:'#c9c0aa'} as const;
const burgher=['#e9c98a','#d98f6a','#c9d6b0','#e7b0a0','#efe0b0','#b9cfe0','#d9b06a','#e3c0cf'] as const;
const base=europeEnvironment('POL',{landmark:false});
export const krakow={squareTop:-1,basilicaX:34,clothHallX:76,townHallX:104,wawelX:150,wawelTop:7} as const;
// Warm red brick: a fine block map tinted brick-red (the darker brick map reads almost black from a distance).
const brickwork=()=>texturedStone('sandstone-blocks','#c47a66',2.2,.94);
const gothic={frame:C.stone,glass:C.glass};

function basilica(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='st-marys-basilica';root.add(group);const s=new Builder(.5),p=new Builder(),x=krakow.basilicaX,y=krakow.squareTop,z=-27;
 box(s,9,12,14,C.brick,x,y,z-8);roof(p,9.4,4.6,14.4,C.red,x,y+12,z-8,Math.PI/2);pointedWindow(s,p,x,y+3,z-.96,2,6.4,low,gothic);box(p,2,3,.1,'#3a2a20',x,y,z-.95);
 // The taller north tower: Gothic helm ringed by eight turrets, with a gilded crown.
 const tall=x-4.6,h1=24;box(s,3.8,h1,3.8,C.brick,tall,y,z-1.9);for(const level of [6,12,18,h1-.2])box(s,4,.26,4,C.stone,tall,y+level,z-1.9);
 for(const [turn,dx,dz] of FACES){const face=new Builder(),glass=new Builder();for(const level of [7.4,13.2,19])pointedWindow(face,glass,0,level,.02,.9,2.6,low,gothic);place(s,face.geometry(),tall+dx*1.9,y,z-1.9+dz*1.9,turn);place(p,glass.geometry(),tall+dx*1.9,y,z-1.9+dz*1.9,turn);}
 cyl(s,1.75,1.9,3,C.brick,tall,y+h1,z-1.9,8);for(let k=0;k<8;k++){const a=k/8*Math.PI*2;turret(s,p,tall+Math.cos(a)*1.9,y+h1+1.6,z-1.9+Math.sin(a)*1.9,.24,2.2,low,{wall:C.brick,trim:C.stone,cap:C.slate,finial:C.gold});}
 cone(p,1.5,8.4,C.slate,tall,y+h1+3,z-1.9,8);p.add(new T.TorusGeometry(.62,.1,6,14),C.gold,[tall,y+h1+8,z-1.9],[Math.PI/2,0,0]);for(let k=0;k<8;k++)p.add(new T.ConeGeometry(.07,.3,4),C.gold,[tall+Math.cos(k*.785)*.62,y+h1+8.2,z-1.9+Math.sin(k*.785)*.62]);p.add(new T.SphereGeometry(.16,8,6),C.gold,[tall,y+h1+11.6,z-1.9]);
 // The lower south tower under a Renaissance cap.
 const short=x+4.6,h2=18;box(s,3.8,h2,3.8,C.brick,short,y,z-1.9);for(const level of [6,12,h2-.2])box(s,4,.26,4,C.stone,short,y+level,z-1.9);
 for(const level of [7.4,13.2])pointedWindow(s,p,short,y+level,z+.02,.9,2.6,low,gothic);
 pyramid(p,1.1,2.1,1.6,C.slate,short,y+h2,z-1.9);cyl(s,.9,1,1.6,C.brick,short,y+h2+1.6,z-1.9,8);p.add(new T.SphereGeometry(1.05,12,8,0,Math.PI*2,0,Math.PI/2),C.green,[short,y+h2+3.2,z-1.9],[0,0,0],[1,1.2,1]);cone(p,.3,1.6,C.slate,short,y+h2+4.4,z-1.9,8);
 s.mesh(group,brickwork(),'st-marys-brick-towers');p.mesh(group,vertexMaterial(.62),'st-marys-helms-and-glass');group.userData={landmark:"St Mary's Basilica",towers:2,tallTower:h1+12,shortTower:h2+6};settle(group,[x,y,z],.52,26);
}

function clothHall(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='cloth-hall';root.add(group);const s=new Builder(),p=new Builder(),x=krakow.clothHallX,y=krakow.squareTop,z=-23,w=40,h=6.4;
 box(s,w,h,7,C.cream,x,y,z-3.5);roof(p,w+.4,2.6,7.4,C.red,x,y+h+1.3,z-3.5);
 // Ground-floor arcade, then the tall attic with its scrolled parapet.
 const bays=low?10:20;for(let k=0;k<bays;k++){const ax=x-w/2+w*(k+.5)/bays;archedWindow(s,p,ax,y,z+.02,w/bays*.62,2.4,{frame:C.trim,glass:'#3a2c24'});cyl(s,.13,.15,2.4,C.trim,ax+w/bays/2,y,z+.5,8);}
 box(s,w+.4,.4,1.2,C.trim,x,y+3.5,z+.3);for(let k=0;k<bays;k++){const ax=x-w/2+w*(k+.5)/bays;box(p,w/bays*.4,.9,.06,C.glass,ax,y+4.3,z+.03);}
 box(s,w,1.3,.4,C.cream,x,y+h,z-.2);for(let k=0;k<(low?20:40);k++){const ax=x-w/2+.5+k*(w-1)/(low?19:39);s.add(new T.SphereGeometry(.26,8,6),C.trim,[ax,y+h+1.45,z-.2],[0,0,0],[1,1.2,.5]);if(k%4===0)pinnacle(s,ax,y+h+1.3,z-.2,.6,low,{shaft:C.cream,spire:C.trim,finial:C.gold});}
 // The central transept gable.
 box(s,6,h+3,8,C.cream,x,y,z-3.2);s.add(new T.CylinderGeometry(.02,3,2.6,3,1),C.cream,[x,y+h+4.3,z+.7],[0,-Math.PI/2,0],[.2,1,1]);archedWindow(s,p,x,y,z+.82,2.2,3.4,{frame:C.trim,glass:'#33261e'});
 s.mesh(group,vertexMaterial(.92),'cloth-hall-arcades-and-parapet');p.mesh(group,vertexMaterial(.7),'cloth-hall-roof-and-glass');group.userData={landmark:'Cloth Hall (Sukiennice)',arcadeBays:bays};
}

function squareMonuments(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='town-hall-tower';root.add(group);const s=new Builder(.5),p=new Builder(),x=krakow.townHallX,y=krakow.squareTop,z=-24;
 box(s,4.4,19,4.4,C.brick,x,y,z);for(const level of [5,10,15,18.8])box(s,4.7,.28,4.7,C.stone,x,y+level,z);for(const [turn,dx,dz] of FACES){const face=new Builder(),glass=new Builder();pointedWindow(face,glass,0,6,.02,1,2.6,low,gothic);glass.add(new T.CylinderGeometry(1,1,.08,20),C.white,[0,13,.06],[Math.PI/2,0,0]);glass.add(new T.TorusGeometry(1,.08,5,20),C.gold,[0,13,.1]);box(glass,.07,.7,.03,C.iron,0,13,.12);box(glass,.5,.06,.03,C.iron,.25,13,.12);place(s,face.geometry(),x+dx*2.2,y,z+dz*2.2,turn);place(p,glass.geometry(),x+dx*2.2,y,z+dz*2.2,turn);}
 pyramid(p,1.3,2.5,1.6,C.green,x,y+19,z);cyl(s,1.1,1.2,1.8,C.brick,x,y+20.6,z,8);p.add(new T.SphereGeometry(1.25,12,8,0,Math.PI*2,0,Math.PI/2),C.green,[x,y+22.4,z],[0,0,0],[1,1.3,1]);cone(p,.3,2.4,C.green,x,y+23.9,z,8);p.add(new T.SphereGeometry(.16,8,6),C.gold,[x,y+26.4,z]);
 s.mesh(group,brickwork(),'town-hall-tower-brick');p.mesh(group,vertexMaterial(.62),'town-hall-clock-and-caps');group.userData={landmark:'Town Hall Tower',clockFaces:4};settle(group,[x,y,z],.6,22);
 // St Adalbert's little domed church and the poet's monument stand on the open square.
 const square=new T.Group();square.name='square-monuments';root.add(square);const c=new Builder(),d=new Builder(),m=new Builder();
 box(c,4.4,4,4.4,C.white,x-12,y,-20.5);archedWindow(c,d,x-12,y+.3,-18.28,1.1,2.2,{frame:C.trim,glass:'#3a2a20'});drumDome(c,d,x-12,y+4,-20.5,1.9,1.1,{wall:C.white,trim:C.trim,dome:C.green,finial:C.gold,glass:C.glass},{low,cross:true});
 statue(m,krakow.clothHallX-25,y,-19.5,4.6,{pedestal:C.stone,figure:C.bronze});for(const [dx,dz] of [[-1.3,0],[1.3,0],[0,1.3]] as const)statue(m,krakow.clothHallX-25+dx,y,-19.5+dz,1.5,{pedestal:C.stone,figure:C.bronze});
 c.mesh(square,vertexMaterial(.9),'st-adalbert-church');d.mesh(square,vertexMaterial(.62),'st-adalbert-dome');m.mesh(square,vertexMaterial(.7),'mickiewicz-monument');square.userData={feature:"St Adalbert's Church and the Mickiewicz Monument"};
}

function burgherHouses(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='burgher-houses';root.add(group);const s=new Builder(),p=new Builder(),y=krakow.squareTop;let houses=0;
 box(s,finish+130,y+4.4,62,C.quay,finish/2,-4.4,-48);for(let x=-44;x<finish+80;x+=low?2.4:1.2)box(p,.05,.9,.05,C.iron,x,y,-17.1);box(p,finish+124,.05,.05,C.iron,finish/2+18,y+.9,-17.1);
 for(let x=-42;x<krakow.wawelX-22;){const w=3.4+r()*1.8,h=7+r()*3;
  // The row opens where the basilica and the Town Hall Tower stand behind it.
  if(Math.abs(x+w/2-krakow.basilicaX)<5+w/2||Math.abs(x+w/2-krakow.townHallX)<2.4+w/2){x+=w;continue;}
  townhouse(s,p,x+w/2,y,-34,w-.12,h,5,{wall:burgher[Math.floor(r()*burgher.length)],trim:C.trim,glass:C.glass,roof:r()>.5?C.red:C.slate},{rows:Math.round(h/2.3),roof:r()>.5?'gable':'parapet',door:true,low});houses++;x+=w;}
 s.mesh(group,vertexMaterial(.93),'burgher-house-walls');p.mesh(group,vertexMaterial(.7),'burgher-house-windows-and-roofs');group.userData={feature:'Burgher houses of the Main Square',houses};
}

function wawel(root:T.Object3D,flag:T.Material,r:()=>number,low:boolean){
 const group=new T.Group();group.name='wawel-castle';root.add(group);const rock=new Builder(.5),s=new Builder(.5),c=new Builder(),p=new Builder(),x=krakow.wawelX,top=krakow.wawelTop,z=-30;
 box(rock,46,top+4.4,22,C.rock,x,-4.4,z-4);for(let k=0;k<(low?8:16);k++)box(rock,3+r()*3,4+r()*5,2+r()*2,C.rock,x-22+k*2.9,-4.4+r()*2,z+7.4,(r()-.5)*.3);rock.mesh(group,texturedStone('paris-stone','#f6eedc',.5,.97),'wawel-hill-limestone');
 // Red-brick ramparts and towers along the hill's edge.
 box(s,44,3,1,C.brick,x,top,z+6.4);for(const [tx,w,h] of [[x-19,3.2,9],[x-6,2.8,7.5],[x+16,3.4,10]] as const){battlementTower(s,tx,top,z+5.8,w,h,{wall:C.brick,trim:C.stone});pyramid(p,.1,w*.62,2.6,C.red,tx,top+h+.6,z+5.8);}
 // The royal castle's arcaded wing and the cathedral with its chapels.
 box(c,20,8,7,C.cream,x+8,top,z-2);pyramid(p,2,11,3,C.red,x+8,top+8,z-2);for(let row=0;row<3;row++)for(let k=0;k<(low?6:10);k++)archedWindow(c,p,x-1+k*(low?3.4:1.9),top+.4+row*2.5,z+1.52,.9,1.5,{frame:C.trim,glass:C.glass});
 box(c,10,9,6,C.stone,x-10,top,z-1);roof(p,10.4,3,6.4,C.green,x-10,top+9,z-1);box(c,2.8,16,2.8,C.stone,x-15,top,z+1);p.add(new T.SphereGeometry(1.5,12,8,0,Math.PI*2,0,Math.PI/2),C.green,[x-15,top+16,z+1],[0,0,0],[1,1.5,1]);cone(p,.4,3.6,C.green,x-15,top+18,z+1,8);
 box(s,2.6,13,2.6,C.brick,x-5.5,top,z+1.4);cone(p,1.7,5,C.green,x-5.5,top+13,z+1.4,8);
 drumDome(c,p,x-10,top+4.6,z+3,1.7,1.4,{wall:C.stone,trim:C.trim,dome:C.gold,finial:C.gold,glass:C.glass},{low,cross:true});drumDome(c,p,x-13.4,top+4.6,z+3,1.5,1.2,{wall:C.stone,trim:C.trim,dome:C.green,finial:C.gold,glass:C.glass},{low});
 cyl(p,.06,.08,5,C.iron,x+16,top+12.6,z+5.8,5);s.mesh(group,brickwork(),'wawel-brick-ramparts-and-towers');c.mesh(group,vertexMaterial(.9),'wawel-castle-and-cathedral-walls');p.mesh(group,vertexMaterial(.55),'wawel-roofs-and-golden-dome');
 wavingFlag(group,flag,x+16.06,top+16.6,z+5.8,2.6,'poland-flag',.62);group.userData={landmark:'Wawel Castle and Cathedral',goldenDome:'Sigismund Chapel'};settle(group,[x,-4.4,z],.62,18);
}

/** A white horse-drawn carriage of the kind that waits on the square. */
function carriage(b:Builder,x:number,y:number,z:number){
 for(const hx of [1.9,2.9]){box(b,1.3,.62,.42,C.horse,x+hx,y+.75,z+(hx>2?.3:-.3));box(b,.36,.6,.3,C.horse,x+hx+.7,y+1.15,z+(hx>2?.3:-.3));for(const leg of [-.45,.45])box(b,.1,.75,.1,C.horse,x+hx+leg,y,z+(hx>2?.3:-.3));box(b,.12,.5,.1,C.horseDark,x+hx-.65,y+.7,z+(hx>2?.3:-.3));}
 box(b,2,.5,1.1,C.white,x,y+.7,z);box(b,.9,.7,1.1,C.white,x-.5,y+1.2,z);box(b,1.9,.08,1.2,'#c8102e',x,y+1.2,z);for(const wx of [-.7,.7])for(const wz of [-.6,.6])b.add(new T.TorusGeometry(wx<0?.52:.38,.045,5,14),C.gold,[x+wx,y+(wx<0?.52:.38),z+wz]);box(b,1.4,.06,.06,C.wood,x+1.5,y+.8,z);
}

// Route furniture, in a platform's own coordinates, behind the walking lane.
/** A blue cart of obwarzanki, the ring-shaped bread sold on Krakow's streets. */
function pretzelCart(b:Builder,x:number,y:number,z:number){box(b,1.1,.9,.6,C.blue,x,y+.35,z);box(b,1.2,.06,.7,C.white,x,y+1.25,z);for(const side of [-.5,.5])box(b,.04,1.6,.04,C.white,x+side,y+.35,z+.26);box(b,1.2,.3,.05,C.blue,x,y+1.9,z+.26);for(const wx of [-.42,.42])b.add(new T.TorusGeometry(.22,.035,5,12),C.iron,[x+wx,y+.22,z+.32]);for(let k=0;k<5;k++)b.add(new T.TorusGeometry(.1,.035,5,10),'#c58a3c',[x-.4+k*.2,y+1.38,z+.05],[.5,0,0]);}
const flowerPot=(b:Builder,x:number,y:number,z:number,seed:number)=>pottedTree(b,x,y,z,.7,{pot:'#b96a42',trunk:'#5a4636',leaf:C.leaf,fruit:seed%2?'#e85a7a':'#f2d24a'},seed);

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'st-marys-unequal-towers-and-crown','cloth-hall-arcades-and-parapet','town-hall-tower-clock','wawel-castle-and-golden-dome','burgher-houses','horse-drawn-carriages','flower-stalls-and-pretzel-carts']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(48231),detail=new T.Group();detail.name='krakow-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  burgherHouses(detail,finish,r,low);basilica(detail,low);clothHall(detail,low);squareMonuments(detail,low);wawel(detail,flagMaterial(bandedFlagTexture([['#ffffff',1],['#dc143c',1]])),r,low);
  const cabs=new Builder();carriage(cabs,56,krakow.squareTop,-18.6);carriage(cabs,96,krakow.squareTop,-18.8);cabs.mesh(detail,vertexMaterial(.8),'horse-drawn-carriages');
  const lindens:Placement[]=[];for(let k=0;k<(low?8:18);k++)lindens.push({x:-40+r()*(finish+60),y:krakow.squareTop,z:-17.8-r()*.8,scale:.6+r()*.25,rotation:r()*6});plantGrove(detail,'plane',lindens,{low,name:'planty-trees'});
  const pigeons=createFlock(detail,{name:'krakow-pigeons',count:low?6:14,centre:[krakow.clothHallX,9,-22],radius:[30,4,5],speed:.3,size:.55,color:'#8f969c',wing:'#6f767c',seed:23,glide:false});
  let reduced=context.reducedMotion;pigeons.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(!reduced)pigeons.update(time);},setReducedMotion(value){reduced=value;pigeons.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.8)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*19+Math.round(definition.x),y=surface(0);
  if(t==='rooftop'){chimneyStack(b,w/2-.9,surface(w/2-.9),rear,2+seed%2,{brick:C.brickDark,cap:'#6d3a2c',pot:'#d8b08a'});flowerBox(b,-w/2+.3,w/2-1.6,y,rear+.12,C.wood,['#d32f3a','#ffffff','#e85a7a']);if(w>3.6)dormer(b,-w/2+1.1,surface(-w/2+1.1),rear-.05,C.cream,C.glass,C.red);}
  else if(t==='ground'){lampPost(b,glow,-w/2+.5,y,-1.3);awningStall(b,-w/2+1.9,y,-2.3,{wood:C.wood,stripeA:'#d32f3a',stripeB:C.white,goods:['#e85a7a','#f2d24a','#d32f3a','#ffffff','#8e3aa8']});if(seed%2)pretzelCart(b,w/2-1.3,y,-1.9);else bench(b,w/2-1.4,y,-1.9);if(w>8){flowerPot(b,.4,y,-2.3,seed);lampPost(b,glow,w/2-.5,y,-1.3);}}
  else if(t==='terrace'){balustrade(b,-w/2+.25,w/2-.25,y,rear,{rail:C.trim,base:'#d8ccb0',baluster:C.stone});flowerPot(b,(seed%2?1:-1)*(w/2-.9),y,-1.7,seed);if(w>5)bench(b,(seed%2?-1:1)*(w/2-1.5),y,-1.8);}
  else if(t==='stairs'){for(let x=-w/2+.2;x<=w/2-.2;x+=.6)box(b,.05,.95,.05,C.iron,x,surface(x),rear);}
  finishProps(root,b,glow,'krakow-square-and-roofs');
 },
};
