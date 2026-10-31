import * as T from 'three';
import {Builder,batchStatic,disposeTree,ellipsoid,matte,random,vertexMaterial,type Placement} from '../kit/common';
import {createSkyDome,createCloudBanks} from '../kit/sky';
import {dressTerrain,createScenicTerrace,type TerrainPreset} from '../kit/terrain';
import {createHeightfield,mountainColor,ridgedRange,rollingHills,gradientColor} from '../kit/landform';
import {createWaterSurface,createWaterfall,createShoreFoam} from '../kit/water';
import {plantGrove} from '../kit/vegetation';
import {createDrift} from '../kit/particles';
import {createFlock} from '../kit/wildlife';
import {createHerd} from '../kit/animals';
import {dressDeck,type DeckPalette} from '../kit/bridges';
import {cabin} from '../kit/architecture';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {createCreatureRig,finishCreature} from '../kit/creature';
import {loadSurfaceMaps} from '../kit/surface-maps';
import type {CountryEnvironment} from './types';

/** Canada — Rocky Mountains: Alpine Adventure. A fictional alpine course inspired
 * by the Canadian Rockies near Banff; peaks and lake are stylized, not mapped. */
const info={
 id:'canada-rockies-alpine',title:'Rocky Mountains: Alpine Adventure',
 license:'Original procedural geometry; CC0 Poly Haven rock surface maps (see materials/LICENSES.md).',
 representation:'A fictional alpine platform course inspired by the Canadian Rockies. The ranges, glacier and turquoise lake are stylized; the route is not a map of the national parks.',
 landmarkSource:'https://whc.unesco.org/en/list/304/',
 assets:['snow-capped-ridged-ranges','hanging-glacier','turquoise-glacial-lake','spruce-forest','log-cabins','timber-gorge-bridge','ice-ledge','distant-elk','drifting-snow'],
};
const alpineGrass:TerrainPreset={id:'rockies-alpine-ledge',shape:'rock',rock:{light:'#a7aeb3',dark:'#5d666c',crack:'#30363b',top:'#5f7f4a',topDepth:.08,strata:.6},cap:{kind:'grass',a:'#7a6b52',b:'#6f9150',c:'#e9f1f4',path:.2},rim:{kind:'drift',color:'#f3f7fa',alt:'#dfe9ef',size:.9},blades:{color:'#7d9c56',alt:'#9bb26a',density:1,height:.9},flowers:{colors:['#f2f0ff','#8f7be0','#f4d24e'],density:.8},pebbles:'#9aa1a6',maps:{set:'alpine-rock',tint:'#eef2f5',repeat:.7}};
const snowRock:TerrainPreset={id:'rockies-snow-rock',shape:'rock',rock:{light:'#b4bcc2',dark:'#626b72',crack:'#2f353a',top:'#f4f8fb',topDepth:.18,strata:.5},cap:{kind:'snow',a:'#e9f0f5',b:'#f7fbfd',c:'#cfdde8',path:.18},rim:{kind:'drift',color:'#f6f9fb',alt:'#e3ecf2',size:1.1},icicles:true,pebbles:'#aab3b9',maps:{set:'alpine-rock',tint:'#f2f5f8',repeat:.7}};
const icePreset:TerrainPreset={...snowRock,id:'rockies-ice-ledge',cap:{kind:'snow',a:'#bfe3f2',b:'#e3f4fb',c:'#8fc8e2',path:.4}};
const deck:DeckPalette={wood:'#7d5a3c',woodAlt:'#8f6a48',rope:'#c4b28a',stone:'#a7aeb3',stoneAlt:'#8d959b',metal:'#4c5560',accent:'#c8452f'};

/** Original pinecone creature: overlapping scales, a needle tuft and big eyes. */
function createPinecone(parent:T.Object3D){
 const rig=createCreatureRig(parent,{name:'canada-pinecone-creature',height:.9,feet:[-.1,.1],footColor:'#4b3221',footSize:[.065,.05,.085],stride:8,animate(rig,time,state,moving){rig.extras.tuft.rotation.z=Math.sin(time*(moving?10:3))*.15;rig.body.rotation.y=(state==='IDLE'||state==='TURN')?Math.sin(time*2)*.3:0;}});
 const scaleA=matte('#7a4f2c',.8),scaleB=matte('#94643a',.8),core=matte('#5e3b20'),needle=matte('#2f6b3c'),white=matte('#fbf7ea'),pupil=matte('#1d1a18');
 ellipsoid(rig.body,core,0,.42,0,.22,.34,.22,14);
 for(let row=0;row<6;row++)for(let i=0;i<7;i++){const a=i/7*Math.PI*2+row*.45,y=.14+row*.1,r=.25*Math.sin((row+1)/7*Math.PI)+.06,scale=new T.Mesh(new T.SphereGeometry(1,7,5),row%2?scaleA:scaleB);scale.scale.set(.085,.05,.06);scale.position.set(Math.cos(a)*r,y,Math.sin(a)*r);scale.rotation.set(-.6,-a,0);rig.body.add(scale);}
 for(const side of [-1,1]){ellipsoid(rig.head,white,side*.09,.48,.2,.07,.085,.04,12);ellipsoid(rig.head,pupil,side*.09,.47,.235,.035,.045,.02,10);}
 const tuft=new T.Group();tuft.position.y=.8;rig.head.add(tuft);rig.extras.tuft=tuft;
 for(let i=0;i<7;i++){const n=new T.Mesh(new T.ConeGeometry(.02,.24,4),needle);n.position.y=.08;n.rotation.set(Math.cos(i)*.6,0,Math.sin(i*1.3)*.6);tuft.add(n);}
 finishCreature(rig);return rig;
}

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#8ec3ee',exposure:1.02,sun:'#fff6e8',sunIntensity:3.3,sky:'#eaf3ff',ground:'#5d6d58',hemisphere:1.35,rim:'#d8ecff',rimIntensity:.6,pixelRatio:1.25,reflections:{zenith:'#3d84d4',horizon:'#d9ebf6',ground:'#56645a',intensity:.4}},
 mount(context){
  const {scene,finish,low,level}=context;let reduced=context.reducedMotion;
  const root=new T.Group();root.name='canada-rockies-environment';root.userData={environmentId:info.id,decorative:true,layers:['foreground','playable-context','forested-shoreline','turquoise-lake','snow-capped-ranges','sky']};scene.add(root);
  const oldBackground=scene.background,oldFog=scene.fog;scene.background=new T.Color('#8ec3ee');scene.fog=new T.Fog('#d3e4ef',60,250);
  const sky=createSkyDome(root,{zenith:'#2f76cc',horizon:'#d8eaf6',glow:'#fffaf0',sun:[-.45,.55,-.7],glowPower:36});
  createCloudBanks(root,{finish,low,seed:91,groups:14,opacity:.85,high:[26,40],lowBand:[10,14]});
  const staticRoot=new T.Group();staticRoot.name='canada-static-scenery';root.add(staticRoot);
  // Landmarks, water and landforms stay unbatched: they keep their names and can follow the camera.
  const features=new T.Group();features.name='landmarks-and-landforms';root.add(features);
  // Snow-capped ranges: a high far range with glaciers and a forested middle range.
  createHeightfield(features,{name:'rockies-far-range',x:finish/2,y:-14,z:-190,width:finish+340,depth:120,segments:[low?70:150,low?30:60],height:ridgedRange(19,{peaks:14,height:66,sharpness:.95,width:.7}),color:mountainColor({snowLine:36,treeLine:14,rock:'#66707a',forest:'#2a4838',snow:'#f3f7fb'})});
  createHeightfield(features,{name:'rockies-near-range',x:finish/2+20,y:-12,z:-120,width:finish+260,depth:70,segments:[low?60:120,low?24:44],height:ridgedRange(43,{peaks:10,height:40,sharpness:1,width:.75}),color:mountainColor({snowLine:29,treeLine:15,rock:'#6f7983',forest:'#28483a',snow:'#f2f6fa'})});
  const lake=createWaterSurface(features,{x:finish/2,y:-10,z:-58,width:finish+260,depth:70,shallow:'#58c7cf',deep:'#1f8ea6',segments:30,name:'turquoise-glacial-lake',repeat:.07,flow:[.006,.01]});
  createHeightfield(features,{name:'rockies-forested-shore',x:finish/2,y:-11,z:-18,width:finish+240,depth:26,segments:[low?50:100,10],height:rollingHills(5,4,4),color:gradientColor([[0,'#3a5c3f'],[2,'#4a6b45'],[4,'#6e7a5c']])});
  const sites=[{x:-8,y:-1.2,z:-12,w:15,t:10},{x:20,y:2,z:-22,w:14,t:13},{x:46,y:3.4,z:-30,w:15,t:15},{x:72,y:1,z:-18,w:13,t:12},{x:98,y:3,z:-28,w:15,t:14},{x:124,y:1,z:-16,w:15,t:12},{x:6,y:6,z:-44,w:18,t:18},{x:86,y:6.4,z:-46,w:18,t:18}].filter(site=>site.x<finish+24);
  for(const [i,site] of sites.entries())createScenicTerrace(staticRoot,{x:site.x,y:site.y,z:site.z,width:site.w,depth:8,thickness:site.t,preset:site.y>2.5?snowRock:alpineGrass,seed:5100+i,quality:low?'low':'standard'});
  const waterfalls=[[46,3.4,-25.8,2.6],[98,3,-23.8,2.2]].filter(([x])=>x<finish+20).map(([x,top,z,width],i)=>createWaterfall(root,{x,top,z,width,height:top+10,seed:700+i,low,tint:'#e3f4f8',glow:'#5aa3b8'}));
  const foam=createShoreFoam(root,[[46,-25.2],[98,-23.2]].map(([x,z])=>({x,y:-9.97,z,size:2})),low);
  // Spruce forests: snow-dusted on high ledges, dark green along the shore.
  const r=random(17),spruce:Placement[]=[],snowy:Placement[]=[],birch:Placement[]=[];
  for(const site of sites)for(let i=0;i<(low?3:6);i++)(site.y>2.5?snowy:spruce).push({x:site.x+(r()-.5)*site.w*.85,y:site.y,z:site.z+(r()-.6)*5,scale:.75+r()*.5,rotation:r()*6});
  for(let i=0;i<(low?40:110);i++){const x=-40+r()*(finish+80),z=-10-r()*16;spruce.push({x,y:-11+rollingHills(5,4,4)(.5+(x-finish/2)/(finish+240),.5+(z+18)/26),z,scale:.9+r()*.6,rotation:r()*6});}
  for(let i=0;i<(low?6:14);i++)birch.push({x:-20+r()*(finish+40),y:-10.5,z:-24-r()*6,scale:1+r()*.4,rotation:r()*6});
  plantGrove(staticRoot,'conifer',spruce,{low,name:'spruce-forest'});plantGrove(staticRoot,'snow-conifer',snowy,{low,name:'snow-dusted-spruce'});plantGrove(staticRoot,'birch',birch,{low,name:'aspen-and-birch'});
  const cabins=new Builder();
  for(const [x,y,z,rot] of [[18,2,-24.5,.15],[70,1,-20,-.2],[122,1,-18,.1]] as const)if(x<finish+20)cabin(cabins,[x,y,z],[3.2,2,2.6],{wall:'#8a6040',roof:'#4a3a30',trim:'#6e4c33',snow:'#f4f8fb'},{logs:true,rotation:rot,chimney:true});
  cabins.mesh(features,vertexMaterial(.9),'log-cabins');
  const foreground=new T.Group();foreground.name='canada-low-foreground';root.add(foreground);
  for(const [x,y] of [[-6,-5.2],[62,-6.8],[118,-5.4]] as const)if(x<finish+10){createScenicTerrace(foreground,{x,y,z:5,width:8,depth:4.5,thickness:8,preset:snowRock,seed:5400+x,quality:'low'});plantGrove(foreground,'snow-conifer',[{x:x-2,y,z:4.4,scale:.8}],{low});}
  batchStatic(staticRoot);batchStatic(foreground);
  const elk=createHerd(root,'elk',{count:low?2:4,x:finish*.62,y:-10.2,z:-30,spread:2.8,scale:1.1,range:10,speed:.5,seed:2});
  const birds=createFlock(root,{count:low?4:8,centre:[finish*.5,20,-45],radius:[finish*.35,3,10],speed:.04,size:1.2,color:'#2e3438',seed:19,glide:true,name:'ravens-and-eagles'});
  const snow=createDrift(root,{kind:'snow',count:low?50:150,colors:['#ffffff','#eef6ff'],x:[-6,finish+8],y:[1.5,14],z:[-12,3],fall:.45,sway:.6,size:.06,seed:21,name:'light-drifting-snow'});snow.setVisible(!reduced);
  let disposed=false;
  return{root,
   update(time){if(disposed)return;const motion=reduced?0:time;lake.update(motion);foam.update(motion);for(const w of waterfalls)w.update(motion);elk.update(motion);birds.update(motion);snow.update(motion);},
   frame(cameraX){sky.follow(cameraX);},
   setReducedMotion(value){reduced=value;snow.setVisible(!value);},
   setView(view){const fog=scene.fog;if(fog instanceof T.Fog){fog.near=view==='overview'?150:60;fog.far=view==='overview'?420:250;}foreground.visible=view!=='overview';},
   finalize:(target,onReady)=>loadSurfaceMaps(target,low,onReady),
   dispose(){if(disposed)return;disposed=true;disposeTree(root);scene.background=oldBackground;scene.fog=oldFog;}};
 },
 dressPlatform(root,definition,context){
  const low=context.low;
  if(definition.type==='bridge'){dressDeck(root,definition,'timber',deck,{below:7});return;}
  if(definition.motion){dressDeck(root,definition,'masonry-lift',deck,{surface:{set:'alpine-rock',tint:'#e8edf0',repeat:.6}});return;}
  const preset=definition.surface==='ice'?icePreset:definition.route==='upper'||definition.id==='ca-snow-ledge'?snowRock:alpineGrass;
  dressTerrain(root,definition,preset,{quality:low?'low':'standard',lush:definition.id==='ca-start'});
  const cap=root.getObjectByName('country-platform-cap') as T.Mesh|undefined;
  // The frozen ledge reads as glossy ice so its reduced grip is never a surprise.
  if(definition.surface==='ice'&&cap){const m=cap.material as T.MeshStandardMaterial;m.roughness=.08;m.metalness=.12;m.color.set('#dff3fb');root.userData.surfaceHint='slippery-ice';const sheen=new T.Mesh(new T.PlaneGeometry(definition.width*.92,definition.depth*.62),new T.MeshStandardMaterial({color:'#bfe8f7',roughness:.04,metalness:.2,transparent:true,opacity:.45}));sheen.rotation.x=-Math.PI/2;sheen.position.y=.022;sheen.name='ice-sheen';root.add(sheen);}
  const w=definition.width,trees:Placement[]=[],snowy:Placement[]=[];
  if(definition.id==='ca-start'){trees.push({x:-w/2+1.4,y:0,z:-1.35,scale:.65},{x:-w/2+3.4,y:0,z:-1.4,scale:.5},{x:w/2-1.2,y:0,z:-1.3,scale:.45});const sign=new Builder();sign.add(new T.BoxGeometry(.1,1.2,.1),'#6b4a30',[1.4,.6,-1]);sign.add(new T.BoxGeometry(1.1,.5,.08),'#8a6a48',[1.4,1.1,-.98]);sign.add(new T.BoxGeometry(.9,.06,.09),'#f2efe6',[1.4,1.15,-.93]);sign.mesh(root,vertexMaterial(.9),'trailhead-sign');}
  if(definition.id==='ca-star-island')snowy.push({x:-w/2+.9,y:0,z:-1.1,scale:.42});
  if(definition.id==='ca-finish')trees.push({x:w/2-1.4,y:0,z:-1.4,scale:.6},{x:-w/2+1.2,y:0,z:-1.35,scale:.5});
  if(trees.length)plantGrove(root,'conifer',trees,{low});if(snowy.length)plantGrove(root,'snow-conifer',snowy,{low});
 },
 createEnemy:createPinecone,
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'wood',color:'#a8774a',trim:'#c8452f',glyph:'#ffe08a'}),
 decorateCheckpoint(marker){const banner=createBannerPost(marker,{pole:'#6b4a30',cloth:'#d9542f',accent:'#f4f1e6',height:2.1});banner.position.set(-.45,0,-.2);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'timber',width:3.4,height:3.4,stone:'#7d5a3c',trim:'#5e432c'});arch.position.set(0,0,-1.55);plantGrove(gate,'snow-conifer',[{x:-2.5,y:0,z:-1.5,scale:.55},{x:2.6,y:0,z:-1.4,scale:.5}]);},
};
