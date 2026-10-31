import * as T from 'three';
import {Builder,batchStatic,disposeTree,ellipsoid,matte,random,v3,valueNoise,vertexMaterial} from '../kit/common';
import {createSkyDome,createCloudBanks} from '../kit/sky';
import {dressTerrain,createScenicTerrace,type TerrainPreset} from '../kit/terrain';
import {createHeightfield} from '../kit/landform';
import {createWaterSurface,createWaterfall,createShoreFoam} from '../kit/water';
import {plantGrove,type TreeKind} from '../kit/vegetation';
import {createDrift} from '../kit/particles';
import {createFlock} from '../kit/wildlife';
import {dressDeck,type DeckPalette} from '../kit/bridges';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {createCreatureRig,finishCreature} from '../kit/creature';
import {loadSurfaceMaps,markSurface} from '../kit/surface-maps';
import {dressLandmass,localSurface,type LandmassPalette} from '../kit/landmass';
import type {Placement} from '../kit/common';
import type {CountryEnvironment} from './types';

/** Brazil — Amazon Canopy Run. A fictional canopy course inspired by
 * the Central Amazon; wildlife is non-interactive scenery, never an enemy. */
const info={
 id:'brazil-amazon-canopy',title:'Amazon Canopy Run',
 license:'Original procedural geometry; CC0 Poly Haven mossy rock surface maps (see materials/LICENSES.md).',
 representation:'A fictional rainforest platform course inspired by the Amazon Basin. Trees, river channels and waterfalls are stylized; the route is not a map of the protected area.',
 landmarkSource:'https://whc.unesco.org/en/list/998/',
 assets:['emergent-kapok-trees','broadleaf-understory','bamboo','hanging-vines','jungle-river','waterfalls-and-mist','rope-suspension-bridge','hanging-log-platforms','scarlet-macaws','fireflies'],
};
const moss:TerrainPreset={id:'amazon-mossy-rock',shape:'rock',rock:{light:'#8f9b7c',dark:'#4f5c45',crack:'#2d3527',top:'#3f7a2e',topDepth:.2,strata:.3},cap:{kind:'moss',a:'#5a4a33',b:'#4f8a35',c:'#7cad4a',path:.18},rim:{kind:'moss',color:'#3f7f2f',alt:'#5c9a3a',size:1.2},blades:{color:'#3f8a33',alt:'#62a845',density:1.6,height:1.2},flowers:{colors:['#e2462f','#f5a623','#f7d548','#d83a7c'],density:1.2},vines:{color:'#3e6b2c',leaf:'#4f9a3a',density:.8,length:3},ferns:'#3d8a35',maps:{set:'mossy-rock',tint:'#ffffff',repeat:.7}};
const canopyRock:TerrainPreset={...moss,id:'amazon-canopy-rock',blades:{color:'#3f8a33',alt:'#62a845',density:.8,height:1},vines:{color:'#3e6b2c',leaf:'#4f9a3a',density:1.2,length:2.2}};
/** Playable terrain: leaf-litter river mud, buttress-root stairs, mossy
 * waterfall rock, and flat-topped mossy canopy branches on bark logs. */
const mud:LandmassPalette={top:'#7a6040',topAlt:'#5f8f3f',edge:'#7f9a4a',face:'#c9b296',faceDark:'#8c7458',band:'#ad967a',maps:{set:'mossy-rock',tint:'#f2e8da',repeat:.4},rough:.2,strata:1.3};
const roots:LandmassPalette={top:'#8a6a46',topAlt:'#6a8f42',edge:'#9a7650',face:'#8a6d4e',faceDark:'#5a4632',band:'#755c42',rough:.12,strata:.6};
const mossCliff:LandmassPalette={top:'#4f8a35',topAlt:'#6aa443',edge:'#7cad4a',face:'#e2ead6',faceDark:'#9fae90',band:'#c3cfb4',maps:{set:'mossy-rock',tint:'#ffffff',repeat:.5},rough:.3,strata:.8};
const branch:LandmassPalette={top:'#4f8a35',topAlt:'#77ad4c',edge:'#8a6d4e',face:'#8a6d4e',faceDark:'#634c36',band:'#755c42',rough:.05,strata:.5};
const deck:DeckPalette={wood:'#7a5636',woodAlt:'#8d6640',rope:'#b9a173',stone:'#8f9b7c',stoneAlt:'#7d896b',metal:'#4c5560',accent:'#e0a02f'};

/** Original seed-pod forest creature: rounded seed, leaf crown, bright eyes. */
function createSeedPod(parent:T.Object3D){
 const rig=createCreatureRig(parent,{name:'brazil-seed-pod-creature',height:.95,feet:[-.12,.12],footColor:'#4a3020',footSize:[.07,.055,.09],stride:8,animate(rig,time,state,moving){const crown=rig.extras.crown;crown.rotation.z=Math.sin(time*(moving?9:2))*.12;crown.rotation.y=(state==='IDLE'||state==='TURN')?Math.sin(time*2.2)*.6:0;rig.body.scale.y=1+(moving?Math.sin(time*16)*.03:0);}});
 const shell=matte('#8a5a2f',.6),stripe=matte('#6b4222'),belly=matte('#c99a5c'),leaf=matte('#3f9a3c'),leafDark=matte('#2e7a2f'),white=matte('#fbf7ea'),pupil=matte('#1d1a18');
 ellipsoid(rig.body,shell,0,.42,0,.3,.36,.28,18);ellipsoid(rig.body,belly,0,.36,.17,.19,.24,.12,14);
 for(const a of [-.6,0,.6]){const band=new T.Mesh(new T.TorusGeometry(.29,.012,5,22,Math.PI),stripe);band.position.y=.42;band.rotation.set(0,a,Math.PI/2);band.scale.set(1.24,1,1);rig.body.add(band);}
 for(const side of [-1,1]){ellipsoid(rig.head,white,side*.1,.5,.24,.08,.1,.05,12);ellipsoid(rig.head,pupil,side*.1,.49,.285,.04,.05,.02,10);}
 const crown=new T.Group();crown.position.set(0,.76,0);rig.head.add(crown);rig.extras.crown=crown;
 for(let i=0;i<4;i++){const shape=new T.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(.12,.18,0,.42);shape.quadraticCurveTo(-.12,.18,0,0);const blade=new T.Mesh(new T.ShapeGeometry(shape),i%2?leaf:leafDark);(blade.material as T.Material).side=T.DoubleSide;blade.rotation.set(-.3,i*Math.PI/2,(i%2?.5:-.5));crown.add(blade);}
 const stem=new T.Mesh(new T.CylinderGeometry(.018,.025,.12,6),stripe);stem.position.y=-.02;crown.add(stem);
 finishCreature(rig);return rig;
}

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#9fcbd8',exposure:1.0,sun:'#fff0c8',sunIntensity:2.9,sky:'#dff4e6',ground:'#3b5a30',hemisphere:1.45,rim:'#d9ffe0',rimIntensity:.45,pixelRatio:1.25,reflections:{zenith:'#5aa6d6',horizon:'#cfe8dc',ground:'#2f4a28',intensity:.3}},
 ropeColor:'#3e6b2c',
 mount(context){
  const {scene,finish,low,level}=context;let reduced=context.reducedMotion;
  const root=new T.Group();root.name='brazil-amazon-environment';root.userData={environmentId:info.id,decorative:true,layers:['playable-canopy','ravine-and-river','near-background','river-and-waterfalls','canopy-horizon','sky']};scene.add(root);
  const oldBackground=scene.background,oldFog=scene.fog;scene.background=new T.Color('#9fcbd8');scene.fog=new T.Fog('#a8ccb8',50,185);
  const sky=createSkyDome(root,{zenith:'#4e9fd3',horizon:'#d2eadf',band:'#c3e0d0',glow:'#fff4d6',sun:[-.4,.6,-.7],glowPower:24});
  createCloudBanks(root,{finish,low,seed:83,groups:18,opacity:.8,shade:'#d6e2dc',high:[18,30],lowBand:[-2,2]});
  const staticRoot=new T.Group();staticRoot.name='brazil-static-scenery';root.add(staticRoot);
  const features=new T.Group();features.name='landmarks-and-landforms';root.add(features);
  const greens=[new T.Color('#2f6b2c'),new T.Color('#3f7f33'),new T.Color('#4e8f3a'),new T.Color('#2a5d2d')];
  createHeightfield(features,{name:'amazon-canopy-horizon',x:finish/2,y:-8,z:-120,width:finish+300,depth:120,segments:[low?70:140,low?30:56],height:(u,v)=>(valueNoise(u*60,v*40,5)*2.2+valueNoise(u*14,v*10,9)*5)*Math.min(1,v*4),color:(h,_s,u,v)=>greens[Math.floor(valueNoise(u*70,v*50,2)*4)%4].clone().multiplyScalar(.75+h*.06)});
  const river=createWaterSurface(features,{x:finish/2,y:-9,z:-30,width:finish+240,depth:60,shallow:'#5aa58f',deep:'#2c6a62',segments:40,name:'amazon-river-channel',flow:[.03,.008],repeat:.08});
  createHeightfield(features,{name:'amazon-riverbank-forest',x:finish/2,y:-10,z:-70,width:finish+260,depth:30,segments:[low?60:110,10],height:(u,v)=>Math.max(0,v-.2)*6+valueNoise(u*50,v*10,13)*2,color:(h,_s,u,v)=>greens[Math.floor(valueNoise(u*60,v*30,4)*4)%4].clone().multiplyScalar(.7+h*.05)});
  // The ravine under the canopy and the river crossing in the lane: both read
  // as real water, and the crossing surface sits just above the river hazard.
  const hazard=level.hazards.find(h=>h.id==='br-river');
  const crossing=hazard?createWaterSurface(features,{x:hazard.x+hazard.width/2,y:hazard.y+hazard.height-.05,z:0,width:hazard.width+3,depth:32,shallow:'#6aa98f',deep:'#2f6a5c',segments:24,name:'amazon-river-crossing',flow:[.05,.01],repeat:.12}):null;
  const ravine=createWaterSurface(features,{x:36,y:-9.3,z:2,width:48,depth:22,shallow:'#4f8f7c',deep:'#24584f',segments:20,name:'ravine-stream',flow:[.04,.01],repeat:.1});
  createHeightfield(features,{name:'ravine-floor',x:finish/2,y:-9.6,z:-6,width:finish+120,depth:30,segments:[low?50:100,12],height:(u,v)=>valueNoise(u*60,v*10,21)*1.2-.3,color:(_h,_s,u,v)=>greens[Math.floor(valueNoise(u*40,v*20,6)*4)%4].clone().multiplyScalar(.42)});
  const sites=[{x:-8,y:-1,z:-12,w:15,t:10},{x:18,y:2,z:-22,w:14,t:13},{x:44,y:3.2,z:-30,w:16,t:14},{x:70,y:1.4,z:-18,w:13,t:12},{x:96,y:3,z:-28,w:15,t:14},{x:124,y:1.2,z:-16,w:15,t:12},{x:4,y:5.2,z:-44,w:18,t:17},{x:82,y:5.8,z:-46,w:18,t:18}].filter(site=>site.x<finish+24);
  for(const [i,site] of sites.entries())createScenicTerrace(staticRoot,{x:site.x,y:site.y,z:site.z,width:site.w,depth:8,thickness:site.t,preset:moss,seed:4100+i,quality:low?'low':'standard',lush:true});
  // Waterfalls: background falls feed the river; the lookout's own fall pours beside the ledge.
  const ledge=level.platforms.find(p=>p.id==='br-falls-ledge');
  const falls=[[18,2,-17.8,2.6],[44,3.2,-25.8,3.4],[96,3,-23.8,3],[82,5.8,-41.8,2.4],...(ledge?[[ledge.x+ledge.width/2,ledge.y+6,-4.2,3.6]]:[])].filter(([x])=>x<finish+20);
  const waterfalls=falls.map(([x,top,z,width],i)=>createWaterfall(root,{x,top,z,width,height:top+9.2,seed:600+i,low,tint:'#d5f1ea',glow:'#4c9483'}));
  if(ledge)createScenicTerrace(staticRoot,{x:ledge.x+ledge.width/2,y:ledge.y+6,z:-5.6,width:9,depth:4,thickness:16,preset:moss,seed:4500,quality:low?'low':'standard',lush:true});
  const foam=createShoreFoam(root,falls.map(([x,,z])=>({x,y:-8.97,z:z+.6,size:2.2})),low,'#e9f7f1');
  // Emergent kapok trees carry the canopy branches: each branch grows from a
  // trunk behind the lane that runs down into the ravine.
  const r=random(31),kapok:Placement[]=[],under:Placement[]=[],bamboo:Placement[]=[],shrubs:Placement[]=[],trunks=new Builder(.4);
  for(const p of level.platforms.filter(p=>p.terrain==='canopy'&&!p.motion)){
   const x=p.x+(p.id.endsWith('1')||p.id.endsWith('3')?p.width*.8:p.width*.2),base=-9.5;
   trunks.add(new T.CylinderGeometry(.6,1,p.y-base+2.4,10,6),'#a08868',[x,(p.y+base+2.4)/2,-2.7],[0,0,0],[1,1,1],.06);
   for(const side of [-1,1])trunks.add(new T.CylinderGeometry(.08,.7,3.4,5),'#8a7258',[x+side*1,base+1.5,-2.7+side*.3],[0,0,side*.5]);
   kapok.push({x,y:p.y+1.2,z:-3.2,scale:.7,rotation:r()*6});
  }
  trunks.mesh(staticRoot,vertexMaterial(.92),'kapok-trunks');
  for(const site of sites){kapok.push({x:site.x+(r()-.5)*site.w*.5,y:site.y,z:site.z-1.5,scale:.85+r()*.3,rotation:r()*6});for(let i=0;i<(low?2:5);i++)under.push({x:site.x+(r()-.5)*site.w*.8,y:site.y,z:site.z+(r()-.3)*3,scale:1+r()*.5,rotation:r()*6});if(r()<.6)bamboo.push({x:site.x+(r()-.5)*site.w*.6,y:site.y,z:site.z-2.5,scale:.9+r()*.3,rotation:r()*6});shrubs.push({x:site.x+(r()-.5)*site.w*.7,y:site.y,z:site.z+2,scale:1.2,color:'#ffffff'});}
  for(let i=0;i<(low?18:46);i++)kapok.push({x:-30+r()*(finish+60),y:-9.5+r()*2,z:-40-r()*40,scale:1.1+r()*.5,rotation:r()*6});
  for(let i=0;i<(low?10:26);i++)under.push({x:10+r()*50,y:-9.5,z:-3-r()*9,scale:1.5+r()*.6,rotation:r()*6});
  plantGrove(staticRoot,'kapok',kapok,{low,name:'emergent-kapok-trees'});plantGrove(staticRoot,'understory',under,{low,name:'broadleaf-understory'});plantGrove(staticRoot,'bamboo',bamboo,{low,name:'bamboo-clumps'});plantGrove(staticRoot,'flowering-shrub',shrubs,{low,name:'heliconia-shrubs'});
  // Each vine swing hangs from a fixed branch above its pivot.
  const anchors=new Builder();
  for(const p of level.platforms.filter(p=>p.motion==='pendulum')){const x=p.x+p.width/2,top=p.y+(p.length||4);anchors.add(new T.TubeGeometry(new T.CatmullRomCurve3([v3(x-5,top+.9,-3),v3(x,top+.25,0),v3(x+5,top+1.1,-3.2)]),20,.38,7,false),'#5e4a35');for(let i=0;i<8;i++)anchors.add(new T.IcosahedronGeometry(1.2,1),i%2?'#3f7f33':'#2f6b2c',[x-4.5+i*1.3,top+1+r()*.6,-1.6-r()*1.4],[0,r()*3,0],[1.3,.7,1]);}
  anchors.mesh(features,vertexMaterial(.9),'vine-anchor-branches');
  const foreground=new T.Group();foreground.name='brazil-low-foreground';root.add(foreground);
  batchStatic(staticRoot);
  const macaws=createFlock(root,{count:low?4:8,centre:[finish*.45,12,-34],radius:[finish*.35,2.5,8],speed:.06,size:1.2,color:'#d42a2a',wing:'#2b62c8',seed:5,name:'scarlet-macaws'});
  const mist=createDrift(root,{kind:'mist',count:low?14:34,colors:['#f2faf5'],x:[-10,finish+10],y:[-8.6,-4],z:[-34,-6],fall:-.04,sway:2,size:2.6,seed:8,name:'river-mist'});
  const fireflies=createDrift(root,{kind:'spark',count:low?16:44,colors:['#f6f19a','#c8f582'],x:[-6,finish+6],y:[-1,5],z:[-5,2.2],fall:-.12,sway:.9,size:.07,seed:12,name:'floating-pollen-and-fireflies'});
  mist.setVisible(!reduced);fireflies.setVisible(!reduced);
  let disposed=false;
  return{root,
   update(time){
    if(disposed)return;const motion=reduced?0:time;river.update(motion);crossing?.update(motion);ravine.update(motion);foam.update(motion);for(const w of waterfalls)w.update(motion);macaws.update(motion);mist.update(motion);fireflies.update(motion);
   },
   frame(cameraX){sky.follow(cameraX);},
   setReducedMotion(value){reduced=value;mist.setVisible(!value);fireflies.setVisible(!value);},
   setView(view){const fog=scene.fog;if(fog instanceof T.Fog){fog.near=view==='overview'?140:50;fog.far=view==='overview'?380:185;}foreground.visible=view!=='overview';},
   finalize:(target,onReady)=>loadSurfaceMaps(target,low,onReady),
   dispose(){if(disposed)return;disposed=true;disposeTree(root);scene.background=oldBackground;scene.fog=oldFog;}};
 },
 dressPlatform(root,definition,context){
  const low=context.low,w=definition.width;
  if(definition.type==='bridge'){dressDeck(root,definition,'rope',deck,{below:4});return;}
  if(definition.style==='raft'){dressDeck(root,definition,'raft',deck);return;}
  if(definition.motion){dressDeck(root,definition,'log',deck);return;}
  if(!definition.terrain){dressTerrain(root,definition,definition.route==='upper'?canopyRock:moss,{quality:low?'low':'standard',lush:definition.width>=9});return;}
  const plants:[TreeKind,Placement[]][]=[],surface=localSurface(definition);
  if(definition.terrain==='canopy'){
   // A mossy branch: a flat walkable top on a thick bark log, epiphytes behind.
   const details=dressLandmass(root,definition,branch,{low,kind:'block'}),log=new Builder(.4);
   log.add(new T.CylinderGeometry(.55,.62,w+.6,12,1),'#5e4a35',[0,-.55,-.2],[0,0,Math.PI/2],[1,1,1],.05);
   for(let i=0;i<Math.ceil(w/1.4);i++)log.add(new T.IcosahedronGeometry(.42,0),i%2?'#4f8a35':'#6aa443',[-w/2+.6+i*1.4,.18,-1.15],[0,i,0],[1.2,.55,.9]);
   const material=vertexMaterial(.9);markSurface(material,'mossy-rock','#c9b49a',.5);log.mesh(details,material,'canopy-branch-log');
   plantGrove(details,'flowering-shrub',[{x:w/2-.6,y:0,z:-1.05,scale:.45}],{low});
   return;
  }
  const kind=definition.terrain==='cliff'?'cliff':definition.terrain==='stairs'?'stairs':'ground';
  dressLandmass(root,definition,definition.terrain==='cliff'?mossCliff:definition.terrain==='stairs'?roots:mud,{low,kind});
  if(definition.style==='bromeliad'){
   // A giant bromeliad rosette: the springy centre is the pad; leaves fan out of the lane.
   const b=new Builder();for(let i=0;i<14;i++){const a=i/14*Math.PI*2;if(Math.abs(Math.cos(a))>.7)continue;const leaf=new T.ConeGeometry(.26,2.2,4,1);leaf.rotateZ(-Math.PI/2);leaf.translate(1.1,0,0);b.add(leaf,i%3?'#b8322b':'#d9552e',[0,.18,0],[0,a,.35],[1,.25,1]);}
   const rosette=b.mesh(root,vertexMaterial(.7),'bromeliad-rosette');rosette.position.y=-.45;rosette.scale.set(.75,1,1.2);rosette.userData.nonColliding=true;
   const cup=new T.Mesh(new T.CylinderGeometry(.62,.7,.06,16),matte('#e0a02f'));cup.position.y=-.01;cup.name='bromeliad-cup';root.add(cup);
  }
  if(definition.id==='br-start')plants.push(['kapok',[{x:-w/2+3,y:0,z:-2.6,scale:.62}]],['understory',[{x:1.5,y:0,z:-1.9,scale:.9},{x:4.8,y:0,z:-2.2,scale:.8},{x:7.5,y:0,z:-1.6,scale:.7}]]);
  else if(kind==='ground'&&w>=5)plants.push(['understory',[{x:w/2-1,y:surface(w/2-1),z:-1.9,scale:.75},{x:-w/2+1.4,y:surface(-w/2+1.4),z:-2.4,scale:.9}]]);
  if(definition.id==='br-far-bank')plants.push(['bamboo',[{x:-w/2+2,y:0,z:-2.4,scale:.8},{x:w/2-1.5,y:0,z:-2.6,scale:.7}]]);
  if(definition.id==='br-lookout')plants.push(['kapok',[{x:w/2-1.6,y:0,z:-2.5,scale:.55}]],['bamboo',[{x:-w/2+1.2,y:0,z:-2.4,scale:.7}]]);
  for(const [kind,placements] of plants)plantGrove(root,kind,placements,{low});
 },
 createEnemy:createSeedPod,
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'wood',color:'#b8834c',trim:'#3f7f33',glyph:'#ffd45a'}),
 decorateCheckpoint(marker){const banner=createBannerPost(marker,{pole:'#6b4a2e',cloth:'#2f8f46',accent:'#f2c230',height:2.1});banner.position.set(-.45,0,-.2);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'jungle',width:3.4,height:3.4,stone:'#6f5034',trim:'#3f7f33'});arch.position.set(0,0,-1.55);plantGrove(gate,'understory',[{x:-2.4,y:0,z:-1.4,scale:.9},{x:2.5,y:0,z:-1.3,scale:.8}]);},
};
