import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl,onion,roof} from './europe-landmarks';
import {Builder,random,vertexMaterial,type Placement} from '../kit/common';
import {createHeightfield,mountainColor,ridgedRange} from '../kit/landform';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,balustrade,bandedFlagTexture,bench,cafeTable,chimneyStack,dormer,drumDome,finishProps,flagMaterial,flowerBox,fountain,lampPost,pottedTree,pyramid,railing,statue,texturedStone,townhouse,wavingFlag,windowGrid,settle} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Austria: Salzburg's old town on the Salzach (SRS-632.6). Across the river
 * the pastel quay houses stand shoulder to shoulder; above them rise the
 * cathedral's twin towers and green dome, the Gothic spire of the Franciscan
 * church, the twin towers and dome of the Collegiate Church and St Peter's
 * onion tower. Hohensalzburg Fortress crowns its wooded hill, the Monchsberg
 * cliff closes the left and the Alps stand behind. The route carries a
 * Mozart statue, cafe tables under parasols, a fountain, hanging iron shop
 * signs, flower boxes and balustrades. Scenery only: nothing collides. */
const C={marble:'#f1ece0',trim:'#fbf7ee',copper:'#6f9f93',copperDark:'#557f76',slate:'#4b565c',glass:'#2b3742',gold:'#d2a63f',red:'#b4513a',redDark:'#8f3f2e',white:'#f6f3ea',rock:'#b9b0a0',
 forest:'#4f7446',iron:'#22262a',bronze:'#5c6a5f',pot:'#b96a42',leaf:'#4a7d3f',water:'#6fa7b8',wood:'#7a5c40',quay:'#c9c2b2'} as const;
const pastel=['#f0d98c','#f4c9a8','#e7b9b0','#cfe0c0','#f3ead0','#c9d8e6','#f1dfa0','#e9c8d2'] as const;
const base=europeEnvironment('AUT',{landmark:false});
export const salzburg={quayTop:-1,cathedralX:72,fortressX:118,hillTop:16} as const;
// Pale Untersberg marble: left untextured so it stays nearly white.
const stone=()=>vertexMaterial(.86);
const facade={wall:C.marble,trim:C.trim,glass:C.glass,roof:C.copper};

function quay(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='salzach-quay-houses';root.add(group);const s=new Builder(),p=new Builder(),top=salzburg.quayTop;let houses=0;
 box(s,finish+130,top+4.4,26,C.quay,finish/2,-4.4,-30);for(let x=-44;x<finish+80;x+=1.2)box(p,.05,.9,.05,C.iron,x,top,-17.1);box(p,finish+124,.05,.05,C.iron,finish/2+18,top+.9,-17.1);
 for(let x=-40;x<finish+70;){const w=3.6+r()*1.8,h=5.5+r()*2.4;if(Math.abs(x+w/2-salzburg.cathedralX)<13){x+=w;continue;}
  townhouse(s,p,x+w/2,top,-18.4,w-.12,h,5,{wall:pastel[Math.floor(r()*pastel.length)],trim:C.trim,glass:C.glass,roof:r()>.5?C.slate:C.redDark},{rows:Math.round(h/2.1),roof:r()>.45?'parapet':'hip',door:true,low});houses++;x+=w;}
 s.mesh(group,vertexMaterial(.93),'quay-house-walls');p.mesh(group,vertexMaterial(.7),'quay-house-windows-and-roofs');group.userData={feature:'Pastel houses on the Salzach quay',houses};
}

function cathedral(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='salzburg-cathedral';root.add(group);const s=new Builder(.5),p=new Builder(),x=salzburg.cathedralX,y=salzburg.quayTop,z=-24;
 box(s,13,10,13,C.marble,x,y,z-7);roof(p,13.4,3,9,C.slate,x,y+10,z-9);box(s,8.4,11.6,1,C.marble,x,y,z-.2);s.add(new T.CylinderGeometry(.02,4.2,2.6,3,1),C.marble,[x,y+11.6+1.3,z-.2],[0,-Math.PI/2,0],[.2,1,1]);
 for(const offset of [-2.6,0,2.6]){archedWindow(s,p,x+offset,y,z+.32,1.5,3.2,{frame:C.trim,glass:'#33261e'});archedWindow(s,p,x+offset,y+5.6,z+.32,1.1,2.2,{frame:C.trim,glass:C.glass});}
 for(const dx of [-3.6,-1.3,1.3,3.6])statue(p,x+dx,y+11.6,z-.2,1.6,{pedestal:C.marble,figure:C.trim});
 // Twin towers with green copper helms and lanterns.
 for(const side of [-1,1]){const tx=x+side*5.6;box(s,3.4,17,3.4,C.marble,tx,y,z-1);for(const level of [5.6,11.2,16.8])box(s,3.7,.28,3.7,C.trim,tx,y+level,z-1);
  for(const level of [1.6,7,12.4])archedWindow(s,p,tx,y+level,z+.72,.95,2.2,{frame:C.trim,glass:C.glass});
  cyl(s,1.5,1.7,2.6,C.marble,tx,y+17,z-1,8);p.add(new T.SphereGeometry(1.75,12,8,0,Math.PI*2,0,Math.PI/2),C.copper,[tx,y+19.6,z-1],[0,0,0],[1,1.15,1]);cyl(s,.5,.55,1.2,C.marble,tx,y+21.5,z-1,8);cone(p,.65,1.5,C.copperDark,tx,y+22.7,z-1,8);p.add(new T.SphereGeometry(.16,8,6),C.gold,[tx,y+24.4,z-1]);}
 const top=drumDome(s,p,x,y+10.5,z-9,3.5,3.6,{wall:C.marble,trim:C.trim,dome:C.copper,finial:C.gold,glass:C.glass},{sides:8,stretch:1.1,low,cross:true});
 s.mesh(group,stone(),'cathedral-marble');p.mesh(group,vertexMaterial(.6),'cathedral-copper-roofs');group.userData={landmark:'Salzburg Cathedral',towers:2,domeTop:top};
}

/** The other towers of the old town: a Gothic spire, a baroque pair with a dome, and an onion tower. */
function churches(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='old-town-towers';root.add(group);const s=new Builder(.5),p=new Builder(),y=salzburg.quayTop;
 box(s,3,16,3,C.marble,50,y,-31);pyramid(p,.05,1.7,9,C.slate,50,y+16,-31);archedWindow(s,p,50,y+11.5,-29.48,.9,2.4,{frame:C.trim,glass:C.glass});
 for(const side of [-1,1]){box(s,2.6,14,2.6,C.white,36+side*3.4,y,-31);onion(p,1.25,C.copper,36+side*3.4,y+14,-31);}box(s,9,11,7,C.white,36,y,-33);drumDome(s,p,36,y+11,-33.5,2.6,2.6,{wall:C.white,trim:C.trim,dome:C.copper,finial:C.gold,glass:C.glass},{low});
 box(s,2.8,15,2.8,C.white,95,y,-31);cyl(s,1.5,1.6,2,C.white,95,y+15,-31,8);onion(p,1.55,C.copperDark,95,y+17,-31);windowGrid(s,p,95,y+2,-29.58,2.2,12,1,4,facade,true,low);
 box(s,2,10.5,2,pastel[0],104,y,-20);box(p,.9,.9,.06,C.white,104,y+8,-18.97);onion(p,.9,C.copper,104,y+10.5,-20);
 s.mesh(group,stone(),'old-town-tower-walls');p.mesh(group,vertexMaterial(.6),'old-town-tower-caps');group.userData={landmark:'Franciscan, Collegiate and St Peter towers'};
}

function fortress(root:T.Object3D,flag:T.Material,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='hohensalzburg-fortress';root.add(group);const cliff=new T.Group();cliff.name='monchsberg-cliff';root.add(cliff);const hill=new Builder(),rock=new Builder(.5),crag=new Builder(.5),s=new Builder(),p=new Builder(),x=salzburg.fortressX,top=salzburg.hillTop,z=-48;
 // The Festungsberg and, to the left, the Monchsberg cliff.
 hill.add(new T.SphereGeometry(1,low?12:20,low?8:12),C.forest,[x,-6,z],[0,0,0],[40,top+7,13],.1);for(let k=0;k<(low?6:12);k++)box(rock,5+r()*5,5+r()*6,3,C.rock,x-26+k*5,top-12+r()*4,z+9+r()*2,(r()-.5)*.4);
 box(crag,74,13,12,C.rock,-6,-4.4,-44);for(let k=0;k<(low?8:16);k++)box(crag,4+r()*3,6+r()*6,2+r()*2,C.rock,-42+k*4.6,-4.4+r()*3,-37.5,(r()-.5)*.3);
 // Pale grey conglomerate (the darker rock maps read almost black under the fortress).
 hill.mesh(group,vertexMaterial(.96),'festungsberg-wooded-hill');rock.mesh(group,texturedStone('paris-stone','#eef0e4',.6,.98),'festungsberg-crags');crag.mesh(cliff,texturedStone('paris-stone','#eef0e4',.6,.98),'monchsberg-rock-face');cliff.userData={feature:'Monchsberg cliff'};
 // Curtain walls, bastions and the long white keep under steep red roofs.
 box(s,34,3.4,1,C.white,x,top-1.4,z+5.4);for(let k=0;k<(low?17:34);k++)box(s,.5,.5,.3,C.white,x-16.5+k*(low?2:1),top+2,z+5.6);
 box(s,18,6.4,6,C.white,x+1,top,z);roof(p,18.4,3.4,6.6,C.red,x+1,top+6.4,z);windowGrid(s,p,x+1,top+.8,z+3.02,17,5,10,3,{wall:C.white,trim:C.trim,glass:C.glass,roof:C.red},false,low);
 box(s,6,9.5,6,C.white,x-9,top,z);pyramid(p,.3,3.5,3.4,C.red,x-9,top+9.5,z);box(s,5,5.4,5,C.white,x+13,top,z+1);roof(p,5.4,2.4,5.6,C.redDark,x+13,top+5.4,z+1,Math.PI/2);
 for(const [tx,tz,radius,h] of [[x-16,z+4.6,1.8,7],[x+17,z+4.4,1.6,6],[x-3,z+5.6,1.3,5],[x+8,z+5.8,1.2,5.2],[x-13,z-2,1.4,10]] as const){cyl(s,radius,radius*1.06,h,C.white,tx,top-1.4,tz,12);cone(p,radius*1.25,radius*1.9,C.red,tx,top-1.4+h,tz,12);}
 cyl(p,.06,.08,5,C.iron,x-9,top+12.9,z,5);s.mesh(group,vertexMaterial(.92),'fortress-white-walls');p.mesh(group,vertexMaterial(.75),'fortress-red-roofs');
 wavingFlag(group,flag,x-8.94,top+17,z,2.6,'austria-flag',.66);group.userData={landmark:'Hohensalzburg Fortress',hillTop:top};void finish;return group;
}

/** A small white river steamer on the Salzach. */
function steamer(root:T.Object3D){const b=new Builder();box(b,7,.7,1.8,C.white,0,0,0);box(b,7.2,.12,1.9,'#b33a34',0,.7,0);box(b,4.6,.9,1.5,C.white,-.4,.82,0);box(b,4.4,.5,1.54,C.glass,-.4,1,0);box(b,5,.08,1.7,C.white,-.4,1.72,0);cyl(b,.2,.24,.9,'#b33a34',1.2,1.8,0,8);for(let k=0;k<6;k++)box(b,.04,.4,.04,C.white,-2.6+k*.9,1.8,.8);
 const boat=b.mesh(root,vertexMaterial(.6),'salzach-river-steamer');boat.userData={animated:true};return boat;}

// Route furniture, in a platform's own coordinates, behind the walking lane.
/** A hanging wrought-iron shop sign with a gilded emblem. */
function shopSign(b:Builder,x:number,y:number,z:number,seed:number){cyl(b,.035,.045,2.6,C.iron,x,y,z,6);box(b,.8,.04,.04,C.iron,x+.4,y+2.45,z);b.add(new T.TorusGeometry(.18,.025,4,10,Math.PI),C.iron,[x+.3,y+2.45,z],[0,0,0]);
 b.add(seed%2?new T.TorusGeometry(.17,.045,5,12):new T.CylinderGeometry(.19,.19,.04,6),C.gold,[x+.62,y+2.1,z],[seed%2?0:Math.PI/2,0,0]);box(b,.02,.2,.02,C.iron,x+.62,y+2.26,z);}
const urn=(b:Builder,x:number,y:number,z:number,seed:number)=>pottedTree(b,x,y,z,.8,{pot:C.marble,trunk:'#5a4636',leaf:C.leaf,fruit:seed%2?'#e85a7a':'#f2d24a'},seed);

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'salzburg-cathedral-towers-and-dome','hohensalzburg-fortress','pastel-quay-houses','franciscan-spire-and-onion-towers','monchsberg-cliff','alpine-backdrop','mozart-statue-and-cafe-tables']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(61150),detail=new T.Group();detail.name='salzburg-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  const hill=fortress(detail,flagMaterial(bandedFlagTexture([['#c8102e',1],['#ffffff',1],['#c8102e',1]])),finish,r,low);quay(detail,finish,r,low);cathedral(detail,low);churches(detail,low);
  const alps=createHeightfield(detail,{name:'salzburg-alps',x:finish/2,y:-10,z:-150,width:finish+320,depth:64,segments:[low?40:90,low?14:28],height:ridgedRange(7310,{peaks:10,height:56,sharpness:1.5}),color:mountainColor({snowLine:30,treeLine:15,rock:'#8b8a86',forest:'#4f6d47',snow:'#f4f6f8'})});alps.userData.landmark='Alps';
  const firs:Placement[]=[],planes:Placement[]=[];for(let k=0;k<(low?22:48);k++){const a=r()*Math.PI,d=.55+r()*.4;firs.push({x:salzburg.fortressX+Math.cos(a)*36*d,y:-6+(salzburg.hillTop+7)*Math.sqrt(Math.max(0,1-d*d))*.92,z:-48+12*Math.sqrt(Math.max(0,1-d*d*Math.cos(a)**2))*.9,scale:.8+r()*.6,rotation:r()*6});}
  for(let k=0;k<(low?8:16);k++)planes.push({x:-40+r()*(finish+90),y:salzburg.quayTop,z:-17.6,scale:.55+r()*.2,rotation:r()*6});
  plantGrove(hill,'conifer',firs,{low,name:'festungsberg-firs'});
  // The hill, its firs and the fortress are set back together so the keep and its flag stay in view above the town.
  settle(hill,[salzburg.fortressX,-6,-48],.45,10,9);plantGrove(detail,'plane',planes,{low,name:'quay-plane-trees'});
  const boat=steamer(detail),doves=createFlock(detail,{name:'salzburg-doves',count:low?5:10,centre:[salzburg.cathedralX,14,-24],radius:[26,3,6],speed:.24,size:.65,color:'#f0efea',wing:'#c9ccd0',seed:9,glide:true});
  let reduced=context.reducedMotion;const sail=(time:number)=>{const lap=finish+110;boat.position.set(-50+(time*.8)%lap,-2.5+Math.sin(time)*.03,-10);};sail(0);doves.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;sail(time);doves.update(time);},setReducedMotion(value){reduced=value;doves.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.8)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*17+Math.round(definition.x),y=surface(0);
  if(t==='rooftop'){chimneyStack(b,w/2-.9,surface(w/2-.9),rear,2+seed%2,{brick:'#93523f',cap:'#6d3a2c',pot:'#d8b08a'});flowerBox(b,-w/2+.3,w/2-1.6,y,rear+.12,C.wood,['#d32f3a','#f2d24a','#e85a7a']);if(w>3.6)dormer(b,-w/2+1.1,surface(-w/2+1.1),rear-.05,C.marble,C.glass,C.slate);}
  else if(t==='ground'){lampPost(b,glow,-w/2+.5,y,-1.3);shopSign(b,w/2-.6,y,rear,seed);if(seed%2)statue(b,-w/2+1.7,y,-2.2,2.1,{pedestal:C.marble,figure:C.bronze});else fountain(b,-w/2+2,y,-2.1,.9,{stone:C.marble,water:C.water});cafeTable(b,w/2-1.9,y,-1.85,{metal:C.iron,top:C.white,parasol:'#c8102e',parasolAlt:C.white});if(w>8)cafeTable(b,1,y,-2.2,{metal:C.iron,top:C.white,parasol:'#e7b23c',parasolAlt:C.white});}
  else if(t==='terrace'){balustrade(b,-w/2+.25,w/2-.25,y,rear,{rail:C.trim,base:'#d8d0be',baluster:C.marble});urn(b,(seed%2?1:-1)*(w/2-.9),y,-1.7,seed);if(w>5)bench(b,(seed%2?-1:1)*(w/2-1.5),y,-1.8);}
  else if(t==='cliff'||t==='stairs'){const from=-w/2+.25,to=w/2-.25;railing(b,from,to,Math.min(surface(from),surface(to)),rear);if(t==='cliff'&&w>5)bench(b,0,y,-1.8);}
  finishProps(root,b,glow,'salzburg-squares-and-roofs');
 },
};
