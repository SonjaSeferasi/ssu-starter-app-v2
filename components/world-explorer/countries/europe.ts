import * as T from 'three';
import {europePlaces,type EuropeCode,type EuropePlace} from '../../../lib/world-explorer/europe';
import {Builder,random,vertexMaterial,v3,type Placement} from '../kit/common';
import {createHeightfield,ridgedRange,mountainColor,rollingHills} from '../kit/landform';
import {createWaterSurface} from '../kit/water';
import {plantGrove,type TreeKind} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {dressLandmass,localSurface,rearSpots,type LandmassPalette} from '../kit/landmass';
import {dressDeck,type DeckPalette} from '../kit/bridges';
import {createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {mountShell,built,roundCreature} from './south-america/shell';
import {europeLandmarks,townRow} from './europe-landmarks';
import type {CountryEnvironment} from './types';

/** One environment builder for the European adventures. A country's look
 * comes from its place data: terrain behind the route, water, vegetation,
 * town style, palette and its own landmark composition. Routes are never
 * changed here; scenery is decorative and has no colliders. */
const groveKind:Record<string,TreeKind>={conifer:'conifer',deciduous:'plane',olive:'olive',cypress:'cypress',birch:'birch',reed:'reed',vineyard:'shrub',pasture:'tuft',garden:'flowering-shrub'};
const skyFor={temperate:{zenith:'#6f9fca',horizon:'#e2e9ee'},alpine:{zenith:'#5f97cc',horizon:'#e4ecf2'},coastal:{zenith:'#4f97d2',horizon:'#e6eef2'},forest:{zenith:'#6e9cc2',horizon:'#e0e8ea'},grassland:{zenith:'#6aa2d2',horizon:'#eaeee6'}};

export function europeEnvironment(code:EuropeCode):CountryEnvironment{
 const place:EuropePlace=europePlaces[code],p=place.palette,s=place.scene,id='europe-'+place.iso2.toLowerCase();
 const cave=s.terrain==='karst',rift=s.terrain==='rift';
 const land:LandmassPalette={top:p.ground,topAlt:new T.Color(p.ground).multiplyScalar(.9).getStyle(),edge:p.ground,face:p.rock,faceDark:new T.Color(p.rock).multiplyScalar(.72).getStyle(),band:new T.Color(p.rock).multiplyScalar(.82).getStyle(),rough:.2,strata:.55,
  maps:{set:cave||rift?'alpine-rock':s.terrain==='mountains'?'alpine-rock':place.biome==='coastal'?'coastal-rock':s.terrain==='rock'||s.terrain==='cliffs'?'limestone':'mossy-rock',tint:'#ece6da',repeat:.5}};
 const masonry:LandmassPalette={...land,top:p.stone,topAlt:new T.Color(p.stone).multiplyScalar(.92).getStyle(),edge:p.stone,face:p.stone,faceDark:new T.Color(p.stone).multiplyScalar(.7).getStyle(),band:new T.Color(p.stone).multiplyScalar(.85).getStyle(),strata:.3,maps:{set:'ashlar',tint:'#f2ece0',repeat:.6}};
 const roofs:LandmassPalette={...masonry,top:p.roof,topAlt:new T.Color(p.roof).multiplyScalar(.9).getStyle(),edge:p.roof,maps:undefined};
 const deck:DeckPalette={wood:'#8c6d4c',woodAlt:'#a8865e',rope:'#cbb98e',stone:p.stone,stoneAlt:new T.Color(p.stone).multiplyScalar(.88).getStyle(),metal:'#5f6f74',accent:p.accent};
 const background=cave?'#1f2326':new T.Color(skyFor[place.biome].horizon).getStyle();
 return{id,info:{title:place.title,license:'Original procedural geometry; CC0 surface maps listed in materials/LICENSES.md.',landmarkSource:place.source,representation:`Stylized, compressed study of ${place.landmark}. The interactive route and its mechanisms are fictional; the real site is scenery only.`,assets:[...place.features,s.landmark]},
  lighting:{background,exposure:cave?1.25:1.08,sun:cave?'#cfd8de':'#fff1d6',sunIntensity:cave?1.4:2.7,sky:cave?'#7c8890':'#e7eef2',ground:land.faceDark,hemisphere:cave?1.6:1.25,rim:'#f2e3c8',rimIntensity:.45,pixelRatio:1.25,reflections:{zenith:skyFor[place.biome].zenith,horizon:skyFor[place.biome].horizon,ground:land.faceDark,intensity:.3}},
  mechanisms:{stone:p.stone,stoneDark:land.faceDark,trim:p.accent,glow:'#f4cf78',metal:'#5f6f74'},hazardPalette:{column:'#d8e6ec',base:p.rock,warning:'#ffcd76'},ropeColor:'#cbb98e',
  mount(context){
   const {finish,low}=context,r=random(9100+code.charCodeAt(0)*37+code.charCodeAt(1)*11+code.charCodeAt(2));
   const shell=mountShell(context,{id,name:s.landmark+'-environment',background,fog:[cave?'#2a2f33':skyFor[place.biome].horizon,cave?40:80,cave?140:300],sky:{zenith:cave?'#2b3236':skyFor[place.biome].zenith,horizon:cave?'#3d4549':skyFor[place.biome].horizon,glow:'#fff1d6',sun:[-.6,.6,-.8],glowPower:30},clouds:cave?false:{groups:8,high:[26,48],lowBand:[-17,-14],opacity:.5},layers:[s.landmark,'country-landmark','regional-landforms','foreground','sky']});
   const {staticRoot,features}=shell;
   // Water first: it sets how low the scenery ground sits.
   const wet=s.water,groundY=wet?-3.2:-5;
   if(wet){const tone={sea:['#5fa4bf','#2e6f8f'],bay:['#5fa8b8','#2f708a'],lake:['#6aa9b8','#3a7690'],river:['#7aa9a6','#4a7f86'],canal:['#7da2a0','#4f7a7c'],delta:['#8fae98','#5b8a7c'],lagoon:['#79b4ae','#3f8a8a'],polder:['#86aa9c','#5a8580']}[wet];
    const surface=createWaterSurface(features,{name:place.scene.landmark+'-'+wet,x:finish/2,y:-2.4,z:wet==='river'||wet==='canal'?-9:30,width:finish+260,depth:wet==='river'||wet==='canal'?14:170,segments:low?16:32,shallow:tone[0],deep:tone[1],flow:[.012,.002]});shell.animate({update:t=>surface.update(t)});}
   // Ground under and well in front of the route, so no view (the full-level
   // overview included) looks into a void; on water sites it lies just under the water surface.
   createHeightfield(features,{name:s.landmark+'-route-ground',x:finish/2,y:wet?-3.1:groundY,z:25,width:finish+260,depth:110,segments:[low?30:60,low?6:10],height:(u,v)=>Math.sin(u*40+v*7)*.15,color:()=>new T.Color(cave?'#3a3936':p.ground)});
   // Landform behind the route.
   const height=s.terrain==='mountains'?ridgedRange(4100+code.charCodeAt(1),{peaks:7,height:38,sharpness:1.3}):s.terrain==='hills'||s.terrain==='cliffs'||s.terrain==='rock'?rollingHills(3300+code.charCodeAt(0),9,2.6):s.terrain==='rift'?(u:number,v:number)=>Math.abs(Math.sin(u*9))*1.5+v*3:(u:number,v:number)=>(1-v)*.6+Math.sin(u*14)*.3;
   const ground=createHeightfield(features,{name:s.landmark+'-ground',x:finish/2,y:groundY-(s.terrain==='mountains'?6:0),z:wet&&wet!=='river'&&wet!=='canal'?-70:-52,width:finish+170,depth:s.terrain==='mountains'?70:80,segments:[low?40:80,low?16:30],height,color:s.terrain==='mountains'?mountainColor({snowLine:place.biome==='alpine'?30:100,treeLine:place.biome==='alpine'?20:100,rock:p.rock,forest:p.foliage,snow:'#eef3f5',grass:p.ground}):()=>new T.Color(p.ground)});ground.updateMatrixWorld(true);
   if(place.biome==='alpine'&&s.terrain!=='mountains'&&!cave)createHeightfield(features,{name:s.landmark+'-alpine-backdrop',x:finish/2,y:-12,z:-140,width:finish+260,depth:60,segments:[low?40:90,low?14:28],height:ridgedRange(5500+code.charCodeAt(2),{peaks:9,height:44,sharpness:1.5}),color:mountainColor({snowLine:30,treeLine:18,rock:'#8b8a86',forest:p.foliage,snow:'#eef3f5'})});
   // Town, landmark and vegetation.
   const b=new Builder(),ctx={x:finish*.62,y:groundY,z:-10,finish,r,low,palette:p};
   if(s.town)townRow(b,ctx,-24,finish*.36,-30,s.town);
   europeLandmarks[s.landmark]?.(b,ctx);
   b.mesh(staticRoot,vertexMaterial(.88),s.landmark+'-landmark');
   if(!cave){const spots:Placement[]=[];for(let i=0;i<(low?20:40);i++){const x=-20+r()*(finish+40),z=-14-r()*44,hit=new T.Raycaster(v3(x,60,z),v3(0,-1,0)).intersectObject(ground)[0];if(hit&&hit.point.y>groundY-1)spots.push({x,y:hit.point.y-.03,z,scale:.7+r()*.6,rotation:r()*6});}
    const grove=plantGrove(staticRoot,groveKind[s.vegetation]??'plane',spots,{low,name:s.landmark+'-vegetation'});grove.userData.groundSurface=ground.name;}
   if(s.water==='delta'||s.water==='lake'||s.water==='sea'||s.water==='bay'){const birds=createFlock(features,{name:'europe-water-birds',count:low?4:8,centre:[finish*.5,14,-40],radius:[24,3,8],speed:.18,size:1,color:'#f2f2ee',wing:'#d8d8d2',seed:code.charCodeAt(0),glide:true});shell.animate({update:t=>birds.update(t),motion:true});}
   return shell.finish();
  },
  dressPlatform(root,definition,context){
   const {low}=context,w=definition.width,surface=localSurface(definition),t=definition.terrain;
   if(definition.type==='wooden-bridge'||definition.type==='wooden-moving'||definition.motion||t==='bridge'||t==='water-raft'||t==='mechanical'){dressDeck(root,definition,t==='mechanical'||definition.motion==='vertical'?'masonry-lift':t==='water-raft'?'raft':definition.motion?'timber':t==='bridge'?(place.biome==='coastal'||s.water==='delta'?'boardwalk':'slab'):'timber',deck);return;}
   // Roofs are the tops of buildings: a house body runs from the cap down to
   // the scenery ground, with windows and a cornice.
   if(t==='rooftop'&&definition.route!=='upper'){
    const details=dressLandmass(root,definition,roofs,{low,kind:'block',profile:'wall'});
    const down=definition.y+6,d=Math.max(2,definition.depth);
    built(details,'europe-house-body',bb=>{bb.add(new T.BoxGeometry(w-.1,down,d-.2),p.stone,[0,-down/2-.4,-.1]);bb.add(new T.BoxGeometry(w+.1,.25,d),new T.Color(p.stone).multiplyScalar(.82).getStyle(),[0,-.5,0]);
     for(let k=0;k<Math.max(1,Math.floor(w/1.7));k++)for(let row=0;row*2.3<down-1.6;row++)bb.add(new T.BoxGeometry(.5,.8,.06),'#3d4248',[-w/2+.9+k*1.7,-1.6-row*2.3,d/2-.17]);},definition.id.length);
    return;
   }
   const urban=t==='rooftop'||t==='arch'||t==='stairs'||t==='terrace';
   const palette=t==='rooftop'?roofs:urban?masonry:land;
   const details=dressLandmass(root,definition,palette,{low,kind:definition.steps?'stairs':t==='ice-shelf'?'ice':t==='climb-wall'||t==='cliff'?'cliff':urban?'block':'ground',profile:definition.climbable?'wall':definition.route==='upper'||definition.collapse?'island':t==='cliff'||t==='rock'?'shelf':'mass',visualDepth:Math.min(definition.thickness,urban?3.2:4.5)});
   if(w>6&&!urban&&definition.route!=='upper'&&!definition.climbable&&!cave){const spots=rearSpots(definition,Math.floor(w/5),definition.id.length*73).map(sp=>({x:sp.x,y:surface(sp.x),z:Math.min(-1.3,sp.z),scale:.36,rotation:sp.r*6}));plantGrove(details,s.vegetation==='reed'?'reed':'tuft',spots,{low,name:place.scene.landmark+'-route-plants'});}
   if(t==='rooftop'&&w>3)built(details,'europe-roof-chimneys',bb=>{bb.add(new T.BoxGeometry(.5,.9,.5),p.stone,[w/2-.9,surface(w/2-.9)+.45,-1.2]);},definition.id.length);
  },
  createEnemy:parent=>roundCreature(parent,{name:'fictional-'+s.landmark+'-patroller',height:1,shell:p.accent,belly:'#efe6d2',foot:'#5d544a',crest:()=>{}}),
  createDiscoveryBlock:(parent,w,h)=>createDiscoveryCrate(parent,w,h,{body:'stone',color:p.stone,trim:p.accent,glyph:'#f6ead0'}),
  decorateCheckpoint(marker){createBannerPost(marker,{pole:'#7a6a55',cloth:p.accent,accent:'#f0e2bd',height:1.6}).position.z=-.8;},
  decorateFinish(gate){built(gate,'europe-discovery-finish',bb=>bb.add(new T.BoxGeometry(1.8,.3,.1),p.accent,[0,3.2,0]));},
 };
}
