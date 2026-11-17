import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl,roof} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {createHeightfield,mountainColor,ridgedRange} from '../kit/landform';
import {FACES,REAR,archedWindow,balustrade,battlementTower,bench,cafeTable,chimneyStack,column,finishProps,flagMaterial,lampPost,place,pottedTree,pyramid,railing,texturedStone,townhouse,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Croatia: Split from its harbour (SRS-632.11). Behind the palm-lined Riva
 * with its white cafe parasols runs the sea wall of Diocletian's Palace: a
 * plain lower storey of doorways, a long gallery of arches between engaged
 * columns above, and a square tower at each end. Over it rise the tiered
 * bell tower of the cathedral and the eight-sided mausoleum, among stone
 * houses with red roofs. Marjan Hill, dark with pines, carries a chapel and
 * a great flag on the left, and bare limestone mountains close the view.
 * A white ferry and sailing boats cross the harbour and fishing boats ride
 * at the quay. The route carries palms, cafe tables, granite columns, a
 * sphinx and washing lines. Scenery only: nothing collides. */
const C={stone:'#efe7d4',stoneDark:'#d9cfb8',white:'#f8f5ec',trim:'#fbf8ef',red:'#b9603f',redDark:'#96492f',glass:'#2a3540',shade:'#5a4e42',granite:'#a8584a',black:'#2c2c30',iron:'#22262a',
 pine:'#3f6a44',palmTrunk:'#8a6f52',palm:'#3f8a4a',sea:'#3f8fb5',hull:'#f4f1e8',blue:'#2f5fa8',sail:'#f7f4ea',wood:'#7a5c40',leaf:'#4a7d3f',riva:'#ece6d6',pink:'#e85a8a'} as const;
const houseWalls=['#efe7d4','#e6dcc4','#f2ead8','#e9d9b8','#f6f0e0'] as const;
// The Riva, the palace and Marjan Hill are built here on a level shore.
const base=europeEnvironment('HRV',{landmark:false,flat:true,town:false});
export const split={rivaTop:-1,palace:[44,124],bellTowerX:84,mausoleumX:92,marjanX:6,z:-27} as const;
const limestone=()=>texturedStone('paris-stone','#fff8e8',1.2,.93);

/** A palm: a ringed trunk and a crown of drooping fronds. */
function palm(b:Builder,x:number,y:number,z:number,h:number,seed:number){
 b.strut(new T.Vector3(x,y,z),new T.Vector3(x+.15*Math.sin(seed),y+h,z),.16,C.palmTrunk,7,.75);for(let k=0;k<9;k++){const a=k/9*Math.PI*2+seed,tip=new T.Vector3(x+Math.cos(a)*1.5,y+h-.5,z+Math.sin(a)*1.5),mid=new T.Vector3(x+Math.cos(a)*.8,y+h+.35,z+Math.sin(a)*.8);b.strut(new T.Vector3(x,y+h,z),mid,.09,C.palm,4,.8);b.strut(mid,tip,.08,C.palm,4,.3);}
}

function riva(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='riva-promenade';root.add(group);const s=new Builder(),p=new Builder(),glow=new Builder(),top=split.rivaTop,from=-56,to=finish+90;
 box(s,to-from,top+4.4,70,C.riva,(from+to)/2,-4.4,-51.5);box(s,to-from,.2,.6,C.stoneDark,(from+to)/2,top,-16.8);for(let x=from+3;x<to;x+=low?10:5)cyl(p,.14,.18,.4,C.iron,x,top,-16.9,8);
 // Palms, white lamps, benches and cafe terraces under white parasols.
 for(let x=from+4,k=0;x<to;x+=low?9:4.5,k++){palm(p,x,top,-18.6,3.4+r()*.8,k);if(k%2===0){lampPost(p,glow,x+2.2,top,-18.4,'#e9e6dc','#fffbe8');}else bench(p,x+2.2,top,-18.2);}
 for(let x=split.palace[0]+2;x<split.palace[1]-2;x+=low?6:3)cafeTable(p,x,top,-22.6,{metal:'#d9d6cc',top:C.white,parasol:C.white,parasolAlt:'#efe9da'});
 s.mesh(group,vertexMaterial(.96),'riva-white-paving');p.mesh(group,vertexMaterial(.8),'riva-palms-benches-and-parasols');const lamps=glow.mesh(group,vertexMaterial(.4,{emissive:new T.Color('#ffe9b0'),emissiveIntensity:.7}),'riva-lamps');lamps.castShadow=false;group.userData={feature:'Riva promenade'};
}

function palace(root:T.Object3D,flag:T.Material,low:boolean){
 const group=new T.Group();group.name='diocletians-palace';root.add(group);const s=new Builder(.5),p=new Builder(),[from,to]=split.palace,y=split.rivaTop,z=split.z,len=to-from,h=6.4;
 box(s,len,h,2,C.stone,(from+to)/2,y,z-1);box(s,len+.4,.3,2.4,C.trim,(from+to)/2,y+3.1,z-1);box(s,len+.4,.36,2.4,C.trim,(from+to)/2,y+h-.18,z-1);
 // Lower storey: plain wall with doorways and shop awnings. Upper storey: the gallery of arches between engaged columns.
 const bays=low?20:40,step=len/bays;for(let k=0;k<bays;k++){const ax=from+(k+.5)*step;archedWindow(s,p,ax,y+3.5,z+.02,step*.55,2.1,{frame:C.trim,glass:C.shade});column(s,ax+step/2,y+3.4,z+.12,.14,2.6,C.trim,low?6:8);if(k%4===1){box(p,step*.8,2.1,.08,C.shade,ax,y,z+.03);box(p,step*1.1,.08,.9,k%8===1?C.red:C.white,ax,y+2.3,z+.5,0);}}
 // A square tower at each end and the Bronze Gate in the middle.
 for(const tx of [from-1.6,to+1.6]){battlementTower(s,tx,y,z-1.2,4.4,8.4,{wall:C.stone,trim:C.trim});for(const level of [3.6,6])archedWindow(s,p,tx,y+level,z+1.02,.8,1.5,{frame:C.trim,glass:C.shade});}
 box(p,1.6,2.6,.1,C.shade,(from+to)/2,y,z+.04);cyl(p,.05,.07,3,C.iron,to+1.6,y+9,z-1.2,5);
 s.mesh(group,limestone(),'palace-sea-wall-and-gallery');p.mesh(group,vertexMaterial(.7),'palace-openings-and-awnings');wavingFlag(group,flag,to+1.66,y+11.4,z-1.2,2.4,'croatia-flag',.5);group.userData={landmark:"Diocletian's Palace",galleryBays:bays};
}

function cathedral(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='cathedral-of-st-domnius';root.add(group);const s=new Builder(.5),p=new Builder(),y=split.rivaTop,z=-35;
 // The bell tower: six stages of round-arched openings, each a little narrower, under a pyramid cap.
 const tx=split.bellTowerX,tiers:[number,number][]=[[3.6,3.2],[3.3,2.3],[3,2.2],[2.7,2.1],[2.4,2],[1.9,1.6]];let level=y;
 tiers.forEach(([w,h],index)=>{box(s,w,h,w,C.white,tx,level,z);box(s,w+.26,.2,w+.26,C.trim,tx,level+h-.1,z);if(index>0)for(const [turn,dx,dz] of FACES){const face=new Builder(),glass=new Builder();for(const off of index<5?[-w*.22,w*.22]:[0])archedWindow(face,glass,off,h*.16,.02,w*.26,h*.62,{frame:C.trim,glass:C.shade});place(s,face.geometry(),tx+dx*w/2,level,z+dz*w/2,turn);place(p,glass.geometry(),tx+dx*w/2,level,z+dz*w/2,turn);}level+=h;});
 pyramid(p,.05,1.05,2,C.stoneDark,tx,level,z);p.add(new T.SphereGeometry(.12,6,5),'#d6a938',[tx,level+2.1,z]);
 // The mausoleum: eight sides ringed by columns under a tiled pyramid roof.
 const mx=split.mausoleumX;cyl(s,3.1,3.1,5.6,C.stone,mx,y,z-2,8);for(let k=0;k<(low?8:16);k++){const a=k/(low?8:16)*Math.PI*2;column(s,mx+Math.cos(a)*3.9,y,z-2+Math.sin(a)*3.9,.18,4.2,C.granite,6);}cyl(s,4.2,4.2,.3,C.trim,mx,y+4.2,z-2,8);cone(p,3.5,2.4,C.red,mx,y+5.6,z-2,8);
 s.mesh(group,limestone(),'bell-tower-and-mausoleum');p.mesh(group,vertexMaterial(.7),'cathedral-openings-and-roof');group.userData={landmark:'Cathedral of St Domnius',bellTowerTop:level+2.2};
}

function oldTown(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='split-stone-houses';root.add(group);const s=new Builder(),p=new Builder(),y=split.rivaTop;let houses=0;
 for(let x=-30;x<finish+70;){const w=3.4+r()*2,inside=x>split.palace[0]&&x<split.palace[1],h=inside?7.2+r()*1.6:4.6+r()*2.2,z=inside?-31:-25-r()*3;
  if(Math.abs(x+w/2-split.bellTowerX)>3&&Math.abs(x+w/2-split.mausoleumX)>4.4&&!(x+w>split.palace[0]-4&&x<split.palace[0])&&!(x+w>split.palace[1]&&x<split.palace[1]+4)){townhouse(s,p,x+w/2,y,z,w-.1,h,5,{wall:houseWalls[Math.floor(r()*houseWalls.length)],trim:C.trim,glass:inside?C.glass:'#3f6f8f',roof:r()>.4?C.red:C.redDark},{rows:Math.round(h/2.3),roof:'hip',door:!inside,low});houses++;}x+=w;}
 s.mesh(group,vertexMaterial(.94),'stone-house-walls');p.mesh(group,vertexMaterial(.7),'stone-house-shutters-and-red-roofs');group.userData={feature:'Stone houses of the old town',houses};
}

function marjan(root:T.Object3D,flag:T.Material,r:()=>number,low:boolean){
 const group=new T.Group();group.name='marjan-hill';root.add(group);const hill=new Builder(),s=new Builder(),x=split.marjanX,z=-54;
 hill.add(new T.SphereGeometry(1,low?12:20,low?8:12),C.pine,[x,-4.4,z],[0,0,0],[36,14.4,13],.08);hill.mesh(group,vertexMaterial(.97),'marjan-pine-slopes');
 box(s,2.4,1.6,2,C.white,x+5,9.6,z+2);roof(s,2.7,.9,2.3,C.red,x+5,11.2,z+2);box(s,.5,1.2,.5,C.white,x+5,12,z+2.6);cyl(s,.06,.09,5,C.iron,x-2,9.8,z+2,5);s.mesh(group,vertexMaterial(.9),'marjan-chapel-and-mast');
 const pines:Placement[]=[];for(let k=0;k<(low?14:30);k++){const a=r()*Math.PI,d=.3+r()*.6;pines.push({x:x+Math.cos(a)*36*d,y:-4.4+14.4*Math.sqrt(Math.max(0,1-d*d))*.9,z:z+13*Math.sqrt(Math.max(0,1-d*d*Math.cos(a)**2))*.85,scale:.7+r()*.5,rotation:r()*6});}
 plantGrove(group,'stone-pine',pines,{low,name:'marjan-pines'});wavingFlag(group,flag,x-1.94,14,z+2,3.2,'marjan-flag',.5);group.userData={landmark:'Marjan Hill'};
}

/** The tricolour with its chequered shield. */
const croatianFlag=()=>pixelTexture(96,(u,v)=>{if(Math.abs(u-.5)<.1&&v>.26&&v<.72)return(Math.floor((u-.4)*25)+Math.floor((v-.26)*11))%2?[255,255,255,255]:[215,20,26,255];return v>2/3?[215,20,26,255]:v>1/3?[255,255,255,255]:[23,23,150,255];},true,false);

function ferry(root:T.Object3D){const b=new Builder();box(b,11,1,2.6,C.hull,0,0,0);box(b,11.2,.14,2.7,C.blue,0,.5,0);box(b,7.6,1,2.2,C.hull,-.8,1,0);box(b,7.4,.4,2.24,C.glass,-.8,1.4,0);box(b,4.4,.8,1.9,C.hull,-1.6,2,0);cyl(b,.34,.4,1.1,C.blue,-.6,2.8,0,8);box(b,.06,1.6,.06,C.iron,3.6,1,0);const mesh=b.mesh(root,vertexMaterial(.55),'adriatic-ferry');mesh.userData={animated:true};return mesh;}
function boats(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='harbour-boats';root.add(group);const b=new Builder();
 // Fishing boats moored along the Riva and sailing boats out in the harbour.
 for(let x=-40;x<finish+70;x+=low?14:7){const hue=['#f4f1e8','#3f78a8','#c8402f','#f2d24a'][Math.floor(r()*4)],bx=x+r()*3;b.add(new T.SphereGeometry(1,8,5),hue,[bx,-2.36,-15.4],[0,0,0],[1.3,.32,.5]);box(b,.5,.4,.4,C.hull,bx-.2,-2.2,-15.4);}
 for(const [sx,sz,size] of [[30,-11,1],[78,-12.5,1.2],[128,-10.5,.9]] as const){b.add(new T.SphereGeometry(1,8,5),C.hull,[sx,-2.3,sz],[0,0,0],[2*size,.4*size,.6*size]);cyl(b,.04,.05,4.4*size,C.iron,sx,-2.2,sz,5);const corners=[new T.Vector3(.1,.4,0),new T.Vector3(.1,4.2*size,0),new T.Vector3(1.9*size,.4,0)];for(const order of [corners,[...corners].reverse()]){const sail=new T.BufferGeometry().setFromPoints(order);sail.computeVertexNormals();b.add(sail,C.sail,[sx,-2.2,sz]);}}
 const mesh=b.mesh(group,vertexMaterial(.7),'fishing-and-sailing-boats');mesh.userData={decorative:true};return group;
}

// Route furniture, in a platform's own coordinates, behind the walking lane.
/** A black granite sphinx on a plinth, as in the Peristyle. */
function sphinx(b:Builder,x:number,y:number,z:number){box(b,1.6,.4,.7,C.stoneDark,x,y,z);box(b,1.2,.36,.46,C.black,x,y+.4,z);box(b,.4,.56,.4,C.black,x+.46,y+.76,z);b.add(new T.SphereGeometry(.18,8,6),C.black,[x+.48,y+1.46,z]);box(b,.34,.26,.44,C.black,x+.74,y+.4,z);}
function washingLine(b:Builder,from:number,to:number,y:number,z:number){for(const x of [from,to])box(b,.05,1.5,.05,C.iron,x,y,z);box(b,to-from,.02,.02,C.iron,(from+to)/2,y+1.45,z);const cloth=[C.white,'#3f78a8',C.red,'#f2d24a',C.white];for(let k=0;k<Math.floor((to-from)/.5);k++)box(b,.34,.45+(k%3)*.12,.03,cloth[k%cloth.length],from+.3+k*.5,y+.98-(k%3)*.12,z);}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'palace-sea-wall-gallery-of-arches','st-domnius-bell-tower-and-mausoleum','riva-palms-and-parasols','marjan-hill-pines-and-flag','red-roofed-stone-houses','ferry-sailing-and-fishing-boats','granite-columns-sphinx-and-washing-lines']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(21000),detail=new T.Group();detail.name='split-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);const flag=flagMaterial(croatianFlag());
  riva(detail,finish,r,low);oldTown(detail,finish,r,low);palace(detail,flag,low);cathedral(detail,low);marjan(detail,flag,r,low);boats(detail,finish,r,low);
  const mosor=createHeightfield(detail,{name:'mosor-mountains',x:finish/2,y:-10,z:-150,width:finish+320,depth:60,segments:[low?40:90,low?14:28],height:ridgedRange(9120,{peaks:8,height:46,sharpness:1.3}),color:mountainColor({snowLine:200,treeLine:20,rock:'#a8a396',forest:'#77875f',snow:'#a8a396'})});mosor.userData.landmark='Mosor';
  const ship=ferry(detail),gulls=createFlock(detail,{name:'adriatic-gulls',count:low?5:10,centre:[finish*.5,7,-10],radius:[32,3,6],speed:.2,size:.8,color:'#f2f2ee',wing:'#c9ccd0',seed:67,glide:true});
  let reduced=context.reducedMotion;const sail=(time:number)=>{const lap=finish+130;ship.position.set(finish+70-(time*.7)%lap,-2.5+Math.sin(time*.7)*.04,-8.5);};sail(0);gulls.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;sail(time);gulls.update(time);},setReducedMotion(value){reduced=value;gulls.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.8)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*41+Math.round(definition.x),y=surface(0);
  if(t==='rooftop'){chimneyStack(b,w/2-.9,surface(w/2-.9),rear,1+seed%2,{brick:C.stoneDark,cap:C.red,pot:C.redDark});if(w>3.4)washingLine(b,-w/2+.5,Math.min(w/2-1.8,-w/2+3.6),y,rear+.1);}
  else if(t==='arch'){for(const side of [-1,1])column(b,side*(w/2-.5),y,rear+.25,.2,2.6,C.granite,10);box(b,w-.4,.26,.5,C.trim,0,y+2.6,rear+.25);if(w>4.4)sphinx(b,0,y,rear+.45);}
  else if(t==='ground'){palm(b,-w/2+1.3,y,-2.4,2.8,seed);if(w>4.4)lampPost(b,glow,-w/2+2.6,surface(-w/2+2.6),-1.3,'#e9e6dc','#fffbe8');if(w>6.4)cafeTable(b,-w/2+3.9,y,-1.9,{metal:'#d9d6cc',top:C.white,parasol:C.white,parasolAlt:'#efe9da'});bench(b,w/2-1.3,y,-1.9);if(w>8){palm(b,w/2-3,y,-2.5,3,seed+2);sphinx(b,.8,y,-2.2);}}
  else if(t==='terrace'){balustrade(b,-w/2+.25,w/2-.25,y,rear,{rail:C.trim,base:C.stoneDark,baluster:C.white});pottedTree(b,-w/2+.9,y,-1.7,.75,{pot:'#c98a5a',trunk:'#5a4636',leaf:C.leaf,fruit:C.pink},seed);if(w>5)pottedTree(b,w/2-.9,y,-1.7,.75,{pot:'#c98a5a',trunk:'#5a4636',leaf:C.leaf,fruit:C.white},seed+1);}
  else if(t==='stairs'){const from=-w/2+.25,to=w/2-.25;railing(b,from,to,Math.min(surface(from),surface(to)),rear,C.iron,'#d6a938');}
  finishProps(root,b,glow,'split-riva-and-roofs');
 },
};
