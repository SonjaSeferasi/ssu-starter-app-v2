import {islandArt,dressIslandGround,type IslandArtCode} from './north-america-island-art';
import * as T from 'three';
import {remainingNorthAmericaPlaces,type RemainingNorthAmericaCode} from '../../../lib/world-explorer/north-america-remaining';
import {Builder,vertexMaterial,random} from '../kit/common';
import {createHeightfield,ridgedRange,mountainColor} from '../kit/landform';
import {createWaterSurface} from '../kit/water';
import {clearPlatformRoot,createRockMass,type LandmassPalette} from '../kit/landmass';
import {dressDeck,type DeckPalette} from '../kit/bridges';
import {woodenDeck} from '../kit/wooden-deck';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {mountShell} from './south-america/shell';
import {createNorthAmericanForest} from './north-america-forest';
import {dressNorthAmericanGround} from './north-america-ground';
import {islandLandmark} from './north-america-island-landmarks';
import {createIslandCreature} from './north-america-island-creatures';
import type {CountryEnvironment} from './types';

const cityCodes=['ATG','BRB','CUB','DOM','GRD','PAN'];
export function remainingNorthAmericaEnvironment(code:RemainingNorthAmericaCode):CountryEnvironment{
 const place=remainingNorthAmericaPlaces[code],city=cityCodes.includes(code),volcanic=['DMA','NIC','VCT'].includes(code),sand=['BHS','BLZ'].includes(code),wet=code==='TTO',fort=code==='HTI'||code==='KNA';
 const top=sand?'#e2dcc1':city?'#b8b7a1':volcanic?'#8e9c7e':'#93ac79',face=sand?'#d0c9ad':volcanic?'#929b8f':'#b2b5a1',dark=volcanic?'#5b7065':'#6a8070',waterColor=wet?'#659b8e':sand?'#72c9c2':'#65afb4';
 const art=islandArt[code as IslandArtCode];
 const palette:LandmassPalette={top,topAlt:new T.Color(top).multiplyScalar(.9).getStyle(),edge:face,face,faceDark:dark,band:dark,maps:{set:city?'ashlar':'mossy-rock',tint:'#e6e8d9',repeat:.65},rough:.2,strata:.8};
 if(art)Object.assign(palette,{top:art.top,topAlt:art.topAlt,face:art.face,edge:art.topAlt,faceDark:art.dark,band:art.dark,maps:{set:art.map,tint:art.tint,repeat:.6}});
 const deck:DeckPalette={wood:'#927958',woodAlt:'#b49b70',rope:'#c9c3a0',stone:face,stoneAlt:dark,metal:'#557b78',accent:place.accent};
 return{id:'north-america-'+place.iso2.toLowerCase(),info:{title:place.title,license:'Original procedural geometry; CC0 surfaces listed in materials/LICENSES.md.',representation:'A fictional adventure inspired by '+place.landmark+'. Compressed landmark studies, original plants and stylized patrol characters.',landmarkSource:place.source,assets:[...place.features,'sculpted-trail-geology','articulated-'+place.creature]},
 lighting:{background:art?.background??'#c6e0df',exposure:1.05,sun:art?.sun??'#fff0cf',sunIntensity:art?.sunIntensity??3,sky:art?.horizon??'#e3efdf',ground:dark,hemisphere:1.5,pixelRatio:1.25,rim:'#f6edc8',rimIntensity:.6,reflections:{zenith:'#82b3be',horizon:'#e0e9d8',ground:dark,intensity:.3}},
 mechanisms:{stone:face,stoneDark:dark,trim:place.accent,glow:'#ffe092',metal:'#557b78'},ropeColor:'#c3c39a',hazardPalette:{column:'#e3f3e7',base:dark,warning:'#efb46c'},
 mount(context){
  const {finish,low}=context,shell=mountShell(context,{id:'north-america-'+place.iso2.toLowerCase(),name:code.toLowerCase()+'-landscape',background:art?.background??'#c6e0df',fog:[art?.horizon??'#d7e5d8',volcanic?75:100,280],sky:{zenith:art?.sky??'#77b3ce',horizon:art?.horizon??'#e3eddf',glow:'#fff0ce',sun:[-.45,.7,-.6],glowPower:35},clouds:{groups:low?5:9,high:[28,43],lowBand:volcanic?[-1,5]:[-12,-8],opacity:volcanic?.22:.35},layers:['foreground','playable-context',...place.features,'layered-vegetation','sky']});
  const {features}=shell;
  const sea=createWaterSurface(features,{name:wet?'tidal-mangrove-water':'caribbean-or-lake-water',x:finish/2,y:-7,z:-38,width:finish+120,depth:95,shallow:art?.water??waterColor,deep:art?.deep??'#347f99',segments:low?22:40,flow:[.006,.002]});shell.animate({update:t=>sea.update(t)});
  if(!sand&&!wet)createHeightfield(features,{name:code.toLowerCase()+'-distant-ridges',x:finish/2,y:-17,z:-95,width:finish+150,depth:65,segments:[low?44:72,low?14:24],height:ridgedRange(code.charCodeAt(0)*31,{peaks:7,height:fort?38:volcanic?26:15,sharpness:.65,width:.9}),color:mountainColor({snowLine:100,treeLine:70,rock:face,forest:dark,grass:'#7d9e70',snow:'#ffffff'})});
  for(let i=0;i<4;i++)createRockMass(features,{name:'landscape-shore-'+i,x:finish*(i+.5)/4,y:-6.8,z:-36,width:finish/4+15,depth:34,height:8,palette:{...palette,top:sand?'#ede4c6':art?.top??'#8fa676'},low,seed:103+i});
  const center=finish*.43;
  const mountainStudy=['DMA','NIC','LCA','VCT'].includes(code);
  const primary=islandLandmark(features,code,place.features[0],center,code==='PAN'?-2:city||fort?-4:-1,mountainStudy?-66:-26,low);
  if(mountainStudy)primary.scale.setScalar(.8);
  // A complete mountain group occurs once. Secondary features describe
  // the bay, forest or lake, not another copy of the entire destination.
  if(mountainStudy){
   const secondary=new T.Group();secondary.name=place.features[1];features.add(secondary);
   if(code==='LCA'||code==='NIC'){
    const bay=createWaterSurface(secondary,{name:code==='LCA'?'soufriere-bay-water':'lake-nicaragua-water',x:center,y:-6.5,z:-48,width:code==='LCA'?55:90,depth:22,shallow:art!.water,deep:art!.deep,segments:low?14:24,flow:[.003,.001]});shell.animate({update:t=>bay.update(t)});
   }else createRockMass(secondary,{name:code==='DMA'?'sulphur-valley-bank':'eroded-ash-bank',x:center+15,y:-6,z:-26,width:18,depth:12,height:4,palette:{...palette,top:code==='DMA'?'#b1ad7e':'#9c9989'},low,seed:851});
  }
  else{const secondary=islandLandmark(features,code,place.features[1],finish*.83,-5,-43,low);secondary.scale.setScalar(.6);}
  const tertiary=new T.Group();tertiary.name=place.features[2];features.add(tertiary);
  if(code==='PAN'){const cranes=new Builder();for(let i=0;i<5;i++){cranes.add(new T.BoxGeometry(.4,10,.4),'#b4a471',[finish*.7+i*7,0,-17]);cranes.add(new T.BoxGeometry(5,.3,.3),'#c5b57b',[finish*.7+i*7+2,5,-17]);}cranes.mesh(tertiary,vertexMaterial(.7),'canal-service-gantries');}
  else if(code==='DMA'||code==='VCT'){const steam=new Builder();for(let i=0;i<(low?8:16);i++)steam.add(new T.SphereGeometry(1,10,7),'#dbe5d5',[center+(i%4-1.5)*4,2+Math.floor(i/4)*2,-23-i%3*2],[0,0,0],[2.5,1.3,1.8]);const mist=steam.mesh(tertiary,vertexMaterial(1,{transparent:true,opacity:.26,depthWrite:false}),'fumarole-mist');shell.animate({update:t=>{mist.position.y=Math.sin(t*.3)*.25;}});}
  else{const bank=new Builder();for(let i=0;i<8;i++)bank.add(new T.SphereGeometry(1,12,8),sand?'#e5dcbe':'#83a574',[finish*.7+i*5,-5.5,-17-i%3*2],[0,0,0],[5,1.2,3]);bank.mesh(tertiary,vertexMaterial(.95),'shore-and-garden-terraces');}
  if(!sand&&code!=='PAN'&&code!=='TTO'&&code!=='VCT')createNorthAmericanForest(features,city?'MEX':code==='DMA'?'CRI':code==='HND'?'GTM':'JAM',finish,low,{clearings:code==='DMA'?[{minX:center-24,maxX:center+24,maxLayer:1}]:[],density:code==='NIC'?.55:1});
  if(code==='DMA'){
   // An open near-bank lake study: the forest clearing is authored around it.
   const basin=new Builder();basin.add(new T.TorusGeometry(11,1.6,10,40),'#aaa88a',[center,-5.8,-18],[Math.PI/2,0,0],[1,1,.5]);basin.mesh(features,vertexMaterial(.95),'boiling-lake-exposed-rim');
   const lake=createWaterSurface(features,{name:'boiling-lake-visible-water',x:center,y:-5.55,z:-18,width:19,depth:10,shallow:'#a6c4bb',deep:'#648b80',segments:low?14:24,flow:[.002,.001]});shell.animate({update:t=>lake.update(t)});
  }
  if(sand){const palms=new Builder(),r=random(781);for(let i=0;i<(low?10:18);i++){const x=r()*finish,z=-12-r()*38,h=4+r()*3;palms.add(new T.CylinderGeometry(.14,.25,h,8),'#9d9070',[x,-6+h/2,z]);for(let j=0;j<5;j++)palms.add(new T.SphereGeometry(1,10,6),'#759b68',[x+Math.cos(j*1.256),-6+h,z+Math.sin(j*1.256)],[0,-j*1.256,.2],[2.4,.12,.65]);}palms.mesh(features,vertexMaterial(.95),'cay-palms');}
  return shell.finish();
 },
 dressPlatform(root,p,context){
  if(p.type==='wooden-bridge'){clearPlatformRoot(root);woodenDeck(root,p);return;}
  if(p.motion||p.type==='bridge'||p.terrain==='canopy'){
   clearPlatformRoot(root);dressDeck(root,p,p.motion?'suspended':p.collapse?'log':p.terrain==='canopy'?'canopy-log':'rope',deck);
   const backing=new T.Mesh(new T.BoxGeometry(p.width,.1,Math.min(p.depth,3.1)),new T.MeshStandardMaterial({color:deck.wood,roughness:.95}));backing.position.y=-.08;backing.name='timber-deck-backing';root.add(backing);return;
  }
  if(art||code==='PAN')dressIslandGround(root,p,palette,context.low,code as IslandArtCode|'PAN');
  else dressNorthAmericanGround(root,p,city?'USA':'CRI',palette,context.low);
  if(sand){const cap=root.getObjectByName('country-platform-cap') as T.Mesh;const mat=cap.material as T.MeshStandardMaterial;mat.color.set('#eee3c3');}
 },
 createEnemy:parent=>createIslandCreature(parent,code),
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'stone',color:face,trim:place.accent,glyph:'#ffe092'}),
 decorateCheckpoint(marker){createBannerPost(marker,{pole:'#806d51',cloth:place.accent,accent:'#f9e8c0',height:2});},
 decorateFinish(gate){const arch=createArchway(gate,{style:city||fort||code==='HND'?'stone':'timber',width:3.4,height:3.4,stone:face,trim:place.accent});arch.position.set(0,0,-1.5);},
 };
}
