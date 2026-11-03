import * as T from 'three';
import {oceaniaPlaces} from '../../../lib/world-explorer/oceania';
import {melanesiaArt,type MelanesiaCode} from '../../../lib/world-explorer/melanesia';
import {Builder,vertexMaterial} from '../kit/common';
import {createHeightfield,ridgedRange,mountainColor,rollingHills} from '../kit/landform';
import {createWaterSurface} from '../kit/water';
import {dressLandmass,clearPlatformRoot,type LandmassPalette} from '../kit/landmass';
import {dressTerrain,type TerrainPreset} from '../kit/terrain';
import {dressDeck,type DeckPalette} from '../kit/bridges';
import {woodenDeck} from '../kit/wooden-deck';
import {createBannerPost,createDiscoveryCrate,createArchway} from '../kit/markers';
import {mountShell,roundCreature} from './south-america/shell';
import {melanesiaLandmarks} from './melanesia-landmarks';
import type {CountryEnvironment} from './types';

export function melanesiaEnvironment(code:MelanesiaCode):CountryEnvironment{
 const place=oceaniaPlaces[code],a=melanesiaArt[code],inland=code==='PNG',port=code==='FJI';
 const land:LandmassPalette={top:a.top,topAlt:a.alt,face:a.face,edge:a.alt,faceDark:a.dark,band:a.dark,rough:port?.12:.28,strata:.65,maps:{set:a.map,tint:code==='PNG'?'#bcc6a4':'#e1e2d0',repeat:.65}};
 const deck:DeckPalette={wood:code==='PNG'?'#8b7e57':'#a38c64',woodAlt:'#c3ad82',rope:'#c9c6a1',stone:a.face,stoneAlt:a.dark,metal:port?'#6b8e88':'#7a8774',accent:place.palette.accent};
 return{id:'oceania-'+place.iso2.toLowerCase(),info:{title:place.title,license:'Original procedural geometry; CC0 surface library and separately attributed reference photographs.',landmarkSource:place.source,representation:'A fictional route inspired by '+place.landmark+'. The named heritage setting is scenery, not a surveyed route or an interactive monument.',assets:[...place.features,place.scene.landmark,a.material,'single-destination-composition']},
 lighting:{background:a.background,exposure:1.05,sun:a.sun,sunIntensity:a.intensity,sky:a.horizon,ground:a.dark,hemisphere:1.5,rim:'#eef2ce',rimIntensity:.45,pixelRatio:1.25,reflections:{zenith:a.sky,horizon:a.horizon,ground:a.dark,intensity:.3}},
 mechanisms:{stone:a.face,stoneDark:a.dark,trim:place.palette.accent,glow:'#ffe4a0',metal:'#65847c'},ropeColor:'#c6c49b',hazardPalette:{column:'#dfebe0',base:a.dark,warning:'#f2cd83'},
 mount(context){
  const {finish,low}=context,shell=mountShell(context,{id:'oceania-'+place.iso2.toLowerCase(),name:code.toLowerCase()+'-melanesian-landscape',background:a.background,fog:[a.horizon,inland?62:85,280],sky:{zenith:a.sky,horizon:a.horizon,glow:a.sun,sun:[-.5,.65,-.7],glowPower:30},clouds:{groups:low?5:8,high:[28,42],lowBand:inland?[-2,3]:[-14,-10],opacity:inland?.22:.4},layers:['foreground','playable-context',place.scene.landmark,a.material,'regional-landscape','sky']});
  const {features}=shell;
  createHeightfield(features,{name:code.toLowerCase()+'-regional-landforms',x:finish/2,y:inland?-12:-9,z:inland?-70:-84,width:finish+150,depth:60,segments:[low?40:72,low?16:28],height:inland?ridgedRange(341,{peaks:6,height:28,sharpness:.65,width:.9}):port?ridgedRange(376,{peaks:5,height:25,sharpness:.6,width:1}):rollingHills(330+code.charCodeAt(0),code==='SLB'?9:13,2.5),color:mountainColor({snowLine:100,treeLine:80,rock:a.face,forest:code==='SLB'?'#376e4c':a.dark,grass:a.top,snow:'#ffffff'})});
  if(!inland){const water=createWaterSurface(features,{name:code==='SLB'?'lake-tegano-brackish-water':'melanesian-coastal-water',x:finish/2,y:-5.7,z:0,width:finish+180,depth:150,shallow:a.water,deep:a.deep,segments:low?20:36,flow:code==='SLB'?[.002,.001]:[.006,.002]});shell.animate({update:t=>water.update(t)});}
  createHeightfield(features,{name:inland?'wahgi-valley-continuous-garden-ground':'forested-shore-bank',x:finish/2,y:inland?-5:-5.5,z:inland?-12:-31,width:finish+80,depth:inland?55:26,segments:[low?28:50,low?10:18],height:(u,v)=>.15*Math.sin(u*30+v*4)+(inland?.15:.4)*v,color:()=>new T.Color(a.top)});
  const study=melanesiaLandmarks(features,code,finish,low,land);study.root.name=place.scene.landmark;for(const item of study.animated)shell.animate({update:t=>item.update(t)});
  return shell.finish();
 },
 dressPlatform(root,p,context){
  if(p.type==='wooden-bridge'){clearPlatformRoot(root);woodenDeck(root,p);return;}
  if(p.motion||p.type==='bridge'||p.type==='wooden-moving'||p.terrain==='bridge'||p.terrain==='water-raft'||p.terrain==='mechanical'){
   clearPlatformRoot(root);dressDeck(root,p,p.motion==='vertical'?'dock-lift':p.terrain==='water-raft'?'raft':p.motion?'suspended':'timber',deck);
   const backing=new T.Mesh(new T.BoxGeometry(p.width,.1,Math.min(3.1,p.depth)),new T.MeshStandardMaterial({color:deck.wood,roughness:.9}));backing.position.y=-.08;backing.name='melanesian-timber-backing';root.add(backing);return;
  }
  const stone=port&&['rooftop','terrace','stairs'].includes(p.terrain??''),palette=stone?{...land,top:'#c6c7af',topAlt:'#aeb99e',maps:{set:'ashlar' as const,tint:'#e5e1ce',repeat:.65}}:land;
  dressLandmass(root,p,palette,{low:context.low,kind:p.steps?'stairs':stone?'block':'cliff',profile:stone?'wall':p.route==='upper'||p.route==='bonus'?'shelf':'mass',visualDepth:Math.min(p.thickness,stone?3:6)});
  const preset:TerrainPreset={id:'melanesia-'+code,shape:stone?'masonry':'rock',rock:{light:palette.face,dark:palette.faceDark,crack:palette.band,top:palette.top,topDepth:.06,strata:.65},cap:{kind:stone?'paving':inland?'earth':'grass',a:palette.top,b:palette.topAlt,c:palette.edge,path:stone?.7:inland?.45:.25},rim:{kind:stone?'curb':'moss',color:palette.topAlt,alt:palette.edge,size:stone?.2:.35},...(!stone?{blades:{color:inland?'#618d4c':'#6a9454',alt:palette.topAlt,height:.35,density:inland?.6:1},ferns:code==='SLB'?'#4d8653':undefined}:{}),pebbles:palette.edge};
  const staging=new T.Group(),sample=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshStandardMaterial());sample.name='country-platform-cap';staging.add(sample);
  const detail=dressTerrain(staging,{...p,thickness:Math.min(p.thickness,4)},preset,{quality:context.low?'low':'standard',sparse:!!p.slope,lush:code==='SLB'}),cap=root.getObjectByName('country-platform-cap') as T.Mesh;
  for(const m of Array.isArray(cap.material)?cap.material:[cap.material])m.dispose();cap.material=sample.material;sample.geometry.dispose();sample.removeFromParent();root.add(detail);
 },
 createEnemy(parent){
  return roundCreature(parent,{name:'melanesia-'+code.toLowerCase()+'-fictional-patrol',height:.65,shell:code==='PNG'?'#7b9854':code==='SLB'?'#b4ab85':code==='VUT'?'#9d8660':'#ba9d60',belly:'#e3d5ad',foot:'#665c48',crest(rig){const b=new Builder();if(code==='FJI')b.add(new T.BoxGeometry(.3,.2,.22),'#b6995e',[0,.6,-.03]);else if(code==='PNG'){b.add(new T.SphereGeometry(1,12,7),'#6d9d4c',[0,.6,-.07],[.5,0,.2],[.23,.035,.32]);}else if(code==='SLB')for(let i=0;i<5;i++)b.add(new T.SphereGeometry(.05,8,5),'#d4c7a4',[(i-2)*.07,.55,-.04]);else b.add(new T.CylinderGeometry(.08,.1,.38,9),'#8f7751',[0,.55,-.08],[0,0,Math.PI/2]);b.mesh(rig.body,vertexMaterial(.9),'country-specific-patrol-crest');}});
 },
 createDiscoveryBlock:(parent,w,h)=>createDiscoveryCrate(parent,w,h,{body:port?'wood':'stone',color:port?deck.wood:a.face,trim:place.palette.accent,glyph:'#ffe4a0'}),
 decorateCheckpoint(marker){createBannerPost(marker,{pole:deck.wood,cloth:place.palette.accent,accent:'#f4e6b3',height:1.7});},
 decorateFinish(gate){const arch=createArchway(gate,{style:'timber',width:3.4,height:3.4,stone:a.face,trim:place.palette.accent});arch.position.z=-1.5;},
 };
}
