import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl,roof} from './europe-landmarks';
import {Builder,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,awningStall,balustrade,bandedFlagTexture,bench,chimneyStack,column,dormer,finishProps,flagMaterial,lampPost,pointedWindow,pottedTree,railing,texturedStone,townhouse,wavingFlag,windowGrid} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Latvia: Riga across the Daugava (SRS-632.22). Three spires mark the old
 * town: St Peter's tiered green steeple, the cathedral's swelling Baroque
 * cap on its brick tower, and the needle of St James. On the quay stand the
 * castle with its round tower and the flag, the House of the Blackheads
 * with its stepped brick gable and blue-and-gold clock, and the Three
 * Brothers; beyond them run Art Nouveau fronts in pale colours, the
 * Freedom Monument lifting its three gold stars, and dark timber houses.
 * River boats pass. The route carries lanterns, amber stalls, columns and
 * the black cat of the Cat House. Scenery only: nothing collides. */
const C={brick:'#f0d8cc',brickPlain:'#a8553b',copper:'#5f8f7c',white:'#f6f3ea',trim:'#fbf8ef',cream:'#efe2c2',yellow:'#e6c56a',green:'#8fae8a',blue:'#a9c6e0',pink:'#e3b9b0',glass:'#27343f',red:'#a8533a',slate:'#4f5a60',gold:'#d6a938',
 clock:'#2f4f8f',timber:'#6a4f3a',timberGreen:'#4f6a55',stone:'#d9d2c0',quay:'#cfc8b6',iron:'#22262a',wood:'#7a5c40',leaf:'#4a7d3f',cat:'#1c1c1e',amber:'#e89a2a',hull:'#f6f3ea'} as const;
const nouveau=[C.blue,C.cream,C.pink,C.green,'#e9d9b0','#cfc6e0'] as const;
const base=europeEnvironment('LVA',{landmark:false,town:false});
export const riga={quayTop:-1,castleX:8,blackheadsX:52,brothersX:84,peterX:60,domeX:98,jamesX:30,monumentX:142} as const;
const brickwork=()=>texturedStone('sandstone-blocks','#c47a66',2.2,.94);

function quay(root:T.Object3D,finish:number,low:boolean){
 const group=new T.Group();group.name='daugava-quay';root.add(group);const s=new Builder(),p=new Builder(),top=riga.quayTop,from=-56,to=finish+100;
 box(s,to-from,top+4.4,70,C.quay,(from+to)/2,-4.4,-51.5);box(s,to-from,.3,.5,C.stone,(from+to)/2,top,-16.7);for(let x=from+2;x<to;x+=low?5:2.5)box(p,.05,.9,.05,C.iron,x,top,-16.7);box(p,to-from-4,.05,.05,C.iron,(from+to)/2,top+.9,-16.7);
 s.mesh(group,vertexMaterial(.95),'quay-paving');p.mesh(group,vertexMaterial(.6),'quay-railings');group.userData={feature:'Daugava quay'};
}

function spires(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='three-spires-of-riga';root.add(group);const s=new Builder(.5),p=new Builder(),y=riga.quayTop,gothic={frame:C.stone,glass:C.glass};
 // St Peter's: a brick tower and a steeple of three green tiers with open galleries.
 const px=riga.peterX,pz=-57;box(s,9,7,16,C.brick,px+7,y,pz-6);roof(p,9.3,3.6,16.3,C.red,px+7,y+7,pz-6,Math.PI/2);box(s,4.4,8.6,4.4,C.brick,px,y,pz);pointedWindow(s,p,px,y+3,pz+2.22,1.2,3.6,low,gothic);
 let level=y+8.6;for(const [radius,h] of [[1.9,1.5],[1.5,1.4],[1.1,1.3]] as const){p.add(new T.SphereGeometry(radius*1.2,low?8:12,6,0,Math.PI*2,0,Math.PI/2),C.copper,[px,level,pz],[0,0,0],[1,.6,1]);for(let k=0;k<6;k++){const a=k/6*Math.PI*2;cyl(p,.06,.06,h,C.copper,px+Math.cos(a)*radius*.7,level+radius*.5,pz+Math.sin(a)*radius*.7,5);}level+=radius*.5+h;}
 cone(p,.8,3.4,C.copper,px,level,pz,8);p.add(new T.SphereGeometry(.12,6,5),C.gold,[px,level+3.5,pz]);box(p,.34,.2,.03,C.gold,px,level+3.8,pz);
 // The cathedral: a broad brick tower under a swelling cap and lantern.
 const dx=riga.domeX,dz=-42;box(s,9,6.4,15,C.brick,dx+7,y,dz-5);roof(p,9.3,3,15.3,C.red,dx+7,y+6.4,dz-5,Math.PI/2);box(s,4.8,8.4,4.8,C.brick,dx,y,dz);pointedWindow(s,p,dx,y+3,dz+2.42,1.2,3.4,low,gothic);p.add(new T.CylinderGeometry(.8,.8,.06,16),C.white,[dx,y+6.9,dz+2.44],[Math.PI/2,0,0]);
 p.add(new T.SphereGeometry(2.7,low?8:12,8,0,Math.PI*2,0,Math.PI/2),C.copper,[dx,y+8.4,dz],[0,Math.PI/8,0],[1,.8,1]);cyl(p,.9,1.1,1.3,C.copper,dx,y+10.4,dz,8);p.add(new T.SphereGeometry(1.1,10,8),C.copper,[dx,y+12.3,dz],[0,0,0],[1,1.1,1]);cone(p,.3,1.4,C.copper,dx,y+13.2,dz,8);p.add(new T.SphereGeometry(.11,6,5),C.gold,[dx,y+14.7,dz]);
 // St James: a plain tower and a thin green needle.
 const jx=riga.jamesX,jz=-46;box(s,3.6,7.6,3.6,C.brick,jx,y,jz);for(const dxx of [-1.5,1.5])for(const dzz of [-1.5,1.5])cone(p,.3,1,C.copper,jx+dxx,y+7.6,jz+dzz,6);cone(p,1.6,6.6,C.copper,jx,y+7.6,jz,8);p.add(new T.SphereGeometry(.11,6,5),C.gold,[jx,y+14.3,jz]);
 s.mesh(group,brickwork(),'brick-church-towers');p.mesh(group,vertexMaterial(.6),'green-steeples-and-caps');group.userData={landmark:"St Peter's, the cathedral and St James",spires:3};
}

function quayFronts(root:T.Object3D,flag:T.Material,finish:number,r:()=>number,low:boolean){
 const group=new T.Group();group.name='riga-quay-fronts';root.add(group);const s=new Builder(),b=new Builder(.5),p=new Builder(),y=riga.quayTop;
 // The castle: cream walls, a round tower and the flag.
 const cx=riga.castleX;box(s,16,5,8,C.cream,cx,y,-26);windowGrid(s,p,cx,y+.5,-21.98,15,4,low?5:8,2,{wall:C.cream,trim:C.trim,glass:C.glass,roof:C.red},false,low);roof(p,16.3,2,8.3,C.red,cx,y+5,-26);cyl(s,2.4,2.5,7,C.cream,cx-8,y,-22.6,low?10:14);cone(p,2.7,2.4,C.red,cx-8,y+7,-22.6,low?10:14);cyl(p,.05,.07,2.6,C.iron,cx-8,y+9.3,-22.6,5);
 // The House of the Blackheads: a stepped brick gable with white ornaments and the blue clock.
 const hx=riga.blackheadsX,hz=-22,hw=8,hh=5.6;box(b,hw,hh,7,C.brick,hx,y,hz-3.5);for(let k=0;k<5;k++){const sw=hw*(1-k/5);box(b,sw,.9,.6,C.brick,hx,y+hh+k*.9,hz-.3);for(const side of [-1,1])cone(s,.2,.7,C.white,hx+side*(sw/2-.25),y+hh+(k+1)*.9,hz-.3,4);}
 for(const dx of [-2.6,0,2.6])archedWindow(s,p,hx+dx,y,hz+.02,1.3,2.6,{frame:C.white,glass:'#33261e'});for(const dx of [-2.6,-.9,.9,2.6])archedWindow(s,p,hx+dx,y+3.2,hz+.02,.8,1.6,{frame:C.white,glass:C.glass});
 p.add(new T.CylinderGeometry(.9,.9,.08,18),C.clock,[hx,y+hh+1.5,hz+.04],[Math.PI/2,0,0]);p.add(new T.TorusGeometry(.9,.08,5,18),C.gold,[hx,y+hh+1.5,hz+.08]);box(p,.06,.6,.03,C.gold,hx,y+hh+1.5,hz+.1);box(p,.4,.06,.03,C.gold,hx+.2,y+hh+1.5,hz+.1);for(const dx of [-3.2,-1.1,1.1,3.2]){cyl(s,.12,.15,.8,C.white,hx+dx,y+2.7,hz+.2,6);s.add(new T.SphereGeometry(.12,6,5),C.white,[hx+dx,y+3.6,hz+.2]);}
 // The Three Brothers: a white stepped gable, a yellow curved one, and a narrow green one.
 const tx=riga.brothersX;townhouse(s,p,tx-3.6,y,-22,3.4,4.8,5,{wall:C.white,trim:C.trim,glass:C.glass,roof:C.red},{rows:2,roof:'gable',door:true,low});townhouse(s,p,tx,y,-22,3.6,5.6,5,{wall:C.yellow,trim:C.trim,glass:C.glass,roof:C.red},{rows:3,roof:'gable',arched:true,door:true,low});townhouse(s,p,tx+3.2,y,-22,2.6,5,5,{wall:C.green,trim:C.trim,glass:C.glass,roof:C.red},{rows:2,roof:'gable',door:true,low});
 // Art Nouveau fronts: pale colours, white pilasters and masks, corner turrets.
 let x=riga.brothersX+10,index=0;while(x<riga.monumentX-8){const w=6+r()*2.4,h=6.4+r()*1.4,wall=nouveau[index%nouveau.length];townhouse(s,p,x+w/2,y,-24,w-.14,h,6,{wall,trim:C.trim,glass:C.glass,roof:C.slate},{rows:3,roof:'parapet',arched:index%2===0,door:true,low});for(const side of [-1,1])box(s,.26,h,.14,C.white,x+w/2+side*(w/2-.3),y,-23.9);s.add(new T.SphereGeometry(.34,8,6),C.white,[x+w/2,y+h-.5,-23.86],[0,0,0],[1,1.2,.5]);if(index%2){cyl(s,.8,.8,1.6,wall,x+w-.9,y+h,-24.9,8);cone(p,.95,1.6,C.copper,x+w-.9,y+h+1.6,-24.9,8);}x+=w;index++;}
 // Timber houses beyond the monument.
 for(let k=0;k<(low?3:6);k++){const wx=riga.monumentX+12+k*5.6,w=4.6,h=3+((k*7)%3)*.5,wall=k%2?C.timber:C.timberGreen;if(wx>finish+90)break;box(s,w,h,4,wall,wx,y,-24);for(let j=1;j<5;j++)box(p,w+.02,.04,.02,'#2a2018',wx,y+j*h/5,-21.98);for(const dx of [-1.2,1.2]){box(p,.8,.9,.06,C.white,wx+dx,y+1,-21.96);box(p,.6,.7,.08,C.glass,wx+dx,y+1.1,-21.95);}roof(p,w+.4,1.4,4.4,C.slate,wx,y+h,-24);}
 s.mesh(group,vertexMaterial(.93),'castle-brothers-and-art-nouveau-fronts');b.mesh(group,brickwork(),'blackheads-brick-gable');p.mesh(group,vertexMaterial(.65),'roofs-clock-and-windows');wavingFlag(group,flag,cx-7.94,y+11.4,-22.6,2.2,'latvia-flag',.5);group.userData={landmark:'Riga Castle, House of the Blackheads and the Three Brothers'};
}

function monument(root:T.Object3D){
 const group=new T.Group();group.name='freedom-monument';root.add(group);const s=new Builder(),m=new Builder(),x=riga.monumentX,y=riga.quayTop,z=-30;
 for(const [w,h,dy] of [[5,.6,0],[3.6,1.6,.6],[2.4,1.4,2.2]] as const)box(s,w,h,w,C.stone,x,y+dy,z);box(s,1,6.4,1,C.stone,x,y+3.6,z);cyl(m,.2,.3,1.6,C.copper,x,y+10,z,8);m.add(new T.SphereGeometry(.2,8,6),C.copper,[x,y+11.8,z]);for(const side of [-1,1])m.strut(new T.Vector3(x+side*.18,y+11.3,z),new T.Vector3(x+side*.34,y+12.5,z),.05,C.copper,5,1);for(const dx of [-.4,0,.4])m.add(new T.OctahedronGeometry(.16,0),C.gold,[x+dx,y+12.74+(dx?0:.14),z]);
 s.mesh(group,vertexMaterial(.94),'monument-granite-column');m.mesh(group,vertexMaterial(.5,{metalness:.3}),'liberty-figure-and-gold-stars');group.userData={landmark:'Freedom Monument',stars:3};
}

function riverBoat(root:T.Object3D){const b=new Builder();box(b,7.4,.6,1.9,C.hull,0,0,0);box(b,7.6,.1,2,C.red,0,.6,0);box(b,5,.8,1.6,C.glass,-.4,.7,0);box(b,5.2,.08,1.7,C.hull,-.4,1.5,0);const mesh=b.mesh(root,vertexMaterial(.55),'daugava-river-boat');mesh.userData={animated:true};return mesh;}

// Route furniture, in a platform's own coordinates, behind the walking lane.
/** The black cat of the Cat House: back arched, tail up. */
function blackCat(b:Builder,x:number,y:number,z:number){cyl(b,.3,.34,.5,C.yellow,x,y,z,8);cone(b,.36,.4,C.red,x,y+.5,z,8);const base=y+.9;b.add(new T.SphereGeometry(.2,8,6),C.cat,[x,base+.2,z],[0,0,0],[1.5,1,.7]);b.add(new T.SphereGeometry(.12,8,6),C.cat,[x+.3,base+.22,z]);for(const dz of [-.05,.05])b.add(new T.ConeGeometry(.04,.1,4),C.cat,[x+.3,base+.36,z+dz]);for(const dx of [-.2,.2])box(b,.05,.2,.05,C.cat,x+dx,base-.06,z);b.strut(new T.Vector3(x-.28,base+.2,z),new T.Vector3(x-.4,base+.62,z),.03,C.cat,4,.6);}
function amberStall(b:Builder,x:number,y:number,z:number){awningStall(b,x,y,z,{wood:C.wood,stripeA:'#9e3039',stripeB:C.white,goods:[C.amber,'#f2c24a','#c9741a']});for(let k=0;k<5;k++)b.add(new T.SphereGeometry(.06,6,4),C.amber,[x-.7+k*.35,y+1.6,z+.5]);}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'st-peters-tiered-steeple','cathedral-baroque-cap','st-james-needle','house-of-the-blackheads-gable-and-clock','three-brothers','art-nouveau-fronts','freedom-monument-stars','black-cat-and-amber-stalls']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(37100),detail=new T.Group();detail.name='riga-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  quay(detail,finish,low);spires(detail,low);quayFronts(detail,flagMaterial(bandedFlagTexture([['#9e3039',2],['#ffffff',1],['#9e3039',2]])),finish,r,low);monument(detail);
  const limes:Placement[]=[];for(let k=0;k<(low?8:18);k++)limes.push({x:-46+r()*(finish+130),y:riga.quayTop,z:-18-r()*.8,scale:.55+r()*.2,rotation:r()*6});plantGrove(detail,'plane',limes,{low,name:'quay-limes'});
  const boat=riverBoat(detail),gulls=createFlock(detail,{name:'daugava-gulls',count:low?5:10,centre:[finish*.5,7,-10],radius:[32,3,6],speed:.2,size:.8,color:'#f2f2ee',wing:'#c9ccd0',seed:127,glide:true});
  let reduced=context.reducedMotion;const sail=(time:number)=>{const lap=finish+110;boat.position.set(-50+(time*.85)%lap,-2.5+Math.sin(time)*.03,-9);};sail(0);gulls.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;sail(time);gulls.update(time);},setReducedMotion(value){reduced=value;gulls.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.8)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*83+Math.round(definition.x),y=surface(0);
  if(t==='rooftop'){chimneyStack(b,w/2-.9,surface(w/2-.9),rear,2+seed%2,{brick:C.brickPlain,cap:'#6d3a2c',pot:'#d8b08a'});if(w>3.6)dormer(b,-w/2+1.1,surface(-w/2+1.1),rear-.05,C.cream,C.glass,C.red);if(seed%2)blackCat(b,0,y,rear+.1);}
  else if(t==='bridge'){railing(b,-w/2+.25,w/2-.25,y,rear,C.iron,C.gold);lampPost(b,glow,-w/2+.7,surface(-w/2+.7),rear+.3);if(w>6)lampPost(b,glow,w/2-.7,surface(w/2-.7),rear+.3);}
  else if(t==='arch'){for(const side of [-1,1])column(b,side*(w/2-.5),y,rear+.25,.2,2.6,C.white,10);box(b,w-.4,.26,.5,C.trim,0,y+2.6,rear+.25);b.add(new T.SphereGeometry(.3,8,6),C.white,[0,y+3,rear+.25],[0,0,0],[1,1.2,.6]);}
  else if(t==='ground'){lampPost(b,glow,-w/2+.5,y,-1.3);amberStall(b,-w/2+1.9,y,-2.3);bench(b,w/2-1.3,y,-1.9);if(w>8){pottedTree(b,.4,y,-2.3,.75,{pot:'#b96a42',trunk:'#5a4636',leaf:C.leaf,fruit:'#e85a7a'},seed);lampPost(b,glow,w/2-.5,y,-1.3);}}
  else if(t==='terrace'){balustrade(b,-w/2+.25,w/2-.25,y,rear,{rail:C.trim,base:C.stone,baluster:C.white});pottedTree(b,-w/2+.9,y,-1.7,.75,{pot:'#b96a42',trunk:'#5a4636',leaf:C.leaf,fruit:'#f2d24a'},seed);if(w>5)blackCat(b,w/2-.7,y,rear+.2);}
  finishProps(root,b,glow,'riga-quays-and-roofs');
 },
};
