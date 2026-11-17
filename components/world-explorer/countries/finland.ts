import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl,roof} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,bench,chimneyStack,finishProps,flagMaterial,lampPost,railing,texturedStone,wavingFlag,windowGrid} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Finland: the sea fortress of Suomenlinna (SRS-632.19). Smooth granite
 * skerries edge the island. Behind them run grass-topped ramparts of grey
 * granite with pointed bastions and cannon in their embrasures; the King's
 * Gate opens on broad steps down to the water; the garrison church lifts
 * its dome, whose lantern is a lighthouse; the long pink barracks stand by
 * the jetty, with red wooden houses, birches and pines beyond, and an old
 * submarine rests on the shore. The white island ferry crosses under the
 * blue-cross flag, and Helsinki's cathedral shows on the horizon. The route
 * carries cannon, shot, bollards, lilacs and benches. Scenery only. */
const C={granite:'#d9cfc8',graniteDark:'#bfb5ae',skerry:'#c9b3aa',grass:'#7a9f5a',grassDark:'#688e4e',pink:'#e3a8a0',ochre:'#e3c27a',white:'#f7f5ee',trim:'#fbf9f2',falu:'#9c3a2c',roof:'#4a5a52',roofRed:'#8f4a38',glass:'#27343f',
 copper:'#5f8f7c',gold:'#d6a938',iron:'#22262a',wood:'#7a5c40',rope:'#c9b88a',leaf:'#4a7d3f',lilac:'#a98fd6',hull:'#f6f4ec',stripe:'#2f7f5f',sub:'#4a5258',beacon:'#fff2b0'} as const;
// The island, its ramparts and its buildings are built here on a level shore.
const base=europeEnvironment('FIN',{landmark:false,flat:true,town:false});
export const suomenlinna={shoreTop:-1,gateX:62,churchX:104,barracksX:22,submarineX:138,rampart:[36,128]} as const;
const granite=()=>texturedStone('paris-stone','#eef0f6',1,.95);

function island(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='suomenlinna-island-shore';root.add(group);const s=new Builder(),top=suomenlinna.shoreTop,from=-56,to=finish+100;
 box(s,to-from,top+4.4,68,C.grass,(from+to)/2,-4.4,-52.5);
 // Rounded granite skerries, polished by the ice, along the waterline.
 for(let k=0;k<(low?24:50);k++){const x=from+k*(to-from)/(low?24:50)+r()*2;if(Math.abs(x-suomenlinna.gateX)<5)continue;s.add(new T.SphereGeometry(1,8,6),k%3?C.skerry:C.graniteDark,[x,-2.5+r()*.6,-17.4+r()*1.4],[0,r()*3,0],[2.4+r()*2,1.4+r()*.7,1.6+r()]);}
 s.mesh(group,vertexMaterial(.9),'island-grass-and-granite-skerries');group.userData={feature:'Granite shore'};
}

function ramparts(root:T.Object3D,flag:T.Material,low:boolean){
 const group=new T.Group();group.name='bastion-ramparts';root.add(group);const s=new Builder(.5),p=new Builder(),y=suomenlinna.shoreTop,z=-25,[from,to]=suomenlinna.rampart,h=3.8;
 // Curtain walls between pointed bastions, turfed on top, with cannon in the embrasures.
 for(const [a,b] of [[from,suomenlinna.gateX-6],[suomenlinna.gateX+6,to]] as const){box(s,b-a,h,4,C.granite,(a+b)/2,y,z-2);box(p,b-a,.5,4.2,C.grass,(a+b)/2,y+h,z-2);for(let x=a+3;x<b-2;x+=low?12:6){box(p,1.1,.9,.3,'#2c2c2e',x,y+2.2,z+.02);p.strut(new T.Vector3(x,y+2.6,z-.6),new T.Vector3(x,y+2.75,z+1),.16,C.iron,8,.7);}}
 for(const bx of [from,from+30,to-28,to]){s.add(new T.CylinderGeometry(5,6,h,5,1),C.granite,[bx,y+h/2,z+.6],[0,Math.PI/5,0]);p.add(new T.CylinderGeometry(4.4,4.9,.5,5,1),C.grass,[bx,y+h+.25,z+.6],[0,Math.PI/5,0]);}
 cyl(p,.06,.09,6,C.white,to-28,y+h+.5,z+.6,6);s.mesh(group,granite(),'granite-curtain-walls-and-bastions');p.mesh(group,vertexMaterial(.9),'turf-tops-embrasures-and-cannon');wavingFlag(group,flag,to-27.94,y+h+5.7,z+.6,2.6,'finland-flag',.62);group.userData={landmark:'Bastions of Suomenlinna',bastions:4};
}

function kingsGate(root:T.Object3D){
 const group=new T.Group();group.name='kings-gate';root.add(group);const s=new Builder(.5),p=new Builder(),x=suomenlinna.gateX,y=suomenlinna.shoreTop,z=-20;
 box(s,10,5.6,2.4,C.granite,x,y,z-1.2);for(const side of [-1,1]){box(s,2.2,6.8,2.8,C.granite,x+side*3.9,y,z-1.2);box(s,2.6,.3,3.2,C.graniteDark,x+side*3.9,y+6.8,z-1.2);for(let k=0;k<3;k++)box(s,.5,.6,3,C.granite,x+side*3.9-1+k,y+7.1,z-1.2);}
 archedWindow(s,p,x,y,z+.02,2.6,4,{frame:C.graniteDark,glass:'#2a2622'});box(s,5,.3,2.8,C.graniteDark,x,y+5.6,z-1.2);box(p,2.4,.6,.08,C.white,x,y+4.5,z+.04);for(const side of [-1,1])box(p,.9,1.4,.08,C.white,x+side*3.9,y+3,z+.24);
 // Broad steps lead down from the gate to the landing.
 for(let k=0;k<6;k++)box(s,9-k*.3,.26,.6,k%2?C.granite:C.graniteDark,x,y-.26-k*.26,z+.3+k*.6);box(s,10,.3,2,C.graniteDark,x,y-1.8,z+4.6);for(const side of [-1,1])cyl(p,.16,.2,.6,C.iron,x+side*4.4,y-1.5,z+5,8);
 s.mesh(group,granite(),'kings-gate-granite-and-steps');p.mesh(group,vertexMaterial(.8),'kings-gate-archway-and-tablets');group.userData={landmark:"King's Gate"};
}

function church(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='suomenlinna-church';root.add(group);const s=new Builder(),p=new Builder(),x=suomenlinna.churchX,y=suomenlinna.shoreTop,z=-40;
 box(s,22,2.4,16,C.grass,x,y,z-2);
 // A cross-shaped church; the lantern on its dome is a working lighthouse.
 const cy=y+2.4;box(s,7,5.4,13,C.white,x,cy,z-2);box(s,13,5.4,7,C.white,x,cy,z-2);archedWindow(s,p,x,cy+.2,z+4.52,1.4,3,{frame:C.trim,glass:'#3a2a20'});for(const dx of [-4.6,4.6])archedWindow(s,p,x+dx,cy+1.2,z+1.52,.9,2.6,{frame:C.trim,glass:C.glass});
 box(p,7.3,.4,13.3,C.roof,x,cy+5.4,z-2);box(p,13.3,.4,7.3,C.roof,x,cy+5.4,z-2);cyl(s,3,3.1,2.2,C.white,x,cy+5.6,z-2,low?10:16);for(let k=0;k<8;k++){const a=k/8*Math.PI*2;p.add(new T.BoxGeometry(.5,1.2,.08),C.glass,[x+Math.sin(a)*3.06,cy+6.7,z-2+Math.cos(a)*3.06],[0,a,0]);}
 p.add(new T.SphereGeometry(3.2,low?10:16,8,0,Math.PI*2,0,Math.PI/2),C.copper,[x,cy+7.8,z-2],[0,0,0],[1,.8,1]);cyl(s,.8,.9,1.1,C.white,x,cy+10.2,z-2,8);cone(p,1,.9,C.copper,x,cy+12.1,z-2,8);
 s.mesh(group,vertexMaterial(.94),'church-white-walls-and-mound');p.mesh(group,vertexMaterial(.6),'church-dome-and-roofs');
 const lamp=new T.Mesh(new T.CylinderGeometry(.62,.62,.8,10),new T.MeshStandardMaterial({color:C.beacon,emissive:new T.Color('#ffd76a'),emissiveIntensity:1.4,roughness:.4}));lamp.name='lighthouse-lantern';lamp.position.set(x,cy+11.7,z-2);lamp.castShadow=false;group.add(lamp);group.userData={landmark:'Suomenlinna Church',lighthouse:true};return lamp;
}

function buildings(root:T.Object3D,r:()=>number,low:boolean){
 const group=new T.Group();group.name='barracks-and-red-houses';root.add(group);const s=new Builder(),p=new Builder(),y=suomenlinna.shoreTop,bx=suomenlinna.barracksX;
 // The long pink barracks by the jetty, with its arched gateway and clock gable.
 box(s,24,5,6,C.pink,bx,y,-25);windowGrid(s,p,bx-7,y+.5,-21.98,9,4,low?4:6,2,{wall:C.pink,trim:C.trim,glass:C.glass,roof:C.roof},false,low);windowGrid(s,p,bx+7,y+.5,-21.98,9,4,low?4:6,2,{wall:C.pink,trim:C.trim,glass:C.glass,roof:C.roof},false,low);roof(p,24.4,2,6.4,C.roof,bx,y+5,-25);
 box(s,4.4,6.4,1,C.pink,bx,y,-21.7);archedWindow(s,p,bx,y,-21.18,2.4,3.6,{frame:C.trim,glass:'#33261e'});s.add(new T.CylinderGeometry(.02,2.4,1.4,3,1),C.pink,[bx,y+7.1,-21.5],[0,-Math.PI/2,0],[.2,1,1]);p.add(new T.CylinderGeometry(.6,.6,.06,16),C.white,[bx,y+5.2,-21.16],[Math.PI/2,0,0]);
 box(s,10,4,5,C.ochre,bx+22,y,-30);windowGrid(s,p,bx+22,y+.4,-27.48,9,3.2,low?3:5,2,{wall:C.ochre,trim:C.trim,glass:C.glass,roof:C.roof},false,low);roof(p,10.4,1.8,5.4,C.roofRed,bx+22,y+4,-30);
 // Red wooden houses with white corner boards.
 for(let k=0;k<(low?4:7);k++){const hx=suomenlinna.rampart[1]+8+k*5.4+r(),hz=-24-(k%3)*4,w=3.6+r(),h=2.6+r()*.6;if(Math.abs(hx-suomenlinna.submarineX)<1)continue;box(s,w,h,3.4,C.falu,hx,y,hz-1.7);for(const side of [-1,1])box(p,.14,h,.08,C.white,hx+side*(w/2-.07),y,hz+.04);box(p,w,.12,.08,C.white,hx,y+h-.12,hz+.04);for(const dx of [-.8,.8]){box(p,.7,.8,.08,C.white,hx+dx,y+1,hz+.04);box(p,.5,.6,.1,C.glass,hx+dx,y+1.1,hz+.05);}roof(p,w+.3,1.3,3.8,'#3a3d40',hx,y+h,hz-1.7);}
 s.mesh(group,vertexMaterial(.93),'pink-barracks-and-red-timber-walls');p.mesh(group,vertexMaterial(.7),'barracks-roofs-windows-and-trim');group.userData={feature:'Jetty Barracks and red wooden houses'};
}

function submarine(root:T.Object3D){
 const group=new T.Group();group.name='submarine-vesikko';root.add(group);const b=new Builder(),x=suomenlinna.submarineX,y=suomenlinna.shoreTop,z=-19.6;
 b.add(new T.SphereGeometry(1,14,8),C.sub,[x,y+1.5,z],[0,0,0],[5.6,.95,.95]);box(b,2,1,.7,C.sub,x-.4,y+2.2,z);cyl(b,.05,.05,1.2,C.iron,x-.2,y+3.2,z,5);for(const dx of [-3,0,3])box(b,.5,.7,2,C.wood,x+dx,y,z);box(b,.1,.9,1.1,C.sub,x-5.2,y+1.2,z);box(b,10.4,.06,.5,'#8f3a2c',x,y+.86,z+.9);
 b.mesh(group,vertexMaterial(.6,{metalness:.2}),'submarine-hull-and-cradle');group.userData={landmark:'Submarine Vesikko'};
}

function helsinki(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='helsinki-skyline';root.add(group);const b=new Builder(),x=-10,z=-118,y=-2;
 box(b,90,2,6,'#8f9f8a',x+10,y,z);box(b,12,8,10,C.white,x,y+2,z);b.add(new T.SphereGeometry(4,low?10:14,8,0,Math.PI*2,0,Math.PI/2),C.copper,[x,y+12.4,z],[0,0,0],[1,1.1,1]);cyl(b,3.6,3.8,2.6,C.white,x,y+10,z,low?10:14);for(const [dx,dz] of [[-5,-4],[5,-4],[-5,4],[5,4]] as const){cyl(b,1.2,1.3,1.6,C.white,x+dx,y+10,z+dz,8);b.add(new T.SphereGeometry(1.4,8,6,0,Math.PI*2,0,Math.PI/2),C.copper,[x+dx,y+11.6,z+dz]);}
 for(let k=0;k<(low?6:12);k++)box(b,5+(k%3)*2,3+(k%4)*1.4,5,k%2?'#e6d9c0':'#d9c9b8',x-34+k*7.4+(k>4?12:0),y+2,z);b.mesh(group,vertexMaterial(.9),'helsinki-cathedral-and-waterfront');group.userData={feature:'Helsinki on the horizon'};
}

/** White with a blue Nordic cross. */
const finnishFlag=()=>pixelTexture(64,(u,v)=>(u>.28&&u<.44)||(v>.36&&v<.64)?[0,47,108,255]:[255,255,255,255],true,false);

function ferry(root:T.Object3D,flag:T.Material){const group=new T.Group();group.name='suomenlinna-ferry';root.add(group);const b=new Builder();box(b,10,1,2.8,C.hull,0,0,0);box(b,10.2,.2,2.9,C.stripe,0,.36,0);box(b,7.4,1.1,2.4,C.hull,0,1,0);box(b,7.2,.5,2.44,C.glass,0,1.4,0);box(b,7.8,.1,2.6,C.hull,0,2.1,0);box(b,2.4,.8,1.8,C.hull,0,2.2,0);box(b,2.2,.3,1.84,C.glass,0,2.5,0);cyl(b,.26,.3,.9,'#e8c23a',-1.6,2.2,0,8);cyl(b,.04,.05,1.5,C.iron,4.6,1,0,5);b.mesh(group,vertexMaterial(.55),'ferry-hull-and-decks');wavingFlag(group,flag,4.66,2.2,0,.9,'ferry-flag',.62);group.userData={animated:true};return group;}

// Route furniture, in a platform's own coordinates, behind the walking lane.
function cannon(b:Builder,x:number,y:number,z:number){box(b,1.1,.3,.6,C.wood,x,y+.18,z);for(const dx of [-.36,.36])for(const dz of [-.34,.34])b.add(new T.CylinderGeometry(.2,.2,.08,10),C.wood,[x+dx,y+.2,z+dz],[Math.PI/2,0,0]);b.strut(new T.Vector3(x-.6,y+.6,z),new T.Vector3(x+.9,y+.78,z),.15,C.iron,8,.7);}
function shot(b:Builder,x:number,y:number,z:number){for(const [dx,dz,dy] of [[-.13,-.08,0],[.13,-.08,0],[0,.14,0],[0,0,.2]] as const)b.add(new T.SphereGeometry(.13,7,5),C.iron,[x+dx,y+.13+dy,z+dz]);}
function lilac(b:Builder,x:number,y:number,z:number){b.add(new T.SphereGeometry(.55,7,5),C.leaf,[x,y+.5,z],[0,0,0],[1,.9,.8]);for(const [dx,dy] of [[-.3,.7],[.1,.92],[.34,.6],[-.05,.5]] as const)b.add(new T.ConeGeometry(.12,.34,6),C.lilac,[x+dx,y+dy,z+.3]);}
function bollardRope(b:Builder,from:number,to:number,y:number,z:number){for(let x=from;x<=to+.01;x+=1.2){cyl(b,.1,.13,.6,C.iron,x,y,z,8);b.add(new T.SphereGeometry(.13,6,5),C.iron,[x,y+.64,z]);if(x+1.2<=to+.01)b.strut(new T.Vector3(x,y+.5,z),new T.Vector3(x+1.2,y+.5,z),.03,C.rope,4,1);}}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'granite-ramparts-and-bastions','kings-gate-and-water-steps','church-dome-lighthouse','pink-jetty-barracks','red-wooden-houses','submarine-on-the-shore','island-ferry-and-flag','helsinki-cathedral-horizon','cannon-shot-and-lilacs']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(35806),detail=new T.Group();detail.name='suomenlinna-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);const flag=flagMaterial(finnishFlag());
  island(detail,finish,r,low);ramparts(detail,flag,low);kingsGate(detail);const lamp=church(detail,low);buildings(detail,r,low);submarine(detail);helsinki(detail,low);
  const birches:Placement[]=[],pines:Placement[]=[];for(let k=0;k<(low?12:26);k++)birches.push({x:-50+r()*(finish+150),y:suomenlinna.shoreTop,z:-30-r()*8,scale:.7+r()*.4,rotation:r()*6});for(let k=0;k<(low?14:30);k++)pines.push({x:-50+r()*(finish+150),y:suomenlinna.shoreTop,z:-48-r()*20,scale:1+r()*.7,rotation:r()*6});
  plantGrove(detail,'birch',birches.filter(t=>Math.abs(t.x-suomenlinna.churchX)>12&&Math.abs(t.x-suomenlinna.barracksX)>13),{low,name:'island-birches'});plantGrove(detail,'conifer',pines.filter(t=>Math.abs(t.x-suomenlinna.churchX)>12),{low,name:'island-pines'});
  const boat=ferry(detail,flag),gulls=createFlock(detail,{name:'baltic-gulls',count:low?5:10,centre:[finish*.5,7,-10],radius:[32,3,6],speed:.2,size:.8,color:'#f2f2ee',wing:'#c9ccd0',seed:107,glide:true});
  let reduced=context.reducedMotion;const move=(time:number)=>{const lap=finish+130;boat.position.set(finish+70-(time*.9)%lap,-2.5+Math.sin(time*.8)*.03,-9);};move(0);gulls.root.visible=!reduced;const glow=lamp.material as T.MeshStandardMaterial;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;move(time);gulls.update(time);glow.emissiveIntensity=(time%4)<2.6?1.4:.15;},setReducedMotion(value){reduced=value;gulls.root.visible=!value;if(value)glow.emissiveIntensity=1.4;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.6)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*71+Math.round(definition.x),from=-w/2+.3,to=w/2-.3,y=surface(0);
  if(t==='bridge'){bollardRope(b,from,to,y,rear);lampPost(b,glow,from+.4,surface(from+.4),rear+.3);if(w>5)bench(b,to-1.3,surface(to-1.3),rear+.25);}
  else if(t==='ground'){cannon(b,from+1,surface(from+1),-1.6);shot(b,from+2.2,surface(from+2.2),-1.4);lilac(b,to-.8,surface(to-.8),-1.7);if(w>5.4)bench(b,.4,y,-1.9);if(w>8){lampPost(b,glow,to-2.2,surface(to-2.2),-1.3);cannon(b,-1.6,y,-1.6);}}
  else if(t==='rooftop'){if(seed%2)cannon(b,from+1,surface(from+1),rear+.15);else chimneyStack(b,from+.7,surface(from+.7),rear,2,{brick:C.roofRed,cap:'#6d3a2c',pot:'#8f8f8a'});if(w>4)shot(b,to-.6,surface(to-.6),rear+.25);}
  else if(t==='rock'){b.add(new T.SphereGeometry(.34,7,5),C.leaf,[0,surface(0)+.16,rear+.3],[0,0,0],[1.4,.6,1]);if(w>3.2){b.add(new T.TorusGeometry(.18,.04,5,10),C.iron,[from+.3,surface(from+.3)+.2,rear+.2]);}}
  else if(t==='stairs'){railing(b,from,to,Math.min(surface(from),surface(to)),rear,C.iron,C.gold);}
  finishProps(root,b,glow,'suomenlinna-cannon-and-quays');
 },
};
