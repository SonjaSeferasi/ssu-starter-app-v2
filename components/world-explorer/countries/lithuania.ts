import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl,roof} from './europe-landmarks';
import {Builder,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,awningStall,balustrade,bandedFlagTexture,bench,chimneyStack,column,dormer,drumDome,finishProps,flagMaterial,flowerBox,lampPost,pinnacle,pointedWindow,pottedTree,statue,texturedStone,townhouse,wavingFlag} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Lithuania: Vilnius above the Neris (SRS-632.23). Gediminas' brick tower
 * stands on its wooded hill under the tricolour. Below it lie the white
 * cathedral with its columned porch and the separate bell tower; the
 * red-brick Gothic front of St Anne's, all pinnacles; and the Baroque
 * towers of the old town in pink, white and cream. Low houses with red
 * roofs line the river, the Three Crosses stand white on their hill beyond
 * the finish, and hot-air balloons drift over the city. The route carries
 * lanterns, stalls, statues, chimneys and flower boxes. Scenery only. */
const C={brick:'#f0d8cc',brickPlain:'#a8553b',white:'#f7f5ee',trim:'#fbf9f2',pink:'#e6b0a8',cream:'#efe2c2',ochre:'#e3c27a',red:'#a8533a',redDark:'#8a4332',glass:'#27343f',copper:'#5f8f7c',gold:'#d6a938',stone:'#d9d2c0',
 hill:'#5f8f4c',lawn:'#86b062',quay:'#cfc8b6',iron:'#22262a',wood:'#7a5c40',leaf:'#4a7d3f',basket:'#8a6a4a'} as const;
const houses=['#efe2c2','#e6b9a0','#e9d08a','#f2ead8','#d9c0c8','#cfd8c0'] as const;
const balloons=[['#d8402f','#f2d24a'],['#3f78c4','#ffffff'],['#3f9a5a','#f2d24a'],['#e88a2a','#7a3fa8']] as const;
const base=europeEnvironment('LTU',{landmark:false,flat:true,town:false});
export const vilnius={bankTop:-1,castleHillX:28,cathedralX:66,annesX:104,baroque:[124,144,164],crossesHillTop:9} as const;
const brickwork=()=>texturedStone('sandstone-blocks','#c47a66',2.2,.94);

function riverside(root:T.Object3D,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='neris-riverside-houses';root.add(group);const s=new Builder(),p=new Builder(),y=vilnius.bankTop,from=-56,to=finish+100;let count=0;
 box(s,to-from,y+4.4,70,C.quay,(from+to)/2,-4.4,-51.5);box(p,to-from,.06,5,C.lawn,(from+to)/2,y,-19.4);for(let x=from+2;x<to;x+=low?5:2.5)box(p,.05,.9,.05,C.iron,x,y,-16.7);box(p,to-from-4,.05,.05,C.iron,(from+to)/2,y+.9,-16.7);
 for(let x=-44;x<finish+80;){const w=3.4+r()*1.6,h=3.4+r()*1.2,mid=x+w/2;if(Math.abs(mid-vilnius.cathedralX-4)>17&&Math.abs(mid-vilnius.annesX)>7){townhouse(s,p,mid,y,-23,w-.1,h,4.6,{wall:houses[Math.floor(r()*houses.length)],trim:C.trim,glass:C.glass,roof:r()>.3?C.red:C.redDark},{rows:2,roof:r()>.5?'gable':'hip',door:true,low});count++;}x+=w;}
 s.mesh(group,vertexMaterial(.94),'riverside-walls-and-quay');p.mesh(group,vertexMaterial(.7),'riverside-roofs-lawn-and-railings');group.userData={feature:'Old town houses on the Neris',houses:count};
}

function castleHill(root:T.Object3D,flag:T.Material,r:()=>number,low:boolean){
 const group=new T.Group();group.name='gediminas-tower';root.add(group);const h=new Builder(),s=new Builder(.5),p=new Builder(),x=vilnius.castleHillX,z=-48,top=7;
 h.add(new T.SphereGeometry(1,low?12:20,low?8:12),C.hill,[x,-4.4,z],[0,0,0],[20,top+4.4,12],.08);h.mesh(group,vertexMaterial(.97),'castle-hill');
 // The tower: eight brick sides, three storeys of pointed windows, a walk round the top.
 cyl(s,2.1,2.3,4.6,C.brick,x,top-.3,z,8);cyl(s,2.4,2.4,.3,C.stone,x,top+4.3,z,8);for(let k=0;k<8;k++){const a=k/8*Math.PI*2+Math.PI/8;for(const level of [.9,2.6])p.add(new T.BoxGeometry(.4,.9,.08),C.glass,[x+Math.sin(a)*2.16,top+level,z+Math.cos(a)*2.16],[0,a,0]);box(s,.5,.5,.4,C.brick,x+Math.sin(a)*2.2,top+4.6,z+Math.cos(a)*2.2,a);}
 box(s,6,1.6,1,C.brick,x+5,top-.6,z+1);cyl(p,.05,.07,2.8,C.iron,x,top+4.6,z,5);s.mesh(group,brickwork(),'brick-tower-and-wall');p.mesh(group,vertexMaterial(.6),'tower-windows-and-mast');
 const trees:Placement[]=[];for(let k=0;k<(low?10:22);k++){const a=r()*Math.PI,d=.45+r()*.5;trees.push({x:x+Math.cos(a)*20*d,y:-4.4+(top+4.4)*Math.sqrt(Math.max(0,1-d*d))*.9,z:z+12*Math.sqrt(Math.max(0,1-d*d*Math.cos(a)**2))*.85,scale:.6+r()*.4,rotation:r()*6});}plantGrove(group,'plane',trees,{low,name:'castle-hill-trees'});
 wavingFlag(group,flag,x+.06,top+6.7,z,2,'lithuania-flag',.6);group.userData={landmark:'Gediminas Tower'};
}

function cathedral(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='vilnius-cathedral';root.add(group);const s=new Builder(),p=new Builder(),x=vilnius.cathedralX,y=vilnius.bankTop,z=-27;
 box(p,34,.08,12,C.stone,x+3,y,z+2);
 // A white temple front: six columns, a pediment with three statues on its points.
 box(s,12,6.2,16,C.white,x,y,z-9);box(s,13,.4,5,C.trim,x,y,z+1);for(let k=0;k<6;k++)column(s,x-5+k*2,y+.4,z+2.4,.36,5.4,C.trim,low?8:12);box(s,12.6,.6,4.6,C.trim,x,y+5.8,z+1);s.add(new T.CylinderGeometry(.02,6.3,2,3,1),C.white,[x,y+7.4,z+1.6],[0,-Math.PI/2,0],[.4,1,1]);
 for(const dx of [-6,0,6]){const sy=dx?y+6.4:y+8.4;cyl(p,.16,.22,1.1,C.stone,x+dx,sy,z+2.4,6);p.add(new T.SphereGeometry(.15,6,5),C.stone,[x+dx,sy+1.26,z+2.4]);}for(const dx of [-4,0,4])box(p,1.1,2.6,.1,'#33261e',x+dx,y+.4,z-.96);box(p,12.3,.4,16.3,'#9aa39a',x,y+6.2,z-9);
 // The bell tower stands apart: a round base and three narrowing stages under a small spire.
 const tx=x+13,tz=z+1;cyl(s,2.2,2.3,4.6,C.white,tx,y,tz,low?10:16);let level=y+4.6;for(const [radius,h] of [[1.7,2.6],[1.4,2.2],[1.1,1.9]] as const){cyl(s,radius,radius,h,C.white,tx,level,tz,8);cyl(s,radius+.16,radius+.16,.2,C.trim,tx,level+h-.1,tz,8);for(let k=0;k<4;k++){const a=k*Math.PI/2+Math.PI/8;p.add(new T.BoxGeometry(.4,h*.5,.08),C.glass,[tx+Math.sin(a)*radius*.94,level+h*.5,tz+Math.cos(a)*radius*.94],[0,a,0]);}level+=h;}
 cone(p,1.2,1.3,C.copper,tx,level,tz,8);cyl(p,.04,.06,1.6,C.gold,tx,level+1.3,tz,5);box(p,.5,.06,.06,C.gold,tx,level+2.4,tz);
 s.mesh(group,vertexMaterial(.94),'cathedral-temple-front-and-bell-tower');p.mesh(group,vertexMaterial(.62),'cathedral-statues-doors-and-roof');group.userData={landmark:'Vilnius Cathedral and bell tower',columns:6};
}

function churches(root:T.Object3D,low:boolean){
 // St Anne's: a front of red brick drawn up into slender towers and pinnacles.
 const anne=new T.Group();anne.name='st-annes-church';root.add(anne);const s=new Builder(.5),p=new Builder(),x=vilnius.annesX,y=vilnius.bankTop,z=-26,gothic={frame:C.brick,glass:C.glass};
 box(s,6,6.4,11,C.brick,x,y,z-5.5);roof(p,6.3,3.4,11.3,C.redDark,x,y+6.4,z-5.5,Math.PI/2);for(const dx of [-2.6,0,2.6]){const h=dx?9.6:8.2;box(s,1.5,h,1.5,C.brick,x+dx,y,z+.4);cone(s,.9,dx?3:2.2,C.brick,x+dx,y+h,z+.4,8);for(const [ex,ez] of [[-.7,.7],[.7,.7]] as const)pinnacle(s,x+dx+ex,y+h-.4,z+.4+ez,.5,low,{shaft:C.brick,spire:C.brick,finial:C.gold});pointedWindow(s,p,x+dx,y+3.4,z+1.17,.6,2.6,low,gothic);}
 for(const dx of [-1.3,1.3])pointedWindow(s,p,x+dx,y+.6,z+.02,.9,4.2,low,gothic);s.add(new T.TorusGeometry(1.2,.16,5,low?8:12,Math.PI),C.brick,[x,y+6.3,z+.2]);
 s.mesh(anne,brickwork(),'st-annes-brick-front');p.mesh(anne,vertexMaterial(.6),'st-annes-glass-and-roof');anne.userData={landmark:"St Anne's Church"};
 // Three Baroque churches: twin towers in pink, a crowned dome in cream, and a white front with a dome behind.
 const group=new T.Group();group.name='baroque-church-towers';root.add(group);const b=new Builder(),q=new Builder(),[x1,x2,x3]=vilnius.baroque,bz=-38;
 const tower=(tx:number,tz:number,w:number,h:number,wall:string)=>{box(b,w,h,w,wall,tx,y,tz);for(const level of [.45,.72]){box(b,w+.24,.2,w+.24,C.trim,tx,y+h*level,tz);archedWindow(b,q,tx,y+h*level+.4,tz+w/2+.02,w*.34,h*.16,{frame:C.trim,glass:C.glass});}box(b,w+.3,.24,w+.3,C.trim,tx,y+h,tz);q.add(new T.SphereGeometry(w*.56,low?8:10,6,0,Math.PI*2,0,Math.PI/2),C.copper,[tx,y+h+.2,tz],[0,Math.PI/4,0],[1,.9,1]);cyl(b,w*.2,w*.24,.7,wall,tx,y+h+.2+w*.5,tz,8);q.add(new T.SphereGeometry(w*.26,8,6),C.copper,[tx,y+h+1+w*.6,tz],[0,0,0],[1,1.2,1]);box(q,.06,.8,.06,C.gold,tx,y+h+1.2+w*.9,tz);box(q,.36,.06,.06,C.gold,tx,y+h+1.7+w*.9,tz);};
 box(b,7,6.6,11,C.pink,x1,y,bz-5.5);roof(q,7.3,2.6,11.3,C.redDark,x1,y+6.6,bz-5.5,Math.PI/2);tower(x1-3,bz+.6,2.4,10.4,C.pink);tower(x1+3,bz+.6,2.4,10.4,C.pink);archedWindow(b,q,x1,y,bz+.02,1.6,3,{frame:C.trim,glass:'#33261e'});
 box(b,9,6,10,C.cream,x2,y,bz-5);drumDome(b,q,x2,y+6,bz-5,2.6,2,{wall:C.cream,trim:C.trim,dome:'#3f4a52',finial:C.gold,glass:C.glass},{low,sides:low?8:12});q.add(new T.TorusGeometry(.9,.1,5,12),C.gold,[x2,y+12.9,bz-5],[Math.PI/2,0,0]);for(const dx of [-2.6,0,2.6])archedWindow(b,q,x2+dx,y+.6,bz+.02,1.1,3.2,{frame:C.trim,glass:C.glass});
 box(b,8,6.4,11,C.white,x3,y,bz-5.5);tower(x3-3,bz+.4,2,8.6,C.white);tower(x3+3,bz+.4,2,8.6,C.white);drumDome(b,q,x3,y+6.4,bz-7,2.2,1.6,{wall:C.white,trim:C.trim,dome:C.copper,finial:C.gold,glass:C.glass},{low,cross:true,sides:low?8:12});b.add(new T.CylinderGeometry(.02,2.6,1.6,3,1),C.white,[x3,y+7.2,bz+.1],[0,-Math.PI/2,0],[.14,1,1]);
 b.mesh(group,vertexMaterial(.94),'baroque-church-walls-and-towers');q.mesh(group,vertexMaterial(.6),'baroque-caps-domes-and-windows');group.userData={landmark:'Baroque churches of Vilnius',churches:3};
}

function threeCrosses(root:T.Object3D,finish:number,low:boolean){
 const group=new T.Group();group.name='hill-of-three-crosses';root.add(group);const h=new Builder(),s=new Builder(),x=Math.max(finish+26,vilnius.baroque[2]+34),z=-56,top=vilnius.crossesHillTop;
 h.add(new T.SphereGeometry(1,low?12:20,low?8:12),C.hill,[x,-4.4,z],[0,0,0],[26,top+4.4,13],.08);for(const [dx,height] of [[-1.6,3.6],[0,4.4],[1.6,3.6]] as const){box(s,.36,height,.36,C.white,x+dx,top-.2,z+1);box(s,1.3,.34,.36,C.white,x+dx,top-.2+height*.7,z+1);}box(s,5,.4,1.4,C.white,x,top-.4,z+1);
 h.mesh(group,vertexMaterial(.97),'crosses-hill');s.mesh(group,vertexMaterial(.9),'three-white-crosses');group.userData={landmark:'Three Crosses'};
}

/** Hot-air balloons: a striped envelope, a basket and its lines. */
function balloon(parent:T.Object3D,index:number){const group=new T.Group();group.name='hot-air-balloon';parent.add(group);const b=new Builder(),[a,c]=balloons[index%balloons.length];for(let k=0;k<8;k++)b.add(new T.SphereGeometry(2.2,6,10,k*Math.PI/4,Math.PI/4),k%2?a:c,[0,0,0],[0,0,0],[1,1.2,1]);cyl(b,.9,.5,.5,a,0,-2.8,0,8);box(b,.7,.5,.7,C.basket,0,-4.2,0);for(const [dx,dz] of [[-.3,-.3],[.3,-.3],[-.3,.3],[.3,.3]] as const)b.strut(new T.Vector3(dx,-3.7,dz),new T.Vector3(dx*2,-2.6,dz*2),.02,C.iron,4,1);b.mesh(group,vertexMaterial(.8),'balloon-envelope-and-basket');return group;}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'gediminas-brick-tower-on-its-hill','cathedral-temple-front-and-bell-tower','st-annes-brick-gothic-front','baroque-church-towers','three-crosses-hill','hot-air-balloons','lanterns-stalls-and-statues']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(37000),detail=new T.Group();detail.name='vilnius-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  riverside(detail,finish,r,low);castleHill(detail,flagMaterial(bandedFlagTexture([['#fdb913',1],['#006a44',1],['#c1272d',1]])),r,low);cathedral(detail,low);churches(detail,low);threeCrosses(detail,finish,low);
  const limes:Placement[]=[];for(let k=0;k<(low?8:18);k++)limes.push({x:-46+r()*(finish+130),y:vilnius.bankTop,z:-18.4-r()*1.6,scale:.55+r()*.2,rotation:r()*6});plantGrove(detail,'plane',limes,{low,name:'riverside-limes'});
  const fleet=new T.Group();fleet.name='hot-air-balloons';detail.add(fleet);const craft=[0,1,2,3].slice(0,low?2:4).map(index=>{const one=balloon(fleet,index);one.userData.home=[20+index*finish/3.4,15+index%2*3,-64-index%3*10];return one;});
  const swifts=createFlock(detail,{name:'vilnius-swifts',count:low?6:12,centre:[vilnius.annesX,10,-30],radius:[36,3,6],speed:.34,size:.5,color:'#2c3440',wing:'#1f2630',seed:131,glide:true});
  let reduced=context.reducedMotion;const drift=(time:number)=>{craft.forEach((one,index)=>{const [hx,hy,hz]=one.userData.home as number[];one.position.set(hx+Math.sin(time*.05+index)*9,hy+Math.sin(time*.3+index*2)*.8,hz);});};drift(0);swifts.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;drift(time);swifts.update(time);},setReducedMotion(value){reduced=value;swifts.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.8)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*89+Math.round(definition.x),y=surface(0);
  if(t==='rooftop'){chimneyStack(b,w/2-.9,surface(w/2-.9),rear,2+seed%2,{brick:C.brickPlain,cap:'#6d3a2c',pot:'#d8b08a'});flowerBox(b,-w/2+.3,w/2-1.6,y,rear+.12,C.wood,['#d32f3a','#f2d24a','#ffffff']);if(w>3.6)dormer(b,-w/2+1.1,surface(-w/2+1.1),rear-.05,C.cream,C.glass,C.red);}
  else if(t==='ground'){lampPost(b,glow,-w/2+.5,y,-1.3);if(seed%2)awningStall(b,-w/2+1.9,y,-2.3,{wood:C.wood,stripeA:'#006a44',stripeB:'#fdb913',goods:['#e89a2a','#c58a3c','#f2c24a']});else statue(b,-w/2+1.6,y,-2.1,1.9,{pedestal:C.stone,figure:'#5f6a60'});bench(b,w/2-1.3,y,-1.9);if(w>8){pottedTree(b,.4,y,-2.3,.75,{pot:'#b96a42',trunk:'#5a4636',leaf:C.leaf,fruit:'#e85a7a'},seed);lampPost(b,glow,w/2-.5,y,-1.3);}}
  else if(t==='terrace'){balustrade(b,-w/2+.25,w/2-.25,y,rear,{rail:C.trim,base:C.stone,baluster:C.white});pottedTree(b,-w/2+.9,y,-1.7,.75,{pot:'#b96a42',trunk:'#5a4636',leaf:C.leaf,fruit:'#f2d24a'},seed);if(w>5)bench(b,w/2-1.5,y,-1.8);}
  finishProps(root,b,glow,'vilnius-squares-and-roofs');
 },
};
