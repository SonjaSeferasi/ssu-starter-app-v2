import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl,onion} from './europe-landmarks';
import {Builder,random,vertexMaterial} from '../kit/common';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,bandedFlagTexture,finishProps,flagMaterial,glowMaterial,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Romania: the reed channels of the Danube Delta (SRS-632.39). Low islands
 * of reed and willow lie across the water. On the largest is a fishing
 * village: white houses with blue frames under steep thatch, a church with
 * blue onion domes, fish drying on racks, nets on poles, and a jetty with
 * black tarred boats and the flag. A wooden bird hide stands on stilts at
 * one end and the old white lighthouse at the other. Pelicans swim in
 * rafts and fly over, herons stand in the shallows, water lilies cover
 * the quiet water and a fisherman rows past. The route carries rope
 * rails, fish racks, reed bundles, nets and storm lanterns. Scenery only:
 * nothing collides. */
const C={mud:'#8f9066',grass:'#8aa85a',reed:'#a3ad55',reedDark:'#86933f',reedTop:'#7a5c3a',thatch:'#bca460',thatchDark:'#9c8648',white:'#f8f5ee',blue:'#3f7fbf',blueDark:'#2f5f95',timber:'#7a5c40',timberDark:'#5a4230',tar:'#24262a',glass:'#3a4652',shade:'#3a2e26',gold:'#e0b030',
 pelican:'#fbf9f2',bill:'#f2a03a',pad:'#4f8a4a',lily:'#fdfcf0',lilyYellow:'#f4d23a',net:'#9fb0a8',fish:'#b9c2c6',willow:'#9ab868',willowDark:'#86a658',trunk:'#5a4636',red:'#c8402f',iron:'#22262a',heron:'#9aa4ac',rope:'#c9b88a',skin:'#d9a37a',shirt:'#3f6a8a'} as const;
const base=europeEnvironment('ROU',{landmark:false,flat:true,town:false});
export const delta={landTop:-1.8,village:[42,84],churchX:70,hideX:14,lighthouseX:112} as const;

function reedClump(b:Builder,x:number,y:number,z:number,count:number,spread:number,r:()=>number){for(let k=0;k<count;k++){const dx=(r()-.5)*spread,dz=(r()-.5)*spread*.6,h=1.5+r()*1.3;box(b,.06,h,.06,k%3?C.reed:C.reedDark,x+dx,y,z+dz,r());if(k%2)box(b,.1,.32,.1,C.reedTop,x+dx,y+h,z+dz);}}
function willowTree(b:Builder,x:number,y:number,z:number,size:number,seed:number){b.strut(new T.Vector3(x,y,z),new T.Vector3(x+.3*Math.sin(seed),y+2.2*size,z),.24*size,C.trunk,6,.6);b.add(new T.SphereGeometry(1,8,6),C.willow,[x+.3*Math.sin(seed),y+3*size,z],[0,0,0],[1.9*size,1.2*size,1.6*size],.06);for(let k=0;k<12;k++){const a=k/12*Math.PI*2+seed;b.add(new T.ConeGeometry(.22*size,2*size,5),k%2?C.willow:C.willowDark,[x+.3*Math.sin(seed)+Math.cos(a)*1.6*size,y+2.2*size,z+Math.sin(a)*1.3*size],[Math.PI,0,0]);}}

function islands(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='reed-islands-and-willows';root.add(group);const g=new Builder(),b=new Builder(),top=delta.landTop,[va,vb]=delta.village;
 const island=(x:number,z:number,rx:number,rz:number,rise=0)=>g.add(new T.CylinderGeometry(1,1.06,1.4,low?12:22),rise?C.grass:C.mud,[x,top-.7+rise,z],[0,0,0],[rx,1,rz]);
 island((va+vb)/2,-29,(vb-va)/2+4,11,.4);const spots:[number,number,number,number][]=[];for(let x=-46;x<finish+70;x+=20){if(x>va-16&&x<vb+10)continue;spots.push([x+r()*6,-25-r()*6,8+r()*4,5+r()*2.4]);}spots.push([delta.hideX,-23,7,4.4],[delta.lighthouseX,-26,8,5.4]);
 for(const [x,z,rx,rz] of spots){island(x,z,rx,rz);const n=low?10:22;for(let k=0;k<n;k++){const a=k/n*Math.PI*2;reedClump(b,x+Math.cos(a)*rx*.86,top,z+Math.sin(a)*rz*.86,low?3:5,1.6,r);}}
 for(let k=0;k<(low?16:36);k++){const a=k/(low?16:36)*Math.PI*2;if(Math.sin(a)>.5&&Math.abs(Math.cos(a))<.5)continue;reedClump(b,(va+vb)/2+Math.cos(a)*((vb-va)/2+3),top,-29+Math.sin(a)*10,low?3:5,1.8,r);}
 // The far reed wall that closes the channel, and willows on the islands.
 for(let x=-56;x<finish+100;x+=low?5:2.5){const h=2.4+r()*1.4;box(b,(low?5:2.5)+.1,h,2.4,x%5<2.5?C.reed:C.reedDark,x,-2.4,-47-r()*2);}
 spots.forEach(([x,z],k)=>{if(k%2===0&&Math.abs(x-delta.hideX)>4&&Math.abs(x-delta.lighthouseX)>5)willowTree(b,x+1,top,z-1,.9+r()*.3,k);});willowTree(b,va-1,top+.4,-31,1.1,2);willowTree(b,vb+1,top+.4,-33,1.2,5);
 g.mesh(group,vertexMaterial(.98),'mud-and-grass-islands');b.mesh(group,vertexMaterial(.9),'reed-beds-reed-wall-and-willows');group.userData={feature:'Reed islands'};
}

function village(root:T.Object3D,flag:T.Material,low:boolean){
 const group=new T.Group();group.name='thatched-fishing-village';root.add(group);const s=new Builder(),p=new Builder(),y=delta.landTop+.4,[va]=delta.village;
 // White houses with blue frames under steep thatch.
 [[va+4,-23.4,5.2],[va+13,-25.4,6],[va+35,-23.6,5.4],[va+43,-26,5.8]].forEach(([x,z,w],k)=>{box(s,w,2.2,4,C.white,x,y,z-2);p.add(new T.ConeGeometry(w*.78,2.4,4),k%2?C.thatch:C.thatchDark,[x,y+3.4,z-2],[0,Math.PI/4,0],[1,1,.72]);box(p,w*.5,.16,.3,C.thatchDark,x,y+4.5,z-2);
  for(const dx of [-w*.28,w*.28]){box(p,.7,.8,.06,C.glass,x+dx,y+.9,z+.03);for(const side of [-1,1])box(p,.09,.9,.07,C.blue,x+dx+side*.39,y+.85,z+.04);box(p,.86,.08,.07,C.blue,x+dx,y+1.7,z+.04);box(p,.86,.08,.07,C.blue,x+dx,y+.84,z+.04);}box(p,.8,1.6,.06,C.blueDark,x,y,z+.03);box(p,w+.2,.14,.1,C.blue,x,y+2.2,z+.06);
  for(let fx=x-w/2-.8;fx<x+w/2+.8;fx+=low?.5:.25)box(p,.05,.8+((fx*40)%3)*.06,.04,C.reedDark,fx,y,z+1.9);});
 // The church with its blue onion domes.
 const cx=delta.churchX,cz=-29;box(s,4.4,3.6,7,C.white,cx,y,cz-3.5);p.add(new T.ConeGeometry(3.3,1.4,4),C.blueDark,[cx,y+4.3,cz-3.5],[0,Math.PI/4,0],[1,1,1.5]);box(s,2,5.6,2,C.white,cx,y,cz+.4);archedWindow(s,p,cx,y,cz+1.42,.9,1.8,{frame:C.blue,glass:C.shade});archedWindow(s,p,cx,y+3.8,cz+1.42,.6,1.1,{frame:C.blue,glass:C.shade});
 for(const [dx,dz,size,up] of [[0,.4,.75,5.6],[0,-4.6,.95,4.9],[-1.4,-2.4,.5,4.6],[1.4,-2.4,.5,4.6]] as const){cyl(s,size*.6,size*.6,.6,C.white,cx+dx,y+up,cz+dz,8);onion(p,size,C.blue,cx+dx,y+up+.6,cz+dz);box(p,.05,.5,.05,C.gold,cx+dx,y+up+.6+size*2.2,cz+dz);box(p,.26,.05,.05,C.gold,cx+dx,y+up+.9+size*2.2,cz+dz);}
 // Fish drying on racks, nets on poles, the jetty, the boats and the flag.
 for(const x of [va+20,va+26]){for(const dx of [-1.2,1.2])cyl(p,.06,.07,1.8,C.timberDark,x+dx,y,-21.6,5);box(p,2.6,.06,.06,C.timberDark,x,y+1.74,-21.6);for(let k=0;k<(low?4:8);k++)p.add(new T.SphereGeometry(.09,6,4),C.fish,[x-1+k*(low?.6:.28),y+1.42,-21.6],[0,0,0],[.6,2.2,.4]);}
 for(const dx of [-.9,.9,2.7])cyl(p,.05,.06,2.2,C.timberDark,va+30+dx,y,-20.6,5);p.add(new T.BoxGeometry(3.6,1.3,.03),C.net,[va+30.9,y+1.4,-20.6]);
 const jx=va+22;box(p,2,.14,7,C.timber,jx,-1.9,-16.4);for(const dz of [-13.4,-15.4,-17.4,-19.4])for(const side of [-1,1])cyl(p,.09,.1,1.6,C.timberDark,jx+side*.9,-2.9,dz,5);cyl(p,.05,.07,4.2,C.iron,jx+.8,-1.76,-13.6,5);
 for(const [bx,bz,turn] of [[jx-2.6,-14.6,.1],[jx+3,-15.2,-.15],[jx-3,-17,.3],[va+38,-18.4,0],[va+2,-18.6,.2]] as const){p.add(new T.SphereGeometry(1,10,5),C.tar,[bx,-2.34,bz],[0,turn,0],[2.1,.26,.4]);box(p,.5,.05,.7,C.timber,bx,-2.2,bz,turn);}
 s.mesh(group,vertexMaterial(.95),'white-houses-and-church-walls');p.mesh(group,vertexMaterial(.85),'thatch-blue-frames-domes-racks-jetty-and-boats');wavingFlag(group,flag,jx+.86,1.9,-13.6,1.8,'romania-flag',.66);group.userData={feature:'Fishing village',landmark:'Lipovan church'};
}

function hideAndLighthouse(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='bird-hide-and-old-lighthouse';root.add(group);const s=new Builder(),p=new Builder(),glow=new Builder(),y=delta.landTop,hx=delta.hideX,hz=-23,lx=delta.lighthouseX,lz=-26;
 for(const [dx,dz] of [[-1.1,-1],[1.1,-1],[-1.1,1],[1.1,1]] as const)p.strut(new T.Vector3(hx+dx*1.3,y,hz+dz*1.3),new T.Vector3(hx+dx,y+3.4,hz+dz),.1,C.timberDark,5,.9);box(p,2.8,.14,2.6,C.timber,hx,y+3.4,hz);box(p,2.6,1.2,2.4,C.timber,hx,y+3.54,hz);box(p,2.2,.4,.06,C.shade,hx,y+4.1,hz+1.22);p.add(new T.ConeGeometry(2.2,1.2,4),C.thatch,[hx,y+5.34,hz],[0,Math.PI/4,0]);
 for(let k=0;k<7;k++)box(p,.5,.06,.2,C.timber,hx+1.9+k*.12,y+.4+k*.44,hz+.9);p.strut(new T.Vector3(hx+1.9,y,hz+1.1),new T.Vector3(hx+2.74,y+3.4,hz+1.1),.05,C.timberDark,4,1);
 // The lighthouse: a white tapered tower with its gallery and red-capped lantern.
 cyl(s,1,1.5,7,C.white,lx,y,lz,low?10:16);cyl(p,1.4,1.4,.16,C.iron,lx,y+7,lz,low?10:16);for(let k=0;k<(low?6:12);k++){const a=k/(low?6:12)*Math.PI*2;box(p,.05,.6,.05,C.iron,lx+Math.cos(a)*1.3,y+7.16,lz+Math.sin(a)*1.3);}p.add(new T.TorusGeometry(1.3,.03,4,low?10:16),C.iron,[lx,y+7.76,lz],[Math.PI/2,0,0]);
 glow.add(new T.CylinderGeometry(.7,.7,1,10),'#fff3c0',[lx,y+7.66,lz]);cone(p,.95,.8,C.red,lx,y+8.16,lz,low?8:12);p.add(new T.SphereGeometry(.1,6,5),C.iron,[lx,y+9.02,lz]);for(const level of [1.6,3.6,5.4])box(p,.36,.6,.06,C.glass,lx,y+level,lz+1.42-level*.07);box(p,.7,1.3,.08,C.red,lx,y,lz+1.5);
 box(s,3.6,2,3,C.white,lx+3.6,y,lz+.4);p.add(new T.ConeGeometry(2.8,1.2,4),C.red,[lx+3.6,y+2.6,lz+.4],[0,Math.PI/4,0],[1,1,.84]);
 s.mesh(group,vertexMaterial(.94),'lighthouse-tower-and-keepers-house');p.mesh(group,vertexMaterial(.85),'hide-on-stilts-gallery-and-red-roofs');const lamp=glow.mesh(group,glowMaterial('#ffe9b0',.9),'lighthouse-lantern');lamp.castShadow=false;group.userData={landmark:'Old lighthouse and bird hide'};
}

function pelican(b:Builder,x:number,y:number,z:number,face:number){b.add(new T.SphereGeometry(1,10,7),C.pelican,[x,y+.2,z],[0,0,0],[.62,.34,.4]);b.strut(new T.Vector3(x+face*.4,y+.3,z),new T.Vector3(x+face*.5,y+.82,z),.09,C.pelican,6,.8);b.add(new T.SphereGeometry(.14,8,6),C.pelican,[x+face*.52,y+.9,z]);b.strut(new T.Vector3(x+face*.6,y+.88,z),new T.Vector3(x+face*1.08,y+.62,z),.075,C.bill,5,.5);b.add(new T.SphereGeometry(.12,6,5),C.bill,[x+face*.78,y+.68,z],[0,0,0],[1.5,.9,.6]);}
function waterLife(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='water-lilies-pelicans-and-herons';root.add(group);const b=new Builder(),w=-2.36;
 for(let k=0;k<(low?40:110);k++){const x=-44+r()*(finish+90),z=-11.4-r()*5.4,size=.26+r()*.2;b.add(new T.CylinderGeometry(size,size,.03,low?6:9),C.pad,[x,w,z]);if(k%4===0){b.add(new T.ConeGeometry(.13,.16,6),k%8?C.lily:C.lilyYellow,[x+.05,w+.1,z],[Math.PI,0,0]);b.add(new T.SphereGeometry(.045,5,4),C.lilyYellow,[x+.05,w+.14,z]);}}
 for(const [gx,count] of [[4,3],[58,4],[96,3],[finish+12,3]] as const)for(let k=0;k<count;k++)pelican(b,gx+k*1.5+(k%2)*.3,w,-13.4-(k%2)*.9,k%2?-1:1);
 for(const [hx,hz] of [[26,-17.4],[90,-17.2],[124,-17.6]] as const){for(const dx of [-.05,.05])box(b,.025,.8,.025,C.iron,hx+dx,-2.5,hz);b.add(new T.SphereGeometry(.2,8,6),C.heron,[hx,-1.5,hz],[0,0,0],[1.5,.9,.8]);b.strut(new T.Vector3(hx+.2,-1.44,hz),new T.Vector3(hx+.34,-.8,hz),.04,C.heron,5,.8);b.strut(new T.Vector3(hx+.34,-.8,hz),new T.Vector3(hx+.7,-.86,hz),.025,C.bill,4,.4);}
 b.mesh(group,vertexMaterial(.8),'lily-pads-pelican-rafts-and-herons');group.userData={feature:'Water life'};
 // A fisherman rowing his black boat.
 const boat=new T.Group();boat.name='rowing-fisherman';root.add(boat);const f=new Builder();f.add(new T.SphereGeometry(1,10,5),C.tar,[0,0,0],[0,0,0],[2.2,.28,.42]);box(f,.5,.05,.7,C.timber,-.3,.14,0);box(f,.36,.5,.3,C.shirt,-.3,.2,0);f.add(new T.SphereGeometry(.13,8,6),C.skin,[-.3,.84,0]);cyl(f,.2,.16,.06,C.thatch,-.3,.94,0,8);for(const side of [-1,1])f.strut(new T.Vector3(-.2,.5,side*.2),new T.Vector3(.5,.1,side*1.2),.03,C.timber,4,1);
 f.mesh(boat,vertexMaterial(.8),'boat-and-fisherman');boat.userData={animated:true};return boat;
}

// Route furniture, in a platform's own coordinates, behind the walking lane.
function fishRack(b:Builder,x:number,y:number,z:number){for(const dx of [-.7,.7])cyl(b,.05,.06,1.5,C.timberDark,x+dx,y,z,5);box(b,1.6,.05,.05,C.timberDark,x,y+1.45,z);for(let k=0;k<5;k++)b.add(new T.SphereGeometry(.07,6,4),C.fish,[x-.56+k*.28,y+1.18,z],[0,0,0],[.6,2.2,.4]);}
function reedBundle(b:Builder,x:number,y:number,z:number){b.add(new T.CylinderGeometry(.1,.34,1.3,7),C.reed,[x,y+.65,z]);cyl(b,.2,.2,.05,C.rope,x,y+.72,z,7);for(let k=0;k<4;k++)box(b,.07,.24,.07,C.reedTop,x-.1+k*.07,y+1.3,z+(k%2)*.06-.03);}
function netPoles(b:Builder,x:number,y:number,z:number){for(const dx of [-.6,.6])cyl(b,.045,.055,1.7,C.timberDark,x+dx,y,z,5);box(b,1.2,1.1,.03,C.net,x,y+.5,z);for(let k=0;k<4;k++)b.add(new T.SphereGeometry(.06,6,4),C.bill,[x-.45+k*.3,y+1.62,z+.03]);}
function stormLantern(b:Builder,glow:Builder,x:number,y:number,z:number){cyl(b,.05,.06,1.5,C.timberDark,x,y,z,5);box(b,.4,.05,.05,C.timberDark,x+.18,y+1.45,z);cyl(b,.07,.07,.04,C.iron,x+.36,y+1.3,z,6);glow.add(new T.CylinderGeometry(.06,.07,.18,6),'#ffd98a',[x+.36,y+1.2,z]);cyl(b,.08,.08,.04,C.iron,x+.36,y+1.07,z,6);}
function ropeRail(b:Builder,from:number,to:number,surface:(x:number)=>number,z:number){for(let x=from;x<=to+.01;x+=1.4){cyl(b,.06,.07,.85,C.timberDark,x,surface(x),z,6);if(x+1.4<=to+.01)b.strut(new T.Vector3(x,surface(x)+.75,z),new T.Vector3(x+1.4,surface(x+1.4)+.75,z),.03,C.rope,4,1);}}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'reed-islands-and-willows','thatched-white-houses-with-blue-frames','church-with-blue-onion-domes','fish-racks-nets-and-jetty','black-tarred-fishing-boats','bird-hide-on-stilts','old-white-lighthouse','pelican-rafts-and-herons','water-lilies','rowing-fisherman']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(37600),detail=new T.Group();detail.name='delta-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  islands(detail,finish,r,low);village(detail,flagMaterial(bandedFlagTexture([['#002b7f',1],['#fcd116',1],['#ce1126',1]],true)),low);hideAndLighthouse(detail,low);
  const boat=waterLife(detail,finish,r,low),pelicans=createFlock(detail,{name:'delta-pelicans',count:low?4:8,centre:[finish*.5,9,-16],radius:[40,2,6],speed:.12,size:1.5,color:'#fbf9f2',wing:'#2a2c30',seed:211,glide:true});
  let reduced=context.reducedMotion;const row=(time:number)=>{boat.position.set(-24+((time*.45)%(finish+60)),-2.3+Math.sin(time*.8)*.02,-8.6+Math.sin(time*.1)*1);boat.rotation.z=Math.sin(time*1.6)*.02;};row(40);pelicans.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;row(time+40);pelicans.update(time);},setReducedMotion(value){reduced=value;pelicans.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||t==='water-raft'||w<2.6)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*173+Math.round(definition.x),from=-w/2+.3,to=w/2-.3,y=surface(0);
  if(t==='bridge'){ropeRail(b,from,to,surface,rear);stormLantern(b,glow,from+.3,surface(from+.3),rear+.3);if(w>4.4)(seed%2?fishRack:netPoles)(b,to-1.1,surface(to-1.1),rear+.3);if(w>7)reedBundle(b,0,y,rear+.3);}
  else if(t==='ground'){reedBundle(b,from+.5,y,rear+.2);reedBundle(b,from+1.1,y,rear+.3);netPoles(b,to-1,y,rear+.2);if(w>6)fishRack(b,.2,y,rear+.2);if(w>4.4)stormLantern(b,glow,to-2.2,y,rear+.3);}
  else if(t==='stairs'||t==='slope'){ropeRail(b,from,to,surface,rear);}
  else if(t==='rock'){reedBundle(b,(seed%2?.3:-.3),surface(0),rear+.3);}
  finishProps(root,b,glow,'delta-nets-reed-bundles-and-fish-racks');
 },
};
