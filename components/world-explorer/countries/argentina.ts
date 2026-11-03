import * as T from 'three';
import {Builder,matte,random,scatter,standard,valueNoise,vertexMaterial,type Placement} from '../kit/common';
import {createHeightfield,mountainColor,ridgedRange} from '../kit/landform';
import {createWaterSurface} from '../kit/water';
import {plantGrove} from '../kit/vegetation';
import {createDrift} from '../kit/particles';
import {createFlock} from '../kit/wildlife';
import {windBanners} from '../kit/wind';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {dressLandmass,rearSpots,type LandmassPalette} from '../kit/landmass';
import type {CountryEnvironment} from './types';
import {built,mountShell,roundCreature} from './south-america/shell';
import {createEscarpment,routeHeight} from './south-america/terrain';

/** Argentina — Los Glaciares: Perito Moreno Valley. A fictional route inspired
 * by the Perito Moreno Glacier on Lago Argentino: grey moraine banks running
 * down into milky turquoise meltwater, the glacier's fractured blue-white
 * front rising from the lake, lenga beech forest turning red and gold, and
 * the granite needles of the Fitz Roy massif on the horizon. */
const info={
 id:'argentina-los-glaciares',title:'Los Glaciares: Perito Moreno Valley',
 license:'Original procedural geometry; CC0 Poly Haven alpine rock surface maps (see materials/LICENSES.md).',
 representation:'A fictional valley course inspired by the Perito Moreno Glacier and Lago Argentino. The glacier front, floes and the Fitz Roy skyline are stylized; distances are compressed.',
 landmarkSource:'https://whc.unesco.org/en/list/145/',
 assets:['perito-moreno-glacier-front','lago-argentino-water','fitz-roy-skyline','fitz-roy-needles','glacier-surface','brash-ice','ice-floes','lenga-beech-forest','calafate-shrubs','coiron-grass','moraine-boulders','andean-condors','katabatic-banners','snow-flurries'],
};
const moraine:LandmassPalette={top:'#8a8670',topAlt:'#7a8a5a',edge:'#a59f8a',face:'#a19c92',faceDark:'#6b675f',band:'#8c877d',maps:{set:'alpine-rock',tint:'#f0ece4',repeat:.5},rough:.26,strata:.8};
const granite:LandmassPalette={...moraine,top:'#9a958a',topAlt:'#8a857a',face:'#8f8b86',rough:.34};
const meadow:LandmassPalette={...moraine,top:'#7a8a4a',topAlt:'#9a8a4a',edge:'#a8a07a'};
const blueIce:LandmassPalette={top:'#eef7fb',topAlt:'#dcedf5',edge:'#ffffff',face:'#a9d6ea',faceDark:'#6aaed0',band:'#cfe9f4',rough:.2,strata:.45};
const LAKE=-.75;

/** A lenga beech (Nothofagus pumilio) in autumn: a short twisted trunk and a
 * layered crown in red, orange, gold or late green. Each palette is one template. */
function lengaGeometry(palette:string[],seed:number){
 const b=new Builder(),r=random(seed);
 b.add(new T.CylinderGeometry(.12,.22,2.2,7),'#4a3a30',[0,1.1,0],[0,0,(r()-.5)*.15]);
 for(let i=0;i<3;i++){const a=i*2.1+r(),end=[Math.cos(a)*.7,2+r()*.6,Math.sin(a)*.5] as const;b.strut(new T.Vector3(0,1.6,0),new T.Vector3(...end),.05,'#4a3a30');}
 for(let i=0;i<9;i++){const a=r()*Math.PI*2,rad=r()*1.1;b.add(new T.IcosahedronGeometry(.55+r()*.3,0),palette[i%palette.length],[Math.cos(a)*rad,2.1+r()*1.3,Math.sin(a)*rad*.8],[0,r()*3,0],[1.3,.75,1.1],.1);}
 return b.geometry();
}
/** Snow lying on the upper part of a faceted rock cone of the given radius and
 * height (centred on its own origin, as ConeGeometry is). The cap repeats the
 * rock's facets just proud of them, and its lower edge is ragged: each ridge
 * line carries the snow a different distance down, sliding along the cone's
 * surface, so it reads as snow on the peak rather than a disc around it. */
function snowCap(radius:number,height:number,share:number,seed:number){
 const r=random(seed),capHeight=height*share,apex=height/2,geometry=new T.ConeGeometry(radius*share*1.05,capHeight,5,4,true);
 geometry.translate(0,apex-capHeight/2,0);
 const p=geometry.getAttribute('position'),reach=new Map<string,number>();
 for(let i=0;i<p.count;i++){
  const y=p.getY(i);if(y>apex-1e-4)continue;
  const length=Math.hypot(p.getX(i),p.getZ(i)),ridge=`${Math.round(p.getX(i)/length*100)},${Math.round(p.getZ(i)/length*100)}`;
  if(!reach.has(ridge))reach.set(ridge,r());
  const t=(apex-y)/capHeight,lowered=y-t*t*reach.get(ridge)!*capHeight*.8,k=(apex-lowered)/(apex-y);
  p.setXYZ(i,p.getX(i)*k,lowered,p.getZ(i)*k);
 }
 geometry.computeVertexNormals();return geometry;
}

/** The Fitz Roy massif: steep granite needles with snow on summits and shoulders. */
function fitzRoy(parent:T.Object3D,x:number,z:number,low:boolean){
 const b=new Builder(),r=random(3405);
 const needles:[number,number,number][]=[[0,58,7],[-11,44,5],[-19,38,4.5],[9,46,5],[16,40,4.6],[24,34,4.2],[-27,30,4]];
 for(const [dx,h,w] of needles){const lean=(r()-.5)*.06,baseTurn=r()*3,shift=(r()-.5)*1.5,towerTurn=r()*3,seed=Math.floor(r()*1e6);
  // A broad granite base and a slimmer upper tower, each with snow on its
  // upper slopes, sharing the rock's placement so the snow sits on the facets.
  const base:[number,number,number]=[x+dx,h*.27-4,z],tower:[number,number,number]=[x+dx+shift,h/2-4,z+.5];
  b.add(new T.ConeGeometry(w*1.5,h*.55,5,1),'#4f4b4c',base,[0,baseTurn,lean],[1,1,.75],.1);
  b.add(snowCap(w*1.5,h*.55,.5,seed),'#e8edf2',base,[0,baseTurn,lean],[1,1,.75],.04);
  b.add(new T.ConeGeometry(w*.8,h,5,1),'#5f5a5a',tower,[0,towerTurn,lean],[1,1,.8],.08);
  b.add(snowCap(w*.8,h,.18,seed+1),'#f2f5f8',tower,[0,towerTurn,lean],[1,1,.8],.03);}
 const mesh=b.mesh(parent,vertexMaterial(.9,{fog:true}),'fitz-roy-needles');mesh.castShadow=false;return mesh;
}

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#a9c6dd',exposure:.98,sun:'#fff3e2',sunIntensity:2.9,sky:'#e6f0f8',ground:'#56604c',hemisphere:1.35,rim:'#d6ecff',rimIntensity:.55,pixelRatio:1.25,reflections:{zenith:'#5d8fbf',horizon:'#e2ecf2',ground:'#4f5a4a',intensity:.4}},
 hazardPalette:{column:'#d8eef7',base:'#6f8fa3',warning:'#ffd04a',debris:'#bfe3f3'},
 mount(context){
  const {finish,low,level}=context,shell=mountShell(context,{id:info.id,name:'argentina-patagonia-environment',background:'#a9c6dd',fog:['#cfdde8',70,260],overviewFog:[200,520],sky:{zenith:'#3f77b4',horizon:'#e6eef4',band:'#c9dbe9',glow:'#fff6e8',sun:[-.4,.45,-.8],glowPower:18},clouds:{opacity:.9,high:[20,32],depth:[-95,-170],groups:20,shade:'#b9c8d6'},layers:['playable-moraine-and-floes','perito-moreno-glacier-front','lago-argentino','lenga-forest-slopes','fitz-roy-skyline','sky']});
  const {root,staticRoot,features}=shell,r=random(205),height=routeHeight(level);
  // Lago Argentino: milky turquoise glacial water with brash ice near the front.
  const lake=createWaterSurface(features,{x:finish/2,y:LAKE,z:-6,width:finish+260,depth:90,shallow:'#9ad8d8',deep:'#5aaab8',roughness:.12,segments:44,name:'lago-argentino-water',flow:[.006,.002],repeat:.06});
  const ice=level.platforms.find(p=>p.id==='ar-ice-walk')!,front0=ice.x-14,front1=ice.x+ice.width+26;
  // The glacier front: a jagged, fluted wall of blue-white ice rising from the
  // lake behind the ice walk, with the glacier surface climbing away behind it.
  const glacier=new T.Group();glacier.name='perito-moreno-glacier-front';features.add(glacier);
  const spikes=(x:number)=>14+valueNoise(x*.35,1,11)*5+Math.max(0,Math.sin(x*1.7+valueNoise(x*.2,2,3)*5))*3;
  createEscarpment(glacier,{name:'glacier-ice-cliff',x0:front0,x1:front1,rim:spikes,floor:LAKE-.4,z:-11,colors:{rock:'#7fc0de',light:'#e8f4fa',streak:'#4f9ccb',moss:'#ffffff',scree:'#d6eef8',stain:'#3f86b3'},seed:145,low,flute:1.6,recede:-1.5});
  // The glacier's surface stays below the cliff's broken rim (from the lake you
  // see the front, not the top) and is double-sided, so no part seen from
  // below breaks into stray facets.
  const surface=createHeightfield(glacier,{name:'glacier-surface',x:(front0+front1)/2,y:7,z:-44,width:front1-front0-4,depth:56,segments:[low?40:90,low?14:30],height:(u,v)=>v*7+valueNoise(u*40,v*30,7)*2+Math.abs(Math.sin(u*60+valueNoise(u*6,v*6,2)*4))*1,color:(h,s)=>new T.Color(s>.45?'#a8d8ee':'#f2f8fb').lerp(new T.Color('#d0eaf6'),valueNoise(h,s*5,2)*.5)});
  (surface.material as T.Material).side=T.DoubleSide;
  const brash:Placement[]=[];for(let i=0;i<(low?14:40);i++)brash.push({x:front0-6+r()*(front1-front0+12),y:LAKE-.05,z:-9+r()*8,scale:[.3+r()*.8,.2+r()*.3,.3+r()*.6],rotation:[r(),r()*3,r()]});
  for(let i=0;i<(low?6:16);i++)brash.push({x:30+r()*60,y:LAKE-.2,z:-16-r()*24,scale:[1+r()*2.4,.6+r()*1.2,1+r()*1.8],rotation:[0,r()*3,0]});
  scatter(staticRoot,new T.DodecahedronGeometry(1,0),standard('#d2eef8',.25,{emissive:'#7fc8e8',emissiveIntensity:.08}),brash,'brash-ice');
  // Far shores: lenga slopes, then the Fitz Roy skyline.
  createHeightfield(features,{name:'lenga-forest-slopes',x:finish/2,y:-1.5,z:-90,width:finish+320,depth:50,segments:[low?50:110,12],height:(u,v)=>(1-v)*11+valueNoise(u*24,v*8,4)*3*(1-v),color:(h,_s,u,v)=>new T.Color(h>9?'#8a857a':valueNoise(u*22,v*6,6)>.62?'#9a5a3a':valueNoise(u*16,v*5,8)>.6?'#a8843f':'#55704a').multiplyScalar(.9+valueNoise(h,2,3)*.12)});
  createHeightfield(features,{name:'fitz-roy-skyline',x:finish/2,y:-2,z:-175,width:finish+520,depth:50,segments:[low?70:150,low?16:28],height:ridgedRange(77,{peaks:9,height:34,sharpness:2.2,width:.55}),color:mountainColor({snowLine:20,rock:'#6f6a66',forest:'#3f5a3a',snow:'#f6f8fa',treeLine:8,grass:'#7d8a5a'})});
  fitzRoy(features,finish*.62,-150,low);
  // Lenga beech in autumn on the banks behind the route, in four palettes.
  const forest=new T.Group();forest.name='lenga-beech-forest';features.add(forest);
  const palettes=[['#b8442a','#d0603a','#9a3a24'],['#d88a2a','#e8a83a','#c9702a'],['#c9a23a','#e0c050','#b08a2a'],['#5a7a3a','#6f8a3f','#c98a2f']];
  const stands:Placement[][]=palettes.map(()=>[]);
  for(let i=0;i<(low?30:80);i++){const x=-14+r()*(finish+28);if(x>front0-4&&x<front1+2)continue;stands[i%4].push({x,y:Math.max(LAKE,height(x)-.6)-.2,z:-4.5-r()*14,scale:.8+r()*.5,rotation:r()*6});}
  stands.forEach((placements,i)=>scatter(forest,lengaGeometry(palettes[i],60+i),vertexMaterial(.85),placements,`lenga-stand-${i}`));
  const zone=level.zones?.[0],step=level.platforms.find(p=>p.id==='ar-ice-step-1')!;
  const banners=windBanners(root,[[step.x-1.4,.4,-1.7],[step.x+12,3,-1.6]],['#75aadb','#f6b40e']);
  const condors=createFlock(root,{count:low?2:4,centre:[finish*.5,20,-34],radius:[finish*.35,3,10],speed:.03,size:2.2,color:'#26221f',wing:'#f2efe8',seed:5,glide:true,name:'andean-condors'});
  const snow=createDrift(root,{kind:'snow',count:low?20:60,colors:['#ffffff'],x:[60,finish+10],y:[-1,9],z:[-8,3],fall:.6,sway:1.6,size:.06,seed:3,name:'snow-flurries'});
  shell.animate({update:(t,signals)=>{lake.update(t);condors.update(t);const wind=signals?.wind.find(w=>w.id===zone?.id);banners.update(t,wind?.phase==='gust'?wind.strength:0,wind?.phase==='warning');}});
  shell.animate({update:t=>snow.update(t),setVisible:v=>snow.setVisible(v),motion:true});
  return shell.finish();
 },
 dressPlatform(root,definition,context){
  const low=context.low,w=definition.width,style=definition.style,seed=definition.id.length*17+Math.round(definition.x);
  if(style==='ice-floe'){
   // A floe: a white slab floating on the lake, with blue ice showing below the waterline.
   const details=dressLandmass(root,definition,blueIce,{low,kind:'ice',profile:'island',visualDepth:.7});
   built(details,'floe-underwater',b=>{b.add(new T.CylinderGeometry(w*.55,w*.35,1.2,9),'#7cc2e0',[0,-.9,0],[0,0,0],[1,1,.8],.1);},seed,.3);return;
  }
  // Moraine banks and boulders widen down into the lake; the ice walk and
  // seracs are blocks of glacier ice; the ridge slabs are granite.
  const icy=definition.terrain==='ice-shelf',slab=style==='ridge-slab',depthToLake=definition.y+(definition.slope||0)*.5-LAKE+.6;
  const palette=icy?blueIce:style==='erratic'||slab?granite:style==='lenga-meadow'?meadow:moraine;
  const details=dressLandmass(root,definition,palette,{low,kind:icy?'ice':definition.terrain==='rock'?'cliff':'ground',profile:slab?'island':'mass',visualDepth:slab?.9:Math.max(1,Math.min(definition.thickness,depthToLake))});
  if(icy)built(details,'crevasse-lines',(b,rr)=>{const d=Math.max(2,definition.depth)/2;for(let i=0;i<Math.max(2,Math.round(w/1.4));i++)b.add(new T.BoxGeometry(.05,1.2+rr()*1.4,.04),'#4f9ccb',[-w/2+.4+rr()*(w-.8),-.8-rr()*.6,d+.02]);for(let i=0;i<3;i++)b.add(new T.BoxGeometry(.04,.012,1+rr()*.8),'#8cc4e0',[-w/2+.4+rr()*(w-.8),.008,(rr()-.5)*1.2],[0,rr()*2,0]);},seed,.2);
  else{
   const spots=rearSpots(definition,Math.max(1,Math.floor(w/2.6)),seed);
   plantGrove(details,'golden-tuft',spots.filter((_,i)=>i%2===0).map(s=>({x:s.x,y:s.y,z:Math.min(-1.1,s.z),scale:.7+s.r*.4})),{low,name:'coiron-grass'});
   built(details,'calafate-shrubs',(b,rr)=>{for(const s of spots.filter((_,i)=>i%2===1)){for(let k=0;k<4;k++)b.add(new T.IcosahedronGeometry(.28+rr()*.12,0),k%2?'#3f5a32':'#4f6a3a',[s.x+(rr()-.5)*.5,s.y+.25+rr()*.15,Math.min(-1.2,s.z)+(rr()-.5)*.3],[0,rr()*3,0],[1.2,.8,1]);for(let k=0;k<5;k++)b.add(new T.SphereGeometry(.05,6,4),'#3a2a5a',[s.x+(rr()-.5)*.7,s.y+.4+rr()*.2,Math.min(-1.2,s.z)+.2]);}},seed,.85);
  }
  if(style==='lake-shore')built(details,'shore-cairn',b=>{for(let i=0;i<4;i++)b.add(new T.DodecahedronGeometry(.3-i*.05,0),'#8c877d',[w/2-1.2,.25+i*.4,-1.6]);},seed);
 },
 createEnemy:parent=>roundCreature(parent,{name:'argentina-moraine-mite',height:.8,shell:'#7f7a70',belly:'#c9d6dc',foot:'#3d3a35',crest:(_rig,b)=>{for(const s of [-1,1]){const tuft=new T.Mesh(new T.ConeGeometry(.09,.32,6),matte('#e6eef2'));tuft.position.set(s*.12,.74,0);tuft.rotation.z=-s*.4;b.add(tuft);}}}),
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'wood',color:'#9b7a55',trim:'#75aadb',glyph:'#f6b40e'}),
 decorateCheckpoint(marker){const banner=createBannerPost(marker,{pole:'#5d4a38',cloth:'#75aadb',accent:'#f6b40e',height:2.1});banner.position.set(-.45,0,-.2);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'timber',width:3.4,height:3.2,stone:'#6f5034',trim:'#75aadb'});arch.position.set(0,0,-1.55);},
};
