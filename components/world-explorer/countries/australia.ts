import * as T from 'three';
import {Builder,batchStatic,disposeTree,ellipsoid,matte,random,valueNoise,vertexMaterial,type Placement} from '../kit/common';
import {createSkyDome,createCloudBanks} from '../kit/sky';
import {dressTerrain,createScenicTerrace,type TerrainPreset} from '../kit/terrain';
import {createHeightfield} from '../kit/landform';
import {createWaterSurface,createShoreFoam} from '../kit/water';
import {plantGrove} from '../kit/vegetation';
import {createFlock,createSchool} from '../kit/wildlife';
import {dressDeck,type DeckPalette} from '../kit/bridges';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {createCreatureRig,finishCreature} from '../kit/creature';
import {loadSurfaceMaps} from '../kit/surface-maps';
import type {CountryEnvironment} from './types';

/** Australia — Great Barrier Reef: Tropical Coast Adventure. A fictional island
 * course inspired by the reef; corals and marine life are stylized scenery. */
const info={
 id:'australia-reef-coast',title:'Great Barrier Reef: Tropical Coast Adventure',
 license:'Original procedural geometry; CC0 Poly Haven coastal rock surface maps (see materials/LICENSES.md).',
 representation:'A fictional tropical island course inspired by the Great Barrier Reef. Coral shapes, cays and animals are stylized and not species-accurate; the route is not a map of the marine park.',
 landmarkSource:'https://whc.unesco.org/en/list/154/',
 assets:['shallow-turquoise-lagoon','branching-brain-and-plate-corals','sand-cays','coconut-palms','timber-boardwalk-and-pier','floating-raft','reef-fish','sea-turtles','manta-rays','seabirds','surf-foam'],
};
const coast:TerrainPreset={id:'reef-coastal-rock',shape:'rock',rock:{light:'#d9cba9',dark:'#8f846c',crack:'#4f4a3d',top:'#e9dcb6',topDepth:.12,strata:.5},cap:{kind:'grass',a:'#ead9ae',b:'#5fae45',c:'#f1e6c6',path:.24},rim:{kind:'ridge',color:'#dcc68f',alt:'#cfb67c',size:.9},blades:{color:'#5fae45',alt:'#86c454',density:1.1,height:1},flowers:{colors:['#f05a7e','#ffd34d','#ffffff'],density:.8},pebbles:'#f4ecd6',maps:{set:'coastal-rock',tint:'#ffffff',repeat:.7}};
const deck:DeckPalette={wood:'#a37c56',woodAlt:'#b88f66',rope:'#d8c79e',stone:'#d9cba9',stoneAlt:'#c7b993',metal:'#55606a',accent:'#f07d5a'};
const corals=['#f07d6a','#e9599a','#f7b24a','#9b6fd8','#4fc0b0','#f4e27a','#ff8f5a'];

/** Coral heads: branching staghorn, rounded brain coral, plate and fan forms. */
function reef(b:Builder,x:number,y:number,z:number,seed:number,low:boolean){
 const r=random(seed),kind=Math.floor(r()*4),color=corals[Math.floor(r()*corals.length)];
 if(kind===0)for(let i=0;i<(low?4:7);i++){const a=r()*Math.PI*2,tilt=.3+r()*.5;const end=new T.Vector3(x+Math.cos(a)*Math.sin(tilt)*1.1,y+Math.cos(tilt)*1.2,z+Math.sin(a)*Math.sin(tilt)*1.1);b.strut(new T.Vector3(x,y,z),end,.09,color,5,.5);b.add(new T.SphereGeometry(.1,6,4),color,[end.x,end.y,end.z]);}
 else if(kind===1)b.add(new T.IcosahedronGeometry(.8,low?1:2),color,[x,y+.35,z],[0,r()*3,0],[1.2,.75,1.1],.15);
 else if(kind===2)for(let i=0;i<3;i++)b.add(new T.CylinderGeometry(.9-i*.2,.75-i*.2,.08,12),color,[x+(r()-.5)*.4,y+.2+i*.32,z+(r()-.5)*.4],[r()*.3,0,r()*.3]);
 else{const fan=new T.CircleGeometry(.8,10,0,Math.PI);b.add(fan,color,[x,y,z],[0,r()*3,0],[1,1.1,1]);b.add(new T.CircleGeometry(.6,10,0,Math.PI),color,[x+.3,y,z-.2],[0,r()*3,0]);}
}
function turtle(parent:T.Object3D){const root=new T.Group();root.name='sea-turtle';parent.add(root);const shell=matte('#6f7a3a'),skin=matte('#9aa36a');ellipsoid(root,shell,0,0,0,.9,.32,.65,14);ellipsoid(root,skin,1,.02,0,.28,.2,.22,10);const flippers:T.Mesh[]=[];for(const [fx,fz] of [[.4,.7],[.4,-.7],[-.6,.45],[-.6,-.45]] as const){const f=ellipsoid(root,skin,fx,-.05,fz,.45,.06,.18,8);f.rotation.y=fz>0?-.5:.5;flippers.push(f);}return{root,update(time:number){flippers.forEach((f,i)=>{f.rotation.x=Math.sin(time*2+(i%2)*Math.PI)*.35;});}};}
function manta(parent:T.Object3D){const shape=new T.Shape();shape.moveTo(1.2,0);shape.quadraticCurveTo(.2,1.6,-.6,1.8);shape.quadraticCurveTo(-.4,.6,-1,0);shape.quadraticCurveTo(-.4,-.6,-.6,-1.8);shape.quadraticCurveTo(.2,-1.6,1.2,0);const g=new T.ShapeGeometry(shape,10);g.rotateX(-Math.PI/2);const m=new T.Mesh(g,new T.MeshStandardMaterial({color:'#2f3a46',side:T.DoubleSide,roughness:.6}));m.name='manta-ray';parent.add(m);const p=g.getAttribute('position'),base=Float32Array.from(p.array as Float32Array);return{root:m,update(time:number){for(let i=0;i<p.count;i++){const z=base[i*3+2];p.setY(i,base[i*3+1]+Math.sin(time*2.2)*Math.abs(z)*.25);}p.needsUpdate=true;}};}

/** Original driftwood-and-shell creature: a weathered log body under a ribbed shell. */
function createDriftwood(parent:T.Object3D){
 const rig=createCreatureRig(parent,{name:'australia-driftwood-shell-creature',height:.8,feet:[-.14,.14],footColor:'#6a5240',footSize:[.07,.05,.09],stride:9,animate(rig,time,state,moving){rig.extras.shell.rotation.x=state==='ALERT'?-.2:Math.sin(time*(moving?8:2))*.04;}});
 const wood=matte('#9c8a72',.9),grain=matte('#7d6c58'),coral=matte('#f07d6a'),white=matte('#fbf7ea'),pupil=matte('#1d1a18');
 const log=new T.Mesh(new T.CylinderGeometry(.22,.26,.62,12),wood);log.rotation.x=Math.PI/2;log.position.y=.3;rig.body.add(log);
 for(let i=0;i<4;i++){const ring=new T.Mesh(new T.TorusGeometry(.235,.012,5,16),grain);ring.position.set(0,.3,-.22+i*.15);rig.body.add(ring);}
 for(const side of [-1,1])ellipsoid(rig.body,coral,side*.12,.48,-.12,.05,.05,.05,8);
 const shell=new T.Group();shell.position.set(0,.5,-.04);rig.body.add(shell);rig.extras.shell=shell;
 for(let i=0;i<7;i++){const rib=new T.Mesh(new T.CylinderGeometry(.04,.02,.5,6),i%2?matte('#f5e3cf'):matte('#f2b9a4'));rib.position.set(0,.05,0);rib.rotation.set(-.4,0,(i-3)*.28);rib.translateY(.2);shell.add(rib);}
 for(const side of [-1,1]){ellipsoid(rig.head,white,side*.08,.36,.33,.065,.08,.04,12);ellipsoid(rig.head,pupil,side*.08,.355,.365,.032,.042,.02,10);}
 finishCreature(rig);return rig;
}

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#7ec8f0',exposure:1.03,sun:'#fff6dc',sunIntensity:3.5,sky:'#e8f7ff',ground:'#6aa7a0',hemisphere:1.3,rim:'#e0fbff',rimIntensity:.55,pixelRatio:1.25,reflections:{zenith:'#2b86d9',horizon:'#d4f1f7',ground:'#3fb3c0',intensity:.55}},
 mount(context){
  const {scene,finish,low,level}=context;let reduced=context.reducedMotion;
  const root=new T.Group();root.name='australia-reef-environment';root.userData={environmentId:info.id,decorative:true,layers:['foreground','playable-context','shallow-lagoon','reef-floor','sand-cays','sky']};scene.add(root);
  const oldBackground=scene.background,oldFog=scene.fog;scene.background=new T.Color('#7ec8f0');scene.fog=new T.Fog('#c8eef3',70,260);
  const sky=createSkyDome(root,{zenith:'#2a83d8',horizon:'#cfeef7',glow:'#fff8e0',sun:[-.4,.65,-.6],glowPower:32});
  createCloudBanks(root,{finish,low,seed:13,groups:16,opacity:.92,high:[18,30],lowBand:[4,8],flat:.75});
  const staticRoot=new T.Group();staticRoot.name='australia-static-scenery';root.add(staticRoot);
  // Landmarks, water and landforms stay unbatched: they keep their names and can follow the camera.
  const features=new T.Group();features.name='landmarks-and-landforms';root.add(features);
  // Reef floor: sand with darker reef patches, seen through the clear lagoon.
  const sand=new T.Color('#e9dcb0'),reefDark=new T.Color('#5b7f74'),deepBlue=new T.Color('#2f6f8f');
  createHeightfield(features,{name:'reef-floor',x:finish/2,y:-5.3,z:-50,width:finish+300,depth:120,segments:[low?70:140,low?36:64],height:(u,v)=>valueNoise(u*40,v*24,7)*.9+(v<.35?-1.5*(1-v/.35):0),color:(h,_s,u,v)=>{const patch=valueNoise(u*22,v*14,3);return(v<.3?deepBlue.clone().lerp(sand,v/.3*.4):sand.clone().lerp(reefDark,patch>.55?.65:.1)).multiplyScalar(.9+h*.08);}});
  const lagoon=createWaterSurface(features,{x:finish/2,y:-3.6,z:-46,width:finish+300,depth:130,shallow:'#28c4c8',deep:'#0d66a3',opacity:.6,segments:44,name:'reef-lagoon-surface',repeat:.06,flow:[.01,.012]});
  // Sand cays with palms float on the horizon.
  createHeightfield(features,{name:'distant-sand-cays',x:finish/2,y:-3.9,z:-110,width:finish+300,depth:40,segments:[low?60:120,12],height:(u,v)=>Math.max(0,valueNoise(u*9,v*3,21)-.55)*6*Math.sin(v*Math.PI),color:(h)=>h>.8?new T.Color('#4f9a45'):new T.Color('#f2e6c0')});
  const coral=new Builder(),r=random(70);
  for(let i=0;i<(low?70:190);i++)reef(coral,-30+r()*(finish+60),-4.9+r()*.3,-4-r()*44,i*13+5,low);
  coral.mesh(features,vertexMaterial(.6,{emissive:'#1a0a0a',emissiveIntensity:.15}),'coral-reef-formations').scale.setScalar(1);
  const sites=[{x:-8,y:-1,z:-12,w:14,t:7},{x:22,y:.8,z:-22,w:12,t:8},{x:52,y:.4,z:-18,w:11,t:7},{x:80,y:1.2,z:-24,w:14,t:8},{x:106,y:.2,z:-14,w:12,t:7},{x:132,y:1,z:-20,w:14,t:8}].filter(site=>site.x<finish+24);
  for(const [i,site] of sites.entries())createScenicTerrace(staticRoot,{x:site.x,y:site.y,z:site.z,width:site.w,depth:7,thickness:site.t,preset:coast,seed:6100+i,quality:low?'low':'standard',lush:true});
  const palms:Placement[]=[],shrubs:Placement[]=[];
  for(const site of sites){for(let i=0;i<(low?2:3);i++)palms.push({x:site.x+(r()-.5)*site.w*.7,y:site.y,z:site.z+(r()-.5)*3,scale:.9+r()*.3,rotation:r()*6});shrubs.push({x:site.x+site.w*.3,y:site.y,z:site.z+1.8,scale:.9});}
  for(let i=0;i<(low?10:26);i++)palms.push({x:-30+r()*(finish+60),y:-3.4,z:-104-r()*10,scale:1.2+r()*.4,rotation:r()*6});
  plantGrove(staticRoot,'coconut-palm',palms,{low,name:'coconut-palms'});plantGrove(staticRoot,'flowering-shrub',shrubs,{low,name:'island-shrubs'});
  // A timber pier runs out from the starting island, away from the course.
  const start=level.platforms[0],pier=new Builder();
  for(let i=0;i<10;i++)pier.add(new T.BoxGeometry(2,.12,.55),i%2?'#a37c56':'#b88f66',[start.x+5,start.y-.3,-2-i*.6]);
  for(const z of [-2.4,-4.4,-6.4,-8])for(const x of [start.x+4.1,start.x+5.9])pier.add(new T.CylinderGeometry(.09,.1,4,7),'#7d5f43',[x,start.y-2.2,z]);
  pier.mesh(features,vertexMaterial(.85),'starting-wooden-pier');
  const foreground=new T.Group();foreground.name='australia-low-foreground';root.add(foreground);
  for(const [x,y] of [[-6,-3.4],[62,-3.6],[124,-3.4]] as const)if(x<finish+10)createScenicTerrace(foreground,{x,y,z:5,width:8,depth:4.5,thickness:4,preset:coast,seed:6400+x,quality:'low'});
  batchStatic(staticRoot);batchStatic(foreground);
  // Surf foam where the lagoon meets each rock, animated marine life and seabirds.
  const foamPoints=level.platforms.filter(p=>p.type==='stone').flatMap(p=>[{x:p.x+p.width*.25,y:-3.57,z:.6,size:1.6},{x:p.x+p.width*.75,y:-3.57,z:-.6,size:1.4}]);
  const foam=createShoreFoam(root,foamPoints,low);
  const fish=createSchool(root,{count:low?14:36,centre:[finish*.5,-4.6,-14],radius:[finish*.4,6],colors:['#ffd34d','#4fc0e8','#f07d6a','#ffffff'],size:.32,seed:4});
  const turtles=[turtle(root),turtle(root)];const rays=[manta(root)];
  const birds=createFlock(root,{count:low?4:9,centre:[finish*.5,14,-30],radius:[finish*.4,3,12],speed:.05,size:1.1,color:'#f4f4f2',wing:'#e8ecef',seed:23,glide:true,name:'seabirds'});
  let disposed=false;
  return{root,
   update(time){if(disposed)return;const motion=reduced?0:time;lagoon.update(motion);foam.update(motion);fish.update(motion);birds.update(motion);
    turtles.forEach((t,i)=>{const a=motion*.05+i*2.6;t.root.position.set(finish*.5+Math.cos(a)*finish*.35,-4.7+i*.2,-20-Math.sin(a)*8-i*6);t.root.rotation.y=-a-Math.PI/2;t.update(motion);});
    rays.forEach((m,i)=>{const a=motion*.07+i;m.root.position.set(finish*.45+Math.cos(a)*finish*.3,-4.9,-28+Math.sin(a)*6);m.root.rotation.y=-a-Math.PI/2;m.update(motion);});},
   frame(cameraX){sky.follow(cameraX);},
   setReducedMotion(value){reduced=value;},
   setView(view){const fog=scene.fog;if(fog instanceof T.Fog){fog.near=view==='overview'?150:70;fog.far=view==='overview'?420:260;}foreground.visible=view!=='overview';},
   finalize:(target,onReady)=>loadSurfaceMaps(target,low,onReady),
   dispose(){if(disposed)return;disposed=true;disposeTree(root);scene.background=oldBackground;scene.fog=oldFog;}};
 },
 dressPlatform(root,definition,context){
  const low=context.low;
  if(definition.type==='bridge'){dressDeck(root,definition,'boardwalk',deck,{below:2.2});return;}
  if(definition.motion){dressDeck(root,definition,'raft',deck);return;}
  dressTerrain(root,definition,coast,{quality:low?'low':'standard',lush:definition.id==='au-start'||definition.id==='au-finish'});
  const w=definition.width,palms:Placement[]=[],shrubs:Placement[]=[];
  if(definition.id==='au-start'){palms.push({x:-w/2+1.6,y:0,z:-1.3,scale:.7},{x:w/2-2,y:0,z:-1.35,scale:.6});shrubs.push({x:1,y:0,z:-1.2,scale:.7});}
  if(definition.id==='au-lookout')palms.push({x:-w/2+.8,y:0,z:-1.2,scale:.42});
  if(definition.id==='au-finish'){palms.push({x:w/2-1.6,y:0,z:-1.35,scale:.65},{x:-w/2+1.5,y:0,z:-1.3,scale:.55});shrubs.push({x:-2,y:0,z:-1.2,scale:.7});}
  if(palms.length)plantGrove(root,'coconut-palm',palms,{low});if(shrubs.length)plantGrove(root,'flowering-shrub',shrubs,{low});
 },
 createEnemy:createDriftwood,
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'wood',color:'#b9a688',trim:'#f07d6a',glyph:'#ffe27a'}),
 decorateCheckpoint(marker){const banner=createBannerPost(marker,{pole:'#8a6a4a',cloth:'#22a6b3',accent:'#f07d6a',height:2.1});banner.position.set(-.45,0,-.2);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'timber',width:3.4,height:3.4,stone:'#a37c56',trim:'#7d5f43'});arch.position.set(0,0,-1.55);plantGrove(gate,'coconut-palm',[{x:-2.6,y:0,z:-1.5,scale:.55}]);},
};
