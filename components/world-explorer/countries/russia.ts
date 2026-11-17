import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl,onion,roof} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {FACES,REAR,archedWindow,balustrade,bandedFlagTexture,chimneyStack,column,dormer,drumDome,finishProps,flagMaterial,lampPost,place,pyramid,railing,settle,texturedStone,townhouse,wavingFlag,windowGrid} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Russia: Saint Petersburg on its canals (SRS-632.8). Along the far granite
 * embankment stand the Peter and Paul Fortress with its bastions and the
 * cathedral's needle of a golden spire; the long green-and-white baroque
 * front of the Winter Palace with its columns and roof statues; the Church
 * of the Savior on Spilled Blood with its patterned onion domes; the gilded
 * dome and colonnades of St Isaac's; the Admiralty's golden spire; and the
 * red Rostral Columns. Side canals run back between the houses under humpbacked bridges with
 * lamps, and a canal boat passes. The route carries granite sphinxes, ornate lamps, iron
 * railings and rows of nesting dolls. Scenery only: nothing collides. */
const C={granite:'#e4dedc',graniteDark:'#c9c1be',rose:'#d9a090',brickWall:'#f0d8cc',mint:'#8fc7b0',ochre:'#e6c56a',white:'#f6f4ee',trim:'#fbf9f2',gold:'#dba830',goldBright:'#f0c24a',glass:'#27343f',tin:'#5f8f7c',tinDark:'#4a7262',
 brick:'#a8523c',iron:'#22262a',red:'#b53a2e',blue:'#2f5fa8',teal:'#2f8f8a',green:'#3f8f4f',yellow:'#e8c23a',bronze:'#6f7a6a',wood:'#7a5c40'} as const;
// Saint Petersburg stands on the flat Neva delta: no mountain range behind it.
const base=europeEnvironment('RUS',{landmark:false,backdrop:false});
export const petersburg={quayTop:-1,fortressX:14,palaceX:58,saviorX:92,isaacX:120} as const;
// Grey Finnish granite: a pale block map with a cool tint (the darker maps read brown).
const granite=()=>texturedStone('paris-stone','#e8eeff',.9,.95);
const stucco=()=>vertexMaterial(.9),gilding=()=>vertexMaterial(.32,{metalness:.55,emissive:new T.Color('#5a3d05'),emissiveIntensity:.35});

function embankment(root:T.Object3D,finish:number,low:boolean){
 const group=new T.Group();group.name='granite-embankment';root.add(group);const s=new Builder(.5),p=new Builder(),top=petersburg.quayTop,from=-48,to=finish+70;
 box(s,to-from,top+4.4,62,C.granite,(from+to)/2,-4.4,-47.5);box(s,to-from,.4,.6,C.graniteDark,(from+to)/2,top,-16.7);
 for(let x=from+2;x<to;x+=low?6:3){box(s,.5,1,.5,C.granite,x,top+.4,-16.7);if(!low)p.add(new T.TorusGeometry(.14,.03,4,8),C.iron,[x,-1.5,-16.48]);}
 for(let x=from+2;x<to-3;x+=low?6:3){box(p,(low?6:3)-.5,.05,.05,C.iron,x+(low?3:1.5),top+1.25,-16.7);for(let k=1;k<(low?6:8);k++)box(p,.03,.8,.03,C.iron,x+k*(low?1:.375),top+.45,-16.7);}
 s.mesh(group,granite(),'neva-granite-quay');p.mesh(group,vertexMaterial(.6),'quay-iron-railings');group.userData={feature:'Granite embankment and railings'};
}

function fortress(root:T.Object3D,flag:T.Material,low:boolean){
 const group=new T.Group();group.name='peter-and-paul-fortress';root.add(group);const s=new Builder(.5),c=new Builder(),p=new Builder(),g=new Builder(),x=petersburg.fortressX,y=petersburg.quayTop,z=-26;
 // Low angled granite bastions with sentry turrets at the points.
 box(s,34,3.6,3,C.granite,x,y,z+6);for(const dx of [-17,0,17]){s.add(new T.CylinderGeometry(3.4,4.2,3.6,5,1),C.granite,[x+dx,y+1.8,z+6.6],[0,Math.PI/5,0]);cyl(s,.5,.55,1.3,C.granite,x+dx,y+3.6,z+9.4,8);cone(p,.62,.8,C.tinDark,x+dx,y+4.9,z+9.4,8);}
 // The cathedral: an ochre nave, the tiered bell tower and the golden needle with its angel.
 box(c,7,7,16,C.ochre,x,y,z-6);roof(p,7.4,2.6,16.4,C.tin,x,y+7,z-6,Math.PI/2);windowGrid(c,p,x,y+1,z+2.02,6,5.4,3,2,{wall:C.ochre,trim:C.white,glass:C.glass,roof:C.tin},true,low);
 let level=y;for(const [w,h] of [[5,8],[4,5],[3,4.2]] as const){box(c,w,h,w,C.ochre,x,level,z+3);box(c,w+.3,.28,w+.3,C.white,x,level+h-.14,z+3);for(const [turn,dx,dz] of FACES){const face=new Builder(),glass=new Builder();archedWindow(face,glass,0,h*.22,.02,w*.3,h*.42,{frame:C.white,glass:C.glass});for(const side of [-1,1])box(face,.24,h-.4,.12,C.white,side*(w/2-.2),0,.06);place(c,face.geometry(),x+dx*w/2,level,z+3+dz*w/2,turn);place(p,glass.geometry(),x+dx*w/2,level,z+3+dz*w/2,turn);}level+=h;}
 g.add(new T.SphereGeometry(1.3,12,8,0,Math.PI*2,0,Math.PI/2),C.gold,[x,level,z+3],[0,0,0],[1,1.1,1]);cyl(g,.5,.6,1.4,C.gold,x,level+1.3,z+3,8);g.add(new T.ConeGeometry(.5,13.5,8),C.goldBright,[x,level+2.7+6.75,z+3]);g.add(new T.SphereGeometry(.22,8,6),C.goldBright,[x,level+16.4,z+3]);box(g,.5,.1,.06,C.goldBright,x,level+16.9,z+3);box(g,.07,.6,.06,C.goldBright,x,level+16.6,z+3);
 drumDome(c,g,x,y+7.6,z-11,1.6,1.6,{wall:C.ochre,trim:C.white,dome:C.gold,finial:C.goldBright,glass:C.glass},{low,cross:true});
 cyl(p,.05,.07,5,C.iron,x+15,y+3.6,z+6,5);s.mesh(group,granite(),'fortress-granite-bastions');c.mesh(group,stucco(),'fortress-cathedral-walls');p.mesh(group,vertexMaterial(.7),'fortress-roofs-and-windows');g.mesh(group,gilding(),'fortress-golden-spire');
 wavingFlag(group,flag,x+15.06,y+7.7,z+6,2.6,'russia-flag',.66);group.userData={landmark:'Peter and Paul Fortress',spireTop:level+17};settle(group,[x,y,z],.55,26);
}

function winterPalace(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='winter-palace';root.add(group);const s=new Builder(),p=new Builder(),g=new Builder(),x=petersburg.palaceX,y=petersburg.quayTop,z=-20,w=38,h=9.4;
 box(s,w,h,9,C.mint,x,y,z-4.5);box(s,w+.3,.5,9.3,C.white,x,y,z-4.5);box(s,w+.3,.34,9.3,C.white,x,y+3.3,z-4.5);box(s,w+.4,.5,9.4,C.white,x,y+h-.25,z-4.5);box(p,w,.3,9,C.tinDark,x,y+h+.25,z-4.5);
 // Two tiers of white columns between tall windows, with gilded capitals and window crowns.
 const bays=low?13:26,step=w/bays;for(let k=0;k<=bays;k++){const cx=x-w/2+k*step;if(k%2===0||!low){column(s,cx,y+.5,z+.22,.16,2.7,C.white,8);column(s,cx,y+3.64,z+.22,.15,5.3,C.white,8);g.add(new T.CylinderGeometry(.24,.17,.2,8),C.gold,[cx,y+8.7,z+.22]);}
  if(k<bays){box(p,step*.46,1.7,.07,C.glass,cx+step/2,y+1,z+.03);box(p,step*.46,2.6,.07,C.glass,cx+step/2,y+4.3,z+.03);box(p,step*.4,.9,.07,C.glass,cx+step/2,y+7.4,z+.03);g.add(new T.SphereGeometry(.2,8,5),C.gold,[cx+step/2,y+7.05,z+.08],[0,0,0],[1.3,.6,.4]);}}
 // Statues and urns stand along the roofline; the centre and ends step forward.
 for(let k=0;k<(low?12:24);k++){const sx=x-w/2+.8+k*(w-1.6)/(low?11:23);if(k%2){cyl(p,.12,.16,.9,C.bronze,sx,y+h+.25,z-.3,6);p.add(new T.SphereGeometry(.12,6,5),C.bronze,[sx,y+h+1.3,z-.3]);}else{cyl(p,.2,.1,.5,C.bronze,sx,y+h+.25,z-.3,8);}}
 for(const dx of [-w/2+3,0,w/2-3]){box(s,6,h+.5,1.2,C.mint,x+dx,y,z+.4);for(const cx of [-2.4,-.8,.8,2.4]){column(s,x+dx+cx,y+.5,z+1.15,.2,2.7,C.white,8);column(s,x+dx+cx,y+3.64,z+1.15,.19,5.6,C.white,8);}s.add(new T.CylinderGeometry(.02,3.1,1.5,3,1),C.mint,[x+dx,y+h+1.25,z+1],[0,-Math.PI/2,0],[.2,1,1]);}
 s.mesh(group,stucco(),'winter-palace-mint-walls-and-columns');p.mesh(group,vertexMaterial(.7),'winter-palace-windows-and-statues');g.mesh(group,gilding(),'winter-palace-gilding');group.userData={landmark:'Winter Palace',style:'Baroque',bays};
}

/** Striped, swirled and chequered onion domes, drawn procedurally. */
function domeTexture(pattern:number,a:string,b:string,c:string){const ca=new T.Color(a),cb=new T.Color(b),cc=new T.Color(c);
 return pixelTexture(48,(u,v)=>{const band=pattern===0?Math.floor((u*10+v*3)%3):pattern===1?(Math.floor(u*12)+Math.floor(v*8))%3:Math.floor((u*8-v*5+10)%3);const col=band===0?ca:band===1?cb:cc;return[col.r*255,col.g*255,col.b*255,255];},true,true);}
function saviorOnBlood(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='savior-on-spilled-blood';root.add(group);const s=new Builder(.5),p=new Builder(),g=new Builder(),x=petersburg.saviorX,y=petersburg.quayTop,z=-24;
 box(s,9,9,9,C.brickWall,x,y,z-4.5);for(const level of [3,6,8.8])box(s,9.3,.26,9.3,C.white,x,y+level,z-4.5);
 for(const offset of [-2.8,0,2.8]){archedWindow(s,p,x+offset,y+.8,z+.02,1.2,1.7,{frame:C.white,glass:C.glass});archedWindow(s,p,x+offset,y+4,z+.02,1,1.6,{frame:C.white,glass:C.glass});s.add(new T.ConeGeometry(.9,1.1,4),C.white,[x+offset,y+9.55,z-.1],[0,Math.PI/4,0],[1,1,.2]);}
 box(s,3,5.4,2.4,C.brickWall,x+5.6,y,z-2);pyramid(p,.1,1.8,3.4,C.teal,x+5.6,y+5.4,z-2);
 // Nine domes: the tall tent tower, four patterned onions round it and gilded ones on the porches and belfry.
 cyl(s,1.9,2,5,C.brickWall,x,y+9,z-4.5,8);cone(p,2.1,7.5,C.teal,x,y+14,z-4.5,8);
 const patterns:[number,string,string,string][]=[[0,'#2f5fa8','#f2f0e8','#e8c23a'],[1,'#3f8f4f','#e8c23a','#2f5fa8'],[2,'#b53a2e','#f2f0e8','#2f8f8a'],[0,'#2f8f8a','#e8c23a','#f2f0e8']];
 const spots:[number,number][]=[[-2.9,-1.6],[2.9,-1.6],[-2.9,-7.4],[2.9,-7.4]];
 spots.forEach(([dx,dz],index)=>{cyl(s,.9,1,3.2,C.brickWall,x+dx,y+9,z+dz,8);const dome=new T.Mesh(new T.SphereGeometry(1.35,low?12:18,low?8:12),new T.MeshStandardMaterial({map:domeTexture(...patterns[index]),roughness:.45,metalness:.1}));dome.name='patterned-onion-dome';dome.scale.set(1,1.25,1);dome.position.set(x+dx,y+13.4,z+dz);group.add(dome);const tip=new Builder();tip.add(new T.ConeGeometry(.55,1.5,10),C.goldBright,[x+dx,y+15.6,z+dz]);box(tip,.06,.9,.06,C.goldBright,x+dx,y+16.3,z+dz);box(tip,.42,.06,.06,C.goldBright,x+dx,y+16.85,z+dz);g.parts.push(...tip.parts);});
 for(const [dx,dz,h] of [[0,-4.5,21.5],[5.6,-2,8.8],[-4.2,.6,9.4]] as const){onion(g,dx?.75:.85,C.gold,x+dx,y+h,z+dz);box(g,.06,.9,.06,C.goldBright,x+dx,y+h+(dx?1.7:1.9),z+dz);}
 s.mesh(group,texturedStone('sandstone-blocks','#d98a70',2.2,.94),'savior-brick-walls');p.mesh(group,vertexMaterial(.6),'savior-tent-roofs');g.mesh(group,gilding(),'savior-gilded-domes');group.userData={landmark:'Church of the Savior on Spilled Blood',patternedDomes:spots.length};settle(group,[x,y,z],.66,18);
}

function isaacAndAdmiralty(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='st-isaacs-cathedral';root.add(group);const s=new Builder(.5),w=new Builder(),p=new Builder(),g=new Builder(),x=petersburg.isaacX,y=petersburg.quayTop,z=-26;
 box(s,14,9,14,C.graniteDark,x,y,z-7);box(s,14.4,.5,14.4,C.granite,x,y+8.75,z-7);for(let k=0;k<8;k++)column(s,x-4.9+k*1.4,y+.6,z+1,.32,6.6,C.rose,low?8:12);box(s,12,1,2.4,C.graniteDark,x,y+7.3,z+.6);s.add(new T.CylinderGeometry(.02,6,2.4,3,1),C.graniteDark,[x,y+9.5,z+.6],[0,-Math.PI/2,0],[.3,1,1]);box(s,12.4,.6,2.6,C.granite,x,y,z+.7);
 // The colonnaded drum and the great gilded dome.
 cyl(s,4.1,4.2,4.6,C.graniteDark,x,y+9,z-7,low?12:24);for(let k=0;k<(low?12:24);k++){const a=k/(low?12:24)*Math.PI*2;column(s,x+Math.sin(a)*4.5,y+9.2,z-7+Math.cos(a)*4.5,.2,4.2,C.granite,6);}cyl(s,4.9,4.9,.4,C.granite,x,y+13.5,z-7,low?12:24);
 g.add(new T.SphereGeometry(4.3,low?14:24,low?8:12,0,Math.PI*2,0,Math.PI/2),C.gold,[x,y+13.9,z-7],[0,0,0],[1,1.12,1]);cyl(s,.9,1,1.8,C.graniteDark,x,y+18.6,z-7,10);g.add(new T.SphereGeometry(1,10,8,0,Math.PI*2,0,Math.PI/2),C.goldBright,[x,y+20.4,z-7]);box(g,.08,1.1,.08,C.goldBright,x,y+21.4,z-7);box(g,.6,.08,.08,C.goldBright,x,y+22.1,z-7);
 for(const dx of [-5.6,5.6]){cyl(s,1.1,1.15,2.4,C.graniteDark,x+dx,y+9,z-1.6,8);g.add(new T.SphereGeometry(1.15,10,8,0,Math.PI*2,0,Math.PI/2),C.gold,[x+dx,y+11.4,z-1.6]);}
 // The Admiralty: a long ochre wing under a stepped tower and its golden needle.
 const ax=x+22;box(w,22,5.4,6,C.ochre,ax,y,z-2);windowGrid(w,p,ax,y+.6,z+1.02,21,4.4,12,2,{wall:C.ochre,trim:C.white,glass:C.glass,roof:C.tin},false,low);box(w,5,9,5,C.ochre,ax,y,z-2);archedWindow(w,p,ax,y,z+.52,2,3.4,{frame:C.white,glass:'#33261e'});for(let k=0;k<6;k++)column(w,ax-1.9+k*.76,y+9,z+.4,.14,2.6,C.white,8);box(w,4.4,.4,4.4,C.white,ax,y+11.6,z-2);cyl(w,1.3,1.5,1.6,C.ochre,ax,y+12,z-2,10);
 g.add(new T.SphereGeometry(1.4,10,8,0,Math.PI*2,0,Math.PI/2),C.gold,[ax,y+13.6,z-2]);g.add(new T.ConeGeometry(.4,10,8),C.goldBright,[ax,y+19.6,z-2]);box(g,.9,.3,.06,C.goldBright,ax,y+24.6,z-2);
 s.mesh(group,granite(),'isaac-granite-walls-and-columns');w.mesh(group,stucco(),'admiralty-walls');p.mesh(group,vertexMaterial(.7),'admiralty-windows');g.mesh(group,gilding(),'isaac-dome-and-admiralty-spire');group.userData={landmark:"St Isaac's Cathedral and the Admiralty"};settle(group,[x,y,z],.7,18);
}

/** Where the side canals meet the embankment. */
const canals=(finish:number)=>[-6,82,finish+6];
/** The Rostral Columns: red beacons studded with ship prows, and the houses and bridges of the canals. */
function canalCity(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='canal-houses-and-bridges';root.add(group);const s=new Builder(),p=new Builder(),glow=new Builder(),y=petersburg.quayTop;let houses=0;
 for(const cx of [36,40]){cyl(s,.75,.9,9,C.red,cx,y,-18.4,12);cyl(s,1.1,1.2,.8,C.granite,cx,y,-18.4,12);for(let k=0;k<3;k++)for(const side of [-1,1])s.add(new T.ConeGeometry(.3,1.2,4),C.tinDark,[cx+side*.95,y+2.4+k*2.1,-18.4],[0,0,side*-1.2]);cyl(p,.5,.75,.5,C.bronze,cx,y+9,-18.4,10);glow.add(new T.ConeGeometry(.3,.8,6),'#ffb347',[cx,y+9.9,-18.4]);}
 for(let x=-46;x<finish+70;){const w=4.4+r()*2.6,h=6.5+r()*2.4;const taken=[[petersburg.fortressX,13],[petersburg.palaceX,21],[petersburg.saviorX,7],[petersburg.isaacX,8],[petersburg.isaacX+15.4,9],...canals(finish).map(c=>[c,2.6])].some(([c,half])=>Math.abs(x+w/2-c)<half+w/2);
  if(!taken){townhouse(s,p,x+w/2,y,-36,w-.1,h,6,{wall:[C.ochre,'#e9b9a0','#cfe0d0','#e6d9b8','#d9c0c8','#bcd0e0'][Math.floor(r()*6)],trim:C.white,glass:C.glass,roof:C.tinDark},{rows:Math.round(h/2.2),roof:'parapet',arched:r()>.6,door:true,low});houses++;}x+=w;}
 // Side canals run back between the houses; a humpbacked bridge with lamp obelisks carries the quay over each mouth.
 for(const bx of canals(finish)){box(p,4.4,.04,23.5,'#2f5670',bx,y-.02,-28.25);box(p,4.4,1.5,.12,'#1d2c3a',bx,-2.6,-16.44);box(s,5.2,.3,.3,C.graniteDark,bx,-1.3,-16.4);
  for(let k=0;k<=10;k++){const t=k/10,dx=-5+t*10,rise=Math.sin(t*Math.PI)*1.2;box(s,1.1,.3,2.6,C.granite,bx+dx,y-.2+rise,-18.3);for(const side of [-1,1])box(p,.05,.8,.05,C.iron,bx+dx,y+.1+rise,-18.3+side*1.25);}
  for(const side of [-1,1])for(const end of [-5.4,5.4]){pyramid(s,.08,.22,2.2,C.granite,bx+end,y,-18.3+side*1.3);glow.add(new T.SphereGeometry(.16,8,6),'#fff0c8',[bx+end,y+2.35,-18.3+side*1.3]);}}
 s.mesh(group,stucco(),'canal-house-walls-and-bridges');p.mesh(group,vertexMaterial(.7),'canal-house-windows-and-railings');const lamps=glow.mesh(group,vertexMaterial(.4,{emissive:new T.Color('#ffd98a'),emissiveIntensity:.8}),'bridge-lamps-and-beacons');lamps.castShadow=false;group.userData={feature:'Canal houses, bridges and the Rostral Columns',houses,bridges:3};
}

/** A low glass-topped canal tour boat. */
function canalBoat(root:T.Object3D){const b=new Builder();box(b,6.6,.55,1.7,'#1f3a5c',0,0,0);box(b,6.8,.1,1.8,C.white,0,.55,0);box(b,5,.7,1.5,C.glass,-.3,.65,0);box(b,5.2,.08,1.6,C.white,-.3,1.35,0);box(b,.6,.4,.5,C.red,2.7,.65,0);const boat=b.mesh(root,vertexMaterial(.5),'canal-tour-boat');boat.userData={animated:true};return boat;}

// Route furniture, in a platform's own coordinates, behind the walking lane.
/** A granite sphinx on its plinth, like those on the university embankment. */
function sphinx(b:Builder,x:number,y:number,z:number,facing:1|-1){box(b,1.7,.45,.7,C.graniteDark,x,y,z);box(b,1.3,.4,.5,C.granite,x,y+.45,z);box(b,.36,.3,.5,C.granite,x+facing*.75,y+.45,z);box(b,.42,.62,.44,C.granite,x+facing*.48,y+.85,z);b.add(new T.SphereGeometry(.2,8,6),C.granite,[x+facing*.5,y+1.6,z]);box(b,.5,.4,.1,C.granite,x+facing*.42,y+1.5,z);}
/** A row of painted nesting dolls, largest to smallest. */
function nestingDolls(b:Builder,x:number,y:number,z:number){const paints=[C.red,C.blue,C.yellow,C.green,C.red];for(let k=0;k<5;k++){const size=.42-k*.065,dx=x+k*.36-k*k*.02;b.add(new T.SphereGeometry(size*.5,10,8),paints[k],[dx,y+size*.42,z],[0,0,0],[1,1.15,1]);b.add(new T.SphereGeometry(size*.34,10,8),paints[(k+1)%5],[dx,y+size*1.02,z]);b.add(new T.SphereGeometry(size*.2,8,6),'#f2d6bd',[dx,y+size*1.04,z+size*.22],[0,0,0],[1,1,.5]);}}
function ornateLamp(b:Builder,glow:Builder,x:number,y:number,z:number){lampPost(b,glow,x,y,z,C.iron);for(const side of [-1,1]){b.add(new T.TorusGeometry(.2,.025,4,8,Math.PI),C.iron,[x+side*.2,y+2.55,z],[0,0,side>0?0:Math.PI]);glow.add(new T.SphereGeometry(.11,8,6),'#f4efdf',[x+side*.4,y+2.6,z]);}}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'peter-and-paul-golden-spire','winter-palace-columns-and-statues','savior-on-spilled-blood-onion-domes','st-isaacs-golden-dome','admiralty-spire','rostral-columns','canal-bridges-and-lamps','granite-sphinxes-and-nesting-dolls']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(78121),detail=new T.Group();detail.name='petersburg-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  embankment(detail,finish,low);canalCity(detail,finish,r,low);fortress(detail,flagMaterial(bandedFlagTexture([['#ffffff',1],['#0039a6',1],['#d52b1e',1]])),low);winterPalace(detail,low);saviorOnBlood(detail,low);isaacAndAdmiralty(detail,low);
  const lindens:Placement[]=[];for(let k=0;k<(low?8:18);k++)lindens.push({x:-44+r()*(finish+100),y:petersburg.quayTop,z:-17.7-r()*.6,scale:.55+r()*.2,rotation:r()*6});plantGrove(detail,'plane',lindens,{low,name:'embankment-lindens'});
  const boat=canalBoat(detail),gulls=createFlock(detail,{name:'neva-gulls',count:low?5:10,centre:[finish*.5,7,-9],radius:[30,3,6],speed:.2,size:.8,color:'#f2f2ee',wing:'#c9ccd0',seed:31,glide:true});
  let reduced=context.reducedMotion;const sail=(time:number)=>{const lap=finish+110;boat.position.set(-50+(time*.85)%lap,-2.5+Math.sin(time)*.03,-7.5);};sail(0);gulls.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;sail(time);gulls.update(time);},setReducedMotion(value){reduced=value;gulls.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.8)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*23+Math.round(definition.x),y=surface(0);
  if(t==='rooftop'){chimneyStack(b,w/2-.9,surface(w/2-.9),rear,2+seed%2,{brick:C.brick,cap:'#6d3a2c',pot:'#8f8f8a'});if(w>3.6)dormer(b,-w/2+1.1,surface(-w/2+1.1),rear-.05,C.white,C.glass,C.tinDark);box(b,.04,1.3,.04,C.iron,0,y,rear);for(let k=0;k<3;k++)box(b,.6-k*.14,.03,.03,C.iron,0,y+.8+k*.22,rear);}
  else if(t==='bridge'){railing(b,-w/2+.25,w/2-.25,y,rear,C.iron,C.gold);ornateLamp(b,glow,-w/2+.7,surface(-w/2+.7),rear+.3);if(w>6)ornateLamp(b,glow,w/2-.7,surface(w/2-.7),rear+.3);}
  else if(t==='ground'){railing(b,-w/2+.25,w/2-.25,y,rear,C.iron,C.gold);sphinx(b,-w/2+1.5,y,-1.9,1);sphinx(b,w/2-1.5,y,-1.9,-1);nestingDolls(b,-.8,y,-1.5);ornateLamp(b,glow,0,y,-2.1);}
  else if(t==='terrace'){balustrade(b,-w/2+.25,w/2-.25,y,rear,{rail:C.trim,base:C.granite,baluster:C.white});nestingDolls(b,-w/2+.9,y,-1.6);}
  else if(t==='stairs'){const from=-w/2+.25,to=w/2-.25;railing(b,from,to,Math.min(surface(from),surface(to)),rear,C.iron,C.gold);}
  finishProps(root,b,glow,'petersburg-quays-and-roofs');
 },
};
