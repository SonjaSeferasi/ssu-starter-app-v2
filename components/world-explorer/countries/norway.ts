import * as T from 'three';
import {Builder,batchStatic,disposeTree,ellipsoid,matte,random,vertexMaterial,type Placement} from '../kit/common';
import {createSkyDome,createCloudBanks} from '../kit/sky';
import {dressTerrain,createScenicTerrace,type TerrainPreset} from '../kit/terrain';
import {createHeightfield,mountainColor,ridgedRange} from '../kit/landform';
import {createWaterSurface,createWaterfall,createShoreFoam} from '../kit/water';
import {plantGrove} from '../kit/vegetation';
import {createDrift} from '../kit/particles';
import {createFlock} from '../kit/wildlife';
import {dressDeck,type DeckPalette} from '../kit/bridges';
import {cabin} from '../kit/architecture';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {createCreatureRig,finishCreature} from '../kit/creature';
import {loadSurfaceMaps,markSurface} from '../kit/surface-maps';
import {clearPlatformRoot,dressLandmass,type LandmassPalette} from '../kit/landmass';
import {windBanners} from '../kit/wind';
import type {CountryEnvironment} from './types';
import type {PlatformDefinition} from '../../../lib/world-explorer/game-types';

/** Norway — Northern Fjords. A fictional coastal course inspired by Lofoten:
 * steep glacier-carved peaks rising from the sea, red fishing cabins and wind. */
const info={
 id:'norway-lofoten-fjords',title:'Lofoten Cliffs: Ice and Wind',
 license:'Original procedural geometry; CC0 Poly Haven rock surface maps (see materials/LICENSES.md).',
 representation:'A fictional coastal platform course inspired by the Lofoten Islands. Peaks, cabins and the lighthouse are stylized and not placed as in any real village.',
 landmarkSource:'https://snl.no/Lofoten',
 assets:['steep-glacier-carved-peaks','dark-fjord-water','red-rorbu-cabins-on-stilts','wooden-piers','waterfalls','coastal-lighthouse','rope-swung-plank','wind-streaks','seabirds','light-fog'],
};
const coast:TerrainPreset={id:'lofoten-gneiss-ledge',shape:'rock',rock:{light:'#b4bcc2',dark:'#6b737a',crack:'#30363b',top:'#5d7f4c',topDepth:.1,strata:.6},cap:{kind:'grass',a:'#6d6553',b:'#5f8a4a',c:'#eef3f6',path:.2},rim:{kind:'tufts',color:'#5f8a4a',alt:'#7a9c5a',size:1},blades:{color:'#6f9a52',alt:'#8aad64',density:1.2,height:1},flowers:{colors:['#f2f0ff','#e9e15a','#c86bc4'],density:1},pebbles:'#8c949a',maps:{set:'gneiss',tint:'#ffffff',repeat:.7}};
const snowRock:TerrainPreset={id:'lofoten-snow-rock',shape:'rock',rock:{light:'#bcc4ca',dark:'#6f777e',crack:'#30363b',top:'#f2f6f9',topDepth:.16,strata:.6},cap:{kind:'snow',a:'#e8eff4',b:'#f6fafc',c:'#cbd9e4',path:.18},rim:{kind:'drift',color:'#f4f8fb',alt:'#e1eaf1',size:1},icicles:true,maps:{set:'gneiss',tint:'#f4f7f9',repeat:.7}};
/** Playable terrain: banded gneiss cliffs (snow-capped high up), a granite
 * stair path, glassy blue ice, a wet sea-cave rock and the harbour quay. */
const gneiss:LandmassPalette={top:'#6d7f5a',topAlt:'#8a9a72',edge:'#e4eaee',face:'#f1f4f6',faceDark:'#b9c1c8',band:'#d6dce1',maps:{set:'gneiss',tint:'#ffffff',repeat:.4},rough:.34,strata:.55};
const snowGneiss:LandmassPalette={...gneiss,top:'#eef4f8',topAlt:'#d8e4ee',edge:'#f6fafc'};
const stonePath:LandmassPalette={top:'#b9bfc3',topAlt:'#a2a9ae',edge:'#d9dfe2',face:'#e6eaed',faceDark:'#aab2b8',band:'#c9cfd3',maps:{set:'alpine-rock',tint:'#ffffff',repeat:.45},rough:.05,strata:.5};
const ice:LandmassPalette={top:'#e6f6ff',topAlt:'#bfe3f7',edge:'#ffffff',face:'#9fd2ee',faceDark:'#4f8fb8',band:'#7fbde0',rough:.06,strata:.4};
const caveRock:LandmassPalette={...gneiss,top:'#6f7d68',topAlt:'#5e6b5a',face:'#c3cad0',faceDark:'#868f97',band:'#a5adb3'};
const quay:LandmassPalette={top:'#8a6a50',topAlt:'#7a5c44',edge:'#9e7a5a',face:'#e6eaed',faceDark:'#aab2b8',band:'#c9cfd3',maps:{set:'gneiss',tint:'#ffffff',repeat:.4},rough:.08,strata:.7};
const deck:DeckPalette={wood:'#6f5440',woodAlt:'#82634b',rope:'#c2b08c',stone:'#8e969c',stoneAlt:'#7a8288',metal:'#4c5560',accent:'#c43b33'};

/** Original frost-lantern creature: a frosted shell glowing softly from within. */
function createFrostLantern(parent:T.Object3D){
 const glow=new T.MeshStandardMaterial({color:'#bfe8ff',emissive:'#7fd3ff',emissiveIntensity:.7,roughness:.25});
 const rig=createCreatureRig(parent,{name:'norway-frost-lantern-creature',height:.9,feet:[-.11,.11],footColor:'#3c4f66',footSize:[.065,.05,.085],stride:7,animate(rig,time,state){glow.emissiveIntensity=.55+Math.sin(time*3)*.2+(state==='ALERT'?.5:0);rig.extras.flakes.rotation.y=time*1.5;}});
 const shell=new T.MeshStandardMaterial({color:'#9fc9e8',roughness:.2,metalness:.1,transparent:true,opacity:.82}),cap=matte('#5a7894'),white=new T.MeshStandardMaterial({color:'#ffffff',emissive:'#d6f4ff',emissiveIntensity:.8}),pupil=matte('#1d2a38');
 const core=ellipsoid(rig.body,glow,0,.42,0,.17,.2,.17,14);core.name='lantern-core';
 ellipsoid(rig.body,shell,0,.42,0,.29,.32,.27,18);
 const top=new T.Mesh(new T.ConeGeometry(.24,.2,10),cap);top.position.y=.78;rig.head.add(top);const ring=new T.Mesh(new T.TorusGeometry(.06,.015,6,12),cap);ring.position.y=.92;rig.head.add(ring);
 for(const side of [-1,1]){ellipsoid(rig.head,white,side*.09,.5,.25,.06,.07,.035,12);ellipsoid(rig.head,pupil,side*.09,.49,.28,.028,.035,.015,10);}
 const flakes=new T.Group();flakes.position.y=.45;rig.figure.add(flakes);rig.extras.flakes=flakes;
 for(let i=0;i<6;i++){const f=new T.Mesh(new T.OctahedronGeometry(.03,0),white);f.position.set(Math.cos(i)*.42,Math.sin(i*2)*.15,Math.sin(i)*.42);flakes.add(f);}
 finishCreature(rig);return rig;
}
function lighthouse(b:Builder,x:number,y:number,z:number,height:number,girth=1){
 b.add(new T.CylinderGeometry(.9*girth,1.25*girth,height,16),'#f4f1ea',[x,y+height/2,z],[0,0,0],[1,1,1],.03);
 for(const h of [.3,.62])b.add(new T.CylinderGeometry((1.25-(h+.08)*.35)*girth*1.02,(1.25-(h-.06)*.35)*girth*1.02,height*.12,16),'#c43b33',[x,y+height*h,z]);
 b.add(new T.CylinderGeometry(1.15*girth,1.15*girth,.18,16),'#3a3f44',[x,y+height,z]);
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2;b.add(new T.BoxGeometry(.05,.6,.05),'#3a3f44',[x+Math.cos(a)*girth,y+height+.4,z+Math.sin(a)*girth]);}
 b.add(new T.ConeGeometry(.95*girth,.7,16),'#c43b33',[x,y+height+1.05,z]);
}

/** Fjord sea level for the whole scene; the level's water hazard sits just below it. */
const seaY=-.45;
/** A red rorbu cabin whose snowy roof ridge is the walkway; walls run down to the water. */
function rorbuRoof(root:T.Group,definition:PlatformDefinition){
 clearPlatformRoot(root);
 const w=definition.width,h=definition.y-seaY,depth=3.2,eave=.9,b=new Builder(.5),run=depth/2+.25,pitch=Math.atan2(eave,run),slab=Math.hypot(eave,run);
 b.add(new T.BoxGeometry(w-.3,h-eave,depth),'#b93a30',[0,(-h-eave)/2,0],[0,0,0],[1,1,1],.03);
 for(const side of [-1,1])b.add(new T.BoxGeometry(w+.5,.16,slab),'#3b3a38',[0,-eave/2-.04,side*run/2],[side*pitch,0,0]);
 b.add(new T.BoxGeometry(w+.5,.12,1.12),'#eef3f6',[0,-.06,0]);for(const side of [-1,1])b.add(new T.BoxGeometry(w+.5,.08,.5),'#f6fafc',[0,-.25,side*.75],[side*pitch,0,0]);
 for(const x of [-w/2+.15,w/2-.15])b.add(new T.BoxGeometry(.12,h-eave,.12),'#f1ece4',[x,(-h-eave)/2,depth/2+.02]);
 for(const x of [-w/4,w/4]){b.add(new T.BoxGeometry(.7,.8,.06),'#f1ece4',[x,-eave-1,depth/2+.03]);b.add(new T.BoxGeometry(.56,.66,.07),'#2c3d4a',[x,-eave-1,depth/2+.04]);}
 b.add(new T.BoxGeometry(.8,1.4,.06),'#f1ece4',[w/2-.9,-h+.7,depth/2+.03]);
 const cap=b.mesh(root,vertexMaterial(.8),'country-platform-cap');cap.receiveShadow=true;root.userData.surface='rooftop';
}

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#8fb4d8',exposure:1.0,sun:'#ffd9b4',sunIntensity:2.8,sky:'#dbe8f6',ground:'#3f4f55',hemisphere:1.35,rim:'#c9dcff',rimIntensity:.7,pixelRatio:1.25,reflections:{zenith:'#5a83c2',horizon:'#f0cdb5',ground:'#2c3d4a',intensity:.5}},
 mechanisms:{stone:'#8e969c',stoneDark:'#5f676e',trim:'#c43b33',glow:'#9fdcff',metal:'#4c5560'},
 mount(context){
  const {scene,finish,low,level}=context;let reduced=context.reducedMotion;
  const root=new T.Group();root.name='norway-lofoten-environment';root.userData={environmentId:info.id,decorative:true,layers:['playable-cliffs','fjord-sea','sea-cave','fishing-village-shore','steep-peaks','sky']};scene.add(root);
  const oldBackground=scene.background,oldFog=scene.fog;scene.background=new T.Color('#8fb4d8');scene.fog=new T.Fog('#b9c9d8',55,240);
  const sky=createSkyDome(root,{zenith:'#4d77b8',horizon:'#f2d0bb',band:'#f4c7a8',glow:'#ffc890',sun:[.6,.18,-.75],glowPower:14});
  createCloudBanks(root,{finish,low,seed:47,groups:16,opacity:.8,shade:'#c6cfdd',color:'#fbefe8',high:[30,44],lowBand:[14,20],flat:.7});
  const staticRoot=new T.Group();staticRoot.name='norway-static-scenery';root.add(staticRoot);
  const features=new T.Group();features.name='landmarks-and-landforms';root.add(features);
  // Steep, glacier-carved peaks rise directly from the fjord in two ranks.
  createHeightfield(features,{name:'lofoten-far-peaks',x:finish/2,y:seaY-2.5,z:-150,width:finish+320,depth:80,segments:[low?70:150,low?28:56],height:ridgedRange(71,{peaks:22,height:60,sharpness:1.05,edge:.05,width:.5}),color:mountainColor({snowLine:44,treeLine:9,rock:'#5d6872',forest:'#3f5a48',snow:'#eef3f8'})});
  createHeightfield(features,{name:'lofoten-near-peaks',x:finish/2+10,y:seaY-1.5,z:-95,width:finish+240,depth:50,segments:[low?60:130,low?20:40],height:ridgedRange(13,{peaks:15,height:42,sharpness:1.1,edge:.06,width:.55}),color:mountainColor({snowLine:33,treeLine:10,rock:'#636e78',forest:'#46624d',snow:'#f2f6fa'})});
  const sea=createWaterSurface(features,{x:finish/2,y:seaY,z:-40,width:finish+300,depth:110,shallow:'#3f7894',deep:'#1d3f5e',segments:44,name:'dark-blue-fjord-water',repeat:.06,flow:[.008,.014]});
  const sites=[{x:-10,y:4,z:-16,w:14,t:12},{x:24,y:7,z:-22,w:14,t:15},{x:50,y:10,z:-30,w:15,t:18},{x:76,y:9,z:-20,w:13,t:16},{x:100,y:3,z:-24,w:15,t:12},{x:126,y:2,z:-16,w:15,t:10}].filter(site=>site.x<finish+24);
  for(const [i,site] of sites.entries())createScenicTerrace(staticRoot,{x:site.x,y:site.y,z:site.z,width:site.w,depth:8,thickness:site.t,preset:site.y>5?snowRock:coast,seed:9100+i,quality:low?'low':'standard'});
  // The sea cave under the ice crossing: a dark vault behind the cave ledges.
  const caveLedges=level.platforms.filter(p=>p.terrain==='cave');
  if(caveLedges.length){const left=Math.min(...caveLedges.map(p=>p.x))-1,right=Math.max(...caveLedges.map(p=>p.x+p.width))+3,vault=new Builder(.4);
   vault.add(new T.BoxGeometry(right-left,5.6,1.2),'#9aa4ad',[(left+right)/2,seaY+2.8,-3],[0,0,0],[1,1,1],.08);
   for(let i=0;i<Math.ceil((right-left)/1.1);i++){const len=.5+((i*37)%7)/7*1.1;vault.add(new T.ConeGeometry(.16,len,5),'#4a5560',[left+.5+i*1.1,seaY+5.2-len/2,-2.2],[Math.PI,0,0]);}
   const material=vertexMaterial(.95);markSurface(material,'gneiss','#7f8a94',.5);vault.mesh(features,material,'sea-cave-vault');}
  // Red rorbu cabins on stilts along the far shore, with piers and small boats.
  const village=new Builder(),r=random(3);
  for(const [x,z,rot] of [[16,-24.5,.1],[21.5,-25,-.05],[68,-22.5,.08],[74,-23,-.1],[120,-20.5,.05],[126,-21,-.08],[132,-12,.04]] as const)if(x<finish+24)cabin(village,[x,seaY,z],[3,2.2,2.6],{wall:'#b93a30',roof:'#3b3a38',trim:'#f1ece4'},{stilts:1.4,rotation:rot});
  for(const [x,z,length] of [[18,-21,6],[70,-19.5,6],[122,-17.5,6]] as const)if(x<finish+24){for(let i=0;i<length*2;i++)village.add(new T.BoxGeometry(1.6,.1,.5),i%2?'#6f5440':'#82634b',[x,seaY+1.4,z+i*.5]);for(let i=0;i<=length;i+=2)for(const dx of [-.7,.7])village.add(new T.CylinderGeometry(.07,.08,2,6),'#4f3d30',[x+dx,seaY+.5,z+i]);}
  for(const [x,z] of [[26,-17],[78,-15],[104,-6]] as const)if(x<finish+24){village.add(new T.SphereGeometry(1,10,6),'#f1ece4',[x,seaY+.1,z],[0,.4,0],[1.8,.4,.6]);village.add(new T.BoxGeometry(.8,.5,.6),'#c43b33',[x,seaY+.6,z]);}
  village.mesh(features,vertexMaterial(.85),'red-rorbu-fishing-village');
  const waterfalls=[[50,10,-25.8,2],[100,3,-19.8,2.4]].filter(([x])=>x<finish+20).map(([x,top,z,width],i)=>createWaterfall(root,{x,top,z,width,height:top-seaY,seed:800+i,low,tint:'#dde9f0',glow:'#4c6f8f'}));
  const foam=createShoreFoam(root,[...sites.map(site=>({x:site.x,y:seaY+.03,z:site.z+4,size:3})),...level.platforms.filter(p=>p.thickness>8&&p.y>seaY).map(p=>({x:p.x+p.width/2,y:seaY+.03,z:2.2,size:Math.min(3,p.width*.6)}))],low);
  const birch:Placement[]=[],conifers:Placement[]=[];for(const site of sites)for(let i=0;i<(low?1:2);i++)(site.y<5?birch:conifers).push({x:site.x+(r()-.5)*site.w*.6,y:site.y,z:site.z-1.6,scale:.7+r()*.3,rotation:r()*6});
  plantGrove(staticRoot,'birch',birch,{low,name:'coastal-birch'});plantGrove(staticRoot,'snow-conifer',conifers,{low,name:'snow-conifers'});
  const foreground=new T.Group();foreground.name='norway-low-foreground';root.add(foreground);
  batchStatic(staticRoot);
  const zone=level.zones?.[0],ledges=level.platforms.filter(p=>zone&&!p.motion&&p.x>=zone.x-1&&p.x+p.width<=zone.x+zone.width+1);
  const banners=zone?windBanners(root,ledges.map(p=>[p.x+p.width-.6,p.y+(p.slope||0),-1.5] as [number,number,number]),['#c43b33','#1f4f8f']):null;
  const streaks=zone?createDrift(root,{kind:'snow',count:low?50:140,colors:['#ffffff','#e8f4ff'],x:[zone.x-4,zone.x+zone.width+4],y:[zone.bottom,zone.bottom+7],z:[-1.6,1.8],fall:.08,sway:.2,size:.05,seed:5,name:'wind-blown-spray-and-snow'}):null;
  const birds=createFlock(root,{count:low?5:11,centre:[finish*.5,14,-28],radius:[finish*.4,3,10],speed:.06,size:1,color:'#f4f4f2',wing:'#d9dde2',seed:61,glide:true,name:'seagulls-and-kittiwakes'});
  const fog=createDrift(root,{kind:'mist',count:low?12:30,colors:['#e8eef4'],x:[-10,finish+10],y:[seaY,seaY+5],z:[-40,-10],fall:-.03,sway:2,size:3,seed:17,name:'low-sea-fog'});fog.setVisible(!reduced);
  let disposed=false,windTime=0;
  return{root,
   update(time,dt,signals){
    if(disposed)return;const motion=reduced?0:time;sea.update(motion);foam.update(motion);for(const w of waterfalls)w.update(motion);birds.update(motion);fog.update(motion);
    const wind=signals.wind[0],strength=wind?.strength??0,warning=wind?.phase==='warning';windTime+=reduced?0:dt;banners?.update(windTime,strength,warning);
    if(streaks){streaks.mesh.visible=!reduced&&(strength>0||warning);streaks.update(windTime,(wind?.force??0)*(strength*5+(warning?.5:0)));}
   },
   frame(cameraX){sky.follow(cameraX);},
   setReducedMotion(value){reduced=value;fog.setVisible(!value);},
   setView(view){const f=scene.fog;if(f instanceof T.Fog){f.near=view==='overview'?140:55;f.far=view==='overview'?400:240;}foreground.visible=view!=='overview';},
   finalize:(target,onReady)=>loadSurfaceMaps(target,low,onReady),
   dispose(){if(disposed)return;disposed=true;disposeTree(root);scene.background=oldBackground;scene.fog=oldFog;}};
 },
 dressPlatform(root,definition,context){
  const low=context.low,w=definition.width;
  if(definition.style==='pier'){dressDeck(root,definition,'dock',deck,{below:3});const props=new Builder();lighthouse(props,w/2-2.2,0,-1.3,6.5,.55);props.mesh(root,vertexMaterial(.8),'platform-coastal-props');return;}
  if(definition.type==='bridge'){dressDeck(root,definition,'timber',deck,{below:9});return;}
  if(definition.style==='crane-lift'){dressDeck(root,definition,'dock-lift',deck);return;}
  if(definition.motion){dressDeck(root,definition,'swing',deck);return;}
  if(!definition.terrain){dressTerrain(root,definition,definition.route==='upper'?snowRock:coast,{quality:low?'low':'standard',lush:definition.id==='no-start'});return;}
  if(definition.terrain==='rooftop'){rorbuRoof(root,definition);return;}
  const kind=definition.terrain==='cliff'||definition.terrain==='cave'?'cliff':definition.terrain==='stairs'?'stairs':definition.terrain==='ice-shelf'?'ice':'ground';
  const palette=definition.terrain==='ice-shelf'?ice:definition.terrain==='cave'?caveRock:definition.terrain==='stairs'?stonePath:definition.style==='quay'?quay:definition.y>=4?snowGneiss:gneiss;
  const details=dressLandmass(root,definition,palette,{low,kind}),props=new Builder();
  // Thin ice: icicles hang from the underside; thick shelves get a frozen lip.
  if(kind==='ice'&&definition.thickness<2)for(let i=0;i<Math.ceil(w*3);i++){const len=.2+((i*53)%9)/9*.7;props.add(new T.ConeGeometry(.06,len,5),'#cfeaff',[-w/2+.15+i*(w-.3)/Math.max(1,Math.ceil(w*3)-1),-definition.thickness-len/2,((i*29)%11)/11*2-1],[Math.PI,0,0]);}
  if(definition.id==='no-start'){cabin(props,[-w/2+9.5,0,-2.1],[2.6,1.9,1.1],{wall:'#b93a30',roof:'#3b3a38',trim:'#f1ece4'});for(let i=0;i<4;i++)props.add(new T.CylinderGeometry(.18,.2,.7,10),i%2?'#6f5440':'#82634b',[-w/2+13+i*.5,.35,-2.2]);props.add(new T.BoxGeometry(1,.45,.08),'#7a5c44',[-w/2+11.5,1,-1.7]);}
  if(definition.id==='no-summit')plantGrove(details,'snow-conifer',[{x:-w/2+1,y:0,z:-1.5,scale:.4},{x:w/2-1.2,y:0,z:-1.7,scale:.32}],{low});
  if(definition.id==='no-ledge-1'||definition.id==='no-shelf')plantGrove(details,'birch',[{x:w/2-.8,y:0,z:-1.5,scale:.35}],{low});
  if(props.parts.length)props.mesh(details,vertexMaterial(kind==='ice'?.2:.8),'platform-coastal-props');
 },
 createEnemy:createFrostLantern,
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'wood',color:'#8f6f52',trim:'#1f4f8f',glyph:'#ffe27a'}),
 decorateCheckpoint(marker){const banner=createBannerPost(marker,{pole:'#5a4535',cloth:'#1f4f8f',accent:'#f1ece4',height:2.1});banner.position.set(-.45,0,-.2);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'timber',width:3.4,height:3.4,stone:'#6f5440',trim:'#5a4535'});arch.position.set(0,0,-1.55);},
};
