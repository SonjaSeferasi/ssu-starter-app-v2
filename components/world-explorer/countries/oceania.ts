import {isMelanesiaCode} from '../../../lib/world-explorer/melanesia';
import {melanesiaEnvironment} from './melanesia';
import * as T from 'three';
import {oceaniaPlaces,type OceaniaCode,type OceaniaPlace} from '../../../lib/world-explorer/oceania';
import {Builder,random,vertexMaterial,v3,type Placement} from '../kit/common';
import {createHeightfield,ridgedRange,mountainColor,rollingHills} from '../kit/landform';
import {createWaterSurface} from '../kit/water';
import {plantGrove,type TreeKind} from '../kit/vegetation';
import {createFlock} from '../kit/wildlife';
import {dressLandmass,localSurface,rearSpots,type LandmassPalette} from '../kit/landmass';
import {dressDeck,type DeckPalette} from '../kit/bridges';
import {createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {mountShell,built,roundCreature} from './south-america/shell';
import {oceaniaLandmarks} from './oceania-landmarks';
import type {CountryEnvironment} from './types';

/** One environment builder for the Oceania adventures, like the European one:
 * a country's look comes from its place data (island or mountain backdrop,
 * lagoon or sea, vegetation, palette and its landmark composition). Routes
 * are never changed here; scenery is decorative and has no colliders. */
const groveKind:Record<string,TreeKind>={coconut:'coconut-palm',pandanus:'coconut-palm',rainforest:'kapok',mangrove:'understory',beech:'plane',garden:'flowering-shrub',scrub:'shrub'};
const skyFor={coastal:{zenith:'#3f92d6',horizon:'#e2eff4'},forest:{zenith:'#5f98c4',horizon:'#e2eae8'},alpine:{zenith:'#5a94cc',horizon:'#e6eef4'},tropical:{zenith:'#3f92d6',horizon:'#e2eff4'},grassland:{zenith:'#5f9ed2',horizon:'#eaeee6'},temperate:{zenith:'#6f9fca',horizon:'#e2e9ee'},desert:{zenith:'#5f9ed6',horizon:'#f0ece0'}};
const waterTone={lagoon:['#5fd0cc','#1f8ca8'],sea:['#4fb0d0','#1f6a98'],lake:['#6ab0b0','#2f7a86'],swamp:['#7a9a70','#4a6a58'],fiord:['#4a8aa0','#1f4a62'],pool:['#4fc8c0','#1f7a8a']};

export function oceaniaEnvironment(code:OceaniaCode):CountryEnvironment{
 if(isMelanesiaCode(code))return melanesiaEnvironment(code);
 const place:OceaniaPlace=oceaniaPlaces[code],p=place.palette,s=place.scene,id='oceania-'+place.iso2.toLowerCase(),sky=skyFor[place.biome];
 const land:LandmassPalette={top:p.ground,topAlt:new T.Color(p.ground).multiplyScalar(.9).getStyle(),edge:p.ground,face:p.rock,faceDark:new T.Color(p.rock).multiplyScalar(.72).getStyle(),band:new T.Color(p.rock).multiplyScalar(.82).getStyle(),rough:.2,strata:.45,
  maps:{set:s.terrain==='mountains'?'alpine-rock':s.terrain==='volcanic'||s.terrain==='highlands'?'mossy-rock':'coastal-rock',tint:'#ece6da',repeat:.5}};
 const masonry:LandmassPalette={...land,top:p.stone,topAlt:new T.Color(p.stone).multiplyScalar(.92).getStyle(),edge:p.stone,face:p.stone,faceDark:new T.Color(p.stone).multiplyScalar(.7).getStyle(),band:new T.Color(p.stone).multiplyScalar(.85).getStyle(),strata:.3,maps:{set:s.terrain==='volcanic'?'gneiss':'limestone',tint:'#f2ece0',repeat:.6}};
 const roofs:LandmassPalette={...masonry,top:p.roof,topAlt:new T.Color(p.roof).multiplyScalar(.9).getStyle(),edge:p.roof,maps:undefined};
 const deck:DeckPalette={wood:'#8c6d4c',woodAlt:'#a8865e',rope:'#cbb98e',stone:p.stone,stoneAlt:new T.Color(p.stone).multiplyScalar(.88).getStyle(),metal:'#5f6f74',accent:p.accent};
 const background=new T.Color(sky.horizon).getStyle();
 return{id,info:{title:place.title,license:'Original procedural geometry; CC0 surface maps listed in materials/LICENSES.md.',landmarkSource:place.source,representation:`Stylized, compressed study of ${place.landmark}. The interactive route and its mechanisms are fictional; the real place is scenery only.`,assets:[...place.features,s.landmark]},
  lighting:{background,exposure:1.1,sun:'#fff3dc',sunIntensity:2.8,sky:'#e9f2f4',ground:land.faceDark,hemisphere:1.3,rim:'#f2e6cc',rimIntensity:.45,pixelRatio:1.25,reflections:{zenith:sky.zenith,horizon:sky.horizon,ground:land.faceDark,intensity:.32}},
  mechanisms:{stone:p.stone,stoneDark:land.faceDark,trim:p.accent,glow:'#f4cf78',metal:'#5f6f74'},hazardPalette:{column:'#d8eef2',base:p.rock,warning:'#ffcd76'},ropeColor:'#cbb98e',
  mount(context){
   const {finish,low}=context,r=random(7300+code.charCodeAt(0)*37+code.charCodeAt(1)*11+code.charCodeAt(2));
   const shell=mountShell(context,{id,name:s.landmark+'-environment',background,fog:[sky.horizon,90,320],sky:{zenith:sky.zenith,horizon:sky.horizon,glow:'#fff3dc',sun:[-.6,.6,-.8],glowPower:30},clouds:{groups:8,high:[26,48],lowBand:[-17,-14],opacity:.5},layers:[s.landmark,'country-landmark','regional-landforms','foreground','sky']});
   const {staticRoot,features}=shell;
   // Water everywhere but the mountain and highland sites, where it is a strip in the valley.
   const inland=s.terrain==='mountains'||s.terrain==='highlands',groundY=-3.2,tone=waterTone[s.water];
   // On island sites the water runs well in front of the camera, so no view (the overview included) reaches its edge.
   const surface=createWaterSurface(features,{name:s.landmark+'-'+s.water,x:finish/2,y:-2.4,z:inland?-9:50,width:finish+260,depth:inland?14:220,segments:low?16:32,shallow:tone[0],deep:tone[1],flow:[.01,.002]});shell.animate({update:t=>surface.update(t)});
   // A low shore behind the water for the landmark, the town and the trees to stand on.
   const shore=inland?null:createHeightfield(features,{name:s.landmark+'-shore',x:finish/2,y:-2.55,z:-46,width:finish+170,depth:40,segments:[low?30:60,low?6:12],height:(u,v)=>Math.min(1,v*6)*(.55+Math.sin(u*31+code.charCodeAt(0))*.15),color:()=>new T.Color(s.terrain==='atoll'||s.terrain==='reef'?'#e2d6aa':p.ground)});shore?.updateMatrixWorld(true);
   // Ground just under the water surface in front of and under the route, so no view looks into a void.
   createHeightfield(features,{name:s.landmark+'-route-ground',x:finish/2,y:-3.1,z:inland?-8:-4,width:finish+170,depth:inland?40:24,segments:[low?30:60,low?6:10],height:(u,v)=>Math.sin(u*40+v*7)*.15,color:()=>new T.Color(s.terrain==='atoll'||s.terrain==='reef'?'#d8cca0':p.ground)});
   // Landform behind: snowy ranges, volcanic or highland hills, or a far low island line.
   const height=s.terrain==='mountains'?ridgedRange(6100+code.charCodeAt(1),{peaks:7,height:40,sharpness:1.4}):s.terrain==='volcanic'||s.terrain==='highlands'||s.terrain==='town'?rollingHills(3700+code.charCodeAt(0),8,3.2):(u:number,v:number)=>Math.max(0,Math.sin(u*9+code.charCodeAt(2))*.8)*(1-v);
   const ground=createHeightfield(features,{name:s.landmark+'-ground',x:finish/2,y:groundY-(s.terrain==='mountains'?6:0),z:inland?-52:-90,width:finish+190,depth:s.terrain==='mountains'?70:60,segments:[low?40:80,low?16:30],height,color:s.terrain==='mountains'?mountainColor({snowLine:18,treeLine:10,rock:p.rock,forest:p.foliage,snow:'#eef3f5',grass:p.ground}):()=>new T.Color(p.foliage)});ground.updateMatrixWorld(true);
   // Landmark and town.
   const b=new Builder(),ctx={x:finish*.62,y:inland?groundY:-2.4,z:-10,finish,r,low,palette:p};
   oceaniaLandmarks[s.landmark]?.(b,ctx);
   b.mesh(staticRoot,vertexMaterial(.88),s.landmark+'-landmark');
   // Vegetation along the shore strip and on the backdrop.
   const standOn=shore??ground,spots:Placement[]=[];for(let i=0;i<(low?18:36);i++){const x=-20+r()*(finish+40),z=inland?-14-r()*40:-32-r()*24,hit=new T.Raycaster(v3(x,60,z),v3(0,-1,0)).intersectObject(standOn)[0];// Trees stay below the snow on mountain sites; the large rainforest trees are planted smaller.
    if(hit&&hit.point.y>(inland?groundY-1:-2.4)&&hit.point.y<groundY+7)spots.push({x,y:hit.point.y-.03,z,scale:(groveKind[s.vegetation]==='kapok'?.4:.7)+r()*.5,rotation:r()*6});}
   const grove=plantGrove(staticRoot,groveKind[s.vegetation]??'coconut-palm',spots,{low,name:s.landmark+'-vegetation'});grove.userData.groundSurface=standOn.name;
   if(!inland){const birds=createFlock(features,{name:'oceania-seabirds',count:low?4:8,centre:[finish*.5,14,-40],radius:[24,3,8],speed:.18,size:1,color:'#f4f4f0',wing:'#2e3236',seed:code.charCodeAt(0),glide:true});shell.animate({update:t=>birds.update(t),motion:true});}
   return shell.finish();
  },
  dressPlatform(root,definition,context){
   const {low}=context,w=definition.width,surface=localSurface(definition),t=definition.terrain;
   if(definition.type==='wooden-bridge'||definition.type==='wooden-moving'||definition.motion||t==='bridge'||t==='water-raft'||t==='mechanical'){dressDeck(root,definition,t==='mechanical'||definition.motion==='vertical'?'masonry-lift':t==='water-raft'?'raft':definition.motion?'timber':'boardwalk',deck);return;}
   // Roofs are the tops of buildings: a house body runs down to the scenery ground.
   if(t==='rooftop'&&definition.route!=='upper'){
    const details=dressLandmass(root,definition,roofs,{low,kind:'block',profile:'wall'});
    const down=definition.y+4,d=Math.max(2,definition.depth);
    built(details,'oceania-house-body',bb=>{bb.add(new T.BoxGeometry(w-.1,down,d-.2),p.stone,[0,-down/2-.4,-.1]);for(let k=0;k<Math.max(1,Math.floor(w/1.7));k++)bb.add(new T.BoxGeometry(.5,.8,.06),'#3d4248',[-w/2+.9+k*1.7,-1.6,d/2-.17]);},definition.id.length);
    return;
   }
   const urban=t==='rooftop'||t==='arch'||t==='stairs'||t==='terrace';
   const palette=t==='rooftop'?roofs:urban?masonry:t==='sand'?{...land,top:'#e8dcb0',topAlt:'#dcd0a2',edge:'#e2d6a8',maps:undefined}:land;
   const details=dressLandmass(root,definition,palette,{low,kind:definition.steps?'stairs':t==='ice-shelf'?'ice':t==='climb-wall'||t==='cliff'?'cliff':urban?'block':'ground',profile:definition.climbable?'wall':definition.route==='upper'||definition.collapse?'island':t==='cliff'||t==='rock'?'shelf':'mass',visualDepth:Math.min(definition.thickness,urban?3.2:4.5)});
   if(w>6&&!urban&&definition.route!=='upper'&&!definition.climbable&&t!=='ice-shelf'){const spots=rearSpots(definition,Math.floor(w/5),definition.id.length*73).map(sp=>({x:sp.x,y:surface(sp.x),z:Math.min(-1.3,sp.z),scale:.36,rotation:sp.r*6}));plantGrove(details,s.vegetation==='mangrove'?'reed':'tuft',spots,{low,name:s.landmark+'-route-plants'});}
  },
  createEnemy:parent=>roundCreature(parent,{name:'fictional-'+s.landmark+'-crab',height:.9,shell:p.accent,belly:'#efe6d2',foot:'#5d544a',crest:()=>{}}),
  createDiscoveryBlock:(parent,w,h)=>createDiscoveryCrate(parent,w,h,{body:'wood',color:'#8c6d4c',trim:p.accent,glyph:'#f6ead0'}),
  decorateCheckpoint(marker){createBannerPost(marker,{pole:'#7a6a55',cloth:p.accent,accent:'#f0e2bd',height:1.6}).position.z=-.8;},
  decorateFinish(gate){built(gate,'oceania-discovery-finish',bb=>bb.add(new T.BoxGeometry(1.8,.3,.1),p.accent,[0,3.2,0]));},
 };
}
