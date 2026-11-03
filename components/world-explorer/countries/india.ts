import * as T from 'three';
import {Builder,batchStatic,disposeTree,ellipsoid,matte,random,standard,vertexMaterial,type Placement} from '../kit/common';
import {createSkyDome,createCloudBanks} from '../kit/sky';
import {dressTerrain,createScenicTerrace,type TerrainPreset} from '../kit/terrain';
import {createHeightfield} from '../kit/landform';
import {createWaterSurface} from '../kit/water';
import {plantGrove} from '../kit/vegetation';
import {createDrift} from '../kit/particles';
import {createFlock} from '../kit/wildlife';
import {dressDeck,type DeckPalette} from '../kit/bridges';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {createCreatureRig,finishCreature} from '../kit/creature';
import {loadSurfaceMaps,markSurface} from '../kit/surface-maps';
import type {CountryEnvironment} from './types';

/** India — Taj Mahal: Garden Journey. A fictional garden course; the Taj Mahal is
 * a distant stylized study and is never part of the playable route. */
const info={
 id:'india-taj-gardens',title:'Taj Mahal: Garden Journey',
 license:'Original procedural geometry; CC0 Poly Haven red sandstone surface maps (see materials/LICENSES.md).',
 representation:'A fictional garden platform course inspired by the Taj Mahal complex in Agra. The mausoleum, gateway and gardens are simplified studies; no platform touches or represents the monument.',
 landmarkSource:'https://whc.unesco.org/en/list/252/',
 assets:['taj-mahal-dome-iwans-and-minarets','red-sandstone-gateway','charbagh-water-channels','fountains','cypress-rows','flowerbeds','chhatri-pavilions','carved-sandstone-bridges','floating-petals','parakeets'],
};
const sandstone:TerrainPreset={id:'agra-red-sandstone',shape:'masonry',rock:{light:'#f0ad90',dark:'#d08268',crack:'#7a3e2c',top:'#6f9a48',topDepth:.04,strata:.2},cap:{kind:'tiles',a:'#b9624a',b:'#f2ece0',c:'#7d3a2c'},rim:{kind:'tufts',color:'#4f8a35',alt:'#6aa346',size:.9},flowers:{colors:['#f39a1e','#e8473b','#f6d14b','#f3f0ea'],density:2.2},maps:{set:'sandstone-blocks',tint:'#ffcdb8',repeat:1}};
const deck:DeckPalette={wood:'#8a6444',woodAlt:'#9b7350',rope:'#c8b48a',stone:'#eba083',stoneAlt:'#de8f72',metal:'#6d5a3e',accent:'#f2ece0'};
const marble='#f3efe6',marbleShade='#e4ddd0';

/** Pointed (four-centred style) arch outline used for iwans and gateways. */
function pointedArch(width:number,height:number){const s=new T.Shape(),w=width/2,spring=height*.62;s.moveTo(-w,0);s.lineTo(-w,spring);s.quadraticCurveTo(-w,height*.95,0,height);s.quadraticCurveTo(w,height*.95,w,spring);s.lineTo(w,0);s.closePath();return s;}
function onionDome(radius:number,height:number){const points:T.Vector2[]=[];for(let i=0;i<=28;i++){const t=i/28,r=t<.35?radius*(1+.2*Math.sin(t/.35*Math.PI/2)):radius*1.2*Math.pow(Math.cos((t-.35)/.65*Math.PI/2),1.25);points.push(new T.Vector2(Math.max(.015,r),t*height));}return new T.LatheGeometry(points,28);}
function chhatri(b:Builder,x:number,y:number,z:number,size:number,color=marble){for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1]])b.add(new T.CylinderGeometry(size*.07,size*.07,size*.8,8),color,[x+dx*size*.35,y+size*.4,z+dz*size*.35]);b.add(new T.CylinderGeometry(size*.55,size*.55,size*.1,12),color,[x,y+size*.84,z]);b.add(onionDome(size*.42,size*.75),color,[x,y+size*.88,z]);b.add(new T.ConeGeometry(size*.05,size*.3,6),'#d8b65a',[x,y+size*1.75,z]);}

/** Stylized Taj Mahal: plinth, chamfered hall with deep iwans, onion dome,
 * chhatris and four freestanding minarets. Not a measured model. */
function createTaj(parent:T.Object3D){
 const root=new T.Group();root.name='taj-mahal';root.userData.landmark='Taj Mahal';root.userData.source=info.landmarkSource;parent.add(root);
 const b=new Builder(),dark='#b9b0a2',shade=new T.Color(marbleShade);
 b.add(new T.BoxGeometry(40,2.4,40),marble,[0,1.2,0],[0,0,0],[1,1,1],.03);b.add(new T.BoxGeometry(41,.4,41),marbleShade,[0,2.5,0]);
 const hall=new T.CylinderGeometry(13.5,13.5,12,8,1);hall.rotateY(Math.PI/8);b.add(hall,marble,[0,8.7,0],[0,0,0],[1,1,1],.02);
 // A tall iwan recess on each main face, flanked by stacked smaller arches.
 for(let face=0;face<4;face++){const a=face*Math.PI/2,nx=Math.sin(a),nz=Math.cos(a),d=12.55;
  const iwan=new T.ExtrudeGeometry(pointedArch(6,10),{depth:.4,bevelEnabled:false});b.add(iwan,dark,[nx*d,2.9,nz*d],[0,a,0]);
  b.add(new T.BoxGeometry(8,11.6,.3),marble,[nx*(d-.1),8.6,nz*(d-.1)],[0,a,0],[1,1,1],.02);
  for(const side of [-1,1])for(const level of [0,1]){const off=side*6.2,x=nx*d+Math.cos(a)*off,z=nz*d-Math.sin(a)*off;b.add(new T.ExtrudeGeometry(pointedArch(2.2,4),{depth:.35,bevelEnabled:false}),shade.clone().multiplyScalar(.82),[x,3.4+level*5,z],[0,a,0]);}
 }
 b.add(new T.CylinderGeometry(7,7,4,32),marble,[0,16.7,0]);b.add(new T.CylinderGeometry(7.4,7.4,.5,32),marbleShade,[0,18.9,0]);
 b.add(onionDome(7.4,14),marble,[0,18.9,0],[0,0,0],[1,1,1],.015);b.add(new T.CylinderGeometry(.18,.25,2.6,8),'#d8b65a',[0,33.6,0]);b.add(new T.SphereGeometry(.45,10,8),'#d8b65a',[0,34.4,0]);
 for(const [x,z] of [[-8.5,-8.5],[8.5,-8.5],[-8.5,8.5],[8.5,8.5]])chhatri(b,x,14.7,z,4);
 for(const [x,z] of [[-18,-18],[18,-18],[-18,18],[18,18]]){b.add(new T.CylinderGeometry(1,1.35,24,16),marble,[x,14.6,z],[0,0,0],[1,1,1],.02);for(const h of [8,15,21.5])b.add(new T.CylinderGeometry(1.75,1.5,.6,16),marbleShade,[x,2.6+h,z]);chhatri(b,x,26.6,z,2.6);}
 const material=vertexMaterial(.55);b.mesh(root,material,'taj-mahal-marble');
 return root;
}
function gateway(b:Builder,x:number,y:number,z:number,scale:number){
 const red='#e2906f',trim='#f4ece0';b.add(new T.BoxGeometry(14*scale,10*scale,4*scale),red,[x,y+5*scale,z],[0,0,0],[1,1,1],.03);
 b.add(new T.ExtrudeGeometry(pointedArch(5*scale,8*scale),{depth:.3,bevelEnabled:false}),'#6e3524',[x,y,z+2*scale]);
 b.add(new T.BoxGeometry(5.8*scale,8.6*scale,.2),trim,[x,y+4.3*scale,z+2*scale-.06]);
 for(const side of [-1,1]){b.add(new T.CylinderGeometry(.7*scale,.8*scale,11*scale,8),red,[x+side*7*scale,y+5.5*scale,z+2*scale]);chhatri(b,x+side*7*scale,y+11*scale,z+2*scale,1.8*scale,trim);}
 for(let i=0;i<6;i++)chhatri(b,x+(-5+i*2)*scale,y+10*scale,z+1.4*scale,1.2*scale,trim);
}
function fountainJets(parent:T.Object3D,points:[number,number,number][]){
 const material=new T.MeshStandardMaterial({color:'#e3f6fb',transparent:true,opacity:.7,roughness:.1,emissive:'#7fc3d6',emissiveIntensity:.15}),jets=new T.InstancedMesh(new T.CylinderGeometry(.03,.07,1,6),material,points.length),dummy=new T.Object3D();jets.name='garden-fountain-jets';jets.castShadow=false;parent.add(jets);
 const update=(time:number)=>{points.forEach(([x,y,z],i)=>{const h=.9+Math.sin(time*3+i)*.15;dummy.position.set(x,y+h/2,z);dummy.scale.set(1,h,1);dummy.updateMatrix();jets.setMatrixAt(i,dummy.matrix);});jets.instanceMatrix.needsUpdate=true;};
 update(0);return{jets,update};
}

/** Original clockwork garden beetle: brass and terracotta shell, geometric inlay. */
function createBeetle(parent:T.Object3D){
 const legs:T.Group[]=[];
 const rig=createCreatureRig(parent,{name:'india-clockwork-garden-beetle',height:.65,feet:[],footColor:'#5a3d22',stride:10,turn:1.15,animate(rig,time,state,moving){legs.forEach((leg,i)=>{leg.rotation.x=moving?Math.sin(time*13+i*Math.PI*.66)*.4:0;});rig.extras.key.rotation.z=time*(moving?4:1);}});
 const brass=standard('#c99a3d',.3,{metalness:.8}),terracotta=matte('#c4683f',.6),inlay=matte('#f2ece0',.5),dark=matte('#3a2414'),eye=new T.MeshStandardMaterial({color:'#ffe9a8',emissive:'#ffb43a',emissiveIntensity:.9});
 ellipsoid(rig.body,terracotta,0,.34,-.05,.32,.22,.4,20);
 for(let i=0;i<5;i++){const tile=new T.Mesh(new T.OctahedronGeometry(.06,0),inlay);tile.position.set((i-2)*.11,.55,-.05+(i%2)*.1);tile.scale.set(1,.4,1);rig.body.add(tile);}
 const ring=new T.Mesh(new T.TorusGeometry(.31,.022,6,24),brass);ring.rotation.x=Math.PI/2;ring.position.y=.3;ring.scale.set(1,1.25,1);rig.body.add(ring);
 ellipsoid(rig.head,brass,0,.3,.36,.18,.14,.13,14);
 for(const side of [-1,1]){const e=new T.Mesh(new T.SphereGeometry(.05,10,8),eye);e.position.set(side*.09,.36,.47);rig.head.add(e);const antenna=new T.Mesh(new T.CylinderGeometry(.01,.012,.25,5),brass);antenna.position.set(side*.06,.48,.42);antenna.rotation.set(.6,0,side*.4);rig.head.add(antenna);}
 const key=new T.Group();key.position.set(0,.4,-.45);rig.figure.add(key);rig.extras.key=key;const bow=new T.Mesh(new T.TorusGeometry(.08,.02,6,14),brass);key.add(bow);
 for(const side of [-1,1])for(let i=0;i<3;i++){const leg=new T.Group();leg.position.set(side*.26,.24,.18-i*.2);rig.figure.add(leg);legs.push(leg);const seg=new T.Mesh(new T.CylinderGeometry(.018,.016,.28,6),i%2?brass:dark);seg.position.set(side*.08,-.09,0);seg.rotation.z=side*.9;leg.add(seg);rig.extras[`leg${legs.length}`]=leg;}
 finishCreature(rig);return rig;
}

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#9ec4e6',exposure:1.03,sun:'#ffd7a0',sunIntensity:3.2,sky:'#ffeedd',ground:'#7d6a4a',hemisphere:1.2,rim:'#ffd2a8',rimIntensity:.7,pixelRatio:1.25,reflections:{zenith:'#6f9fd8',horizon:'#f6d6b2',ground:'#8a6a4a',intensity:.45}},
 mount(context){
  const {scene,finish,low}=context;let reduced=context.reducedMotion;
  const root=new T.Group();root.name='india-taj-environment';root.userData={environmentId:info.id,decorative:true,layers:['foreground','playable-context','garden-terraces','charbagh-and-gateway','taj-mahal','sky']};scene.add(root);
  const oldBackground=scene.background,oldFog=scene.fog;scene.background=new T.Color('#9ec4e6');scene.fog=new T.Fog('#ecd9c0',70,280);
  const sky=createSkyDome(root,{zenith:'#5f95d4',horizon:'#f7dcb8',band:'#f6cfa0',glow:'#ffd9a0',sun:[.5,.25,-.8],glowPower:18});
  createCloudBanks(root,{finish,low,seed:61,groups:12,opacity:.75,shade:'#f0d6c4',color:'#fff4ea',high:[22,34],flat:.6});
  const staticRoot=new T.Group();staticRoot.name='india-static-scenery';root.add(staticRoot);
  // Landmarks, water and landforms stay unbatched: they keep their names and can follow the camera.
  const features=new T.Group();features.name='landmarks-and-landforms';root.add(features);
  // Charbagh lawns with paths, divided by long water channels.
  createHeightfield(features,{name:'charbagh-lawns',x:finish/2,y:-9.6,z:-60,width:finish+260,depth:130,segments:[low?60:110,low?30:60],height:(u,v)=>Math.min(1,Math.min(u,1-u)*10)*.3,color:(_h,_s,u,v)=>{const path=Math.abs(((u*28)%1)-.5)<.04||Math.abs(((v*12)%1)-.5)<.05;return new T.Color(path?'#d9c3a0':(Math.floor(u*28)+Math.floor(v*12))%2?'#5f9a45':'#6aa64c');}});
  const channels=[createWaterSurface(features,{x:finish/2,y:-9.3,z:-14,width:finish+220,depth:4,shallow:'#7cc8d6',deep:'#3f97b0',segments:30,name:'garden-water-channel',repeat:.25,edge:'none'}),createWaterSurface(features,{x:62,y:-9.3,z:-70,width:5,depth:70,shallow:'#7cc8d6',deep:'#3f97b0',segments:12,name:'reflecting-pool',repeat:.25,edge:'none'})];
  const taj=createTaj(features);taj.position.set(62,-9.6,-128);taj.scale.setScalar(1.05);
  const gate=new Builder();gateway(gate,22,-9.6,-52,1);const gateMaterial=vertexMaterial(.85);markSurface(gateMaterial,'sandstone-blocks','#ffc2a6');gate.mesh(features,gateMaterial,'red-sandstone-gateway');
  const sites=[{x:-8,y:-1,z:-12,w:15,t:7},{x:20,y:1,z:-22,w:13,t:8},{x:46,y:.4,z:-18,w:12,t:8},{x:78,y:1.4,z:-24,w:14,t:9},{x:104,y:.2,z:-14,w:12,t:7},{x:130,y:1,z:-20,w:14,t:8}].filter(site=>site.x<finish+24);
  for(const [i,site] of sites.entries())createScenicTerrace(staticRoot,{x:site.x,y:site.y,z:site.z,width:site.w,depth:7,thickness:site.t,preset:sandstone,seed:7100+i,quality:low?'low':'standard',lush:true});
  const pavilions=new Builder();for(const site of sites)if(site.w>=13)chhatri(pavilions,site.x+site.w*.25,site.y,site.z-1.5,3.2,'#efe6d6');pavilions.mesh(features,vertexMaterial(.7),'garden-chhatris');
  const r=random(41),cypress:Placement[]=[],shade:Placement[]=[],beds:Placement[]=[];
  for(let i=0;i<(low?16:34);i++){const z=-30-i*2.2;if(z<-110)break;for(const side of [-1,1])cypress.push({x:62+side*6,y:-9.6,z,scale:1.1,rotation:r()*6});}
  for(const site of sites){cypress.push({x:site.x-site.w*.35,y:site.y,z:site.z-1.6,scale:.8},{x:site.x+site.w*.35,y:site.y,z:site.z-1.6,scale:.8});shade.push({x:site.x,y:site.y,z:site.z-2.6,scale:.9,rotation:r()*6});beds.push({x:site.x+(r()-.5)*site.w*.6,y:site.y,z:site.z+1.8,scale:1});}
  for(let i=0;i<(low?20:50);i++)beds.push({x:-20+r()*(finish+40),y:-9.6,z:-20-r()*30,scale:1.3});
  plantGrove(staticRoot,'cypress',cypress,{low,name:'cypress-avenues'});plantGrove(staticRoot,'plane',shade,{low,name:'garden-shade-trees'});plantGrove(staticRoot,'flowering-shrub',beds,{low,name:'garden-flowerbeds'});
  const jets=fountainJets(root,Array.from({length:low?8:18},(_,i)=>[62+(i%2?1:-1)*.8,-9.3,-34-i*4] as [number,number,number]));
  const foreground=new T.Group();foreground.name='india-low-foreground';root.add(foreground);
  for(const [x,y] of [[-6,-5.2],[62,-6.6],[122,-5.4]] as const)if(x<finish+10)createScenicTerrace(foreground,{x,y,z:5,width:8,depth:4.5,thickness:6,preset:sandstone,seed:7400+x,quality:'low'});
  batchStatic(staticRoot);batchStatic(foreground);
  const petals=createDrift(root,{kind:'petal',count:low?24:70,colors:['#f39a1e','#e8473b','#f6d14b','#f7c6cf'],x:[-6,finish+10],y:[-1,7],z:[-6,2.5],fall:.3,sway:.7,size:.14,seed:3,name:'floating-flower-petals'});petals.setVisible(!reduced);
  const parakeets=createFlock(root,{count:low?5:10,centre:[finish*.5,12,-30],radius:[finish*.35,2.5,9],speed:.07,size:.9,color:'#3fae4a',wing:'#2f8f3a',seed:7,name:'rose-ringed-parakeets'});
  let disposed=false;
  return{root,
   update(time){if(disposed)return;const motion=reduced?0:time;for(const c of channels)c.update(motion);jets.update(motion);petals.update(motion);parakeets.update(motion);},
   frame(cameraX){sky.follow(cameraX);taj.position.x=62+(cameraX-60)*.4;},
   setReducedMotion(value){reduced=value;petals.setVisible(!value);},
   setView(view){const fog=scene.fog;if(fog instanceof T.Fog){fog.near=view==='overview'?160:70;fog.far=view==='overview'?440:280;}foreground.visible=view!=='overview';},
   finalize:(target,onReady)=>loadSurfaceMaps(target,low,onReady),
   dispose(){if(disposed)return;disposed=true;disposeTree(root);scene.background=oldBackground;scene.fog=oldFog;}};
 },
 dressPlatform(root,definition,context){
  const surface={set:'sandstone-blocks' as const,tint:'#ffc9b2',repeat:.6};
  if(definition.type==='bridge'){dressDeck(root,definition,'carved',deck,{below:6,surface});return;}
  if(definition.motion){dressDeck(root,definition,'garden',deck,{surface});return;}
  dressTerrain(root,definition,sandstone,{quality:context.low?'low':'standard',lush:definition.id==='in-start'||definition.id==='in-finish'});
  const props=new Builder(),w=definition.width;
  if(definition.id==='in-start'){const arch=createArchway(root,{style:'mughal',width:2.2,height:2.4,stone:'#c4684f',trim:'#efe6d6'});arch.position.set(-w/2+3,0,-1.25);arch.scale.setScalar(.8);for(let i=0;i<6;i++)props.add(new T.BoxGeometry(1,.45,.25),i%2?'#c4684f':'#efe6d6',[1+i*1.05,.22,-1.45]);plantGrove(root,'cypress',[{x:w/2-1.2,y:0,z:-1.35,scale:.5}],{low:context.low});}
  if(definition.id==='in-pavilion')chhatri(props,1.2-w/2+2.6,0,-1.3,1.1,'#efe6d6');
  if(definition.id==='in-fountain')props.add(new T.CylinderGeometry(.6,.7,.3,16),'#efe6d6',[0,.15,-1.1]);
  if(definition.id==='in-finish'){chhatri(props,w/2-2.2,0,-1.45,1.3,'#efe6d6');plantGrove(root,'cypress',[{x:-w/2+1.2,y:0,z:-1.35,scale:.55}],{low:context.low});}
  if(props.parts.length)props.mesh(root,vertexMaterial(.7),'platform-mughal-props');
 },
 createEnemy:createBeetle,
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'marble',color:'#f4efe6',trim:'#b8603f',glyph:'#f2b13c'}),
 decorateCheckpoint(marker){const banner=createBannerPost(marker,{pole:'#7a4a30',cloth:'#f39a1e',accent:'#3f8f46',height:2.1});banner.position.set(-.45,0,-.2);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'mughal',width:3.2,height:3.2,stone:'#c4684f',trim:'#efe6d6'});arch.position.set(0,0,-1.55);},
};
