import * as T from 'three';
import {Builder,ellipsoid,matte,random,standard,v3,valueNoise,vertexMaterial} from '../kit/common';
import {createHeightfield,gradientColor} from '../kit/landform';
import {createWaterSurface,createShoreFoam} from '../kit/water';
import {plantGrove} from '../kit/vegetation';
import {createDrift} from '../kit/particles';
import {createFlock} from '../kit/wildlife';
import {dressDeck,type DeckPalette} from '../kit/bridges';
import {arcadeBay,stuccoHouse} from '../kit/architecture';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {dressLandmass,rearSpots,type LandmassPalette} from '../kit/landmass';
import type {Placement} from '../kit/common';
import type {CountryEnvironment} from './types';
import {built,mountShell,roundCreature} from './south-america/shell';

/** Uruguay — Colonia del Sacramento: Lighthouse Quarter. A fictional route
 * through a stylized historic quarter inspired by Colonia's Barrio Histórico:
 * the lighthouse beside the ruined convent, the walled Portón de Campo, low
 * colonial houses with tiled roofs and the wide, silty Río de la Plata. */
const info={
 id:'uruguay-colonia-waterfront',title:'Colonia del Sacramento: Lighthouse Quarter',
 license:'Original procedural geometry; CC0 Poly Haven stone surface maps (see materials/LICENSES.md).',
 representation:'A fictional river-port course inspired by the Historic Quarter of Colonia del Sacramento. The lighthouse, convent ruins and city gate are simplified studies; street order and distances are not a map of the town.',
 landmarkSource:'https://whc.unesco.org/en/list/747/',
 assets:['colonia-lighthouse','convent-of-san-francisco-ruins','porton-de-campo-city-gate','colonial-houses','rio-de-la-plata-water','plane-trees','vintage-van','fishing-boats','gulls'],
};
const cobbles:LandmassPalette={top:'#9a9387',topAlt:'#7f786d',edge:'#b9b1a2',face:'#c4b8a3',faceDark:'#8a8173',band:'#a89d8a',maps:{set:'ashlar',tint:'#f4ece0',repeat:.45},capMaps:{set:'ashlar',tint:'#b7ad9e',repeat:1.1},rough:.08,strata:.7};
const promenade:LandmassPalette={...cobbles,top:'#c9bfae',topAlt:'#b8ad9a',capMaps:{set:'paris-stone',tint:'#e9e1d2',repeat:.8},maps:{set:'ashlar',tint:'#ece4d6',repeat:.5},rough:.06};
const ruin:LandmassPalette={top:'#8c8a6a',topAlt:'#6f7b4f',edge:'#a49c86',face:'#b4a88f',faceDark:'#7d7462',band:'#9a8e78',maps:{set:'ashlar',tint:'#e6dccb',repeat:.55},rough:.12,strata:.45};
const roofDeck:LandmassPalette={top:'#c9b39a',topAlt:'#b79f86',edge:'#a24f2e',face:'#efe4d0',faceDark:'#c9b9a0',band:'#d8cbb4',capMaps:{set:'red-brick',tint:'#e8c4a8',repeat:1.2},rough:.03,strata:2};
const deck:DeckPalette={wood:'#7a5a3e',woodAlt:'#8d6a4a',rope:'#c8b48e',stone:'#a69b88',stoneAlt:'#8f8574',metal:'#3e4650',accent:'#2f6f9f'};
const houses=[{wall:'#f3ead8',roof:'#a6532f',shutter:'#3d6b4f'},{wall:'#e7c36a',roof:'#9a4a2a',shutter:'#2f5f8a'},{wall:'#d98e5a',roof:'#8f4527',shutter:'#f0e6d0'},{wall:'#b9d0c8',roof:'#a85a33',shutter:'#7a3b2a'},{wall:'#e9d8c1',roof:'#9c5531',shutter:'#425a73'}];

/** Faro de Colonia: a white tapering tower rising from the convent ruins,
 * with a gallery, lantern room and dome (a stylized study). */
function lighthouse(parent:T.Object3D,x:number,y:number,z:number){
 const root=new T.Group();root.name='colonia-lighthouse';root.position.set(x,y,z);parent.add(root);
 const b=new Builder(.4);
 b.add(new T.CylinderGeometry(1.25,1.45,1.2,24),'#b7aa92',[0,.6,0],[0,0,0],[1,1,1],.06);
 const tower=new T.CylinderGeometry(.82,1.15,10,24,6);b.add(tower,'#f6f3ec',[0,6.2,0],[0,0,0],[1,1,1],.02);
 for(let i=0;i<4;i++)b.add(new T.BoxGeometry(.28,.5,.06),'#3e4650',[Math.sin(i*1.6)*.95,3+i*2,Math.cos(i*1.6)*.95],[0,i*1.6,0]);
 b.add(new T.CylinderGeometry(1.25,1.05,.22,24),'#e9e4da',[0,11.3,0]);
 for(let i=0;i<20;i++){const a=i/20*Math.PI*2;b.add(new T.CylinderGeometry(.025,.025,.5,5),'#2d333b',[Math.cos(a)*1.18,11.65,Math.sin(a)*1.18]);}
 b.add(new T.TorusGeometry(1.18,.03,5,32),'#2d333b',[0,11.9,0],[Math.PI/2,0,0]);
 b.add(new T.CylinderGeometry(.62,.62,1.1,16),'#2d333b',[0,12,0]);
 b.add(new T.SphereGeometry(.68,16,8,0,Math.PI*2,0,Math.PI/2),'#3d4a3e',[0,12.55,0]);b.add(new T.ConeGeometry(.08,.5,6),'#2d333b',[0,13.4,0]);
 b.mesh(root,vertexMaterial(.7),'lighthouse-tower');
 const lamp=new T.Mesh(new T.CylinderGeometry(.48,.48,.8,14),new T.MeshStandardMaterial({color:'#fff4c4',emissive:'#ffd970',emissiveIntensity:1.1,transparent:true,opacity:.85}));lamp.position.y=12;lamp.name='lighthouse-lantern';root.add(lamp);
 return root;
}
/** Ruined convent walls: rubble-stone wall sections with true arched openings. */
function conventRuins(parent:T.Object3D,x:number,y:number,z:number,seed:number){
 const root=new T.Group();root.name='convent-of-san-francisco-ruins';root.position.set(x,y,z);parent.add(root);const r=random(seed),b=new Builder(.5);
 for(let i=0;i<5;i++){const g=arcadeBay(2.4,3.2+r()*.6,.7,{opening:.5,spring:.6});const p=g.getAttribute('position');for(let k=0;k<p.count;k++)if(p.getY(k)>2.6)p.setY(k,p.getY(k)-r()*1.1*((p.getX(k)+1.2)/2.4));g.computeVertexNormals();b.add(g,i%2?'#b3a68c':'#a3967c',[-5+i*2.4,0,0],[0,0,0],[1,1,1],.08);}
 for(let i=0;i<10;i++)b.add(new T.DodecahedronGeometry(.25+r()*.25,0),'#9a8e76',[-6+r()*12,.15,1+r()*1.5],[r(),r(),r()]);
 b.mesh(root,vertexMaterial(.95),'convent-walls');return root;
}
/** The walled Portón de Campo: stone curtain wall with an arched gateway. */
function cityGate(parent:T.Object3D,x:number,y:number){
 const root=new T.Group();root.name='porton-de-campo-city-gate';root.position.set(x,y,0);parent.add(root);
 built(root,'city-wall',b=>{for(const side of [-1,1])b.add(new T.BoxGeometry(1.6,4.8,1.6),'#a99d86',[side*1.9,2.4,-3.2],[0,0,0],[1,1,1],.06);b.add(new T.BoxGeometry(16,3.6,1.2),'#b2a68e',[0,1.8,-4.6],[0,0,0],[1,1,1],.05);
  const arch=arcadeBay(2.2,4.6,1.4,{opening:.0001,spring:.7});b.add(arch,'#9d917a',[0,0,-2.1]);
  for(let i=0;i<14;i++)b.add(new T.BoxGeometry(.5,.45,1.25),'#a2967f',[-6.5+i,3.82,-4.6]);
 },11);
 return root;
}
/** A 1940s delivery van parked on the cobbles: its long roof is the step. */
function vintageVan(parent:T.Object3D,width:number,seed:number){
 return built(parent,'vintage-van',(b,r)=>{
  const colour=['#2f6f9f','#9e2f2f','#3f7a52'][seed%3],cream='#efe4cc',len=width-.12;
  b.add(new T.BoxGeometry(len,.06,1.5),'#e9dfcb',[0,-.03,0]);
  b.add(new T.BoxGeometry(len*.66,1.05,1.55),colour,[len*.17,-.6,0],[0,0,0],[1,1,1],.04);
  b.add(new T.BoxGeometry(len*.36,.7,1.5),colour,[-len*.31,-.8,0]);b.add(new T.BoxGeometry(len*.3,.38,1.42),cream,[-len*.31,-.25,0]);
  b.add(new T.BoxGeometry(.06,.38,1.3),'#9fc4d8',[-len*.15,-.32,0]);b.add(new T.BoxGeometry(.4,.3,.06),'#9fc4d8',[len*.32,-.38,.8]);
  for(const x of [-len*.33,len*.3])for(const z of [-.78,.78]){const w=new T.CylinderGeometry(.34,.34,.24,16);w.rotateX(Math.PI/2);b.add(w,'#1f1f22',[x,-1.12,z]);b.add(new T.CylinderGeometry(.14,.14,.26,10).rotateX(Math.PI/2),'#c9c2b0',[x,-1.12,z]);}
  for(const z of [-.5,.5])b.add(new T.SphereGeometry(.11,8,6),'#fff1b8',[-len*.49,-.75,z]);
  b.add(new T.BoxGeometry(.08,.08,1.6),'#c9c2b0',[-len*.5,-1.05,0]);b.add(new T.BoxGeometry(.08,.08,1.6),'#c9c2b0',[len*.5,-1.05,0]);void r;
 },seed,.45);
}

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#b9d6ea',exposure:1.02,sun:'#ffe2b8',sunIntensity:3,sky:'#e6f1fa',ground:'#7a6c55',hemisphere:1.3,rim:'#ffd9b0',rimIntensity:.55,pixelRatio:1.25,reflections:{zenith:'#5f9fd2',horizon:'#e8dccb',ground:'#6c6150',intensity:.35}},
 mechanisms:{stone:'#b7aa90',stoneDark:'#8d826d',trim:'#5d5446',glow:'#ffc95c',metal:'#3e4650',maps:{set:'ashlar',tint:'#efe6d6',repeat:.6}},
 hazardPalette:{column:'#e7f2f6',base:'#8d826d',warning:'#ffc95c'},
 mount(context){
  const {finish,low,level}=context,shell=mountShell(context,{id:info.id,name:'uruguay-colonia-environment',background:'#b9d6ea',fog:['#d6e0e4',55,200],sky:{zenith:'#5f9fd2',horizon:'#f0e2cc',band:'#f6d9b4',glow:'#fff0d0',sun:[-.5,.35,-.8],glowPower:14},clouds:{opacity:.75,high:[20,34],groups:14,shade:'#d9cbbb'},layers:['playable-streets-and-rooftops','old-town-houses','convent-and-lighthouse','harbour-boats','rio-de-la-plata','far-argentine-shore','sky']});
  const {root,staticRoot,features}=shell,r=random(747);
  // The Río de la Plata: wide, silty and calm, reaching to a faint far shore.
  const river=createWaterSurface(features,{x:finish/2,y:-1.2,z:-60,width:finish+320,depth:110,shallow:'#a59a78',deep:'#6f6b55',segments:40,name:'rio-de-la-plata-water',flow:[.01,.004],repeat:.05});
  createHeightfield(features,{name:'far-argentine-shore',x:finish/2,y:-1.4,z:-150,width:finish+400,depth:20,segments:[low?40:90,4],height:(u,v)=>valueNoise(u*40,v,3)*1.2*v,color:gradientColor([[0,'#7f8a76'],[1.2,'#9aa38c']])});
  // The river laps the seawalls in front of the whole route, so every gap (moat,
  // harbour, the canal below the rooftops) reads as water; the town sits on land behind.
  const hazardTop=Math.max(...level.hazards.map(h=>h.y+h.height))-.05;
  const inlet=createWaterSurface(features,{x:finish/2,y:hazardTop,z:16,width:finish+160,depth:40,shallow:'#9aa39a',deep:'#66726d',segments:36,name:'harbour-and-canal-water',flow:[.015,.006],repeat:.07});
  const hazards=[inlet];
  createHeightfield(features,{name:'colonia-town-ground',x:finish/2,y:-.06,z:-15,width:finish+80,depth:22,segments:[low?30:70,6],height:(u,v)=>valueNoise(u*90,v*12,4)*.04*(1-v),color:(_h,_s,u,v)=>new T.Color(valueNoise(u*120,v*20,6)>.62?'#8f9a6a':'#a89e8c').multiplyScalar(.92+valueNoise(u*300,v*40,2)*.12)});
  // Old town: two rows of low colonial houses behind the streets, and a third
  // further back; the harbour and lighthouse sections stay open to the river.
  const town=new Builder();
  const open=(x:number)=>x<18||(x>101&&x<122)||x>finish+6;
  for(const [row,z] of [[0,-6.5],[1,-12],[2,-19]] as const)for(let x=-14;x<finish+14;x+=3.2+r()*1.8){if(row<2&&open(x))continue;const p=houses[Math.floor(r()*houses.length)],h=2.4+r()*1.4+(row===2?1:0);stuccoHouse(town,[x,row===2?.4:0,z-r()*1.2],[2.6+r()*1.2,h,3],p,0,Math.floor(r()*1000));}
  town.mesh(staticRoot,vertexMaterial(.85),'colonial-houses');
  // Basílica del Santísimo Sacramento: a pale church front with two towers behind the plaza.
  built(staticRoot,'basilica-del-santisimo-sacramento',b=>{b.add(new T.BoxGeometry(6,6,4),'#f2ece0',[33,3,-24]);for(const s of [-1,1]){b.add(new T.BoxGeometry(1.6,9,1.6),'#efe7d8',[33+s*3.4,4.5,-22.4]);b.add(new T.ConeGeometry(1.1,1.6,4),'#c9b9a0',[33+s*3.4,9.8,-22.4],[0,Math.PI/4,0]);}b.add(new T.ConeGeometry(4.4,2,4),'#a6532f',[33,7,-24],[0,Math.PI/4,0],[1,1,.7]);},17);
  const lighthouseX=level.platforms.find(p=>p.id==='uy-faro')!.x+7;lighthouse(features,lighthouseX,.6,-6.5);
  conventRuins(staticRoot,lighthouseX-2,.6,-4.6,9);conventRuins(staticRoot,88.6,.4,-3.6,13);
  cityGate(staticRoot,26.45,0);
  // Harbour: moored fishing boats, a stone breakwater and the yacht pier.
  for(let i=0;i<6;i++){const x=104+i*4.2+r()*2,z=-6-r()*10;built(staticRoot,'fishing-boat',b=>{b.add(new T.CylinderGeometry(.9,.6,3.4,10,1,false,0,Math.PI).rotateZ(Math.PI/2).rotateX(Math.PI),i%2?'#f1ece2':'#2f6f9f',[0,0,0],[0,0,0],[1,.6,.55]);b.add(new T.BoxGeometry(.9,.6,.8),'#efe7d8',[.3,.4,0]);b.add(new T.CylinderGeometry(.04,.05,2.6,6),'#6a5542',[-.6,1.4,0]);},i).position.set(x,-1.1,z);}
  built(staticRoot,'breakwater',(b,rr)=>{for(let x=96;x<finish+20;x+=1.1)b.add(new T.DodecahedronGeometry(.7+rr()*.4,0),'#8d8577',[x,-1,-24+rr()*1.4],[rr(),rr(),rr()],[1.3,.7,1]);},5);
  const foam=createShoreFoam(root,Array.from({length:10},(_,i)=>({x:96+i*4,y:-1.05,z:-23,size:1.6})),low,'#efeae0');
  // Plane trees, palms and bougainvillea frame the plaza and streets.
  const planes:Placement[]=[],palms:Placement[]=[],blooms:Placement[]=[];
  for(let x=-4;x<finish;x+=4.5+r()*2){if(open(x))continue;planes.push({x,y:0,z:-3.4-r()*.6,scale:.95+r()*.3,rotation:r()*6});if(r()<.5)blooms.push({x:x+1.5,y:0,z:-4.6,scale:1.3,color:'#ffffff'});}
  for(const x of [28,31.5,36.5])palms.push({x,y:0,z:-3.2,scale:.75+r()*.15,rotation:r()*6});
  plantGrove(staticRoot,'plane',planes,{low,name:'plane-trees'});plantGrove(staticRoot,'date-palm',palms,{low,name:'plaza-palms'});plantGrove(staticRoot,'flowering-shrub',blooms,{low,name:'bougainvillea'});
  shell.animate({update:t=>{river.update(t);foam.update(t);for(const h of hazards)h.update(t);}});
  const gulls=createFlock(root,{count:low?4:9,centre:[finish*.7,9,-14],radius:[finish*.35,2,6],speed:.08,size:.75,color:'#f4f2ec',wing:'#aeb4ba',seed:7,glide:true,name:'gulls'});shell.animate({update:t=>gulls.update(t)});
  const leaves=createDrift(root,{kind:'leaf',count:low?10:28,colors:['#c99a4a','#a8823c','#8f9a4a'],x:[0,finish],y:[0,6],z:[-6,1.5],fall:.25,sway:1.2,size:.12,seed:4,name:'plane-tree-leaves'});shell.animate({update:t=>leaves.update(t),setVisible:v=>leaves.setVisible(v),motion:true});
  return shell.finish();
 },
 dressPlatform(root,definition,context){
  const low=context.low,w=definition.width,style=definition.style;
  if(style==='drawbridge'){dressDeck(root,definition,'timber',deck,{below:2});built(root,'drawbridge-chains',b=>{for(const z of [-1.5,1.5])b.strut(v3(w/2,3.4,z),v3(-w/2+.4,.2,z),.04,'#3e4650',5);},3);return;}
  if(style==='boat'){dressDeck(root,definition,'dock',deck);built(root,'boat-hull',b=>{b.add(new T.CylinderGeometry(1.25,.85,w+.6,12,1,false,0,Math.PI).rotateZ(Math.PI/2).rotateX(Math.PI),'#2f6f9f',[0,-.2,0],[0,0,0],[1,.55,1.25]);b.add(new T.BoxGeometry(w+.5,.12,.12),'#efe7d8',[0,-.08,1.55]);b.add(new T.BoxGeometry(w+.5,.12,.12),'#efe7d8',[0,-.08,-1.55]);},4);return;}
  if(style==='pier'){dressDeck(root,definition,'dock',deck,{below:3});return;}
  if(style==='vintage-car'){
   const details=dressLandmass(root,{...definition,y:0},cobbles,{low,kind:'ground'});for(const name of ['country-platform-cliff','country-platform-cap'])root.getObjectByName(name)!.position.y=-.5;
   vintageVan(details,w,Math.round(definition.x));return;
  }
  if(style==='awning'){
   // A striped café awning stretched over a flower cart: the canvas is the pad.
   const details=dressLandmass(root,definition,cobbles,{low,kind:'ground',profile:'mass',visualDepth:Math.max(1,definition.y+.75+1.2)});
   built(details,'cafe-awning',b=>{for(let i=0;i<6;i++)b.add(new T.BoxGeometry(w/6+.01,.08,3),i%2?'#f4efe4':'#2f6f9f',[-w/2+(i+.5)*w/6,-.04,0]);for(const x of [-w/2+.1,w/2-.1])for(const z of [-1.3,1.3])b.add(new T.CylinderGeometry(.04,.04,.9,6),'#3e4650',[x,-.5,z]);b.add(new T.BoxGeometry(w,.5,.9),'#7a5a3e',[0,-.6,-1.9]);for(let i=0;i<6;i++)b.add(new T.SphereGeometry(.13,8,6),['#e85a7a','#f5c242','#f4efe4'][i%3],[-.7+i*.28,-.28,-1.9]);},2,.7);
   return;
  }
  if(definition.terrain==='rooftop'){
   const details=dressLandmass(root,definition,roofDeck,{low,kind:'block'});
   // The house below the roof: shuttered windows and a door on the street face.
   if(definition.thickness>4)built(details,'house-front',(b,rr)=>{const d=Math.max(2,definition.depth)/2+.02,floors=Math.floor((definition.y+.6)/1.4);for(let f=0;f<floors;f++)for(let x=-w/2+.8;x<w/2-.5;x+=1.3){b.add(new T.BoxGeometry(.4,.55,.04),'#3b3029',[x,-.75-f*1.4,d]);for(const s of [-1,1])b.add(new T.BoxGeometry(.17,.57,.05),rr()<.5?'#3d6b4f':'#2f5f8a',[x+s*.3,-.75-f*1.4,d+.01]);}b.add(new T.BoxGeometry(.7,1.2,.05),'#5b3f2c',[w*.15,-definition.y-.2,d]);b.add(new T.BoxGeometry(w,.12,.1),'#d8cbb4',[0,-.08,d+.03]);},definition.id.length);
   // The house stands on a fieldstone seawall where the river laps it.
   if(definition.thickness>4)built(details,'seawall-plinth',(b,rr)=>{const d=Math.max(2,definition.depth)/2,water=-.75-definition.y;b.add(new T.BoxGeometry(w+.5,1.6,.5),'#8f8676',[0,water+.3,d+.12],[0,0,0],[1,1,1],.08);for(let x=-w/2;x<w/2;x+=.55+rr()*.3)b.add(new T.BoxGeometry(.04,1.5,.03),'#6f675a',[x,water+.3,d+.38]);b.add(new T.BoxGeometry(w+.5,.25,.52),'#4f6a3a',[0,water-.35,d+.13]);b.add(new T.BoxGeometry(w+.6,.12,.6),'#b8ad98',[0,water+1.12,d+.12]);},definition.id.length*3);
   // A flat azotea with a tiled parapet behind, and the house wall below.
   built(details,'roof-parapet-and-tiles',b=>{b.add(new T.BoxGeometry(w,.35,.25),'#efe4d0',[0,.17,-1.5]);for(let i=0;i<Math.ceil(w/.3);i++){const g=new T.CylinderGeometry(.08,.08,.9,6,1,false,0,Math.PI);g.rotateX(Math.PI/2);b.add(g,i%2?'#a6532f':'#93492a',[-w/2+.15+i*.3,.4,-1.95],[0,0,0],[1,1,1],.1);}
    if(style==='chimney-roof')b.add(new T.BoxGeometry(.5,1.1,.5),'#d8cbb4',[w*.25,.55,-1.2]);
    if(style==='belfry'){for(const x of [-w/2+.15,w/2-.15])b.add(new T.BoxGeometry(.25,1.9,.25),'#efe7d8',[x,.95,-1.1]);b.add(new T.BoxGeometry(w,.25,.9),'#e2d6c2',[0,1.95,-1.1]);ellipsoid(details,standard('#b08b3a',.35,{metalness:.6}),0,1.4,-1.1,.22,.28,.22,12);}
   },definition.id.length);
   return;
  }
  const palette=style==='convent'||definition.terrain==='arch'?ruin:style==='rambla'||style==='lighthouse-quay'||style==='quay'?promenade:cobbles;
  // Seawalls, plazas and ruins reach just below the river line, not out of view.
  const details=dressLandmass(root,definition,palette,{low,kind:definition.terrain==='arch'?'cliff':'ground',profile:'mass',visualDepth:Math.max(1,Math.min(definition.thickness,definition.y+(definition.slope||0)*.5+.75+1.2))});
  if(definition.terrain==='arch')built(details,'ruin-wall-arch',b=>{const g=arcadeBay(w,1.6,.6,{opening:.45,spring:.5});b.add(g,'#a99c82',[0,0,-1.4]);},5);
  if(w>=6){
   // Street furniture behind the lane: iron lamp posts and benches.
   const lamp=matte('#2d333b',.5);for(const s of rearSpots(definition,Math.floor(w/5),definition.id.length*7)){const post=new T.Mesh(new T.CylinderGeometry(.05,.07,2.6,7),lamp);post.position.set(s.x,s.y+1.3,Math.min(-1.2,s.z));details.add(post);const head=new T.Mesh(new T.CylinderGeometry(.16,.12,.32,6),new T.MeshStandardMaterial({color:'#fff1c4',emissive:'#ffcf70',emissiveIntensity:.5}));head.position.set(s.x,s.y+2.7,Math.min(-1.2,s.z));details.add(head);}
  }
  if(style==='rambla')built(details,'rambla-railing',b=>{for(let i=0;i<=Math.floor(w/1.4);i++)b.add(new T.CylinderGeometry(.04,.04,.9,6),'#e9e4da',[-w/2+i*1.4,.45,-2.7]);b.add(new T.BoxGeometry(w,.07,.07),'#e9e4da',[0,.92,-2.7]);},1);
 },
 createEnemy:parent=>roundCreature(parent,{name:'uruguay-cobble-crab',height:.8,shell:'#b55a3a',belly:'#e8c49a',foot:'#7a3420',crest:(_rig,b)=>{for(const side of [-1,1]){const claw=new T.Mesh(new T.SphereGeometry(.12,10,8),matte('#c96a45'));claw.position.set(side*.33,.35,.12);claw.scale.set(1.3,.8,1);b.add(claw);}}}),
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'stone',color:'#e9e1d2',trim:'#2f6f9f',glyph:'#ffcf5a'}),
 decorateCheckpoint(marker){const banner=createBannerPost(marker,{pole:'#2d333b',cloth:'#2f6f9f',accent:'#f5c242',height:2.1});banner.position.set(-.45,0,-.2);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'stone',width:3.4,height:3.2,stone:'#efe7d8',trim:'#2f6f9f'});arch.position.set(0,0,-1.55);},
};
