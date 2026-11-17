import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cyl} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial} from '../kit/common';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,finishProps,flagMaterial,glowMaterial,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Slovenia: the underground canyon of the Škocjan Caves (SRS-632.40). The
 * river runs through a great dark hall. Along the far wall goes the
 * visitors' path on its rock ledge, railed and lit by lamps, under a roof
 * hung with stalactites. On the way stand the stepped rimstone pools, the
 * great stalagmites called the Giants, the high slender bridge over the
 * side chasm with stairs climbing to it and the flag at its head, and the
 * flowstone curtain called the Organ. At the end the cave opens into a
 * collapsed valley: daylight, green slopes, a waterfall and the village
 * church on the rim. Bats flit under the roof. The route carries
 * stalagmites, lamps, steel railings and pale cave salamanders. Scenery
 * only: nothing collides. */
const C={rock:'#857d70',rockDark:'#6f685d',rockDeep:'#544e46',flow:'#ddd1b8',flowDark:'#c6b89c',pool:'#8fc6c0',steel:'#a8b0b4',iron:'#2a2c30',lamp:'#ffd98a',olm:'#f2b8b0',white:'#f8f5ee',foam:'#e6f2f0',leaf:'#6f9a52',leafDark:'#587f42',cliff:'#b9b2a2',roofRed:'#b5593c'} as const;
const base=europeEnvironment('SVN',{landmark:false,flat:true,town:false});
export const skocjan={ledgeTop:1.5,ledgeZ:-18,wallZ:-31,roof:12.5,chasm:[86,102],bridgeY:7.6,poolsX:40,giants:[58,66,74],organX:132} as const;
/** Where the cave opens to daylight: the last stretch of the route. */
export const doline=(finish:number)=>[finish-16,finish+12] as const;

/** A stalagmite built of stacked, narrowing lumps. */
function stalagmite(b:Builder,x:number,y:number,z:number,h:number,radius:number,seed:number){const lumps=Math.max(2,Math.round(h/.9)),taper=(t:number)=>radius*(1-t*.82);for(let k=0;k<lumps;k++){const t=k/lumps,cx=x+Math.sin(seed+k)*radius*.06;b.add(new T.CylinderGeometry(taper(t+1/lumps)*.9,taper(t)*1.06,h/lumps+.04,8),(seed+k)%2?C.flow:C.flowDark,[cx,y+h*(t+.5/lumps),z]);}b.add(new T.SphereGeometry(taper(1)*.9,8,6),C.flow,[x,y+h,z],[0,0,0],[1,1.6,1]);}

function hall(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='cave-hall-walls-and-roof';root.add(group);const rock=new Builder(),{ledgeTop:top,ledgeZ:lz,wallZ:wz,roof,chasm}=skocjan,[da,db]=doline(finish),from=-58,to=finish+100,open=(x:number)=>x>chasm[0]&&x<chasm[1]||x>da&&x<db;
 // The ledge that carries the path, with a broken rock face down to the river.
 for(const [a,b] of [[from,chasm[0]],[chasm[1],to]] as const)box(rock,b-a,top+5,wz-lz+3,C.rock,(a+b)/2,-5,(lz+wz)/2-1.5);
 for(let x=from,k=0;x<to;x+=low?4.4:2.2,k++)if(!(x>chasm[0]+1&&x<chasm[1]-1))rock.add(new T.DodecahedronGeometry(1,0),k%2?C.rock:C.rockDark,[x,-1.6+(k%3)*1,lz-.2-(k%2)*.3],[k,k*2,0],[1.9+(k%3)*.4,1.7+(k%2)*.4,1.2],.08);
 // The back wall in tall uneven columns, the roof slabs, and the dark end of the side chasm.
 for(let x=from,k=0;x<to;x+=3,k++){if(open(x+1.5))continue;const set=r()*2;box(rock,3.1,roof+11,5,k%2?C.rock:C.rockDark,x+1.5,-5,wz-2.5-set);if(!low||k%2)for(let y=top+1.4,j=0;y<roof+2;y+=3.2,j++)rock.add(new T.DodecahedronGeometry(1,0),(k+j)%2?C.rockDark:C.rock,[x+1.5,y,wz-set+.3],[k,j*2,0],[2,1.9,1.1],.08);}
 for(let x=from,k=0;x<to;x+=6,k++)box(rock,6.1,5,24,k%2?C.rockDeep:C.rockDark,x+3,roof+r()*1.4,-25);
 for(const side of chasm)for(let z=wz,k=0;z>wz-20;z-=low?5:2.5,k++)box(rock,3,roof+11,2.6,k%2?C.rockDark:C.rockDeep,side+(side===chasm[0]?-1.5:1.5),-5,z-1.3);box(rock,chasm[1]-chasm[0]+6,roof+11,2,C.rockDeep,(chasm[0]+chasm[1])/2,-5,wz-21);
 // The rim of the opening to daylight.
 for(let k=0;k<(low?8:16);k++){const a=k/(low?8:16)*Math.PI,x=(da+db)/2+Math.cos(a)*(db-da)/2,y=top+Math.sin(a)*(roof-top+1);rock.add(new T.DodecahedronGeometry(1,0),k%2?C.rock:C.rockDark,[x,y,wz+.2],[k,k*2,0],[2.4,2.2,1.3],.08);}
 rock.mesh(group,vertexMaterial(.98),'ledge-back-wall-and-roof');group.userData={feature:'Underground canyon hall'};
}

function dripstone(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='stalactites-giants-pools-and-organ';root.add(group);const b=new Builder(),w=new Builder(),{ledgeTop:top,roof,wallZ:wz,chasm,poolsX:px,organX:ox}=skocjan,[da,db]=doline(finish);
 // Stalactites hanging from the roof, and small stalagmites on the ledge.
 for(let k=0;k<(low?60:150);k++){const x=-50+r()*(finish+130),z=-15-r()*14,len=1.4+r()*3.4;if(x>da-2&&x<db+2&&z<-24)continue;b.add(new T.ConeGeometry(.2+r()*.3,len,6),k%3?C.flow:C.flowDark,[x,roof-len/2+.2,z],[Math.PI,0,0]);}
 for(let k=0;k<(low?24:60);k++){const x=-50+r()*(finish+130),z=-22-r()*7;if(x>chasm[0]-12&&x<chasm[1]+12||Math.abs(x-px)<8||Math.abs(x-ox)<6||x>da-2&&x<db+2)continue;stalagmite(b,x,top,z,.8+r()*2,.3+r()*.3,k);}
 // The Giants: three great stalagmites, the middle one joined to the roof.
 skocjan.giants.forEach((x,k)=>{stalagmite(b,x,top,-26-k%2,k===1?roof-top-2:5.4+k,1.5+k*.1,k*3);if(k===1)b.add(new T.ConeGeometry(1.1,4,8),C.flow,[x,roof-1.8,-27],[Math.PI,0,0]);});
 // The rimstone pools: pans of pale water stepping down to the edge.
 for(let k=0;k<5;k++){const radius=2.6-k*.2,y=top+1.6-k*.36,z=-27.4+k*1.9,x=px+(k%2?.8:-.6);b.add(new T.CylinderGeometry(radius,radius+.2,.4,low?10:18),k%2?C.flow:C.flowDark,[x,y,z]);w.add(new T.CylinderGeometry(radius-.22,radius-.22,.06,low?10:18),C.pool,[x,y+.2,z]);}
 // The Organ: a curtain of fluted flowstone down the wall.
 for(let k=0;k<(low?6:11);k++){const x=ox-4+k*(low?1.6:.8),len=6+((k*7)%5)*.9;cyl(b,.42,.5,len,k%2?C.flow:C.flowDark,x,roof-len-.4,wz+.7,8);b.add(new T.SphereGeometry(.5,8,6),k%2?C.flow:C.flowDark,[x,roof-len-.4,wz+.7],[0,0,0],[1,1.6,1]);}
 // Foam where the river breaks on rocks.
 for(let k=0;k<(low?8:20);k++){const x=-40+r()*(finish+90);w.add(new T.SphereGeometry(.4,6,4),C.foam,[x,-2.36,-14.6-r()*1.2],[0,0,0],[1.6,.2,.8]);}
 b.mesh(group,vertexMaterial(.8),'dripstone');w.mesh(group,vertexMaterial(.3),'pool-water-and-river-foam');group.userData={landmark:'The Giants, the rimstone pools and the Organ',giants:3};
}

function pathAndBridge(root:T.Object3D,flag:T.Material,finish:number,low:boolean){
 const group=new T.Group();group.name='visitor-path-and-high-bridge';root.add(group);const s=new Builder(),p=new Builder(),glow=new Builder(),{ledgeTop:top,ledgeZ:lz,chasm:[a,b],bridgeY:up}=skocjan,z=-24,from=-56,to=finish+96,rise=10;
 const rail=(x0:number,y0:number,x1:number,y1:number,rz:number)=>{const n=Math.max(1,Math.round(Math.abs(x1-x0)/1.6));for(let k=0;k<=n;k++){const t=k/n;box(p,.06,.95,.06,C.steel,x0+(x1-x0)*t,y0+(y1-y0)*t,rz);}for(const dy of [.5,.92])p.strut(new T.Vector3(x0,y0+dy,rz),new T.Vector3(x1,y1+dy,rz),.03,C.steel,4,1);};
 const lamp=(x:number,y:number,lzz:number)=>{cyl(p,.05,.06,.8,C.iron,x,y,lzz,5);glow.add(new T.SphereGeometry(.14,8,6),C.lamp,[x,y+.9,lzz]);};
 // Railing and lamps along the ledge, either side of the chasm.
 for(const [x0,x1] of [[from,a-rise-1],[b+rise+1,to]] as const){rail(x0,top,x1,top,lz-.9);for(let x=x0+4;x<x1;x+=low?16:8)lamp(x,top,lz-1.3);}
 // Stairs up to the bridge on both sides.
 const steps=low?7:14;for(const [foot,head] of [[a-rise,a],[b+rise,b]] as const){for(let k=0;k<steps;k++){const t=(k+.5)/steps,x=foot+(head-foot)*t;box(s,Math.abs(head-foot)/steps+.04,(up-top)*(k+1)/steps,2.2,k%2?C.rock:C.rockDark,x,top,z);}rail(foot,top,head,up,z+1);lamp((foot+head)/2,(top+up)/2,z+1.3);}
 // The bridge: a thin deck on a shallow arch, high over the chasm.
 box(s,b-a+1,.34,2.2,C.rockDark,(a+b)/2,up-.34,z);const span=b-a,n=low?8:16;for(let k=0;k<n;k++){const t0=k/n,t1=(k+1)/n,arc=(t:number)=>new T.Vector3(a+span*t,up-.5-Math.sin(Math.PI*t)*-2.2-2.2,z);s.strut(arc(t0),arc(t1),.26,C.rock,6,1);if(k%2===0&&k)s.strut(arc(t0),new T.Vector3(a+span*t0,up-.4,z),.1,C.rockDark,5,1);}
 for(const rz of [z-1,z+1])rail(a,up,b,up,rz);for(const x of [a+2,(a+b)/2,b-2])lamp(x,up,z+1.2);
 cyl(p,.05,.06,2.8,C.iron,b+.6,up,z-.9,5);s.mesh(group,vertexMaterial(.97),'stairs-deck-and-arch');p.mesh(group,vertexMaterial(.5),'steel-railings-lamp-posts-and-mast');const lamps=glow.mesh(group,glowMaterial(C.lamp,1.1),'path-lamps');lamps.castShadow=false;
 wavingFlag(group,flag,b+.66,up+2.1,z-.9,1.6,'slovenia-flag',.6);group.userData={landmark:'High bridge over the chasm'};
}

function daylight(root:T.Object3D,finish:number,low:boolean){
 const group=new T.Group();group.name='collapsed-valley-in-daylight';root.add(group);const sky=new Builder(),green=new Builder(),pale=new Builder(),[a,b]=doline(finish),mid=(a+b)/2,z=skocjan.wallZ-13;
 sky.add(new T.PlaneGeometry(b-a+14,34),'#cfe9f7',[mid,10,z-6]);
 // Sunlit slopes, trees, the cliff, the waterfall and the church on the rim.
 green.add(new T.SphereGeometry(1,low?10:16,low?6:10),C.leaf,[mid-6,-4,z],[0,0,0],[16,9,6]);green.add(new T.SphereGeometry(1,low?10:16,low?6:10),C.leafDark,[mid+8,-4,z+1.5],[0,0,0],[13,7,5]);for(let k=0;k<(low?6:14);k++){const x=a+2+k*(b-a-4)/(low?5:13),y=-1+Math.sin(k*1.7)*1.2+(k%3);green.add(new T.ConeGeometry(.9,2.6,6),k%2?C.leafDark:C.leaf,[x,y+3,z+3+(k%2)]);}
 pale.add(new T.BoxGeometry(11,10,3),C.cliff,[mid-7,2,z-2]);pale.add(new T.BoxGeometry(.9,9.4,.2),C.white,[mid-3.6,2.2,z-.4]);pale.add(new T.BoxGeometry(2.6,1.7,2),C.white,[mid-8,7.85,z-2]);pale.add(new T.BoxGeometry(2.9,.5,2.3),C.roofRed,[mid-8,8.95,z-2]);pale.add(new T.BoxGeometry(.9,2.8,.9),C.white,[mid-9.8,8.4,z-2]);pale.add(new T.ConeGeometry(.66,2,4),C.roofRed,[mid-9.8,10.8,z-2],[0,Math.PI/4,0]);
 // Daylight is not dimmed by the cave's haze.
 const lit=(b:Builder,color:string,strength:number,name:string)=>{const material=glowMaterial(color,strength);material.fog=false;b.mesh(group,material,name).castShadow=false;};lit(sky,'#bfe2f6',1,'open-sky');lit(green,'#5f8a46',.5,'sunlit-slopes-and-trees');lit(pale,'#fff4dc',.45,'cliff-waterfall-and-village-church');group.userData={feature:'Velika dolina'};
}

/** White, blue and red bands, with the shield of Triglav near the hoist. */
const slovenianFlag=()=>pixelTexture(96,(u,v)=>{const x=(u-.25)*2,y=v-.68;if(Math.abs(x)<.14&&y>-.16&&y<.16&&!(y<-.04&&Math.hypot(x/.14,(y+.04)/.12)>1)){if(y<.02+.1*(1-Math.abs(x)/.09)&&y>-.08&&Math.abs(x)<.09||y<-.02-Math.abs(Math.abs(x)-.07)*.9&&y>-.08)return[255,255,255,255];return[0,82,165,255];}return v>.667?[255,255,255,255]:v>.333?[0,82,165,255]:[237,28,36,255];},true,false);

// Route furniture, in a platform's own coordinates, behind the walking lane.
function caveLamp(b:Builder,glow:Builder,x:number,y:number,z:number){cyl(b,.05,.06,.7,C.iron,x,y,z,5);glow.add(new T.SphereGeometry(.12,8,6),C.lamp,[x,y+.8,z]);}
/** The pale, blind cave salamander. */
function olm(b:Builder,x:number,y:number,z:number,seed:number){const turn=seed%2?1:-1;b.strut(new T.Vector3(x-.3*turn,y+.05,z),new T.Vector3(x+.14*turn,y+.06,z+.05),.04,C.olm,5,.8);b.strut(new T.Vector3(x+.14*turn,y+.06,z+.05),new T.Vector3(x+.34*turn,y+.07,z),.045,C.olm,5,.7);for(const dx of [-.12,.14])for(const side of [-1,1])box(b,.02,.02,.1,C.olm,x+dx*turn,y+.02,z+side*.08);for(const side of [-1,1])box(b,.03,.03,.05,'#d86a6a',x+.24*turn,y+.08,z+side*.06);}
function steelRail(b:Builder,from:number,to:number,surface:(x:number)=>number,z:number){for(let x=from;x<=to+.01;x+=1.4){box(b,.06,.95,.06,C.steel,x,surface(x),z);if(x+1.4<=to+.01)for(const dy of [.5,.92])b.strut(new T.Vector3(x,surface(x)+dy,z),new T.Vector3(x+1.4,surface(x+1.4)+dy,z),.028,C.steel,4,1);}}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'underground-canyon-hall','stalactites-under-the-roof','the-giants-stalagmites','rimstone-pools','the-organ-flowstone-curtain','high-bridge-over-the-chasm','lit-visitor-path','collapsed-valley-in-daylight','bats','cave-salamanders']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(38600),detail=new T.Group();detail.name='skocjan-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  hall(detail,finish,r,low);dripstone(detail,finish,r,low);pathAndBridge(detail,flagMaterial(slovenianFlag()),finish,low);daylight(detail,finish,low);
  const bats=createFlock(detail,{name:'cave-bats',count:low?8:16,centre:[finish*.5,8,-13],radius:[44,2,3],speed:.5,size:.42,color:'#26242a',wing:'#34313a',seed:223});
  let reduced=context.reducedMotion;bats.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;bats.update(time);},setReducedMotion(value){reduced=value;bats.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||t==='water-raft'||t==='climb-wall'||w<2.6)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*179+Math.round(definition.x),from=-w/2+.3,to=w/2-.3,y=surface(0);
  if(t==='cave'){stalagmite(b,from+.5,surface(from+.5),rear,1.2+(seed%3)*.3,.3,seed);stalagmite(b,from+1.1,surface(from+1.1),rear+.1,.7,.22,seed+1);caveLamp(b,glow,to-.5,surface(to-.5),rear+.3);if(w>4.4)olm(b,.3,y,rear+.5,seed);if(w>7)stalagmite(b,to-1.6,surface(to-1.6),rear,1,.28,seed+2);}
  else if(t==='rock'||t==='ice-shelf'){stalagmite(b,(seed%2?.4:-.4),surface(0),rear,.9+(seed%3)*.2,.26,seed);}
  else if(t==='ground'||t==='bridge'){steelRail(b,from,to,surface,rear);caveLamp(b,glow,from+.3,surface(from+.3),rear+.34);if(t==='ground'&&w>4.4)olm(b,to-1,y,rear+.5,seed);}
  else if(t==='stairs'||t==='slope'){steelRail(b,from,to,surface,rear);}
  finishProps(root,b,glow,'skocjan-stalagmites-lamps-and-railings');
 },
};
