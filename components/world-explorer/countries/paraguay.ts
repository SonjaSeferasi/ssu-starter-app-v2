import * as T from 'three';
import {Builder,matte,random,valueNoise,vertexMaterial,type Placement} from '../kit/common';
import {createHeightfield,gradientColor} from '../kit/landform';
import {plantGrove} from '../kit/vegetation';
import {createDrift} from '../kit/particles';
import {createFlock} from '../kit/wildlife';
import {arcadeBay} from '../kit/architecture';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {dressLandmass,rearSpots,type LandmassPalette} from '../kit/landmass';
import type {CountryEnvironment} from './types';
import {built,mountShell,roundCreature} from './south-america/shell';

/** Paraguay — Trinidad: The Jesuit Mission Trail. A fictional trail through
 * the red-earth countryside of Itapúa to the hilltop ruins of the Jesuit
 * mission of La Santísima Trinidad de Paraná: the arcaded red sandstone
 * church, its stone bell tower and rows of the houses where Guaraní families
 * lived, among flowering lapacho trees, pindó palms and green pasture. */
const info={
 id:'paraguay-trinidad-mission',title:'Trinidad: The Jesuit Mission Trail',
 license:'Original procedural geometry; CC0 Poly Haven red brick and sandstone surface maps (see materials/LICENSES.md).',
 representation:'A fictional trail inspired by the countryside around the Jesuit mission of La Santísima Trinidad de Paraná (UNESCO World Heritage site 648). The church, bell tower and houses are simplified studies, not a survey; the ruins are scenery and never breakable.',
 landmarkSource:'https://whc.unesco.org/en/list/648/',
 assets:['trinidad-mission-ruins','trinidad-bell-tower','guarani-houses','lapacho-trees','pindo-palms','itapua-countryside','cracked-earth-banks','pasture-grass','butterflies','parakeets'],
};
const earth:LandmassPalette={top:'#b5653f',topAlt:'#7a8a45',edge:'#c97a4f',face:'#a75a38',faceDark:'#6f3a24',band:'#8f4a30',maps:{set:'savanna-rock',tint:'#f2d0b8',repeat:.5},rough:.18,strata:.7};
const cracked:LandmassPalette={...earth,top:'#c47a50',topAlt:'#a8603c',rough:.3};
const meadow:LandmassPalette={...earth,top:'#6f8f3f',topAlt:'#8a9a4a',edge:'#a8703f'};
const sandstone:LandmassPalette={top:'#a95a3e',topAlt:'#93503a',edge:'#c9785a',face:'#b0624a',faceDark:'#7a3a2a',band:'#9a5038',maps:{set:'red-brick',tint:'#ffe0d0',repeat:.6},capMaps:{set:'sandstone-blocks',tint:'#f2c9b0',repeat:.6},rough:.05,strata:.5};

/** A lapacho (pink trumpet tree, Paraguay's national tree) in flower: a dark
 * trunk with spreading limbs and clouds of pink blossom. */
function lapacho(b:Builder,x:number,y:number,z:number,h:number,r:()=>number){
 b.add(new T.CylinderGeometry(.16,.28,h,7),'#4a3a30',[x,y+h/2,z],[0,r()*6,(r()-.5)*.1]);
 for(let i=0;i<5;i++){const a=i*1.26+r()*.4,end=new T.Vector3(x+Math.cos(a)*(1+r()*.6),y+h+.4+r()*.7,z+Math.sin(a)*.8);b.strut(new T.Vector3(x,y+h*.85,z),end,.07,'#4a3a30');
  for(let k=0;k<3;k++)b.add(new T.IcosahedronGeometry(.55+r()*.25,0),['#e98ab8','#d9709f','#f2a6c8','#c95a8a'][(i+k)%4],[end.x+(r()-.5)*.8,end.y+.15+r()*.3,end.z+(r()-.5)*.6],[0,r()*3,0],[1.2,.75,1]);}
}

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#b9d0e2',exposure:1,sun:'#ffe2b8',sunIntensity:2.9,sky:'#e6ecf0',ground:'#6a4a30',hemisphere:1.3,rim:'#ffd2a8',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#6a98c8',horizon:'#eae0d0',ground:'#5a3f2a',intensity:.25}},
 mount(context){
  const {finish,low,level}=context,shell=mountShell(context,{id:info.id,name:'paraguay-trinidad-environment',background:'#b9d0e2',fog:['#dfe2d8',55,210],sky:{zenith:'#5f94c8',horizon:'#eee6d6',band:'#dde2d6',glow:'#fff0d8',sun:[-.4,.42,-.8],glowPower:16},clouds:{opacity:.7,high:[22,34],groups:14,shade:'#d6dade',flat:.4},layers:['playable-trail-and-banks','lapacho-and-pindo-understory','trinidad-mission-ruins','guarani-houses','itapua-countryside','sky']});
  const {root,staticRoot,features}=shell,r=random(648);
  // Rolling Itapúa countryside: green pasture over red earth, with ploughed red fields.
  createHeightfield(features,{name:'itapua-countryside',x:finish/2,y:-2,z:-72,width:finish+300,depth:96,segments:[low?50:120,low?16:30],height:(u,v)=>(valueNoise(u*14,v*8,3)*3.4+valueNoise(u*40,v*20,5)*.8)*Math.min(1,v*2.4),color:(h,_s,u,v)=>new T.Color(valueNoise(u*18,v*9,11)>.62?'#a0583a':valueNoise(u*50,v*24,4)>.5?'#6f8a3f':'#7f9a4a').multiplyScalar(.9+h*.03)});
  createHeightfield(features,{name:'near-pasture',x:finish/2,y:-1.3,z:-15,width:finish+200,depth:22,segments:[low?40:100,low?8:14],height:(u,v)=>valueNoise(u*40,v*8,13)*.5*v,color:(_h,_s,u,v)=>new T.Color(valueNoise(u*60,v*10,14)>.66?'#a8603c':valueNoise(u*25,v*6,15)>.5?'#7a9a48':'#6a8a3f')});
  createHeightfield(features,{name:'dry-arroyo-bed',x:finish/2,y:-5.4,z:-1,width:finish+120,depth:14,segments:[low?40:90,6],height:(u,v)=>valueNoise(u*80,v*6,5)*.8,color:gradientColor([[0,'#9a5a3a'],[.8,'#c9865a']])});
  // Lapacho in flower, pindó palms, orchard trees and pasture behind the trail.
  const trees=new T.Group();trees.name='lapacho-and-pindo-understory';features.add(trees);
  const blossom=new Builder(),lapachos=new T.Group();lapachos.name='lapacho-trees';features.add(lapachos);
  for(const p of level.platforms.filter(p=>p.style==='lapacho-crown'))lapacho(blossom,p.x+p.width/2,-1.7,-1.7,p.y+1.1,r);
  for(let i=0;i<(low?6:16);i++){const x=-6+r()*(finish+6);if(x>80&&x<finish+6)continue;lapacho(blossom,x,-.8,-6-r()*14,2.6+r()*1.6,r);}
  blossom.mesh(lapachos,vertexMaterial(.8),'flowering-lapachos');
  const palms:Placement[]=[],orchard:Placement[]=[],shrubs:Placement[]=[],grass:Placement[]=[];
  for(let i=0;i<(low?8:20);i++)palms.push({x:-8+r()*(finish+16),y:-1,z:-7-r()*20,scale:.8+r()*.35,rotation:r()*6,color:'#d6e2b0'});
  for(let i=0;i<(low?14:34);i++){const x=-10+r()*(finish+20);if(x>80&&x<finish+8)continue;orchard.push({x,y:-1+r()*.4,z:-8-r()*22,scale:.7+r()*.4,rotation:r()*6,color:r()<.5?'#cfe0a8':'#ffffff'});}
  for(let i=0;i<(low?16:40);i++)shrubs.push({x:-10+r()*(finish+20),y:-.7,z:-4-r()*10,scale:.8+r()*.4});
  for(let i=0;i<(low?30:80);i++)grass.push({x:-8+r()*(finish+16),y:-.75,z:-3.6-r()*12,scale:.7+r()*.5});
  plantGrove(trees,'date-palm',palms,{low,name:'pindo-palms'});plantGrove(trees,'plane',orchard,{low,name:'orchard-trees'});
  plantGrove(staticRoot,'flowering-shrub',shrubs,{low,name:'flowering-shrubs'});plantGrove(staticRoot,'tuft',grass,{low,name:'pasture-grass'});
  // Trinidad: the arcaded church nave, its stone bell tower and rows of Guaraní houses.
  const nave=level.platforms.find(p=>p.style==='mission-nave')!,ruins=new T.Group();ruins.name='trinidad-mission-ruins';features.add(ruins);
  built(ruins,'mission-church-walls',(b,rr)=>{
   for(let i=0;i<8;i++){const g=arcadeBay(3.2,5.5-rr()*1.2,1,{opening:.5,spring:.62});b.add(g,i%2?'#a95a3e':'#b0624a',[nave.x-6+i*3.2,nave.y,-4.4],[0,0,0],[1,1,1],.08);}
   for(let i=0;i<9;i++)b.add(new T.BoxGeometry(.5,6.2-rr()*1.4,.5),'#9a5038',[nave.x-7.6+i*3.2,nave.y+2.8,-3.8]);
   b.add(new T.BoxGeometry(26,.45,.4),'#c9785a',[nave.x+5.2,nave.y+4.2,-3.8]);
   b.add(new T.BoxGeometry(26,7,1),'#93503a',[nave.x+5.2,nave.y+3.5,-11.6]);for(let i=0;i<7;i++)b.add(new T.BoxGeometry(1.4,2.2,.3),'#7a3a2a',[nave.x-4+i*3.4,nave.y+4,-11]);
   b.add(new T.CylinderGeometry(4,4,7,16,1,false,0,Math.PI),'#a95a3e',[nave.x+18.6,nave.y+3.5,-7.8],[0,Math.PI/2,0],[1,1,.9]);
  },11);
  const tower=new T.Group();tower.name='trinidad-bell-tower';features.add(tower);
  built(tower,'bell-tower-stone',b=>{const x=nave.x-11,z=-10;b.add(new T.BoxGeometry(3.4,9,3.4),'#9a5a40',[x,nave.y+3.5,z]);for(const s of [-1,1])b.add(arcadeBay(3.4,2.6,.4,{opening:.5,spring:.55}),'#a8644a',[x,nave.y+8,z+s*1.5]);b.add(new T.BoxGeometry(3.8,.4,3.8),'#c9785a',[x,nave.y+9.7,z]);b.add(new T.ConeGeometry(2.6,1.6,4),'#7a3a2a',[x,nave.y+10.7,z],[0,Math.PI/4,0]);b.add(new T.CylinderGeometry(.42,.6,.8,10),'#5a4a30',[x,nave.y+8.2,z]);},23);
  const houses=new T.Group();houses.name='guarani-houses';features.add(houses);
  built(houses,'house-rows',(b,rr)=>{for(let row=0;row<2;row++)for(let k=0;k<5;k++){const x=nave.x-36+k*6.4,z=-14-row*7;b.add(new T.BoxGeometry(5.6,2.4-rr()*.9,.5),'#a8644a',[x,-.2+1,z]);b.add(new T.BoxGeometry(5.6,2.4-rr()*1.1,.5),'#9a5a40',[x,-.2+1,z-3]);for(const s of [-1,1])b.add(new T.BoxGeometry(.5,2.2-rr()*.8,3),'#93503a',[x+s*2.8,-.2+1,z-1.5]);for(let c=0;c<3;c++)b.add(new T.CylinderGeometry(.18,.2,2.6,8),'#c9a27a',[x-2+c*2,1,z+1]);}},37);
  const parakeets=createFlock(root,{count:low?4:10,centre:[finish*.4,8,-10],radius:[finish*.35,2,6],speed:.1,size:.4,color:'#4fae3f',wing:'#2f7f2a',seed:4,name:'parakeets'});
  const butterflies=createDrift(root,{kind:'spark',count:low?10:28,colors:['#f6d24a','#5a9ad8','#f2f0ea'],x:[-6,finish+6],y:[0,3],z:[-6,1.6],fall:-.02,sway:1.4,size:.09,seed:7,name:'butterflies'});
  void matte;
  shell.animate({update:t=>parakeets.update(t)});
  shell.animate({update:t=>butterflies.update(t),setVisible:v=>butterflies.setVisible(v),motion:true});
  return shell.finish();
 },
 dressPlatform(root,definition,context){
  const low=context.low,w=definition.width,style=definition.style,seed=definition.id.length*31+Math.round(definition.x);
  if(style==='lapacho-crown'){const details=dressLandmass(root,definition,{...earth,top:'#d9709f',topAlt:'#e98ab8',edge:'#f2a6c8',face:'#5a4a3a',faceDark:'#3a2e24',band:'#4a3a30',maps:undefined},{low,kind:'block'});built(details,'fallen-blossom',(b,rr)=>{for(let i=0;i<6;i++)b.add(new T.IcosahedronGeometry(.18,0),rr()<.5?'#f2a6c8':'#e98ab8',[-w/2+.2+rr()*(w-.4),.06,-.95-rr()*.3],[0,rr()*3,0],[1.2,.5,1]);},seed);return;}
  const mission=style==='mission-plaza'||style==='mission-wall'||style==='mission-nave'||style==='sandstone-steps';
  const details=dressLandmass(root,definition,mission?sandstone:style==='cracked-bank'?cracked:style==='arroyo-meadow'||style==='orchard-clearing'?meadow:earth,{low,kind:definition.terrain==='stairs'?'stairs':definition.terrain==='arch'?'cliff':'ground'});
  if(style==='cracked-bank')built(details,'drying-cracks',(b,rr)=>{for(let i=0;i<7;i++)b.add(new T.BoxGeometry(.05,.02,.6+rr()*.8),'#6f3a24',[-w/2+.3+rr()*(w-.6),.012,(rr()-.5)*1.4],[0,rr()*3,0]);for(let i=0;i<5;i++)b.add(new T.BoxGeometry(.04,.8+rr()*.6,.04),'#6f3a24',[-w/2+.4+rr()*(w-.8),-.6,Math.max(2,definition.depth)/2+.02]);},seed);
  if(definition.terrain==='arch')built(details,'mission-wall-stub',b=>{b.add(arcadeBay(w,2.2,.7,{opening:.4,spring:.55}),'#a95a3e',[0,0,-1.5]);},seed);
  if(!mission&&w>=5)plantGrove(details,'flowering-shrub',rearSpots(definition,Math.floor(w/3),seed).map(s=>({x:s.x,y:s.y,z:Math.min(-1.2,s.z),scale:.8})),{low});
 },
 createEnemy:parent=>roundCreature(parent,{name:'paraguay-armour-beetle',height:.75,shell:'#7a5a3e',belly:'#d9b48a',foot:'#4a3020',crest:(_rig,b)=>{for(let i=0;i<4;i++){const band=new T.Mesh(new T.TorusGeometry(.24,.02,4,16,Math.PI),matte('#5a4030'));band.position.set(0,.33,-.12+i*.08);band.rotation.y=Math.PI/2;b.add(band);}}}),
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'stone',color:'#b0624a',trim:'#0038a8',glyph:'#ffffff'}),
 decorateCheckpoint(marker){const banner=createBannerPost(marker,{pole:'#5a4030',cloth:'#d52b1e',accent:'#ffffff',height:2.1,cap:'#0038a8'});banner.position.set(-.45,0,-.2);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'stone',width:3.4,height:3.2,stone:'#a95a3e',trim:'#c9785a'});arch.position.set(0,0,-1.55);},
};
