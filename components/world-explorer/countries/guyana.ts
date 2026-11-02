import * as T from 'three';
import {Builder,ellipsoid,matte,random,valueNoise,vertexMaterial,type Placement} from '../kit/common';
import {createHeightfield,gradientColor} from '../kit/landform';
import {createWaterSurface,createWaterfall} from '../kit/water';
import {plantGrove} from '../kit/vegetation';
import {createDrift} from '../kit/particles';
import {createFlock} from '../kit/wildlife';
import {windBanners} from '../kit/wind';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {dressLandmass,rearSpots,type LandmassPalette} from '../kit/landmass';
import type {CountryEnvironment} from './types';
import {built,mountShell,roundCreature} from './south-america/shell';

/** Guyana — Kaieteur Falls: Potaro Gorge. A fictional route inspired by
 * Kaieteur Falls: the tea-coloured Potaro River sliding over sandstone shelves
 * to a single tall drop into a forested gorge, with giant tank bromeliads on
 * the spray-soaked rim. */
const info={
 id:'guyana-kaieteur-falls',title:'Kaieteur Falls: Potaro Gorge',
 license:'Original procedural geometry; CC0 Poly Haven sandstone surface maps (see materials/LICENSES.md).',
 representation:'A fictional route inspired by Kaieteur Falls on the Potaro River. The falls, gorge and river shelves are stylized; the current shelves are a game mechanism.',
 landmarkSource:'https://www.pac.gov.gy/kaieteur-national-park/',
 assets:['kaieteur-falls','potaro-river-gorge','tank-bromeliads','river-current-shelves','spray-mist','swifts','rainforest-canopy','spray-banners'],
};
const sandstone:LandmassPalette={top:'#9a8a6a',topAlt:'#7a8a55',edge:'#c9a98a',face:'#b9937a',faceDark:'#7a5a48',band:'#a37f68',maps:{set:'sandstone-cliff',tint:'#ffe6dc',repeat:.55},rough:.28,strata:.6};
const wet:LandmassPalette={...sandstone,top:'#6a5a4a',topAlt:'#5a6a45',face:'#8a6a5a',faceDark:'#4a3a32',rough:.32};
const bank:LandmassPalette={...sandstone,top:'#5f8a3f',topAlt:'#7aa04a',rough:.18};

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#a9cbe0',exposure:1,sun:'#fff3dc',sunIntensity:3,sky:'#e4eff4',ground:'#3f4a30',hemisphere:1.45,rim:'#dff4ff',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#4f8fc4',horizon:'#e4ecef',ground:'#3a3f2e',intensity:.35}},
 mount(context){
  const {finish,low,level}=context,shell=mountShell(context,{id:info.id,name:'guyana-kaieteur-environment',background:'#a9cbe0',fog:['#d8e4e8',50,200],sky:{zenith:'#3f86c4',horizon:'#e8f0f2',band:'#d2e2ea',glow:'#fff6e2',sun:[-.5,.5,-.7],glowPower:18},clouds:{opacity:.85,high:[20,34],groups:18,shade:'#cbd8e0'},layers:['playable-shelves-and-cliff-path','kaieteur-falls','potaro-river-gorge','rainforest-canopy','tableland-horizon','sky']});
  const {root,staticRoot,features}=shell,r=random(209);
  const riverTop=Math.max(...level.hazards.map(h=>h.y+h.height))-.05;
  const river=createWaterSurface(features,{x:22,y:riverTop,z:-6,width:80,depth:40,shallow:'#a8783f',deep:'#5a3a1f',roughness:.15,segments:30,name:'potaro-river',flow:[.12,0],repeat:.1});
  // The falls: the river pours off the rim in one tall sheet into the gorge.
  const brink=level.platforms.find(p=>p.id==='gy-brink')!,falls=new T.Group();falls.name='kaieteur-falls';features.add(falls);
  const sheet=createWaterfall(falls,{x:brink.x+brink.width/2+4,top:brink.y-.2,z:-14,width:14,height:34,seed:9,low,tint:'#f2e2c8',glow:'#a8783f'});
  built(falls,'falls-lip',b=>{b.add(new T.BoxGeometry(18,3,10),'#7a5a48',[brink.x+brink.width/2+4,brink.y-1.6,-19]);},2);
  const gorge=new T.Group();gorge.name='potaro-river-gorge';features.add(gorge);
  createHeightfield(gorge,{name:'gorge-forest',x:finish*.65,y:-34,z:-30,width:finish+140,depth:60,segments:[low?50:110,low?16:30],height:(u,v)=>Math.abs(v-.45)**1.2*60+valueNoise(u*40,v*20,5)*4,color:gradientColor([[0,'#2f5a2d'],[18,'#3f6a35'],[30,'#7a5a48']])});
  createWaterSurface(gorge,{x:finish*.65,y:-33,z:-30,width:finish+140,depth:6,shallow:'#a8783f',deep:'#5a3a1f',segments:16,name:'gorge-river',flow:[.05,0],repeat:.1});
  createHeightfield(features,{name:'tableland-horizon',x:finish/2,y:-4,z:-140,width:finish+400,depth:40,segments:[low?40:80,8],height:(u,v)=>v*10+valueNoise(u*12,v*4,7)*3,color:gradientColor([[0,'#3f6a35'],[10,'#5a7a4a']])});
  const canopy:Placement[]=[];for(let i=0;i<(low?20:50);i++)canopy.push({x:-10+r()*(finish+20),y:-9-r()*3,z:-34-r()*36,scale:.8+r()*.4,rotation:r()*6});
  plantGrove(staticRoot,'kapok',canopy,{low,name:'rainforest-canopy'});
  // Giant tank bromeliads on the rim; golden frogs sit in a few of them.
  const tanks=new Builder(),tankRoot=new T.Group();tankRoot.name='tank-bromeliads';features.add(tankRoot);
  const rosette=(x:number,y:number,z:number,s:number)=>{for(let i=0;i<12;i++){const a=i/12*Math.PI*2,leaf=new T.ConeGeometry(.22*s,1.6*s,4);leaf.rotateZ(-Math.PI/2);leaf.translate(.8*s,0,0);tanks.add(leaf,i%2?'#6f9a3a':'#a8b84a',[x,y+.3*s,z],[0,a,.5],[1,.3,1]);}};
  for(const p of level.platforms.filter(p=>p.style==='tank-bromeliad'))rosette(p.x+p.width/2,p.y-.9,-1.4,1.3);
  for(let i=0;i<(low?6:14);i++)rosette(brink.x+r()*24,-1.9+(r()<.5?2.6:0),-3-r()*3,.8+r()*.5);
  tanks.mesh(tankRoot,vertexMaterial(.8,{side:T.DoubleSide}),'giant-tank-bromeliads');
  for(let i=0;i<3;i++)ellipsoid(tankRoot,new T.MeshStandardMaterial({color:'#ffcf1a',emissive:'#b38600',emissiveIntensity:.2,roughness:.4}),brink.x+12+i*5,-1.6,-2.8,.08,.06,.1,10).name='golden-rocket-frog';
  const spray=level.zones?.[0],banners=spray?windBanners(root,[[spray.x+1,-1.9,-1.6],[spray.x+spray.width-1,.3,-1.6]],['#009e49','#fcd116']):null;
  const swifts=createFlock(root,{count:low?5:12,centre:[brink.x+10,4,-12],radius:[16,4,5],speed:.14,size:.4,color:'#2a2a2a',wing:'#3a3a3a',seed:3,name:'white-collared-swifts'});
  const mist=createDrift(root,{kind:'mist',count:low?16:40,colors:['#f6f8f8'],x:[brink.x-4,brink.x+40],y:[-4,6],z:[-16,0],fall:-.15,sway:2.4,size:2.6,seed:5,name:'spray-mist'});
  void matte;
  // Current shelves were dressed before mount: animate their flowing water too.
  const currents:{update:(t:number)=>void}[]=[];context.scene.traverse(object=>{if(object.userData.current)currents.push(object.userData.current);});
  shell.animate({update:(t,signals)=>{river.update(t);sheet.update(t);for(const c of currents)c.update(t);swifts.update(t);const wind=signals?.wind.find(w=>w.id===spray?.id);banners?.update(t,wind?.phase==='gust'?wind.strength:0,wind?.phase==='warning');}});
  shell.animate({update:t=>mist.update(t),setVisible:v=>mist.setVisible(v),motion:true});
  return shell.finish();
 },
 dressPlatform(root,definition,context){
  const low=context.low,w=definition.width,style=definition.style,seed=definition.id.length*41+Math.round(definition.x);
  if(style==='tank-bromeliad'){dressLandmass(root,definition,{...bank,top:'#6f9a3a',topAlt:'#a8b84a',face:'#5a7a3a',faceDark:'#3f5a2d',band:'#4f6a35',maps:undefined},{low,kind:'block'});return;}
  const details=dressLandmass(root,definition,style==='rainforest-bank'?bank:definition.surface==='ice'||style==='river-shelf'?wet:sandstone,{low,kind:definition.terrain==='cliff'?'cliff':definition.terrain==='stairs'?'stairs':'ground'});
  if(definition.current){
   // Water sheeting over the shelf in the direction it carries you.
   const water=createWaterSurface(details,{x:0,y:.025,z:0,width:w-.1,depth:Math.max(2,definition.depth)-.1,shallow:'#b8884a',deep:'#7a5a2f',opacity:.55,roughness:.1,segments:8,name:'shelf-current',flow:[Math.sign(definition.current)*.25,0],repeat:.4});
   details.userData.current=water;
  }
  if(definition.surface==='ice')built(details,'spray-sheen',(b,rr)=>{for(let i=0;i<4;i++)b.add(new T.BoxGeometry(.6+rr()*.6,.01,.8),'#cfe2e8',[-w/2+.4+rr()*(w-.8),.02,(rr()-.5)*1.2]);},seed,.05);
  if(style==='rainforest-bank'||style==='falls-lookout')plantGrove(details,'understory',rearSpots(definition,Math.floor(w/3),seed).map(s=>({x:s.x,y:s.y,z:Math.min(-1.2,s.z),scale:.9})),{low});
 },
 createEnemy:parent=>roundCreature(parent,{name:'guyana-rock-frog',height:.7,shell:'#ffcf1a',belly:'#fff0a0',foot:'#c99a10',eye:'#101010',crest:(_rig,b)=>{for(const s of [-1,1]){const eye=new T.Mesh(new T.SphereGeometry(.1,10,8),matte('#ffd84a'));eye.position.set(s*.13,.66,.12);b.add(eye);}},animate:(rig,time,_s,moving)=>{rig.body.scale.y=1+(moving?Math.abs(Math.sin(time*7))*.12:0);}}),
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'wood',color:'#9b7a55',trim:'#009e49',glyph:'#fcd116'}),
 decorateCheckpoint(marker){const banner=createBannerPost(marker,{pole:'#5a3a20',cloth:'#009e49',accent:'#fcd116',height:2.1,cap:'#ce1126'});banner.position.set(-.45,0,-.2);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'jungle',width:3.4,height:3.4,stone:'#6f5034',trim:'#009e49'});arch.position.set(0,0,-1.55);},
};
