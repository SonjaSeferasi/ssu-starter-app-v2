import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl,roof} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {FACES,QUARTER,REAR,balustrade as stoneBalustrade,bench,chimneyStack,finishProps,flagMaterial,glowMaterial,lampPost,pinnacle as kitPinnacle,place,pointedWindow,pyramid,railing,texturedStone,turret as kitTurret,wavingFlag} from './europe-detail';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import type {CountryEnvironment} from './types';

/** United Kingdom: Westminster on the Thames (SRS-632.1). The shared European
 * builder supplies the river, ground, sky and platform bodies; this module
 * replaces its block landmark with a detailed river front: Victoria Tower, the
 * Gothic bays of the Palace of Westminster, the Central Tower, Elizabeth Tower
 * with its four clock dials, Westminster Bridge with a bus and a cab, the
 * embankment with its lamps and plane trees, the Abbey behind, and London
 * street furniture along the route. A stylized, lengthened study: scenery
 * only, with no colliders, and nothing placed in the walking lane. */
const C={stone:'#d9c79a',shade:'#b9a57a',trim:'#eadcb6',dark:'#8f7f5c',slate:'#47525a',glass:'#26333e',gold:'#d2a63f',iron:'#22262a',granite:'#9a9a94',
 green:'#5d8f6e',greenDark:'#3f6a50',red:'#c8102e',redDark:'#8f0d22',brick:'#8a4b3a',cream:'#f4efdf',black:'#1b1d20',white:'#f5f4ee',wood:'#6f5136'} as const;
const base=europeEnvironment('GBR',{landmark:false});
export const westminster={terraceY:-.9,bayWidth:2.2,palace:[12,154] as const,victoriaX:12,centralX:83,elizabethX:158.5,bridgeX:167,riverZ:-9} as const;

// Honey-coloured dressed limestone: a fine pale ashlar map, warmed by the tint.
const stoneMaterial=()=>texturedStone('paris-stone','#f6e6bd',1.5);
const gothicWindow=(stone:Builder,plain:Builder,x:number,y:number,z:number,w:number,h:number,low:boolean)=>pointedWindow(stone,plain,x,y,z,w,h,low,{frame:C.trim,glass:C.glass});
const pinnacle=(stone:Builder,x:number,y:number,z:number,size:number,low:boolean)=>kitPinnacle(stone,x,y,z,size,low,{shaft:C.stone,spire:C.trim,finial:C.gold});
const turret=(stone:Builder,plain:Builder,x:number,y:number,z:number,radius:number,height:number,low:boolean)=>kitTurret(stone,plain,x,y,z,radius,height,low,{wall:C.stone,trim:C.trim,cap:C.slate,finial:C.gold});
const flag=(parent:T.Object3D,material:T.Material,x:number,y:number,z:number,width:number)=>wavingFlag(parent,material,x,y,z,width,'union-flag');
const balustrade=(b:Builder,from:number,to:number,y:number,z:number)=>stoneBalustrade(b,from,to,y,z,{rail:C.trim,base:C.shade,baluster:C.stone});
const chimneys=(b:Builder,x:number,y:number,z:number,pots:number)=>chimneyStack(b,x,y,z,pots,{brick:C.brick,cap:'#6d3a2c',pot:'#d8b08a'});

/** One bay of the river front, facing +z with the wall face at z=0. */
function palaceBay(height:number,low:boolean){
 const stone=new Builder(),plain=new Builder(),w=westminster.bayWidth;
 box(stone,w,.7,.26,C.dark,0,0,.13);box(stone,.46,height*.45,.56,C.shade,-w/2,0,.28);box(stone,.34,height+.5,.42,C.stone,-w/2,0,.21);pinnacle(stone,-w/2,height+.5,.21,.8,low);
 gothicWindow(stone,plain,0,1,.02,1.24,2.1,low);gothicWindow(stone,plain,0,4.25,.02,1.24,1.95,low);
 box(stone,w,.16,.14,C.trim,0,3.72,.07);box(stone,w,.28,.24,C.trim,0,height-.3,.12);
 for(let k=0;k<4;k++)box(stone,.3,.42,.2,C.stone,-w/2+.42+k*.47,height,.1);
 return{stone:stone.geometry(),plain:plain.geometry()};
}

/** The Union Flag, drawn procedurally at 60 by 30 texels. */
function unionFlagTexture(){
 const blue=[1,33,105],red=[200,16,46],white=[255,255,255];
 return pixelTexture(60,(u,v)=>{
  const x=u*2-1,y=v*2-1,diagonal=Math.min(Math.abs(y-x),Math.abs(y+x))*.7071;
  let c=blue;if(diagonal<.2)c=white;if(diagonal<.075)c=red;
  if(Math.abs(x)<.2||Math.abs(y)<.32)c=white;if(Math.abs(x)<.11||Math.abs(y)<.19)c=red;
  return[c[0],c[1],c[2],255];
 },true,false);
}
/** A clock dial facing +z: cream face, black rim, twelve marks and two hands. */
function clockDial(radius:number){
 const face=new Builder(),trim=new Builder();
 face.add(new T.CylinderGeometry(radius,radius,.06,28),C.cream,[0,0,0],[Math.PI/2,0,0]);
 trim.add(new T.TorusGeometry(radius,.07,6,28),C.black,[0,0,.04]);trim.add(new T.TorusGeometry(radius*1.12,.06,6,28),C.gold,[0,0,.02]);
 for(let hour=0;hour<12;hour++){const a=hour/12*Math.PI*2;trim.add(new T.BoxGeometry(.07,radius*(hour%3?.14:.24),.03),C.black,[Math.sin(a)*radius*.84,Math.cos(a)*radius*.84,.05],[0,0,-a]);}
 // Ten past ten: the hands frame the dial.
 trim.add(new T.BoxGeometry(.11,radius*.55,.03),C.black,[-Math.sin(1.047)*radius*.27,Math.cos(1.047)*radius*.27,.07],[0,0,1.047]);
 trim.add(new T.BoxGeometry(.08,radius*.86,.03),C.black,[Math.sin(1.047)*radius*.42,Math.cos(1.047)*radius*.42,.08],[0,0,-1.047]);
 trim.add(new T.CylinderGeometry(.12,.12,.06,10),C.gold,[0,0,.09],[Math.PI/2,0,0]);
 return{face:face.geometry(),trim:trim.geometry()};
}

function victoriaTower(root:T.Object3D,flagMaterial:T.Material,low:boolean){
 const group=new T.Group();group.name='victoria-tower';root.add(group);const stone=new Builder(.5),plain=new Builder(),x=westminster.victoriaX,y=westminster.terraceY,z=-27.5,w=6.4,h=19;
 box(stone,w,h,w,C.stone,x,y,z);box(stone,w+.3,.9,w+.3,C.dark,x,y,z);
 for(const level of [6.4,12.6,h-.4])box(stone,w+.24,.26,w+.24,C.trim,x,y+level,z);
 for(const sx of [-1,1])for(const sz of [-1,1])turret(stone,plain,x+sx*w/2,y,z+sz*w/2,.78,h+2.2,low);
 for(const [turn,dx,dz] of FACES){
  const face=new Builder(),glass=new Builder();
  box(glass,2.5,4.6,.1,C.black,0,.9,.04);face.add(new T.ConeGeometry(1.9,1.5,4),C.trim,[0,6.25,.02],[0,QUARTER,0],[1,1,.1]);
  for(const offset of [-1.7,0,1.7]){gothicWindow(face,glass,offset,7.3,.02,1.05,4.2,low);gothicWindow(face,glass,offset,13.4,.02,1.05,3.9,low);}
  for(let k=0;k<9;k++)box(face,.42,.6,.22,C.stone,-w/2+.75+k*.62,h,.1);
  place(stone,face.geometry(),x+dx*w/2,y,z+dz*w/2,turn);place(plain,glass.geometry(),x+dx*w/2,y,z+dz*w/2,turn);
 }
 pyramid(plain,.5,w*.42,1.5,C.slate,x,y+h,z);cyl(plain,.07,.07,5.2,C.iron,x,y+h+1.5,z,6);plain.add(new T.SphereGeometry(.16,8,6),C.gold,[x,y+h+6.8,z]);
 stone.mesh(group,stoneMaterial(),'victoria-tower-stone');plain.mesh(group,vertexMaterial(.7),'victoria-tower-roofs-and-glass');
 flag(group,flagMaterial,x+.07,y+h+5.7,z,2.8);group.userData={landmark:'Victoria Tower',height:h+8,flag:'Union Flag'};
}

function palace(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='palace-of-westminster';root.add(group);const stone=new Builder(.5),plain=new Builder(),[from,to]=westminster.palace,y=westminster.terraceY,front=-19,height=7.4,length=to-from,middle=(from+to)/2;
 box(stone,length,height,6,C.stone,middle,y,front-3);roof(plain,length,2.5,5.6,C.slate,middle,y+height,front-3);
 const bay=palaceBay(height,low),bays=Math.floor(length/westminster.bayWidth);
 for(let k=0;k<bays;k++){const x=from+westminster.bayWidth*(k+.5);place(stone,bay.stone,x,y,front);place(plain,bay.plain,x,y,front);}
 bay.stone.dispose();bay.plain.dispose();
 // Pavilion towers break the long front, each with corner turrets and a steep roof.
 for(const x of [from+length*.27,middle,from+length*.73]){
  box(stone,5,height+2,6.6,C.stone,x,y,front-2.7);for(const sx of [-1,1])turret(stone,plain,x+sx*2.5,y,front+.55,.42,height+2.6,low);
  for(const offset of [-1.2,1.2]){gothicWindow(stone,plain,x+offset,y+1,front+.62,1.1,2.2,low);gothicWindow(stone,plain,x+offset,y+4.3,front+.62,1.1,3.4,low);}
  for(let k=0;k<8;k++)box(stone,.36,.5,.22,C.stone,x-2.1+k*.6,y+height+2,front+.5);pyramid(plain,.7,2.3,2.6,C.slate,x,y+height+2,front-2.7);
 }
 // Small ventilating spirelets ride the long ridge.
 for(let x=from+6;x<to-4;x+=11){cyl(stone,.34,.4,1.5,C.shade,x,y+height+2.2,front-3,8);cone(plain,.44,1.9,C.slate,x,y+height+3.7,front-3,8);}
 stone.mesh(group,stoneMaterial(),'palace-river-front-stone');plain.mesh(group,vertexMaterial(.7),'palace-roofs-and-glass');
 group.userData={landmark:'Palace of Westminster',style:'Neo-Gothic',bays,length};
}

function centralTower(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='central-tower';root.add(group);const stone=new Builder(.5),plain=new Builder(),x=westminster.centralX,y=westminster.terraceY+7.4,z=-26.5;
 cyl(stone,2.3,2.5,4.6,C.stone,x,y,z,8);cyl(stone,2.5,2.5,.3,C.trim,x,y+4.6,z,8);
 for(let k=0;k<8;k++){const a=k/8*Math.PI*2+Math.PI/8;pinnacle(stone,x+Math.cos(a)*2.35,y+4.9,z+Math.sin(a)*2.35,.95,low);box(plain,.55,2.4,.08,C.glass,x+Math.cos(a+Math.PI/8)*2.32,y+1.1,z+Math.sin(a+Math.PI/8)*2.32,-(a+Math.PI/8)+Math.PI/2);}
 cone(stone,2.2,9.5,C.shade,x,y+4.9,z,8);cyl(plain,.05,.05,1.4,C.iron,x,y+14.4,z,5);plain.add(new T.SphereGeometry(.2,8,6),C.gold,[x,y+15.9,z]);
 stone.mesh(group,stoneMaterial(),'central-tower-stone');plain.mesh(group,vertexMaterial(.7),'central-tower-glass');group.userData={landmark:'Central Tower',spire:'octagonal'};
}

function elizabethTower(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='elizabeth-tower';root.add(group);const stone=new Builder(.5),plain=new Builder(),x=westminster.elizabethX,y=westminster.terraceY,z=-29,w=3.6,shaft=12.6;
 box(stone,w,shaft,w,C.stone,x,y,z);box(stone,w+.36,1,w+.36,C.dark,x,y,z);
 for(const sx of [-1,1])for(const sz of [-1,1])box(stone,.5,shaft+.2,.5,C.shade,x+sx*(w/2-.06),y,z+sz*(w/2-.06));
 for(let level=2.7;level<shaft;level+=2.45)box(stone,w+.2,.15,w+.2,C.trim,x,y+level,z);
 const dial=clockDial(1.55),faces=new Builder(),stage=y+shaft+.35,centre=stage+2.15;
 for(const [turn,dx,dz] of FACES){
  // Tall panelled strips with slit windows run up every face of the shaft.
  const face=new Builder(),glass=new Builder();
  for(const offset of [-.95,0,.95]){box(face,.62,shaft-2.2,.07,C.shade,offset,1.5,.03);for(let k=0;k<(low?3:5);k++)box(glass,.18,.9,.05,C.glass,offset,2+k*2.15,.08);}
  // Belfry louvres above the dial, gilded square surround around it.
  box(glass,2.7,.95,.08,C.black,0,shaft+4.95,.33);for(let k=0;k<5;k++)box(face,.1,1.05,.1,C.trim,-1.2+k*.6,shaft+4.9,.38);
  for(const [bx,by,bw,bh] of [[0,shaft+.55,3.9,.12],[0,shaft+4.45,3.9,.12],[-1.9,shaft+.55,.12,4],[1.9,shaft+.55,.12,4]] as const)box(glass,bw,bh,.08,C.gold,bx,by,.36);
  place(stone,face.geometry(),x+dx*w/2,y,z+dz*w/2,turn);place(plain,glass.geometry(),x+dx*w/2,y,z+dz*w/2,turn);
  place(faces,dial.face,x+dx*2.22,centre+.35,z+dz*2.22,turn);place(plain,dial.trim,x+dx*2.22,centre+.35,z+dz*2.22,turn);
 }
 dial.face.dispose();dial.trim.dispose();
 box(stone,4.5,.3,4.5,C.trim,x,y+shaft,z);box(stone,4.3,4.4,4.3,C.stone,x,stage,z);box(stone,4.55,.26,4.55,C.trim,x,stage+4.4,z);
 box(stone,3.9,1.5,3.9,C.stone,x,stage+4.66,z);box(stone,4.2,.22,4.2,C.trim,x,stage+6.16,z);
 for(const sx of [-1,1])for(const sz of [-1,1])pinnacle(stone,x+sx*2.05,stage+6.38,z+sz*2.05,.7,low);
 const roofBase=stage+6.38;pyramid(plain,1.25,1.95,2.3,C.slate,x,roofBase,z);
 for(const [dx,dz] of [[0,1],[1,0],[0,-1],[-1,0]] as const){box(plain,.62,.7,.3,C.gold,x+dx*1.62,roofBase+.5,z+dz*1.62,dx?Math.PI/2:0);box(plain,.36,.4,.34,C.black,x+dx*1.64,roofBase+.6,z+dz*1.64,dx?Math.PI/2:0);}
 box(stone,2.3,1.25,2.3,C.stone,x,roofBase+2.3,z);for(const [dx,dz] of [[0,1],[1,0],[0,-1],[-1,0]] as const)box(plain,dx?.08:1.5,.8,dx?1.5:.08,C.gold,x+dx*1.16,roofBase+2.5,z+dz*1.16);
 pyramid(plain,.12,1.25,3.3,C.slate,x,roofBase+3.55,z);cyl(plain,.05,.05,.9,C.gold,x,roofBase+6.85,z,5);plain.add(new T.SphereGeometry(.2,8,6),C.gold,[x,roofBase+6.95,z]);box(plain,.5,.07,.07,C.gold,x,roofBase+7.35,z);
 stone.mesh(group,stoneMaterial(),'elizabeth-tower-stone');plain.mesh(group,vertexMaterial(.62),'elizabeth-tower-roofs-and-gilding');
 const dials=faces.mesh(group,vertexMaterial(.5,{emissive:new T.Color('#fff0c4'),emissiveIntensity:.28}),'elizabeth-tower-clock-dials');dials.castShadow=false;
 group.userData={landmark:'Elizabeth Tower',clockFaces:4,dialCentreY:centre+.35,height:roofBase+7.5-y};
}

/** Westminster Bridge crosses the river on seven low arches of green iron. */
function bridge(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='westminster-bridge';root.add(group);const b=new Builder(),x=westminster.bridgeX,near=-1.7,far=-16.5,arches=7,span=(near-far)/arches,deck=-.35,water=-2.4,width=3.6;
 box(b,width,.34,near-far+1.2,C.granite,x,deck-.34,(near+far)/2);box(b,width+1.4,deck-water+1.2,1.6,C.granite,x,water-1.4,near+.9);
 for(let k=0;k<=arches;k++){const z=far+k*span;box(b,width+.5,deck-.34-water+1.4,.5,C.granite,x,water-1.4,z);if(k%1===0)cyl(b,.3,.34,.5,C.granite,x-width/2-.1,deck-.2,z,8);}
 for(let k=0;k<arches;k++)for(const side of [-1,1]){
  const z0=far+k*span+.25,z1=far+(k+1)*span-.25,points:T.Vector3[]=[];for(let s=0;s<=8;s++){const t=s/8;points.push(new T.Vector3(x+side*(width/2+.02),water+.15+Math.sin(t*Math.PI)*(deck-.6-water),z0+(z1-z0)*t));}
  b.add(new T.TubeGeometry(new T.CatmullRomCurve3(points),10,.11,5,false),C.green);
  for(let s=1;s<(low?3:6);s++){const z=z0+(z1-z0)*s/(low?3:6),crown=water+.15+Math.sin(s/(low?3:6)*Math.PI)*(deck-.6-water);box(b,.06,deck-.45-crown,.06,C.greenDark,x+side*(width/2+.02),crown,z);}
  box(b,.08,.5,z1-z0+.5,C.green,x+side*width/2,deck,(z0+z1)/2);box(b,.14,.07,z1-z0+.5,C.greenDark,x+side*width/2,deck+.5,(z0+z1)/2);
 }
 // Triple-globe lamps stand on every pier.
 const glow=new Builder();
 for(let k=0;k<=arches;k+=low?2:1)for(const side of [-1,1]){const z=far+k*span,lx=x+side*(width/2+.1);cyl(b,.05,.07,1.5,C.iron,lx,deck,z,6);box(b,.5,.05,.05,C.iron,lx,deck+1.25,z);for(const offset of [-.24,0,.24])glow.add(new T.SphereGeometry(.12,8,6),C.cream,[lx+offset,deck+(offset?1.38:1.62),z]);}
 // A red double-decker bus and a black cab cross the bridge.
 const bus=[x-.75,deck,-9.5] as const;box(b,1.05,1.9,3.3,C.red,bus[0],bus[1]+.2,bus[2]);box(b,1.09,.1,3.34,C.cream,bus[0],bus[1]+1.12,bus[2]);box(b,1.07,.45,3.1,C.glass,bus[0],bus[1]+.6,bus[2]);box(b,1.07,.45,3.1,C.glass,bus[0],bus[1]+1.4,bus[2]);
 for(const wz of [-1.1,1.1])for(const wx of [-.5,.5])b.add(new T.CylinderGeometry(.22,.22,.12,10),C.black,[bus[0]+wx,bus[1]+.22,bus[2]+wz],[0,0,Math.PI/2]);
 const cab=[x+.8,deck,-5] as const;box(b,.85,.55,1.9,C.black,cab[0],cab[1]+.16,cab[2]);box(b,.8,.5,1.1,C.black,cab[0],cab[1]+.7,cab[2]-.1);box(b,.82,.3,.95,C.glass,cab[0],cab[1]+.78,cab[2]-.1);box(b,.3,.12,.1,'#f2c230',cab[0],cab[1]+1.2,cab[2]+.2);
 for(const wz of [-.6,.6])for(const wx of [-.42,.42])b.add(new T.CylinderGeometry(.17,.17,.1,10),'#0f1012',[cab[0]+wx,cab[1]+.17,cab[2]+wz],[0,0,Math.PI/2]);
 b.mesh(group,vertexMaterial(.7),'westminster-bridge-ironwork-and-traffic');
 const lamps=glow.mesh(group,glowMaterial(),'westminster-bridge-lamps');lamps.castShadow=false;
 group.userData={landmark:'Westminster Bridge',arches,traffic:['double-decker bus','black cab']};
}

/** The far embankment: a granite river wall, a paved terrace and its lamps. */
function embankment(root:T.Object3D,finish:number,low:boolean){
 const group=new T.Group();group.name='thames-embankment';root.add(group);const stone=new Builder(.5),plain=new Builder(),glow=new Builder(),from=-46,to=finish+70,top=westminster.terraceY;
 box(stone,to-from,top+4.4,20,C.granite,(from+to)/2,-4.4,-26.5);box(stone,to-from,.3,.5,'#b3b3ac',(from+to)/2,top,-16.6);
 for(let x=from+3;x<to;x+=low?14:7){if(Math.abs(x-westminster.bridgeX)<3)continue;box(stone,.6,.5,.6,C.granite,x,top+.3,-16.6);cyl(plain,.06,.09,2.1,C.iron,x,top+.8,-16.6,6);plain.add(new T.TorusGeometry(.2,.03,5,10),C.iron,[x,top+2.75,-16.6]);glow.add(new T.SphereGeometry(.2,10,8),C.cream,[x,top+3,-16.6]);}
 // Mooring rings and dark tide marks on the wall.
 if(!low)for(let x=from+5;x<to;x+=9)plain.add(new T.TorusGeometry(.16,.035,5,10),C.iron,[x,-1.4,-16.45],[0,0,0]);
 box(plain,to-from,.5,.06,'#6f7a70',(from+to)/2,-2.45,-16.47);
 stone.mesh(group,texturedStone('ashlar','#e6e4dc',1,.95),'embankment-river-wall');plain.mesh(group,vertexMaterial(.7),'embankment-lamp-standards');
 const lamps=glow.mesh(group,glowMaterial(),'embankment-lamps');lamps.castShadow=false;group.userData={feature:'Thames embankment'};
}

/** Westminster Abbey's west towers and nave, and the city beyond, behind the palace. */
function skyline(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='westminster-skyline';root.add(group);const b=new Builder(),y=westminster.terraceY;
 for(const sx of [-1,1]){const x=58+sx*2.6;box(b,3.4,13,3.4,'#cfc3a4',x,y,-47);for(const cx of [-1,1])for(const cz of [-1,1])b.add(new T.ConeGeometry(.3,1.8,4),'#dccfae',[x+cx*1.5,y+13.9,-47+cz*1.5],[0,QUARTER,0]);box(b,1,3.2,.1,C.glass,x,y+8,-45.25);}
 box(b,22,9,5,'#c9bd9e',71,y,-49);roof(b,22,3,5.4,'#59646b',71,y+9,-49);for(let k=0;k<7;k++)box(b,.5,10.4,.9,'#b9ad8e',61.5+k*3.1,y,-46.2);
 for(let x=-40;x<finish+70;x+=5+r()*4){const w=4+r()*4,h=5+r()*5,z=-52-r()*16,tone=['#b9b2a2','#a8a093','#c4bba6','#9f988c'][Math.floor(r()*4)];
  box(b,w,h,5,tone,x,y,z);if(r()>.4)roof(b,w,1.4+r(),5.2,'#5f666a',x,y+h,z);else box(b,w+.3,.3,5.3,'#8d877c',x,y+h,z);
  if(!low)for(let col=0;col<Math.floor(w/1.3);col++)for(let row=0;row<Math.floor(h/1.7);row++)box(b,.45,.8,.06,'#3c4650',x-w/2+.8+col*1.3,y+.9+row*1.7,z+2.52);
  if(r()>.82){box(b,1.1,h+5,1.1,tone,x+w*.3,y,z-1);cone(b,.75,3.2,'#59646b',x+w*.3,y+h+5,z-1,8);}
 }
 b.mesh(group,vertexMaterial(.94),'westminster-abbey-and-city');group.userData={landmark:'Westminster Abbey',role:'distant skyline'};
}

/** A Thames tour boat: white hull, glazed cabin and an open top deck. */
function tourBoat(root:T.Object3D){
 const b=new Builder();box(b,6.4,.7,1.7,'#1f3a5c',0,0,0);box(b,6.6,.14,1.8,C.white,0,.7,0);box(b,4.6,.85,1.5,C.white,-.3,.84,0);box(b,4.4,.5,1.54,C.glass,-.3,1,0);box(b,4.8,.1,1.6,C.white,-.3,1.69,0);
 for(let k=0;k<6;k++)box(b,.05,.45,.05,C.white,-2.5+k*.9,1.79,.75);box(b,4.7,.05,.05,C.white,-.3,2.22,.75);box(b,.5,.3,.3,C.red,2.6,.84,0);cyl(b,.03,.03,1.3,C.white,-2.9,1.79,0,5);
 const boat=b.mesh(root,vertexMaterial(.6),'thames-tour-boat');boat.userData={animated:true,feature:'river traffic'};return boat;
}

// London street furniture, in a platform's own coordinates. Everything stands
// behind the walking lane (z of at most -0.75), never in it.
function telephoneBox(b:Builder,x:number,y:number,z:number){
 box(b,.9,2.25,.9,C.red,x,y,z);box(b,.98,.14,.98,C.redDark,x,y,z);box(b,.98,.2,.98,C.red,x,y+2.25,z);b.add(new T.SphereGeometry(.56,10,6,0,Math.PI*2,0,Math.PI/2),C.red,[x,y+2.4,z],[0,0,0],[1,.42,1]);
 for(const side of [0,1,2])for(let row=0;row<3;row++)box(b,side===1?.62:.05,.5,side===1?.05:.62,C.glass,x+(side===0?-.46:side===2?.46:0),y+.4+row*.58,z+(side===1?.46:0));
 box(b,.66,.16,.05,C.cream,x,y+2.08,z+.46);
}
function pillarBox(b:Builder,x:number,y:number,z:number){cyl(b,.27,.27,.22,C.black,x,y,z,12);cyl(b,.24,.24,1.15,C.red,x,y+.22,z,12);cyl(b,.3,.27,.12,C.red,x,y+1.37,z,12);b.add(new T.SphereGeometry(.27,12,6,0,Math.PI*2,0,Math.PI/2),C.red,[x,y+1.49,z],[0,0,0],[1,.45,1]);box(b,.26,.05,.04,C.black,x,y+1.12,z+.24);}
export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'elizabeth-tower-clock-dials','palace-gothic-bays','victoria-tower-union-flag','central-tower-spire','westminster-bridge-bus-and-cab','thames-embankment-lamps','westminster-abbey-skyline','thames-tour-boat','london-street-furniture']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(51820),detail=new T.Group();detail.name='westminster-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  const unionFlag=flagMaterial(unionFlagTexture());
  embankment(detail,finish,low);victoriaTower(detail,unionFlag,low);palace(detail,low);centralTower(detail,low);elizabethTower(detail,low);bridge(detail,low);skyline(detail,finish,r,low);
  // London plane trees shade the gardens south of the palace and the road beyond the bridge.
  const spots:Placement[]=[];for(let k=0;k<(low?7:14);k++)spots.push({x:-40+r()*44,y:westminster.terraceY,z:-19.5-r()*9,scale:1+r()*.5,rotation:r()*6});
  for(let k=0;k<(low?5:10);k++)spots.push({x:westminster.bridgeX+6+r()*(finish+60-westminster.bridgeX),y:westminster.terraceY,z:-19.5-r()*7,scale:.9+r()*.5,rotation:r()*6});
  plantGrove(detail,'plane',spots,{low,name:'london-plane-trees'});
  const boat=tourBoat(detail),gulls=createFlock(detail,{name:'thames-gulls',count:low?4:9,centre:[finish*.5,6,westminster.riverZ],radius:[30,3,5],speed:.2,size:.8,color:'#f2f2ee',wing:'#c9ccd0',seed:7,glide:true});
  let reduced=context.reducedMotion;const sail=(time:number)=>{const lap=finish+110;boat.position.set(-50+(time*.9)%lap,-2.5+Math.sin(time*.9)*.03,westminster.riverZ+1.5);boat.rotation.z=Math.sin(time*.7)*.012;};sail(0);gulls.root.visible=!reduced;
  return{...mounted,
   update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;sail(time);gulls.update(time);},
   setReducedMotion(value){reduced=value;gulls.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='water-raft'||t==='mechanical'||w<3)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),seed=definition.id.length*31+Math.round(definition.x),rear=Math.max(-(Math.max(2,definition.depth)/2-.3),REAR-.2),at=(x:number)=>surface(x);
  if(t==='bridge'){balustrade(b,-w/2+.3,w/2-.3,at(0),rear);lampPost(b,glow,-w/2+.9,at(-w/2+.9),rear+.32);if(w>7)lampPost(b,glow,w/2-.9,at(w/2-.9),rear+.32);}
  else if(t==='rooftop'){chimneys(b,w/2-1.1,at(w/2-1.1),rear,2+seed%2);if(w>5){chimneys(b,-w/2+1.2,at(-w/2+1.2),rear,2);box(b,.04,1.5,.04,C.iron,0,at(0),rear);for(let k=0;k<3;k++)box(b,.7-k*.16,.03,.03,C.iron,0,at(0)+.9+k*.25,rear);}}
  else if(t==='stairs'){railing(b,-w/2+.2,w/2-.2,Math.min(at(-w/2+.2),at(w/2-.2)),rear);}
  else{railing(b,-w/2+.25,w/2-.25,at(0),Math.max(-(Math.max(2,definition.depth)/2-.15),-2.6));lampPost(b,glow,-w/2+.8,at(-w/2+.8),REAR);
   if(w>5){telephoneBox(b,-w/2+2.3,at(-w/2+2.3),REAR-.1);pillarBox(b,-w/2+3.6,at(-w/2+3.6),REAR+.05);}if(w>8){bench(b,.8,at(.8),REAR);lampPost(b,glow,w/2-.8,at(w/2-.8),REAR);}}
  finishProps(root,b,glow,'london-street-furniture');
 },
};
