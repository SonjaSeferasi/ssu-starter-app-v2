import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cyl,roof} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,bench,chimneyStack,drumDome,finishProps,flagMaterial,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Moldova: the survey point of the Struve Arc at Rudi (SRS-632.38). On a
 * low hill among the fields stands the dark stone marker of the point,
 * with its bronze globe, and over it the tall timber signal tower the
 * surveyors sighted on; smaller signals stand on the far hills, as the
 * chain of triangles ran from hill to hill. Around it lie sunflower
 * fields, vine rows and striped farmland; a village of white houses with
 * blue porches, a roofed well and a wayside cross; a small monastery
 * church; and storks on their pole-top nests. The route carries
 * surveyors' theodolites and striped ranging poles, sunflowers and wattle
 * fences. Scenery only: nothing collides. */
const C={grass:'#8fae62',grassDark:'#7c9c54',hill:'#88a85c',sun:'#f4c62a',sunDark:'#6a4a2a',stalk:'#5f8f3f',wheat:'#e0c878',earth:'#9a7a58',vine:'#5f8f3f',white:'#f8f5ee',blue:'#3f7fbf',blueDark:'#2f5f95',tin:'#9aa4a8',tile:'#a8604a',stone:'#3a3d42',stoneLight:'#cfc8b8',bronze:'#b08a3a',
 timber:'#7a5c40',timberDark:'#5a4230',iron:'#22262a',gold:'#e0b030',shade:'#3a2e26',glass:'#3a4652',red:'#d8232a',wattle:'#8a6a48',nest:'#6a5238',brass:'#c9a24a',dome:'#5f8f7a'} as const;
const base=europeEnvironment('MDA',{landmark:false,flat:true,town:false});
export const struve={fieldTop:-1,point:[62,-36,4.5],sunflowers:[42,82],vines:[86,114],wellX:24,crossX:34,churchX:100,houses:[-26,-14,-2,10,130],storks:[38,116]} as const;
const hillY=(x:number,z:number)=>{const [cx,cz,top]=struve.point,dx=(x-cx)/18,dz=(z-cz)/10,inside=1-dx*dx-dz*dz;return inside<=0?struve.fieldTop:Math.max(struve.fieldTop,-5+(top+5)*Math.sqrt(inside));};

function fields(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='sunflower-fields-and-vineyards';root.add(group);const g=new Builder(),f=new Builder(),top=struve.fieldTop,from=-60,to=finish+100,[cx,cz,ht]=struve.point;
 box(g,to-from,top+5,36,C.grass,(from+to)/2,-5,-34.5);for(let k=0;k<(low?12:24);k++)g.add(new T.SphereGeometry(1,8,5),C.grassDark,[from+k*(to-from)/(low?12:24)+r()*4,-4.2,-16.3],[0,0,0],[5,2.9,1.4]);g.add(new T.SphereGeometry(1,low?12:20,low?8:12),C.hill,[cx,-5,cz],[0,0,0],[18,ht+5,10],.04);
 // Striped farmland running away behind: sunflowers, wheat, ploughed earth and pasture.
 const strips=[C.sun,C.grassDark,C.wheat,C.earth,C.sun,C.grass,C.wheat] as const;box(g,to-from,top+5,40,C.grassDark,(from+to)/2,-5.02,-72.5);for(let k=0;k<Math.ceil((to-from)/22);k++)box(g,21.4,.1+(k%3)*.1,40,strips[k%strips.length],from+11+k*22,top-.02,-72.5);
 // The sunflower field, every head turned to the route.
 const [sa,sb]=struve.sunflowers,pitch=low?2.2:1.1;for(let z=-18.4,row=0;z>-25.6;z-=1.4,row++)for(let x=sa+(row%2)*.5;x<sb;x+=pitch){const h=1.3+((x*7+row*3)%5)*.08;box(f,.05,h,.05,C.stalk,x,top,z);f.add(new T.CylinderGeometry(.26,.26,.05,low?6:9),C.sun,[x,top+h,z+.04],[Math.PI/2-.2,0,0]);f.add(new T.CylinderGeometry(.11,.11,.07,6),C.sunDark,[x,top+h,z+.06],[Math.PI/2-.2,0,0]);}
 const [va,vb]=struve.vines;for(let z=-18.4;z>-27;z-=low?3.2:1.6){box(g,vb-va,.62,.3,C.vine,(va+vb)/2,top+.3,z);for(let x=va;x<=vb;x+=low?6:3)cyl(g,.04,.05,1.1,C.timberDark,x,top,z,4);}
 g.mesh(group,vertexMaterial(.97),'fields-vine-rows-and-farm-strips');f.mesh(group,vertexMaterial(.8),'sunflowers');group.userData={feature:'Sunflower fields and vineyards'};
}

function surveyPoint(root:T.Object3D,flag:T.Material,low:boolean){
 const group=new T.Group();group.name='struve-point-and-signal-tower';root.add(group);const s=new Builder(),p=new Builder(),[x,z,ht]=struve.point,y=ht-.2;
 // The marker: a dark stone obelisk with a bronze globe, ringed by posts and chains.
 box(s,2.4,.3,2.4,C.stoneLight,x,y,z+2.4);box(s,1.2,.4,1.2,C.stone,x,y+.3,z+2.4);p.add(new T.CylinderGeometry(.16,.42,1.8,4),C.stone,[x,y+1.6,z+2.4],[0,Math.PI/4,0]);p.add(new T.SphereGeometry(.26,10,8),C.bronze,[x,y+2.74,z+2.4]);p.add(new T.TorusGeometry(.3,.025,4,12),C.bronze,[x,y+2.74,z+2.4],[Math.PI/2.4,0,0]);box(p,.5,.34,.04,C.bronze,x,y+.8,z+3.02);
 for(const [dx,dz] of [[-1.4,1],[1.4,1],[-1.4,3.8],[1.4,3.8]] as const)cyl(p,.06,.07,.6,C.iron,x+dx,y,z+dz,5);for(const dz of [1,3.8])p.strut(new T.Vector3(x-1.4,y+.5,z+dz),new T.Vector3(x+1.4,y+.5,z+dz),.02,C.iron,3,1);
 // The signal tower: four timber legs to a platform, and a mast with the sighting target.
 const feet=3,platform=y+5.4,tz=z-.6;for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1]] as const){p.strut(new T.Vector3(x+dx*feet,y,tz+dz*feet),new T.Vector3(x+dx*.7,platform,tz+dz*.7),.12,C.timber,5,.8);}
 for(const t of [.3,.62])for(const [ax,az,bx,bz] of [[-1,1,1,1],[-1,-1,1,-1],[-1,-1,-1,1],[1,-1,1,1]] as const){const reach=feet-(feet-.7)*t,yy=y+(platform-y)*t;p.strut(new T.Vector3(x+ax*reach,yy,tz+az*reach),new T.Vector3(x+bx*reach,yy,tz+bz*reach),.06,C.timberDark,4,1);}
 if(!low)for(const side of [-1,1]){p.strut(new T.Vector3(x-feet,y,tz+side*feet),new T.Vector3(x+(feet-(feet-.7)*.3),y+(platform-y)*.3,tz+side*(feet-(feet-.7)*.3)),.05,C.timberDark,4,1);p.strut(new T.Vector3(x+feet,y,tz+side*feet),new T.Vector3(x-(feet-(feet-.7)*.3),y+(platform-y)*.3,tz+side*(feet-(feet-.7)*.3)),.05,C.timberDark,4,1);}
 box(p,1.9,.12,1.9,C.timber,x,platform,tz);for(const [dx,dz] of [[-.9,-.9],[.9,-.9],[-.9,.9],[.9,.9]] as const)cyl(p,.04,.04,.8,C.timberDark,x+dx,platform,tz+dz,4);box(p,1.9,.05,.05,C.timberDark,x,platform+.8,tz+.9);cyl(p,.06,.08,2.2,C.timber,x,platform,tz,5);cyl(p,.3,.3,.5,C.white,x,platform+2.2,tz,8);cyl(p,.31,.31,.17,C.iron,x,platform+2.37,tz,8);
 cyl(p,.05,.07,4.2,C.iron,x+6,y-1,z+3,5);s.mesh(group,vertexMaterial(.9),'marker-base-and-obelisk-plinth');p.mesh(group,vertexMaterial(.8),'obelisk-globe-signal-tower-and-mast');wavingFlag(group,flag,x+6.06,y+2.5,z+3,2,'moldova-flag',.5);group.userData={landmark:'Struve Geodetic Arc point at Rudi'};
}

function village(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='moldovan-village';root.add(group);const s=new Builder(),p=new Builder(),y=struve.fieldTop;
 // White houses with a blue porch on posts and blue window frames.
 struve.houses.forEach((x,k)=>{const w=5.4+(k%2)*.8,z=-22.4-(k%2)*1.6;box(s,w,2.4,4,C.white,x,y+.2,z-2);box(s,w+.6,.2,5.4,C.blueDark,x,y,z-1.6);p.add(new T.ConeGeometry(w*.76,1.7,4),k%2?C.tin:C.tile,[x,y+3.45,z-1.7],[0,Math.PI/4,0],[1,1,.74]);
  for(let j=0;j<(low?3:5);j++)cyl(p,.07,.08,2.2,C.blue,x-w/2+.2+j*(w-.4)/(low?2:4),y+.2,z+.9,5);box(p,w,.1,.1,C.blue,x,y+2.4,z+.9);for(const dx of [-w*.28,w*.28]){box(p,.7,.9,.06,C.glass,x+dx,y+1.1,z+.03);for(const side of [-1,1])box(p,.08,1,.07,C.blue,x+dx+side*.39,y+1.05,z+.04);box(p,.86,.08,.07,C.blue,x+dx,y+2,z+.04);box(p,.86,.08,.07,C.blue,x+dx,y+1.02,z+.04);}box(p,.8,1.7,.06,C.blueDark,x,y+.2,z+.03);
  for(let fx=x-w/2-.6;fx<x+w/2+.6;fx+=low?.8:.4)box(p,.1,.7,.05,j2(fx)?C.blue:C.white,fx,y,z+2.4);});
 // The roofed well and the wayside cross.
 const wx=struve.wellX,wz=-20.6;cyl(s,.7,.7,.8,C.stoneLight,wx,y,wz,low?8:12);for(const [dx,dz] of [[-.8,-.8],[.8,-.8],[-.8,.8],[.8,.8]] as const)cyl(p,.06,.07,2.3,C.blue,wx+dx,y,wz+dz,5);p.add(new T.ConeGeometry(1.5,.9,4),C.tin,[wx,y+2.75,wz],[0,Math.PI/4,0]);box(p,1.7,.08,.08,C.timberDark,wx,y+1.5,wz);cyl(p,.12,.1,.24,C.tin,wx+.2,y+.9,wz,8);p.add(new T.SphereGeometry(.08,6,5),C.gold,[wx,y+3.3,wz]);
 const cx=struve.crossX,cz=-20;box(p,.14,2.4,.14,C.timberDark,cx,y,cz);box(p,1.1,.14,.14,C.timberDark,cx,y+1.7,cz);roof(p,1.6,.4,.8,C.tin,cx,y+2.4,cz);box(s,.8,.2,.8,C.stoneLight,cx,y,cz);
 s.mesh(group,vertexMaterial(.95),'white-house-walls-and-well-shaft');p.mesh(group,vertexMaterial(.75),'blue-porches-roofs-fences-well-roof-and-cross');group.userData={feature:'Village, well and wayside cross',houses:struve.houses.length};
}
const j2=(x:number)=>Math.round(x*2.5)%2===0;

function churchAndStorks(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='rudi-monastery-church';root.add(group);const s=new Builder(),p=new Builder(),x=struve.churchX,y=struve.fieldTop,z=-31.5;
 box(s,4.6,4,8,C.white,x,y,z-4);roof(p,4.9,1.3,8.3,C.dome,x,y+4,z-4,Math.PI/2);archedWindow(s,p,x,y,z+.04,1,2,{frame:C.blue,glass:C.shade});box(s,2.2,6.4,2.2,C.white,x,y,z-.6);archedWindow(s,p,x,y+4.6,z+.52,.6,1.1,{frame:C.blue,glass:C.shade});drumDome(s,p,x,y+6.4,z-.6,.9,.5,{wall:C.white,trim:C.blue,dome:C.dome,finial:C.gold,glass:C.shade},{low,sides:8,cross:true});drumDome(s,p,x,y+5,z-5.4,1.3,.9,{wall:C.white,trim:C.blue,dome:C.dome,finial:C.gold,glass:C.shade},{low,sides:8,cross:true});
 s.mesh(group,vertexMaterial(.95),'white-church-and-bell-tower');p.mesh(group,vertexMaterial(.6),'green-domes-and-blue-frames');group.userData={landmark:'Rudi monastery church'};
 const nests=new T.Group();nests.name='stork-nests';root.add(nests);const b=new Builder();for(const sx of struve.storks){const sz=-21.4;cyl(b,.1,.14,5.6,C.timberDark,sx,y,sz,6);cyl(b,.8,.6,.3,C.nest,sx,y+5.6,sz,low?8:12);
  b.add(new T.SphereGeometry(.3,8,6),C.white,[sx,y+6.5,sz],[0,0,0],[1.5,.9,.8]);b.add(new T.SphereGeometry(.2,6,5),C.iron,[sx-.3,y+6.5,sz],[0,0,0],[1.2,.7,.82]);b.strut(new T.Vector3(sx+.3,y+6.6,sz),new T.Vector3(sx+.5,y+7.2,sz),.05,C.white,5,.8);b.strut(new T.Vector3(sx+.5,y+7.2,sz),new T.Vector3(sx+.9,y+7.1,sz),.03,C.red,4,.4);for(const dx of [-.06,.06])box(b,.03,.6,.03,C.red,sx+dx,y+5.9,sz);}
 b.mesh(nests,vertexMaterial(.85),'poles-nests-and-storks');nests.userData={feature:'White storks'};
}

/** Blue, yellow and red upright bands, with the eagle and shield in the middle. */
const moldovanFlag=()=>pixelTexture(96,(u,v)=>{const x=(u-.5)*2,y=v-.5;if(Math.abs(x)<.08&&Math.abs(y+.04)<.11)return y>-.04?[204,9,47,255]:[0,70,174,255];if(Math.hypot(x/.2,(y-.02)/.22)<1&&Math.abs(x)<.26)return[120,84,48,255];return u<.333?[0,70,174,255]:u<.667?[255,210,0,255]:[204,9,47,255];},true,false);

// Route furniture, in a platform's own coordinates, behind the walking lane.
function sunflowers(b:Builder,x:number,y:number,z:number,seed:number){for(let k=0;k<3;k++){const dx=(k-1)*.34,h=1+((seed+k)%3)*.16;box(b,.045,h,.045,C.stalk,x+dx,y,z);b.add(new T.CylinderGeometry(.2,.2,.05,8),C.sun,[x+dx,y+h,z+.04],[Math.PI/2-.2,0,0]);b.add(new T.CylinderGeometry(.09,.09,.07,6),C.sunDark,[x+dx,y+h,z+.06],[Math.PI/2-.2,0,0]);}}
/** A surveyor's theodolite on its tripod. */
function theodolite(b:Builder,x:number,y:number,z:number){const head=new T.Vector3(x,y+1.15,z);for(let k=0;k<3;k++){const a=k/3*Math.PI*2+.5;b.strut(new T.Vector3(x+Math.cos(a)*.42,y,z+Math.sin(a)*.3),head,.03,C.timber,4,.8);}cyl(b,.12,.12,.06,C.brass,x,y+1.15,z,10);box(b,.08,.26,.16,C.brass,x,y+1.21,z);b.add(new T.CylinderGeometry(.045,.055,.42,8),C.brass,[x,y+1.44,z],[0,0,Math.PI/2]);b.add(new T.TorusGeometry(.1,.015,4,10),C.brass,[x,y+1.34,z+.09]);}
/** A ranging pole: red and white bands. */
function rangingPole(b:Builder,x:number,y:number,z:number){for(let k=0;k<6;k++)cyl(b,.03,.03,.34,k%2?C.white:C.red,x,y+k*.34,z,6);b.add(new T.ConeGeometry(.03,.1,6),C.iron,[x,y+2.09,z]);}
function wattle(b:Builder,from:number,to:number,y:number,z:number){for(let x=from;x<=to+.01;x+=.7)cyl(b,.04,.05,.9,C.timberDark,x,y,z,5);for(let k=0;k<4;k++)box(b,to-from+.1,.1,.06,k%2?C.wattle:C.timber,(from+to)/2,y+.14+k*.18,z+(k%2?.03:-.03));}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'struve-point-marker-and-bronze-globe','timber-signal-tower','far-signals-on-the-hills','sunflower-fields','vine-rows-and-striped-farmland','white-houses-with-blue-porches','roofed-well-and-wayside-cross','monastery-church','storks-on-pole-top-nests','theodolites-and-ranging-poles']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(37300),detail=new T.Group();detail.name='struve-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  fields(detail,finish,r,low);surveyPoint(detail,flagMaterial(moldovanFlag()),low);village(detail,low);churchAndStorks(detail,low);
  // Far hills, each with its own small signal: the next points of the chain.
  const chain=new T.Group();chain.name='far-hills-and-signals';detail.add(chain);const m=new Builder(.5),q=new Builder();for(const [dx,w,h] of [[-40,60,13],[30,70,16],[110,66,14],[190,60,12]] as const){m.add(new T.SphereGeometry(1,low?10:16,low?6:10),dx%60?'#86a660':'#7c9c58',[dx,-5,-104],[0,0,0],[w,h,16],.1);if(dx===30||dx===110){const top=h-5.2;for(const [a,c] of [[-1,-1],[1,-1],[-1,1],[1,1]] as const)q.strut(new T.Vector3(dx+a*1.6,top,-100+c*1.6),new T.Vector3(dx,top+5,-100),.1,C.timberDark,4,.7);cyl(q,.24,.24,.5,C.white,dx,top+5,-100,6);}}
  m.mesh(chain,vertexMaterial(.98),'rolling-far-hills');q.mesh(chain,vertexMaterial(.85),'far-signal-towers');
  const trees:Placement[]=[];for(let k=0;k<(low?12:30);k++){const x=-44+r()*(finish+104),z=-30-r()*20;if(Math.hypot(x-struve.point[0],(z-struve.point[1])*1.6)<9||Math.abs(x-struve.churchX)<5&&z>-42)continue;trees.push({x,y:hillY(x,z)-.1,z,scale:.6+r()*.4,rotation:r()*6});}plantGrove(detail,'plane',trees,{low,name:'orchard-and-shelter-trees'});
  const storks=createFlock(detail,{name:'white-storks',count:low?3:6,centre:[finish*.5,11,-22],radius:[38,2,6],speed:.13,size:1.4,color:'#f6f4ee',wing:'#26282c',seed:199,glide:true});
  let reduced=context.reducedMotion;storks.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;storks.update(time);},setReducedMotion(value){reduced=value;storks.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.6)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*167+Math.round(definition.x),from=-w/2+.3,to=w/2-.3,y=surface(0);
  if(t==='ground'){wattle(b,from,to,y,rear);sunflowers(b,from+.8,y,rear+.35,seed);if(w>4.4)rangingPole(b,to-.6,y,rear+.4);if(w>7)theodolite(b,.4,y,rear+.6);}
  else if(t==='slope'||t==='stairs'){for(let x=from;x<=to+.01;x+=1.3){cyl(b,.05,.06,.95,C.timberDark,x,surface(x),rear,5);if(x+1.3<=to+.01)b.strut(new T.Vector3(x,surface(x)+.8,rear),new T.Vector3(x+1.3,surface(x+1.3)+.8,rear),.035,C.timber,4,1);}if(t==='slope')sunflowers(b,0,surface(0),rear+.4,seed);}
  else if(t==='rooftop'){chimneyStack(b,from+.6,y,rear+.1,2,{brick:C.white,cap:C.blueDark,pot:C.tile});if(w>4.4)chimneyStack(b,to-.8,y,rear+.1,1,{brick:C.white,cap:C.blueDark,pot:C.tile});}
  else if(t==='terrace'){wattle(b,from,to,y,rear);theodolite(b,from+.9,y,rear+.6);rangingPole(b,from+1.8,y,rear+.4);if(w>5)bench(b,to-1.4,y,rear+.6);}
  else if(t==='rock'){sunflowers(b,(seed%2?.3:-.3),surface(0),rear+.4,seed);}
  finishProps(root,b,glow,'struve-theodolites-ranging-poles-and-sunflowers');
 },
};
