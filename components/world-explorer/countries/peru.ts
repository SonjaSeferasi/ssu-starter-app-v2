import * as T from 'three';
import {Builder,ellipsoid,matte,random,scatter,standard,v3,valueNoise,vertexMaterial,type Placement} from '../kit/common';
import {createHeightfield,gradientColor,mountainColor,ridgedRange} from '../kit/landform';
import {createWaterSurface} from '../kit/water';
import {plantGrove} from '../kit/vegetation';
import {createDrift} from '../kit/particles';
import {createFlock} from '../kit/wildlife';
import {windBanners} from '../kit/wind';
import {dressDeck,type DeckPalette} from '../kit/bridges';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {dressLandmass,rearSpots,type LandmassPalette} from '../kit/landmass';
import type {CountryEnvironment} from './types';
import {built,mountShell,roundCreature} from './south-america/shell';

/** Peru — Inca Trail: Terraces to the Sun Gate. A fictional ascent inspired
 * by the Inca Trail's last stretch: agricultural terraces of fitted stone,
 * the Urubamba gorge far below, Inti Punku on the ridge, and Machu Picchu's
 * citadel under Huayna Picchu, with cloud filling the valleys. */
const info={
 id:'peru-andean-terraces',title:'Inca Trail: Terraces to the Sun Gate',
 license:'Original procedural geometry; CC0 Poly Haven ashlar and alpine rock surface maps (see materials/LICENSES.md).',
 representation:'A fictional ascent inspired by the Inca Trail and the Historic Sanctuary of Machu Picchu. The citadel, Inti Punku and Huayna Picchu are simplified studies; the rope bridge, oroya and route are game elements.',
 landmarkSource:'https://whc.unesco.org/en/list/274/',
 assets:['machu-picchu-citadel','huayna-picchu-peak','inti-punku-sun-gate','agricultural-terraces','urubamba-river-gorge','andean-snow-peaks','frayed-rope-bridge','oroya-cable','llamas','andean-condors','valley-cloud'],
};
const terrace:LandmassPalette={top:'#6f9a45',topAlt:'#88ac55',edge:'#8a8f6a',face:'#b9b09c',faceDark:'#857b6a',band:'#a49a86',maps:{set:'ashlar',tint:'#efe6d6',repeat:.75},rough:.04,strata:.42};
const granite:LandmassPalette={top:'#7d9a52',topAlt:'#9aa86a',edge:'#b3ab95',face:'#aaa393',faceDark:'#6c675d',band:'#8e887a',maps:{set:'alpine-rock',tint:'#ece6da',repeat:.5},rough:.32,strata:.7};
const paving:LandmassPalette={...terrace,top:'#a9a08c',topAlt:'#9a917d',capMaps:{set:'ashlar',tint:'#d9d0bf',repeat:1},rough:.03};
const deck:DeckPalette={wood:'#8a6a45',woodAlt:'#7a5c3c',rope:'#c9b07a',stone:'#aaa393',stoneAlt:'#8e887a',metal:'#4c5560',accent:'#c9a24a'};

/** Gabled Inca house: fitted stone walls, trapezoid doorway, thatched roof. */
function incaHouse(b:Builder,x:number,y:number,z:number,w:number,d:number,r:()=>number,roof=true){
 b.add(new T.BoxGeometry(w,1.6,d),r()<.5?'#b4ab96':'#a89f8a',[x,y+.8,z],[0,0,0],[1,1,1],.06);
 const door=new T.Shape();door.moveTo(-.3,0);door.lineTo(.3,0);door.lineTo(.22,1.1);door.lineTo(-.22,1.1);door.closePath();b.add(new T.ShapeGeometry(door),'#3a3330',[x,y,z+d/2+.01]);
 for(const s of [-1,1]){const gable=new T.Shape();gable.moveTo(-d/2,0);gable.lineTo(0,1.1);gable.lineTo(d/2,0);gable.closePath();const g=new T.ExtrudeGeometry(gable,{depth:.3,bevelEnabled:false});g.rotateY(Math.PI/2);b.add(g,'#aaa18c',[x+s*(w/2)-(s>0?.3:0),y+1.6,z]);}
 if(roof){const prism=new T.CylinderGeometry(.01,1,1,4,1);prism.rotateY(Math.PI/4);b.add(prism,'#b99a5a',[x,y+2.15,z],[0,0,0],[w*.78,1.1,d*.82],.12);}
}
/** A simple llama: woolly body, long neck, banana ears. */
function llama(b:Builder,x:number,y:number,z:number,colour:string,facing:number){
 const f=facing;b.add(new T.SphereGeometry(.5,10,8),colour,[x,y+1,z],[0,0,0],[1.2,.75,.65]);b.add(new T.CylinderGeometry(.13,.17,.9,8),colour,[x+f*.55,y+1.55,z],[0,0,-f*.25]);
 b.add(new T.SphereGeometry(.17,8,6),colour,[x+f*.72,y+2,z],[0,0,0],[1.3,.9,.9]);for(const s of [-1,1])b.add(new T.ConeGeometry(.04,.22,5),colour,[x+f*.68,y+2.2,z+s*.07]);
 for(const [lx,lz] of [[-.35,-.18],[-.35,.18],[.35,-.18],[.35,.18]])b.add(new T.CylinderGeometry(.06,.05,.75,6),colour,[x+lx,y+.38,z+lz]);
}

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#9fc1e2',exposure:1,sun:'#fff0d6',sunIntensity:3,sky:'#e2eef8',ground:'#4f5a3c',hemisphere:1.35,rim:'#d8e8ff',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#4f8fd0',horizon:'#dbe7ef',ground:'#4a5238',intensity:.3}},
 ropeColor:'#c9b07a',
 mechanisms:{stone:'#b4ab96',stoneDark:'#857b6a',trim:'#5d564b',glow:'#ffc95c',metal:'#4c5560',maps:{set:'ashlar',tint:'#efe6d6',repeat:.7}},
 mount(context){
  const {finish,low,level}=context,shell=mountShell(context,{id:info.id,name:'peru-inca-trail-environment',background:'#9fc1e2',fog:['#d6e2ea',50,190],sky:{zenith:'#3f7fc8',horizon:'#e4edf3',band:'#cfdeea',glow:'#fff3dc',sun:[-.6,.5,-.6],glowPower:20},clouds:{opacity:.9,high:[26,38],lowBand:[-12,-6],groups:20,shade:'#cfd9e2'},layers:['playable-terraces-and-trail','citadel-and-houses','huayna-picchu-and-ridges','urubamba-gorge-and-cloud','andean-snow-peaks','sky']});
  const {root,staticRoot,features}=shell,r=random(274);
  // The gorge: a green-walled valley with the Urubamba far below and cloud
  // sitting in it, then the snow peaks of the Cordillera Vilcabamba.
  const gorge=new T.Group();gorge.name='urubamba-river-gorge';features.add(gorge);
  createHeightfield(gorge,{name:'gorge-walls',x:finish/2,y:-26,z:-48,width:finish+300,depth:70,segments:[low?60:130,low?20:36],height:(u,v)=>{const valley=Math.abs(v-.35)*2;return valley**1.4*34+valueNoise(u*30,v*12,3)*6+valueNoise(u*90,v*30,7)*1.6;},color:gradientColor([[0,'#3f6a35'],[14,'#4f7a3a'],[26,'#6f8a4f'],[34,'#8a8a6c']])});
  const river=createWaterSurface(gorge,{x:finish/2,y:-24.5,z:-32,width:finish+300,depth:5,shallow:'#8fa88a',deep:'#5c7c6a',segments:30,name:'urubamba-river',flow:[.06,.0],repeat:.1});
  createHeightfield(features,{name:'andean-snow-peaks',x:finish/2,y:-6,z:-160,width:finish+500,depth:60,segments:[low?70:150,low?16:28],height:ridgedRange(19,{peaks:8,height:42,sharpness:1.5,width:.85}),color:mountainColor({snowLine:30,rock:'#76705f',forest:'#3f6a35',snow:'#f7f8fa',treeLine:12,grass:'#7d8a4f'})});
  // Huayna Picchu: the steep sugarloaf peak behind the citadel.
  const citadel=level.platforms.find(p=>p.id==='pe-citadel')!,peakRoot=new T.Group();peakRoot.name='huayna-picchu-peak';features.add(peakRoot);
  createHeightfield(peakRoot,{name:'huayna-picchu-slopes',x:citadel.x+citadel.width*.7,y:-14,z:-34,width:40,depth:30,segments:[low?30:64,low?24:48],height:(u,v)=>Math.max(0,1-Math.hypot((u-.5)*2.1,(v-.5)*2.4))**.9*42+valueNoise(u*14,v*14,6)*2.5,color:(h,slope)=>new T.Color(slope>.62?'#7d7a6c':h>36?'#5f7a45':'#3f6a35').multiplyScalar(.9+valueNoise(h,slope*9,2)*.2)});
  // The citadel: terraces and gabled houses stepping down a ridge.
  const town=new Builder(.5),cx=citadel.x+3;
  for(let row=0;row<5;row++){const y=4.4-row*1.3-.6,z=-6-row*2.4;town.add(new T.BoxGeometry(citadel.width+10-row*2,1.3,2.4),row%2?'#b4ab96':'#a89f8a',[cx+5,y-.65,z],[0,0,0],[1,1,1],.04);town.add(new T.BoxGeometry(citadel.width+10-row*2,.12,2.4),'#6f9a45',[cx+5,y+.06,z]);for(let i=0;i<4;i++)if(r()<.75)incaHouse(town,cx-2+i*4+r()*1.2,y,z-.3,2.4,1.6,r);}
  town.mesh(features,vertexMaterial(.9),'machu-picchu-citadel');
  // Agricultural terraces on the slopes the trail climbs.
  const fields=new Builder(.5);for(const [x0,y0,z0] of [[8,-1,-9],[60,0,-14],[96,3,-12]] as const)for(let row=0;row<7;row++)fields.add(new T.BoxGeometry(16-row*.8,1,2),row%2?'#aaa18c':'#b4ab96',[x0,y0+row*.9-.5,z0-row*1.8],[0,0,0],[1,1,1],.05).add(new T.BoxGeometry(16-row*.8,.1,2),'#7aa04a',[x0,y0+row*.9,z0-row*1.8]);
  fields.mesh(staticRoot,vertexMaterial(.9),'agricultural-terraces');
  // Inti Punku: the trapezoid stone gateway on the pass.
  const gate=level.platforms.find(p=>p.id==='pe-sun-gate')!,sun=new T.Group();sun.name='inti-punku-sun-gate';sun.position.set(gate.x+gate.width-2.6,gate.y,-1.9);features.add(sun);
  built(sun,'inti-punku-masonry',b=>{for(const s of [-1,1])b.add(new T.BoxGeometry(1.4,3.2,1.1),'#a89f8a',[s*1.4,1.6,0],[0,0,s*.06],[1,1,1],.06);b.add(new T.BoxGeometry(4.2,.7,1.2),'#b4ab96',[0,3.45,0]);b.add(new T.BoxGeometry(6.5,1.8,1),'#9d947f',[0,.9,-1.2]);},5);
  // Rope bridge hand-lines and the oroya cable across the gorge.
  const lines=new Builder(),plank=(id:string)=>level.platforms.find(p=>p.id===id)!;
  const near=plank('pe-terrace-3'),far=plank('pe-gorge-far'),oroya=plank('pe-oroya'),ledge=plank('pe-cliff-ledge');
  for(const z of [-1.35,1.35]){const a=v3(near.x+near.width-.2,near.y+1,z),c=v3(far.x+.2,far.y+1,z),mid=a.clone().lerp(c,.5);mid.y-=1.6;lines.add(new T.TubeGeometry(new T.QuadraticBezierCurve3(a,mid,c),24,.04,5),'#c9b07a');}
  for(const x of [near.x+near.width-.3,far.x+.3])for(const z of [-1.35,1.35])lines.add(new T.CylinderGeometry(.08,.1,1.6,6),'#6a5236',[x,(x<far.x?near.y:far.y)+.6,z]);
  const top=oroya.y+3.4;lines.add(new T.CylinderGeometry(.035,.035,ledge.x-far.x-far.width+8,6).rotateZ(Math.PI/2),'#3e4650',[(far.x+far.width+ledge.x)/2,top,0]);
  for(const x of [far.x+far.width-.6,ledge.x+.6])lines.add(new T.BoxGeometry(.3,3.6,.3),'#6a5236',[x,(x<ledge.x?far.y:ledge.y)+1.8,-.9]);
  lines.mesh(staticRoot,vertexMaterial(.8),'rope-bridge-and-oroya-cable');
  // Llamas graze on the terraces; polylepis and bromeliads on the slopes.
  const herd=new Builder();for(const [x,y,z,c] of [[6,0,-3.2,'#f1e8d8'],[11,0,-4.2,'#8a6a45'],[62,3.6,-3.4,'#efe6d6'],[118,6,-3.2,'#5d4836']] as const)llama(herd,x,y,z,c,r()<.5?1:-1);
  herd.mesh(staticRoot,vertexMaterial(.95),'llamas');
  const shrubs:Placement[]=[];for(const p of level.platforms)if(p.width>=4&&!p.motion)for(const s of rearSpots(p,Math.ceil(p.width/4),p.id.length))shrubs.push({x:p.x+p.width/2+s.x,y:p.y+(p.slope||0)*.5,z:Math.min(-1.4,s.z),scale:.7+s.r*.5,rotation:s.r*6});
  plantGrove(staticRoot,'shrub',shrubs,{low,name:'andean-shrubs'});
  const banners=windBanners(root,[[gate.x+gate.width-1,gate.y,-1.5],[level.platforms.find(p=>p.id==='pe-overlook')!.x+1.4,6,-1.6]],['#e4b83c','#c43c2f']);
  const condors=createFlock(root,{count:low?2:4,centre:[finish*.6,16,-30],radius:[finish*.3,3,10],speed:.03,size:2.2,color:'#26221f',wing:'#f2efe8',seed:11,glide:true,name:'andean-condors'});
  const cloud=createDrift(root,{kind:'mist',count:low?14:36,colors:['#f6f9fb'],x:[-10,finish+10],y:[-8,-1],z:[-30,-6],fall:-.02,sway:2.4,size:3.4,seed:5,name:'valley-cloud'});
  shell.animate({update:(t,signals)=>{river.update(t);condors.update(t);const wind=signals?.wind[0];banners.update(t,wind?.phase==='gust'?wind.strength:0,wind?.phase==='warning');}});
  shell.animate({update:t=>cloud.update(t),setVisible:v=>cloud.setVisible(v),motion:true});
  return shell.finish();
 },
 dressPlatform(root,definition,context){
  const low=context.low,w=definition.width,style=definition.style,seed=definition.id.length*13+Math.round(definition.x);
  if(style==='rope-plank'){dressDeck(root,definition,'rope',deck,{below:2});built(root,'frayed-rope-ends',b=>{for(const s of [-1,1])for(const z of [-1.2,1.2])b.strut(v3(s*w/2,-.1,z),v3(s*(w/2+.6),-.9,z+.1),.03,'#c9b07a',4);},seed);return;}
  if(style==='oroya'){dressDeck(root,definition,'swing',deck);built(root,'oroya-basket',b=>{for(const x of [-w/2+.15,w/2-.15])b.strut(v3(x,0,-1.2),v3(0,3.4,0),.03,'#6a5236',4);b.add(new T.CylinderGeometry(.18,.18,.3,10).rotateX(Math.PI/2),'#3e4650',[0,3.4,0]);for(const z of [-1.25,1.25])b.add(new T.BoxGeometry(w,.5,.08),'#8a6a45',[0,.25,z]);},seed);return;}
  if(style==='gorge-lift'){dressDeck(root,definition,'lift',deck);return;}
  const kind=definition.terrain==='stairs'?'stairs':definition.terrain==='cliff'?'cliff':'ground';
  const palette=definition.terrain==='terrace'?terrace:style==='inca-stairs'||style==='citadel'||style==='inti-punku'?paving:definition.terrain==='cliff'?granite:terrace;
  const details=dressLandmass(root,definition,palette,{low,kind});
  if(definition.terrain==='terrace'||kind==='stairs')built(details,'fitted-stone-courses',(b,rr)=>{const d=Math.max(2,definition.depth)/2+.02;for(let y=-.25;y>-Math.min(4,definition.thickness);y-=.45)for(let x=-w/2+rr()*.3;x<w/2;x+=.6+rr()*.5)b.add(new T.BoxGeometry(.03,.42,.02),'#7d7465',[x,y,d]);},seed,.9);
  plantGrove(details,'golden-tuft',rearSpots(definition,Math.max(2,Math.floor(w/2.5)),seed).map(s=>({x:s.x,y:s.y,z:Math.min(-.9,s.z),scale:.7+s.r*.4})),{low});
  if(style==='trail'&&w>10)scatter(details,new T.DodecahedronGeometry(.35,0),standard('#9a947f',.95),rearSpots(definition,6,seed+1).map(s=>({x:s.x,y:s.y+.1,z:Math.min(-1,s.z),scale:.6+s.r*.6,rotation:s.r*4})),'trail-stones');
 },
 createEnemy:parent=>roundCreature(parent,{name:'peru-scree-beetle',height:.8,shell:'#3d4a3f',belly:'#8f9a6c',foot:'#2a2622',crest:(_rig,b)=>{const horn=new T.Mesh(new T.ConeGeometry(.07,.38,8),matte('#c9a24a',.4));horn.position.set(0,.66,.22);horn.rotation.x=.9;b.add(horn);for(const s of [-1,1]){const shellPlate=new T.Mesh(new T.SphereGeometry(.2,10,6,0,Math.PI),standard('#56664f',.35,{metalness:.2}));shellPlate.position.set(s*.12,.48,-.1);shellPlate.rotation.y=s*.3;b.add(shellPlate);}}}),
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'stone',color:'#b4ab96',trim:'#c9a24a',glyph:'#ffe08a'}),
 decorateCheckpoint(marker){const banner=createBannerPost(marker,{pole:'#6a5236',cloth:'#d91023',accent:'#ffffff',height:2.1});banner.position.set(-.45,0,-.2);ellipsoid(marker,matte('#b4ab96'),.4,.15,-.4,.35,.2,.3,8);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'stone',width:3.2,height:3.2,stone:'#a89f8a',trim:'#7d7465'});arch.position.set(0,0,-1.55);},
};
