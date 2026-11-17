import * as T from 'three';
import {europeEnvironment} from './europe';
import {box,cone,cyl} from './europe-landmarks';
import {Builder,pixelTexture,random,vertexMaterial,type Placement} from '../kit/common';
import {plantGrove} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {localSurface} from '../kit/landmass';
import {REAR,archedWindow,awningStall,balustrade,bandedFlagTexture,bench,chimneyStack,column,dormer,drumDome,finishProps,flagMaterial,fountain,lampPost,pinnacle,pointedWindow,pottedTree,railing,statue,texturedStone,wavingFlag,windowGrid} from './europe-detail';
import type {CountryEnvironment} from './types';

/** Hungary: Budapest from the Pest embankment (SRS-632.10). Across the
 * Danube, Castle Hill rises behind its retaining walls: the long front of
 * Buda Castle under its green dome, Matthias Church with its patterned tile
 * roof and stone spire, and the white turrets and arcades of the Fisherman's
 * Bastion. Beyond the finish the Chain Bridge crosses the river between its
 * two stone towers and guardian lions, and Gellert Hill carries the Liberty
 * Statue. A yellow tram runs along the far quay and a river boat
 * passes. The route carries ornate lamps, railings, benches and a paprika
 * stall. Scenery only: nothing collides. */
const C={stone:'#e6dcc4',stoneDark:'#cfc3a8',white:'#f6f2e6',trim:'#fbf7ec',glass:'#27343f',copper:'#5f8f7c',copperDark:'#4a7262',slate:'#59636a',gold:'#d6a938',iron:'#22262a',
 rock:'#e2dccb',quay:'#cbc3ae',tram:'#f0c020',tramRoof:'#f5f0e0',green:'#5f8a4a',bronze:'#5f7a6a',red:'#c0392b',wood:'#7a5c40',leaf:'#4a7d3f',tileA:'#c9642c',tileB:'#3f7a5a',tileC:'#f1e3b8'} as const;
// Castle Hill and Gellert Hill are built here, on a level bank, in place of the shared rolling ground and town row.
const base=europeEnvironment('HUN',{landmark:false,flat:true,town:false});
export const budapest={quayTop:-1,hillTop:5,hill:[22,150],palaceX:100,churchX:40,bastionX:40,gellertX:196} as const;
const masonry=()=>texturedStone('paris-stone','#f8f0dc',1.1,.94);

function embankment(root:T.Object3D,finish:number,low:boolean){
 const group=new T.Group();group.name='buda-embankment';root.add(group);const s=new Builder(.5),p=new Builder(),top=budapest.quayTop,from=-60,to=finish+90;
 box(s,to-from,top+4.4,66,C.quay,(from+to)/2,-4.4,-49.5);box(s,to-from,.3,.5,C.stoneDark,(from+to)/2,top,-16.7);
 for(let x=from+2;x<to;x+=low?5:2.5)box(p,.05,.9,.05,C.iron,x,top,-16.7);box(p,to-from-4,.05,.05,C.iron,(from+to)/2,top+.9,-16.7);
 // Tram rails and overhead wire along the quay.
 for(const z of [-18.2,-18.9])box(p,to-from,.04,.06,'#6a6a66',(from+to)/2,top+.01,z);for(let x=from+6;x<to;x+=low?24:12){cyl(p,.05,.07,3.6,C.iron,x,top,-19.6,5);box(p,.05,.05,1.3,C.iron,x,top+3.5,-19);}box(p,to-from,.02,.02,C.iron,(from+to)/2,top+3.4,-18.55);
 // Lawns of the castle garden between the tram line and the hill.
 const lawn=new Builder();box(lawn,to-from,.06,14,'#8fae6a',(from+to)/2,top,-27.5);lawn.mesh(group,vertexMaterial(.98),'castle-garden-lawns');
 s.mesh(group,masonry(),'buda-quay-wall');p.mesh(group,vertexMaterial(.6),'quay-railings-and-tram-line');group.userData={feature:'Buda embankment and tram line'};
}

function castleHill(root:T.Object3D,flag:T.Material,r:()=>number,low:boolean){
 const group=new T.Group();group.name='buda-castle';root.add(group);const rock=new Builder(.5),s=new Builder(),p=new Builder(),[from,to]=budapest.hill,top=budapest.hillTop,x=budapest.palaceX,z=-42;
 // The hill and its retaining walls with blind arches.
 box(rock,to-from,top+4.4,18,C.rock,(from+to)/2,-4.4,z-3);box(rock,to-from+4,3.2,2,C.stone,(from+to)/2,-1,z+6.6);
 for(let k=0;k<(low?16:32);k++){const ax=from+2+k*(to-from-4)/(low?15:31);rock.add(new T.TorusGeometry(1,.16,5,low?6:10,Math.PI),C.stoneDark,[ax,-.2,z+7.64]);box(rock,.4,3.6,.5,C.stoneDark,ax+(to-from-4)/(low?30:62),-1,z+7.7);}
 for(let k=0;k<(low?8:16);k++)box(rock,4+r()*4,2+r()*2.4,2,C.rock,from+k*(to-from)/(low?8:16),2+r(),z+5.2,(r()-.5)*.2);
 rock.mesh(group,texturedStone('paris-stone','#f4eedc',.6,.96),'castle-hill-and-retaining-walls');
 // The palace: two long wings, a columned centre and the green dome.
 const w=46,h=4.2;box(s,w,h,7,C.stone,x,top,z-3.5);box(s,w+.4,.3,7.4,C.trim,x,top+h-.15,z-3.5);box(p,w+.2,.5,7.2,C.copperDark,x,top+h+.15,z-3.5);
 windowGrid(s,p,x-13.5,top+.4,z+.02,17,h-.9,low?6:10,2,{wall:C.stone,trim:C.trim,glass:C.glass,roof:C.copper},true,low);windowGrid(s,p,x+13.5,top+.4,z+.02,17,h-.9,low?6:10,2,{wall:C.stone,trim:C.trim,glass:C.glass,roof:C.copper},true,low);
 box(s,9,h+.8,2,C.stone,x,top,z+.8);for(let k=0;k<6;k++)column(s,x-3.75+k*1.5,top+.5,z+2,.2,h-.3,C.trim,low?8:10);box(s,9.4,.4,2.6,C.trim,x,top+h+.3,z+.9);s.add(new T.CylinderGeometry(.02,4.7,1.2,3,1),C.stone,[x,top+h+1.3,z+1.6],[0,-Math.PI/2,0],[.2,1,1]);
 for(const end of [-1,1]){box(s,6,h+.6,8,C.stone,x+end*(w/2-3),top,z-3);for(let k=0;k<4;k++)archedWindow(s,p,x+end*(w/2-3)-1.8+k*1.2,top+.5,z+1.02,.7,2.4,{frame:C.trim,glass:C.glass});box(p,6.2,.5,8.2,C.copperDark,x+end*(w/2-3),top+h+.6,z-3);}
 const domeTop=drumDome(s,p,x,top+h+.4,z-3,2.7,1.3,{wall:C.stone,trim:C.trim,dome:C.copper,finial:C.gold,glass:C.glass},{sides:low?10:16,stretch:1.1,low});
 for(let k=0;k<(low?6:12);k++){const sx=x-w/2+2+k*(w-4)/(low?5:11);if(Math.abs(sx-x)>5){cyl(p,.1,.14,.7,C.bronze,sx,top+h+.4,z+.1,6);p.add(new T.SphereGeometry(.1,6,5),C.bronze,[sx,top+h+1.2,z+.1]);}}
 cyl(p,.05,.07,3,C.iron,x+w/2-3,top+h+1.1,z-3,5);s.mesh(group,vertexMaterial(.92),'buda-castle-palace-front');p.mesh(group,vertexMaterial(.6),'buda-castle-dome-and-roofs');
 wavingFlag(group,flag,x+w/2-2.94,top+h+3.4,z-3,2.4,'hungary-flag',.6);group.userData={landmark:'Buda Castle',domeTop};
}

/** The roof of Matthias Church: glazed tiles in a diamond pattern. */
const tileTexture=()=>{const a=new T.Color(C.tileA),b=new T.Color(C.tileB),c=new T.Color(C.tileC);return pixelTexture(64,(u,v)=>{const d=(Math.floor(u*16+v*16)+Math.floor(u*16-v*16+32))%3,col=d===0?a:d===1?b:c;return[col.r*255,col.g*255,col.b*255,255];},true,true);};
function matthiasAndBastion(root:T.Object3D,low:boolean){
 const group=new T.Group();group.name='matthias-church';root.add(group);const s=new Builder(.5),p=new Builder(),x=budapest.churchX,top=budapest.hillTop,z=-42,gothic={frame:C.trim,glass:C.glass};
 box(s,5,4.2,11,C.white,x,top,z-5.5);for(const dx of [-1.6,0,1.6])pointedWindow(s,p,x+dx,top+.6,z+.02,.8,2.8,low,gothic);for(const dx of [-2.6,2.6])box(s,.5,4,.8,C.stone,x+dx,top,z+.3);
 const tiles=new T.Mesh(new T.CylinderGeometry(.02,3.6,2.6,4,1).rotateY(Math.PI/4).scale(1,1,1.55),new T.MeshStandardMaterial({map:tileTexture(),roughness:.5}));tiles.name='matthias-diamond-tile-roof';tiles.position.set(x,top+4.2+1.3,z-5.5);tiles.scale.set(1,1,1);group.add(tiles);
 // The bell tower: an eight-sided stage ringed by pinnacles under a stone spire.
 const tx=x+3.8;box(s,2.4,4.6,2.4,C.white,tx,top,z-.8);box(s,2.6,.2,2.6,C.trim,tx,top+4.6,z-.8);cyl(s,1.1,1.15,1.8,C.white,tx,top+4.8,z-.8,8);for(let k=0;k<4;k++){const a=k*Math.PI/2;pointedWindow(s,p,tx+Math.sin(a)*1.1,top+5,z-.8+Math.cos(a)*1.1+.02,.5,1.3,low,gothic);pinnacle(s,tx+Math.sin(a+Math.PI/4)*1.5,top+4.8,z-.8+Math.cos(a+Math.PI/4)*1.5,.5,low,{shaft:C.white,spire:C.stone,finial:C.gold});}
 cone(s,1.2,3.4,C.stone,tx,top+6.6,z-.8,8);p.add(new T.SphereGeometry(.1,6,5),C.gold,[tx,top+10.1,z-.8]);box(s,1.6,3.4,1.6,C.white,x-3.2,top,z-.6);cone(p,1.1,1.8,C.slate,x-3.2,top+3.4,z-.6,4);
 s.mesh(group,masonry(),'matthias-church-walls-and-spire');p.mesh(group,vertexMaterial(.6),'matthias-church-glass');group.userData={landmark:'Matthias Church'};
 // The Fisherman's Bastion: white ramparts, arcades and seven conical turrets.
 const bastion=new T.Group();bastion.name='fishermans-bastion';root.add(bastion);const w=new Builder(),g=new Builder(),bx=budapest.bastionX,bz=-34.5,len=30;
 box(w,len,1.5,1.4,C.white,bx,top,bz);for(let k=0;k<(low?10:20);k++){const ax=bx-len/2+(k+.5)*len/(low?10:20);archedWindow(w,g,ax,top+.1,bz+.72,len/(low?10:20)*.6,1.1,{frame:C.trim,glass:'#8a8272'});}
 box(w,len+.3,.2,1.7,C.trim,bx,top+1.5,bz);for(let k=0;k<7;k++){const tx2=bx-len/2+k*len/6,big=k===3,radius=big?1.5:.95,h=big?3.6:2.6;cyl(w,radius,radius*1.05,h,C.white,tx2,top,bz+.5,low?10:14);cyl(w,radius*1.12,radius*1.12,.16,C.trim,tx2,top+h,bz+.5,low?10:14);
  for(let j=0;j<(low?4:6);j++){const a=j/(low?4:6)*Math.PI*2;g.add(new T.BoxGeometry(.3,.8,.06),C.glass,[tx2+Math.sin(a)*radius,top+h-.9,bz+.5+Math.cos(a)*radius],[0,a,0]);}cone(w,radius*1.15,radius*1.7,C.stone,tx2,top+h+.16,bz+.5,low?10:14);}
 for(const side of [-1,1])for(let k=0;k<6;k++)box(w,2.2,.28,2,C.white,bx+side*(len/2+1.2+k*.5),top-.28-k*.5,bz+.6+k*.9);
 w.mesh(bastion,vertexMaterial(.94),'bastion-white-turrets-and-arcades');g.mesh(bastion,vertexMaterial(.6),'bastion-openings');bastion.userData={landmark:"Fisherman's Bastion",turrets:7};
}

function chainBridge(root:T.Object3D,x:number,low:boolean){
 const group=new T.Group();group.name='chain-bridge';root.add(group);const s=new Builder(.5),p=new Builder(),deck=-.2,towers=[-12.6,-5.4] as const;
 // The deck runs from the Buda quay to an abutment on the near bank, clear of the route.
 box(s,3.4,.4,19.5,C.stoneDark,x,deck-.4,-7.75);for(const side of [-1,1]){box(p,.08,.7,19.5,C.iron,x+side*1.7,deck,-7.75);}box(s,6,3.4,2.4,C.stone,x,-3.2,2.6);
 for(const tz of towers){for(const side of [-1,1])box(s,1.1,9.6,2,C.stone,x+side*1.75,-3.2,tz);box(s,4.6,1.6,2,C.stone,x,deck+6.6,tz);box(s,5,.3,2.4,C.trim,x,deck+8.2,tz);box(s,5,.3,2.4,C.trim,x,deck+6.4,tz);s.add(new T.TorusGeometry(1.2,.2,5,low?8:12,Math.PI),C.stoneDark,[x,deck+5.4,tz],[0,0,0],[1,1,8]);box(s,5.2,1.4,3.4,C.stone,x,-3.2,tz);}
 // The chains: from each tower top down to the deck at both ends, and a shallow curve between the towers.
 for(const side of [-1,1]){const cx=x+side*1.75,topY=deck+6.9;let last=new T.Vector3(cx,topY,towers[0]);for(let k=1;k<=6;k++){const t=k/6,next=new T.Vector3(cx,topY-(topY-deck-.9)*Math.sin(t*Math.PI/2),towers[0]-t*5.4);p.strut(last,next,.07,C.iron,5,1);last=next;}
  last=new T.Vector3(cx,topY,towers[1]);for(let k=1;k<=8;k++){const t=k/8,next=new T.Vector3(cx,topY-(topY-deck-.9)*Math.sin(t*Math.PI/2),towers[1]+t*7);p.strut(last,next,.07,C.iron,5,1);last=next;}
  last=new T.Vector3(cx,topY,towers[0]);for(let k=1;k<=6;k++){const t=k/6,next=new T.Vector3(cx,topY-Math.sin(t*Math.PI)*3.6,towers[0]+t*(towers[1]-towers[0]));p.strut(last,next,.07,C.iron,5,1);last=next;}
  for(let k=1;k<6;k++){const t=k/6,zz=towers[0]+t*(towers[1]-towers[0]),yy=topY-Math.sin(t*Math.PI)*3.6;box(p,.03,yy-deck,.03,C.iron,cx,deck,zz);}}
 // Stone lions guard both ends.
 for(const [lz,face] of [[-17.6,1],[2.4,-1]] as const)for(const side of [-1,1]){box(s,1.1,1.3,2,C.stone,x+side*2.6,deck-.2,lz);box(s,.6,.5,1.5,C.stoneDark,x+side*2.6,deck+1.1,lz);s.add(new T.SphereGeometry(.34,8,6),C.stoneDark,[x+side*2.6,deck+1.75,lz+face*.7]);}
 s.mesh(group,masonry(),'chain-bridge-towers-and-deck');p.mesh(group,vertexMaterial(.5),'chain-bridge-chains');group.userData={landmark:'Chain Bridge',towers:2,lions:4};
}

function gellertHill(root:T.Object3D,finish:number,low:boolean){
 const group=new T.Group();group.name='gellert-hill';root.add(group);const s=new Builder(),p=new Builder(),x=Math.max(budapest.gellertX,finish+44),z=-52;
 s.add(new T.SphereGeometry(1,low?12:20,low?8:12),C.green,[x,-4.4,z],[0,0,0],[26,14.4,12],.08);box(p,10,1.2,3,C.stone,x+3,9.4,z+1);
 // The Liberty Statue: a figure holding a palm leaf aloft on a tall pedestal.
 box(p,1.4,3,1.4,C.stone,x-3,9.6,z+2);cyl(p,.22,.3,1.6,C.bronze,x-3,12.6,z+2,8);p.add(new T.SphereGeometry(.2,8,6),C.bronze,[x-3,14.4,z+2]);p.strut(new T.Vector3(x-3.2,14,z+2),new T.Vector3(x-3.5,15.1,z+2),.06,C.bronze,5,1);p.strut(new T.Vector3(x-2.8,14,z+2),new T.Vector3(x-2.5,15.1,z+2),.06,C.bronze,5,1);p.add(new T.SphereGeometry(.5,8,5),C.bronze,[x-3,15.3,z+2],[0,0,0],[1.5,.3,.5]);
 s.mesh(group,vertexMaterial(.96),'gellert-wooded-hill');p.mesh(group,vertexMaterial(.7),'liberty-statue-and-citadel');group.userData={landmark:'Gellert Hill and the Liberty Statue'};
}

/** A yellow tram of two cars, and a white river boat. */
function tram(root:T.Object3D){const b=new Builder();for(const dx of [-2.3,2.3]){box(b,4.3,1.5,1.3,C.tram,dx,.3,0);box(b,4.1,.6,1.34,C.glass,dx,1.05,0);box(b,4.4,.16,1.36,C.tramRoof,dx,1.8,0);for(const wx of [-1.3,1.3])box(b,.7,.3,1.1,C.iron,dx+wx,0,0);}box(b,.4,1.2,1,'#3a3a3a',0,.4,0);b.strut(new T.Vector3(-2.3,1.96,0),new T.Vector3(-1.4,3.3,0),.03,C.iron,4,1);const mesh=b.mesh(root,vertexMaterial(.55),'yellow-tram');mesh.userData={animated:true};return mesh;}
function riverBoat(root:T.Object3D){const b=new Builder();box(b,9,.7,2,C.white,0,0,0);box(b,9.2,.1,2.1,'#2f5fa8',0,.7,0);box(b,6.4,.8,1.7,C.glass,-.6,.8,0);box(b,6.6,.08,1.8,C.white,-.6,1.6,0);box(b,3.6,.7,1.5,C.white,-1.4,1.68,0);cyl(b,.22,.26,.8,C.red,1.2,1.68,0,8);const mesh=b.mesh(root,vertexMaterial(.55),'danube-river-boat');mesh.userData={animated:true};return mesh;}

// Route furniture, in a platform's own coordinates, behind the walking lane.
function ornateLamp(b:Builder,glow:Builder,x:number,y:number,z:number){lampPost(b,glow,x,y,z,C.iron);for(const side of [-1,1]){b.add(new T.TorusGeometry(.2,.025,4,8,Math.PI),C.iron,[x+side*.2,y+2.55,z],[0,0,side>0?0:Math.PI]);glow.add(new T.SphereGeometry(.11,8,6),'#f4efdf',[x+side*.4,y+2.6,z]);}}
/** A market stall hung with strings of dried paprika. */
function paprikaStall(b:Builder,x:number,y:number,z:number){awningStall(b,x,y,z,{wood:C.wood,stripeA:C.red,stripeB:C.white,goods:[C.red,'#e8a020','#8f1d14']});for(let k=0;k<5;k++)for(let j=0;j<4;j++)b.add(new T.ConeGeometry(.05,.2,5),j%2?C.red:'#a81f16',[x-.8+k*.4,y+1.85-j*.19,z+.5],[Math.PI,0,0]);}

export const environment:CountryEnvironment={...base,
 info:{...base.info,assets:[...base.info.assets,'buda-castle-front-and-green-dome','matthias-church-tile-roof-and-spire','fishermans-bastion-turrets','chain-bridge-towers-chains-and-lions','liberty-statue-on-gellert-hill','yellow-tram-and-river-boat','ornate-lamps-and-paprika-stall']},
 mount(context){
  const mounted=base.mount(context),{finish,low}=context,r=random(36107),detail=new T.Group();detail.name='budapest-detailed-scenery';detail.userData={decorative:true,collidable:false};mounted.root.add(detail);
  embankment(detail,finish,low);castleHill(detail,flagMaterial(bandedFlagTexture([['#ce2939',1],['#ffffff',1],['#477050',1]])),r,low);matthiasAndBastion(detail,low);chainBridge(detail,finish+15,low);gellertHill(detail,finish,low);
  const planes:Placement[]=[],chestnuts:Placement[]=[];for(let k=0;k<(low?10:22);k++)planes.push({x:-50+r()*(finish+130),y:budapest.quayTop,z:-21-r()*4,scale:.6+r()*.25,rotation:r()*6});
  for(let k=0;k<(low?8:18);k++)chestnuts.push({x:budapest.hill[0]+r()*(budapest.hill[1]-budapest.hill[0]),y:budapest.hillTop,z:-37-r()*2,scale:.5+r()*.2,rotation:r()*6});
  plantGrove(detail,'plane',planes,{low,name:'embankment-plane-trees'});plantGrove(detail,'plane',chestnuts,{low,name:'castle-hill-chestnuts'});
  const car=tram(detail),boat=riverBoat(detail),gulls=createFlock(detail,{name:'danube-gulls',count:low?5:10,centre:[finish*.5,7,-9],radius:[32,3,6],speed:.2,size:.8,color:'#f2f2ee',wing:'#c9ccd0',seed:41,glide:true});
  let reduced=context.reducedMotion;const move=(time:number)=>{const lap=finish+150;car.position.set(finish+90-(time*2.2)%lap,budapest.quayTop+.02,-18.55);boat.position.set(-50+(time*.9)%(finish+110),-2.5+Math.sin(time)*.03,-9.5);};move(0);gulls.root.visible=!reduced;
  return{...mounted,update(time,dt,signals){mounted.update(time,dt,signals);if(reduced)return;move(time);gulls.update(time);},setReducedMotion(value){reduced=value;gulls.root.visible=!value;mounted.setReducedMotion(value);}};
 },
 dressPlatform(root,definition,context){
  base.dressPlatform(root,definition,context);
  const t=definition.terrain,w=definition.width;if(definition.motion||definition.route==='upper'||t==='mechanical'||w<2.8)return;
  const surface=localSurface(definition),b=new Builder(),glow=new Builder(),deep=Math.max(2,definition.depth)>4,rear=deep?-2.45:REAR-.12,seed=definition.id.length*31+Math.round(definition.x),y=surface(0);
  if(t==='rooftop'){chimneyStack(b,w/2-.9,surface(w/2-.9),rear,2+seed%2,{brick:'#9a5a44',cap:'#6d3a2c',pot:'#d8b08a'});if(w>3.6)dormer(b,-w/2+1.1,surface(-w/2+1.1),rear-.05,C.stone,C.glass,C.copperDark);}
  else if(t==='bridge'){railing(b,-w/2+.25,w/2-.25,y,rear,C.iron,C.gold);ornateLamp(b,glow,-w/2+.7,surface(-w/2+.7),rear+.3);if(w>6)ornateLamp(b,glow,w/2-.7,surface(w/2-.7),rear+.3);if(w>5)bench(b,0,y,rear+.25);}
  else if(t==='ground'){const from=-w/2+.5,to=w/2-.5;ornateLamp(b,glow,from,surface(from),-1.3);if(seed%2)paprikaStall(b,from+1.6,surface(from+1.6),-2.3);else statue(b,from+1.4,surface(from+1.4),-2.1,1.9,{pedestal:C.stone,figure:C.bronze});bench(b,to-1.2,surface(to-1.2),-1.9);if(w>8){pottedTree(b,.4,y,-2.3,.75,{pot:'#b96a42',trunk:'#5a4636',leaf:C.leaf,fruit:C.red},seed);ornateLamp(b,glow,to,surface(to),-1.3);}}
  else if(t==='terrace'){balustrade(b,-w/2+.25,w/2-.25,y,rear,{rail:C.trim,base:C.stoneDark,baluster:C.white});pottedTree(b,-w/2+.9,y,-1.7,.75,{pot:C.stone,trunk:'#5a4636',leaf:C.leaf,fruit:'#f2d24a'},seed);if(w>6)fountain(b,w/2-1.8,y,-2,.8,{stone:C.stone,water:'#7fb6c6'});}
  else if(t==='stairs'){const from=-w/2+.25,to=w/2-.25;railing(b,from,to,Math.min(surface(from),surface(to)),rear,C.iron,C.gold);}
  finishProps(root,b,glow,'budapest-quays-and-roofs');
 },
};
