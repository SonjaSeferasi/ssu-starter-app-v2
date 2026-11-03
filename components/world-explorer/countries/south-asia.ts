import * as T from 'three';
import {southAsiaPlaces,type SouthAsiaCode} from '../../../lib/world-explorer/south-asia';
import {Builder,random,v3,vertexMaterial,fbm,type Placement} from '../kit/common';
import {irregularBasin,sculptRegionalBody} from './asia-enhancement-kit';
import {shoreIsland,erodedColumn,facadeCourses,foldedMassif} from './asia-landscape-art';
import {createHeightfield,ridgedRange,mountainColor} from '../kit/landform';
import {markSurface} from '../kit/surface-maps';
import {createWaterSurface} from '../kit/water';
import {plantGrove,type TreeKind} from '../kit/vegetation';
import {dressLandmass,localSurface,rearSpots,type LandmassPalette} from '../kit/landmass';
import {dressDeck,type DeckPalette} from '../kit/bridges';
import {arcadeBay,cabin} from '../kit/architecture';
import {createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {mountShell,built,roundCreature} from './south-america/shell';
import {environment as agraEnvironment} from './india';
import type {CountryEnvironment} from './types';

/** Original stylized scenery. Religious/heritage landmarks are separate from
 * the fictional colliders; the shared engine owns all gameplay mechanisms. */
const colors:Record<SouthAsiaCode,[string,string,string,string]>={
 AFG:['#d2c5a3','#a68d6e','#655f53','#4176a0'],BGD:['#738452','#806d4d','#4a5942','#42766a'],
 BTN:['#638048','#9b9484','#53685a','#9d452b'],IND:['#dbb694','#bc7d62','#796549','#bf6c4d'],
 IRN:['#d5b68a','#bb9673','#8f6f57','#5d9b99'],MDV:['#eee2bb','#d8cca7','#a69976','#53bac1'],
 NPL:['#e0e5de','#9eaaa9','#66737c','#62879c'],PAK:['#a6a088','#8d9189','#535f66','#5d9fb2'],
 LKA:['#8a9c59','#ab8b66','#6d7151','#507f6b'],
};
function terrainPalette(code:SouthAsiaCode):LandmassPalette{const [top,face,dark]=colors[code];return{top,topAlt:new T.Color(top).multiplyScalar(.85).getStyle(),face,faceDark:dark,edge:top,band:dark,maps:{set:code==='IRN'?'sandstone-blocks':code==='NPL'||code==='PAK'?'alpine-rock':code==='MDV'?'coastal-rock':code==='LKA'?'ashlar':'limestone',tint:code==='NPL'?'#f2f5f3':'#e7dfce',repeat:.5},rough:code==='IRN'?.07:.23,strata:code==='AFG'?.35:.8};}
const deck:DeckPalette={wood:'#877052',woodAlt:'#aa9064',rope:'#c9b98e',stone:'#bfb499',stoneAlt:'#9c9682',metal:'#56666b',accent:'#d3ad67'};
function mountainRange(parent:T.Object3D,name:string,x:number,z:number,width:number,height:number,seed:number,low:boolean,snow=false,forest=false){
 const heightAt=foldedMassif(seed,height,seed%3+7);
 return createHeightfield(parent,{name,x,y:-8,z,width,depth:45,segments:[low?50:100,low?18:36],height:heightAt,color:mountainColor({snowLine:snow?height*.55:100,treeLine:forest?height*.9:height*.12,rock:snow?'#9aa9b3':'#a3a18f',forest:forest?'#577353':'#7b8272',snow:'#edf3f3',grass:'#859076'})});
}
function windcatcher(b:Builder,x:number,y:number,z:number,h:number){
 b.add(new T.BoxGeometry(2,h,2),'#c5a17e',[x,y+h/2,z]);
 for(let side=0;side<4;side++){const a=side*Math.PI/2;for(let k=0;k<3;k++)b.add(new T.BoxGeometry(.25,h*.3,.04),'#66584c',[x+Math.cos(a)*(k-1)*.5+Math.sin(a)*1.02,y+h*.8,z+Math.cos(a)*1.02-Math.sin(a)*(k-1)*.5],[0,a,0]);}
 b.add(new T.BoxGeometry(2.25,.25,2.25),'#e1c49c',[x,y+h+.1,z]);
 for(const side of [-1,1])for(let k=0;k<4;k++){b.add(new T.BoxGeometry(1.5,.09,.24),'#9c7b5c',[x,y+h*.65+k*.42,z+side*1.04]);b.add(new T.BoxGeometry(.13,h*.4,.2),'#dfbd92',[x+side*.82,y+h*.77,z+1.04]);}
}
function bhutanHouse(b:Builder,x:number,y:number,z:number,s:number){
 b.add(new T.BoxGeometry(6*s,4*s,4*s),'#e7ddc4',[x,y+2*s,z]);
 for(const yy of [1,3.5,4])b.add(new T.BoxGeometry(6.2*s,.22*s,4.2*s),'#713c2c',[x,y+yy*s,z]);
 for(let i=-2;i<=2;i++)b.add(new T.BoxGeometry(.55*s,.8*s,.06),'#463a31',[x+i*s,y+2.7*s,z+2.03*s]);
 const roof=new T.ConeGeometry(4.3*s,1.5*s,4);b.add(roof,'#9c4c32',[x,y+4.8*s,z],[0,Math.PI/4,0],[1,1,.8]);
 for(let i=-3;i<=3;i++){b.add(new T.BoxGeometry(.13*s,.45*s,.3*s),'#e2b263',[x+i*.8*s,y+4.05*s,z+2.2*s]);b.add(new T.BoxGeometry(.12*s,.65*s,.08),'#a96b3f',[x+i*.65*s,y+2.7*s,z+2.08*s]);}
}

export function southAsiaEnvironment(code:SouthAsiaCode):CountryEnvironment{
 const place=southAsiaPlaces[code];
 // Retain the richer, already authored Agra landmark and garden assets.
 if(code==='IND')return{...agraEnvironment,id:'south-asia-in',info:{...agraEnvironment.info,title:place.title,landmarkSource:place.source}};
 const p=terrainPalette(code),wet=code==='BGD'||code==='MDV',mountain=['AFG','BTN','NPL','PAK'].includes(code);
 return{
 id:'south-asia-'+place.iso2.toLowerCase(),
 info:{title:place.title,license:'Original procedural geometry; CC0 surface maps documented in materials/LICENSES.md.',landmarkSource:place.source,representation:'A compressed, stylized study of '+place.landmark+'. All training paths and mechanisms are fictional; this is not a measured reconstruction or visitor route.',assets:[...place.features,place.theme,place.signature]},
 lighting:{background:code==='IRN'?'#e0c5a6':'#b9d8e2',exposure:1.04,sun:code==='IRN'?'#ffdbad':'#ffe7bd',sunIntensity:2.95,sky:'#e5eff1',ground:p.faceDark,hemisphere:1.02,rim:'#e9d6af',rimIntensity:.35,pixelRatio:1.25,reflections:{zenith:'#87b5ce',horizon:'#e0e6db',ground:p.faceDark,intensity:.3}},
 mechanisms:{stone:p.face,stoneDark:p.faceDark,trim:'#b29b6f',glow:'#fbd478',metal:'#53656b'},ropeColor:'#c9b98e',
 mount(context){
  const {finish,low}=context,r=random(9200+code.charCodeAt(0)),shell=mountShell(context,{id:'south-asia-'+place.iso2.toLowerCase(),name:place.theme+'-environment',background:code==='IRN'?'#e0c5a6':'#b9d8e2',fog:[code==='IRN'?'#dfc9ac':'#cfdee0',80,270],sky:{zenith:code==='IRN'?'#6b9bb1':'#539dcb',horizon:code==='IRN'?'#ecd8bc':'#d6e7ed',glow:'#fff1d6',sun:[-.5,.6,-.8],glowPower:30},clouds:{groups:code==='MDV'?8:12,high:[23,42],lowBand:[-13,-10],opacity:.65},layers:['playable-'+place.theme,place.landmark,'regional-landscape','foreground','sky']});
  const {features,staticRoot}=shell;
  const water=(name:string,x:number,y:number,z:number,width:number,depth:number,shallow:string,deep:string)=>{const w=createWaterSurface(features,{name,x,y,z,width,depth,shallow,deep,segments:low?18:36,flow:[.008,.003]});shell.animate({update:t=>w.update(t)});};
  if(mountain){mountainRange(features,place.theme+'-far-range',finish/2,-120,finish+210,code==='NPL'?63:code==='PAK'?58:code==='BTN'?43:35,code==='PAK'?963:921,low,code==='NPL'||code==='PAK',code==='BTN');mountainRange(features,place.theme+'-near-valley',finish/2,-67,finish+100,code==='BTN'?29:22,942,low,false,code==='BTN');}
  if(code==='AFG'){
   // Blue basins and pale mineral sills; no conflict imagery.
   for(let i=0;i<4;i++){const lake=irregularBasin(features,{name:'band-e-amir-travertine-lake-'+i,x:finish/2+(i%2?9:-8),y:-7+i*.5,z:-16-i*20,width:finish+75-i*8,depth:17,seed:772+i,low,rim:'#cabb9a',shallow:'#4cadd0',deep:'#245582',height:2.1});shell.animate({update:t=>lake.update(t)});}
  }else if(code==='BGD'){
   water('sundarbans-tidal-channels',finish/2,-3.3,-43,finish+150,95,'#849f7c','#496f66');
   built(staticRoot,'mangrove-mud-banks-and-roots',b=>{for(let i=0;i<9;i++){const x=-20+i*16,z=-11-(i%3)*12;shoreIsland(features,{name:'sundarbans-silt-bank-'+i,x,y:-2.8,z,width:17,depth:11,height:1.3,color:'#7a7651',seed:i+39});for(let k=0;k<7;k++){const xx=x+(k-3)*1.4;b.strut(v3(xx,-2.8,z),v3(xx-.5,-4,z+1.8),.12,'#665844');b.strut(v3(xx,-2.8,z),v3(xx+.7,-4,z-1),.11,'#665844');for(const side of [-1,1]){b.strut(v3(xx,-1.4,z),v3(xx+side*.7,-2.4,z+.7),.13,'#6d6048');b.strut(v3(xx+side*.7,-2.4,z+.7),v3(xx+side*1.3,-3.5,z+1.6),.075,'#6d6048');b.add(new T.ConeGeometry(.055,.7,5),'#8a805a',[xx+side*.9,-2.85,z+2.1]);}}}});
   const trees:Placement[]=[];for(let i=0;i<9;i++)for(let j=0;j<(low?3:6);j++)trees.push({x:-20+i*16+(r()-.5)*9,y:-2.8,z:-11-(i%3)*12+(r()-.5)*5,scale:.7+r()*.5,rotation:r()*6});plantGrove(staticRoot,'understory',trees,{low,name:'sundarbans-mangrove-canopy'});
   built(staticRoot,'forest-observation-station',b=>{b.add(new T.CylinderGeometry(6,7,1.2,16),'#7a7651',[finish-5,-3.4,-7],[0,0,0],[1,1,.7]);cabin(b,[finish-5,-2.8,-7],[6,3,4],{wall:'#b6a382',roof:'#646a4c',trim:'#786448'},{stilts:3});});
  }else if(code==='BTN'){
   const cliff=createHeightfield(features,{name:'taktsang-protected-cliff',x:48,y:-8,z:-43,width:35,depth:20,segments:[low?22:44,16],height:(u,v)=>24*Math.pow(Math.sin(Math.PI*u)*Math.sin(Math.PI*v),.4)*(1+.065*Math.sin(u*43+v*7)*Math.sin(Math.PI*u)*Math.sin(Math.PI*v)),color:()=>new T.Color('#9b9989')});markSurface(cliff.material as T.MeshStandardMaterial,'alpine-rock','#ddd8c4',3);cliff.updateMatrixWorld(true);
   built(staticRoot,'taktsang-distant-monastery-study',b=>{for(const [x,y,z,s]of [[48,14,-43,1.3],[42,12,-43,.7],[55,13,-43,.8]]){b.add(new T.BoxGeometry(6.3*s,3.5,4.3*s),'#9b9989',[x,y-1.75,z]);bhutanHouse(b,x,y,z,s);}});
   // Roots use an explicit planted valley shelf, separate from the cliff study.
   built(staticRoot,'paro-forest-valley-shelf',b=>b.add(new T.BoxGeometry(finish+60,2,24),'#53654b',[finish/2,-8,-25]));const trees=Array.from({length:low?22:45},()=>({x:-20+r()*(finish+40),y:-7,z:-15-r()*16,scale:.8+r()*1.3,rotation:r()*6}));plantGrove(staticRoot,'conifer',trees,{low,name:'paro-forest'});
  }else if(code==='IRN'){
   built(staticRoot,'yazd-earthen-city',b=>{b.add(new T.BoxGeometry(finish+110,2,100),'#b29674',[finish/2,-7,-55]);for(let row=0;row<3;row++)for(let x=-15;x<finish+25;x+=8+r()*3){const h=3+r()*3,z=-12-row*17;b.add(new T.BoxGeometry(6,h,7),'#c5a27e',[x,-6+h/2,z]);b.add(new T.SphereGeometry(2.5,16,8,0,Math.PI*2,0,Math.PI/2),'#cdb18e',[x,-6+h,z]);for(let k=-1;k<=1;k++)b.add(new T.BoxGeometry(.65,1.3,.08),'#66584d',[x+k*1.5,-4,z+3.54]);facadeCourses(b,{x,y:-6,z:z+3.57,w:6,h,color:'#c5a27e',trim:'#b59270',seed:Math.round(x*100+row),windows:true});for(const side of [-1,1])b.add(new T.BoxGeometry(6,.4,.3),'#d0b38b',[x,-6+h+.2,z+side*3.35]);if(r()>.45)windcatcher(b,x+2,-6+h,z-1,5+r()*4);}for(const x of [12,45,76])windcatcher(b,x,-1,-8,11);});
   built(staticRoot,'yazd-shaded-courtyard-arcades',b=>{for(let i=0;i<9;i++)b.add(arcadeBay(3,4,1,{opening:.65,spring:.6}),'#c5a17c',[35+i*3,-4,-7]);});
  }else if(code==='MDV'){
   water('baa-shallow-turquoise-lagoon',finish/2,-1.3,-42,finish+200,130,'#79d6cf','#3b9fbb');
   built(staticRoot,'baa-low-sand-islets',b=>{for(const [x,z,s]of [[4,-22,1],[38,-45,1.3],[76,-28,1],[105,-63,.9]]){shoreIsland(features,{name:'baa-reef-shelf-'+x,x,y:-1.48,z,width:35*s,depth:23*s,height:.8,color:'#78bcae',seed:x+8});shoreIsland(features,{name:'baa-scalloped-sand-shore-'+x,x,y:-1,z,width:25*s,depth:15*s,height:.7,color:'#e7dcb5',seed:x+8});}for(let i=0;i<25;i++){const x=-18+r()*(finish+40),z=-7-r()*20;b.add(new T.SphereGeometry(.55,8,6),i%2?'#80b4a0':'#c3b694',[x,-1.8,z],[0,0,0],[1,.35,1]);for(let k=0;k<3;k++)b.strut(v3(x,-2,z),v3(x+(k-1)*.35,-1.45,z+.16*k),.045,'#ab9488');}});
   const palms:Placement[]=[];for(const [x,z]of [[4,-22],[38,-45],[76,-28],[105,-63]])for(let i=0;i<3;i++)palms.push({x:x+(r()-.5)*9,y:-1,z:z+(r()-.5)*4,scale:.7+r()*.4,rotation:r()*6});plantGrove(staticRoot,'coconut-palm',palms,{low,name:'baa-island-palms'});
  }else if(code==='NPL'){
   // An alpine valley and suspended trail, distinct from Bhutan's green cliffs.
   createHeightfield(features,{name:'khumbu-moraine-floor',x:finish/2,y:-8.2,z:-25,width:finish+100,depth:32,segments:[low?40:80,8],height:(u,v)=>Math.sin(u*17+v*3)*.15+fbm(u*24,v*8,613,3)*.24,color:()=>new T.Color('#8e9998')});
   built(staticRoot,'khumbu-moraine-and-trail-huts',b=>{for(let i=0;i<35;i++)b.add(new T.DodecahedronGeometry(1+r()*2,0),'#9aa3a2',[-25+r()*(finish+60),-7.5,-14-r()*25],[r(),r(),r()],[1,.8,1]);for(const x of [9,66]){b.add(new T.BoxGeometry(6,5,5),'#9d9f92',[x,-6.5,-12]);cabin(b,[x,-4,-12],[5,2.8,4],{wall:'#9e9a8c',roof:'#677a83',trim:'#e1d9bb',snow:'#ecf0e8'});}});
   const trees=Array.from({length:low?12:22},()=>({x:-10+r()*30,y:-7,z:-18-r()*16,scale:.7+r()*.7,rotation:r()*6}));built(staticRoot,'lower-khumbu-forest-shelf',b=>b.add(new T.BoxGeometry(44,2,25),'#778477',[5,-8,-26]));plantGrove(staticRoot,'conifer',trees,{low,name:'lower-khumbu-conifers'});
  }else if(code==='PAK'){
   mountainRange(features,'passu-cones-serrated-skyline',finish*.58,-54,76,45,963,low,false,false);
   const river=irregularBasin(features,{name:'hunza-glacial-river-bank',x:finish/2,y:-6.8,z:-23,width:finish+110,depth:17,seed:963,low,rim:'#969d8c',shallow:'#8fbcc1',deep:'#5b90a4',height:1.6});shell.animate({update:t=>river.update(t)});
   built(staticRoot,'hunza-terraced-settlement',b=>{for(let i=0;i<4;i++){const z=-36-i*7,y=-6+i*1.5;b.add(new T.BoxGeometry(finish+35,1.7,6),'#928d6d',[finish/2,y-.9,z]);for(let j=0;j<5;j++){const x=2+j*19;if(i===2)cabin(b,[x,y,z],[4,2.5,3],{wall:'#c7bea0',roof:'#7f8374',trim:'#655e4b'});}}});
  }else if(code==='LKA'){
   erodedColumn(features,{name:'sigiriya-isolated-rock-relief',x:52,y:-6,z:-60,radius:19,height:28,seed:174,color:'#aa8b70',top:'#7d8b59',segments:low?24:48});
   built(staticRoot,'sigiriya-protected-summit-remains',b=>{for(let i=0;i<5;i++){b.add(new T.BoxGeometry(2.8,.7,2),'#aa735a',[46+i*3,22.35,-60]);for(const side of [-1,1])b.add(new T.BoxGeometry(2.8,.35,.28),'#a86f54',[46+i*3,23,-60+side*.9]);}});
   built(staticRoot,'sigiriya-water-garden-ground',b=>b.add(new T.BoxGeometry(finish+120,2,80),'#6f8d4f',[finish/2,-7,-40]));
   for(let i=0;i<3;i++){water('sigiriya-garden-tank-'+i,20+i*25,-5.95,-17,17,8,'#8ab8a2','#638f83');built(staticRoot,'garden-tank-stone-edging',b=>{for(const side of [-1,1]){b.add(new T.BoxGeometry(18,.4,.5),'#b7aa88',[20+i*25,-5.9,-17+side*4.3]);b.add(new T.BoxGeometry(.5,.4,8.2),'#b7aa88',[20+i*25+side*8.75,-5.9,-17]);}for(let k=0;k<6;k++)b.add(new T.BoxGeometry(2.8,.06,.8),'#ada27e',[12.5+i*25+k*3,-5.67,-12.3]);});}
   const trees=Array.from({length:low?22:40},()=>({x:-20+r()*(finish+40),y:-6,z:-34-r()*38,scale:.8+r()*1.4,rotation:r()*6}));plantGrove(staticRoot,'understory',trees,{low,name:'sigiriya-jungle'});
  }
  return shell.finish();
 },
 dressPlatform(root,definition,context){
  const w=definition.width,low=context.low;
  if(definition.type==='wooden-bridge'||definition.type==='bridge'||definition.terrain==='water-raft'||definition.terrain==='canopy'||definition.motion&&definition.style!=='moving-rock'){
   dressDeck(root,definition,definition.terrain==='water-raft'?'raft':definition.motion?'lift':definition.type==='bridge'?'carved':definition.terrain==='canopy'?'boardwalk':'rope',deck);return;
  }
  const city=code==='IRN',details=dressLandmass(root,definition,p,{low,kind:definition.steps?'stairs':city?'block':'cliff',profile:city?'wall':definition.route==='upper'?'island':wet?'mass':definition.terrain==='cliff'?'shelf':'mass',visualDepth:wet?1.5:code==='LKA'?3.2:4.5}),surface=localSurface(definition);sculptRegionalBody(root,definition,code);
  if(city&&definition.thickness>2)built(details,'yazd-playable-roof-facade',b=>{for(let x=-w/2+.8;x<w/2;x+=1.6){b.add(new T.BoxGeometry(.6,.9,.08),'#74604d',[x,surface(x)-1,definition.depth/2+.03]);b.add(new T.BoxGeometry(.8,.12,.1),'#d4b58b',[x,surface(x)-.48,definition.depth/2+.05]);}b.add(new T.BoxGeometry(w,.35,.3),'#c5a582',[0,surface(0)+.17,-definition.depth/2]);});
  if(definition.climbable)built(details,'snowy-granite-handholds',b=>{for(let y=-definition.thickness+.7;y<0;y+=.6)for(const z of [-.6,.6])b.add(new T.DodecahedronGeometry(.13,0),'#cdd4cb',[-w/2-.06,y,z],[0,0,0],[.5,1,1]);});
  if(w>5&&definition.route!=='upper'&&!city){
   const kind:TreeKind=code==='BGD'?'reed':code==='MDV'?'coconut-palm':code==='BTN'?'shrub':code==='NPL'?'golden-tuft':code==='LKA'?'flowering-shrub':'tuft';
   const spots=rearSpots(definition,Math.floor(w/(kind==='coconut-palm'?9:4)),definition.id.length*113).map(s=>({x:s.x,y:surface(s.x),z:Math.min(-1.3,s.z),scale:kind==='coconut-palm'?.5:.45,rotation:s.r*6}));plantGrove(details,kind,spots,{low,name:place.theme+'-grounded-route-plants'});
  }
  if(code==='AFG')built(details,'mineral-deposit-rim',b=>{for(let x=-w/2+.2;x<w/2;x+=.6)b.add(new T.BoxGeometry(.55,.1,.18),'#e5dabc',[x,surface(x)-.05,definition.depth/2+.05]);});
 },
 createEnemy:parent=>roundCreature(parent,{name:'fictional-'+place.theme+'-training-creature',height:1,shell:colors[code][3],belly:'#e1d4b0',foot:'#6d624e',crest:()=>{}}),
 createDiscoveryBlock:(parent,w,h)=>createDiscoveryCrate(parent,w,h,{body:'wood',color:colors[code][1],trim:'#d9c48f',glyph:'#f2e1b2'}),
 decorateCheckpoint(marker){createBannerPost(marker,{pole:'#78694b',cloth:colors[code][3],accent:'#e6cf8b',height:1.6}).position.z=-.8;},
 decorateFinish(gate){built(gate,'regional-discovery-finish',b=>b.add(new T.BoxGeometry(1.8,.35,.1),colors[code][3],[0,3.2,0]));},
 };
}
