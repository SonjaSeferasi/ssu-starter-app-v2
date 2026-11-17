import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl,roof} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,balustrade,bench,finishProps,flagMaterial,lampPost,pyramid,railing,texturedStone,townhouse,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Portugal: Angra do Heroismo in the Azores (SRS-632.15). The town climbs
 * from its harbour in terraces of white houses with coloured frames and red
 * roofs. On the quay stands the blue-and-white Misericordia church with its
 * twin towers; higher up, the cathedral with its tiled spires; and between
 * them a little painted chapel of the Holy Spirit. Dark basalt bastions with
 * round sentry boxes guard the harbour on the left, and the green volcanic
 * headland of Monte Brasil closes the bay on the right, ringed by fortress
 * walls. A three-masted ship rides at anchor among bright fishing boats.
 * The route carries bollards, lanterns, fish crates, hydrangeas and cannon.
 * Scenery only: nothing collides. */
const C={white:'#f8f6ee',trim:'#fbf9f2',basalt:'#4a4a4c',basaltLight:'#6a6a6c',red:'#b95f3f',redDark:'#96492f',blue:'#3f7fbf',blueDark:'#2f5f9f',glass:'#2a3540',quay:'#dcd6c6',lawn:'#7fae5c',hill:'#5f8f4c',hillDark:'#4a7a40',
 hydrangea:'#6f8fe0',hydrangeaPink:'#d98fc0',leaf:'#3f7a3f',gold:'#d6a938',iron:'#22262a',wood:'#7a5c40',hull:'#3a2a20',sail:'#f4efe0',rope:'#c9b88a',yellow:'#e8c23a',green:'#3f8a4f',pink:'#e6a0a8',ochre:'#d9a84a'} as const;
const frames=[C.blue,C.yellow,C.green,C.pink,C.ochre,'#8f6fb0',C.redDark] as const;
// The harbour, the terraced town and Monte Brasil are built here on a level shore.
const base=europeEnvironment('PRT',{landmark:false,flat:true,town:false});
export const angra={quayTop:-1,terraces:[[-21,-1],[-29,1.4],[-37,3.6]],misericordiaX:66,cathedralX:112,chapelX:38,fortX:4} as const;
const basalt=()=>texturedStone('paris-stone','#8f8f96',.9,.96);

function harbour(root:T.Object3D,finish:number,low:boolean){
 const group=new T.Group();group.name='angra-harbour-quay';root.add(group);const s=new Builder(.5),p=new Builder(),top=angra.quayTop,from=-56,to=finish+100;
 box(s,to-from,top+4.4,3,C.basaltLight,(from+to)/2,-4.4,-18);for(let x=from+2;x<to;x+=low?8:4)cyl(p,.16,.2,.45,C.iron,x,top,-17.2,8);
 // White paving with dark basalt bands, and the terraces the town stands on.
 box(p,to-from,top+4.4,62,C.quay,(from+to)/2,-4.4,-50.5);for(let x=from;x<to;x+=low?6:3)box(p,.4,.03,3.4,C.basaltLight,x,top,-21.2);
 for(const [z,y] of angra.terraces.slice(1))box(p,to-from,y-top,60,C.lawn,(from+to)/2,top,z-27);
 s.mesh(group,basalt(),'basalt-quay-wall');p.mesh(group,vertexMaterial(.96),'paving-and-terraces');group.userData={feature:'Harbour quay and terraces'};
}

function town(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='azorean-terraced-houses';root.add(group);const s=new Builder(),p=new Builder(),flowers=new Builder();let houses=0;
 angra.terraces.forEach(([z,y],row)=>{for(let x=-30+row*2;x<finish+12;){const w=3.4+r()*1.8,h=3.2+r()*1.2;
  const blocked=(row===0&&(Math.abs(x+w/2-angra.misericordiaX)<6.5+w/2||Math.abs(x+w/2-angra.chapelX)<2.4+w/2||x<angra.fortX+18))||(row===2&&Math.abs(x+w/2-angra.cathedralX)<7+w/2);
  if(!blocked){townhouse(s,p,x+w/2,y,z,w-.12,h,4.6,{wall:C.white,trim:frames[Math.floor(r()*frames.length)],glass:C.glass,roof:r()>.3?C.red:C.redDark},{rows:2,roof:'hip',door:true,low});houses++;}x+=w;}
  // Hydrangea hedges along the foot of each terrace.
  if(row>0)for(let x=-30;x<finish+12;x+=low?2.4:1.2)flowers.add(new T.SphereGeometry(.42,6,5),(Math.floor(x)%5===0)?C.hydrangeaPink:C.hydrangea,[x+r()*.4,y+.2,z+2.6],[0,0,0],[1,.8,1]);});
 s.mesh(group,vertexMaterial(.95),'white-house-walls-and-coloured-frames');p.mesh(group,vertexMaterial(.7),'house-windows-and-red-roofs');flowers.mesh(group,vertexMaterial(.9),'hydrangea-hedges');group.userData={feature:'White houses with coloured frames',houses};
}

function churches(root:T.Object3D,low:boolean){
 // The Misericordia: a blue-and-white front between twin towers.
 const mis=new T.Group();mis.name='misericordia-church';root.add(mis);const s=new Builder(),p=new Builder(),x=angra.misericordiaX,y=angra.quayTop,z=-22;
 box(s,6,6,10,C.blue,x,y,z-5);s.add(new T.CylinderGeometry(.02,3,1.8,3,1),C.blue,[x,y+6.9,z+.1],[0,-Math.PI/2,0],[.1,1,1]);roof(p,6.2,1.8,10.2,C.red,x,y+6,z-5,Math.PI/2);
 for(const side of [-1,1]){box(s,2.8,8,2.8,C.blue,x+side*4.4,y,z-1.2);for(const edge of [-1,1])box(s,.3,8,.3,C.white,x+side*4.4+edge*1.3,y,z+.2);box(s,3,.3,3,C.white,x+side*4.4,y+8,z-1.2);archedWindow(s,p,x+side*4.4,y+5.6,z+.22,.9,1.7,{frame:C.white,glass:'#33261e'});pyramid(p,.1,1.5,1.9,C.blueDark,x+side*4.4,y+8.3,z-1.2);p.add(new T.SphereGeometry(.12,6,5),C.gold,[x+side*4.4,y+10.3,z-1.2]);}
 for(const edge of [-1,1])box(s,.3,6,.3,C.white,x+edge*2.85,y,z+.1);box(s,6.2,.3,.4,C.white,x,y+3.2,z+.1);box(s,6.2,.3,.4,C.white,x,y+5.85,z+.1);archedWindow(s,p,x,y,z+.02,1.8,2.8,{frame:C.white,glass:'#33261e'});for(const dx of [-1.7,0,1.7])archedWindow(s,p,x+dx,y+3.6,z+.02,.9,1.7,{frame:C.white,glass:C.glass});
 s.mesh(mis,vertexMaterial(.93),'misericordia-blue-and-white-front');p.mesh(mis,vertexMaterial(.65),'misericordia-roof-and-openings');mis.userData={landmark:'Igreja da Misericordia',towers:2};
 // The cathedral on the upper terrace: white, trimmed in dark basalt, with tiled spires.
 const se=new T.Group();se.name='angra-cathedral';root.add(se);const c=new Builder(),cp=new Builder(),cx=angra.cathedralX,[cz,cy]=angra.terraces[2];
 box(c,7,5.6,11,C.white,cx,cy,cz-5.5);roof(cp,7.2,1.9,11.2,C.red,cx,cy+5.6,cz-5.5,Math.PI/2);c.add(new T.CylinderGeometry(.02,3.5,1.9,3,1),C.white,[cx,cy+6.55,cz+.1],[0,-Math.PI/2,0],[.1,1,1]);
 for(const side of [-1,1]){box(c,2.6,6.6,2.6,C.white,cx+side*4.8,cy,cz-1);for(const edge of [-1,1])box(c,.26,6.6,.26,C.basalt,cx+side*4.8+edge*1.2,cy,cz+.2);box(c,2.8,.26,2.8,C.basalt,cx+side*4.8,cy+6.6,cz-1);archedWindow(c,cp,cx+side*4.8,cy+4.2,cz+.32,.8,1.6,{frame:C.basalt,glass:'#33261e'});
  cone(cp,1.3,2.7,C.white,cx+side*4.8,cy+6.86,cz-1,8);for(let k=0;k<3;k++)cyl(cp,1.02-k*.34,1.1-k*.34,.14,C.basalt,cx+side*4.8,cy+7.3+k*.75,cz-1,8);}
 archedWindow(c,cp,cx,cy,cz+.02,1.8,3,{frame:C.basalt,glass:'#33261e'});for(const dx of [-2,0,2])archedWindow(c,cp,cx+dx,cy+3.4,cz+.02,.8,1.5,{frame:C.basalt,glass:C.glass});for(const edge of [-1,1])box(c,.3,5.6,.3,C.basalt,cx+edge*3.35,cy,cz+.1);
 c.mesh(se,vertexMaterial(.94),'cathedral-white-walls-and-basalt-trim');cp.mesh(se,vertexMaterial(.65),'cathedral-tiled-spires');se.userData={landmark:'Se Cathedral of Angra'};
 // A chapel of the Holy Spirit: a small painted front crowned with a golden crown.
 const imp=new T.Group();imp.name='holy-spirit-chapel';root.add(imp);const m=new Builder(),ix=angra.chapelX,iy=angra.quayTop,iz=-21.5;
 box(m,3,2.8,3,C.white,ix,iy,iz-1.5);box(m,3.2,.2,.3,C.yellow,ix,iy+2.8,iz);m.add(new T.CylinderGeometry(.02,1.6,1.3,3,1),C.blue,[ix,iy+3.65,iz],[0,-Math.PI/2,0],[.16,1,1]);for(const edge of [-1,1])box(m,.3,2.8,.3,C.red,ix+edge*1.4,iy,iz+.05);box(m,.9,1.7,.1,C.blue,ix,iy,iz+.03);for(const dx of [-.95,.95])box(m,.5,.8,.1,C.yellow,ix+dx,iy+1,iz+.03);
 m.add(new T.TorusGeometry(.26,.06,5,10),C.gold,[ix,iy+4.5,iz],[Math.PI/2,0,0]);m.add(new T.SphereGeometry(.13,6,5),C.gold,[ix,iy+4.75,iz]);m.mesh(imp,vertexMaterial(.85),'painted-chapel-and-crown');imp.userData={landmark:'Imperio do Espirito Santo'};
}

function fortAndHeadland(root:T.Object3D,finish:number,flag:T.Material,r:()=>number,low:boolean){
 // Basalt bastions with round sentry boxes on the left of the harbour.
 const fort=new T.Group();fort.name='sao-sebastiao-fort';root.add(fort);const s=new Builder(.5),p=new Builder(),x=angra.fortX,y=angra.quayTop,z=-21;
 const sentry=(sx:number,sy:number,sz:number)=>{cyl(s,.5,.4,.5,C.basaltLight,sx,sy-.5,sz,8);cyl(s,.5,.5,1.1,C.basaltLight,sx,sy,sz,8);cone(p,.62,.7,C.red,sx,sy+1.1,sz,8);box(p,.14,.4,.06,C.glass,sx,sy+.5,sz+.5);};
 box(s,26,3.4,7,C.basaltLight,x,y,z-3.5);for(const dx of [-13,0,13]){s.add(new T.CylinderGeometry(3.4,4.4,3.4,5,1),C.basaltLight,[x+dx,y+1.7,z+.4],[0,Math.PI/5,0]);sentry(x+dx,y+3.4,z+3.6);}
 for(let k=0;k<(low?13:26);k++)box(s,.6,.5,.5,C.basaltLight,x-12.5+k*(low?2:1),y+3.4,z+.2);box(p,7,2.4,5,C.white,x,y+3.4,z-4);roof(p,7.3,1.2,5.3,C.red,x,y+5.8,z-4);cyl(p,.05,.07,4,C.iron,x+6,y+3.4,z-3,5);
 s.mesh(fort,basalt(),'fort-basalt-bastions');p.mesh(fort,vertexMaterial(.7),'fort-sentry-caps-and-barracks');wavingFlag(fort,flag,x+6.06,y+6.6,z-3,2.4,'portugal-flag',.66);fort.userData={landmark:'Forte de Sao Sebastiao',sentryBoxes:3};
 // Monte Brasil: twin green summits, ringed by the walls of the great fortress.
 const hill=new T.Group();hill.name='monte-brasil';root.add(hill);const h=new Builder(),w=new Builder(.5),hx=finish+44,hz=-52;
 h.add(new T.SphereGeometry(1,low?12:20,low?8:12),C.hill,[hx-8,-4.4,hz],[0,0,0],[24,17.4,13],.08);h.add(new T.SphereGeometry(1,low?12:20,low?8:12),C.hillDark,[hx+16,-4.4,hz-2],[0,0,0],[22,15,13],.08);
 box(w,56,2.6,1.4,C.basaltLight,hx,y,-26);for(let k=0;k<5;k++){const bx=hx-26+k*13;w.add(new T.CylinderGeometry(2.4,3.2,2.6,5,1),C.basaltLight,[bx,y+1.3,-24.6],[0,Math.PI/5,0]);}
 box(h,.5,3,.5,C.white,hx-8,12.9,hz+1);pyramid(h,.02,.25,.6,C.white,hx-8,15.9,hz+1);
 h.mesh(hill,vertexMaterial(.97),'monte-brasil-green-summits');w.mesh(hill,basalt(),'sao-joao-baptista-walls');
 const trees:Placement[]=[];for(let k=0;k<(low?10:22);k++){const a=r()*Math.PI,d=.3+r()*.55;trees.push({x:hx-8+Math.cos(a)*24*d,y:-4.4+17.4*Math.sqrt(Math.max(0,1-d*d))*.9,z:hz+13*Math.sqrt(Math.max(0,1-d*d*Math.cos(a)**2))*.85,scale:.6+r()*.4,rotation:r()*6});}plantGrove(hill,'plane',trees,{low,name:'monte-brasil-laurels'});hill.userData={landmark:'Monte Brasil'};
}

/** Green at the hoist, red in the fly, with the golden sphere on the line between them. */
const portugueseFlag=()=>pixelTexture(64,(u,v)=>Math.hypot((u-.4)*1.5,v-.5)<.17?[255,204,41,255]:u<.4?[0,102,0,255]:[218,41,28,255],true,false);

/** A three-masted ship at anchor, sails furled on the yards, and the fishing boats of the harbour. */
function shipping(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const ship=new T.Group();ship.name='three-masted-ship';root.add(ship);const b=new Builder();b.add(new T.SphereGeometry(1,12,6),C.hull,[0,.1,0],[0,0,0],[5.4,.9,1.2]);box(b,9,.5,2,C.hull,0,.5,0);box(b,9.2,.1,2.1,C.ochre,0,1,0);box(b,2.4,.7,1.9,C.hull,-3.4,1,0);
 for(const [mx,mh] of [[-2.6,5.4],[.2,6.4],[2.9,5]] as const){cyl(b,.07,.1,mh,C.wood,mx,1,0,6);for(const level of [.45,.72]){box(b,.08,.08,3.2-level*1.4,C.wood,mx,1+mh*level,0);b.add(new T.CylinderGeometry(.16,.16,2.8-level*1.4,6),C.sail,[mx,1+mh*level-.14,0],[Math.PI/2,0,0]);}b.strut(new T.Vector3(mx,1+mh,0),new T.Vector3(mx+1.3,1.1,.9),.02,C.rope,4,1);b.strut(new T.Vector3(mx,1+mh,0),new T.Vector3(mx+1.3,1.1,-.9),.02,C.rope,4,1);}
 b.strut(new T.Vector3(4.4,1.1,0),new T.Vector3(6.4,1.9,0),.06,C.wood,5,.7);b.mesh(ship,vertexMaterial(.75),'ship-hull-masts-and-furled-sails');ship.userData={animated:true};
 const boats=new T.Group();boats.name='azorean-fishing-boats';root.add(boats);const f=new Builder();for(let x=-40;x<finish+60;x+=low?12:6){const hue=[C.blue,C.red,C.green,C.yellow,C.white][Math.floor(r()*5)],bx=x+r()*3;f.add(new T.SphereGeometry(1,8,5),hue,[bx,-2.36,-15.5],[0,0,0],[1.4,.34,.5]);box(f,1.6,.08,.7,C.white,bx,-2.26,-15.5);box(f,.5,.5,.5,C.white,bx-.3,-2.2,-15.5);}
 f.mesh(boats,vertexMaterial(.7),'painted-fishing-boats');return ship;
}

// Route furniture, in a platform's own coordinates, behind the walking lane.
function hydrangeas(b:Builder,x:number,y:number,z:number,seed:number){for(let k=0;k<4;k++){const dx=k*.42-.63;b.add(new T.SphereGeometry(.3,7,5),C.leaf,[x+dx,y+.22,z],[0,0,0],[1,.8,1]);b.add(new T.SphereGeometry(.2,6,5),(seed+k)%3?C.hydrangea:C.hydrangeaPink,[x+dx,y+.48,z+.05]);}}
function fishCrates(b:Builder,x:number,y:number,z:number){for(const [dx,dy] of [[-.3,0],[.3,0],[0,.32]] as const){box(b,.56,.3,.4,C.blue,x+dx,y+dy,z);box(b,.46,.04,.3,'#c9d6dc',x+dx,y+dy+.3,z);}}
function cannon(b:Builder,x:number,y:number,z:number){box(b,1.1,.3,.6,C.wood,x,y+.18,z);for(const dx of [-.36,.36])for(const dz of [-.34,.34])b.add(new T.CylinderGeometry(.2,.2,.08,10),C.wood,[x+dx,y+.2,z+dz],[Math.PI/2,0,0]);b.strut(new T.Vector3(x-.6,y+.6,z),new T.Vector3(x+.9,y+.78,z),.15,C.iron,8,.7);for(let k=0;k<3;k++)b.add(new T.SphereGeometry(.12,7,5),C.iron,[x+1.1+k*.26,y+.12,z+.2]);}
function bollardRope(b:Builder,from:number,to:number,y:number,z:number){for(let x=from;x<=to+.01;x+=1.2){cyl(b,.1,.13,.6,C.iron,x,y,z,8);b.add(new T.SphereGeometry(.13,6,5),C.iron,[x,y+.64,z]);if(x+1.2<=to+.01)b.strut(new T.Vector3(x,y+.5,z),new T.Vector3(x+1.2,y+.5,z),.03,C.rope,4,1);}}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'white-houses-with-coloured-frames','misericordia-blue-twin-towers','cathedral-tiled-spires','holy-spirit-chapel','basalt-bastions-and-sentry-boxes','monte-brasil-headland','three-masted-ship-and-fishing-boats','hydrangeas-cannon-and-fish-crates']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(35106),detail=new T.Group();detail.name='angra-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);const flag=flagMaterial(portugueseFlag());
  harbour(detail,finish,low);town(detail,finish,r,low);churches(detail,low);fortAndHeadland(detail,finish,flag,r,low);
  const pasture=new T.Group();pasture.name='island-pastures';detail.add(pasture);const hills=new Builder();for(const [dx,w,h] of [[-30,46,9],[30,50,11],[90,44,10],[150,46,9]] as const)hills.add(new T.SphereGeometry(1,low?12:18,low?8:10),dx%60?C.hill:C.hillDark,[dx,-4.4,-66],[0,0,0],[w,h+7.4,12],.08);hills.mesh(pasture,vertexMaterial(.97),'green-pasture-hills');
  const ship=shipping(detail,finish,r,low),birds=createFlock(detail,{name:'azores-shearwaters',count:low?5:10,centre:[finish*.5,7,-10],radius:[32,3,6],speed:.22,size:.8,color:'#6f6a64',wing:'#4f4a46',seed:89,glide:true});
  let reduced=context.reducedMotion;const ride=(time:number)=>{ship.position.set(finish*.42,-2.5+Math.sin(time*.7)*.06,-9.5);ship.rotation.z=Math.sin(time*.5)*.02;};ride(0);birds.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;ride(time);birds.update(time);},setReducedMotion(value){reduced=value;birds.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.4)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*53+Math.round(definition.x),y=surface(0);
  if(t==='bridge'){bollardRope(b,-w/2+.3,w/2-.3,y,rear);lampPost(b,glow,-w/2+.6,surface(-w/2+.6),rear+.3);if(w>4)fishCrates(b,w/2-1.2,surface(w/2-1.2),rear+.45);if(w>6)bench(b,0,y,rear+.25);}
  else if(t==='rock'){hydrangeas(b,(seed%2?.3:-.3),surface(0),rear+.2,seed);if(w>3.4){cyl(b,.1,.13,.7,C.wood,-w/2+.5,surface(-w/2+.5),rear+.1,8);b.add(new T.TorusGeometry(.2,.04,5,10),C.rope,[-w/2+.5,surface(-w/2+.5)+.3,rear+.1],[Math.PI/2,0,0]);}}
  else if(t==='terrace'){balustrade(b,-w/2+.25,w/2-.25,y,rear,{rail:C.trim,base:C.basaltLight,baluster:C.white});cannon(b,-w/2+1.3,y,-1.5);hydrangeas(b,w/2-1.1,y,-1.5,seed);if(w>6.4)cannon(b,w/2-3.4,y,-1.5);}
  else if(t==='ground'){lampPost(b,glow,-w/2+.5,y,-1.3);hydrangeas(b,0,y,-1.7,seed);bench(b,w/2-1.3,y,-1.9);}
  else if(t==='stairs'){const from=-w/2+.25,to=w/2-.25;railing(b,from,to,Math.min(surface(from),surface(to)),rear,C.iron,C.gold);}
  finishProps(root,b,glow,'angra-quays-and-terraces');
 },
};
