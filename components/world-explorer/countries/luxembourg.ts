import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl,roof} from './europe-landmarks';
import {Builder,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,balustrade,bandedFlagTexture,bench,cafeTable,finishProps,flagMaterial,flowerBox,lampPost,pottedTree,pyramid,railing,texturedStone,townhouse,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Luxembourg: the fortress city on its rock (SRS-632.31). Across the
 * river the slate-roofed houses and the long abbey of the lower town line
 * the bank. Behind them the sandstone cliff rises to the upper town: the
 * Bock with its rows of casemate openings, the broken tower called the
 * Hollow Tooth and the flag; the red two-level Castle Bridge over the rock
 * cut; the Corniche wall along the edge; the palace turrets and the three
 * spires of the cathedral; the great stone arch of the Adolphe Bridge
 * across the side valley; and the Golden Lady on her obelisk. The route
 * carries iron railings, flower boxes, cafe tables and lanterns. Scenery
 * only: nothing collides. */
const C={sand:'#e6d3a8',sandDark:'#cdb888',sandLight:'#f2e4c0',redStone:'#c98a6e',slate:'#4f5b66',slateDark:'#3f4a55',trim:'#fbf8ef',glass:'#3a4652',shade:'#3a342c',grass:'#86a85e',gold:'#e0b030',iron:'#22262a',wood:'#7a5c40',leaf:'#4a7d3f',cream:'#f3ead6',red:'#d84a5a',pink:'#f09ab0',white:'#f8f5ee'} as const;
const walls=['#f3ead6','#efd9c0','#e6dcc6','#f6f0e2','#e9cfc0','#dfe6dc'] as const;
const base=europeEnvironment('LUX',{landmark:false,flat:true,town:false});
export const luxembourg={bankTop:-1,plateauTop:6,cliffZ:-27,bock:[18,48],cut:[48,60],palaceX:71,cathedralX:86,adolphe:[100,124],ladyX:132,abbeyX:150} as const;
const sandstone=(repeat=.9)=>texturedStone('paris-stone','#fff2d2',repeat,.95);

function plateau(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='sandstone-cliffs-and-corniche';root.add(group);const g=new Builder(),rock=new Builder(),{bankTop:top,plateauTop:up,cliffZ:z,bock,cut,adolphe}=luxembourg,from=-56,to=finish+100;
 box(g,to-from,top+5,60,C.grass,(from+to)/2,-5,-46.5);
 const crag=(x:number,cz:number,k:number)=>rock.add(new T.DodecahedronGeometry(1,0),k%2?C.sand:C.sandDark,[x,top+1+(k%3)*2,cz],[k,k*2,0],[2+(k%3)*.4,1.8+(k%2)*.6,1.3],.08);
 for(const [a,b] of [[from,cut[0]],[cut[1],adolphe[0]],[adolphe[1],to]] as const){box(rock,b-a,up-top,50,C.sand,(a+b)/2,top,z-25);box(g,b-a-.4,.06,49.6,C.grass,(a+b)/2,up,z-25);box(g,b-a,.7,.34,C.sandLight,(a+b)/2,up,z-.3);
  for(let x=a,k=0;x<=b;x+=low?4.4:2.2,k++)if(x<bock[0]-1||x>bock[1]+1)crag(x,z+.2-(k%2)*.3,k);}
 for(const x of [...cut,...adolphe])for(let cz=z-1,k=0;cz>z-22;cz-=low?4.8:2.4,k++)crag(x,cz,k+x);
 g.mesh(group,vertexMaterial(.96),'valley-floor-plateau-lawns-and-corniche-wall');rock.mesh(group,vertexMaterial(.98),'cliff-faces');group.userData={feature:'Cliffs of the upper town'};
}

function bock(root:T.Object3D,flag:T.Material,low:boolean){
 const group=new T.Group();group.name='bock-casemates';root.add(group);const s=new Builder(.5),p=new Builder(),{bankTop:top,plateauTop:up,cliffZ:z,bock:[a,b]}=luxembourg,mid=(a+b)/2;
 box(s,b-a,up-top,.9,C.sand,mid,top,z+.2);box(s,b-a+.4,.3,1.2,C.sandLight,mid,up-.02,z+.2);for(let x=a+2;x<b-1;x+=low?6:3)box(s,1,up-top,.5,C.sandDark,x,top,z+.8);
 // Two rows of gun openings cut into the rock.
 for(const [row,h] of [[1.2,1.3],[4,1.1]] as const)for(let x=a+3.5,k=0;x<b-2;x+=low?6:3,k++)archedWindow(s,p,x,top+row,z+.68,1.1,h,{frame:C.sandLight,glass:C.shade});
 // The Hollow Tooth: what is left of the castle tower.
 const tx=mid-4,tz=z-4;box(s,3,3.4,3,C.sand,tx,up,tz);for(const [dx,h] of [[-1.1,1.6],[-.3,.8],[.6,1.9],[1.2,.5]] as const)box(s,.7,h,3,C.sand,tx+dx,up+3.4,tz);archedWindow(s,p,tx,up+1,tz+1.52,.9,1.6,{frame:C.sandLight,glass:C.shade});
 cyl(p,.05,.07,3,C.iron,mid+5,up,z-3,5);s.mesh(group,sandstone(),'casemate-wall-and-hollow-tooth');p.mesh(group,vertexMaterial(.8),'gun-openings-and-mast');wavingFlag(group,flag,mid+5.06,up+2.4,z-3,2,'luxembourg-flag',.6);group.userData={landmark:'Bock casemates and the Hollow Tooth'};
}

function bridges(root:T.Object3D,low:boolean){
 // The Castle Bridge: red sandstone, an upper road on arches over a lower walk.
 const castle=new T.Group();castle.name='castle-bridge';root.add(castle);const s=new Builder(.5),p=new Builder(),{bankTop:top,plateauTop:up,cliffZ:z,cut:[a,b],adolphe:[c,d]}=luxembourg,cz=z-2.4,bay=(b-a)/3;
 box(s,b-a+.6,.7,3,C.redStone,(a+b)/2,up-.7,cz);for(const side of [-1,1])box(s,b-a+.6,.6,.2,C.redStone,(a+b)/2,up,cz+side*1.4);box(s,b-a,.3,2.6,C.redStone,(a+b)/2,top+2.6,cz);
 for(let k=0;k<=3;k++)box(s,.8,up-top-.7,3,C.redStone,a+k*bay,top,cz);for(let k=0;k<3;k++){s.add(new T.TorusGeometry(bay/2-.4,.3,5,low?8:12,Math.PI),C.redStone,[a+(k+.5)*bay,up-.7-(bay/2-.4)-.1,cz],[0,0,0],[1,1,5]);box(p,bay-.8,1.4,.1,C.shade,a+(k+.5)*bay,top+.4,cz-1.4);}
 s.mesh(castle,texturedStone('sandstone-blocks','#c47a66',1,.95),'two-level-red-sandstone-bridge');p.mesh(castle,vertexMaterial(.9),'bridge-shadows');castle.userData={landmark:'Castle Bridge'};
 // The Adolphe Bridge: one great arch between two piers, each pierced by smaller arches.
 const adolphe=new T.Group();adolphe.name='adolphe-bridge';root.add(adolphe);const m=new Builder(.5),q=new Builder(),mid=(c+d)/2,R=8.2,cy=-3,az=z-2.6,depth=3.2;
 const n=low?14:28;for(let k=0;k<n;k++){const t=(k+.5)/n*Math.PI;m.add(new T.BoxGeometry(Math.PI*(R+.3)/n+.05,.62,depth+.2),C.sandLight,[mid+Math.cos(t)*(R+.3),cy+Math.sin(t)*(R+.3),az],[0,0,t+Math.PI/2]);}
 const step=low?1:.5;for(let x=c;x<d-.01;x+=step){const dx=x+step/2-mid,bottom=Math.abs(dx)<R?Math.max(top,cy+Math.sqrt(R*R-dx*dx)+.5):top;if(up-.2>bottom)box(m,step+.02,up-.2-bottom,depth,C.sand,x+step/2,bottom,az);}
 box(m,d-c+.8,.3,depth+.5,C.sandLight,mid,up-.2,az);for(const side of [-1,1]){box(m,d-c+.8,.6,.22,C.sand,mid,up+.1,az+side*(depth/2+.1));for(const dx of [5.2,7.4,9.6])archedWindow(m,q,mid+side*dx,up-3.2+(dx-5.2)*.12,az+depth/2+.03,1.2,2.2-(dx-5.2)*.1,{frame:C.sandLight,glass:C.shade});}
 m.mesh(adolphe,sandstone(),'great-arch-piers-and-deck');q.mesh(adolphe,vertexMaterial(.9),'relief-arches');adolphe.userData={landmark:'Adolphe Bridge',span:R*2};
}

function upperTown(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='upper-town-skyline';root.add(group);const s=new Builder(),p=new Builder(),{plateauTop:y,cliffZ,cut,adolphe,palaceX:px,cathedralX:cx,ladyX:lx}=luxembourg,z=cliffZ-4;let houses=0;
 for(let x=cut[1]+1.5;x<finish+60;){const w=3.2+r()*2,h=3+r()*1.6,mid=x+w/2;if(!(mid>adolphe[0]-2.5&&mid<adolphe[1]+2.5)&&Math.abs(mid-px)>6.4&&Math.abs(mid-cx)>4.6&&Math.abs(mid-lx)>3.4){townhouse(s,p,mid,y,z,w-.15,h,5,{wall:walls[Math.floor(r()*walls.length)],trim:C.trim,glass:C.glass,roof:r()>.5?C.slate:C.slateDark},{rows:h>3.9?3:2,roof:r()>.5?'hip':'gable',door:false,low});houses++;}x+=w;}
 // The Grand Ducal Palace: a long front between two slim turrets.
 box(s,10,3.8,5,C.cream,px,y,z-2.5);roof(p,10.3,1.2,5.3,C.slate,px,y+3.8,z-2.5);for(let k=0;k<6;k++)for(const level of [.7,2.3]){box(p,.7,1,.06,C.glass,px-3.75+k*1.5,y+level,z+.03);box(p,.9,.08,.1,C.trim,px-3.75+k*1.5,y+level-.08,z+.05);}
 for(const side of [-1,1]){cyl(s,.7,.7,4.4,C.cream,px+side*5,y,z-.2,low?8:12);cone(p,.9,1.5,C.slate,px+side*5,y+4.4,z-.2,low?8:12);p.add(new T.SphereGeometry(.08,6,5),C.gold,[px+side*5,y+5.95,z-.2]);}
 // The cathedral: two thin west spires and a flèche over the crossing.
 const kz=z-3;box(s,5,4.4,9,C.sand,cx,y,kz-4.5);roof(p,5.3,1.6,9.3,C.slateDark,cx,y+4.4,kz-4.5,Math.PI/2);archedWindow(s,p,cx,y,kz+.04,1.3,2.4,{frame:C.sandLight,glass:C.shade});for(const side of [-1,1]){box(s,1.3,4.6,1.3,C.sand,cx+side*1.9,y,kz-.2);cone(p,.75,2.6,C.slateDark,cx+side*1.9,y+4.6,kz-.2,low?6:8);}cone(p,.4,2.4,C.slateDark,cx,y+5.6,kz-6,low?6:8);
 // The Golden Lady on her obelisk.
 box(s,1.8,1,1.8,C.sandLight,lx,y,z+1.6);pyramid(p,.3,.9,3.8,C.sandLight,lx,y+1,z+1.6);p.add(new T.SphereGeometry(.14,8,6),C.gold,[lx,y+5.5,z+1.6]);cone(p,.22,.7,C.gold,lx,y+4.75,z+1.6,8);p.add(new T.TorusGeometry(.22,.035,5,10),C.gold,[lx+.22,y+5.7,z+1.6]);
 s.mesh(group,vertexMaterial(.94),'upper-town-houses-palace-and-cathedral');p.mesh(group,vertexMaterial(.7),'slate-roofs-spires-and-golden-lady');group.userData={landmark:'Cathedral, Grand Ducal Palace and the Golden Lady',houses};
}

function grund(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='grund-lower-town';root.add(group);const s=new Builder(),p=new Builder(),{bankTop:y,cut,adolphe,abbeyX:ax}=luxembourg,z=-19.6;let houses=0;
 for(let x=-44;x<finish+60;){const w=3+r()*1.8,h=3.2+r()*1.6,mid=x+w/2;if(!(mid>cut[0]-1&&mid<cut[1]+1)&&!(mid>adolphe[0]+1&&mid<adolphe[1]-1)&&Math.abs(mid-ax)>12){townhouse(s,p,mid,y,z,w-.15,h,4,{wall:walls[Math.floor(r()*walls.length)],trim:C.trim,glass:C.glass,roof:r()>.5?C.slate:C.slateDark},{rows:h>4?3:2,roof:r()>.6?'gable':'hip',door:true,low});houses++;}x+=w+(houses%5?0:1.1);}
 // The abbey: a long range under one slate roof, and its church with a small spire.
 box(s,16,3.6,4,C.cream,ax+2,y,z-2);roof(p,16.3,1.1,4.3,C.slate,ax+2,y+3.6,z-2);for(let k=0;k<(low?5:10);k++)for(const level of [.6,2.1]){box(p,.6,.9,.06,C.glass,ax-5.2+k*(low?3.2:1.6),y+level,z+.03);}
 box(s,3.6,4.6,6,C.cream,ax-8.4,y,z-3);roof(p,3.9,1.3,6.3,C.slateDark,ax-8.4,y+4.6,z-3,Math.PI/2);archedWindow(s,p,ax-8.4,y,z+.04,1.1,2.2,{frame:C.trim,glass:C.shade});box(s,1.2,1.2,1.2,C.cream,ax-8.4,y+5.2,z-1);cone(p,.75,2,C.slateDark,ax-8.4,y+6.4,z-1,8);
 s.mesh(group,vertexMaterial(.94),'riverside-houses-and-abbey');p.mesh(group,vertexMaterial(.7),'grund-slate-roofs-and-windows');group.userData={feature:'Grund and Neumünster Abbey',houses};
}

// Route furniture, in a platform's own coordinates, behind the walking lane.
function parapet(b:Builder,from:number,to:number,y:number,z:number){box(b,to-from,.6,.34,C.sand,(from+to)/2,y,z);box(b,to-from+.1,.1,.44,C.sandLight,(from+to)/2,y+.6,z);}
const blooms=[C.red,C.pink,C.white] as const;

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'bock-casemate-openings','hollow-tooth-tower-and-flag','two-level-castle-bridge','corniche-wall','cathedral-three-spires','grand-ducal-palace-turrets','adolphe-bridge-great-arch','golden-lady-obelisk','grund-slate-roofs-and-abbey','iron-railings-and-flower-boxes']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(35200),detail=new T.Group();detail.name='luxembourg-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  plateau(detail,finish,r,low);bock(detail,flagMaterial(bandedFlagTexture([['#ef3340',1],['#ffffff',1],['#00a3e0',1]])),low);bridges(detail,low);upperTown(detail,finish,r,low);grund(detail,finish,r,low);
  const trees:Placement[]=[];for(const [a,b] of [luxembourg.cut,luxembourg.adolphe] as const)for(let k=0;k<(low?2:4);k++)trees.push({x:k%2?a+1.2+r()*1.6:b-1.2-r()*1.6,y:luxembourg.bankTop,z:-19.5-r()*4,scale:.45+r()*.2,rotation:r()*6});for(let k=0;k<(low?3:6);k++)trees.push({x:luxembourg.bock[0]+2+r()*26,y:luxembourg.plateauTop,z:-36-r()*8,scale:.7+r()*.4,rotation:r()*6});
  plantGrove(detail,'plane',trees,{low,name:'valley-and-bock-trees'});
  const swifts=createFlock(detail,{name:'fortress-swifts',count:low?6:12,centre:[finish*.5,9,-14],radius:[34,2.5,4],speed:.32,size:.5,color:'#2c2f36',wing:'#3a3e46',seed:171});
  let reduced=context.reducedMotion;swifts.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;swifts.update(time);},setReducedMotion(value){reduced=value;swifts.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.6)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*131+Math.round(definition.x),from=-w/2+.3,to=w/2-.3,y=surface(0);
  if(t==='ground'){railing(b,from,to,y,rear);lampPost(b,glow,from+.4,y,rear+.36);if(w>4.4)bench(b,to-1.2,y,rear+.4);}
  else if(t==='cliff'){const low=Math.min(surface(from),surface(to));parapet(b,from,to,low,rear);flowerBox(b,from+.3,to-.3,low+.7,rear,C.wood,blooms);if(w>4.4)lampPost(b,glow,to-.4,surface(to-.4),rear+.36);}
  else if(t==='terrace'){balustrade(b,from,to,y,rear,{rail:C.trim,base:C.sandDark,baluster:C.white});pottedTree(b,from+.7,y,rear+.6,.75,{pot:'#c98a5a',trunk:'#5a4636',leaf:C.leaf,fruit:C.red},seed);if(w>5)cafeTable(b,to-1.3,y,rear+.8,{metal:C.iron,top:C.white,parasol:'#00a3e0',parasolAlt:C.white});}
  else if(t==='rock'){pottedTree(b,(seed%2?.3:-.3),surface(0),rear+.4,.6,{pot:C.sandDark,trunk:'#5a4636',leaf:C.leaf,fruit:C.pink},seed);}
  else if(t==='bridge'){railing(b,from,to,y,rear);}
  finishProps(root,b,glow,'luxembourg-railings-flower-boxes-and-cafe-tables');
 },
};
