import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl,roof} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {FACES,REAR,archedWindow,awningStall,bench,chimneyStack,dormer,finishProps,flagMaterial,flowerBox,fountain,lampPost,place,pointedWindow,pyramid,railing,texturedStone,townhouse,wavingFlag,windowGrid} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Switzerland: the Abbey of St Gall (SRS-632.16). Over the old town rise
 * the twin towers of the Baroque cathedral, their curved front between them
 * and their green caps above; beside it the long white wings of the abbey
 * close the monastery courtyard, with the library wing among them. Painted
 * town houses with carved oriel windows line the street in front, the
 * Gothic tower of St Laurence lifts its green spire, and green hills with
 * farmhouses climb toward the snowy Alps. The Swiss flag flies in the
 * courtyard. The route carries a flower-decked fountain, lamps, a cheese
 * stall, geraniums, chimneys and dormers. Scenery only: nothing collides. */
const C={sandstone:'#f4efe2',sandstoneDark:'#e2dac6',white:'#f7f4ec',trim:'#fbf8ef',grey:'#b9b4a8',copper:'#5f8f7c',copperDark:'#4a7262',red:'#a8533a',redDark:'#8a4332',slate:'#4f5a60',glass:'#27343f',gold:'#d6a938',
 lawn:'#86b062',hill:'#6f9f55',hillDark:'#5a8a4a',farm:'#8a6a4a',iron:'#22262a',wood:'#7a5c40',woodDark:'#5c4330',leaf:'#4a7d3f',geranium:'#d32f3a',cheese:'#f2c84a',paving:'#cfc8b6'} as const;
const facades=['#f2ead8','#e9c9a8','#d9e0c8','#e6d39a','#e3c0b8','#cfd8e0','#f6f0e0'] as const;
// The abbey precinct, the old town and the hills are built here on level ground.
const base=europeEnvironment('CHE',{landmark:false,flat:true,town:false});
export const stGall={ground:-5,cathedralX:92,cathedralZ:-40,courtX:[104,150],laurenceX:44} as const;
const stonework=()=>texturedStone('paris-stone','#fbf6e8',1.2,.94);

function precinct(root:T.Object3D,finish:number,low:boolean){
 const group=new T.Group();group.name='abbey-precinct';root.add(group);const p=new Builder(),y=stGall.ground,from=-56,to=finish+90;
 box(p,to-from,.3,34,C.paving,(from+to)/2,y,-33);box(p,stGall.courtX[1]-stGall.courtX[0]-4,.36,9,C.lawn,(stGall.courtX[0]+stGall.courtX[1])/2,y,-33);for(let x=from+3;x<to;x+=low?10:5)cyl(p,.16,.2,.6,C.grey,x,y+.3,-16.6,8);
 p.mesh(group,vertexMaterial(.96),'precinct-paving-and-lawn');group.userData={feature:'Abbey precinct'};
}

function cathedral(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='st-gall-cathedral';root.add(group);const s=new Builder(.5),p=new Builder(),x=stGall.cathedralX,y=stGall.ground,z=stGall.cathedralZ,window={frame:C.trim,glass:C.glass};
 // The nave runs back from the east front; a low dome marks the rotunda.
 box(s,11,9,24,C.sandstone,x,y,z-12);roof(p,11.4,3.4,24.4,C.redDark,x,y+9,z-12,Math.PI/2);cyl(s,4.2,4.2,2,C.sandstone,x,y+9,z-12,low?10:16);p.add(new T.SphereGeometry(4.3,low?10:16,8,0,Math.PI*2,0,Math.PI/2),C.redDark,[x,y+11,z-12],[0,0,0],[1,.5,1]);
 // The east front: a convex centre between the two towers.
 s.add(new T.CylinderGeometry(4.4,4.4,10,low?10:18,1,false,-Math.PI/2,Math.PI),C.sandstone,[x,y+5,z],[0,0,0],[1,1,.5]);s.add(new T.CylinderGeometry(4.7,4.7,.4,low?10:18,1,false,-Math.PI/2,Math.PI),C.trim,[x,y+10.2,z],[0,0,0],[1,1,.5]);
 for(const dx of [-2.4,0,2.4]){archedWindow(s,p,x+dx,y+1,z+(dx?1.75:2.22),1.1,3,window);archedWindow(s,p,x+dx,y+5.6,z+(dx?1.75:2.22),1,2.6,window);}s.add(new T.CylinderGeometry(.02,4.2,2.2,3,1),C.sandstone,[x,y+11.5,z+.4],[0,-Math.PI/2,0],[.3,1,1]);
 for(const side of [-1,1]){const tx=x+side*5.6;let level=y;for(const [w,h] of [[4,10.4],[3.5,4.4],[3,3.2]] as const){box(s,w,h,w,C.sandstone,tx,level,z-.6);box(s,w+.3,.3,w+.3,C.trim,tx,level+h-.15,z-.6);
   for(const [turn,dx,dz] of FACES){const face=new Builder(),glass=new Builder();archedWindow(face,glass,0,h*.5,.02,w*.3,h*.38,window);for(const edge of [-1,1])box(face,.26,h-.3,.14,C.trim,edge*(w/2-.2),0,.07);place(s,face.geometry(),tx+dx*w/2,level,z-.6+dz*w/2,turn);place(p,glass.geometry(),tx+dx*w/2,level,z-.6+dz*w/2,turn);}level+=h;}
  // The cap: a swelling copper helm, a lantern and a small onion with its cross.
  p.add(new T.SphereGeometry(2,low?10:14,8,0,Math.PI*2,0,Math.PI/2),C.copper,[tx,level,z-.6],[0,0,0],[1,.8,1]);cyl(s,.7,.8,1,C.sandstone,tx,level+1.5,z-.6,8);p.add(new T.SphereGeometry(.9,10,8),C.copper,[tx,level+3,z-.6],[0,0,0],[1,1.1,1]);cone(p,.3,1.2,C.copper,tx,level+3.8,z-.6,8);box(p,.07,.8,.07,C.gold,tx,level+5,z-.6);box(p,.44,.07,.07,C.gold,tx,level+5.5,z-.6);group.userData.towerTop=level+5.8;}
 s.mesh(group,stonework(),'cathedral-sandstone-front-and-towers');p.mesh(group,vertexMaterial(.6),'cathedral-copper-caps-and-roof');group.userData={...group.userData,landmark:'Abbey Cathedral of St Gall',towers:2};
}

function abbey(root:T.Object3D,flag:T.Material,low:boolean){
 const group=new T.Group();group.name='abbey-wings-and-library';root.add(group);const s=new Builder(),p=new Builder(),y=stGall.ground,[c0,c1]=stGall.courtX,colors={wall:C.white,trim:C.grey,glass:C.glass,roof:C.red};
 // Three wings close the courtyard: the library wing at the back and a wing at each side.
 box(s,c1-c0,7.4,6,C.white,(c0+c1)/2,y,-44);windowGrid(s,p,(c0+c1)/2,y+.6,-40.98,c1-c0-1,6.2,low?10:18,3,colors,false,low);roof(p,c1-c0+.4,2.6,6.4,C.red,(c0+c1)/2,y+7.4,-44);for(let k=0;k<(low?4:8);k++)dormer(p,c0+3+k*(c1-c0-6)/(low?3:7),y+7.9,-41.6,C.white,C.glass,C.redDark);
 for(const wx of [c0+3,c1-3]){box(s,6,7.4,14,C.white,wx,y,-34);windowGrid(s,p,wx,y+.6,-26.98,5.2,6.2,3,3,colors,true,low);roof(p,6.4,2.6,14.4,C.red,wx,y+7.4,-34,Math.PI/2);s.add(new T.CylinderGeometry(.02,3,2.6,3,1),C.white,[wx,y+8.7,-26.9],[0,-Math.PI/2,0],[.1,1,1]);}
 // The library portal, and the flag in the courtyard.
 box(s,4.4,8,1,C.sandstone,(c0+c1)/2,y,-40.6);archedWindow(s,p,(c0+c1)/2,y,-40.08,1.8,3.2,{frame:C.trim,glass:'#3a2a20'});s.add(new T.CylinderGeometry(.02,2.4,1.4,3,1),C.sandstone,[(c0+c1)/2,y+8.7,-40.3],[0,-Math.PI/2,0],[.2,1,1]);box(p,1.6,.5,.06,C.gold,(c0+c1)/2,y+4,-40.06);
 cyl(p,.06,.09,8,C.iron,(c0+c1)/2+8,y+.3,-31,6);s.mesh(group,vertexMaterial(.94),'abbey-white-wings');p.mesh(group,vertexMaterial(.62),'abbey-roofs-dormers-and-windows');wavingFlag(group,flag,(c0+c1)/2+8.06,y+7.3,-31,1.8,'switzerland-flag',1);group.userData={landmark:'Abbey of St Gall library and courtyard'};
}

/** A painted town house with a carved oriel window pushing out over the street. */
function orielHouse(s:Builder,p:Builder,x:number,y:number,z:number,w:number,h:number,wall:string,low:boolean,seed:number){
 townhouse(s,p,x,y,z,w,h,5,{wall,trim:C.trim,glass:C.glass,roof:seed%3?C.red:C.slate},{rows:Math.round(h/2.3),roof:'gable',door:true,low});
 if(seed%2===0){const oy=y+2.4,oh=Math.min(3.4,h-3);box(s,1.5,oh,.8,seed%4?C.woodDark:'#7a3b2c',x+w*.18,oy,z+.4);box(p,1.1,oh*.34,.06,C.glass,x+w*.18,oy+oh*.14,z+.82);box(p,1.1,oh*.34,.06,C.glass,x+w*.18,oy+oh*.58,z+.82);box(s,1.7,.16,.9,C.gold,x+w*.18,oy+oh*.5,z+.42);pyramid(p,.05,.95,.7,C.copperDark,x+w*.18,oy+oh,z+.4);s.add(new T.ConeGeometry(.7,.6,4),seed%4?C.woodDark:'#7a3b2c',[x+w*.18,oy-.3,z+.4],[Math.PI,Math.PI/4,0]);}
}
function oldTown(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='old-town-oriel-houses';root.add(group);const s=new Builder(),p=new Builder(),y=stGall.ground;let houses=0,oriels=0;
 for(let x=-46;x<finish+76;){const w=3.6+r()*1.8,h=6+r()*2.2,mid=x+w/2;
  // The street opens in front of the cathedral and the abbey courtyard.
  if(!(mid>stGall.cathedralX-9&&mid<stGall.courtX[1]+2)&&Math.abs(mid-stGall.laurenceX)>3.4){orielHouse(s,p,mid,y,-19.5,w-.12,h,facades[Math.floor(r()*facades.length)],low,houses);if(houses%2===0)oriels++;houses++;}x+=w;}
 s.mesh(group,vertexMaterial(.93),'town-house-walls-and-oriels');p.mesh(group,vertexMaterial(.7),'town-house-windows-and-roofs');group.userData={feature:'Old town houses with oriel windows',houses,oriels};
}

function stLaurence(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='st-laurence-church';root.add(group);const s=new Builder(.5),p=new Builder(),x=stGall.laurenceX,y=stGall.ground,z=-34,gothic={frame:C.trim,glass:C.glass};
 box(s,7,7,14,C.sandstoneDark,x-5,y,z-7);roof(p,7.3,3.6,14.3,C.slate,x-5,y+7,z-7,Math.PI/2);for(const dx of [-2,0,2])pointedWindow(s,p,x-5+dx,y+1.4,z+.02,.9,4.2,low,gothic);
 box(s,3.6,13,3.6,C.sandstoneDark,x,y,z-1.8);for(const level of [4.5,9,12.8])box(s,3.9,.26,3.9,C.trim,x,y+level,z-1.8);for(const [turn,dx,dz] of FACES){const face=new Builder(),glass=new Builder();pointedWindow(face,glass,0,9.6,.02,.9,2.6,low,gothic);glass.add(new T.CylinderGeometry(.8,.8,.06,16),C.white,[0,6.6,.05],[Math.PI/2,0,0]);glass.add(new T.TorusGeometry(.8,.07,5,16),C.gold,[0,6.6,.08]);place(s,face.geometry(),x+dx*1.8,y,z-1.8+dz*1.8,turn);place(p,glass.geometry(),x+dx*1.8,y,z-1.8+dz*1.8,turn);}
 for(const dx of [-1.6,1.6])for(const dz of [-1.6,1.6])cone(p,.4,1.6,C.copper,x+dx,y+13,z-1.8+dz,6);cone(p,1.5,5.4,C.copper,x,y+13,z-1.8,8);p.add(new T.SphereGeometry(.12,6,5),C.gold,[x,y+18.5,z-1.8]);
 s.mesh(group,stonework(),'st-laurence-tower-and-nave');p.mesh(group,vertexMaterial(.6),'st-laurence-green-spire');group.userData={landmark:'St Laurence Church'};
}

function hills(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='appenzell-hills';root.add(group);const h=new Builder(),f=new Builder(),y=stGall.ground;
 for(const [dx,w,top,dark] of [[-40,50,13,0],[30,56,16,1],[100,52,14,0],[170,58,17,1],[240,50,13,0]] as const)h.add(new T.SphereGeometry(1,low?12:18,low?8:10),dark?C.hillDark:C.hill,[dx,y-2,-74],[0,0,0],[w,top,16],.08);
 // Farmhouses with broad roofs scattered on the slopes.
 for(let k=0;k<(low?5:10);k++){const fx=-40+k*(finish+120)/(low?4:9)+r()*8,fy=y+5+r()*3,fz=-62-r()*4;box(f,2.2,1.2,1.6,C.farm,fx,fy,fz);roof(f,2.8,.9,2.2,C.redDark,fx,fy+1.2,fz);box(f,1,.5,.06,C.white,fx,fy+.2,fz+.82);}
 h.mesh(group,vertexMaterial(.97),'green-hill-pastures');f.mesh(group,vertexMaterial(.85),'hill-farmhouses');
 const firs:Placement[]=[];for(let k=0;k<(low?14:30);k++)firs.push({x:-50+r()*(finish+140),y:y+3+r()*4,z:-58-r()*5,scale:.8+r()*.6,rotation:r()*6});plantGrove(group,'conifer',firs,{low,name:'hillside-firs'});group.userData={feature:'Hills toward the Alps'};
}

/** A white cross on a red square. */
const swissFlag=()=>pixelTexture(64,(u,v)=>(Math.abs(u-.5)<.1&&Math.abs(v-.5)<.31)||(Math.abs(v-.5)<.1&&Math.abs(u-.5)<.31)?[255,255,255,255]:[218,41,28,255],true,false);

// Route furniture, in a platform's own coordinates, behind the walking lane.
/** A town fountain: an octagonal basin, a painted column with a figure, and geraniums round the rim. */
function townFountain(b:Builder,x:number,y:number,z:number){fountain(b,x,y,z,.9,{stone:C.sandstoneDark,water:'#7fb6c6'});cyl(b,.12,.14,1.5,'#b23a2e',x,y+.4,z,8);box(b,.4,.14,.4,C.gold,x,y+1.9,z);cyl(b,.1,.15,.6,'#3f6fae',x,y+2.04,z,8);b.add(new T.SphereGeometry(.11,8,6),'#f2d6bd',[x,y+2.74,z]);b.strut(new T.Vector3(x+.1,y+2.5,z),new T.Vector3(x+.34,y+2.9,z),.03,C.gold,4,1);for(let k=0;k<8;k++){const a=k/8*Math.PI*2;b.add(new T.SphereGeometry(.13,6,5),C.geranium,[x+Math.cos(a)*.86,y+.5,z+Math.sin(a)*.86]);}}
function cheeseStall(b:Builder,x:number,y:number,z:number){awningStall(b,x,y,z,{wood:C.wood,stripeA:'#d32f3a',stripeB:C.white,goods:[C.cheese,'#e8b83a',C.cheese]});for(const dx of [-.5,.1,.6])b.add(new T.CylinderGeometry(.24,.24,.16,12),C.cheese,[x+dx,y+.8,z+.2]);}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'cathedral-twin-towers-and-curved-front','abbey-wings-library-and-courtyard','oriel-window-town-houses','st-laurence-green-spire','hills-farmhouses-and-alps','town-fountain-geraniums-and-cheese-stall']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(41000),detail=new T.Group();detail.name='st-gall-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  precinct(detail,finish,low);hills(detail,finish,r,low);cathedral(detail,low);abbey(detail,flagMaterial(swissFlag()),low);stLaurence(detail,low);oldTown(detail,finish,r,low);
  const limes:Placement[]=[];for(let k=0;k<(low?6:14);k++)limes.push({x:stGall.cathedralX-8+r()*(stGall.courtX[1]-stGall.cathedralX+8),y:stGall.ground+.3,z:-19-r()*5,scale:.6+r()*.25,rotation:r()*6});plantGrove(detail,'plane',limes,{low,name:'abbey-square-limes'});
  const swifts=createFlock(detail,{name:'st-gall-swifts',count:low?6:14,centre:[stGall.cathedralX,12,-34],radius:[30,4,6],speed:.36,size:.5,color:'#2c3440',wing:'#1f2630',seed:97,glide:true});
  let reduced=context.reducedMotion;swifts.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(!reduced)swifts.update(time);},setReducedMotion(value){reduced=value;swifts.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.8)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*59+Math.round(definition.x),y=surface(0);
  if(t==='rooftop'){chimneyStack(b,w/2-.9,surface(w/2-.9),rear,2+seed%2,{brick:C.redDark,cap:'#6d3a2c',pot:'#d8b08a'});flowerBox(b,-w/2+.3,w/2-1.6,y,rear+.12,C.wood,[C.geranium,C.geranium,'#ffffff']);if(w>3.6)dormer(b,-w/2+1.1,surface(-w/2+1.1),rear-.05,C.white,C.glass,C.red);}
  else if(t==='ground'){lampPost(b,glow,-w/2+.5,y,-1.3);if(seed%2)townFountain(b,-w/2+2,y,-2);else cheeseStall(b,-w/2+2,y,-2.3);bench(b,w/2-1.3,y,-1.9);flowerBox(b,-.6,.6,y+.5,-1.3,C.wood,[C.geranium,'#e85a7a']);box(b,1.3,.5,.3,C.sandstoneDark,0,y,-1.3);if(w>8){lampPost(b,glow,w/2-.5,y,-1.3);if(seed%2)cheeseStall(b,w/2-3.4,y,-2.3);else townFountain(b,w/2-3.4,y,-2);}}
  else if(t==='stairs'){const from=-w/2+.25,to=w/2-.25;railing(b,from,to,Math.min(surface(from),surface(to)),rear,C.iron,C.gold);}
  finishProps(root,b,glow,'st-gall-squares-and-roofs');
 },
};
