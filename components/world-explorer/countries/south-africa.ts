import * as T from 'three';
import {Builder,batchStatic,disposeTree,ellipsoid,matte,random,valueNoise,vertexMaterial,type Placement} from '../kit/common';
import {createSkyDome,createCloudBanks} from '../kit/sky';
import {dressTerrain,createScenicTerrace,type TerrainPreset} from '../kit/terrain';
import {createHeightfield,rollingHills,gradientColor} from '../kit/landform';
import {createWaterSurface} from '../kit/water';
import {plantGrove} from '../kit/vegetation';
import {createDrift} from '../kit/particles';
import {createFlock} from '../kit/wildlife';
import {createHerd} from '../kit/animals';
import {createHangers,dressDeck,type DeckPalette} from '../kit/bridges';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {createCreatureRig,finishCreature} from '../kit/creature';
import {loadSurfaceMaps} from '../kit/surface-maps';
import type {CountryEnvironment} from './types';

/** South Africa — Savanna Wildlife Adventure. A fictional lowveld course inspired
 * by Kruger National Park; animals keep to separate scenery and are never foes. */
const info={
 id:'south-africa-savanna',title:'Savanna Wildlife Adventure',
 license:'Original procedural geometry; CC0 Poly Haven rock surface maps (see materials/LICENSES.md).',
 representation:'A fictional savanna platform course inspired by the Kruger lowveld. Animals, kopjes and trees are stylized and stay on distant scenery; the route is not a park trail.',
 landmarkSource:'https://www.sanparks.org/parks/kruger/explore/fauna-flora/mammals',
 assets:['golden-grass-plains','umbrella-acacias','granite-kopjes','river-valley','giraffes','african-elephants','zebras','impala','rustic-timber-bridge','cable-suspended-platform','dust-motes'],
};
const savanna:TerrainPreset={id:'lowveld-granite',shape:'rock',rock:{light:'#c79f74',dark:'#7f6046',crack:'#3f2f22',top:'#b8a25a',topDepth:.08,strata:.4},cap:{kind:'dry',a:'#a5603c',b:'#c6a457',c:'#8c8a45',path:.22},rim:{kind:'tufts',color:'#c9a655',alt:'#a8913f',size:1},blades:{color:'#d0ad5b',alt:'#b38f42',density:1.6,height:1.4},pebbles:'#b48a62',maps:{set:'savanna-rock',tint:'#fff3e6',repeat:.7}};
const deck:DeckPalette={wood:'#86603e',woodAlt:'#9a7048',rope:'#c9b28a',stone:'#c79f74',stoneAlt:'#b08a62',metal:'#4c4f52',accent:'#d6a447'};

/** Original rolling thorn-bush creature: a soft bramble ball with blunt spines. */
function createThornBush(parent:T.Object3D){
 let roll=0,last=0;
 const rig=createCreatureRig(parent,{name:'south-africa-rolling-thorn-bush',height:.85,feet:[-.1,.1],footColor:'#4a3a22',footSize:[.06,.045,.08],stride:8,turn:0,animate(rig,time,state,moving){const dt=Math.min(.1,Math.max(0,time-last));last=time;if(moving)roll+=dt*3;rig.extras.ball.rotation.z=-roll;rig.extras.ball.position.y=.42+(moving?Math.abs(Math.sin(time*6))*.03:0);}});
 const leaf=matte('#7b8a3e',.95),leafDark=matte('#5f6d2f',.95),thorn=matte('#d9c9a0'),white=matte('#fbf7ea'),pupil=matte('#1d1a18');
 const ball=new T.Group();ball.position.y=.42;rig.body.add(ball);rig.extras.ball=ball;
 ellipsoid(ball,leafDark,0,0,0,.36,.36,.34,16);
 for(let i=0;i<14;i++){const a=i*2.4,b=Math.acos(1-2*(i+.5)/14),dir=new T.Vector3(Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a));ellipsoid(ball,i%2?leaf:leafDark,dir.x*.28,dir.y*.28,dir.z*.28,.14,.12,.13,8);const spike=new T.Mesh(new T.ConeGeometry(.03,.16,5),thorn);spike.position.copy(dir.clone().multiplyScalar(.4));spike.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir);ball.add(spike);}
 for(const side of [-1,1]){ellipsoid(rig.head,white,side*.11,.5,.31,.075,.09,.045,12);ellipsoid(rig.head,pupil,side*.11,.49,.35,.037,.047,.02,10);}
 finishCreature(rig);return rig;
}

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#93c3ea',exposure:1.05,sun:'#ffd798',sunIntensity:3.4,sky:'#fff1dc',ground:'#9a7a48',hemisphere:1.2,rim:'#ffd6a0',rimIntensity:.6,pixelRatio:1.25,reflections:{zenith:'#4a8fd6',horizon:'#f2d9ae',ground:'#a07a48',intensity:.3}},
 mount(context){
  const {scene,finish,low,level}=context;let reduced=context.reducedMotion;
  const root=new T.Group();root.name='south-africa-savanna-environment';root.userData={environmentId:info.id,decorative:true,layers:['foreground','playable-context','kopjes-and-acacias','savanna-plain-with-wildlife','distant-hills','sky']};scene.add(root);
  const oldBackground=scene.background,oldFog=scene.fog;scene.background=new T.Color('#93c3ea');scene.fog=new T.Fog('#ecdcb8',70,270);
  const sky=createSkyDome(root,{zenith:'#3f88d4',horizon:'#f4dcb2',band:'#f2cf95',glow:'#ffe1a8',sun:[.45,.35,-.8],glowPower:22});
  createCloudBanks(root,{finish,low,seed:29,groups:14,opacity:.85,shade:'#e8d8c4',high:[20,32],flat:.55});
  const staticRoot=new T.Group();staticRoot.name='south-africa-static-scenery';root.add(staticRoot);
  // Landmarks, water and landforms stay unbatched: they keep their names and can follow the camera.
  const features=new T.Group();features.name='landmarks-and-landforms';root.add(features);
  createHeightfield(features,{name:'lowveld-distant-hills',x:finish/2,y:-12,z:-170,width:finish+320,depth:80,segments:[low?50:100,16],height:rollingHills(31,22,2.6),color:gradientColor([[0,'#9a8a52'],[10,'#7e7a48'],[20,'#8b8a64']])});
  const plainHeight=(u:number,v:number)=>valueNoise(u*12,v*8,3)*1.4+(Math.abs(v-.78)<.05?-1.2:0);
  const golds=[new T.Color('#c9a655'),new T.Color('#b9964a'),new T.Color('#d4b468'),new T.Color('#9c8a45')];
  createHeightfield(features,{name:'golden-savanna-plain',x:finish/2,y:-10,z:-70,width:finish+260,depth:140,segments:[low?70:130,low?36:70],height:plainHeight,color:(h,_s,u,v)=>Math.abs(v-.78)<.05?new T.Color('#8f6f4a'):golds[Math.floor(valueNoise(u*30,v*20,6)*4)%4].clone().multiplyScalar(.9+h*.05)});
  const river=createWaterSurface(features,{x:finish/2,y:-10.6,z:-30.8,width:finish+240,depth:6,shallow:'#79a99a',deep:'#4f7f78',segments:30,name:'shallow-savanna-river',repeat:.2,edge:'none',flow:[.03,0]});
  // Granite kopjes and acacias near the course; golden grass everywhere.
  const sites=[{x:-8,y:-1,z:-12,w:14,t:8},{x:20,y:1.2,z:-22,w:13,t:11},{x:48,y:.6,z:-16,w:12,t:9},{x:76,y:2,z:-24,w:15,t:12},{x:102,y:.2,z:-14,w:12,t:8},{x:128,y:1.4,z:-20,w:14,t:10}].filter(site=>site.x<finish+24);
  for(const [i,site] of sites.entries())createScenicTerrace(staticRoot,{x:site.x,y:site.y,z:site.z,width:site.w,depth:7,thickness:site.t,preset:savanna,seed:8100+i,quality:low?'low':'standard'});
  const boulders=new Builder(),r=random(53);
  for(let i=0;i<(low?10:24);i++){const x=-20+r()*(finish+40),z=-36-r()*50,base=-10+plainHeight(.5+(x-finish/2)/(finish+260),.5+(z+70)/140);for(let k=0;k<3+Math.floor(r()*3);k++)boulders.add(new T.IcosahedronGeometry(1,1),'#a68a6a',[x+(r()-.5)*3,base+.6+k*.5,z+(r()-.5)*2],[r(),r()*3,r()],[1.2+r()*1.4,.9+r(),1.1+r()],.12);}
  boulders.mesh(features,vertexMaterial(.95),'distant-granite-kopjes');
  const acacias:Placement[]=[],tufts:Placement[]=[],bushes:Placement[]=[];
  for(const site of sites){acacias.push({x:site.x+(r()-.5)*site.w*.6,y:site.y,z:site.z-1.4,scale:.9+r()*.3,rotation:r()*6});bushes.push({x:site.x+site.w*.3,y:site.y,z:site.z+1.6,scale:.8,color:'#a8a070'});}
  for(let i=0;i<(low?24:60);i++){const x=-30+r()*(finish+60),z=-34-r()*70;acacias.push({x,y:-10+plainHeight(.5+(x-finish/2)/(finish+260),.5+(z+70)/140),z,scale:1.1+r()*.6,rotation:r()*6});}
  for(let i=0;i<(low?300:1400);i++){const x=-30+r()*(finish+60),z=-26-r()*80;tufts.push({x,y:-10+plainHeight(.5+(x-finish/2)/(finish+260),.5+(z+70)/140),z,scale:1.4+r()*1.2,rotation:r()*6});}
  plantGrove(staticRoot,'acacia',acacias,{low,name:'umbrella-acacias'});plantGrove(staticRoot,'golden-tuft',tufts,{low,name:'golden-grass-tufts'});plantGrove(staticRoot,'shrub',bushes,{low,name:'savanna-shrubs'});
  // The suspended platform hangs from a trolley on an overhead timber beam.
  const hanging=level.platforms.filter(p=>p.style==='suspended').map(p=>{const top=p.y+5.4,frame=new Builder(),left=Math.max(...level.platforms.filter(o=>!o.motion&&o.x+o.width<=p.x-p.amplitude+.01).map(o=>o.x+o.width))-.7,right=Math.min(...level.platforms.filter(o=>!o.motion&&o.x>=p.x+p.width+p.amplitude-.01).map(o=>o.x))+.7;
   // Posts stand on the neighbouring islands, behind the walking lane.
   for(const x of [left,right]){const base=level.platforms.find(o=>!o.motion&&x>=o.x&&x<=o.x+o.width)?.y??p.y-4;frame.add(new T.CylinderGeometry(.12,.16,top-base+.4,8),'#7a5838',[x,(top+base)/2,-1.35]);}frame.add(new T.BoxGeometry(right-left+.6,.3,.3),'#86603e',[(left+right)/2,top+.15,-1.35]);frame.mesh(features,vertexMaterial(.85),'suspension-frame');return{id:p.id,hanger:createHangers(root,{x:p.x+p.width/2,top,bottom:p.y-.1,spread:p.width*.8,color:'#3f3f3f',kind:'cable'})};});
  const foreground=new T.Group();foreground.name='south-africa-low-foreground';root.add(foreground);
  for(const [x,y] of [[-6,-5.2],[60,-6.8],[120,-5.4]] as const)if(x<finish+10){createScenicTerrace(foreground,{x,y,z:5,width:8,depth:4.5,thickness:7,preset:savanna,seed:8400+x,quality:'low'});plantGrove(foreground,'golden-tuft',[{x:x-2,y,z:4.4,scale:2},{x:x+2,y,z:5.4,scale:2.2}],{low});}
  batchStatic(staticRoot);batchStatic(foreground);
  const groundY=(x:number,z:number)=>-10+plainHeight(.5+(x-finish/2)/(finish+260),.5+(z+70)/140);
  const herds=[createHerd(root,'giraffe',{count:low?2:3,x:finish*.32,y:x=>groundY(x,-44),z:-44,spread:4,scale:1.25,range:7,speed:.4,seed:1}),createHerd(root,'elephant',{count:low?2:3,x:finish*.62,y:x=>groundY(x,-38),z:-38,spread:4.5,scale:1.1,range:6,speed:.3,seed:4}),createHerd(root,'zebra',{count:low?3:6,x:finish*.15,y:x=>groundY(x,-34),z:-34,spread:2,scale:1.05,range:8,speed:.6,seed:7}),createHerd(root,'antelope',{count:low?3:7,x:finish*.85,y:x=>groundY(x,-36),z:-36,spread:1.6,scale:1.05,range:9,speed:.7,seed:9})];
  const birds=createFlock(root,{count:low?4:8,centre:[finish*.5,17,-40],radius:[finish*.4,3,10],speed:.035,size:1.4,color:'#2e2a26',seed:31,glide:true,name:'soaring-raptors'});
  const dust=createDrift(root,{kind:'dust',count:low?20:56,colors:['#f2dcae'],x:[-8,finish+10],y:[-2,8],z:[-10,3],fall:-.06,sway:1.2,size:.06,seed:15,name:'warm-dust-motes'});dust.setVisible(!reduced);
  let disposed=false;
  return{root,
   update(time,_dt,signals){if(disposed)return;const motion=reduced?0:time;river.update(motion);for(const h of herds)h.update(motion);birds.update(motion);dust.update(motion);
    for(const {id,hanger} of hanging){const p=signals.platforms.find(item=>item.id===id);if(p)hanger.root.position.x=p.x+p.width/2;}},
   frame(cameraX){sky.follow(cameraX);},
   setReducedMotion(value){reduced=value;dust.setVisible(!value);},
   setView(view){const fog=scene.fog;if(fog instanceof T.Fog){fog.near=view==='overview'?150:70;fog.far=view==='overview'?420:270;}foreground.visible=view!=='overview';},
   finalize:(target,onReady)=>loadSurfaceMaps(target,low,onReady),
   dispose(){if(disposed)return;disposed=true;disposeTree(root);scene.background=oldBackground;scene.fog=oldFog;}};
 },
 dressPlatform(root,definition,context){
  const low=context.low;
  if(definition.type==='bridge'){dressDeck(root,definition,'timber',deck,{below:8});return;}
  if(definition.motion){dressDeck(root,definition,'suspended',deck);return;}
  dressTerrain(root,definition,savanna,{quality:low?'low':'standard',lush:definition.id==='za-start'||definition.id==='za-finish'});
  const w=definition.width,acacias:Placement[]=[],tufts:Placement[]=[];
  if(definition.id==='za-start')acacias.push({x:-w/2+2.4,y:0,z:-1.6,scale:.48});
  if(definition.id==='za-kopje')tufts.push({x:-1,y:0,z:-1.1,scale:1.2},{x:1.3,y:0,z:-1.15,scale:1});
  if(definition.id==='za-finish')acacias.push({x:w/2-2.2,y:0,z:-1.6,scale:.48});
  if(w>=5)tufts.push({x:-w/2+1,y:0,z:-1.3,scale:1.3},{x:w/2-1,y:0,z:-1.25,scale:1.1});
  if(acacias.length)plantGrove(root,'acacia',acacias,{low});if(tufts.length)plantGrove(root,'golden-tuft',tufts,{low});
 },
 createEnemy:createThornBush,
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'wood',color:'#b28553',trim:'#d6a447',glyph:'#ffe08a'}),
 decorateCheckpoint(marker){const banner=createBannerPost(marker,{pole:'#6e4f33',cloth:'#d6a447',accent:'#4f7a3a',height:2.1});banner.position.set(-.45,0,-.2);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'timber',width:3.4,height:3.4,stone:'#86603e',trim:'#6e4f33'});arch.position.set(0,0,-1.55);},
};
