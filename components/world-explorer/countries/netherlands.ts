import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl,roof} from './europe-landmarks';
import {Builder,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,bandedFlagTexture,finishProps,flagMaterial,pyramid,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Netherlands: Schokland, the lost island (SRS-632.4). Across the water lies
 * the low mound of the former island: its white church with a roof turret,
 * the tarred timber houses of the village with red pantile roofs, the wooden
 * sea-wall posts along the shore and the keeper's house with its small
 * lighthouse at the north tip. Behind it the reclaimed polder is drawn in
 * strips of tulips, lines of poplars, a drainage mill with turning sails, cows,
 * and the wind turbines on the far dike. A brown-sailed fishing boat crosses
 * in front. The route carries tulip beds, bicycles, milk churns, clogs and
 * mooring posts. Scenery only: no colliders, nothing in the walking lane. */
const C={plaster:'#f2efe6',brick:'#9a5a44',brickDark:'#7c4636',tar:'#2f3a33',green:'#2f5d49',trim:'#f4f2ea',pantile:'#b5553a',slate:'#4f5559',glass:'#27323b',wood:'#7a5f45',woodDark:'#5a4633',
 grass:'#6f9c4f',grassDark:'#5c8744',thatch:'#6b5a44',sail:'#8a4a34',hull:'#3a2c24',white:'#f5f5f0',iron:'#22262a',red:'#c8322e',cow:'#f1efe8',cowPatch:'#1f1f22',churn:'#aab2b6',clog:'#e6b94a'} as const;
const tulips=['#d8262c','#f4c21f','#ef6fa6','#8e3aa8','#f2832a','#f7f2e6'] as const;
const base=europeEnvironment('NLD',{landmark:false});
export const schokland={moundTop:.4,mound:[38,98] as const,churchX:66,lighthouseX:114,millX:18} as const;
const windows={frame:C.trim,glass:C.glass};

function mound(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='schokland-mound';root.add(group);const b=new Builder(),[from,to]=schokland.mound,top=schokland.moundTop;
 // The low terp, its grass shoulder and the row of sea-wall posts along the shore.
 box(b,to-from+34,top+3.4,14,C.grassDark,(from+to)/2+8,-3,-28);box(b,to-from+26,.5,11,C.grass,(from+to)/2+8,top-.1,-28);
 for(let x=from-12;x<to+30;x+=low?.9:.45)cyl(b,.11,.13,1.5+Math.sin(x*3)*.25,x%2>1?C.wood:C.woodDark,x,-2.6,-20.8,6);
 box(b,to-from+42,.14,.2,C.woodDark,(from+to)/2+8,-1.6,-20.65);
 b.mesh(group,vertexMaterial(.95),'schokland-terp-and-sea-wall-posts');group.userData={landmark:'Schokland',feature:'former island mound'};
}

function village(root:T.Object3D,flag:T.Material,low:boolean){
 const group=new T.Group();group.name='schokland-church';root.add(group);const b=new Builder(),x=schokland.churchX,y=schokland.moundTop+.4,z=-28.5;
 // The Enserkerk: a plain white hall church with round-headed windows and a roof turret.
 box(b,9.4,4.6,5,C.plaster,x,y,z);box(b,9.7,.3,5.3,C.trim,x,y,z);roof(b,9.8,3.1,5.5,C.pantile,x,y+4.6,z);
 for(let k=0;k<4;k++)archedWindow(b,b,x-3.3+k*2.2,y+1.3,z+2.52,.9,1.8,windows);
 box(b,1.5,2.3,.1,C.green,x+4.72,y,z,Math.PI/2);box(b,1.5,1.5,1.5,C.plaster,x,y+7.2,z);box(b,.6,.7,.06,C.glass,x,y+7.5,z+.76);pyramid(b,.05,1.05,2.4,C.slate,x,y+8.7,z);cyl(b,.03,.03,.9,C.iron,x,y+11.1,z,5);b.add(new T.SphereGeometry(.12,8,6),'#d2a63f',[x,y+12,z]);
 // The village: tarred and green timber houses with white trim and red pantiles.
 for(const [hx,w,h,color] of [[46,5,2.8,C.tar],[53,4.2,2.5,C.green],[79,5.4,2.9,C.green],[86,4,2.4,C.tar],[93,4.6,2.6,C.tar]] as const){
  box(b,w,h,4,color,hx,y,z+.4);roof(b,w+.4,2,4.4,C.pantile,hx,y+h,z+.4);box(b,w+.1,.14,4.1,C.trim,hx,y+h-.1,z+.4);box(b,.8,1.6,.08,C.trim,hx-w*.2,y,z+2.42);
  for(const offset of [w*.18,w*.36]){box(b,.74,.9,.06,C.trim,hx+offset,y+.9,z+2.42);box(b,.56,.72,.06,C.glass,hx+offset,y+.99,z+2.45);}
  if(!low)for(let k=0;k<Math.floor(w/.5);k++)box(b,.03,h,.03,'#1c231f',hx-w/2+.25+k*.5,y,z+2.42);
  box(b,.5,1,.5,C.brick,hx+w*.3,y+h+1.2,z+.4);
 }
 // Fence and flagpole on the green.
 for(let fx=x-8;fx<x+9;fx+=.7)box(b,.07,.8,.07,C.trim,fx,y,z+4);box(b,17,.07,.07,C.trim,x,y+.6,z+4);cyl(b,.05,.07,6.4,C.trim,x+7.5,y,z+3,6);
 b.mesh(group,vertexMaterial(.9),'enserkerk-and-timber-houses');wavingFlag(group,flag,x+7.56,y+5.6,z+3,2.4,'netherlands-flag',.66);group.userData={landmark:'Church on its mound',houses:5};
}

function lighthouse(root:T.Object3D){
 const group=new T.Group();group.name='oud-emmeloord-lighthouse';root.add(group);const b=new Builder(),glow=new Builder(),x=schokland.lighthouseX,y=schokland.moundTop+.4,z=-27;
 cyl(b,.95,1.35,6.4,C.white,x,y,z,12);for(const band of [1.4,3.6])cyl(b,1.2-band*.06,1.24-band*.06,.9,C.red,x,y+band,z,12);cyl(b,1.25,1.25,.18,C.iron,x,y+6.4,z,12);
 for(let k=0;k<10;k++){const a=k/10*Math.PI*2;cyl(b,.025,.025,.6,C.iron,x+Math.cos(a)*1.18,y+6.58,z+Math.sin(a)*1.18,4);}cyl(glow,.62,.62,1.05,'#fff3c0',x,y+6.58,z,10);cone(b,.85,.8,C.red,x,y+7.63,z,10);
 box(b,5,2.6,3.6,C.plaster,x-5,y,z);roof(b,5.4,1.7,4,C.pantile,x-5,y+2.6,z);for(const offset of [-1.3,1.3]){box(b,.8,1,.06,C.glass,x-5+offset,y+.9,z+1.82);}box(b,.8,1.7,.06,C.green,x-5,y,z+1.82);
 b.mesh(group,vertexMaterial(.85),'lighthouse-and-keepers-house');const lamp=glow.mesh(group,vertexMaterial(.3,{emissive:new T.Color('#ffe9a8'),emissiveIntensity:.9}),'lighthouse-lantern');lamp.castShadow=false;group.userData={landmark:'Lighthouse at the north tip'};
}

/** The reclaimed polder: tulip strips, drainage ditches, cows and a dike. */
function polder(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='noordoostpolder';root.add(group);const b=new Builder(),y=-2.75,from=-60,to=finish+70;
 box(b,to-from,.5,70,C.grass,(from+to)/2,y-.5,-72);
 for(let row=0;row<(low?8:16);row++){const z=-38.5-row*1.7,color=tulips[row%tulips.length];for(let x=from+4;x<to;x+=30+r()*8){const w=20+r()*8;box(b,w,.22,1.1,color,x+w/2,y,z);box(b,w,.1,.4,C.grassDark,x+w/2,y,z+.75);}}
 for(let k=0;k<(low?5:9);k++){const x=from+10+k*(to-from-20)/(low?5:9);box(b,.5,.06,30,'#6f9aa6',x,y+.02,-52);}
 // Friesian cows graze between the fields and the shore.
 for(let k=0;k<(low?5:10);k++){const x=from+20+r()*(to-from-40),z=-33.5-r()*3,turn=r()*6;box(b,1.5,.8,.6,C.cow,x,y+.55,z,turn);box(b,.6,.5,.62,C.cowPatch,x+Math.cos(turn)*.3,y+.75,z-Math.sin(turn)*.3,turn);box(b,.45,.42,.4,C.cow,x+Math.cos(turn)*.95,y+.85,z-Math.sin(turn)*.95,turn);for(const leg of [-.5,.5])for(const side of [-.2,.2])box(b,.12,.56,.12,C.cowPatch,x+Math.cos(turn)*leg-Math.sin(turn)*side,y,z-Math.sin(turn)*leg-Math.cos(turn)*side);}
 // The far dike closes the polder.
 box(b,to-from,2.4,5,C.grassDark,(from+to)/2,y,-100);box(b,to-from,.1,1.6,'#5a5d60',(from+to)/2,y+2.4,-100);
 b.mesh(group,vertexMaterial(.95),'polder-tulip-fields-and-cows');group.userData={landmark:'Reclaimed polder',tulipRows:low?8:16};
}

/** A drainage mill: thatched octagonal body on a brick base, with a turning cross of sails. */
function windmill(root:T.Object3D,x:number,z:number,scale:number){
 const group=new T.Group();group.name='polder-windmill';group.position.set(x,-2.75,z);group.scale.setScalar(scale);root.add(group);const b=new Builder();
 cyl(b,2.3,2.6,2.2,C.brick,0,0,0,8);cyl(b,1.25,2.25,6.2,C.thatch,0,2.2,0,8);cyl(b,2.7,2.7,.16,C.trim,0,2.2,0,8);for(let k=0;k<8;k++){const a=k/8*Math.PI*2+Math.PI/8;cyl(b,.05,.05,1,C.trim,Math.cos(a)*2.6,2.2,Math.sin(a)*2.6,4);}
 b.add(new T.SphereGeometry(1.5,10,6,0,Math.PI*2,0,Math.PI/2),C.thatch,[0,8.4,0],[0,0,0],[1,.85,1.15]);box(b,.9,1.5,.08,C.green,0,0,2.5);for(const h of [3.4,5.6])box(b,.5,.7,.08,C.trim,0,h,2.25-h*.14+.42);
 b.mesh(group,vertexMaterial(.95),'windmill-body');
 const sails=new T.Group();sails.name='windmill-sails';sails.position.set(0,8.6,1.75);group.add(sails);const s=new Builder();
 cyl(s,.2,.2,.5,C.woodDark,0,-.25,0,8);for(let k=0;k<4;k++){const a=k*Math.PI/2;s.add(new T.BoxGeometry(.16,5.6,.12),C.woodDark,[Math.sin(a)*2.8,Math.cos(a)*2.8,.2],[0,0,-a]);s.add(new T.BoxGeometry(.9,4.4,.05),C.sail,[Math.sin(a)*3.3+Math.cos(a)*.5,Math.cos(a)*3.3-Math.sin(a)*.5,.24],[0,0,-a]);}
 s.parts=s.parts.map((part,index)=>index===0?part.applyMatrix4(new T.Matrix4().makeRotationX(Math.PI/2)):part);s.mesh(sails,vertexMaterial(.9),'windmill-sail-cross');
 group.userData={landmark:'Polder drainage mill',animated:true};return sails;
}
/** Modern wind turbines stand in a line on the far dike. */
function turbines(root:T.Object3D,finish:number,low:boolean){
 const rotors:T.Object3D[]=[],towers=new Builder();
 for(let k=0;k<(low?3:6);k++){const x=-30+k*(finish+60)/(low?3:6);cyl(towers,.28,.5,17,C.white,x,-.3,-101,8);box(towers,1.8,.8,.8,C.white,x,16.7,-100.6);
  const rotor=new T.Group();rotor.name='wind-turbine-rotor';rotor.position.set(x,17.1,-99.9);root.add(rotor);const blades=new Builder();for(let blade=0;blade<3;blade++){const a=blade/3*Math.PI*2;blades.add(new T.BoxGeometry(.42,7.4,.1),C.white,[Math.sin(a)*3.7,Math.cos(a)*3.7,0],[0,0,-a]);}blades.mesh(rotor,vertexMaterial(.6),'wind-turbine-blades');rotor.rotation.z=k*.9;rotors.push(rotor);}
 towers.mesh(root,vertexMaterial(.6),'wind-turbine-towers');return rotors;
}
/** A botter: the brown-sailed fishing boat of the old Zuiderzee. */
function botter(root:T.Object3D){
 const b=new Builder();b.add(new T.SphereGeometry(1,12,8,0,Math.PI*2,Math.PI/2,Math.PI/2),C.hull,[0,.75,0],[0,0,0],[3.1,.9,1.05]);box(b,5.6,.1,1.9,C.wood,0,.72,0);cyl(b,.07,.09,5.4,C.woodDark,.5,.8,0,6);
 // Two-sided triangular sails: the mainsail and the jib.
 const sail=(points:[number,number][],color:string)=>{for(const order of [points,[...points].reverse()]){const g=new T.BufferGeometry().setFromPoints(order.map(([px,py])=>new T.Vector3(px,py,0)));g.computeVertexNormals();b.add(g,color);}};
 sail([[.6,1.2],[-2.7,1.5],[.6,6]],C.sail);sail([[.75,1.1],[3.2,.9],[.75,5.2]],'#9a5a40');box(b,.5,1.1,.08,C.woodDark,-2.2,.3,1.02);
 const boat=b.mesh(root,vertexMaterial(.9),'zuiderzee-botter');boat.userData={animated:true,feature:'traditional fishing boat'};return boat;
}

// Route furniture, in a platform's own coordinates, behind the walking lane.
function tulipBed(b:Builder,from:number,to:number,y:number,z:number,seed:number){box(b,to-from,.12,.62,'#5b4636',(from+to)/2,y,z);for(let x=from+.12,k=0;x<to;x+=.2,k++)for(const row of [-.18,0,.18]){const color=tulips[(Math.floor(k/4)+seed+(row>0?1:0))%tulips.length];box(b,.025,.3,.025,'#3f7a3a',x,y+.12,z+row);b.add(new T.ConeGeometry(.055,.13,5),color,[x,y+.47,z+row],[Math.PI,0,0]);}}
function fence(b:Builder,from:number,to:number,y:number,z:number){for(let x=from;x<=to+.01;x+=1.1)box(b,.1,.95,.1,C.wood,x,y,z);for(const h of [.35,.72])box(b,to-from,.07,.05,C.wood,(from+to)/2,y+h,z);}
function bicycle(b:Builder,x:number,y:number,z:number){for(const wheel of [-.52,.52])b.add(new T.TorusGeometry(.33,.03,5,14),C.iron,[x+wheel,y+.36,z]);
 b.strut(new T.Vector3(x-.52,y+.36,z),new T.Vector3(x-.2,y+.85,z),.022,C.iron);b.strut(new T.Vector3(x-.2,y+.85,z),new T.Vector3(x+.38,y+.85,z),.022,C.iron);b.strut(new T.Vector3(x+.52,y+.36,z),new T.Vector3(x+.38,y+1.05,z),.022,C.iron);b.strut(new T.Vector3(x-.2,y+.85,z),new T.Vector3(x-.02,y+.36,z),.022,C.iron);b.strut(new T.Vector3(x-.02,y+.36,z),new T.Vector3(x+.38,y+.85,z),.022,C.iron);
 box(b,.26,.06,.14,C.woodDark,x-.22,y+.9,z);box(b,.06,.05,.46,C.iron,x+.38,y+1.05,z);box(b,.36,.26,.3,C.wood,x+.6,y+.72,z);}
function milkChurn(b:Builder,x:number,y:number,z:number){cyl(b,.16,.19,.5,C.churn,x,y,z,10);cyl(b,.11,.16,.14,C.churn,x,y+.5,z,10);cyl(b,.13,.13,.05,'#8f979b',x,y+.64,z,10);}
function clogs(b:Builder,x:number,y:number,z:number){for(const side of [-.09,.09]){b.add(new T.SphereGeometry(.09,8,6),C.clog,[x+side,y+.07,z],[0,.3*Math.sign(side),0],[.8,.75,1.7]);b.add(new T.ConeGeometry(.045,.1,5),C.clog,[x+side,y+.11,z+.16],[1.2,0,0]);}}
function mooringPosts(b:Builder,from:number,to:number,y:number,z:number,seed:number){for(let x=from,k=0;x<=to;x+=.55,k++)cyl(b,.1,.12,.7+((k*7+seed)%5)*.12,k%2?C.wood:C.woodDark,x,y,z,6);b.add(new T.TorusGeometry(.16,.03,4,10),'#b7a57c',[from+.55,y+.5,z+.12],[.4,0,0]);}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'enserkerk-white-church','tarred-timber-houses','sea-wall-posts','lighthouse-and-keepers-house','tulip-fields','polder-windmill-sails','wind-turbines','friesian-cows','zuiderzee-botter','bicycles-tulips-and-clogs']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(31620),detail=new T.Group();detail.name='schokland-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  mound(detail,low);village(detail,flagMaterial(bandedFlagTexture([['#ae1c28',1],['#ffffff',1],['#21468b',1]])),low);lighthouse(detail);polder(detail,finish,r,low);
  const sails=[windmill(detail,schokland.millX,-36,1),windmill(detail,finish-4,-48,.85)],rotors=turbines(detail,finish,low),boat=botter(detail);
  // Poplars line the polder roads.
  const poplars:Placement[]=[];for(let k=0;k<(low?14:30);k++)poplars.push({x:-50+k*(finish+110)/(low?14:30),y:-2.75,z:-66-(k%2)*1.2,scale:[.55,1.5,.55],rotation:k});
  plantGrove(detail,'plane',poplars,{low,name:'polder-poplar-rows'});
  const gulls=createFlock(detail,{name:'ijsselmeer-gulls',count:low?5:10,centre:[finish*.5,6,-12],radius:[32,3,7],speed:.2,size:.8,color:'#f2f2ee',wing:'#c9ccd0',seed:5,glide:true});
  let reduced=context.reducedMotion;const move=(time:number)=>{for(const [index,cross] of sails.entries())cross.rotation.z=-time*(.55+index*.12);for(const [index,rotor] of rotors.entries())rotor.rotation.z=index*.9+time*.5;const lap=finish+120;boat.position.set(-55+(time*.7)%lap,-2.75+Math.sin(time*.8)*.04,-13);boat.rotation.z=Math.sin(time*.6)*.02;};move(0);gulls.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;move(time);gulls.update(time);},setReducedMotion(value){reduced=value;gulls.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||w<2.6)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.5:REAR-.1,seed=definition.id.length*5+Math.round(definition.x),y=surface(0);
  if(t==='ground'){fence(b,-w/2+.3,w/2-.3,y,rear);if(deep){tulipBed(b,-w/2+.6,w/2-.6,y,-1.85,seed);bicycle(b,(seed%2?1:-1)*(w/2-1.4),y,-1.3);milkChurn(b,(seed%2?-1:1)*(w/2-.9),y,-1.25);if(w>8)clogs(b,0,y,-1.2);}else{tulipBed(b,-w/2+.5,w/2-.5,y,REAR+.25,seed);if(w>4.5)milkChurn(b,w/2-.5,y,REAR-.02);}}
  else if(t==='rock')mooringPosts(b,-w/2+.25,w/2-.25,y,rear,seed);
  else if(t==='stairs')fence(b,-w/2+.3,w/2-.3,Math.min(surface(-w/2+.3),surface(w/2-.3)),rear);
  finishProps(root,b,glow,'dutch-tulips-bicycles-and-posts');
 },
};
