import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,balustrade,bench,column,finishProps,flagMaterial,fountain,lampPost,pottedTree,pyramid,railing,statue,wavingFlag,windowGrid} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Sweden: Drottningholm on Lake Malaren (SRS-632.14). On its island the
 * palace shows its long pale-yellow front to the water: a tall centre block
 * and corner pavilions under dark hipped roofs with lanterns, a terrace with
 * urns and a double stair down to the quay. Beside it lie the baroque
 * garden with clipped box parterres, cone-shaped yews, the bronze fountain
 * and a lime avenue; the white palace theatre; and, among the trees, the
 * red-and-yellow Chinese Pavilion under its green tent roofs. A white
 * steamer crosses the lake under the blue-and-yellow flag. The route
 * carries clipped trees in planters, urns, lanterns and white benches.
 * Scenery only: nothing collides. */
const C={wall:'#edd38a',wallDark:'#e3d19c',white:'#f8f5ec',trim:'#fbf8ef',rustic:'#cfc7b6',roof:'#3a4248',roofLight:'#59636a',glass:'#27343f',copper:'#5f8f7c',gold:'#d6a938',bronze:'#55655c',
 lawn:'#86b062',hedge:'#3f6f3f',yew:'#2f5a36',gravel:'#e0d6bc',granite:'#b9b2a6',red:'#b23a2e',yellow:'#e8c23a',paviGreen:'#4f8f6a',iron:'#22262a',wood:'#7a5c40',leaf:'#4a7d3f',hull:'#f6f3ea',funnel:'#f2c81e'} as const;
// The island, its gardens and the palace are built here on level ground.
const base=europeEnvironment('SWE',{landmark:false,flat:true,town:false});
export const drottningholm={shoreTop:-1,palaceX:72,palaceZ:-36,gardenX:[104,150],pavilionX:176,theatreX:30} as const;

function island(root:T.Object3D,finish:number,low:boolean){
 const group=new T.Group();group.name='lovon-island-shore';root.add(group);const s=new Builder(),p=new Builder(),top=drottningholm.shoreTop,from=-56,to=finish+100;
 box(s,to-from,top+4.4,70,C.lawn,(from+to)/2,-4.4,-53.5);box(s,to-from,top+4.3,1.4,C.granite,(from+to)/2,-4.4,-18.6);for(let x=from+2;x<to;x+=low?8:4)cyl(p,.12,.15,.5,C.iron,x,top,-18.3,6);
 // Gravel walks along the shore and up to the palace.
 box(p,to-from,.05,2.2,C.gravel,(from+to)/2,top,-21);box(p,16,.05,9,C.gravel,drottningholm.palaceX,top,-26.5);
 s.mesh(group,vertexMaterial(.97),'island-lawns-and-granite-edge');p.mesh(group,vertexMaterial(.95),'gravel-walks-and-bollards');group.userData={feature:'Lovon island shore'};
}

function palace(root:T.Object3D,flag:T.Material,low:boolean){
 const group=new T.Group();group.name='drottningholm-palace';root.add(group);const s=new Builder(),p=new Builder(),x=drottningholm.palaceX,y=drottningholm.shoreTop+1,z=drottningholm.palaceZ,colors={wall:C.wall,trim:C.trim,glass:C.glass,roof:C.roof};
 // The terrace with its balustrade, urns and double stair.
 box(s,50,1,8,C.rustic,x,y-1,z+4);balustrade(s,x-25,x-4,y,z+7.8,{rail:C.trim,base:C.rustic,baluster:C.white});balustrade(s,x+4,x+25,y,z+7.8,{rail:C.trim,base:C.rustic,baluster:C.white});
 for(let k=0;k<5;k++)box(s,8-k*.0,.2,.5,C.granite,x,y-1+k*.2,z+10.4-k*.5);for(const ux of [-24,-14,-5,5,14,24]){cyl(p,.2,.12,.5,C.bronze,x+ux,y+1.05,z+7.8,8);p.add(new T.SphereGeometry(.2,8,6),C.bronze,[x+ux,y+1.7,z+7.8]);}
 // Centre block: a rusticated ground floor, two tall storeys with pilasters, and a hipped roof with its lantern.
 const cw=16,ch=7.4;box(s,cw,ch,8,C.wall,x,y,z-2);box(s,cw+.2,1.9,8.2,C.rustic,x,y,z-2);box(s,cw+.4,.3,8.4,C.trim,x,y+ch-.15,z-2);windowGrid(s,p,x,y+2.2,z+2.02,cw-1,ch-2.8,low?5:7,2,colors,true,low);for(let k=0;k<(low?4:8);k++)box(s,.28,ch-2.2,.14,C.trim,x-cw/2+.5+k*(cw-1)/(low?3:7),y+1.9,z+2.08);
 for(const dx of [-2.4,0,2.4])archedWindow(s,p,x+dx,y,z+2.02,1.2,1.7,{frame:C.trim,glass:'#3a2c24'});pyramid(p,3.4,cw/2+.2,2.6,C.roof,x,y+ch,z-2);box(s,3,1.3,3,C.wall,x,y+ch+2.6,z-2);pyramid(p,.3,1.8,1.2,C.roof,x,y+ch+3.9,z-2);cyl(p,.05,.07,2.4,C.iron,x,y+ch+5.1,z-2,5);
 // Wings and corner pavilions with their domed lantern roofs.
 for(const side of [-1,1]){const wx=x+side*14.5,ww=13,wh=5.6;box(s,ww,wh,6.4,C.wall,wx,y,z-2.6);box(s,ww+.1,1.9,6.5,C.rustic,wx,y,z-2.6);box(s,ww+.3,.26,6.7,C.trim,wx,y+wh-.13,z-2.6);windowGrid(s,p,wx,y+.4,z+.62,ww-.8,wh-.9,low?4:6,3,colors,false,low);pyramid(p,ww/2-1.4,ww/2+.15,1.7,C.roof,wx,y+wh,z-2.6);
  const px=x+side*24,pw=6.4,ph=6.6;box(s,pw,ph,7.4,C.wall,px,y,z-1.6);box(s,pw+.1,1.9,7.5,C.rustic,px,y,z-1.6);box(s,pw+.3,.26,7.7,C.trim,px,y+ph-.13,z-1.6);windowGrid(s,p,px,y+.4,z+2.12,pw-.8,ph-.9,3,3,colors,true,low);
  p.add(new T.SphereGeometry(3.4,low?10:16,8,0,Math.PI*2,0,Math.PI/2),C.roof,[px,y+ph,z-1.6],[0,Math.PI/4,0],[1,.72,1.1]);cyl(s,.7,.8,1,C.wall,px,y+ph+2.3,z-1.6,8);p.add(new T.SphereGeometry(.8,10,8,0,Math.PI*2,0,Math.PI/2),C.copper,[px,y+ph+3.3,z-1.6]);p.add(new T.SphereGeometry(.12,6,5),C.gold,[px,y+ph+4.25,z-1.6]);}
 s.mesh(group,vertexMaterial(.93),'palace-pale-yellow-walls-and-terrace');p.mesh(group,vertexMaterial(.55),'palace-dark-roofs-and-windows');wavingFlag(group,flag,x+.06,y+ch+6.7,z-2,2.6,'sweden-flag',.62);group.userData={landmark:'Drottningholm Palace',pavilions:2};
}

function garden(root:T.Object3D,r:()=>number,low:boolean){
 const group=new T.Group();group.name='baroque-garden';root.add(group);const b=new Builder(),m=new Builder(),top=drottningholm.shoreTop,[g0,g1]=drottningholm.gardenX,z0=-24,z1=-46;
 box(b,g1-g0,.05,z0-z1,C.gravel,(g0+g1)/2,top,(z0+z1)/2);
 // Box parterres: hedged beds with scrolls of clipped box on coloured gravel.
 const beds=low?2:4;for(let k=0;k<beds;k++)for(const row of [0,1]){const cx=g0+(k+.5)*(g1-g0)/beds,cz=z0-5-row*11,w=(g1-g0)/beds-2.4,d=8;box(b,w,.06,d,'#d9b89a',cx,top+.05,cz);
  for(const side of [-1,1]){box(b,w,.4,.3,C.hedge,cx,top,cz+side*d/2);box(b,.3,.4,d,C.hedge,cx+side*w/2,top,cz);}
  for(let j=0;j<(low?2:4);j++)b.add(new T.TorusGeometry(.9+j*.25,.12,5,low?8:14,Math.PI*1.4),C.hedge,[cx+(j%2?1:-1)*w*.2,top+.2,cz+(j<2?1:-1)*d*.2],[Math.PI/2,0,j*1.3]);
  for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1]] as const)cone(b,.45,1.5,C.yew,cx+dx*(w/2+.6),top,cz+dz*(d/2+.6),10);}
 // The bronze fountain on the garden's axis.
 fountain(b,(g0+g1)/2,top,(z0+z1)/2,2.2,{stone:C.granite,water:'#8fc0cf'});statue(m,(g0+g1)/2,top+2.3,(z0+z1)/2,1.5,{pedestal:C.bronze,figure:C.bronze});
 for(const sx of [g0-1.5,g1+1.5])for(let k=0;k<(low?3:6);k++)statue(m,sx,top,z0-2-k*(z0-z1-4)/(low?2:5),1.6,{pedestal:C.granite,figure:C.white});
 b.mesh(group,vertexMaterial(.95),'box-parterres-yews-and-fountain');m.mesh(group,vertexMaterial(.7),'garden-statues');
 const limes:Placement[]=[];for(const sx of [g0-4,g1+4])for(let k=0;k<(low?5:10);k++)limes.push({x:sx+(r()-.5)*.6,y:top,z:z0-1-k*(z0-z1)/(low?5:10),scale:.9+r()*.15,rotation:r()*6});plantGrove(group,'plane',limes,{low,name:'lime-avenue'});group.userData={feature:'Baroque garden',parterres:beds*2};
}

function pavilionAndTheatre(root:T.Object3D,finish:number,low:boolean){
 // The Chinese Pavilion: red walls, yellow frames and green tent roofs with upturned corners.
 const group=new T.Group();group.name='chinese-pavilion';root.add(group);const s=new Builder(),p=new Builder(),x=Math.max(drottningholm.pavilionX,finish+20),y=drottningholm.shoreTop,z=-40;
 const tent=(cx:number,cy:number,cz:number,half:number,h:number)=>{pyramid(p,half*.25,half+.5,h*.55,C.paviGreen,cx,cy,cz);pyramid(p,.05,half*.3,h*.6,C.paviGreen,cx,cy+h*.5,cz);for(const dx of [-1,1])for(const dz of [-1,1])cone(p,.14,.5,C.gold,cx+dx*(half+.45),cy,cz+dz*(half+.45),5);p.add(new T.SphereGeometry(.16,6,5),C.gold,[cx,cy+h*1.14,cz]);};
 box(s,6,5,5,C.red,x,y,z);for(const level of [.4,2.8])for(const dx of [-1.8,0,1.8]){box(p,1,1.6,.08,C.glass,x+dx,y+level,z+2.52);for(const side of [-1,1])box(s,.1,1.7,.1,C.yellow,x+dx+side*.55,y+level,z+2.54);box(s,1.3,.1,.1,C.yellow,x+dx,y+level+1.65,z+2.54);}box(s,6.3,.2,5.3,C.yellow,x,y+2.5,z);tent(x,y+5,z,3,3.4);
 for(const side of [-1,1]){box(s,5,2.6,3,C.red,x+side*5.4,y,z+.6);for(const dx of [-1.3,0,1.3])box(p,.8,1.4,.08,C.glass,x+side*5.4+dx,y+.5,z+2.12);box(s,5.2,.14,3.2,C.yellow,x+side*5.4,y+2.6,z+.6);pyramid(p,1.2,2.9,1.2,C.paviGreen,x+side*5.4,y+2.7,z+.6);box(s,3,3,3,C.red,x+side*9.2,y,z+2.4);box(p,1,1.6,.08,C.glass,x+side*9.2,y+.5,z+3.92);tent(x+side*9.2,y+3,z+2.4,1.5,2.2);}
 s.mesh(group,vertexMaterial(.9),'pavilion-red-walls-and-yellow-frames');p.mesh(group,vertexMaterial(.6),'pavilion-green-tent-roofs');group.userData={landmark:'Chinese Pavilion'};
 // The palace theatre: a plain white building with a pedimented centre.
 const theatre=new T.Group();theatre.name='palace-theatre';root.add(theatre);const t=new Builder(),tp=new Builder(),tx=drottningholm.theatreX,tz=-36;
 box(t,18,5,8,C.white,tx,y,tz-4);windowGrid(t,tp,tx,y+.4,tz+.02,17,4,low?5:8,2,{wall:C.white,trim:C.trim,glass:C.glass,roof:C.roof},false,low);pyramid(tp,6,9.2,2,C.roof,tx,y+5,tz-4);box(t,6,5.6,1,C.white,tx,y,tz+.4);for(const dx of [-2,-.7,.7,2])column(t,tx+dx,y,tz+1,.2,4.8,C.trim,8);t.add(new T.CylinderGeometry(.02,3.2,1.3,3,1),C.white,[tx,y+6.25,tz+.7],[0,-Math.PI/2,0],[.2,1,1]);
 t.mesh(theatre,vertexMaterial(.94),'theatre-white-walls');tp.mesh(theatre,vertexMaterial(.6),'theatre-roof-and-windows');theatre.userData={landmark:'Drottningholm Palace Theatre'};
}

/** Blue with a yellow Nordic cross. */
const swedishFlag=()=>pixelTexture(64,(u,v)=>(u>.3&&u<.44)||(v>.4&&v<.6)?[254,204,2,255]:[0,106,167,255],true,false);

function steamer(root:T.Object3D,flag:T.Material){const group=new T.Group();group.name='malaren-steamer';root.add(group);const b=new Builder();box(b,9,.9,2.2,C.hull,0,0,0);box(b,9.2,.12,2.3,'#2f4f6f',0,.3,0);box(b,5.6,.9,1.8,C.hull,-.4,.9,0);box(b,5.4,.4,1.84,C.glass,-.4,1.2,0);box(b,6,.08,2,C.hull,-.4,1.8,0);cyl(b,.3,.34,1.4,C.funnel,.4,1.86,0,10);cyl(b,.31,.31,.2,C.iron,.4,3.1,0,10);cyl(b,.04,.05,1.6,C.iron,-4.2,.9,0,5);b.mesh(group,vertexMaterial(.55),'steamer-hull-and-funnel');wavingFlag(group,flag,-4.14,2.2,0,1,'steamer-flag',.62);group.userData={animated:true};return group;}

// Route furniture, in a platform's own coordinates, behind the walking lane.
/** A clipped cone of yew in a white wooden planter. */
function planterYew(b:Builder,x:number,y:number,z:number){box(b,.7,.6,.7,C.white,x,y,z);for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1]] as const)b.add(new T.SphereGeometry(.07,6,5),C.white,[x+dx*.33,y+.66,z+dz*.33]);cone(b,.42,1.5,C.yew,x,y+.6,z,10);}
function urn(b:Builder,x:number,y:number,z:number){box(b,.5,.7,.5,C.granite,x,y,z);cyl(b,.1,.16,.2,C.bronze,x,y+.7,z,8);cyl(b,.26,.12,.36,C.bronze,x,y+.9,z,10);b.add(new T.SphereGeometry(.2,8,6),'#e85a7a',[x,y+1.34,z]);}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'palace-front-and-corner-pavilions','terrace-urns-and-double-stair','box-parterres-yews-and-fountain','lime-avenue','chinese-pavilion-tent-roofs','palace-theatre','malaren-steamer-and-flag','clipped-yews-urns-and-white-benches']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(46018),detail=new T.Group();detail.name='drottningholm-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);const flag=flagMaterial(swedishFlag());
  island(detail,finish,low);palace(detail,flag,low);garden(detail,r,low);pavilionAndTheatre(detail,finish,low);
  const park:Placement[]=[],birches:Placement[]=[];for(let k=0;k<(low?16:36);k++)park.push({x:-50+r()*(finish+150),y:drottningholm.shoreTop,z:-50-r()*18,scale:1+r()*.6,rotation:r()*6});
  for(let k=0;k<(low?8:16);k++){const x=-50+r()*(finish+150);if(Math.abs(x-drottningholm.palaceX)>30&&(x<drottningholm.gardenX[0]-6||x>drottningholm.gardenX[1]+6))birches.push({x,y:drottningholm.shoreTop,z:-23-r()*6,scale:.7+r()*.3,rotation:r()*6});}
  plantGrove(detail,'plane',park,{low,name:'english-park-trees'});plantGrove(detail,'birch',birches,{low,name:'lakeside-birches'});
  const boat=steamer(detail,flag),gulls=createFlock(detail,{name:'malaren-gulls',count:low?5:10,centre:[finish*.5,7,-10],radius:[32,3,6],speed:.2,size:.8,color:'#f2f2ee',wing:'#c9ccd0',seed:83,glide:true});
  let reduced=context.reducedMotion;const sail=(time:number)=>{const lap=finish+120;boat.position.set(-50+(time*.8)%lap,-2.5+Math.sin(time*.8)*.03,-10);};sail(0);gulls.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;sail(time);gulls.update(time);},setReducedMotion(value){reduced=value;gulls.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.8)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*47+Math.round(definition.x),y=surface(0);
  if(t==='bridge'){railing(b,-w/2+.25,w/2-.25,y,rear,C.white,C.gold);lampPost(b,glow,-w/2+.6,surface(-w/2+.6),rear+.3,C.white);if(w>5)bench(b,w/2-1.4,surface(w/2-1.4),rear+.25,C.white);}
  else if(t==='ground'){planterYew(b,-w/2+.7,y,-1.5);lampPost(b,glow,-w/2+1.7,surface(-w/2+1.7),-1.3);bench(b,w/2-1.3,y,-1.9,C.white);if(w>5.4)urn(b,0,y,-1.9);if(w>8){planterYew(b,w/2-3,y,-1.5);statue(b,-w/2+3.4,y,-2.1,1.7,{pedestal:C.granite,figure:C.white});}}
  else if(t==='terrace'){balustrade(b,-w/2+.25,w/2-.25,y,rear,{rail:C.trim,base:C.rustic,baluster:C.white});pottedTree(b,-w/2+.9,y,-1.7,.75,{pot:C.white,trunk:'#5a4636',leaf:C.leaf,fruit:'#f08a2a'},seed);urn(b,w/2-.8,y,-1.7);if(w>6.4)planterYew(b,0,y,-1.9);}
  else if(t==='stairs'){const from=-w/2+.25,to=w/2-.25;railing(b,from,to,Math.min(surface(from),surface(to)),rear,C.white,C.gold);}
  finishProps(root,b,glow,'drottningholm-walks-and-terraces');
 },
};
