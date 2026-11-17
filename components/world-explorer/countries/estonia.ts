import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl,roof} from './europe-landmarks';
import {Builder,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,awningStall,balustrade,bandedFlagTexture,bench,chimneyStack,dormer,drumDome,finishProps,flagMaterial,lampPost,pointedWindow,pottedTree,texturedStone,townhouse,wavingFlag,windowGrid} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Estonia: Tallinn's old town from the sea (SRS-632.21). A grey limestone
 * wall runs along the shore between round towers under red cone roofs, with
 * the squat gun tower at its end and the twin towers of the town gate. Tall
 * gabled merchant houses stand behind it; St Olaf's needle spire and the
 * slender tower of the town hall rise above them; and on its limestone
 * cliff Toompea carries the pink castle, the flag on Tall Hermann and the
 * dark onion domes of the cathedral. A Hanseatic cog rides offshore. The
 * route carries lanterns, market stalls, barrels and weather vanes. Scenery
 * only: nothing collides. */
const C={stone:'#e6e2d6',stoneDark:'#cfcabc',red:'#b5563a',redDark:'#96452f',white:'#f6f3ea',trim:'#fbf8ef',glass:'#27343f',copper:'#5f8f7c',pink:'#e6b0a8',cream:'#efe2c2',onion:'#3a3f48',gold:'#d6a938',
 lawn:'#7fa85a',iron:'#22262a',wood:'#7a5c40',woodDark:'#5c4330',leaf:'#4a7d3f',sail:'#efe6cf',hull:'#5c4330',quay:'#cfc8b6'} as const;
const merchants=['#efe2c2','#e6b9a0','#cfd8c0','#e9d08a','#d9c0c8','#bcd0e0','#f2ead8'] as const;
const base=europeEnvironment('EST',{landmark:false,flat:true,town:false});
export const tallinn={shoreTop:-1,wallZ:-24,fatMargaretX:10,gateX:60,olafX:34,townHallX:92,toompea:[118,168],toompeaTop:4} as const;
const limestone=()=>texturedStone('paris-stone','#f4f4f0',1,.95);

/** A round wall tower under a red cone roof. */
function wallTower(s:Builder,p:Builder,x:number,y:number,z:number,radius:number,h:number,low:boolean){cyl(s,radius,radius*1.06,h,C.stone,x,y,z,low?8:12);cyl(s,radius*1.1,radius*1.1,.24,C.stoneDark,x,y+h-.9,z,low?8:12);for(let k=0;k<4;k++){const a=k*Math.PI/2+.4;p.add(new T.BoxGeometry(.16,.7,.08),C.glass,[x+Math.sin(a)*radius,y+h-1.6,z+Math.cos(a)*radius],[0,a,0]);}cone(p,radius*1.24,radius*2,C.red,x,y+h,z,low?8:12);p.add(new T.SphereGeometry(.1,6,5),C.gold,[x,y+h+radius*2+.1,z]);}

function shoreAndWall(root:T.Object3D,finish:number,low:boolean){
 const group=new T.Group();group.name='tallinn-town-wall';root.add(group);const s=new Builder(.5),p=new Builder(),g=new Builder(),y=tallinn.shoreTop,z=tallinn.wallZ,from=-56,to=finish+100;
 box(g,to-from,y+4.4,70,C.lawn,(from+to)/2,-4.4,-51.5);box(g,to-from,.06,3,C.quay,(from+to)/2,y,-18.4);
 // The wall, with its covered walk under a red tiled roof, between round towers.
 const a=tallinn.fatMargaretX+4,b=tallinn.toompea[0]-2;box(s,b-a,4.4,1.4,C.stone,(a+b)/2,y,z);box(p,b-a,.5,1.9,C.woodDark,(a+b)/2,y+4.4,z+.2);roof(p,b-a,.9,2.2,C.red,(a+b)/2,y+4.9,z+.2);
 for(let x=a+8;x<b-4;x+=low?22:11)if(Math.abs(x-tallinn.gateX)>7)wallTower(s,p,x,y,z+.4,1.5,7.4,low);
 // The squat gun tower at the sea end, and the twin towers of the town gate.
 cyl(s,4.2,4.5,5,C.stone,tallinn.fatMargaretX,y,z+1,low?12:18);cone(p,4.5,2.2,C.red,tallinn.fatMargaretX,y+5,z+1,low?12:18);for(let k=0;k<5;k++){const t=-.9+k*.45;p.add(new T.BoxGeometry(.5,.5,.1),'#2a2622',[tallinn.fatMargaretX+Math.sin(t)*4.3,y+2.6,z+1+Math.cos(t)*4.3],[0,t,0]);}
 for(const side of [-1,1])wallTower(s,p,tallinn.gateX+side*3,y,z+1.6,1.7,6.2,low);box(s,4.4,3.6,1.6,C.stone,tallinn.gateX,y,z+1.2);archedWindow(s,p,tallinn.gateX,y,z+2.02,2.2,2.8,{frame:C.stoneDark,glass:'#2a2622'});
 g.mesh(group,vertexMaterial(.97),'shore-lawn-and-quay');s.mesh(group,limestone(),'limestone-wall-and-towers');p.mesh(group,vertexMaterial(.7),'red-cone-roofs-and-wall-walk');group.userData={landmark:'Tallinn town wall and towers'};
}

function oldTown(root:T.Object3D,r:()=>number,low:boolean){
 const group=new T.Group();group.name='hanseatic-merchant-houses';root.add(group);const s=new Builder(),p=new Builder(),y=tallinn.shoreTop;let houses=0;
 for(let x=tallinn.fatMargaretX+8;x<tallinn.toompea[0]-4;){const w=3.2+r()*1.4,h=5.6+r()*2;townhouse(s,p,x+w/2,y,-29.5,w-.1,h,5.4,{wall:merchants[Math.floor(r()*merchants.length)],trim:C.trim,glass:C.glass,roof:r()>.4?C.red:C.redDark},{rows:Math.round(h/2.2),roof:'gable',door:false,low});
  // A hoist beam under the gable, for hauling goods to the loft.
  box(p,.14,.14,1,C.woodDark,x+w/2,y+h+.6,-29);houses++;x+=w;}
 s.mesh(group,vertexMaterial(.93),'merchant-house-walls');p.mesh(group,vertexMaterial(.7),'merchant-gables-and-hoists');group.userData={feature:'Hanseatic merchant houses',houses};
}

function spires(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='st-olaf-and-town-hall';root.add(group);const s=new Builder(.5),p=new Builder(),y=tallinn.shoreTop,gothic={frame:C.trim,glass:C.glass};
 // St Olaf's: a plain white tower and a very tall green needle.
 const ox=tallinn.olafX,oz=-52;box(s,8,7,14,C.white,ox+6,y,oz-4);roof(p,8.3,3.4,14.3,C.redDark,ox+6,y+7,oz-4,Math.PI/2);box(s,4.2,9.4,4.2,C.white,ox,y,oz);for(const level of [3,6.4])pointedWindow(s,p,ox,y+level,oz+2.12,.9,2.2,low,gothic);
 for(const dx of [-1.9,1.9])for(const dz of [-1.9,1.9])cone(p,.4,1.4,C.copper,ox+dx,y+9.4,oz+dz,6);cone(p,2.1,8.4,C.copper,ox,y+9.4,oz,8);p.add(new T.SphereGeometry(.14,6,5),C.gold,[ox,y+17.9,oz]);
 // The town hall: a long gabled hall and a slender eight-sided tower with its vane.
 const tx=tallinn.townHallX,tz=-42;box(s,14,5.6,6,C.cream,tx,y,tz-3);roof(p,14.3,3.2,6.3,C.red,tx,y+5.6,tz-3);for(let k=0;k<(low?4:7);k++)archedWindow(s,p,tx-5.4+k*(low?3.6:1.8),y,tz+.02,1.1,2.2,{frame:C.trim,glass:'#33261e'});
 cyl(s,.9,1,8.4,C.cream,tx+6,y+5,tz-3,8);cyl(s,1.2,1.2,.2,C.trim,tx+6,y+11.4,tz-3,8);cone(p,1.05,1.2,C.copper,tx+6,y+13.4,tz-3,8);cyl(p,.5,.6,.9,C.copper,tx+6,y+14.5,tz-3,8);cone(p,.5,1.6,C.copper,tx+6,y+15.4,tz-3,8);box(p,.5,.3,.04,C.gold,tx+6.2,y+17.1,tz-3);
 s.mesh(group,vertexMaterial(.94),'church-and-town-hall-walls');p.mesh(group,vertexMaterial(.62),'green-spires-and-roofs');group.userData={landmark:"St Olaf's Church and the Town Hall"};
}

function toompea(root:T.Object3D,flag:T.Material,r:()=>number,low:boolean){
 const group=new T.Group();group.name='toompea-hill';root.add(group);const rock=new Builder(.5),s=new Builder(),p=new Builder(),[from,to]=tallinn.toompea,top=tallinn.toompeaTop,z=-44;
 box(rock,to-from,top+4.4,18,C.stone,(from+to)/2,-4.4,z-5);for(let k=0;k<(low?10:20);k++)box(rock,2.6+r()*3,2+r()*(top+1),1.6+r()*2,k%2?C.stone:C.stoneDark,from+k*(to-from)/(low?10:20),-4.4+r()*2,z+4.2+r(),(r()-.5)*.3);rock.mesh(group,limestone(),'toompea-limestone-cliff');
 // The pink castle with Tall Hermann at its corner, and the cathedral's dark onion domes.
 const cx=from+14;box(s,18,4.6,7,C.pink,cx,top,z-4);windowGrid(s,p,cx,top+.5,z-.48,17,3.6,low?6:10,2,{wall:C.pink,trim:C.trim,glass:C.glass,roof:C.red},true,low);roof(p,18.3,1.6,7.3,C.redDark,cx,top+4.6,z-4);
 cyl(s,1.7,1.8,7.6,C.stone,cx-10,top,z-2,low?10:14);for(let k=0;k<8;k++){const a=k/8*Math.PI*2;box(s,.6,.5,.4,C.stone,cx-10+Math.sin(a)*1.7,top+7.6,z-2+Math.cos(a)*1.7,a);}cyl(p,.05,.07,3,C.iron,cx-10,top+7.6,z-2,5);
 const nx=to-14;box(s,10,4.8,10,C.cream,nx,top,z-6);box(s,10.3,.3,10.3,C.trim,nx,top+4.8,z-6);for(const dx of [-3,0,3])archedWindow(s,p,nx+dx,top+.6,z-.98,1.1,2.8,{frame:C.trim,glass:C.glass});
 const oni={wall:C.cream,trim:C.trim,dome:C.onion,finial:C.gold,glass:C.glass};drumDome(s,p,nx,top+4.9,z-6,1.8,1.8,oni,{low,cross:true,stretch:1.5,sides:low?8:12});for(const [dx,dz] of [[-3.2,-3.2],[3.2,-3.2],[-3.2,3.2],[3.2,3.2]] as const)drumDome(s,p,nx+dx,top+4.9,z-6+dz,1,1.1,oni,{low,cross:true,stretch:1.5,sides:8});
 s.mesh(group,vertexMaterial(.93),'castle-and-cathedral-walls');p.mesh(group,vertexMaterial(.6),'onion-domes-roofs-and-windows');wavingFlag(group,flag,cx-9.94,top+9.7,z-2,2.2,'estonia-flag',.64);group.userData={landmark:'Toompea Castle, Tall Hermann and the cathedral'};
}

/** A Hanseatic cog: a high-sided hull, one mast and one square sail. */
function cog(root:T.Object3D){const b=new Builder();b.add(new T.SphereGeometry(1,10,6),C.hull,[0,.2,0],[0,0,0],[3.6,1,1.3]);box(b,6.4,.5,2.2,C.hull,0,.6,0);box(b,1.6,.9,2.1,C.woodDark,-2.6,1.1,0);box(b,1.2,.7,1.9,C.woodDark,2.7,1.1,0);cyl(b,.08,.11,5.6,C.wood,0,1.1,0,6);box(b,.1,.1,4,C.wood,0,5.4,0);box(b,.06,3,3.6,C.sail,0,2.3,0);box(b,.07,.5,3.62,'#b5563a',0,3.6,0);const mesh=b.mesh(root,vertexMaterial(.8),'hanseatic-cog');mesh.userData={animated:true};return mesh;}

// Route furniture, in a platform's own coordinates, behind the walking lane.
/** A weather vane: a soldier with a banner, like the one on the town hall. */
function vane(b:Builder,x:number,y:number,z:number){cyl(b,.035,.045,1.5,C.iron,x,y,z,5);b.add(new T.SphereGeometry(.09,6,5),C.gold,[x,y+1.1,z]);box(b,.12,.34,.04,C.gold,x,y+1.5,z);b.add(new T.SphereGeometry(.07,6,5),C.gold,[x,y+1.92,z]);box(b,.4,.22,.03,C.gold,x+.26,y+1.7,z);}
function barrels(b:Builder,x:number,y:number,z:number){for(const [dx,dy] of [[-.34,0],[.34,0],[0,.62]] as const){cyl(b,.3,.3,.6,C.wood,x+dx,y+dy,z,10);for(const ring of [.1,.5])cyl(b,.315,.315,.05,C.iron,x+dx,y+dy+ring,z,10);}}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'limestone-wall-and-red-cone-towers','gun-tower-and-town-gate','gabled-merchant-houses','st-olaf-needle-spire','town-hall-tower-and-vane','toompea-castle-tall-hermann-and-onion-domes','hanseatic-cog','market-stalls-barrels-and-weather-vanes']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(37200),detail=new T.Group();detail.name='tallinn-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  shoreAndWall(detail,finish,low);oldTown(detail,r,low);spires(detail,low);toompea(detail,flagMaterial(bandedFlagTexture([['#0072ce',1],['#111111',1],['#ffffff',1]])),r,low);
  const pines:Placement[]=[],limes:Placement[]=[];for(let k=0;k<(low?14:30);k++)pines.push({x:-50+r()*(finish+150),y:tallinn.shoreTop,z:-58-r()*14,scale:1+r()*.7,rotation:r()*6});for(let k=0;k<(low?6:12);k++)limes.push({x:-46+r()*(tallinn.fatMargaretX+36),y:tallinn.shoreTop,z:-22-r()*8,scale:.7+r()*.3,rotation:r()*6});
  plantGrove(detail,'conifer',pines,{low,name:'baltic-pines'});plantGrove(detail,'plane',limes.filter(t=>Math.abs(t.x-tallinn.fatMargaretX)>6),{low,name:'shore-limes'});
  const ship=cog(detail),gulls=createFlock(detail,{name:'tallinn-gulls',count:low?5:10,centre:[finish*.5,7,-10],radius:[32,3,6],speed:.2,size:.8,color:'#f2f2ee',wing:'#c9ccd0',seed:113,glide:true});
  let reduced=context.reducedMotion;const sail=(time:number)=>{const lap=finish+120;ship.position.set(-50+(time*.5)%lap,-2.4+Math.sin(time*.7)*.05,-9.5);ship.rotation.z=Math.sin(time*.5)*.025;};sail(0);gulls.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;sail(time);gulls.update(time);},setReducedMotion(value){reduced=value;gulls.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.8)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*79+Math.round(definition.x),y=surface(0);
  if(t==='rooftop'){chimneyStack(b,w/2-.9,surface(w/2-.9),rear,2+seed%2,{brick:C.redDark,cap:'#6d3a2c',pot:'#d8b08a'});if(w>3.6)dormer(b,-w/2+1.1,surface(-w/2+1.1),rear-.05,C.cream,C.glass,C.red);if(seed%2)vane(b,0,y,rear);}
  else if(t==='ground'){lampPost(b,glow,-w/2+.5,y,-1.3);awningStall(b,-w/2+1.9,y,-2.3,{wood:C.wood,stripeA:C.red,stripeB:C.cream,goods:['#c58a3c','#e6c58a','#8f5a2c']});barrels(b,w/2-1.2,y,-2.1);if(w>8){bench(b,.6,y,-1.9);lampPost(b,glow,w/2-.5,y,-1.3);}}
  else if(t==='terrace'){balustrade(b,-w/2+.25,w/2-.25,y,rear,{rail:C.trim,base:C.stoneDark,baluster:C.white});pottedTree(b,-w/2+.9,y,-1.7,.75,{pot:'#b96a42',trunk:'#5a4636',leaf:C.leaf,fruit:'#e85a7a'},seed);vane(b,w/2-.6,y,rear+.2);}
  finishProps(root,b,glow,'tallinn-lanes-and-roofs');
 },
};
