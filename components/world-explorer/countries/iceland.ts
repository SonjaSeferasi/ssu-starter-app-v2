import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl,roof} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,bench,finishProps,flagMaterial,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Iceland: Thingvellir (SRS-632.20). Beyond the lake a plain of dark lava
 * lies under moss and purple lupins, split by fissures of clear blue water.
 * Behind it the wall of the rift runs the whole length of the valley, a
 * cliff of basalt columns with a lower wall before it, and a waterfall
 * drops over its edge into a river that winds down to the lake. On the
 * plain stand the little white church with its green roof and the
 * farmhouse of five white gables; the flag flies from the Law Rock; small
 * shaggy horses graze; and a broad snow-capped shield volcano closes the
 * view, with steam rising from the hot ground. The route carries lava
 * blocks, cairns, basalt columns, lupins and rope rails. Scenery only. */
const C={lava:'#4a4f47',lavaDark:'#34383a',moss:'#8fa24e',mossBright:'#a9b85a',basalt:'#5a5f60',basaltLight:'#7a7f7e',basaltDark:'#3f4446',water:'#4fb0cf',foam:'#f2f8fa',white:'#f8f6ee',green:'#3f6f5f',roofDark:'#3a3f44',glass:'#27343f',
 lupin:'#7a5fc0',lupinPink:'#b07ad0',leaf:'#4f7f4a',horse:['#8a5a3a','#c9a878','#3a2c24','#b0865a'],mane:'#2a2220',snow:'#f4f6f8',steam:'#f6f8fa',rope:'#c9b88a',wood:'#7a5c40',iron:'#22262a',gold:'#d6a938'} as const;
// The lava plain, the rift wall and the volcano are built here on a level shore.
const base=europeEnvironment('ISL',{landmark:false,flat:true,town:false,backdrop:false});
export const thingvellir={plainTop:-1,cliffZ:-46,fallsX:98,churchX:60,lawRockX:36} as const;

function plain(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='lava-plain-and-fissures';root.add(group);const s=new Builder(),p=new Builder(),top=thingvellir.plainTop,from=-60,to=finish+100;
 box(s,to-from,top+4.4,74,C.lava,(from+to)/2,-4.4,-53.5);
 // Hummocks of moss, blocks of lava, and drifts of lupins.
 for(let k=0;k<(low?50:130);k++){const x=from+r()*(to-from),z=-17.6-r()*24;s.add(new T.SphereGeometry(1,7,5),r()>.4?C.moss:C.mossBright,[x,top-.1,z],[0,r()*3,0],[1+r()*1.6,.3+r()*.3,.8+r()*1.2]);}
 for(let k=0;k<(low?20:50);k++)s.add(new T.DodecahedronGeometry(.4+r()*.5,0),r()>.5?C.lavaDark:C.lava,[from+r()*(to-from),top+.2,-17.4-r()*22],[r()*3,r()*3,0]);
 for(let k=0;k<(low?60:180);k++){const x=from+r()*(to-from),z=-18-r()*14;if(Math.abs(x-thingvellir.churchX)<12&&z<-21)continue;p.add(new T.ConeGeometry(.09,.5+r()*.3,5),r()>.3?C.lupin:C.lupinPink,[x,top+.42,z]);}
 // Fissures: straight cracks in the lava, filled with clear water.
 for(const [fx,len,turn] of [[18,22,.5],[78,18,.38],[128,24,.56],[finish+30,20,.44]] as const){p.add(new T.BoxGeometry(1.5,.05,len),C.lavaDark,[fx,top+.02,-28],[0,turn,0]);p.add(new T.BoxGeometry(.9,.06,len-.6),C.water,[fx,top+.03,-28],[0,turn,0]);}
 s.mesh(group,vertexMaterial(.98),'lava-moss-and-blocks');p.mesh(group,vertexMaterial(.8),'lupins-and-fissure-water');group.userData={feature:'Lava plain, lupins and fissures'};
}

function riftWall(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='rift-wall-of-basalt-columns';root.add(group);const s=new Builder(),y=thingvellir.plainTop,from=-60,to=finish+100,step=low?2.6:1.5;
 // The main cliff: columns of unequal height shoulder to shoulder. A lower wall stands before it, making the gorge.
 for(let x=from;x<to;x+=step){if(Math.abs(x-thingvellir.fallsX)<2.4)continue;const h=8+r()*3.2;s.add(new T.CylinderGeometry(step*.62,step*.66,h,6),r()>.5?C.basalt:C.basaltDark,[x+r()*.3,y+h/2,thingvellir.cliffZ-r()*.8],[0,r(),0]);s.add(new T.CylinderGeometry(step*.6,step*.6,.2,6),C.basaltLight,[x,y+h+.1,thingvellir.cliffZ-.4]);
  if(r()>.25){const h2=2.6+r()*2.4;s.add(new T.CylinderGeometry(step*.6,step*.64,h2,6),r()>.5?C.basaltLight:C.basalt,[x+r()*.3,y+h2/2,thingvellir.cliffZ+6+r()],[0,r(),0]);s.add(new T.SphereGeometry(step*.6,6,4),C.moss,[x,y+h2,thingvellir.cliffZ+6.4],[0,0,0],[1,.3,1]);}}
 box(s,to-from,12,6,C.basaltDark,(from+to)/2,y,thingvellir.cliffZ-4);box(s,to-from,.5,10,C.moss,(from+to)/2,y+10.4,thingvellir.cliffZ-8);
 s.mesh(group,vertexMaterial(.96),'basalt-columns-and-gorge-wall');group.userData={landmark:'Almannagja rift wall'};
}

function waterfall(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='oxararfoss-waterfall';root.add(group);const s=new Builder(),y=thingvellir.plainTop,x=thingvellir.fallsX,z=thingvellir.cliffZ;
 box(s,4.4,9.6,.5,C.water,x,y,z+.4);for(let k=0;k<(low?4:8);k++)s.add(new T.SphereGeometry(.9,7,5),C.foam,[x-1.8+k*(low?1.2:.52),y+.4,z+1.4+(k%2)*.5],[0,0,0],[1,.6,1]);
 // The river winds from the foot of the falls, through the gap in the lower wall, to the lake.
 const course:[number,number][]=[[x,z+1],[x-1,z+7],[x+3,-32],[x+1,-25],[x+5,-20],[x+4,-16.4]];for(let k=0;k<course.length-1;k++){const [ax,az]=course[k],[bx,bz]=course[k+1],len=Math.hypot(bx-ax,bz-az);s.add(new T.BoxGeometry(2.4,.06,len+1.2),C.water,[(ax+bx)/2,y+.04,(az+bz)/2],[0,Math.atan2(bx-ax,bz-az),0]);}
 s.mesh(group,vertexMaterial(.4),'falls-and-river');
 const streaks=new T.Group();streaks.name='falling-water';group.add(streaks);const material=new T.MeshBasicMaterial({color:C.foam,transparent:true,opacity:.75});for(let k=0;k<(low?5:9);k++){const streak=new T.Mesh(new T.BoxGeometry(.3,1.6,.1),material);streak.position.set(x-1.9+k*(low?.95:.48),y+5,z+.72);streak.userData.phase=k*.37;streak.castShadow=false;streaks.add(streak);}
 group.userData={landmark:'Oxararfoss'};return streaks;
}

function settlement(root:T.Object3D,flag:T.Material,low:boolean){
 const group=new T.Group();group.name='thingvellir-church-and-farmhouse';root.add(group);const s=new Builder(),p=new Builder(),y=thingvellir.plainTop,x=thingvellir.churchX,z=-24;
 box(s,30,.3,9,'#7f9a55',x+8,y,z-3.5);
 // The church: white boards, a green roof and a small tower.
 box(s,3.4,2.8,6,C.white,x,y+.3,z-3);roof(p,3.7,1.8,6.3,C.green,x,y+3.1,z-3,Math.PI/2);box(s,1.6,4.4,1.6,C.white,x,y+.3,z+.2);cone(p,1.2,2,C.green,x,y+4.7,z+.2,4);box(p,.06,.6,.06,C.gold,x,y+6.7,z+.2);box(p,.34,.06,.06,C.gold,x,y+7,z+.2);box(p,.7,1.5,.08,C.green,x,y+.3,z+1.02);for(const dz of [-1.6,-3.6])for(const side of [-1,1])p.add(new T.BoxGeometry(.06,1,.6),C.glass,[x+side*1.72,y+1.6,z+dz]);
 // The farmhouse: five white gables side by side.
 for(let k=0;k<5;k++){const gx=x+7+k*2.5;box(s,2.4,2.2,5,C.white,gx,y+.3,z-2.5);s.add(new T.CylinderGeometry(.02,1.2,1.5,3,1),C.white,[gx,y+3.25,z-.05],[0,-Math.PI/2,0],[.1,1,1]);roof(p,5.2,1.5,2.5,C.roofDark,gx,y+2.5,z-2.5,Math.PI/2);box(p,.6,.8,.08,C.glass,gx,y+1.1,z+.04);if(k===2)box(p,.7,1.4,.1,C.green,gx,y+.3,z+.05);else box(p,.4,.5,.08,C.glass,gx,y+2.5,z+.04);}
 for(let fx=x-3;fx<x+20;fx+=low?2.4:1.2)box(p,.08,.7,.08,C.white,fx,y+.3,z+2.4);box(p,23,.06,.06,C.white,x+8.5,y+.9,z+2.4);
 // The Law Rock: an outcrop with a walkway and the flag.
 const lx=thingvellir.lawRockX;for(const [dx,dy,size] of [[0,1,2.4],[-2,0.6,1.8],[2.2,.7,2],[.6,2,1.5]] as const)s.add(new T.DodecahedronGeometry(size,0),dx?C.basalt:C.basaltLight,[lx+dx,y+dy,z-10],[dx,dy*3,0],[1.2,.8,1]);box(p,5,.12,1.2,C.wood,lx,y+3.1,z-10);cyl(p,.07,.1,8,C.white,lx+1.6,y+3.1,z-10,6);
 s.mesh(group,vertexMaterial(.94),'church-farmhouse-and-law-rock');p.mesh(group,vertexMaterial(.7),'green-roofs-fence-and-walkway');wavingFlag(group,flag,lx+1.66,y+10.2,z-10,2.6,'iceland-flag',.72);group.userData={landmark:'Thingvellir church, farmhouse and Law Rock',gables:5};
}

function horses(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='icelandic-horses';root.add(group);const b=new Builder(),y=thingvellir.plainTop;
 for(let k=0;k<(low?4:8);k++){const x=110+k*((finish-60)/(low?4:8))+r()*4,z=-20-r()*8,coat=C.horse[k%C.horse.length],face=r()>.5?1:-1;
  box(b,1.2,.56,.44,coat,x,y+.6,z);for(const dx of [-.42,.42])for(const dz of [-.14,.14])box(b,.11,.6,.11,coat,x+dx,y,z+dz);b.strut(new T.Vector3(x+face*.5,y+1,z),new T.Vector3(x+face*.86,y+(k%2?.5:1.4),z),.16,coat,6,.8);box(b,.34,.22,.2,coat,x+face*.98,y+(k%2?.34:1.4),z);box(b,.5,.26,.12,C.mane,x+face*.6,y+1.26,z);b.strut(new T.Vector3(x-face*.6,y+1,z),new T.Vector3(x-face*.74,y+.3,z),.09,C.mane,5,.5);}
 b.mesh(group,vertexMaterial(.9),'grazing-horses');group.userData={feature:'Icelandic horses'};
}

function volcano(root:T.Object3D,finish:number,low:boolean){
 const group=new T.Group();group.name='shield-volcano-and-steam';root.add(group);const s=new Builder(),x=finish*.45,z=-150;
 // Drawn steeper than a true shield so its snow cap shows above the rift wall.
 s.add(new T.ConeGeometry(120,42,low?18:32,1,true),'#6f7872',[x,14,z]);s.add(new T.ConeGeometry(46,16.2,low?18:32),C.snow,[x,27,z]);for(const [dx,w,h] of [[-150,70,16],[150,80,14]] as const)s.add(new T.ConeGeometry(w,h,low?10:16),'#7a827c',[x+dx,1,z-10]);
 s.mesh(group,vertexMaterial(.98),'skjaldbreidur-shield-volcano');
 const steam=new T.Group();steam.name='geothermal-steam';group.add(steam);const material=new T.MeshBasicMaterial({color:C.steam,transparent:true,opacity:.5,depthWrite:false});for(const [sx,sz] of [[finish+50,-70],[finish+62,-78],[-30,-74]] as const)for(let k=0;k<4;k++){const puff=new T.Mesh(new T.SphereGeometry(1.6+k*.9,8,6),material);puff.position.set(sx+k*.8,10.6+k*3.2,sz);puff.userData.rise=k;puff.castShadow=false;steam.add(puff);}
 group.userData={feature:'Skjaldbreidur and geothermal steam'};return steam;
}

/** Blue, with a red cross edged in white. */
const icelandicFlag=()=>pixelTexture(64,(u,v)=>(u>.3&&u<.4)||(v>.44&&v<.56)?[220,30,53,255]:(u>.25&&u<.45)||(v>.38&&v<.62)?[255,255,255,255]:[2,82,156,255],true,false);

// Route furniture, in a platform's own coordinates, behind the walking lane.
function cairn(b:Builder,x:number,y:number,z:number){for(let k=0;k<4;k++)b.add(new T.DodecahedronGeometry(.34-k*.06,0),k%2?C.basalt:C.basaltLight,[x,y+.22+k*.36,z],[k,k*2,0],[1.2,.7,1.1]);}
function lupins(b:Builder,x:number,y:number,z:number,seed:number){for(let k=0;k<7;k++){const dx=((seed*7+k*13)%10)/10*1.1-.55,dz=((seed*3+k*7)%10)/10*.4-.2;box(b,.03,.24,.03,C.leaf,x+dx,y,z+dz);b.add(new T.ConeGeometry(.08,.46,5),k%3?C.lupin:C.lupinPink,[x+dx,y+.44,z+dz]);}}
function lavaBlock(b:Builder,x:number,y:number,z:number,size:number,seed:number){b.add(new T.DodecahedronGeometry(size,0),C.lavaDark,[x,y+size*.6,z],[seed,seed*2,0],[1.2,.8,1]);b.add(new T.SphereGeometry(size*.8,6,4),C.moss,[x,y+size*1.02,z],[0,0,0],[1,.3,.9]);}
function columns(b:Builder,x:number,y:number,z:number,seed:number){for(let k=0;k<4;k++){const h=.9+((seed+k*3)%5)*.34;b.add(new T.CylinderGeometry(.3,.32,h,6),k%2?C.basalt:C.basaltDark,[x+k*.56,y+h/2,z-(k%2)*.2]);b.add(new T.CylinderGeometry(.29,.29,.06,6),C.basaltLight,[x+k*.56,y+h+.03,z-(k%2)*.2]);}}
function ropeRail(b:Builder,from:number,to:number,y:number,z:number){for(let x=from;x<=to+.01;x+=1.6){cyl(b,.06,.07,.8,C.wood,x,y,z,6);if(x+1.6<=to+.01)b.strut(new T.Vector3(x,y+.7,z),new T.Vector3(x+1.6,y+.7,z),.025,C.rope,4,1);}}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'rift-wall-of-basalt-columns','waterfall-and-river','lava-plain-moss-lupins-and-fissures','white-church-and-five-gabled-farmhouse','law-rock-and-flag','icelandic-horses','shield-volcano-and-steam','cairns-columns-and-rope-rails']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(35400),detail=new T.Group();detail.name='thingvellir-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  plain(detail,finish,r,low);riftWall(detail,finish,r,low);const streaks=waterfall(detail,low);settlement(detail,flagMaterial(icelandicFlag()),low);horses(detail,finish,r,low);const steam=volcano(detail,finish,low);
  const scrub:Placement[]=[];for(let k=0;k<(low?10:24);k++){const x=-50+r()*(finish+150);if(Math.abs(x-thingvellir.churchX-8)>16)scrub.push({x,y:thingvellir.plainTop,z:-30-r()*8,scale:.4+r()*.25,rotation:r()*6});}plantGrove(detail,'birch',scrub,{low,name:'arctic-birch-scrub'});
  const ravens=createFlock(detail,{name:'thingvellir-ravens',count:low?4:8,centre:[thingvellir.fallsX,11,-38],radius:[40,3,6],speed:.22,size:.75,color:'#1c1e22',wing:'#121418',seed:109,glide:true});
  let reduced=context.reducedMotion;const flow=(time:number)=>{for(const streak of streaks.children)streak.position.y=thingvellir.plainTop+8.6-((time*2.6+streak.userData.phase*9)%8);for(const puff of steam.children){const k=puff.userData.rise as number;puff.scale.setScalar(1+Math.sin(time*.5+k)*.12);}};flow(0);ravens.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;flow(time);ravens.update(time);},setReducedMotion(value){reduced=value;ravens.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.6)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*73+Math.round(definition.x),from=-w/2+.4,to=w/2-.4;
  if(t==='ground'){ropeRail(b,from,to,Math.min(surface(from),surface(to)),rear);lavaBlock(b,from+.9,surface(from+.9),-1.7,.5,seed);lupins(b,to-1.2,surface(to-1.2),-1.4,seed);if(w>5)bench(b,.2,surface(.2),-1.9);if(w>8){cairn(b,to-2.8,surface(to-2.8),-2);lupins(b,from+2.6,surface(from+2.6),-1.5,seed+3);}}
  else if(t==='cliff'){columns(b,from,surface(from),rear,seed);if(w>4.4)cairn(b,to-.4,surface(to-.4),rear+.3);if(w>6)lavaBlock(b,0,surface(0),rear+.2,.4,seed);}
  else if(t==='rock'){lavaBlock(b,(seed%2?.3:-.3),surface(0),rear+.25,.36,seed);}
  finishProps(root,b,glow,'thingvellir-lava-cairns-and-columns');
 },
};
