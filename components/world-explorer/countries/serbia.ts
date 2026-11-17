import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl,roof} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,bench,chimneyStack,finishProps,flagMaterial,pyramid,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Serbia: Stari Ras and Sopoćani among the Raška hills (SRS-632.37). First
 * comes the small round church of St Peter with its old stone crosses;
 * then the ruined walls of the fortress of Ras on its hill; then the
 * monastery of Sopoćani inside its wall: the bell tower, the long nave
 * under lead roofs, the dome on its square base and the round apse, with
 * the timber-galleried lodging house and the flag at the gate; and last
 * the two towers of the Pillars of St George on their hilltop. Haystacks
 * on poles, plum trees, sheep and fences fill the pastures. The route
 * carries painted beehives, crates of plums, fences and haystacks.
 * Scenery only: nothing collides. */
const C={grass:'#8aa85e',grassDark:'#789650',hill:'#84a25a',plaster:'#f1e4c6',plasterDark:'#dccca8',stone:'#d2c9b3',stoneDark:'#b6ad97',lead:'#8a979c',leadDark:'#74828a',tile:'#9a5a40',white:'#f6f2e8',timber:'#6a4c34',timberDark:'#4a3626',shade:'#3a2e26',gold:'#e0b030',
 hay:'#d9c070',plum:'#5a3a7a',leaf:'#4f8a3f',trunk:'#5a4636',iron:'#22262a',wood:'#7a5c40',glass:'#3a4652',hive:['#e6c040','#4a7ab0','#f2efe6','#6a9a5a'],wool:'#f3f0e6'} as const;
const base=europeEnvironment('SRB',{landmark:false,flat:true,town:false});
export const ras={fieldTop:-1,rotundaX:16,fortress:[50,-48,8],monasteryX:92,pillars:[128,-50,9]} as const;
const moundY=(x:number,z:number,[cx,cz,top]:readonly [number,number,number],rx:number,rz:number)=>{const dx=(x-cx)/rx,dz=(z-cz)/rz,inside=1-dx*dx-dz*dz;return inside<=0?ras.fieldTop:Math.max(ras.fieldTop,-5+(top+5)*Math.sqrt(inside));};

function pastures(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='raska-pastures';root.add(group);const g=new Builder(),top=ras.fieldTop,from=-60,to=finish+100;
 box(g,to-from,top+5,60,C.grass,(from+to)/2,-5,-46.5);for(let k=0;k<(low?12:24);k++)g.add(new T.SphereGeometry(1,8,5),C.grassDark,[from+k*(to-from)/(low?12:24)+r()*4,-4.2,-16.3],[0,0,0],[5,2.9,1.4]);
 for(const hill of [ras.fortress,ras.pillars])g.add(new T.SphereGeometry(1,low?12:20,low?8:12),C.hill,[hill[0],-5,hill[1]],[0,0,0],[21,hill[2]+5,13],.05);
 // Haystacks built round a pole, sheep, plum trees and a field fence.
 for(const [x,z] of [[30,-20],[36,-23],[62,-20.4],[68,-24],[114,-21],[146,-22],[-12,-21]] as const){g.add(new T.ConeGeometry(1,2.1,low?7:10),C.hay,[x,top+1.05,z]);cyl(g,.04,.05,2.8,C.timberDark,x,top,z,4);}
 for(let k=0;k<(low?6:14);k++){const x=38+((k*13)%20)+r(),z=-18.4-((k*7)%5)*.5;g.add(new T.SphereGeometry(.32,7,5),C.wool,[x,top+.42,z],[0,0,0],[1.3,.9,.8]);g.add(new T.SphereGeometry(.13,6,5),C.shade,[x+.42,top+.52,z]);for(const dx of [-.2,.2])box(g,.06,.26,.06,C.shade,x+dx,top,z);}
 for(let k=0;k<(low?6:12);k++){const x=64+(k%6)*3.4,z=-27-Math.floor(k/6)*3;cyl(g,.1,.14,1.3,C.trunk,x,top,z,5);g.add(new T.SphereGeometry(1,7,5),C.leaf,[x,top+2,z],[0,0,0],[1.1,.9,1.1],.06);for(let j=0;j<4;j++)g.add(new T.SphereGeometry(.09,5,4),C.plum,[x+Math.cos(j*1.7)*.9,top+1.7+Math.sin(j*2.3)*.3,z+.8]);}
 for(let x=24;x<76;x+=low?3.2:1.6)cyl(g,.06,.07,.9,C.timberDark,x,top,-17.6,4);for(const dy of [.4,.75])box(g,52,.06,.05,C.wood,50,top+dy,-17.6);
 g.mesh(group,vertexMaterial(.97),'pastures-hills-haystacks-sheep-and-plum-trees');group.userData={feature:'Pastures of Raška'};
}

function rotunda(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='st-peters-church';root.add(group);const s=new Builder(),p=new Builder(),x=ras.rotundaX,y=ras.fieldTop,z=-25;
 cyl(s,3,3.1,3.2,C.stone,x,y,z,low?10:16);cone(p,3.4,1.1,C.tile,x,y+3.2,z,low?10:16);cyl(s,1.5,1.5,1.7,C.stone,x,y+3.7,z,low?8:12);cone(p,1.8,1.1,C.tile,x,y+5.4,z,low?8:12);box(p,.06,.7,.06,C.gold,x,y+6.5,z);box(p,.34,.06,.06,C.gold,x,y+6.95,z);
 cyl(s,1.4,1.4,2.4,C.stone,x+3.2,y,z,low?8:12);p.add(new T.SphereGeometry(1.45,low?8:12,5,0,Math.PI*2,0,Math.PI/2),C.tile,[x+3.2,y+2.4,z],[0,0,0],[1,.5,1]);box(s,2,2.4,2,C.stoneDark,x-3.4,y,z);roof(p,2.3,.8,2.3,C.tile,x-3.4,y+2.4,z);archedWindow(s,p,x-3.4,y,z+1.02,.8,1.6,{frame:C.stone,glass:C.shade});for(const a of [.6,-.6])box(p,.3,.8,.08,C.shade,x+Math.sin(a)*3.05,y+1.5,z+Math.cos(a)*3.05,a);
 // The old graveyard: leaning stone crosses.
 for(let k=0;k<(low?5:10);k++){const gx=x-7+((k*17)%14),gz=z+3.6+(k%3)*.7;box(s,.34,1+(k%3)*.25,.16,k%2?C.stone:C.stoneDark,gx,y,gz,(k%5-2)*.08);box(s,.8,.22,.16,k%2?C.stone:C.stoneDark,gx,y+.62+(k%3)*.2,gz,(k%5-2)*.08);}
 s.mesh(group,vertexMaterial(.98),'round-church-apse-and-stone-crosses');p.mesh(group,vertexMaterial(.8),'tiled-cones-and-cross');group.userData={landmark:"St Peter's Church"};
}

function fortressAndPillars(root:T.Object3D,low:boolean){
 const fort=new T.Group();fort.name='fortress-of-ras';root.add(fort);const s=new Builder(),[fx,fz,ft]=ras.fortress,at=(x:number,z:number)=>moundY(x,z,ras.fortress,21,13);
 // Broken ramparts round the hilltop and the stumps of two gate towers.
 for(let k=0;k<(low?9:18);k++){const a=Math.PI*(.04+k/(low?9:18)*.92),x=fx-Math.cos(a)*12,z=fz+2+Math.sin(a)*6.4,y=at(x,z)-.3;box(s,low?4.6:2.5,1.2+((k*7)%5)*.5,.9,k%2?C.stone:C.stoneDark,x,y,z,a-Math.PI/2);}
 for(const dx of [-2.6,2.6]){const y=at(fx+dx,fz+8)-.3;box(s,2.2,3.4-(dx>0?1:0),2.2,C.stone,fx+dx,y,fz+8);}box(s,3,2.4,2.6,C.stoneDark,fx+6,ft-.6,fz+1);box(s,1.2,3.6,1.2,C.stone,fx-5,ft-.8,fz+2);
 s.mesh(fort,vertexMaterial(.98),'ruined-ramparts-and-gate-towers');fort.userData={landmark:'Fortress of Ras'};
 const pillars=new T.Group();pillars.name='pillars-of-st-george';root.add(pillars);const m=new Builder(),p=new Builder(),[px,pz,pt]=ras.pillars,y=pt-.5,z=pz+2;
 box(m,5,3.8,6,C.plaster,px,y,z-3);roof(p,5.3,1,6.3,C.lead,px,y+3.8,z-3,Math.PI/2);cyl(m,1.3,1.3,1.6,C.plaster,px,y+4.4,z-3.4,low?8:12);p.add(new T.SphereGeometry(1.4,low?8:12,6,0,Math.PI*2,0,Math.PI/2),C.lead,[px,y+6,z-3.4],[0,0,0],[1,.7,1]);
 for(const side of [-1,1]){box(m,1.7,6.4,1.7,C.plasterDark,px+side*2.7,y,z+.4);for(const level of [2.6,4.6])archedWindow(m,p,px+side*2.7,y+level,z+1.27,.5,1,{frame:C.stone,glass:C.shade});pyramid(p,.1,2,1.1,C.leadDark,px+side*2.7,y+6.4,z+.4);}archedWindow(m,p,px,y,z+.04,1,2,{frame:C.stone,glass:C.shade});box(m,13,1.1,.6,C.stone,px,y+.1,z+3.4);
 m.mesh(pillars,vertexMaterial(.96),'hilltop-church-and-two-towers');p.mesh(pillars,vertexMaterial(.6),'lead-roofs-and-dome');pillars.userData={landmark:'Đurđevi Stupovi',towers:2};
}

function monastery(root:T.Object3D,flag:T.Material,low:boolean){
 const group=new T.Group();group.name='sopocani-monastery';root.add(group);const s=new Builder(),p=new Builder(),w=new Builder(),x=ras.monasteryX,y=ras.fieldTop,z=-25;
 // West to east: bell tower, open porch, nave, the dome over the crossing, and the apse.
 box(s,2.6,8.4,2.6,C.plaster,x-8.6,y,z-2);for(const level of [2,4.2])archedWindow(s,p,x-8.6,y+level,z-.68,.7,1.3,{frame:C.plasterDark,glass:C.shade});for(const dx of [-.6,.6])archedWindow(s,p,x-8.6+dx,y+6.4,z-.68,.5,1.3,{frame:C.plasterDark,glass:C.shade});pyramid(p,.1,3,1.4,C.lead,x-8.6,y+8.4,z-2);box(p,.06,.6,.06,C.gold,x-8.6,y+9.8,z-2);box(p,.3,.06,.06,C.gold,x-8.6,y+10.2,z-2);
 box(s,3.4,3.4,5,C.plaster,x-5.6,y,z-2.5);roof(p,3.7,.9,5.3,C.lead,x-5.6,y+3.4,z-2.5);for(const dx of [-.9,.9])archedWindow(s,p,x-5.6+dx,y,z+.04,1,2.3,{frame:C.plasterDark,glass:C.shade});
 box(s,10,5,5.6,C.plaster,x+1.1,y,z-2.8);roof(p,10.3,1.2,5.9,C.lead,x+1.1,y+5,z-2.8);box(s,3,3.6,1.6,C.plaster,x+2,y,z+.6);p.add(new T.BoxGeometry(3.3,.12,2),C.leadDark,[x+2,y+3.9,z+.7],[.34,0,0]);
 for(const dx of [-2.6,-.6,4.6])archedWindow(s,p,x+1.1+dx,y+1.8,z+.04,.5,1.8,{frame:C.plasterDark,glass:C.shade});archedWindow(s,p,x+2,y+.8,z+1.44,.6,1.5,{frame:C.plasterDark,glass:C.shade});
 box(s,3.4,1.2,3.4,C.plaster,x+2,y+5.6,z-2.8);cyl(s,1.6,1.6,1.9,C.plaster,x+2,y+6.8,z-2.8,low?8:12);for(let k=0;k<8;k++){const a=k/8*Math.PI*2;p.add(new T.BoxGeometry(.4,1.2,.08),C.shade,[x+2+Math.sin(a)*1.6,y+7.7,z-2.8+Math.cos(a)*1.6],[0,a,0]);}p.add(new T.SphereGeometry(1.75,low?10:16,7,0,Math.PI*2,0,Math.PI/2),C.lead,[x+2,y+8.7,z-2.8],[0,0,0],[1,.7,1]);box(p,.06,.7,.06,C.gold,x+2,y+9.9,z-2.8);box(p,.34,.06,.06,C.gold,x+2,y+10.35,z-2.8);
 cyl(s,2.3,2.3,3.8,C.plaster,x+6.4,y,z-2.8,low?8:14);p.add(new T.SphereGeometry(2.36,low?8:14,6,0,Math.PI*2,0,Math.PI/2),C.lead,[x+6.4,y+3.8,z-2.8],[0,0,0],[1,.55,1]);
 // The lodging house with its timber gallery, and the wall and gate round the court.
 const kx=x+17;box(s,9,2.3,4,C.white,kx,y,z-2);box(s,9,2,4,C.white,kx,y+2.3,z-2);box(p,9.4,.14,1.2,C.timberDark,kx,y+2.3,z+.5);for(let k=0;k<6;k++){cyl(p,.07,.08,2,C.timber,kx-4.4+k*1.76,y+2.44,z+1,5);cyl(p,.09,.1,2.3,C.timber,kx-4.4+k*1.76,y,z+1,5);}box(p,9.4,.08,.06,C.timber,kx,y+3.2,z+1.02);roof(p,10,1.3,6,C.tile,kx,y+4.3,z-1.6);for(let k=0;k<4;k++)box(p,.6,.9,.06,C.glass,kx-3+k*2,y+2.9,z+.03);
 for(const [a,b] of [[x-14,x-11.2],[x-8.8,x+24]] as const)box(w,b-a,1.5,.5,C.stone,(a+b)/2,y,-19.4);for(const side of [-1,1])box(w,.8,2.6,.8,C.stoneDark,x-10+side*1.4,y,-19.4);roof(p,4.4,.9,1.8,C.tile,x-10,y+2.6,-19.4);cyl(p,.05,.07,4.4,C.iron,x-12.6,y,-19.9,5);
 s.mesh(group,vertexMaterial(.95),'church-tower-nave-dome-apse-and-lodging');p.mesh(group,vertexMaterial(.6),'lead-roofs-windows-gallery-and-gate-roof');w.mesh(group,vertexMaterial(.98),'monastery-wall-and-gate');wavingFlag(group,flag,x-12.54,y+3.7,-19.9,2,'serbia-flag',.66);group.userData={landmark:'Sopoćani Monastery'};
}

/** Red, blue and white bands, with a small shield of the white eagle near the hoist. */
const serbianFlag=()=>pixelTexture(96,(u,v)=>{const x=(u-.3)*2,y=v-.5;if(Math.abs(x)<.2&&y>-.26&&y<.24&&!(y<-.08&&Math.hypot(x/.2,(y+.08)/.18)>1)){if(Math.abs(x)<.03&&y>-.14&&y<.14||Math.hypot((Math.abs(x)-.07)/.07,(y-.02)/.1)<1||Math.hypot(Math.abs(x)-.05,y-.16)<.035)return[250,250,250,255];return[198,54,60,255];}if(Math.abs(x)<.14&&y>=.24&&y<.34)return[224,176,48,255];return v>.667?[198,54,60,255]:v>.333?[12,64,118,255]:[255,255,255,255];},true,false);

// Route furniture, in a platform's own coordinates, behind the walking lane.
/** A painted beehive on a stand. */
function beehive(b:Builder,x:number,y:number,z:number,seed:number){for(const dx of [-.16,.16])box(b,.06,.2,.3,C.timberDark,x+dx,y,z);for(let k=0;k<2+seed%2;k++)box(b,.44,.26,.38,C.hive[(seed+k)%4],x,y+.2+k*.27,z);const top=y+.2+(2+seed%2)*.27;box(b,.52,.07,.46,C.stoneDark,x,top,z);box(b,.14,.03,.02,C.shade,x,y+.24,z+.2);}
function plumCrate(b:Builder,x:number,y:number,z:number){box(b,.6,.26,.4,C.wood,x,y,z);for(let k=0;k<8;k++)b.add(new T.SphereGeometry(.07,5,4),C.plum,[x-.2+(k%4)*.13,y+.28,z-.08+Math.floor(k/4)*.16]);}
function stook(b:Builder,x:number,y:number,z:number){b.add(new T.ConeGeometry(.42,.95,8),C.hay,[x,y+.475,z]);cyl(b,.025,.03,1.25,C.timberDark,x,y,z,4);}
function fence(b:Builder,from:number,to:number,y:number,z:number){for(let x=from;x<=to+.01;x+=1.3)cyl(b,.06,.07,.95,C.timberDark,x,y,z,5);for(const dy of [.4,.78])box(b,to-from+.1,.07,.05,C.wood,(from+to)/2,y+dy,z);}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'round-church-of-st-peter-and-stone-crosses','ruined-fortress-of-ras','sopocani-bell-tower-nave-dome-and-apse','timber-galleried-lodging-house','pillars-of-st-george-two-towers','haystacks-on-poles-sheep-and-plum-trees','painted-beehives-and-plum-crates']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(37900),detail=new T.Group();detail.name='ras-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  pastures(detail,finish,r,low);rotunda(detail,low);fortressAndPillars(detail,low);monastery(detail,flagMaterial(serbianFlag()),low);
  const hills=new T.Group();hills.name='raska-hills';detail.add(hills);const m=new Builder(.5);for(const [dx,w,h,z,color] of [[-60,66,16,-92,'#7d9c58'],[26,76,20,-96,'#74934f'],[120,70,17,-92,'#7d9c58'],[212,64,15,-96,'#74934f'],[-10,90,30,-130,'#8fa7a0'],[150,96,34,-134,'#869f9a']] as const)m.add(new T.SphereGeometry(1,low?10:16,low?6:10),color,[dx,-5,z],[0,0,0],[w,h,16],.1);m.mesh(hills,vertexMaterial(.98),'rolling-hills-and-blue-ridges');
  const trees:Placement[]=[];for(let k=0;k<(low?16:40);k++){const x=-44+r()*(finish+104),z=-32-r()*20;if(Math.abs(x-ras.monasteryX-4)<20&&z>-34||Math.hypot(x-ras.fortress[0],(z-ras.fortress[1])*1.6)<13||Math.hypot(x-ras.pillars[0],(z-ras.pillars[1])*1.6)<9)continue;trees.push({x,y:Math.max(moundY(x,z,ras.fortress,21,13),moundY(x,z,ras.pillars,21,13))-.1,z,scale:.7+r()*.5,rotation:r()*6});}plantGrove(detail,'plane',trees,{low,name:'raska-woods'});
  const swallows=createFlock(detail,{name:'ras-swallows',count:low?6:12,centre:[finish*.5,9,-18],radius:[36,2.5,5],speed:.3,size:.5,color:'#2c2f36',wing:'#3a3e46',seed:197});
  let reduced=context.reducedMotion;swallows.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;swallows.update(time);},setReducedMotion(value){reduced=value;swallows.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.6)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*163+Math.round(definition.x),from=-w/2+.3,to=w/2-.3,y=surface(0);
  if(t==='ground'){fence(b,from,to,y,rear);beehive(b,from+.7,y,rear+.45,seed);beehive(b,from+1.4,y,rear+.45,seed+1);if(w>4.4)plumCrate(b,to-.8,y,rear+.45);if(w>7)stook(b,0,y,rear+.6);}
  else if(t==='slope'||t==='stairs'){for(let x=from;x<=to+.01;x+=1.3){cyl(b,.06,.07,.95,C.timberDark,x,surface(x),rear,5);if(x+1.3<=to+.01)b.strut(new T.Vector3(x,surface(x)+.8,rear),new T.Vector3(x+1.3,surface(x+1.3)+.8,rear),.035,C.wood,4,1);}if(t==='slope')stook(b,0,surface(0),rear+.6);}
  else if(t==='rooftop'){chimneyStack(b,from+.6,y,rear+.1,2,{brick:C.white,cap:C.stoneDark,pot:C.tile});if(w>4.4)chimneyStack(b,to-.8,y,rear+.1,1,{brick:C.white,cap:C.stoneDark,pot:C.tile});}
  else if(t==='rock'){beehive(b,(seed%2?.3:-.3),surface(0),rear+.4,seed);}
  else if(t==='terrace'){box(b,to-from,.6,.34,C.stone,(from+to)/2,y,rear);box(b,to-from+.1,.1,.44,C.stoneDark,(from+to)/2,y+.6,rear);beehive(b,from+.7,y,rear+.6,seed);plumCrate(b,from+1.5,y,rear+.6);if(w>5)bench(b,to-1.4,y,rear+.6);}
  finishProps(root,b,glow,'ras-beehives-fences-and-plum-crates');
 },
};
