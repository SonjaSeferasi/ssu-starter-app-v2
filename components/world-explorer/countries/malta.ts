import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,balustrade,bench,column,drumDome,finishProps,flagMaterial,lampPost,pottedTree,railing,texturedStone,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Malta: Valletta from the Grand Harbour (SRS-632.25). Bastions of honey
 * limestone rise straight from the water, their points guarded by small
 * domed watchtowers; on top run the arches of the upper gardens and the
 * cannon of the saluting battery. Behind them the city climbs in flat-roofed
 * stone houses hung with enclosed wooden balconies in green, red and blue,
 * under the great dome of the Carmelite church and the slender spire beside
 * it. The bell memorial stands at the harbour mouth, and painted boats with
 * eyes on their prows cross the water. The route carries cannon, palms,
 * prickly pears and lanterns. Scenery only: nothing collides. */
const C={stone:'#fbf3e0',stoneDark:'#eadfc4',plain:'#ecd9a8',plainDark:'#d9c48c',trim:'#f6ecd0',glass:'#2a3540',shade:'#5a4a36',dome:'#b9a888',red:'#b23a2e',green:'#2f6b46',blue:'#2f5f9f',gold:'#d6a938',iron:'#22262a',wood:'#7a5c40',
 leaf:'#4a7d3f',cactus:'#5f9a55',fruit:'#c8304a',palmTrunk:'#8a6f52',palm:'#3f8a4a',boatYellow:'#f2c81e',white:'#f8f5ec',rope:'#c9b88a'} as const;
const balconies=[C.green,C.red,C.blue,'#8a5a2c','#3f7f7a'] as const;
// The bastions and the city are built here, rising straight from the harbour.
const base=europeEnvironment('MLT',{landmark:false,flat:true,town:false});
export const valletta={water:-2.4,bastionTop:3,gardens:[56,92],domeX:112,spireX:124,bellX:164} as const;
const honey=()=>texturedStone('sandstone-blocks','#fff2d2',1.3,.95);

function bastions(root:T.Object3D,finish:number,flag:T.Material,low:boolean){
 const group=new T.Group();group.name='grand-harbour-bastions';root.add(group);const s=new Builder(.5),p=new Builder(),top=valletta.bastionTop,from=-56,to=finish+100,h=top-valletta.water+2;
 box(s,to-from,h,40,C.stone,(from+to)/2,valletta.water-2,-38);box(s,to-from,.4,.5,C.stoneDark,(from+to)/2,top-1.2,-17.8);
 // Pointed bastions push out into the harbour; each point carries a domed watchtower.
 for(let x=from+16;x<to;x+=38){s.add(new T.CylinderGeometry(6.2,7.4,h,5,1),C.stone,[x,valletta.water-2+h/2,-19.2],[0,Math.PI/5,0]);cyl(s,.7,.5,.6,C.stoneDark,x,top-.6,-13.6,6);cyl(s,.7,.7,1.5,C.stone,x,top,-13.6,6);p.add(new T.SphereGeometry(.76,8,6,0,Math.PI*2,0,Math.PI/2),C.dome,[x,top+1.5,-13.6]);p.add(new T.SphereGeometry(.1,6,5),C.gold,[x,top+2.3,-13.6]);for(let k=0;k<3;k++){const a=-.8+k*.8;p.add(new T.BoxGeometry(.2,.6,.06),C.shade,[x+Math.sin(a)*.7,top+.8,-13.6+Math.cos(a)*.7],[0,a,0]);}}
 // The saluting battery: a lower terrace with a row of cannon.
 box(s,30,1.4,3,C.stone,valletta.gardens[0]+18,top-3.6,-16.2);for(let k=0;k<(low?4:8);k++){const cx=valletta.gardens[0]+5+k*(low?7.4:3.6);p.strut(new T.Vector3(cx,top-1.9,-15.6),new T.Vector3(cx,top-1.7,-14.2),.16,C.iron,8,.7);box(p,.6,.3,1,C.wood,cx,top-2.2,-15.4);}
 cyl(p,.06,.09,5,C.iron,valletta.gardens[1]+4,top,-18.6,5);s.mesh(group,honey(),'honey-limestone-bastions');p.mesh(group,vertexMaterial(.7),'watchtower-domes-and-cannon');wavingFlag(group,flag,valletta.gardens[1]+4.06,top+4.2,-18.6,2.2,'malta-flag',.66);group.userData={landmark:'Bastions of Valletta'};
}

function gardens(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='upper-barrakka-arcade';root.add(group);const s=new Builder(.5),p=new Builder(),[a,b]=valletta.gardens,top=valletta.bastionTop,z=-20,bays=low?8:16,step=(b-a)/bays;
 for(let k=0;k<=bays;k++)box(s,.6,3.4,.8,C.stone,a+k*step,top,z);for(let k=0;k<bays;k++)s.add(new T.TorusGeometry(step/2-.3,.3,5,low?6:10,Math.PI),C.stone,[a+(k+.5)*step,top+2.6,z],[0,0,0],[1,1,2.6]);box(s,b-a+.8,.7,1,C.stone,(a+b)/2,top+3.4,z);box(s,b-a+1.2,.2,1.3,C.stoneDark,(a+b)/2,top+4.1,z);
 for(let k=0;k<(low?3:6);k++)pottedTree(p,a+4+k*(b-a-8)/(low?2:5),top,z-2.4,1.1,{pot:C.stoneDark,trunk:'#5a4636',leaf:C.leaf,fruit:'#e85a7a'},k);
 s.mesh(group,honey(),'garden-arcade-arches');p.mesh(group,vertexMaterial(.85),'garden-trees');group.userData={landmark:'Upper Barrakka Gardens',arches:bays};
}

function city(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='valletta-balconied-houses';root.add(group);const s=new Builder(),p=new Builder(),top=valletta.bastionTop;let houses=0,hung=0;
 // Flat-roofed houses step back up the hill; enclosed timber balconies hang from their fronts.
 for(const [z,lift] of [[-23,0],[-29,1.2],[-35,2.4]] as const)for(let x=-48;x<finish+92;){const w=3.4+r()*2.2,h=3.6+r()*1.6,mid=x+w/2;
  if(!(lift===0&&mid>valletta.gardens[0]-3&&mid<valletta.gardens[1]+3)&&!(lift>0&&Math.abs(mid-valletta.domeX)<7)&&!(lift>0&&Math.abs(mid-valletta.spireX)<3)){box(s,w-.1,h,5.6,r()>.5?C.plain:C.plainDark,mid,top+lift,z-2.8);box(s,w,.24,5.8,C.trim,mid,top+lift+h,z-2.8);houses++;
   for(let row=0;row<Math.floor(h/1.9);row++){const wy=top+lift+.4+row*1.9;if((houses+row)%2===0){const colour=balconies[(houses+row)%balconies.length];box(p,w*.5,1.3,.7,colour,mid,wy,z+.34);box(p,w*.5+.1,.1,.8,C.trim,mid,wy+1.3,z+.34);for(let k=0;k<3;k++)box(p,w*.1,.8,.04,C.glass,mid-w*.16+k*w*.16,wy+.5,z+.71);hung++;}else for(const dx of [-.24,.24]){box(p,w*.2,1.2,.06,C.shade,mid+dx*w,wy,z+.03);box(p,w*.26,.08,.3,C.trim,mid+dx*w,wy,z+.14);}}}x+=w;}
 s.mesh(group,vertexMaterial(.94),'flat-roofed-stone-houses');p.mesh(group,vertexMaterial(.7),'enclosed-wooden-balconies');group.userData={feature:'Houses with enclosed wooden balconies',houses,balconies:hung};
}

function skyline(root:T.Object3D,finish:number,low:boolean){
 const group=new T.Group();group.name='carmelite-dome-and-spire';root.add(group);const s=new Builder(.5),p=new Builder(),top=valletta.bastionTop+2.4;
 // The great dome on its columned drum, and the stone spire beside it.
 const dx=valletta.domeX,dz=-38;box(s,9,1.6,9,C.stone,dx,top,dz);for(let k=0;k<(low?8:16);k++){const a=k/(low?8:16)*Math.PI*2;column(s,dx+Math.cos(a)*3.6,top+1.6,dz+Math.sin(a)*3.6,.24,2,C.trim,6);}drumDome(s,p,dx,top+1.6,dz,3.2,2,{wall:C.stone,trim:C.trim,dome:C.dome,finial:C.gold,glass:C.glass},{low,cross:true,stretch:1.2,sides:low?10:16});
 const sx=valletta.spireX,sz=-39;box(s,2.4,4.4,2.4,C.stone,sx,top,sz);for(const level of [1,2.8])archedWindow(s,p,sx,top+level,sz+1.22,.7,1.2,{frame:C.trim,glass:C.shade});cyl(s,1,1.1,1,C.stone,sx,top+4.4,sz,8);cone(s,1.1,3.4,C.stone,sx,top+5.4,sz,8);p.add(new T.SphereGeometry(.11,6,5),C.gold,[sx,top+8.9,sz]);
 // The Siege Bell memorial: a small rotunda of columns under a cupola.
 const bx=Math.max(valletta.bellX,finish+12),bz=-19,bt=valletta.bastionTop;cyl(s,2.6,2.8,.5,C.stone,bx,bt,bz,low?10:14);for(let k=0;k<10;k++){const a=k/10*Math.PI*2;column(s,bx+Math.cos(a)*2,bt+.5,bz+Math.sin(a)*2,.18,2.6,C.trim,6);}cyl(s,2.4,2.4,.4,C.stone,bx,bt+3.1,bz,low?10:14);p.add(new T.SphereGeometry(2.1,low?8:12,6,0,Math.PI*2,0,Math.PI/2),C.dome,[bx,bt+3.5,bz],[0,0,0],[1,.7,1]);p.add(new T.SphereGeometry(.6,8,6),'#6a5a3c',[bx,bt+2,bz],[0,0,0],[1,1.2,1]);
 s.mesh(group,honey(),'dome-drum-spire-and-bell-rotunda');p.mesh(group,vertexMaterial(.7),'dome-shell-and-bell');group.userData={landmark:'Carmelite dome, the Anglican spire and the Siege Bell'};
}

/** White at the hoist, red in the fly, with the cross in the corner. */
const malteseFlag=()=>pixelTexture(64,(u,v)=>u<.5?(u>.06&&u<.2&&v>.66&&v<.94&&(Math.abs(u-.13)<.025||Math.abs(v-.8)<.04)?[150,150,150,255]:[255,255,255,255]):[207,20,43,255],true,false);

/** Harbour boats: bright hulls with an eye on each prow; the long water taxi carries a canopy. */
function boats(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const fleet=new T.Group();fleet.name='luzzu-fishing-boats';root.add(fleet);const f=new Builder();for(let x=-40;x<finish+60;x+=low?16:8){const bx=x+r()*4,bz=-9-r()*4;f.add(new T.SphereGeometry(1,8,5),C.boatYellow,[bx,-2.34,bz],[0,0,0],[1.5,.36,.5]);box(f,2.6,.1,.9,C.blue,bx,-2.2,bz);box(f,2.4,.08,.8,C.red,bx,-2.1,bz);for(const side of [-1,1]){f.add(new T.SphereGeometry(.09,6,5),C.white,[bx+1.2,-2.16,bz+side*.24]);f.add(new T.SphereGeometry(.05,6,5),'#1c1c1e',[bx+1.26,-2.16,bz+side*.27]);}cyl(f,.04,.05,.7,C.wood,bx+1.5,-2.2,bz,5);}
 f.mesh(fleet,vertexMaterial(.7),'painted-luzzu-hulls');
 const taxi=new T.Group();taxi.name='dghajsa-water-taxi';root.add(taxi);const b=new Builder();b.add(new T.SphereGeometry(1,10,5),C.green,[0,.06,0],[0,0,0],[2.6,.3,.5]);box(b,4.6,.08,.9,C.red,0,.2,0);for(const end of [-1,1])b.strut(new T.Vector3(end*2.3,.2,0),new T.Vector3(end*2.7,1.2,0),.06,C.boatYellow,5,.6);for(const [dx,dz] of [[-.8,-.36],[.8,-.36],[-.8,.36],[.8,.36]] as const)cyl(b,.03,.03,1,C.wood,dx,.24,dz,4);box(b,2,.06,.9,C.white,0,1.24,0);b.mesh(taxi,vertexMaterial(.7),'water-taxi-hull-and-canopy');taxi.userData={animated:true};return taxi;
}

// Route furniture, in a platform's own coordinates, behind the walking lane.
function cannon(b:Builder,x:number,y:number,z:number){box(b,1.1,.3,.6,C.wood,x,y+.18,z);for(const dx of [-.36,.36])for(const dz of [-.34,.34])b.add(new T.CylinderGeometry(.2,.2,.08,10),C.wood,[x+dx,y+.2,z+dz],[Math.PI/2,0,0]);b.strut(new T.Vector3(x-.6,y+.6,z),new T.Vector3(x+.9,y+.78,z),.15,C.iron,8,.7);}
/** A prickly pear: flat green pads with red fruit along their edges. */
function pricklyPear(b:Builder,x:number,y:number,z:number,seed:number){for(const [dx,dy,turn] of [[0,.36,0],[.3,.8,.5],[-.28,.86,-.4],[.1,1.3,.2]] as const){b.add(new T.SphereGeometry(.34,8,6),C.cactus,[x+dx,y+dy,z],[0,seed,turn],[.8,1,.22]);b.add(new T.SphereGeometry(.07,6,4),C.fruit,[x+dx+.1,y+dy+.34,z]);}}
function palm(b:Builder,x:number,y:number,z:number,h:number,seed:number){b.strut(new T.Vector3(x,y,z),new T.Vector3(x+.12*Math.sin(seed),y+h,z),.14,C.palmTrunk,7,.75);for(let k=0;k<8;k++){const a=k/8*Math.PI*2+seed,tip=new T.Vector3(x+Math.cos(a)*1.1,y+h-.4,z+Math.sin(a)*.8),mid=new T.Vector3(x+Math.cos(a)*.6,y+h+.3,z+Math.sin(a)*.44);b.strut(new T.Vector3(x,y+h,z),mid,.08,C.palm,4,.8);b.strut(mid,tip,.07,C.palm,4,.3);}}
function bollardRope(b:Builder,from:number,to:number,y:number,z:number){for(let x=from;x<=to+.01;x+=1.2){cyl(b,.1,.13,.6,C.iron,x,y,z,8);b.add(new T.SphereGeometry(.13,6,5),C.iron,[x,y+.64,z]);if(x+1.2<=to+.01)b.strut(new T.Vector3(x,y+.5,z),new T.Vector3(x+1.2,y+.5,z),.03,C.rope,4,1);}}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'honey-limestone-bastions-and-watchtowers','upper-gardens-arcade','saluting-battery-cannon','enclosed-wooden-balconies','carmelite-dome-and-spire','siege-bell-rotunda','painted-boats-with-eyes','cannon-palms-and-prickly-pears']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(35600),detail=new T.Group();detail.name='valletta-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  bastions(detail,finish,flagMaterial(malteseFlag()),low);gardens(detail,low);city(detail,finish,r,low);skyline(detail,finish,low);
  const pines:Placement[]=[];for(let k=0;k<(low?6:14);k++)pines.push({x:-46+r()*(finish+130),y:valletta.bastionTop,z:-20.4-r(),scale:.6+r()*.25,rotation:r()*6});plantGrove(detail,'stone-pine',pines.filter(t=>t.x<valletta.gardens[0]-3||t.x>valletta.gardens[1]+3),{low,name:'bastion-pines'});
  const taxi=boats(detail,finish,r,low),gulls=createFlock(detail,{name:'harbour-gulls',count:low?5:10,centre:[finish*.5,8,-10],radius:[32,3,5],speed:.2,size:.8,color:'#f2f2ee',wing:'#c9ccd0',seed:139,glide:true});
  let reduced=context.reducedMotion;const cross=(time:number)=>{const lap=finish+110;taxi.position.set(-50+(time*.8)%lap,valletta.water+.04+Math.sin(time)*.03,-6.4);};cross(0);gulls.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;cross(time);gulls.update(time);},setReducedMotion(value){reduced=value;gulls.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.6)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*101+Math.round(definition.x),from=-w/2+.3,to=w/2-.3,y=surface(0);
  if(t==='bridge'){bollardRope(b,from,to,y,rear);lampPost(b,glow,from+.4,surface(from+.4),rear+.3);if(w>5)bench(b,to-1.3,surface(to-1.3),rear+.25);}
  else if(t==='arch'){for(const side of [-1,1])column(b,side*(w/2-.5),y,rear+.25,.22,2.6,C.stoneDark,10);box(b,w-.4,.3,.5,C.stoneDark,0,y+2.6,rear+.25);if(w>4.4)lampPost(b,glow,0,y,rear+.2);}
  else if(t==='terrace'){balustrade(b,from,to,y,rear,{rail:C.trim,base:C.stoneDark,baluster:C.stone});cannon(b,from+1.1,y,-1.5);if(w>4.6)palm(b,to-1.3,y,-2.2,2.6,seed);if(w>7)bench(b,.4,y,-1.9);}
  else if(t==='rock'){pricklyPear(b,(seed%2?.3:-.3),surface(0),rear+.2,seed);}
  else if(t==='stairs'){railing(b,from,to,Math.min(surface(from),surface(to)),rear,C.iron,C.gold);}
  else if(t==='ground'){lampPost(b,glow,from+.3,y,-1.3);pricklyPear(b,from+1.4,y,-1.8,seed);bench(b,to-1.2,y,-1.9);}
  finishProps(root,b,glow,'valletta-bastion-steps-and-quays');
 },
};
