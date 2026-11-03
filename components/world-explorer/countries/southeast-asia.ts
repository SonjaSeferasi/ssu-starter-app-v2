import * as T from 'three';
import {irregularBasin,contourBench,organicCave,sculptRegionalBody,lotusTower,baganMonument} from './asia-enhancement-kit';
import {createRockMass} from '../kit/landmass';
import {southeastAsiaPlaces,type SoutheastAsiaCode} from '../../../lib/world-explorer/southeast-asia';
import {Builder,random,v3,vertexMaterial,type Placement} from '../kit/common';
import {createHeightfield,ridgedRange,mountainColor} from '../kit/landform';
import {createWaterSurface,createWaterfall} from '../kit/water';
import {plantGrove,type TreeKind} from '../kit/vegetation';
import {dressLandmass,localSurface,rearSpots,type LandmassPalette} from '../kit/landmass';
import {dressDeck,type DeckPalette} from '../kit/bridges';
import {arcadeBay} from '../kit/architecture';
import {createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {mountShell,built,roundCreature} from './south-america/shell';
import type {CountryEnvironment} from './types';

/** Scenery only. The eleven authored routes and shared simulation own every
 * collision, reward and mechanism. Landmarks are original simplified studies,
 * with fictional courses, not geographic maps or access advice. */
const palettes:Record<SoutheastAsiaCode,[string,string,string,string,string]>={
 BRN:['#526535','#8b8060','#415b2b','#316d54','#e7b94b'],
 KHM:['#72804b','#88755c','#41472f','#8e3f2c','#d2a657'],
 IDN:['#716e55','#67574e','#44403d','#773d29','#f0af57'],
 LAO:['#8a9960','#c0b18e','#667345','#56bbae','#e2c867'],
 MYS:['#7f8b71','#9c9b99','#54585a','#31594a','#dec77e'],
 MMR:['#c8aa73','#a86e49','#734c37','#923c24','#e5c45e'],
 PHL:['#719b37','#827c54','#4b6240','#619a8a','#dfb95b'],
 SGP:['#d2d5ca','#b8b8a6','#66716b','#456b78','#a879a1'],
 THA:['#8e9a67','#b7ae8e','#606959','#3e9e94','#d68b40'],
 TLS:['#dfcb97','#c8b58a','#7b7959','#3b9dba','#dba660'],
 VNM:['#71865e','#a5a69a','#555f57','#2c7c8b','#b67d3d'],
};
const coastalRock=(code:SoutheastAsiaCode)=>['THA','TLS','VNM'].includes(code);
function palette(code:SoutheastAsiaCode):LandmassPalette{const [top,face,dark]=palettes[code];return{top,topAlt:new T.Color(top).multiplyScalar(.78).getStyle(),edge:face,face,faceDark:dark,band:new T.Color(face).multiplyScalar(.8).getStyle(),maps:{set:code==='SGP'?'ashlar':code==='MYS'?'alpine-rock':code==='MMR'?'red-brick':coastalRock(code)?'coastal-rock':'mossy-rock',tint:code==='SGP'?'#f6f8ed':'#d9d3be',repeat:.45},rough:code==='SGP'?.04:.25,strata:code==='IDN'?.5:1};}
const deck:DeckPalette={wood:'#795b3c',woodAlt:'#9a7950',rope:'#c6b48b',stone:'#a59c80',stoneAlt:'#8b8069',metal:'#516169',accent:'#d5b761'};

function pavilion(b:Builder,x:number,y:number,z:number,scale:number,kind:'khmer'|'bagan'|'hut'){
 const wall=kind==='bagan'?'#a86946':kind==='khmer'?'#908773':'#a68c5d';
 b.add(new T.BoxGeometry(4,.6,3.5),wall,[x,y+.3,z],[0,0,0],[scale,scale,scale]);
 if(kind==='hut'){
  b.add(new T.BoxGeometry(3,2.4,2.7),'#aa8960',[x,y+1.7*scale,z],[0,0,0],[scale,scale,scale]);
  b.add(new T.ConeGeometry(3,1.7,4),'#776442',[x,y+3.7*scale,z],[0,Math.PI/4,0],[scale,scale,scale*.8]);
 }else{
  b.add(arcadeBay(3.4,3.2,2.8,{opening:.45,spring:.65}),wall,[x,y+.5*scale,z],[0,0,0],[scale,scale,scale]);
  for(let i=0;i<5;i++)b.add(new T.CylinderGeometry((1.45-i*.23)*scale,(1.65-i*.23)*scale,.65*scale,kind==='khmer'?4:16),wall,[x,y+(3.8+i*.6)*scale,z],[0,Math.PI/4,0]);
  b.add(new T.ConeGeometry(.35*scale,1.7*scale,8),kind==='bagan'?'#d4ad61':wall,[x,y+7.1*scale,z]);
 }
}
function karst(parent:T.Object3D,x:number,z:number,height:number,width:number,seed:number,low:boolean){
 const r=random(seed),base=-6;
 const heightAt=(u:number,v:number)=>Math.pow(Math.max(0,Math.sin(u*Math.PI)*Math.sin(v*Math.PI)),.45)*height*(.85+.12*Math.sin(u*19+v*11+seed));
 const land=createHeightfield(parent,{name:'limestone-karst-'+seed,x,y:base,z,width,depth:width*.8,segments:[low?14:28,low?12:24],height:heightAt,color:mountainColor({snowLine:100,treeLine:height*.75,rock:'#a7a99c',forest:'#4b6c42',snow:'#ffffff',grass:'#718258'})});land.updateMatrixWorld(true);
 // Raycast the actual triangulated surface. Sampling the analytic height
 // alone leaves roots suspended above coarse, steep karst triangles.
 const spots:Placement[]=[];for(let i=0;i<(low?5:10);i++){const u=.2+r()*.6,v=.25+r()*.5,px=x+(u-.5)*width,pz=z+(v-.5)*width*.8,hit=new T.Raycaster(v3(px,height+5,pz),v3(0,-1,0)).intersectObject(land)[0];if(hit)spots.push({x:px,y:hit.point.y-.03,z:pz,scale:.5+r()*.4,rotation:r()*6});}
 const grove=plantGrove(parent,'understory',spots,{low,name:'karst-summit-vegetation'});grove.userData.groundSurface=land.name;
}
function walkwayTower(b:Builder,x:number,y:number,z:number,h:number){
 for(const side of [-1,1]){b.add(new T.CylinderGeometry(.13,.18,h,7),'#6e6450',[x+side*1.3,y+h/2,z]);for(let k=0;k<h;k+=3)b.strut(v3(x-1.3,y+k,z),v3(x+1.3,y+Math.min(h,k+3),z),.065,'#8a7858');}
 for(let i=0;i<3;i++){b.add(new T.BoxGeometry(3.2,.22,3.2),'#a08960',[x,y+h-i*3,z]);for(const side of [-1,1])b.add(new T.BoxGeometry(.08,.8,3.2),'#b4a17a',[x+side*1.5,y+h+.5-i*3,z]);}
}

export function southeastEnvironment(code:SoutheastAsiaCode):CountryEnvironment{
 const place=southeastAsiaPlaces[code],p=palette(code),warm=code==='MMR'||code==='IDN',coastal=['THA','TLS','VNM','SGP'].includes(code);
 const info={title:place.title,license:'Original procedural geometry; CC0 surface maps listed in materials/LICENSES.md.',representation:'Stylized landscape inspired by '+place.landmark+'. Landmarks and paths are compressed fictional studies, not a geographic reconstruction.',landmarkSource:place.source,assets:[...place.features,place.theme+'-landscape',place.signature]};
 return{
 id:'southeast-'+place.iso2.toLowerCase(),info,
 lighting:{background:warm?'#d8bea1':'#b4d7e3',exposure:1,sun:warm?'#ffd5a2':'#ffe3b5',sunIntensity:3.05,sky:'#e2eef0',ground:p.faceDark,hemisphere:.95,rim:'#f4d6a2',rimIntensity:.4,pixelRatio:1.25,reflections:{zenith:'#86b8d1',horizon:'#dce3d5',ground:p.faceDark,intensity:.3}},
 mechanisms:{stone:p.face,stoneDark:p.faceDark,trim:'#95815b',glow:'#ffd66a',metal:'#52646a'},ropeColor:'#bdab85',hazardPalette:{column:code==='IDN'?'#dfcfbd':'#c1eee5',base:p.faceDark,warning:'#ffbe55'},
 mount(context){
  const {finish,low}=context,r=random(8100+code.charCodeAt(0)),shell=mountShell(context,{id:'southeast-'+place.iso2.toLowerCase(),name:code.toLowerCase()+'-'+place.theme+'-environment',background:warm?'#d8bea1':'#b4d7e3',fog:[warm?'#d5c0a9':'#bfd9dc',65,230],sky:{zenith:warm?'#6b9eba':'#579fc7',horizon:warm?'#e6d3b8':'#d5e9e9',glow:'#fff0d0',sun:[-.5,.6,-.8],glowPower:35},clouds:{groups:12,high:[23,40],lowBand:[-9,-7],opacity:.65},layers:['playable-'+place.theme,place.landmark,'regional-landscape','foreground','sky']});
  const {features,staticRoot}=shell;
  const water=(name:string,x:number,y:number,z:number,width:number,depth:number,shallow:string,deep:string)=>{const surface=createWaterSurface(features,{name,x,y,z,width,depth,shallow,deep,segments:low?16:32,flow:[.012,.004]});shell.animate({update:t=>surface.update(t)});return surface;};
  const waterfall=(x:number,top:number,z:number,width:number,height:number,seed:number)=>{const f=createWaterfall(features,{x,top,z,width,height,seed,low});shell.animate({update:t=>f.update(t)});};
  if(coastal)water(place.theme+'-sea',finish/2,code==='SGP'?-6.3:-5.8,-49,finish+190,105,code==='TLS'?'#52b6bd':'#5faaa1','#2e7183');
  // Distant ranges vary in silhouette; near landmarks remain separate models.
  if(!['IDN','PHL','SGP','THA','VNM'].includes(code)){
   const height=code==='MYS'?42:code==='TLS'?24:18;
   createHeightfield(features,{name:place.theme+'-far-range',x:finish/2,y:-8,z:-105,width:finish+230,depth:48,segments:[low?50:100,low?12:24],height:ridgedRange(8134+code.length,{peaks:code==='MYS'?6:11,height,sharpness:code==='MYS'?3:1.3}),color:mountainColor({snowLine:100,treeLine:code==='MYS'?20:height,rock:code==='MYS'?'#8f969e':'#7b9b8a',forest:'#5c8a72',snow:'#f2f1e9'})});
  }
  if(code==='BRN'){
   // Research canopy towers and layered lowland forest, not a palace clone.
   built(staticRoot,'ulu-temburong-canopy-towers',b=>{walkwayTower(b,20,-6,-12,19);walkwayTower(b,57,-6,-16,23);b.add(new T.BoxGeometry(37,.25,2),'#9c845a',[38.5,13,-14]);for(const side of [-1,1])b.add(new T.BoxGeometry(37,.7,.05),'#a79b7c',[38.5,13.5,-14+side]);});
   const trees:Placement[]=[];for(let i=0;i<(low?36:70);i++)trees.push({x:-25+r()*(finish+50),y:-8,z:-8-r()*52,scale:1.3+r()*2,rotation:r()*6});
   built(staticRoot,'rainforest-floor',b=>b.add(new T.BoxGeometry(finish+80,2,65),'#334d30',[finish/2,-9,-38]));plantGrove(staticRoot,'kapok',trees,{low,name:'lowland-rainforest-canopy'});water('temburong-river',finish/2,-7.6,-28,finish+60,9,'#688c68','#426e62');
  }else if(code==='KHM'){
   built(staticRoot,'angkor-lotus-quincunx-and-galleries',b=>{b.add(new T.BoxGeometry(finish+70,2,70),'#485b34',[finish/2,-8,-40]);const x=47,z=-34;for(const [dx,dz,h,scale]of [[0,0,20,1.5],[-11,6,14,1],[11,6,14,1],[-11,-7,14,.9],[11,-7,14,.9]])lotusTower(b,x+dx,-7,z+dz,h,scale);for(let i=0;i<19;i++){const xx=x-30+i*3.4;b.add(arcadeBay(3.4,4.1,2.2,{opening:.58,spring:.7}),'#948974',[xx,-6.8,-18]);b.add(new T.BoxGeometry(3.5,.45,2.5),'#aba085',[xx,-2.6,-18]);}for(const side of [-1,1])for(let i=0;i<8;i++)b.add(new T.BoxGeometry(5,.45,3),'#a5997d',[x+side*24,-6.9+i*.32,-19-i*2.4]);});
   const trees=Array.from({length:low?18:32},()=>({x:-20+r()*(finish+40),y:-7,z:-52-r()*22,scale:.9+r(),rotation:r()*6}));plantGrove(staticRoot,'kapok',trees,{low,name:'angkor-forest'});water('temple-moat',finish/2,-7,-55,finish+70,9,'#879a6e','#5c775b');
  }else if(code==='IDN'){
   // Broad Tengger sand plain, enclosing caldera and two differently shaped cones.
   createHeightfield(features,{name:'tengger-ash-plain',x:finish/2,y:-7,z:-36,width:finish+130,depth:67,segments:[low?45:90,16],height:(u,v)=>Math.sin(u*32+v*8)*.25+Math.sin(v*35)*.12,color:()=>new T.Color('#8f8370')});
   for(const [x,z,h,w,crater]of [[38,-53,29,47,true],[78,-86,48,42,false]] as const){
    createHeightfield(features,{name:crater?'bromo-crater-cone':'tengger-volcanic-cone',x,y:-7,z,width:w,depth:w*.8,segments:[low?30:60,low?24:48],height:(u,v)=>{const d=Math.hypot((u-.5)*2,(v-.5)*2),cone=Math.max(0,1-d)*h;return crater?cone-Math.max(0,1-d/.34)*h*.5:cone;},color:mountainColor({snowLine:100,treeLine:0,rock:crater?'#8f8070':'#737767',forest:'#616d4d',snow:'#ddd9ca'})});
   }
   createHeightfield(features,{name:'tengger-caldera-rim',x:finish/2,y:-7,z:-115,width:finish+150,depth:25,segments:[70,10],height:ridgedRange(782,{peaks:8,height:29,sharpness:2}),color:()=>new T.Color('#7d877c')});
  }else if(code==='LAO'){
   for(let i=0;i<6;i++){const y=-6+i*1.65,z=-11-i*7.5,x=finish/2+Math.sin(i*.8)*9;const basin=irregularBasin(features,{name:'kuang-si-basin-'+i,x,y,z,width:finish*.72+18-i*2,depth:9.5,seed:531+i,low,height:1.8,shallow:'#a6d9c2',deep:'#69b5aa'});shell.animate({update:basin.update});waterfall(x-18+i*2,y-.06,z+3.8,5+i%2,1.7,70+i);}
   waterfall(52,20,-63,8,25,222);createRockMass(staticRoot,{name:'kuang-si-eroded-headwall',x:52,y:20,z:-68,width:27,depth:10,height:26,palette:{...p,maps:{set:'limestone',tint:'#d8dfc9',repeat:.4}},profile:'mass',low,seed:510});
   built(staticRoot,'cascade-forest-floor',b=>b.add(new T.BoxGeometry(finish+50,2,20),'#5d774b',[finish/2,2,-54]));const trees=Array.from({length:low?20:38},()=>({x:-15+r()*(finish+35),y:3,z:-47-r()*12,scale:1.2+r(),rotation:r()*6}));plantGrove(staticRoot,'understory',trees,{low,name:'luang-prabang-forest'});
   built(staticRoot,'fictional-water-wheel',b=>{b.add(new T.TorusGeometry(3,.18,6,24),'#7c603f',[47,2,-5]);for(let i=0;i<12;i++){const a=i/12*Math.PI*2;b.strut(v3(47,2,-5),v3(47+Math.cos(a)*3,2+Math.sin(a)*3,-5),.07,'#9b7c51');b.add(new T.BoxGeometry(.8,.35,1.1),'#8b6c45',[47+Math.cos(a)*3,2+Math.sin(a)*3,-5],[0,0,a]);}});
  }else if(code==='MYS'){
   createHeightfield(features,{name:'kinabalu-granite-massif',x:52,y:-7,z:-60,width:72,depth:38,segments:[low?42:84,low?22:42],height:ridgedRange(1012,{peaks:5,height:43,sharpness:3.2}),color:mountainColor({snowLine:100,treeLine:14,rock:'#969b9e',forest:'#4f7965',snow:'#eeeeea'})});
   built(staticRoot,'montane-forest-floor',b=>b.add(new T.BoxGeometry(finish+60,2,30),'#596c4d',[finish/2,-8,-27]));const trees=Array.from({length:low?24:48},()=>({x:-15+r()*(finish+30),y:-7,z:-12-r()*24,scale:.8+r()*1.4,rotation:r()*6}));plantGrove(staticRoot,'understory',trees,{low,name:'kinabalu-montane-forest'});
  }else if(code==='MMR'){
   built(staticRoot,'bagan-temple-and-stupa-plain',b=>{b.add(new T.BoxGeometry(finish+120,2,90),'#b6a26c',[finish/2,-8,-55]);for(let i=0;i<(low?12:20);i++)baganMonument(b,-12+r()*(finish+35),-7,-20-r()*50,.5+r()*.8,i);baganMonument(b,47,-7,-30,1.45,1);});water('ayeyarwady-river',finish/2,-7.05,-83,finish+160,20,'#b2ad81','#778c85');
   const trees=Array.from({length:low?15:28},()=>({x:-12+r()*(finish+25),y:-7,z:-12-r()*45,scale:.7+r()*.5,rotation:r()*6}));plantGrove(staticRoot,'acacia',trees,{low,name:'river-plain-trees'});built(staticRoot,'fictional-market-pavilions',b=>{for(let x=6;x<31;x+=6)pavilion(b,x,-1,-5,.65,'hut');});
  }else if(code==='PHL'){
   for(let k=0;k<8;k++)contourBench(features,{name:'ifugao-paddy-'+k,x:finish/2,y:-6+k*1.8,z:-10-k*7,width:finish+65,depth:6.5,seed:32+k,low,water:k%3===0});
   built(staticRoot,'ifugao-village-study',b=>{for(const x of [7,47,77])pavilion(b,x,6.6,-58,.85,'hut');});
  }else if(code==='SGP'){
   built(staticRoot,'marina-waterfront-and-skyline',b=>{b.add(new T.BoxGeometry(finish+90,2,48),'#b8c8b4',[finish/2,-7,-28]);for(let i=0;i<25;i++){const x=-25+i*6,h=6+r()*20;b.add(new T.BoxGeometry(3+r()*2,h,4),'#819fa9',[x,-6+h/2,-60-r()*14]);for(let y=-4;y<h-6;y+=2)b.add(new T.BoxGeometry(2.7,.08,.08),'#c3e2df',[x,y,-57.9]);}for(let i=0;i<3;i++)b.add(new T.BoxGeometry(4,21,5),'#c4cbc5',[40+i*7,4.5,-42]);b.add(new T.BoxGeometry(23,1.4,7),'#6a8c84',[47,15.7,-42]);});
   built(staticRoot,'supertree-inspired-garden',b=>{for(let i=0;i<7;i++){const x=-3+i*15,h=10+(i%3)*3,z=-10-(i%2)*7;b.add(new T.CylinderGeometry(.5,.95,h,12),'#6e4e68',[x,-6+h/2,z]);b.add(new T.CylinderGeometry(4,1.2,2.5,16,1,true),'#83637e',[x,-6+h,z]);for(let k=0;k<12;k++){const a=k/12*Math.PI*2;b.strut(v3(x,-5.5,z),v3(x+Math.cos(a)*4,-4+h,z+Math.sin(a)*4),.045,'#a88ca3');}b.add(new T.TorusGeometry(3.9,.13,6,24),'#b29aaa',[x,-4.7+h,z],[Math.PI/2,0,0]);}});
   const plants=Array.from({length:low?22:44},()=>({x:-20+r()*(finish+40),y:-6,z:-8-r()*24,scale:.8+r()*.6,rotation:r()*6}));plantGrove(staticRoot,'understory',plants,{low,name:'garden-city-planting'});water('marina-bay-waterfront',finish/2,-5.8,-42,finish+130,14,'#76b7bd','#447f94');
  }else if(code==='THA'||code==='VNM'){
   const dense=code==='VNM';for(let i=0;i<(low?9:dense?20:14);i++)karst(features,-20+r()*(finish+50),-15-r()*75,12+r()*(dense?30:23),11+r()*14,810+i,low);
   built(staticRoot,dense?'ha-long-junk-boats':'phang-nga-long-tail-boats',b=>{for(let i=0;i<5;i++){const x=5+i*19,z=-12-r()*25;b.add(new T.CylinderGeometry(1,.55,5.5,10,1,false,0,Math.PI).rotateZ(Math.PI/2).rotateX(Math.PI),'#825938',[x,-5.5,z],[0,0,0],[1,.5,1]);if(dense){b.add(new T.CylinderGeometry(.04,.06,5,6),'#745b3c',[x,-2.7,z]);b.add(new T.PlaneGeometry(2.4,3,4,1),'#bc8b53',[x+.9,-2.3,z]);}else b.strut(v3(x+2,-5.4,z),v3(x+5,-5.7,z),.05,'#4d4c42');}});
   if(!dense){built(staticRoot,'mangrove-bank',b=>b.add(new T.BoxGeometry(24,1,13),'#6e7753',[7,-6,-11]));const trees=Array.from({length:low?9:18},()=>({x:-4+r()*22,y:-5.5,z:-6-r()*10,scale:.6+r()*.4,rotation:r()*6}));plantGrove(staticRoot,'understory',trees,{low,name:'phang-nga-mangroves'});}
  }else if(code==='TLS'){
   createHeightfield(features,{name:'atauro-beach',x:finish/2,y:-6,z:-20,width:finish+90,depth:34,segments:[low?30:60,10],height:(u,v)=>v*3+Math.sin(u*10)*.3,color:()=>new T.Color('#d9c699')});
   const palms=Array.from({length:low?12:22},()=>{const u=r(),v=.35+r()*.5;return{x:finish/2+(u-.5)*(finish+90),y:-6+v*3+Math.sin(u*10)*.3,z:-20+(v-.5)*34,scale:.8+r()*.4,rotation:r()*6};});plantGrove(staticRoot,'coconut-palm',palms,{low,name:'atauro-coastal-palms'});
   built(staticRoot,'atauro-coastal-village',b=>{for(const x of [10,26,66])pavilion(b,x,-3,-25,.65,'hut');for(let i=0;i<18;i++)b.add(new T.DodecahedronGeometry(.5+r()*.5,0),i%2?'#648d78':'#a9a27e',[-15+r()*(finish+30),-6.5,-7-r()*8],[r(),r(),r()],[1,.45,1]);});
  }
  return shell.finish();
 },
 dressPlatform(root,definition,context){
  const {low}=context,w=definition.width;
  if(definition.type==='wooden-bridge'||definition.motion||definition.terrain==='canopy'){
   dressDeck(root,definition,definition.terrain==='water-raft'?'raft':definition.motion?'lift':definition.terrain==='canopy'?'suspended':'rope',code==='SGP'?{...deck,wood:'#829e9f',woodAlt:'#bbcfc6',metal:'#4a626f'}:deck);
   if(definition.terrain==='water-raft')built(root,'country-boat-hull',b=>{b.add(new T.BoxGeometry(w*.93,.3,2.7),code==='THA'?'#946244':'#6b6649',[0,-.4,0]);if(code==='THA')b.strut(v3(-w/2,-.3,-1),v3(-w/2-1,-.5,-1),.06,'#474d47');});
   if(code==='SGP')built(root,'garden-steel-structure',b=>{for(const x of [-w/2+.15,w/2-.15])b.add(new T.CylinderGeometry(.05,.05,1,6),'#637980',[x,.5,-1.3]);b.add(new T.BoxGeometry(w,.5,.05),'#a8c8c5',[0,.5,-1.3]);});
   return;
  }
  const details=dressLandmass(root,definition,p,{low,kind:definition.steps?'stairs':code==='SGP'?'block':'cliff',profile:code==='SGP'?'wall':definition.route==='upper'?'island':definition.terrain==='cliff'||definition.terrain==='lava'?'shelf':'mass',visualDepth:Math.min(definition.thickness,code==='IDN'?5:4)}),height=localSurface(definition);
  sculptRegionalBody(root,definition,code);
  if(definition.climbable)built(details,'granite-handholds',b=>{for(let y=-definition.thickness+.7;y<0;y+=.6)for(const z of [-.6,.6])b.add(new T.DodecahedronGeometry(.13,0),'#d0b88a',[-w/2-.06,y,z],[0,0,0],[.5,1,1]);});
  if(definition.terrain==='cave')organicCave(details,w,definition.id.length*17,p.face,low);
  if(definition.route!=='upper'&&w>=5){
   const kind:TreeKind=code==='IDN'?'golden-tuft':code==='MMR'?'tuft':code==='TLS'?'coconut-palm':code==='PHL'?'reed':code==='MYS'?'shrub':code==='SGP'?'flowering-shrub':'understory';
   const spots=rearSpots(definition,Math.floor(w/(kind==='coconut-palm'?7:3)),definition.id.length*71).map(s=>({x:s.x,y:height(s.x),z:Math.min(-1.3,s.z),scale:kind==='coconut-palm'?.55:kind==='understory'?.45:.5,rotation:s.r*6}));plantGrove(details,kind,spots,{low,name:place.theme+'-grounded-route-plants'});
   if(['KHM','MMR'].includes(code))built(details,'gallery-relief-blocks',b=>{for(let x=-w/2+.6;x<w/2-.4;x+=1.2)b.add(new T.BoxGeometry(.8,.22,.12),palettes[code][4],[x,height(x)-.3,definition.depth/2+.05]);});
   if(code==='PHL')built(details,'irrigation-channel',b=>{b.add(new T.BoxGeometry(w,.06,.4),'#71a69b',[0,height(0)+.01,-2.1]);for(let x=-w/2+.4;x<w/2;x+=.8)b.add(new T.BoxGeometry(.2,.15,.6),'#9c9365',[x,height(x),-2.1]);});
   if(code==='SGP')built(details,'garden-promenade-trim',b=>b.add(new T.BoxGeometry(w,.08,.12),'#a6b9ac',[0,height(0)+.04,definition.depth/2]));
  }
 },
 createEnemy:parent=>roundCreature(parent,{name:place.theme+'-training-creature',height:1,shell:palettes[code][3],belly:'#e0d3a3',foot:'#5c5841',crest:()=>{}}),
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:code==='SGP'?'metal':'wood',color:palettes[code][1],trim:'#cfb778',glyph:'#f5e5b8'}),
 decorateCheckpoint(marker){const post=createBannerPost(marker,{pole:'#72654b',cloth:palettes[code][3],accent:'#f3db92',height:1.6});post.position.z=-.7;},
 decorateFinish(gate){built(gate,'country-discovery-sign',b=>{b.add(new T.BoxGeometry(1.8,.35,.1),palettes[code][3],[0,2.5,0]);});},
 };
}

