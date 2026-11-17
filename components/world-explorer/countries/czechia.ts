import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl,roof} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,awningStall,balustrade,bench,cafeTable,chimneyStack,dormer,finishProps,flagMaterial,flowerBox,fountain,lampPost,pointedWindow,pottedTree,railing,statue,texturedStone,townhouse,wavingFlag,windowGrid} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Czechia: Cesky Krumlov in its bend of the Vltava (SRS-632.9). Low gabled
 * houses under red roofs line the far bank. Above them the castle stands on
 * its rock: long painted wings, the round Castle Tower in pink, cream and
 * green with its arcaded gallery and copper cap, and the Cloak Bridge, three
 * storeys of arches on tall stone piers. St Vitus Church lifts its steep
 * roof and slender tower over the old town, with wooded hills behind. Rafts
 * and canoes drift down the river. The route carries lamps, inn tables,
 * barrels, flower boxes, chimneys and a saint's statue. Scenery only. */
const C={cream:'#efe6cf',pink:'#dba39a',rose:'#c98478',green:'#6f9a86',copper:'#5f8f7c',red:'#b25a3c',redDark:'#8f4530',stone:'#d9d0bc',rock:'#e6e0d2',trim:'#f8f2e2',glass:'#2a3540',
 grey:'#b9b3a6',white:'#f6f2e8',gold:'#d6a938',iron:'#22262a',wood:'#7a5c40',woodDark:'#5c4330',leaf:'#4a7d3f',quay:'#c9c0aa',bronze:'#5d6a60',canoe:'#c8402f',raft:'#a8855a'} as const;
const painted=['#efe6cf','#e9c9a8','#dba39a','#d9d6c2','#c9d6b8','#e6d39a','#f2ead8'] as const;
const base=europeEnvironment('CZE',{landmark:false});
export const krumlov={bankTop:-1,rockTop:5,castle:[50,116],towerX:56,cloakBridgeX:124,churchX:16,z:-40} as const;
const masonry=()=>texturedStone('paris-stone','#f6efdc',1.2,.94);

function riverside(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='vltava-riverside-houses';root.add(group);const s=new Builder(),p=new Builder(),y=krumlov.bankTop;let houses=0;
 box(s,finish+130,y+4.4,64,C.quay,finish/2,-4.4,-48.5);for(let x=-44;x<finish+80;x+=low?2.4:1.2)box(p,.06,.8,.06,C.woodDark,x,y,-16.9);box(p,finish+124,.07,.07,C.woodDark,finish/2+18,y+.8,-16.9);
 // Two-storey burgher houses, kept low so the castle shows above their roofs.
 for(let x=-42;x<finish+70;){const w=3+r()*1.6,h=3.4+r()*1.3;
  // The row opens below the Cloak Bridge so its piers and arches show down to the valley.
  if(Math.abs(x+w/2-krumlov.cloakBridgeX)<7+w/2){x+=w;continue;}
  townhouse(s,p,x+w/2,y,-19,w-.1,h,4.4,{wall:painted[Math.floor(r()*painted.length)],trim:C.trim,glass:C.glass,roof:r()>.3?C.red:C.redDark},{rows:2,roof:'gable',door:true,low});houses++;x+=w;}
 s.mesh(group,vertexMaterial(.93),'riverside-house-walls');p.mesh(group,vertexMaterial(.7),'riverside-house-roofs-and-fence');group.userData={feature:'Red-roofed houses on the Vltava',houses};
}

function castle(root:T.Object3D,flag:T.Material,r:()=>number,low:boolean){
 const group=new T.Group();group.name='krumlov-castle';root.add(group);const rock=new Builder(.5),s=new Builder(),p=new Builder(),[from,to]=krumlov.castle,top=krumlov.rockTop,z=krumlov.z;
 // The long rock above the river.
 box(rock,to-from+8,top+4.4,12,C.rock,(from+to)/2,-4.4,z-3);for(let k=0;k<(low?10:20);k++)box(rock,3+r()*3,3+r()*(top+1),2+r()*2,C.rock,from-2+k*(to-from+4)/(low?10:20),-4.4+r()*2,z+3.6+r(),(r()-.5)*.3);
 rock.mesh(group,texturedStone('paris-stone','#f2ecdc',.5,.97),'castle-rock');
 // The wings step along the rock, each painted and windowed differently.
 let x=from+6,index=0;while(x<to-3){const w=9+r()*6,h=3.6+(index%3)*.6,wall=[C.cream,C.grey,C.pink,C.white][index%4],d=6;
  box(s,w,h,d,wall,x+w/2,top,z-2);windowGrid(s,p,x+w/2,top+.5,z+1.02,w-.6,h-.8,Math.max(3,Math.round(w/1.5)),2,{wall,trim:C.trim,glass:C.glass,roof:C.red},index%2===0,low);roof(p,w+.3,1.6,d+.4,C.red,x+w/2,top+h,z-2);
  if(index%2)for(let k=0;k<(low?1:3);k++)box(p,.5,.9,.5,C.redDark,x+2+k*3,top+h+.7,z-1);x+=w;index++;}
 // The Castle Tower: a round painted shaft, an arcaded gallery, and a copper cap with its lantern.
 const tx=krumlov.towerX,segments=low?12:20;box(s,4.6,3,4.6,C.cream,tx,top,z);roof(p,4.9,1,4.9,C.red,tx,top+3,z);
 const bands:[number,string][]=[[1.3,C.pink],[.5,C.cream],[1.5,C.green],[.5,C.cream],[1.4,C.rose]];let level=top+3;for(const [h,color] of bands){cyl(s,1.42,1.5,h,color,tx,level,z,segments);level+=h;}
 cyl(s,1.9,1.5,.3,C.cream,tx,level,z,segments);for(let k=0;k<(low?8:14);k++){const a=k/(low?8:14)*Math.PI*2;cyl(s,.07,.07,.9,C.trim,tx+Math.cos(a)*1.75,level+.3,z+Math.sin(a)*1.75,5);}cyl(s,1.15,1.2,.9,C.pink,tx,level+.3,z,segments);cyl(p,1.95,1.95,.14,C.copper,tx,level+1.2,z,segments);
 p.add(new T.SphereGeometry(1.5,segments,8,0,Math.PI*2,0,Math.PI/2),C.copper,[tx,level+1.3,z],[0,0,0],[1,.8,1]);cyl(s,.5,.55,.7,C.cream,tx,level+2.4,z,10);p.add(new T.SphereGeometry(.6,10,8),C.copper,[tx,level+3.4,z],[0,0,0],[1,1.15,1]);cyl(p,.03,.05,.9,C.gold,tx,level+4,z,5);p.add(new T.SphereGeometry(.1,6,5),C.gold,[tx,level+4.9,z]);
 // Clock dials face the river and the town.
 for(const [dx,dz] of [[0,1],[1,0]] as const){p.add(new T.CylinderGeometry(.5,.5,.06,16),C.white,[tx+dx*1.46,top+5.4,z+dz*1.46],[dx?0:Math.PI/2,0,dx?Math.PI/2:0]);}
 // Flag over the upper castle.
 cyl(p,.05,.07,3.4,C.iron,to-12,top+4.4,z-1,5);s.mesh(group,vertexMaterial(.92),'castle-painted-wings-and-tower');p.mesh(group,vertexMaterial(.62),'castle-roofs-and-copper-cap');
 wavingFlag(group,flag,to-11.94,top+7.1,z-1,2.4,'czechia-flag',.66);group.userData={landmark:'Cesky Krumlov Castle',towerTop:level+5};
}

function cloakBridge(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='cloak-bridge';root.add(group);const s=new Builder(.5),c=new Builder(),p=new Builder(),x=krumlov.cloakBridgeX,top=krumlov.rockTop,z=krumlov.z,span=14;
 // Tall piers from the valley floor, round arches between them, and covered corridors above.
 const piers=4;for(let k=0;k<piers;k++){const px=x-span/2+k*span/(piers-1);box(s,1.5,top+2.6,3,C.stone,px,-1,z-1.5);box(s,1.9,.3,3.3,C.trim,px,top-.6,z-1.5);}
 for(let k=0;k<piers-1;k++){const ax=x-span/2+(k+.5)*span/(piers-1),w=span/(piers-1)-1.5;for(const level of [1.4,top-1.2])s.add(new T.TorusGeometry(w/2,.28,6,low?8:14,Math.PI),C.stone,[ax,level,z-1.5],[0,0,0],[1,1,5]);}
 box(s,span+2,.5,3.2,C.stone,x,top+1.5,z-1.5);box(c,span+2,3,2.6,C.cream,x,top+2,z-1.5);windowGrid(c,p,x,top+2.3,z-.18,span+1,2.5,low?6:10,2,{wall:C.cream,trim:C.trim,glass:C.glass,roof:C.red},true,low);roof(p,span+2.4,1.3,3,C.red,x,top+5,z-1.5);
 for(const end of [-1,1])for(let k=0;k<(low?1:2);k++)statue(s,x+end*(span/2-1.2-k*3.2),top+1.9,z+.4,1.3,{pedestal:C.stone,figure:C.grey});
 // The garden wing beyond the bridge.
 box(c,16,3.4,5,C.white,x+span/2+9,top,z-2);windowGrid(c,p,x+span/2+9,top+.5,z+.52,15,2.6,8,2,{wall:C.white,trim:C.trim,glass:C.glass,roof:C.red},false,low);roof(p,16.3,1.5,5.4,C.red,x+span/2+9,top+3.4,z-2);
 const rock=new Builder(.5);box(rock,22,top+4.4,12,C.rock,x+span/2+10,-4.4,z-3);rock.mesh(group,texturedStone('paris-stone','#f2ecdc',.5,.97),'garden-rock');
 s.mesh(group,masonry(),'cloak-bridge-piers-and-arches');c.mesh(group,vertexMaterial(.92),'cloak-bridge-corridors');p.mesh(group,vertexMaterial(.62),'cloak-bridge-roof-and-windows');group.userData={landmark:'Cloak Bridge',storeys:3,piers};
}

function church(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='st-vitus-church';root.add(group);const s=new Builder(.5),p=new Builder(),x=krumlov.churchX,y=krumlov.bankTop,z=-30,gothic={frame:C.trim,glass:C.glass};
 box(s,6,5.4,13,C.white,x,y,z-6.5);roof(p,6.3,4.6,13.3,C.redDark,x,y+5.4,z-6.5,Math.PI/2);for(const dx of [-2,0,2])pointedWindow(s,p,x+dx,y+1,z+.02,1,3.4,low,gothic);
 for(const dx of [-3.2,-1,1,3.2])box(s,.5,5,.9,C.stone,x+dx,y,z+.3);
 // The slender eight-sided tower with its needle spire.
 const tx=x+5.2;box(s,2.6,6.4,2.6,C.white,tx,y,z-1.4);cyl(s,1.25,1.3,2.2,C.white,tx,y+6.4,z-1.4,8);for(let k=0;k<4;k++){const a=k*Math.PI/2+Math.PI/4;pointedWindow(s,p,tx+Math.sin(a)*1.2,y+6.7,z-1.4+Math.cos(a)*1.2+.02,.5,1.4,low,gothic);}
 cone(p,1.45,3.4,C.copper,tx,y+8.6,z-1.4,8);p.add(new T.SphereGeometry(.12,6,5),C.gold,[tx,y+12.1,z-1.4]);
 s.mesh(group,masonry(),'st-vitus-walls-and-tower');p.mesh(group,vertexMaterial(.62),'st-vitus-steep-roof-and-spire');group.userData={landmark:'St Vitus Church'};
}

/** A timber raft with oarsmen's benches, and a red canoe: both drift down the Vltava. */
function riverCraft(root:T.Object3D){
 const group=new T.Group();group.name='vltava-rafts-and-canoes';root.add(group);const b=new Builder();
 for(let k=0;k<6;k++)box(b,5,.22,.34,k%2?C.raft:C.wood,0,0,-.9+k*.36);for(const dx of [-1.6,0,1.6])box(b,.3,.3,2,C.woodDark,dx,.22,0);b.strut(new T.Vector3(2.4,.5,0),new T.Vector3(4.2,.1,.4),.04,C.woodDark,5,1);
 for(const [dx,dz] of [[8,1.6],[11.5,-1.2]] as const){b.add(new T.SphereGeometry(1,10,6),C.canoe,[dx,.12,dz],[0,0,0],[1.5,.22,.36]);b.add(new T.SphereGeometry(.16,6,5),'#f2d6bd',[dx-.3,.62,dz]);box(b,.26,.4,.22,'#3f6fae',dx-.3,.2,dz);}
 const craft=b.mesh(group,vertexMaterial(.8),'raft-and-canoes');craft.userData={animated:true};return group;
}

/** White over red with a blue wedge at the hoist. */
const czechFlag=()=>pixelTexture(64,(u,v)=>u<.5-Math.abs(v-.5)?[17,69,126,255]:v>.5?[255,255,255,255]:[215,20,26,255],true,false);

// Route furniture, in a platform's own coordinates, behind the walking lane.
function barrels(b:Builder,x:number,y:number,z:number){for(const [dx,dy] of [[-.34,0],[.34,0],[0,.62]] as const){cyl(b,.3,.3,.6,C.wood,x+dx,y+dy,z,10);for(const ring of [.1,.5])cyl(b,.315,.315,.05,C.iron,x+dx,y+dy+ring,z,10);}}
function innSign(b:Builder,x:number,y:number,z:number){cyl(b,.05,.06,2.6,C.iron,x,y,z,6);box(b,.9,.05,.05,C.iron,x+.45,y+2.4,z);box(b,.6,.5,.05,C.woodDark,x+.55,y+1.8,z);b.add(new T.TorusGeometry(.14,.03,5,10),C.gold,[x+.55,y+2.05,z+.04]);}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'painted-castle-tower-and-gallery','castle-wings-on-the-rock','cloak-bridge-arches','st-vitus-steep-roof','red-roofed-riverside-houses','vltava-rafts-and-canoes','inn-tables-barrels-and-flower-boxes']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(61702),detail=new T.Group();detail.name='krumlov-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  riverside(detail,finish,r,low);castle(detail,flagMaterial(czechFlag()),r,low);cloakBridge(detail,low);church(detail,low);
  const firs:Placement[]=[],limes:Placement[]=[];for(let k=0;k<(low?16:36);k++)firs.push({x:-40+r()*(finish+90),y:krumlov.bankTop,z:-52-r()*16,scale:1+r()*.8,rotation:r()*6});
  for(let k=0;k<(low?6:12);k++)limes.push({x:-40+r()*(finish+80),y:krumlov.bankTop,z:-25.5-r()*3,scale:.6+r()*.25,rotation:r()*6});
  plantGrove(detail,'conifer',firs,{low,name:'bohemian-forest-firs'});plantGrove(detail,'plane',limes,{low,name:'old-town-lindens'});
  const craft=riverCraft(detail),swallows=createFlock(detail,{name:'krumlov-swallows',count:low?6:12,centre:[krumlov.towerX+20,10,-30],radius:[34,3,6],speed:.34,size:.5,color:'#2c3440',wing:'#1f2630',seed:17,glide:true});
  let reduced=context.reducedMotion;const drift=(time:number)=>{const lap=finish+110;craft.position.set(-50+(time*.6)%lap,-2.36+Math.sin(time*.8)*.03,-9);};drift(0);swallows.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;drift(time);swallows.update(time);},setReducedMotion(value){reduced=value;swallows.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.8)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*29+Math.round(definition.x),y=surface(0);
  if(t==='rooftop'){chimneyStack(b,w/2-.9,surface(w/2-.9),rear,2+seed%2,{brick:C.redDark,cap:'#6d3a2c',pot:'#d8b08a'});flowerBox(b,-w/2+.3,w/2-1.6,y,rear+.12,C.wood,['#d32f3a','#f2d24a','#ffffff']);if(w>3.6)dormer(b,-w/2+1.1,surface(-w/2+1.1),rear-.05,C.cream,C.glass,C.red);}
  else if(t==='bridge'){railing(b,-w/2+.25,w/2-.25,y,rear,C.woodDark,C.woodDark);flowerBox(b,-w/2+.5,w/2-.5,y+.95,rear,C.wood,['#d32f3a','#e85a7a','#ffffff']);statue(b,w/2-.9,surface(w/2-.9),rear,1.5,{pedestal:C.stone,figure:C.bronze});lampPost(b,glow,-w/2+.6,surface(-w/2+.6),rear+.3);}
  else if(t==='ground'){lampPost(b,glow,-w/2+.5,y,-1.3);innSign(b,-w/2+1.4,y,-2.2);cafeTable(b,-w/2+2.6,y,-1.9,{metal:C.iron,top:C.wood,parasol:'#2f6f4a',parasolAlt:C.cream});barrels(b,w/2-1.2,y,-2.1);if(w>8){awningStall(b,.6,y,-2.3,{wood:C.wood,stripeA:C.red,stripeB:C.cream,goods:['#c58a3c','#e6c58a','#8f5a2c']});bench(b,w/2-3,y,-1.9);lampPost(b,glow,w/2-.5,y,-1.3);}}
  else if(t==='terrace'){balustrade(b,-w/2+.25,w/2-.25,y,rear,{rail:C.trim,base:C.stone,baluster:C.cream});pottedTree(b,-w/2+.9,y,-1.7,.75,{pot:'#b96a42',trunk:'#5a4636',leaf:C.leaf,fruit:'#e85a7a'},seed);if(w>6)fountain(b,w/2-1.8,y,-2,.8,{stone:C.stone,water:'#7fb6c6'});}
  else if(t==='stairs'){const from=-w/2+.25,to=w/2-.25;railing(b,from,to,Math.min(surface(from),surface(to)),rear,C.iron,C.gold);}
  finishProps(root,b,glow,'krumlov-lanes-and-roofs');
 },
};
