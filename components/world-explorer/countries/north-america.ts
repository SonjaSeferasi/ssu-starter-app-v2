import * as T from 'three';
import {northAmericaPlaces,type NorthAmericaCode} from '../../../lib/world-explorer/north-america';
import {Builder,vertexMaterial,random,v3} from '../kit/common';
import {createHeightfield,ridgedRange,mountainColor} from '../kit/landform';
import {createWaterSurface,createWaterfall,createShoreFoam} from '../kit/water';
import {clearPlatformRoot,createRockMass,localSurface,type LandmassPalette} from '../kit/landmass';
import {dressDeck,type DeckPalette} from '../kit/bridges';
import {woodenDeck} from '../kit/wooden-deck';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {mountShell} from './south-america/shell';
import {mayaTemple,mayaObservatory} from './north-america-landmarks';
import {createNorthAmericanForest} from './north-america-forest';
import {dressNorthAmericanGround} from './north-america-ground';
import {createNorthAmericanCreature} from './north-america-creatures';
import type {CountryEnvironment} from './types';

type Code=Exclude<NorthAmericaCode,'CAN'|'USA'>;
const colors:Record<Code,[string,string,string,string]>={MEX:['#a9b97d','#b8b9a7','#78846c','#5daaa7'],GTM:['#8ba56e','#a8b2a0','#516c56','#4f8d82'],CRI:['#789d75','#a2b49d','#496e60','#65a4a1'],JAM:['#a9c58b','#c9cbb2','#7a9483','#68c3b9']};
const deck:DeckPalette={wood:'#8d7556',woodAlt:'#ac9570',rope:'#c9c8a3',stone:'#b8bba8',stoneAlt:'#8e9a83',metal:'#4d7774',accent:'#dfc777'};
export function northAmericaEnvironment(code:Code):CountryEnvironment{
 const place=northAmericaPlaces[code],[top,face,dark,waterColor]=colors[code],warm=code==='MEX';
 const palette:LandmassPalette={top,topAlt:new T.Color(top).multiplyScalar(.85).getStyle(),edge:face,face,faceDark:dark,band:dark,maps:{set:warm?'ashlar':'mossy-rock',tint:'#e1e8d8',repeat:.6},rough:.24,strata:.8};
 return{id:'north-america-'+place.iso2.toLowerCase(),
 info:{title:place.title,license:'Original reference-informed procedural geometry; CC0 surface maps listed in materials/LICENSES.md.',representation:'A fictional platform course inspired by '+place.landmark+'. Monument and vegetation studies are compressed, stylized original geometry.',landmarkSource:place.source,assets:[...place.features,'sculpted-rock-shoulders','layered-vegetation','country-patrol-creature']},
 lighting:{background:warm?'#c7dfdf':'#c5dbd6',exposure:1.08,sun:warm?'#fff0cb':'#fff3d7',sunIntensity:3,sky:'#e6f1e7',ground:dark,hemisphere:1.5,pixelRatio:1.25,rim:'#edf5cf',rimIntensity:.65,reflections:{zenith:'#7ba6b0',horizon:'#e0eada',ground:dark,intensity:.3}},
 mechanisms:{stone:face,stoneDark:dark,trim:'#c8c4a0',glow:'#ffdd74',metal:'#4f7574'},ropeColor:'#b9c59c',hazardPalette:{column:'#d9f3e7',base:dark,warning:'#ffc878'},
 mount(context){
  const {finish,low,level}=context,shell=mountShell(context,{id:'north-america-'+place.iso2.toLowerCase(),name:code.toLowerCase()+'-landscape',background:warm?'#c7dfdf':'#c5dbd6',fog:[warm?'#dce5d4':'#c6ddd2',code==='CRI'?38:70,code==='CRI'?180:250],sky:{zenith:warm?'#66a7ce':'#80b2bf',horizon:'#e2ebdc',glow:'#fff4d6',sun:[-.45,.7,-.6],glowPower:35},clouds:{groups:low?5:9,high:[27,41],lowBand:code==='CRI'?[-2,3]:[-12,-8],opacity:code==='CRI'?.16:.4},layers:['foreground','playable-context',...place.features,'layered-forest','sky']});
  const {features}=shell,r=random(code.charCodeAt(0)*73),groundY=code==='MEX'?-4:-6;
  const water=(name:string,x:number,y:number,z:number,width:number,depth:number)=>{
   const surface=createWaterSurface(features,{name,x,y,z,width,depth,shallow:waterColor,deep:code==='MEX'?'#286c72':'#468c83',segments:low?18:36,flow:[.007,.003]});shell.animate({update:t=>surface.update(t)});
  };
  createRockMass(features,{name:'forested-valley-ground',x:finish/2,y:groundY,z:-35,width:finish+65,depth:50,height:12,palette:{...palette,top:code==='MEX'?'#a8b779':top},low,seed:334});
  if(code==='MEX'){
   mayaTemple(features,'el-castillo',finish*.31,groundY,-41,.95,false);mayaObservatory(features,finish*.83);
   water('cenote-water',33,-2.2,-5,29,19);
   for(let i=0;i<9;i++){
    const a=Math.PI*.1+i/8*Math.PI*.8,x=33+Math.cos(a)*12,z=-10-Math.sin(a)*6;
    createRockMass(features,{name:'cenote-limestone-rim-'+i,x,y:-2.4-r()*.3,z,width:4.2,depth:4,height:5,palette,low,seed:701+i});
   }
   const court=new Builder(.6);
   for(let i=0;i<12;i++){const x=48+i*3.1;court.add(new T.CylinderGeometry(.36,.48,3.5,12),'#b9bfac',[x,-2.25,-17]);court.add(new T.BoxGeometry(1.25,.3,1.25),'#d9dbca',[x,-.35,-17]);court.add(new T.BoxGeometry(1.4,.24,1.4),'#919f88',[x,-3.88,-17]);}
   court.mesh(features,vertexMaterial(.95),'limestone-column-court');
  }else if(code==='GTM'){
   createRockMass(features,{name:'temple-clearing-plinth',x:finish*.62,y:-4.2,z:-40,width:25,depth:24,height:7,palette,low,seed:64});
   mayaTemple(features,'tikal-temple-skyline',finish*.62,-4.2,-40,.96,true);mayaTemple(features,'tikal-distant-temple',finish*.1,-6,-68,.65,true);
   water('forest-reservoir',54,-3.8,-14,36,19);
   const ruins=new Builder(.65);for(let i=0;i<8;i++){const x=4+i*13;ruins.add(new T.BoxGeometry(2.5,.4,2),'#a1ae98',[x,-3.8,-11]);ruins.add(new T.BoxGeometry(.85,1.8,.45),'#92a18b',[x,-2.8,-11]);}ruins.mesh(features,vertexMaterial(.98),'tikal-stelae-and-plaza-ruins');
  }else{
   createHeightfield(features,{name:code==='CRI'?'cloud-forest-ridges':'river-valley-ridges',x:finish/2,y:-17,z:-85,width:finish+170,depth:85,segments:[low?48:85,low?16:30],height:ridgedRange(code==='CRI'?31:54,{peaks:7,height:code==='CRI'?32:24,sharpness:.65,width:.9}),color:mountainColor({snowLine:100,treeLine:70,rock:face,forest:dark,grass:top,snow:'#ffffff'})});
   water(code==='JAM'?'caribbean-shore':'forest-stream',finish/2,-7,-27,finish+100,45);
   if(code==='JAM'){
    const pools=new T.Group();pools.name='river-pools';features.add(pools);const cascades=new T.Group();cascades.name='terraced-cascades';features.add(cascades);
    for(let i=0;i<6;i++){
     const x=12+i*16,y=-3.3+i*1.15;
     createRockMass(cascades,{name:'rounded-travertine-terrace-'+i,x,y,z:-9.8,width:20,depth:11,height:4,palette:{...palette,top:'#cddcc1',face:'#d1d2b7',edge:'#e0dfc6'},low,seed:571+i});
     water('river-pool-'+i,x,y+.035,-8,14,7);
     for(let ribbon=0;ribbon<3;ribbon++){
      const falls=createWaterfall(cascades,{x:x-5+ribbon*4.5,top:y,z:-4.4,width:2.5+(ribbon%2)*1.6,height:3.1,seed:861+i*3+ribbon,low,tint:'#eef8ec',glow:waterColor});shell.animate({update:t=>falls.update(t)});
     }
    }
    const foam=createShoreFoam(features,Array.from({length:6},(_,i)=>({x:12+i*16,y:-6.95,z:-3.8,size:1.5})),low);shell.animate({update:t=>foam.update(t)});
   }else{
    const bridge=level.platforms.find(p=>p.type==='bridge'||p.type==='wooden-bridge')!,b=new Builder();
    for(const x of [bridge.x,bridge.x+bridge.width])for(const z of [-2.1,2.1]){b.add(new T.BoxGeometry(.2,8,.2),'#427d70',[x,bridge.y-1,z]);b.add(new T.BoxGeometry(.35,.25,4.8),'#6da395',[x,bridge.y+3,z]);}
    b.mesh(features,vertexMaterial(.6,{metalness:.3}),'hanging-bridge-supports');
   }
  }
  createNorthAmericanForest(features,code,finish,low);
  return shell.finish();
 },
 dressPlatform(root,definition,context){
  if(definition.type==='wooden-bridge'){
   clearPlatformRoot(root);woodenDeck(root,definition);
   root.traverse(o=>{if(o instanceof T.Mesh)for(const material of Array.isArray(o.material)?o.material:[o.material])if(material instanceof T.MeshStandardMaterial){material.color.set('#548e79');material.metalness=.24;material.roughness=.62;}});
   const net=new Builder(),surface=localSurface(definition),w=definition.width;
   for(const z of [-1.42,1.42])for(let x=-w/2+.2;x<w/2;x+=.45)net.strut(v3(x,surface(x)+.08,z),v3(x,surface(x)+.69,z),.012,'#427b66',4);
   net.mesh(root,vertexMaterial(.65,{metalness:.2}),'green-suspension-bridge-mesh');return;
  }
  if(definition.motion||definition.type==='bridge'||definition.terrain==='canopy'){
   clearPlatformRoot(root);dressDeck(root,definition,definition.motion?'suspended':definition.collapse?'log':definition.terrain==='canopy'?'canopy-log':'rope',deck);
   const backing=new T.Mesh(new T.BoxGeometry(definition.width,.1,Math.min(definition.depth,3.1)),new T.MeshStandardMaterial({color:deck.wood,roughness:.95}));backing.position.y=-.08;backing.name='timber-deck-backing';root.add(backing);return;
  }
  dressNorthAmericanGround(root,definition,code,palette,context.low);
 },
 createEnemy:parent=>createNorthAmericanCreature(parent,code),
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'stone',color:face,trim:'#bac49c',glyph:'#ffe192'}),
 decorateCheckpoint(marker){createBannerPost(marker,{pole:'#745f46',cloth:waterColor,accent:'#f9e4ab',height:2});},
 decorateFinish(gate){const arch=createArchway(gate,{style:code==='MEX'||code==='GTM'?'stone':'timber',width:3.4,height:3.4,stone:face,trim:dark});arch.position.set(0,0,-1.5);},
 };
}
