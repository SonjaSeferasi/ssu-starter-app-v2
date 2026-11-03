import * as T from 'three';
import {Builder,ellipsoid,matte,random,valueNoise,vertexMaterial,type Placement} from '../kit/common';
import {createHeightfield,gradientColor} from '../kit/landform';
import {createWaterSurface} from '../kit/water';
import {createCascade} from '../kit/cascade';
import {createDrift} from '../kit/particles';
import {createFlock} from '../kit/wildlife';
import {windBanners} from '../kit/wind';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {dressLandmass,rearSpots,type LandmassPalette} from '../kit/landmass';
import type {CountryEnvironment} from './types';
import {built,mountShell,roundCreature} from './south-america/shell';
import {plantFlora} from './south-america/flora';
import {createEscarpment,routeHeight} from './south-america/terrain';

/** Guyana — Kaieteur Falls: Potaro Gorge. A fictional route inspired by
 * Kaieteur National Park: the tea-coloured Potaro River slides over pink and
 * grey sandstone shelves on the plateau, then the trail follows the rim of the
 * gorge to viewpoints facing Kaieteur Falls, a single wide curtain dropping
 * into a forested amphitheatre, with giant tank bromeliads on the rim. */
const info={
 id:'guyana-kaieteur-falls',title:'Kaieteur Falls: Potaro Gorge',
 license:'Original procedural geometry; CC0 Poly Haven sandstone surface maps (see materials/LICENSES.md).',
 representation:'A fictional route inspired by Kaieteur Falls on the Potaro River. The falls, gorge and river shelves are stylized and distances are compressed; the current shelves are a game mechanism.',
 landmarkSource:'https://www.pac.gov.gy/kaieteur-national-park/',
 assets:['kaieteur-falls','potaro-river-gorge','tank-bromeliads','potaro-river','gorge-amphitheatre','plateau-scrub','river-current-shelves','spray-mist','swifts','golden-rocket-frogs','pakaraima-tableland','spray-banners'],
};
/** Kaieteur's rock: pink and grey sandstone and conglomerate, dark where wet. */
const sandstone:LandmassPalette={top:'#8f8a6a',topAlt:'#6f8a4a',edge:'#c9a993',face:'#b99482',faceDark:'#6f5248',band:'#d2b4a2',maps:{set:'sandstone-cliff',tint:'#ffe8e0',repeat:.55},rough:.28,strata:.75};
const wet:LandmassPalette={...sandstone,top:'#5f5448',topAlt:'#4f5a3f',edge:'#9a7a6a',face:'#8a6a5e',faceDark:'#4a3a34',rough:.32};
const mossy:LandmassPalette={...sandstone,top:'#56783a',topAlt:'#6f8f45',edge:'#8a9a5a'};
const bank:LandmassPalette={...sandstone,top:'#5f8a3f',topAlt:'#7aa04a',edge:'#9aa25a',rough:.2};
/** The far rim of the gorge, curving back into a horseshoe around the falls,
 * which pour from the back of the horseshoe just in front of its face. */
const FLOOR=-42,FALLS_X=72,farRim=(x:number)=>-44-18*Math.exp(-(((x-FALLS_X)/16)**2)),FALLS={x:FALLS_X,z:farRim(FALLS_X)+2.5,top:0,width:28};

/** A giant tank bromeliad (Brocchinia): a tall upright rosette with a water-filled cup. */
function tankRosette(b:Builder,x:number,y:number,z:number,s:number,r:()=>number){
 for(let i=0;i<14;i++){const a=i/14*Math.PI*2+r()*.2,leaf=new T.ConeGeometry(.2*s,1.9*s,4);leaf.translate(0,.95*s,0);b.add(leaf,i%3?'#8fae3a':'#c3c74a',[x+Math.cos(a)*.18*s,y,z+Math.sin(a)*.18*s],[Math.sin(a)*.32,a,Math.cos(a)*-.32],[1,1,.28]);}
 b.add(new T.CylinderGeometry(.22*s,.2*s,.06,10),'#4a3a20',[x,y+.9*s,z]);
}

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#a9cbe0',exposure:1,sun:'#fff1d6',sunIntensity:3,sky:'#e4eff4',ground:'#3f4a30',hemisphere:1.5,rim:'#dff4ff',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#4f8fc4',horizon:'#e4ecef',ground:'#3a3f2e',intensity:.35}},
 mount(context){
  const {finish,low,level}=context,shell=mountShell(context,{id:info.id,name:'guyana-kaieteur-environment',background:'#a9cbe0',fog:['#d4e2e6',70,280],overviewFog:[200,520],sky:{zenith:'#3f86c4',horizon:'#e8f0f2',band:'#d2e2ea',glow:'#fff6e2',sun:[-.5,.5,-.7],glowPower:18},clouds:{opacity:.85,high:[22,36],lowBand:[-20,-8],depth:[-40,-110],groups:22,shade:'#cbd8e0'},layers:['playable-shelves-and-gorge-rim','kaieteur-falls','gorge-amphitheatre','potaro-river-gorge','pakaraima-tableland','sky']});
  const {root,staticRoot,features}=shell,r=random(209),height=routeHeight(level);
  // The Potaro on the plateau, tea-coloured, running past the shelves.
  const riverTop=Math.max(...level.hazards.map(h=>h.y+h.height))-.05;
  const river=createWaterSurface(features,{x:16,y:riverTop,z:4,width:76,depth:20,shallow:'#b5823f',deep:'#5a3a1f',roughness:.14,segments:34,name:'potaro-river',flow:[.12,0],repeat:.1});
  // The gorge: a rim below the trail, a forested floor, and the far amphitheatre.
  const gorge=new T.Group();gorge.name='potaro-river-gorge';features.add(gorge);
  const cliff={rock:'#7a5e54',light:'#b99482',streak:'#d2b4a2',moss:'#4f6f35',scree:'#8a7a6a',stain:'#2a221e'};
  createEscarpment(gorge,{name:'gorge-rim-cliff',x0:-30,x1:finish+30,rim:x=>x<39?riverTop-.3:height(x)-3,floor:FLOOR,z:-6.5,colors:cliff,seed:31,low});
  createHeightfield(gorge,{name:'gorge-floor-forest',x:finish*.6,y:FLOOR-1,z:-34,width:finish+160,depth:60,segments:[low?50:110,low?16:30],height:(u,v)=>valueNoise(u*50,v*24,5)*3+valueNoise(u*12,v*8,7)*2,color:gradientColor([[0,'#2c5a2a'],[2.5,'#3a6a33'],[5,'#4f7a3a']])});
  const gorgeRiver=createWaterSurface(gorge,{x:finish*.6,y:FLOOR-.2,z:-40,width:finish+160,depth:6,shallow:'#a8783f',deep:'#4a301a',segments:20,name:'gorge-river',flow:[.05,0],repeat:.1});
  const canopy:Placement[]=[];for(let i=0;i<(low?26:70);i++)canopy.push({x:-10+r()*(finish+40),y:FLOOR+r()*1.5,z:-14-r()*30,scale:.8+r()*.5,rotation:r()*6,color:['#ffffff','#e2efc8','#cfe4d0'][i%3]});
  plantFlora(gorge,'emergent',canopy,{low:true,name:'gorge-rainforest-canopy'});
  // The amphitheatre: sandstone walls around the falls, the far rim behind.
  const amph=new T.Group();amph.name='gorge-amphitheatre';features.add(amph);
  createEscarpment(amph,{name:'far-gorge-rim',x0:-40,x1:finish+80,rim:x=>FALLS.top+(Math.abs(x-FALLS.x)<FALLS.width/2+2?0:.6+valueNoise(x*.05,2,9)*1.6),floor:FLOOR,z:farRim,colors:{...cliff,moss:'#3f6a33'},seed:57,low,recede:-3,flute:.7});
  // Rainforest on the far plateau, up to the rim.
  const rimForest:Placement[]=[];for(let i=0;i<(low?20:56);i++){const x=-30+r()*(finish+100);if(Math.abs(x-FALLS.x)<FALLS.width/2+4)continue;rimForest.push({x,y:FALLS.top-.6,z:farRim(x)-2-r()*22,scale:.7+r()*.4,rotation:r()*6,color:['#ffffff','#e2efc8','#d8e8c4'][i%3]});}
  plantFlora(amph,'emergent',rimForest,{low:true,name:'far-plateau-forest'});
  // Kaieteur Falls: one wide curtain, breaking into spray as it falls, with
  // the Potaro feeding it across the far plateau.
  const falls=new T.Group();falls.name='kaieteur-falls';features.add(falls);
  const cascade=createCascade(falls,{sites:[{x:FALLS.x,top:FALLS.top,bottom:FLOOR,z:FALLS.z,width:FALLS.width,channel:26,channelDirection:-1,spray:.3,lean:1.2,intensity:1}],low,tint:'#f4e6cf',name:'kaieteur-falls-water'});
  createWaterSurface(falls,{x:FALLS.x,y:FALLS.top+.05,z:FALLS.z-16,width:FALLS.width+6,depth:30,shallow:'#b5823f',deep:'#5a3a1f',segments:16,name:'upper-potaro',flow:[0,.08],repeat:.12});
  const plunge=createWaterSurface(falls,{x:FALLS.x,y:FLOOR+.3,z:FALLS.z+8,width:FALLS.width+16,depth:14,shallow:'#d8d4c4',deep:'#6a4a2a',segments:12,name:'plunge-pool',flow:[.02,.05],repeat:.2});
  // The Pakaraima tableland on the horizon, flat-topped.
  createHeightfield(features,{name:'pakaraima-tableland',x:finish/2,y:-2,z:-170,width:finish+460,depth:40,segments:[low?40:90,8],height:(u,v)=>Math.min(1,(1-v)*4)*(12+valueNoise(u*10,1,7)*4)+valueNoise(u*40,v*8,3)*1.5,color:gradientColor([[0,'#3f6a35'],[10,'#5a7a4a'],[16,'#8a7a62']])});
  // Plateau scrub and giant tank bromeliads behind the trail; golden frogs in a few.
  const scrub:Placement[]=[],grass:Placement[]=[];for(let i=0;i<(low?18:44);i++){const x=-8+r()*(finish+16),y=height(x)-.05;(r()<.5?scrub:grass).push({x,y,z:-2.6-r()*2.6,scale:.7+r()*.5,rotation:r()*6});}
  plantFlora(staticRoot,'tepui-shrub',scrub,{low,name:'plateau-scrub'});plantFlora(staticRoot,'grass-clump',grass,{low,name:'plateau-sedges'});
  const tanks=new Builder(),tankRoot=new T.Group();tankRoot.name='tank-bromeliads';features.add(tankRoot);
  for(const p of level.platforms.filter(p=>p.style==='tank-bromeliad'))tankRosette(tanks,p.x+p.width/2,p.y-.3,-1.6,1.1,r);
  for(let i=0;i<(low?8:20);i++){const x=36+r()*(finish-30);tankRosette(tanks,x,height(x)-.1,-2.4-r()*2.5,.9+r()*.6,r);}
  tanks.mesh(tankRoot,vertexMaterial(.75,{side:T.DoubleSide}),'giant-tank-bromeliads');
  const frog=new T.MeshStandardMaterial({color:'#ffcf1a',emissive:'#b38600',emissiveIntensity:.25,roughness:.4});
  for(let i=0;i<3;i++){const x=46+i*12;ellipsoid(tankRoot,frog,x,height(x)+.85,-2.6,.08,.06,.1,10).name='golden-rocket-frog';}
  const spray=level.zones?.[0],banners=spray?windBanners(root,[[spray.x+1,-1.9,-1.6],[spray.x+spray.width-1,.3,-1.6]],['#009e49','#fcd116']):null;
  const swifts=createFlock(root,{count:low?6:14,centre:[FALLS.x,-10,FALLS.z+14],radius:[18,10,6],speed:.14,size:.45,color:'#2a2a2a',wing:'#3a3a3a',seed:3,name:'white-collared-swifts'});
  const mist=createDrift(root,{kind:'mist',count:low?16:40,colors:['#f6f8f8'],x:[FALLS.x-20,FALLS.x+20],y:[FLOOR,FLOOR+18],z:[FALLS.z-2,FALLS.z+16],fall:-.25,sway:3,size:5,seed:5,name:'spray-mist'});
  const gorgeHaze=createDrift(root,{kind:'mist',count:low?10:24,colors:['#eef2f2'],x:[30,finish+20],y:[-30,-12],z:[-40,-12],fall:-.03,sway:2,size:5,seed:8,name:'gorge-haze'});
  void matte;
  // Current shelves were dressed before mount: animate their flowing water too.
  const currents:{update:(t:number)=>void}[]=[];context.scene.traverse(object=>{if(object.userData.current)currents.push(object.userData.current);});
  shell.animate({update:(t,signals)=>{river.update(t);cascade.update(t);plunge.update(t);gorgeRiver.update(t);for(const c of currents)c.update(t);swifts.update(t);const wind=signals?.wind.find(w=>w.id===spray?.id);banners?.update(t,wind?.phase==='gust'?wind.strength:0,wind?.phase==='warning');}});
  shell.animate({update:t=>{mist.update(t);gorgeHaze.update(t);},setVisible:v=>{mist.setVisible(v);gorgeHaze.setVisible(v);},motion:true});
  return shell.finish();
 },
 dressPlatform(root,definition,context){
  const low=context.low,w=definition.width,style=definition.style,seed=definition.id.length*41+Math.round(definition.x);
  if(style==='tank-bromeliad'){
   // A broad bromeliad crown on a short trunk: the cup is the landing.
   dressLandmass(root,definition,{...bank,top:'#8fae3a',topAlt:'#c3c74a',edge:'#a8b84a',face:'#5a7a3a',faceDark:'#3f5a2d',band:'#4f6a35',maps:undefined},{low,kind:'block',profile:'island',visualDepth:.45});
   built(root,'bromeliad-crown',(b,rr)=>{for(let i=0;i<12;i++){const a=i/12*Math.PI*2;if(Math.abs(Math.cos(a))>.75)continue;const leaf=new T.ConeGeometry(.24,1.5,4);leaf.rotateZ(-Math.PI/2);leaf.translate(.75,0,0);b.add(leaf,i%2?'#8fae3a':'#c3c74a',[0,-.2,0],[0,a,.3+rr()*.2],[1,.3,1]);}b.add(new T.CylinderGeometry(.18,.28,2.6,8),'#5a4a32',[0,-1.6,-.2]);},seed,.7);
   return;
  }
  // Plateau shelves and boulders widen into the river; the gorge-rim path,
  // spray ledges and viewpoints are ledges on the cliff, not walls.
  const riverTop=-.75,onRiver=style==='rainforest-bank'||style==='river-shelf'||style==='river-boulder'||style==='falls-rim';
  const palette=style==='rainforest-bank'?bank:definition.surface==='ice'||style==='river-shelf'?wet:style==='mossy-spray-ledge'||style==='falls-lookout'?mossy:sandstone;
  const details=dressLandmass(root,definition,palette,{low,kind:definition.terrain==='stairs'?'stairs':definition.terrain==='cliff'?'cliff':'ground',profile:onRiver?'mass':'shelf',visualDepth:onRiver?Math.max(.8,definition.y-riverTop+.6):definition.surface==='ice'||style==='mossy-spray-ledge'?2.4:3});
  if(definition.current){
   // Water sheeting over the shelf in the direction it carries you.
   const water=createWaterSurface(details,{x:0,y:.025,z:0,width:w-.1,depth:Math.max(2,definition.depth)-.1,shallow:'#c08a4a',deep:'#7a5a2f',opacity:.55,roughness:.1,segments:8,name:'shelf-current',flow:[Math.sign(definition.current)*.25,0],repeat:.4});
   details.userData.current=water;
   built(details,'current-foam',(b,rr)=>{for(let i=0;i<5;i++)b.add(new T.BoxGeometry(.4+rr()*.6,.012,.06),'#f2e8d6',[-w/2+.5+rr()*(w-1),.04,(rr()-.5)*1.4],[0,(rr()-.5)*.3,0]);},seed,.2);
  }
  if(definition.surface==='ice')built(details,'spray-sheen',(b,rr)=>{for(let i=0;i<4;i++)b.add(new T.BoxGeometry(.6+rr()*.6,.01,.8),'#d6e6ea',[-w/2+.4+rr()*(w-.8),.02,(rr()-.5)*1.2]);},seed,.05);
  if(style==='mossy-spray-ledge')built(details,'moss-cushions',(b,rr)=>{for(let i=0;i<5;i++)b.add(new T.IcosahedronGeometry(.22+rr()*.12,0),i%2?'#4f7a35':'#6a8f45',[-w/2+.3+rr()*(w-.6),-.12,.9+rr()*.2],[0,rr()*3,0],[1.5,.5,1]);},seed,.9);
  if(style==='rainforest-bank'||style==='falls-lookout')plantFlora(details,'heliconia',rearSpots(definition,Math.max(1,Math.floor(w/3)),seed).map(s=>({x:s.x,y:s.y,z:Math.min(-1.6,s.z),scale:.7+s.r*.3,rotation:s.r*6})),{low});
 },
 createEnemy:parent=>roundCreature(parent,{name:'guyana-rock-frog',height:.7,shell:'#ffcf1a',belly:'#fff0a0',foot:'#c99a10',eye:'#101010',crest:(_rig,b)=>{for(const s of [-1,1]){const eye=new T.Mesh(new T.SphereGeometry(.1,10,8),matte('#ffd84a'));eye.position.set(s*.13,.66,.12);b.add(eye);}},animate:(rig,time,_s,moving)=>{rig.body.scale.y=1+(moving?Math.abs(Math.sin(time*7))*.12:0);}}),
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'wood',color:'#9b7a55',trim:'#009e49',glyph:'#fcd116'}),
 decorateCheckpoint(marker){const banner=createBannerPost(marker,{pole:'#5a3a20',cloth:'#009e49',accent:'#fcd116',height:2.1,cap:'#ce1126'});banner.position.set(-.45,0,-.2);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'jungle',width:3.4,height:3.4,stone:'#6f5034',trim:'#009e49'});arch.position.set(0,0,-1.55);},
};
