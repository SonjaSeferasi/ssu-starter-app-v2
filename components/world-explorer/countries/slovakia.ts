import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl,onion,roof} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,balustrade,bench,chimneyStack,finishProps,flagMaterial,lampPost,pyramid,townhouse,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Slovakia: the mining town of Banská Štiavnica (SRS-632.35). Pastel
 * Renaissance houses line the street, with the timber headframe of a mine
 * shaft, the Klopačka tower whose wooden clapper called the miners to
 * work, and the plague column in the square. Behind stand the Old Castle,
 * a fortified church with its gate tower, bastion and the flag; the New
 * Castle, a tall white block with four round corner bastions on its hill;
 * and at the end the Calvary, red and white churches and chapels climbing
 * a green cone. Wooded hills ring the town. The route carries mine carts
 * of ore, crossed-hammer signs, miners' lamps, timber rails and chimneys.
 * Scenery only: nothing collides. */
const C={grass:'#84a85c',grassDark:'#72964e',cobble:'#d6cfc0',white:'#f6f2e8',cream:'#efe6d0',stone:'#d9d0bc',stoneDark:'#bdb49e',tile:'#9e553c',tileDark:'#7c4030',shingle:'#5a4a3c',timber:'#6a4c34',timberDark:'#4a3626',trim:'#fbf8ef',glass:'#3a4652',shade:'#322c26',gold:'#e0b030',calvaryRed:'#b5402f',
 iron:'#2a2c30',steel:'#8a9096',wood:'#7a5c40',ore:'#8f8a80',oreGold:'#c9a24a',blue:'#0b4ea2',red:'#ee1c25',pink:'#f09ab0'} as const;
const walls=['#f3e3c2','#efd2c0','#e6dcc6','#dfe6dc','#f1c9b0','#f6f0e2','#d9e0e6'] as const;
const base=europeEnvironment('SVK',{landmark:false,flat:true,town:false,backdrop:false});
export const stiavnica={streetTop:-1,headframeX:4,klopackaX:24,columnX:44,oldCastleX:68,newCastle:[106,-46,7],calvary:[144,-58,11]} as const;
const moundY=(x:number,z:number,[cx,cz,top]:readonly [number,number,number],rx:number,rz:number)=>{const dx=(x-cx)/rx,dz=(z-cz)/rz,inside=1-dx*dx-dz*dz;return inside<=0?stiavnica.streetTop:Math.max(stiavnica.streetTop,-5+(top+5)*Math.sqrt(inside));};

function ground(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='stiavnica-street-and-hills';root.add(group);const g=new Builder(),top=stiavnica.streetTop,from=-60,to=finish+100;
 box(g,to-from,top+5,60,C.grass,(from+to)/2,-5,-46.5);box(g,to-from,top+5.03,9,C.cobble,(from+to)/2,-5,-21);for(let k=0;k<(low?12:24);k++)g.add(new T.SphereGeometry(1,8,5),C.grassDark,[from+k*(to-from)/(low?12:24)+r()*4,-4.2,-16.3],[0,0,0],[5,2.9,1.4]);
 const [nx,nz,nt]=stiavnica.newCastle,[cx,cz,ct]=stiavnica.calvary;g.add(new T.SphereGeometry(1,low?12:20,low?8:12),C.grass,[nx,-5,nz],[0,0,0],[20,nt+5,12],.05);g.add(new T.SphereGeometry(1,low?12:22,low?8:14),C.grassDark,[cx,-5,cz],[0,0,0],[22,ct+5,15],.05);
 g.mesh(group,vertexMaterial(.97),'cobbled-street-castle-hill-and-calvary-hill');group.userData={feature:'Town ground and hills'};
}

function street(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='renaissance-burgher-houses';root.add(group);const s=new Builder(),p=new Builder(),y=stiavnica.streetTop,z=-22,{headframeX:hx,klopackaX:kx,columnX:cx,oldCastleX:ox}=stiavnica;let houses=0;
 for(let x=-44;x<finish+60;){const w=3.4+r()*1.8,h=4+r()*1.5,mid=x+w/2;if(Math.abs(mid-hx)>5.4&&Math.abs(mid-kx)>3.6&&Math.abs(mid-cx)>5&&Math.abs(mid-ox)>10.5){townhouse(s,p,mid,y,z,w-.12,h,5,{wall:walls[Math.floor(r()*walls.length)],trim:C.trim,glass:C.glass,roof:r()>.4?C.tile:C.tileDark},{rows:h>4.8?3:2,roof:r()>.5?'hip':'gable',arched:true,door:true,low});houses++;}x+=w+(houses%6?0:.9);}
 // The plague column in the square.
 box(s,2.6,.4,2.6,C.stoneDark,cx,y,z+.6);box(s,1.8,.8,1.8,C.stone,cx,y+.4,z+.6);cyl(s,.5,.7,1.4,C.stone,cx,y+1.2,z+.6,8);for(let k=0;k<4;k++){const a=k/4*Math.PI*2+.8;p.add(new T.SphereGeometry(.22,6,5),C.white,[cx+Math.cos(a)*.75,y+1.5,z+.6+Math.sin(a)*.75],[0,0,0],[1,1.6,1]);}cyl(s,.26,.36,2.4,C.calvaryRed,cx,y+2.6,z+.6,8);p.add(new T.SphereGeometry(.4,8,6),C.gold,[cx,y+5.2,z+.6]);for(let k=0;k<8;k++){const a=k/8*Math.PI*2;p.add(new T.ConeGeometry(.06,.5,4),C.gold,[cx+Math.cos(a)*.56,y+5.2+Math.sin(a)*.56,z+.6],[0,0,a-Math.PI/2]);}
 s.mesh(group,vertexMaterial(.94),'pastel-arcaded-houses-and-column-base');p.mesh(group,vertexMaterial(.7),'tiled-roofs-and-plague-column');group.userData={feature:'Trinity Square houses and plague column',houses};
}

function mining(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='headframe-and-klopacka';root.add(group);const s=new Builder(),p=new Builder(),y=stiavnica.streetTop,hx=stiavnica.headframeX,kx=stiavnica.klopackaX,z=-23.4;
 // The headframe: timber legs up to the winding wheels, with its engine shed.
 const head=new T.Vector3(hx,y+6.2,z);for(const [dx,dz] of [[-1.5,-1.2],[1.5,-1.2],[-1.5,1.2],[1.5,1.2]] as const)p.strut(new T.Vector3(hx+dx,y,z+dz),new T.Vector3(hx+dx*.3,y+6.2,z+dz*.4),.13,C.timber,5,.8);p.strut(new T.Vector3(hx+4.4,y,z),head,.14,C.timberDark,5,.8);
 for(const level of [2,4])for(const dz of [-1,1])box(p,2.6-level*.3,.12,.12,C.timberDark,hx,y+level,z+dz*(1.1-level*.12));box(p,1.6,.2,1.4,C.timberDark,hx,y+6.2,z);for(const dz of [-.3,.3])p.add(new T.TorusGeometry(.6,.07,5,low?10:16),C.iron,[hx,y+7,z+dz]);roof(p,2,.6,1.8,C.shingle,hx,y+7.7,z);
 box(s,3.4,2.4,2.8,C.timber,hx+4.6,y,z-.4);roof(p,3.8,1.1,3.2,C.shingle,hx+4.6,y+2.4,z-.4);box(p,.8,1.4,.08,C.shade,hx+4.6,y,z+1.02);
 // Klopačka: a white tower with a timber gallery under a shingled cap.
 box(s,2.6,5.4,2.6,C.white,kx,y,z);box(p,3.2,1.1,3.2,C.timberDark,kx,y+5.4,z);for(const dx of [-1,-.33,.33,1])box(p,.3,.6,.06,C.shade,kx+dx,y+5.65,z+1.62);pyramid(p,.5,3.6,1.3,C.shingle,kx,y+6.5,z);box(p,.5,.5,.5,C.timberDark,kx,y+7.8,z);cone(p,.4,.8,C.shingle,kx,y+8.3,z,4);
 box(p,.7,1.4,.08,C.timberDark,kx,y,z+1.32);for(const level of [2.2,3.8])box(p,.5,.8,.06,C.glass,kx,y+level,z+1.32);
 s.mesh(group,vertexMaterial(.94),'engine-shed-and-klopacka-tower');p.mesh(group,vertexMaterial(.85),'timber-headframe-wheels-and-gallery');group.userData={landmark:'Mine headframe and Klopačka'};
}

function castles(root:T.Object3D,flag:T.Material,low:boolean){
 // The Old Castle: a church turned fortress, with a gate tower and a round bastion.
 const old=new T.Group();old.name='old-castle';root.add(old);const s=new Builder(),p=new Builder(),x=stiavnica.oldCastleX,y=stiavnica.streetTop,z=-27;
 box(s,18,1.2,8,C.stoneDark,x,y,z-3);const b=y+1.2;box(s,17,2.4,.8,C.white,x,b,z+.6);box(s,7,5.6,6,C.white,x+1,b,z-3.4);p.add(new T.ConeGeometry(4.9,2.6,4),C.tileDark,[x+1,b+6.9,z-3.4],[0,Math.PI/4,0],[1,1,.86]);for(const dx of [-2,0,2])archedWindow(s,p,x+1+dx,b+1.6,z-.38,.7,2.6,{frame:C.trim,glass:C.shade});
 box(s,2.4,6.6,2.4,C.white,x-5.4,b,z+.2);archedWindow(s,p,x-5.4,b,z+1.42,1.2,2,{frame:C.trim,glass:C.shade});p.add(new T.CylinderGeometry(.5,.5,.08,low?10:16),C.cream,[x-5.4,b+5,z+1.44],[Math.PI/2,0,0]);onion(p,1.1,C.shingle,x-5.4,b+6.6,z+.2);
 cyl(s,2,2.1,3.6,C.white,x+7.6,b,z-.4,low?10:16);cone(p,2.3,1.6,C.tile,x+7.6,b+3.6,z-.4,low?10:16);cyl(p,.05,.07,2.2,C.iron,x+7.6,b+5.2,z-.4,5);
 s.mesh(old,vertexMaterial(.94),'old-castle-walls-church-and-towers');p.mesh(old,vertexMaterial(.75),'old-castle-roofs-and-clock');wavingFlag(old,flag,x+7.66,b+6.8,z-.4,1.8,'slovakia-flag',.66);old.userData={landmark:'Old Castle'};
 // The New Castle: a tall white block with a round bastion at each corner.
 const fresh=new T.Group();fresh.name='new-castle';root.add(fresh);const n=new Builder(),q=new Builder(),[nx,nz,nt]=stiavnica.newCastle,ny=nt-.5;
 box(n,4.6,6.6,4.6,C.white,nx,ny,nz);pyramid(q,.6,5,1.3,C.shingle,nx,ny+6.6,nz);for(const [dx,dz] of [[-2.3,2.3],[2.3,2.3],[-2.3,-2.3],[2.3,-2.3]] as const){cyl(n,1.25,1.3,5,C.white,nx+dx,ny,nz+dz,low?8:12);cone(q,1.5,1.3,C.shingle,nx+dx,ny+5,nz+dz,low?8:12);}
 for(let level=0;level<5;level++)for(const dx of [-.9,.9])box(q,.4,.6,.06,C.shade,nx+dx,ny+1+level*1.1,nz+2.32);for(const dx of [-2.3,2.3])for(const level of [1.6,3.4])box(q,.3,.5,.06,C.shade,nx+dx,ny+level,nz+3.58);
 n.mesh(fresh,vertexMaterial(.94),'white-block-and-four-bastions');q.mesh(fresh,vertexMaterial(.8),'shingled-caps-and-loopholes');fresh.userData={landmark:'New Castle',bastions:4};
}

function calvary(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='calvary-hill';root.add(group);const s=new Builder(),p=new Builder(),hill=stiavnica.calvary,[cx,cz,top]=hill,at=(x:number,z:number)=>moundY(x,z,hill,22,15);
 const church=(x:number,z:number,size:number)=>{const y=at(x,z)-.2;box(s,3*size,2.6*size,3*size,C.white,x,y,z);roof(p,3.2*size,1*size,3.2*size,C.calvaryRed,x,y+2.6*size,z,Math.PI/2);archedWindow(s,p,x,y,z+1.5*size+.02,.8*size,1.5*size,{frame:C.calvaryRed,glass:C.shade});
  for(const side of [-1,1]){box(s,.9*size,3.6*size,.9*size,C.white,x+side*1.6*size,y,z+1*size);box(p,.94*size,.14,.94*size,C.calvaryRed,x+side*1.6*size,y+2.4*size,z+1*size);onion(p,.5*size,C.calvaryRed,x+side*1.6*size,y+3.6*size,z+1*size);}};
 church(cx,cz+1,1);church(cx-3,cz+8,.8);church(cx+2,cz+13.4,.9);
 // Small chapels along the way up.
 for(const [dx,dz] of [[-12,11],[-8,12.6],[9,10],[12,7],[-9,5],[7,4]] as const){if(low&&dx>0)continue;const x=cx+dx,z=cz+dz,y=at(x,z)-.1;box(s,1.2,1.3,1.2,C.white,x,y,z);pyramid(p,.1,1.5,.7,C.calvaryRed,x,y+1.3,z);box(p,.4,.7,.06,C.shade,x,y,z+.62);}
 s.mesh(group,vertexMaterial(.94),'calvary-churches-and-chapels');p.mesh(group,vertexMaterial(.75),'red-roofs-and-onion-caps');group.userData={landmark:'Calvary',churches:3};
}

/** White, blue and red bands, with the shield of the double cross near the hoist. */
const slovakFlag=()=>pixelTexture(96,(u,v)=>{const x=(u-.32)*2,y=v-.5;if(Math.abs(x)<.24&&y>-.3&&y<.28&&!(y<-.12&&Math.hypot(x/.24,(y+.12)/.18)>1)){if(Math.abs(x)>.2||y>.24||y<-.12&&Math.hypot(x/.2,(y+.12)/.15)>1)return[255,255,255,255];if(Math.abs(x)<.03&&y>-.14&&y<.2||Math.abs(y-.1)<.025&&Math.abs(x)<.1||Math.abs(y+.01)<.025&&Math.abs(x)<.14)return[255,255,255,255];if(y<-.14&&Math.hypot(x/.2,(y+.3)/.18)<1)return[11,78,162,255];return[238,28,37,255];}return v>.667?[255,255,255,255]:v>.333?[11,78,162,255]:[238,28,37,255];},true,false);

// Route furniture, in a platform's own coordinates, behind the walking lane.
/** An ore cart on a short length of rail. */
function mineCart(b:Builder,x:number,y:number,z:number,seed:number){for(const dz of [-.2,.2])box(b,1.5,.05,.05,C.steel,x,y,z+dz);for(const dx of [-.5,0,.5])box(b,.14,.04,.6,C.timberDark,x+dx,y,z);for(const dx of [-.28,.28])for(const dz of [-.2,.2])b.add(new T.CylinderGeometry(.11,.11,.05,8),C.iron,[x+dx,y+.16,z+dz],[Math.PI/2,0,0]);box(b,.9,.42,.52,C.iron,x,y+.22,z);box(b,.96,.06,.58,C.steel,x,y+.64,z);for(let k=0;k<5;k++)b.add(new T.DodecahedronGeometry(.13,0),(seed+k)%3?C.ore:C.oreGold,[x-.28+k*.14,y+.72+(k%2)*.05,z+((k*3)%3-1)*.1],[k,k*2,0]);}
/** The miners' sign: crossed hammers on a round board. */
function hammerSign(b:Builder,x:number,y:number,z:number){cyl(b,.05,.06,1.6,C.timberDark,x,y,z,5);b.add(new T.CylinderGeometry(.34,.34,.05,12),C.cream,[x,y+1.7,z+.03],[Math.PI/2,0,0]);for(const turn of [-1,1]){b.add(new T.BoxGeometry(.05,.5,.03),C.timberDark,[x,y+1.7,z+.07],[0,0,turn*.75]);b.add(new T.BoxGeometry(.2,.1,.05),C.iron,[x-turn*.17,y+1.88,z+.07],[0,0,turn*.75]);}}
function timberRail(b:Builder,from:number,to:number,y:number,z:number){for(let x=from;x<=to+.01;x+=1.3)box(b,.11,.95,.11,C.timberDark,x,y,z);for(const dy of [.42,.82])box(b,to-from+.1,.08,.06,C.timber,(from+to)/2,y+dy,z);}
function parapet(b:Builder,from:number,to:number,y:number,z:number){box(b,to-from,.6,.34,C.stone,(from+to)/2,y,z);box(b,to-from+.1,.1,.44,C.stoneDark,(from+to)/2,y+.6,z);}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'pastel-renaissance-burgher-houses','mine-headframe','klopacka-clapper-tower','plague-column','old-castle-and-flag','new-castle-four-bastions','calvary-red-and-white-churches','wooded-hills','mine-carts-of-ore','crossed-hammer-signs']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(38100),detail=new T.Group();detail.name='stiavnica-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  ground(detail,finish,r,low);street(detail,finish,r,low);mining(detail,low);castles(detail,flagMaterial(slovakFlag()),low);calvary(detail,low);
  const hills=new T.Group();hills.name='stiavnica-wooded-hills';detail.add(hills);const m=new Builder(.5);for(const [dx,w,h] of [[-60,66,24],[26,76,30],[120,70,26],[212,64,23]] as const)m.add(new T.SphereGeometry(1,low?10:16,low?6:10),dx%60?'#4f7742':'#476c3b',[dx,-5,-98],[0,0,0],[w,h,16],.1);m.mesh(hills,vertexMaterial(.98),'forested-volcanic-hills');
  const firs:Placement[]=[];for(let k=0;k<(low?24:60);k++){const x=-44+r()*(finish+104),z=-31-r()*22,onCastle=moundY(x,z,stiavnica.newCastle,20,12),onCalvary=moundY(x,z,stiavnica.calvary,22,15);if(Math.abs(x-stiavnica.oldCastleX)<11&&z>-36||Math.hypot(x-stiavnica.newCastle[0],z-stiavnica.newCastle[1])<6||Math.abs(x-stiavnica.calvary[0])<14&&z>stiavnica.calvary[1]-2)continue;firs.push({x,y:Math.max(onCastle,onCalvary)-.1,z,scale:.7+r()*.5,rotation:r()*6});}plantGrove(detail,'conifer',firs,{low,name:'stiavnica-firs'});
  const jackdaws=createFlock(detail,{name:'stiavnica-jackdaws',count:low?6:12,centre:[finish*.5,11,-22],radius:[38,2.5,5],speed:.26,size:.55,color:'#24262a',wing:'#34373c',seed:191});
  let reduced=context.reducedMotion;jackdaws.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;jackdaws.update(time);},setReducedMotion(value){reduced=value;jackdaws.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.6)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*151+Math.round(definition.x),from=-w/2+.3,to=w/2-.3,y=surface(0);
  if(t==='ground'){timberRail(b,from,to,y,rear);hammerSign(b,from+.6,y,rear+.3);if(w>4.4)mineCart(b,to-1.2,y,rear+.6,seed);}
  else if(t==='cliff'){parapet(b,from,to,Math.min(surface(from),surface(to)),rear);lampPost(b,glow,to-.4,surface(to-.4),rear+.36,C.iron,'#ffc46a');}
  else if(t==='rooftop'){chimneyStack(b,from+.6,y,rear+.1,2,{brick:C.stone,cap:C.stoneDark,pot:C.tile});if(w>4.4)chimneyStack(b,to-.8,y,rear+.1,1,{brick:C.stone,cap:C.stoneDark,pot:C.tile});}
  else if(t==='bridge'){timberRail(b,from,to,y,rear);lampPost(b,glow,from+.4,y,rear+.36,C.iron,'#ffc46a');}
  else if(t==='terrace'){balustrade(b,from,to,y,rear,{rail:C.trim,base:C.stoneDark,baluster:C.white});hammerSign(b,from+.7,y,rear+.4);if(w>5)bench(b,to-1.4,y,rear+.5);if(w>8)mineCart(b,0,y,rear+.6,seed);}
  else if(t==='rock'){lampPost(b,glow,(seed%2?.3:-.3),surface(0),rear+.4,C.iron,'#ffc46a');}
  finishProps(root,b,glow,'stiavnica-mine-carts-hammer-signs-and-lamps');
 },
};
