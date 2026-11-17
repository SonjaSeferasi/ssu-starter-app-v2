import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cyl,roof} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,balustrade,bench,chimneyStack,column,finishProps,flagMaterial,lampPost,pottedTree,pyramid,statue,texturedStone,townhouse,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** San Marino: the three towers on Mount Titano (SRS-632.33). The long
 * limestone ridge stands behind the town with a sheer cliff toward the
 * route, and along its crest are the three towers: Guaita, the first
 * fortress, with its walls and the flag; Cesta on the highest point; and
 * slim Montale standing alone, joined by the battlemented wall walk. Below
 * are the stone houses and terracotta roofs of the town, the Palazzo
 * Pubblico with its battlements and clock tower and the statue of Liberty
 * before it, the basilica with its columned porch, and the cable car that
 * climbs to the ridge. The route carries crossbow targets, white and blue
 * bunting, battlemented walls and chimneys. Scenery only: nothing
 * collides. */
const C={rock:'#ded5bc',rockDark:'#c2b89e',scrub:'#7c9a58',stone:'#e9dec4',stoneDark:'#d2c5a8',tile:'#b5603f',tileDark:'#96492f',white:'#f8f5ee',trim:'#fbf8ef',glass:'#3a4652',shade:'#3a342c',blue:'#5eb6e4',gold:'#e0b030',grass:'#8fae62',
 iron:'#22262a',wood:'#7a5c40',leaf:'#3f6a3a',red:'#c8402f',cabin:'#f4f1e8'} as const;
const walls=['#e9dec4','#efe2c8','#e2d4b6','#f3ead6'] as const;
const base=europeEnvironment('SMR',{landmark:false,flat:true,town:false});
export const titano={townTop:-1,ridge:[16,150],ridgeZ:-31,guaitaX:44,cestaX:92,montaleX:134,palazzoX:6,basilicaX:113,stationX:-16} as const;
/** Height of the crest of the ridge at x. */
export const crest=(x:number)=>{const [a,b]=titano.ridge,edge=Math.max(0,Math.min(1,(x-a)/9,(b-x)/9));return titano.townTop+edge*(7.4+1.9*Math.exp(-(((x-titano.cestaX)/24)**2))+.5*Math.exp(-(((x-titano.guaitaX)/9)**2))+.3*Math.sin(x*.4));};
const limestone=()=>texturedStone('paris-stone','#fff6e2',.9,.95);

function mountain(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='mount-titano-ridge';root.add(group);const g=new Builder(),rock=new Builder(),top=titano.townTop,[a,b]=titano.ridge,z=titano.ridgeZ,from=-60,to=finish+100,step=low?4:2;
 box(g,to-from,top+5,60,C.grass,(from+to)/2,-5,-46.5);for(let k=0;k<(low?12:24);k++)g.add(new T.SphereGeometry(1,8,5),C.scrub,[from+k*(to-from)/(low?12:24)+r()*4,-4.2,-16.3],[0,0,0],[5,2.9,1.4]);
 for(let x=a,k=0;x<b;x+=step,k++){const h=crest(x+step/2);if(h<top+.4)continue;box(rock,step+.04,h-top,22,k%2?C.rock:C.rockDark,x+step/2,top,z-11);box(g,step+.06,.08,21.6,C.scrub,x+step/2,h,z-11.2);
  for(let y=top+1,j=0;y<h-.4;y+=2.1,j++)rock.add(new T.DodecahedronGeometry(1,0),(k+j)%2?C.rock:C.rockDark,[x+step/2,Math.min(y,h-1.3),z+.25-((k+j)%2)*.35],[k,j*2,0],[step*.75,1.5+(j%2)*.4,1.1],.08);}
 g.mesh(group,vertexMaterial(.97),'town-ground-and-ridge-top');rock.mesh(group,vertexMaterial(.98),'sheer-limestone-cliff');group.userData={feature:'Mount Titano'};
}

const merlons=(b:Builder,from:number,to:number,y:number,z:number,color:string,pitch=.9)=>{for(let x=from;x<to-.01;x+=pitch)box(b,pitch*.5,.45,.4,color,x+pitch*.25,y,z);};
function towers(root:T.Object3D,flag:T.Material,low:boolean){
 const group=new T.Group();group.name='three-towers-of-san-marino';root.add(group);const s=new Builder(.5),p=new Builder(),z=titano.ridgeZ-2.4,{guaitaX:gx,cestaX:cx,montaleX:mx}=titano;
 // The wall walk along the crest from the first tower to the third.
 for(let x=gx+6;x<mx-2;x+=low?4:2){const y=Math.min(crest(x),crest(x+2));box(s,2.04,.8,.5,C.stone,x+1,y,z+1.6);if(!low)merlons(s,x,x+2,y+.8,z+1.6,C.stone,1);}
 // Guaita: curtain wall, the five-sided tower with its bell, and a lower tower with the flag.
 const gy=crest(gx);box(s,11,2.4,1,C.stone,gx,gy,z+1.2);merlons(s,gx-5.5,gx+5.5,gy+2.4,z+1.4,C.stone);cyl(s,1.9,2,5.2,C.stone,gx-1.4,gy,z-1,5);for(let k=0;k<5;k++){const a=k/5*Math.PI*2;box(s,.7,.45,.4,C.stone,gx-1.4+Math.sin(a)*1.7,gy+5.2,z-1+Math.cos(a)*1.7,a);}
 box(s,2.6,3.6,2.6,C.stoneDark,gx+3.4,gy,z-.6);merlons(s,gx+2.1,gx+4.7,gy+3.6,z+.5,C.stoneDark,.65);for(const [wx,wy,wz] of [[gx-1.4,gy+3.4,z+.98],[gx+3.4,gy+2,z+.72]] as const)box(p,.4,.8,.08,C.shade,wx,wy,wz);archedWindow(s,p,gx+.9,gy,z+1.72,1.1,1.7,{frame:C.stoneDark,glass:C.shade});cyl(p,.05,.07,2.4,C.iron,gx+3.4,gy+3.6,z-.6,5);
 // Cesta, on the highest point, and slim Montale standing alone.
 const cy=crest(cx);box(s,8,2,1,C.stone,cx,cy,z+1.2);merlons(s,cx-4,cx+4,cy+2,z+1.4,C.stone);box(s,2.6,4,2.6,C.stone,cx,cy,z-.6);merlons(s,cx-1.3,cx+1.3,cy+4,z+.5,C.stone,.65);box(p,.4,.8,.08,C.shade,cx,cy+2.4,z+.72);p.add(new T.ConeGeometry(.07,.7,4),C.gold,[cx,cy+4.8,z-.6]);box(s,3,2.6,2.4,C.stoneDark,cx-3.4,cy,z-.4);roof(p,3.3,.9,2.7,C.tile,cx-3.4,cy+2.6,z-.4);
 const my=crest(mx);cyl(s,1.3,1.45,5.2,C.stone,mx,my,z-.4,5);for(let k=0;k<5;k++){const a=k/5*Math.PI*2;box(s,.55,.45,.36,C.stone,mx+Math.sin(a)*1.15,my+5.2,z-.4+Math.cos(a)*1.15,a);}box(p,.36,.7,.08,C.shade,mx,my+3.6,z+.9);p.add(new T.ConeGeometry(.07,.6,4),C.gold,[mx,my+5.9,z-.4]);
 s.mesh(group,limestone(),'guaita-cesta-montale-and-wall-walk');p.mesh(group,vertexMaterial(.8),'tower-windows-vanes-and-mast');wavingFlag(group,flag,gx+3.46,gy+5.3,z-.6,1.8,'san-marino-flag',.7);group.userData={landmark:'Guaita, Cesta and Montale',towers:3};
}

function town(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='san-marino-town';root.add(group);const s=new Builder(),p=new Builder(),y=titano.townTop,{palazzoX:px,basilicaX:bx,stationX:sx}=titano;let houses=0;
 for(const [z,tall] of [[-21,0],[-26.4,1.3]] as const)for(let x=-44;x<finish+60;){const w=3+r()*1.8,h=3+r()*1.2+tall,mid=x+w/2;if(Math.abs(mid-px)>7.4&&Math.abs(mid-bx)>8&&Math.abs(mid-sx)>4){townhouse(s,p,mid,y,z,w-.15,h,4.4,{wall:walls[Math.floor(r()*walls.length)],trim:C.trim,glass:C.glass,roof:r()>.5?C.tile:C.tileDark},{rows:h>4?3:2,roof:r()>.6?'gable':'hip',door:!tall,low});houses++;}x+=w+(houses%4?0:1);}
 // The Palazzo Pubblico: arcade, battlements and clock tower, with Liberty on her pedestal before it.
 const z=-22.4;box(s,9,5,5,C.stone,px,y,z-2.5);merlons(s,px-4.5,px+4.5,y+5,z-.2,C.stone,.75);for(const dx of [-2.8,0,2.8])archedWindow(s,p,px+dx,y,z+.04,1.7,2.6,{frame:C.stoneDark,glass:C.shade});for(const dx of [-3,-1,1,3])archedWindow(s,p,px+dx,y+3.1,z+.04,.8,1.3,{frame:C.stoneDark,glass:C.glass});
 box(s,2.2,8,2.2,C.stone,px-2.4,y,z-1.6);merlons(s,px-3.5,px-1.3,y+8,z-.7,C.stone,.55);p.add(new T.CylinderGeometry(.6,.6,.08,low?10:16),C.white,[px-2.4,y+6.6,z-.46],[Math.PI/2,0,0]);box(p,.05,.42,.04,C.iron,px-2.4,y+6.6,z-.4);statue(p,px+1.6,y,z+3.2,1.4,{pedestal:C.stoneDark,figure:C.white});
 // The basilica: a porch of columns under a pediment, and a bell tower.
 const bz=-23.4;box(s,8,4.6,9,C.stone,bx,y,bz-4.5);roof(p,8.3,1.5,9.3,C.tileDark,bx,y+4.6,bz-4.5,Math.PI/2);box(s,8.6,.3,2.4,C.stoneDark,bx,y+3.8,bz+1.1);roof(p,8.6,1.4,2.4,C.stone,bx,y+4.1,bz+1.1,Math.PI/2);for(let k=0;k<6;k++)column(p,bx-3.6+k*1.44,y+.2,bz+2,.24,3.6,C.white,low?6:10);box(s,8.6,.2,2.6,C.stoneDark,bx,y,bz+1.2);
 box(s,2,6.6,2,C.stone,bx+5.6,y,bz-3);archedWindow(s,p,bx+5.6,y+4.8,bz-1.98,.7,1.2,{frame:C.stoneDark,glass:C.shade});pyramid(p,.1,2.3,1.2,C.tileDark,bx+5.6,y+6.6,bz-3);
 s.mesh(group,vertexMaterial(.95),'stone-houses-palazzo-and-basilica');p.mesh(group,vertexMaterial(.7),'terracotta-roofs-columns-and-clock');group.userData={landmark:'Palazzo Pubblico and the Basilica',houses};
}

function cableCar(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='cable-car-line';root.add(group);const b=new Builder(),y=titano.townTop,sx=titano.stationX,foot=new T.Vector3(sx,y+2.6,-24.6),head=new T.Vector3(titano.ridge[0]+9,crest(titano.ridge[0]+9)+1.6,titano.ridgeZ-3);
 box(b,4,2.4,3.4,C.stone,sx,y,-25);box(b,4.4,.3,3.8,C.red,sx,y+2.4,-25);for(const side of [-.5,.5])b.strut(foot.clone().setZ(foot.z+side),head.clone().setZ(head.z+side),.035,C.iron,4,1);
 const mid=foot.clone().lerp(head,.5);for(const side of [-1,1])b.strut(new T.Vector3(mid.x+side*.9,y,mid.z),new T.Vector3(mid.x,mid.y+.1,mid.z),.09,C.iron,5,.7);box(b,1.6,.12,1.6,C.iron,mid.x,mid.y+.1,mid.z);box(b,2.4,2,2.4,C.stone,head.x+.6,head.y-1.6,head.z-.6);box(b,2.8,.3,2.8,C.red,head.x+.6,head.y+.4,head.z-.6);
 b.mesh(group,vertexMaterial(.85),'stations-cables-and-pylon');group.userData={feature:'Cable car to the ridge'};
 const cabin=new T.Group();cabin.name='cable-car-cabin';root.add(cabin);const c=new Builder();box(c,1.5,1.2,1.1,C.cabin,0,-1.9,0);box(c,1.54,.36,1.14,C.red,0,-1.9,0);box(c,1.56,.44,1.16,C.glass,0,-1.3,0);box(c,1.5,.1,1.1,C.red,0,-.7,0);c.strut(new T.Vector3(0,-.6,0),new T.Vector3(0,0,0),.05,C.iron,4,1);c.mesh(cabin,vertexMaterial(.6),'cabin');cabin.userData={animated:true,from:foot.toArray(),to:head.toArray()};
 return{cabin,foot,head};
}

/** White over light blue, with the crest of the three towers in the middle. */
const sanMarinoFlag=()=>pixelTexture(96,(u,v)=>{const x=(u-.5)*1.5,y=v-.5,d=Math.hypot(x,y);if(d<.2&&d>.15)return[224,176,48,255];if(d<=.15)return Math.abs(Math.abs(x)-.07)<.022&&y>-.08&&y<.07||Math.abs(x)<.022&&y>-.08&&y<.1?[250,250,250,255]:y<-.08?[70,130,70,255]:[94,182,228,255];return v>.5?[250,250,250,255]:[94,182,228,255];},true,false);

// Route furniture, in a platform's own coordinates, behind the walking lane.
/** A crossbow target on an easel. */
function target(b:Builder,x:number,y:number,z:number){for(const dx of [-.3,.3])b.strut(new T.Vector3(x+dx,y,z-.12),new T.Vector3(x+dx*.5,y+1.25,z),.035,C.wood,4,1);b.strut(new T.Vector3(x,y,z-.4),new T.Vector3(x,y+1.1,z-.04),.035,C.wood,4,1);[[.42,C.white],[.3,C.blue],[.18,C.white],[.08,C.red]].forEach(([radius,color],k)=>b.add(new T.CylinderGeometry(radius as number,radius as number,.04,14),color as string,[x,y+.92,z+.04+k*.012],[Math.PI/2,0,0]));}
/** White and blue pennants on a line between two poles. */
function bunting(b:Builder,from:number,to:number,y:number,z:number){for(const x of [from,to])cyl(b,.04,.05,1.7,C.wood,x,y,z,5);box(b,to-from,.02,.02,C.iron,(from+to)/2,y+1.62,z);for(let x=from+.3,k=0;x<to-.2;x+=.42,k++)b.add(new T.ConeGeometry(.15,.3,3),k%2?C.blue:C.white,[x,y+1.46,z],[Math.PI,0,0],[1,1,.2]);}
function merlonWall(b:Builder,from:number,to:number,y:number,z:number){box(b,to-from,.7,.4,C.stone,(from+to)/2,y,z);for(let x=from;x<to-.2;x+=.9)box(b,.5,.36,.4,C.stone,x+.25,y+.7,z);}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'guaita-first-tower-and-flag','cesta-second-tower','montale-third-tower','battlemented-wall-walk','sheer-limestone-cliff','palazzo-pubblico-clock-tower-and-liberty-statue','basilica-columned-porch','cable-car-to-the-ridge','crossbow-targets-and-bunting']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(37400),detail=new T.Group();detail.name='titano-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  mountain(detail,finish,r,low);towers(detail,flagMaterial(sanMarinoFlag()),low);town(detail,finish,r,low);
  const hills=new T.Group();hills.name='romagna-hills';detail.add(hills);const m=new Builder(.5);for(const [dx,w,h] of [[-70,70,13],[20,80,16],[120,76,14],[215,70,12]] as const)m.add(new T.SphereGeometry(1,low?10:16,low?6:10),dx%60?'#8faa6e':'#83a064',[dx,-5,-104],[0,0,0],[w,h,16],.1);m.mesh(hills,vertexMaterial(.98),'rolling-green-hills');
  const pines:Placement[]=[],cypresses:Placement[]=[];for(let k=0;k<(low?10:26);k++){const x=titano.ridge[0]+8+r()*(titano.ridge[1]-titano.ridge[0]-16);if(Math.abs(x-titano.guaitaX)<8||Math.abs(x-titano.cestaX)<7||Math.abs(x-titano.montaleX)<4)continue;pines.push({x,y:crest(x)-.1,z:titano.ridgeZ-6-r()*8,scale:.6+r()*.4,rotation:r()*6});}
  for(let k=0;k<(low?6:14);k++)cypresses.push({x:-40+r()*(finish+100),y:titano.townTop,z:-29.6-r()*.8,scale:.6+r()*.3,rotation:r()*6});plantGrove(detail,'stone-pine',pines,{low,name:'ridge-pines'});plantGrove(detail,'cypress',cypresses.filter(t=>t.x<titano.ridge[0]-1||t.x>titano.ridge[1]+1),{low,name:'town-cypresses'});
  const line=cableCar(detail,low),swifts=createFlock(detail,{name:'titano-swifts',count:low?6:12,centre:[finish*.5,11,-22],radius:[36,2.5,4],speed:.3,size:.5,color:'#2c2f36',wing:'#3a3e46',seed:179});
  let reduced=context.reducedMotion;const ride=(time:number)=>{line.cabin.position.copy(line.foot).lerp(line.head,(Math.sin(time*.14-Math.PI/2)+1)/2);};ride(8);swifts.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;ride(time+8);swifts.update(time);},setReducedMotion(value){reduced=value;swifts.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.6)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*139+Math.round(definition.x),from=-w/2+.3,to=w/2-.3,y=surface(0);
  if(t==='ground'){bunting(b,from,to,y,rear);if(w>4.4)target(b,to-1,y,rear+.5);lampPost(b,glow,from+.4,y,rear+.4);}
  else if(t==='cliff'){merlonWall(b,from,to,Math.min(surface(from),surface(to)),rear);pottedTree(b,from+.7,surface(from+.7),rear+.55,.7,{pot:'#c98a5a',trunk:'#5a4636',leaf:C.leaf},seed);}
  else if(t==='rooftop'){chimneyStack(b,from+.6,y,rear+.1,2,{brick:C.stone,cap:C.stoneDark,pot:C.tile});if(w>4.4)chimneyStack(b,to-.8,y,rear+.1,1,{brick:C.stone,cap:C.stoneDark,pot:C.tile});}
  else if(t==='terrace'){balustrade(b,from,to,y,rear,{rail:C.trim,base:C.stoneDark,baluster:C.white});target(b,from+1,y,rear+.6);if(w>5)bench(b,to-1.4,y,rear+.5);if(w>8)pottedTree(b,0,y,rear+.6,.75,{pot:'#c98a5a',trunk:'#5a4636',leaf:C.leaf},seed);}
  else if(t==='rock'){pottedTree(b,(seed%2?.3:-.3),surface(0),rear+.4,.6,{pot:C.stoneDark,trunk:'#5a4636',leaf:C.leaf},seed);}
  finishProps(root,b,glow,'san-marino-targets-bunting-and-walls');
 },
};
