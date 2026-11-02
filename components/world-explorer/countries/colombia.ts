import * as T from 'three';
import {Builder,matte,random,scatter,v3,valueNoise,vertexMaterial,type Placement} from '../kit/common';
import {createHeightfield,gradientColor} from '../kit/landform';
import {createWaterSurface} from '../kit/water';
import {plantGrove} from '../kit/vegetation';
import {createDrift} from '../kit/particles';
import {createFlock} from '../kit/wildlife';
import {dressDeck,type DeckPalette} from '../kit/bridges';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {dressLandmass,rearSpots,type LandmassPalette} from '../kit/landmass';
import type {PlatformDefinition} from '../../../lib/world-explorer/game-types';
import type {CountryEnvironment} from './types';
import {built,mountShell,roundCreature} from './south-america/shell';

/** Colombia — Cocora Valley: Cloud Forest Climb. A fictional climb inspired
 * by the Cocora Valley: green pasture under very tall, slender Quindío wax
 * palms, steep cloud-forest ridges and moss-hung cliff faces in drifting mist. */
const info={
 id:'colombia-cocora-cloud-forest',title:'Cocora Valley: Cloud Forest Climb',
 license:'Original procedural geometry; CC0 Poly Haven mossy rock surface maps (see materials/LICENSES.md).',
 representation:'A fictional climbing course inspired by the Cocora Valley in Quindío. The climbable faces and cable basket are game elements; palms and ridges are stylized.',
 landmarkSource:'https://www.parquesnacionales.gov.co/portal/es/ecoturismo/parques/region-andina/parque-nacional-natural-los-nevados/',
 assets:['quindio-wax-palms','cocora-cloud-forest-ridges','cable-crossing','moss-cliff-faces','tree-ferns','bromeliads','hummingbirds','cloud-forest-mist'],
};
const moss:LandmassPalette={top:'#4f8a35',topAlt:'#6aa443',edge:'#7cad4a',face:'#7d8a6a',faceDark:'#3f4a35',band:'#5f6b4f',maps:{set:'mossy-rock',tint:'#e6efdc',repeat:.5},rough:.32,strata:.7};
const pasture:LandmassPalette={...moss,top:'#6fa64a',topAlt:'#88b85a',face:'#8a7a5a',faceDark:'#5a4a35',band:'#7a6a4a',maps:{set:'mossy-rock',tint:'#efe6d6',repeat:.45},rough:.16};
const deck:DeckPalette={wood:'#7a5a3e',woodAlt:'#8d6a4a',rope:'#c8b48e',stone:'#8f9b7c',stoneAlt:'#7d896b',metal:'#3e4650',accent:'#fcd116'};

/** A Quindío wax palm: a very tall, pale, ringed trunk with a small crown. */
function waxPalm(b:Builder,x:number,y:number,z:number,height:number,r:()=>number){
 b.add(new T.CylinderGeometry(.16,.22,height,8),'#d9d4c4',[x,y+height/2,z],[0,0,(r()-.5)*.03],[1,1,1],.04);
 for(let i=2;i<height;i+=1.2)b.add(new T.TorusGeometry(.19,.025,4,10),'#b7b09c',[x,y+i,z],[Math.PI/2,0,0]);
 for(let i=0;i<9;i++){const a=i/9*Math.PI*2,leaf=new T.ConeGeometry(.18,2.4,4);leaf.rotateZ(-Math.PI/2);leaf.translate(1.2,0,0);b.add(leaf,i%2?'#3f7f3a':'#4f9a45',[x,y+height,z],[0,a,-.35-r()*.3],[1,.3,1]);}
}
/** Hand-holds: roots, vines and moss pads on a climbable face, all on the face
 * itself (never above the walking cap) so the climb reads at a glance. */
function climbHolds(parent:T.Object3D,definition:PlatformDefinition,seed:number){
 const r=random(seed),b=new Builder(),x=-definition.width/2-.02,depth=Math.min(definition.thickness-.5,7);
 for(let y=-.5;y>-depth;y-=.55)for(const z of [-.6,0,.6]){if(r()<.25)continue;b.add(new T.BoxGeometry(.14,.12,.32),r()<.5?'#5a4632':'#6aa443',[x-.04,y+(r()-.5)*.2,z+(r()-.5)*.3],[0,0,(r()-.5)*.4]);}
 for(const z of [-.9,.9])b.add(new T.TubeGeometry(new T.CatmullRomCurve3([v3(x-.06,-.05,z),v3(x-.12,-depth*.4,z+.2),v3(x-.06,-depth*.8,z-.1)]),12,.04,5,false),'#3e6b2c');
 b.mesh(parent,vertexMaterial(.85),'climb-holds');
}

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#b8cbd2',exposure:1,sun:'#fff4dc',sunIntensity:2.5,sky:'#e6eff0',ground:'#3f5a35',hemisphere:1.5,rim:'#e8fff0',rimIntensity:.45,pixelRatio:1.25,reflections:{zenith:'#7fa3bf',horizon:'#dde8ea',ground:'#3a4f30',intensity:.3}},
 ropeColor:'#5a4632',
 mount(context){
  const {finish,low,level}=context,shell=mountShell(context,{id:info.id,name:'colombia-cocora-environment',background:'#b8cbd2',fog:['#cfdcdf',35,150],overviewFog:[150,380],sky:{zenith:'#6f9bc4',horizon:'#e3ecee',band:'#d0dde2',glow:'#fff8e8',sun:[-.3,.6,-.7],glowPower:12},clouds:{opacity:.85,high:[18,30],lowBand:[2,8],groups:26,shade:'#c9d6dc'},layers:['playable-faces-and-palms','wax-palm-groves','cocora-cloud-forest-ridges','valley-pasture-and-stream','cloud-bank','sky']});
  const {root,staticRoot,features}=shell,r=random(207);
  createHeightfield(features,{name:'cocora-cloud-forest-ridges',x:finish/2,y:-2,z:-60,width:finish+260,depth:70,segments:[low?60:130,low?20:36],height:(u,v)=>Math.abs(Math.sin(u*9+valueNoise(u*3,v*2,4)*2))*18*v+valueNoise(u*30,v*20,6)*4,color:gradientColor([[0,'#5f9a45'],[8,'#3f7a35'],[16,'#2f5f2d'],[22,'#6a7f6a']])});
  const stream=createWaterSurface(features,{x:finish/2,y:-.2,z:-3,width:finish+120,depth:6,shallow:'#7fb5a5',deep:'#3f7a6a',segments:24,name:'quindio-stream',flow:[.05,0],repeat:.15});
  // Wax palms rise from the pasture far above the forest; the playable crowns sit on two of them.
  const palms=new T.Group();palms.name='quindio-wax-palms';features.add(palms);const b=new Builder();
  for(let i=0;i<(low?12:30);i++){const x=-10+r()*(finish+20),z=-6-r()*30;waxPalm(b,x,-.5,z,14+r()*10,r);}
  for(const p of level.platforms.filter(p=>p.style==='wax-palm'))waxPalm(b,p.x+p.width/2,-1,-1.1,p.y-.25,r);
  b.mesh(palms,vertexMaterial(.85,{side:T.DoubleSide}),'wax-palm-trunks');
  // The cable crossing: a steel cable between two timber towers.
  const cable=level.platforms.find(p=>p.style==='cable-basket')!,line=new T.Group();line.name='cable-crossing';features.add(line);
  built(line,'cable-and-towers',bb=>{const left=cable.x-cable.amplitude-2,right=cable.x+cable.width+cable.amplitude+2,top=cable.y+3.6;bb.add(new T.CylinderGeometry(.03,.03,right-left,6).rotateZ(Math.PI/2),'#3e4650',[(left+right)/2,top,0]);for(const x of [left,right])bb.add(new T.BoxGeometry(.4,4.4,.4),'#6a5236',[x,top-2,-1]);},3);
  const ferns:Placement[]=[];for(const p of level.platforms)if(!p.motion&&p.width>=3)for(const s of rearSpots(p,Math.ceil(p.width/3),p.id.length))ferns.push({x:p.x+p.width/2+s.x,y:p.y+(p.slope||0)*.5,z:Math.min(-1.2,s.z),scale:.8+s.r*.6,rotation:s.r*6});
  plantGrove(staticRoot,'understory',ferns,{low,name:'tree-ferns'});
  const hummingbirds=createFlock(root,{count:low?3:7,centre:[finish*.5,9,-4],radius:[finish*.4,3,2],speed:.12,size:.25,color:'#2fa36a',wing:'#7a3fa3',seed:2,name:'hummingbirds'});
  const mist=createDrift(root,{kind:'mist',count:low?18:46,colors:['#f2f7f8'],x:[-10,finish+10],y:[-2,14],z:[-20,-2],fall:-.03,sway:2.4,size:3.2,seed:6,name:'cloud-forest-mist'});
  shell.animate({update:t=>{stream.update(t);hummingbirds.update(t);}});
  shell.animate({update:t=>mist.update(t),setVisible:v=>mist.setVisible(v),motion:true});
  return shell.finish();
 },
 dressPlatform(root,definition,context){
  const low=context.low,w=definition.width,style=definition.style,seed=definition.id.length*23+Math.round(definition.x);
  if(style==='cable-basket'){dressDeck(root,definition,'swing',deck);built(root,'basket-hangers',b=>{for(const x of [-w/2+.1,w/2-.1])b.strut(v3(x,0,-1.1),v3(0,3.6,0),.03,'#3e4650',4);},seed);return;}
  if(style==='wax-palm'){const details=dressLandmass(root,definition,moss,{low,kind:'block'});plantGrove(details,'flowering-shrub',[{x:0,y:0,z:-1.1,scale:.5}],{low});return;}
  const details=dressLandmass(root,definition,style==='pasture'||style==='valley-stream'?pasture:moss,{low,kind:definition.terrain==='climb-wall'?'cliff':definition.terrain==='rock'?'block':'ground'});
  if(definition.climbable)climbHolds(details,definition,seed);
  if(w>=4)plantGrove(details,'flowering-shrub',rearSpots(definition,Math.floor(w/4),seed).map(s=>({x:s.x,y:s.y,z:Math.min(-1.2,s.z),scale:.7})),{low});
  if(style==='moss-ledge')scatter(details,new T.ConeGeometry(.05,.5,4),matte('#3e6b2c'),Array.from({length:6},(_,i)=>({x:-w/2+.2+i*(w-.4)/5,y:-.35,z:1.3})),'dripping-moss');
 },
 createEnemy:parent=>roundCreature(parent,{name:'colombia-moss-beetle',height:.8,shell:'#2f6b3a',belly:'#a3c46a',foot:'#1f3a22',crest:(_rig,b)=>{for(const s of [-1,1]){const antenna=new T.Mesh(new T.CylinderGeometry(.015,.015,.35,5),matte('#1f3a22'));antenna.position.set(s*.08,.82,.15);antenna.rotation.z=-s*.4;b.add(antenna);}}}),
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'wood',color:'#9b7a55',trim:'#fcd116',glyph:'#003893'}),
 decorateCheckpoint(marker){const banner=createBannerPost(marker,{pole:'#5a4632',cloth:'#fcd116',accent:'#ce1126',height:2.1,cap:'#003893'});banner.position.set(-.45,0,-.2);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'jungle',width:3.4,height:3.4,stone:'#6f5034',trim:'#3f7f33'});arch.position.set(0,0,-1.55);},
};
