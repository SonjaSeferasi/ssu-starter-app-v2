import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cyl} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,column,finishProps,flagMaterial,texturedStone,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Albania: the ruins of Butrint beside its lagoon (SRS-632.29). Along the
 * wooded shore stand the square Venetian tower, the roofless basilica with
 * its two rows of arches, the Greek theatre with its half-ring of stone
 * seats, the round baptistery with its columns and mosaic floor, and the
 * Lion Gate in the great block wall. On the hill behind is the Venetian
 * castle with the flag. Reeds, mussel poles, egrets and the cable ferry
 * edge the water. The route carries amphorae, column stumps and stone
 * seats. Scenery only: nothing collides. */
const C={stone:'#ece5d2',stoneDark:'#d2c9b2',block:'#ddd5c0',sand:'#e6d9b4',grass:'#8fae62',hill:'#7f9c58',shade:'#4a4034',relief:'#b89a6a',iron:'#22262a',wood:'#7a5c40',reed:'#8fa24e',reedTop:'#7a5c3a',amphora:'#c9784a',rope:'#c9b88a',hull:'#f6f3ea',white:'#fbfaf5',beak:'#e8a82a'} as const;
const mosaic=['#b5402f','#e9e0c8','#3f6a8a','#e9e0c8','#2c2f36','#e9e0c8','#b5402f','#c9a24a'] as const;
const base=europeEnvironment('ALB',{landmark:false,flat:true,town:false});
export const butrint={shoreTop:-1,towerX:18,basilicaX:42,theatreZ:-27.5,hillZ:-60,hillTop:8} as const;
/** Where the later ruins stand, spread along the length of the route. */
export const layout=(finish:number)=>({theatreX:finish*.45,baptisteryX:finish-60,gateX:finish-22});
const blocks=(repeat=.5)=>texturedStone('paris-stone','#fbf6ea',repeat,.96);
const hillY=(x:number,z:number,hillX:number)=>{const dx=(x-hillX)/36,dz=(z-butrint.hillZ)/14,inside=1-dx*dx-dz*dz;return inside<=0?butrint.shoreTop:Math.max(butrint.shoreTop,-4.4+(butrint.hillTop+4.4)*Math.sqrt(inside));};

function shore(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='butrint-lagoon-shore';root.add(group);const g=new Builder(),b=new Builder(),top=butrint.shoreTop,from=-56,to=finish+100;
 box(g,to-from,top+4.4,70,C.grass,(from+to)/2,-4.4,-52);box(g,to-from,top+4.44,3.6,C.sand,(from+to)/2,-4.4,-17.2);g.add(new T.SphereGeometry(1,low?12:22,low?8:12),C.hill,[layout(finish).theatreX,-4.4,butrint.hillZ],[0,0,0],[36,butrint.hillTop+4.4,14],.06);
 for(let k=0;k<(low?70:190);k++){const x=-50+r()*(finish+140),z=-15.2+r()*1.4,h=1.1+r()*.9;box(b,.05,h,.05,C.reed,x,-2.4,z);box(b,.09,.28,.09,C.reedTop,x,-2.4+h,z);}
 // Mussel poles in rows, joined by lines.
 for(const sx of [-6,58,finish-20])for(let row=0;row<2;row++)for(let k=0;k<(low?4:7);k++){const x=sx+k*1.6,z=-12-row*1.3;cyl(b,.05,.06,1.5,C.wood,x,-2.6,z,5);if(k)b.strut(new T.Vector3(x-1.6,-1.25,z),new T.Vector3(x,-1.25,z),.015,C.rope,3,1);}
 // Egrets standing in the shallows.
 for(let k=0;k<(low?3:6);k++){const x=10+k*(finish-10)/5+r()*4,z=-14.2;for(const dx of [-.04,.04])box(b,.02,.5,.02,C.iron,x+dx,-2.45,z);b.add(new T.SphereGeometry(.16,8,6),C.white,[x,-1.86,z],[0,0,0],[1.4,.9,.8]);b.strut(new T.Vector3(x+.14,-1.82,z),new T.Vector3(x+.22,-1.42,z),.035,C.white,5,.8);b.strut(new T.Vector3(x+.22,-1.42,z),new T.Vector3(x+.42,-1.46,z),.02,C.beak,4,.4);}
 g.mesh(group,vertexMaterial(.97),'wooded-shore-and-acropolis-hill');b.mesh(group,vertexMaterial(.85),'reeds-mussel-poles-and-egrets');group.userData={feature:'Lagoon shore'};
}

function venetianTower(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='venetian-tower';root.add(group);const s=new Builder(.5),p=new Builder(),x=butrint.towerX,y=butrint.shoreTop,z=-23;
 box(s,4.2,7,4.2,C.stone,x,y,z);for(let k=0;k<4;k++)for(const [dx,dz] of [[-1.7,2],[-.57,2],[.57,2],[1.7,2]] as const)if(!low||k<1)box(s,.7,.6,.4,C.stone,x+dx,y+7,z+dz-(k?k*1.27:0));
 box(p,.9,1.7,.08,C.shade,x,y,z+2.12);for(const level of [3,5])box(p,.4,.8,.08,C.shade,x,y+level,z+2.12);box(s,9,1.4,.8,C.stoneDark,x+6.4,y,z+1);box(s,3,2.2,.8,C.stoneDark,x+5,y,z+1);
 s.mesh(group,blocks(.9),'tower-and-ruined-wall');p.mesh(group,vertexMaterial(.8),'tower-door-and-loopholes');group.userData={landmark:'Venetian Tower'};
}

function basilica(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='great-basilica-ruins';root.add(group);const s=new Builder(.5),x=butrint.basilicaX,y=butrint.shoreTop,bays=6,pitch=2.4;
 box(s,bays*pitch+3,.1,9,C.stoneDark,x,y,-28.5);
 for(const [z,ruin] of [[-25,1],[-31.5,0]] as const)for(let k=0;k<=bays;k++){const px=x-bays*pitch/2+k*pitch;box(s,.7,3,.7,C.stone,px,y,z);if(k<bays&&!(ruin&&k===4)){s.add(new T.TorusGeometry(pitch/2-.2,.24,5,low?6:10,Math.PI),C.stone,[px+pitch/2,y+3,z]);box(s,pitch,ruin&&k%2?.5:1.1,.6,C.stone,px+pitch/2,y+3.95,z);}}
 // The apse at the east end.
 for(let k=0;k<(low?5:9);k++){const a=-Math.PI/2+(k+.5)/(low?5:9)*Math.PI,ax=x+bays*pitch/2+1+Math.cos(a)*3.1,az=-28.2+Math.sin(a)*3.1;box(s,low?2:1.15,3.2+(k%3)*.5,.6,C.stone,ax,y,az,-a+Math.PI/2);}
 s.mesh(group,blocks(.9),'nave-arcades-and-apse');group.userData={landmark:'Great Basilica',arches:bays*2-1};
}

function theatre(root:T.Object3D,finish:number,low:boolean){
 const group=new T.Group();group.name='greek-theatre';root.add(group);const s=new Builder(.5),p=new Builder(),x=layout(finish).theatreX,z=butrint.theatreZ,y=butrint.shoreTop,tiers=low?5:9,segments=low?8:16;
 // Seats: each tier a half ring of blocks, higher and wider than the one in front.
 for(let k=0;k<tiers;k++){const radius=4.2+k*.95,h=(k+1)*.5;for(let j=0;j<segments;j++){const a=Math.PI+(j+.5)/segments*Math.PI;box(s,Math.PI*(radius+.45)/segments+.04,h,.9,k%2?C.stone:C.stoneDark,x+Math.cos(a)*radius,y,z+Math.sin(a)*radius,-a+Math.PI/2);}}
 // Stairways up through the seats, the round orchestra, and the low stage wall with its doorways.
 for(const a of [Math.PI*1.25,Math.PI*1.5,Math.PI*1.75])for(let k=0;k<tiers;k++){const radius=4.2+k*.95;box(p,.5,(k+1)*.5+.03,.92,C.block,x+Math.cos(a)*radius,y,z+Math.sin(a)*radius,-a+Math.PI/2);}
 cyl(p,3.7,3.7,.08,C.sand,x,y,z,low?12:24);for(const dx of [-6.2,-2.1,2.1,6.2])box(s,3,1,.6,C.stone,x+dx,y,z+4.2);for(const dx of [-5,-1.7,1.7,5])column(p,x+dx,y,z+5.4,.2,dx%2?1.5:.8,C.stone,low?6:10);
 s.mesh(group,blocks(.9),'half-ring-of-stone-seats');p.mesh(group,vertexMaterial(.94),'orchestra-stairways-and-stage-columns');group.userData={landmark:'Theatre of Butrint',tiers};
}

function baptistery(root:T.Object3D,finish:number,low:boolean){
 const group=new T.Group();group.name='baptistery-mosaic-and-columns';root.add(group);const p=new Builder(),x=layout(finish).baptisteryX,y=butrint.shoreTop,z=-25;
 cyl(p,5.4,5.4,.14,C.stoneDark,x,y,z,low?16:32);mosaic.forEach((color,k)=>cyl(p,4.8-k*.6,4.8-k*.6,.02,color,x,y+.14+k*.004,z,low?16:32));cyl(p,.5,.6,.5,C.stone,x,y+.16,z,10);
 for(const [count,radius] of [[16,4.5],[8,2.5]] as const)for(let k=0;k<count;k++){if(low&&k%2)continue;const a=k/count*Math.PI*2+radius,h=(k*7+count)%5===0?.9:(k*3)%4===0?1.7:2.6,cx=x+Math.cos(a)*radius,cz=z+Math.sin(a)*radius;box(p,.5,.14,.5,C.stoneDark,cx,y+.14,cz);column(p,cx,y+.28,cz,.17,h,C.stone,low?6:10);if(h>2)box(p,.48,.16,.48,C.stone,cx,y+.28+h,cz);}
 p.mesh(group,vertexMaterial(.9),'mosaic-floor-font-and-column-rings');group.userData={landmark:'Baptistery',columns:24};
}

function lionGate(root:T.Object3D,finish:number,low:boolean){
 const group=new T.Group();group.name='lion-gate-and-city-wall';root.add(group);const s=new Builder(.5),p=new Builder(),x=layout(finish).gateX,y=butrint.shoreTop,z=-23,to=finish+40;
 box(s,10.7,3.6,1.6,C.block,x-6.65,y,z);box(s,4.4,3.6,1.6,C.block,x+3.5,y,z);for(let wx=x+10.3,k=0;wx<to;wx+=5.6,k++)box(s,5.2-(k%3)*.8,[3.2,1.6,2.6,1.1,3.4][k%5],1.6,C.block,wx+2.6,y,z);for(let wx=x-12,k=0;wx>x-34;wx-=5.6,k++)box(s,5.2-(k%3)*.8,[2.8,1.4,2.2,1][k%4],1.6,C.block,wx-2.6,y,z);box(s,2.6,1.5,1.6,C.block,x,y+2.1,z);box(s,3.2,.7,.5,C.stoneDark,x,y+1.9,z+.7);box(s,4.6,5.2,3.4,C.block,x+8,y,z-.4);
 box(p,2,1.9,.1,C.shade,x,y,z+.6);p.add(new T.SphereGeometry(1,8,6),C.relief,[x-.2,y+2.26,z+.97],[0,0,0],[.6,.2,.05]);p.add(new T.SphereGeometry(1,8,6),C.relief,[x+.5,y+2.36,z+.97],[0,0,0],[.2,.2,.05]);for(const dx of [-.6,-.2,.2])box(p,.07,.2,.04,C.relief,x+dx,y+2.02,z+.97);
 s.mesh(group,blocks(.32),'great-block-wall-and-gate-tower');p.mesh(group,vertexMaterial(.85),'gateway-and-lion-relief');group.userData={landmark:'Lion Gate'};
}

function castle(root:T.Object3D,flag:T.Material,finish:number,low:boolean){
 const group=new T.Group();group.name='venetian-castle-on-the-acropolis';root.add(group);const s=new Builder(.5),p=new Builder(),x=layout(finish).theatreX,z=butrint.hillZ+2,y=butrint.hillTop-.6;
 box(s,11,2.8,5,C.stone,x,y,z);for(let k=0;k<(low?6:11);k++)box(s,.6,.5,.5,C.stone,x-5+k*(low?2:1),y+2.8,z+2.25);box(s,3.6,5.6,3.6,C.stone,x+3.4,y,z+.4);for(const dx of [-1.4,-.47,.47,1.4])box(s,.6,.5,.5,C.stone,x+3.4+dx,y+5.6,z+1.95);
 for(const dx of [-3.4,-1,1.2])box(p,.5,.9,.08,C.shade,x+dx,y+1,z+2.52);box(p,.5,.9,.08,C.shade,x+3.4,y+3.6,z+2.22);cyl(p,.05,.07,2.6,C.iron,x+3.4,y+5.6,z+.4,5);
 s.mesh(group,blocks(.9),'castle-walls-and-tower');p.mesh(group,vertexMaterial(.8),'castle-windows-and-mast');wavingFlag(group,flag,x+3.46,y+7.5,z+.4,2,'albania-flag',.5);group.userData={landmark:'Venetian Castle'};
}

/** Red, with a black two-headed eagle. */
const albanianFlag=()=>pixelTexture(96,(u,v)=>{const x=Math.abs(u-.5)*2,y=v-.5,e=(cx:number,cy:number,rx:number,ry:number)=>((x-cx)/rx)**2+((y-cy)/ry)**2<1;
 const eagle=e(0,-.03,.09,.24)||(e(.2,.02,.2,.2)&&Math.sin(y*46+x*8)>-.45&&x>.05)||e(.1,.27,.06,.07)||(x<.2-(y+.5)*.5&&y<-.2&&y>-.4&&x<.16)||(Math.abs(y-.27)<.025&&x>.12&&x<.24);return eagle?[20,20,20,255]:[218,41,28,255];},true,false);

function ferry(root:T.Object3D,finish:number){
 const group=new T.Group();group.name='cable-ferry';root.add(group);const b=new Builder();box(b,4.4,.3,3,C.wood,0,0,0);for(const dz of [-1.4,1.4]){box(b,4.4,.06,.06,C.rope,0,.9,dz);for(const dx of [-2.1,-.7,.7,2.1])cyl(b,.05,.05,.9,C.wood,dx,.3,dz,5);}box(b,1,1.1,.9,C.hull,-1.4,.3,0);box(b,1.2,.08,1.1,C.amphora,-1.4,1.4,0);
 b.mesh(group,vertexMaterial(.85),'ferry-raft');const line=new Builder();line.strut(new T.Vector3(finish+10,-1.2,-16.4),new T.Vector3(finish+10,-1.2,-3),.03,C.rope,4,1);cyl(line,.1,.12,1.6,C.wood,finish+10,-1,-16.8,6);line.mesh(root,vertexMaterial(.85),'ferry-cable-and-post');group.userData={animated:true};return group;
}

// Route furniture, in a platform's own coordinates, behind the walking lane.
function amphora(b:Builder,x:number,y:number,z:number){b.add(new T.SphereGeometry(.2,10,8),C.amphora,[x,y+.36,z],[0,0,0],[1,1.5,1]);cyl(b,.07,.1,.26,C.amphora,x,y+.6,z,8);cyl(b,.1,.08,.05,C.amphora,x,y+.86,z,8);cyl(b,.05,.09,.12,C.amphora,x,y,z,6);for(const side of [-1,1])b.add(new T.TorusGeometry(.1,.022,4,8,Math.PI),C.amphora,[x+side*.13,y+.7,z],[0,0,side*-Math.PI/2]);}
function stump(b:Builder,x:number,y:number,z:number,h:number){box(b,.46,.12,.46,C.stoneDark,x,y,z);column(b,x,y+.12,z,.16,h,C.stone,10);if(h>1.4)box(b,.44,.14,.44,C.stone,x,y+.12+h,z);}
function seat(b:Builder,x:number,y:number,z:number){box(b,1.4,.42,.5,C.stone,x,y,z);box(b,1.5,.08,.56,C.stoneDark,x,y+.42,z);}
function ruinedWall(b:Builder,from:number,to:number,y:number,z:number,seed:number){for(let x=from,k=0;x<to-.01;x+=.7,k++)box(b,.72,.4+((seed+k*5)%4)*.16,.36,k%2?C.stone:C.block,Math.min(x+.35,to-.35),y,z);}
function reeds(b:Builder,x:number,y:number,z:number,seed:number){for(let k=0;k<6;k++){const dx=((seed*7+k*13)%10)/10*.8-.4,h=.8+((seed+k)%4)*.2;box(b,.04,h,.04,C.reed,x+dx,y,z);box(b,.08,.24,.08,C.reedTop,x+dx,y+h,z);}}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'greek-theatre-half-ring-of-seats','great-basilica-arcades','baptistery-mosaic-and-columns','lion-gate-in-the-block-wall','venetian-tower','venetian-castle-and-flag','reeds-mussel-poles-egrets-and-cable-ferry','amphorae-and-column-stumps']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(35500),detail=new T.Group();detail.name='butrint-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  shore(detail,finish,r,low);venetianTower(detail,low);basilica(detail,low);theatre(detail,finish,low);baptistery(detail,finish,low);lionGate(detail,finish,low);castle(detail,flagMaterial(albanianFlag()),finish,low);
  const pines:Placement[]=[],olives:Placement[]=[];for(let k=0;k<(low?20:50);k++){const x=-40+r()*(finish+100),z=-36-r()*16;if(Math.abs(x-layout(finish).theatreX)<12&&z>-42)continue;(k%2?pines:olives).push({x,y:hillY(x,z,layout(finish).theatreX)-.05,z,scale:.8+r()*.6,rotation:r()*6});}
  for(const x of [8,30,58,finish*.55,finish-40,finish-8,finish+14])olives.push({x,y:butrint.shoreTop,z:-27-r()*4,scale:.7+r()*.3,rotation:r()*6});plantGrove(detail,'stone-pine',pines,{low,name:'butrint-pines'});plantGrove(detail,'olive',olives,{low,name:'butrint-olives'});
  const raft=ferry(detail,finish),egrets=createFlock(detail,{name:'lagoon-egrets',count:low?4:8,centre:[finish*.5,7,-11],radius:[32,2.5,5],speed:.16,size:1,color:'#fbfaf5',wing:'#e6e6e0',seed:163,glide:true});
  let reduced=context.reducedMotion;const cross=(time:number)=>{raft.position.set(finish+10,-2.36+Math.sin(time*.6)*.02,-10.4+Math.sin(time*.12)*3.4);};cross(0);egrets.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;cross(time);egrets.update(time);},setReducedMotion(value){reduced=value;egrets.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.6)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*113+Math.round(definition.x),from=-w/2+.3,to=w/2-.3,y=surface(0);
  if(t==='sand'){reeds(b,from+.5,surface(from+.5),rear,seed);amphora(b,to-.6,surface(to-.6),rear+.3);if(w>4.4)reeds(b,.4,y,rear,seed+3);}
  else if(t==='ground'){stump(b,from+.4,surface(from+.4),rear+.2,1.9);stump(b,from+1.3,surface(from+1.3),rear+.2,.8);if(w>4.4)seat(b,to-1.1,surface(to-1.1),rear+.2);}
  else if(t==='rock'){amphora(b,(seed%2?.3:-.3),surface(0),rear+.3);}
  else if(t==='arch'||t==='terrace'||t==='cliff'){ruinedWall(b,from,to,Math.min(surface(from),surface(to)),rear,seed);stump(b,from+.6,surface(from+.6),rear+.55,1.8);amphora(b,to-.6,surface(to-.6),rear+.55);if(w>6)seat(b,.3,y,-1.9);}
  else if(t==='bridge'){for(let x=from;x<=to+.01;x+=1.5){cyl(b,.07,.08,.8,C.wood,x,surface(x),rear,6);if(x+1.5<=to+.01)b.strut(new T.Vector3(x,surface(x)+.7,rear),new T.Vector3(x+1.5,surface(x+1.5)+.7,rear),.025,C.rope,4,1);}}
  finishProps(root,b,glow,'butrint-amphorae-and-column-stumps');
 },
};
