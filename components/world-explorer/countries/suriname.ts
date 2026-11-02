import * as T from 'three';
import {Builder,random,v3,valueNoise,vertexMaterial,type Placement} from '../kit/common';
import {createHeightfield,gradientColor} from '../kit/landform';
import {createWaterSurface} from '../kit/water';
import {plantGrove} from '../kit/vegetation';
import {createDrift} from '../kit/particles';
import {createFlock} from '../kit/wildlife';
import {dressDeck,type DeckPalette} from '../kit/bridges';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {dressLandmass,type LandmassPalette} from '../kit/landmass';
import type {CountryEnvironment} from './types';
import {built,mountShell,roundCreature} from './south-america/shell';

/** Suriname — Paramaribo: Historic Waterfront. A fictional route inspired by
 * Paramaribo's inner city: white-painted timber houses with dark roofs and
 * green shutters, red-brick Fort Zeelandia on the bend of the wide, brown
 * Suriname River, royal palms and riverboats. */
const info={
 id:'suriname-paramaribo-waterfront',title:'Paramaribo: Historic Waterfront',
 license:'Original procedural geometry; CC0 Poly Haven red brick surface maps (see materials/LICENSES.md).',
 representation:'A fictional waterfront course inspired by the Historic Inner City of Paramaribo. Buildings are generic studies of its timber style; Fort Zeelandia is simplified and the street order is not a map.',
 landmarkSource:'https://whc.unesco.org/en/list/940/',
 assets:['paramaribo-wooden-buildings','fort-zeelandia','suriname-river','royal-palms','riverboats','cargo-hoist','market-stalls','egrets','river-haze'],
};
const timber:LandmassPalette={top:'#8a6a4a',topAlt:'#7a5a3e',edge:'#f4f1ea',face:'#f2efe8',faceDark:'#c9c4b8',band:'#e2ded4',rough:.02,strata:.28};
const brick:LandmassPalette={top:'#9a8a78',topAlt:'#8a7a68',edge:'#b9a48a',face:'#a85a3e',faceDark:'#6f3a28',band:'#8f4a32',maps:{set:'red-brick',tint:'#ffe8dc',repeat:.7},capMaps:{set:'paris-stone',tint:'#d9cfc0',repeat:.8},rough:.05,strata:.6};
const deck:DeckPalette={wood:'#6a4a32',woodAlt:'#7a5a3e',rope:'#c8b48e',stone:'#9a8a78',stoneAlt:'#8a7a68',metal:'#3e4650',accent:'#377e3f'};

/** A two-storey Paramaribo timber house: white boards, dark gabled roof,
 * green shutters and a front gallery. */
function timberHouse(b:Builder,x:number,y:number,z:number,w:number,h:number,r:()=>number){
 b.add(new T.BoxGeometry(w,h,3),'#f4f1ea',[x,y+h/2,z],[0,0,0],[1,1,1],.03);
 for(let i=0;i<Math.round(h/.25);i++)b.add(new T.BoxGeometry(w+.02,.02,3.02),'#d9d4c8',[x,y+.12+i*.25,z]);
 const roof=new T.CylinderGeometry(.01,1,1,4,1);roof.rotateY(Math.PI/4);b.add(roof,r()<.5?'#3a3f45':'#5a3a2e',[x,y+h+.8,z],[0,0,0],[w*.74,1.6,2.2],.06);
 for(let f=0;f<2;f++)for(let i=0;i<Math.max(2,Math.round(w/1.3));i++){const wx=x-w/2+.7+i*(w-1.4)/Math.max(1,Math.round(w/1.3)-1);b.add(new T.BoxGeometry(.45,.75,.05),'#3a4a3a',[wx,y+.9+f*h*.5,z+1.52]);for(const s of [-1,1])b.add(new T.BoxGeometry(.2,.78,.06),'#377e3f',[wx+s*.33,y+.9+f*h*.5,z+1.55]);}
 b.add(new T.BoxGeometry(w,.1,1),'#e9e4da',[x,y+h*.5,z+2]);for(let i=0;i<=Math.round(w/1.2);i++)b.add(new T.BoxGeometry(.08,h*.5,.08),'#f4f1ea',[x-w/2+i*w/Math.round(w/1.2),y+h*.25,z+2.4]);
}

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#b2cfe2',exposure:1,sun:'#fff0d4',sunIntensity:3,sky:'#e8f0f4',ground:'#5a4a3a',hemisphere:1.35,rim:'#ffe8c8',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#5f97c9',horizon:'#e6ece8',ground:'#4a3f32',intensity:.35}},
 mechanisms:{stone:'#a85a3e',stoneDark:'#7a3f2c',trim:'#3a2a20',glow:'#ffd04a',metal:'#3e4650',maps:{set:'red-brick',tint:'#ffe8dc',repeat:.7}},
 ropeColor:'#3e4650',
 mount(context){
  const {finish,low,level}=context,shell=mountShell(context,{id:info.id,name:'suriname-paramaribo-environment',background:'#b2cfe2',fog:['#dbe2e2',55,210],sky:{zenith:'#4f8cc4',horizon:'#eef0ea',band:'#dfe6e4',glow:'#fff4dc',sun:[.4,.5,-.75],glowPower:16},clouds:{opacity:.9,high:[18,34],groups:20,shade:'#c9d3dc'},layers:['playable-galleries-and-boats','timber-old-town','fort-zeelandia','suriname-river','far-bank-forest','sky']});
  const {root,staticRoot,features}=shell,r=random(940);
  const riverTop=Math.max(...level.hazards.map(h=>h.y+h.height))-.05;
  const river=createWaterSurface(features,{x:finish/2,y:riverTop,z:4,width:finish+300,depth:120,shallow:'#8a7a55',deep:'#5a4f3a',roughness:.2,segments:40,name:'suriname-river',flow:[.03,.004],repeat:.06});
  createHeightfield(features,{name:'far-bank-forest',x:finish/2,y:-1.4,z:-120,width:finish+400,depth:20,segments:[low?40:90,4],height:(u,v)=>v*4+valueNoise(u*60,v,4)*2,color:gradientColor([[0,'#3f6a35'],[4,'#2f5a2d']])});
  // The old town: rows of timber houses behind the route; the market and fort open to the river.
  const town=new Builder(),old=new T.Group();old.name='paramaribo-wooden-buildings';features.add(old);
  for(const [x0,x1] of [[-12,32],[84,finish+12]] as const)for(let x=x0;x<x1;x+=4.2+r()*1.4){timberHouse(town,x,0,-6.5-r(),3.4+r()*.8,3+r()*1.2,r);}
  for(let x=-10;x<finish+10;x+=5+r()*2)timberHouse(town,x,.3,-13-r()*2,3.6,3.4+r(),r);
  town.mesh(old,vertexMaterial(.8),'timber-houses');
  // Fort Zeelandia: red brick bastion walls and a gatehouse by the river.
  const yard=level.platforms.find(p=>p.id==='sr-fort-yard')!,fort=new T.Group();fort.name='fort-zeelandia';features.add(fort);
  built(fort,'fort-walls',b=>{b.add(new T.BoxGeometry(16,3.6,1.4),'#a85a3e',[yard.x+4,1.8,-5.5],[0,0,0],[1,1,1],.06);for(const s of [-1,1])b.add(new T.CylinderGeometry(1.6,2,4.2,6),'#9a5038',[yard.x+4+s*8,2.1,-5.6]);b.add(new T.BoxGeometry(3.4,4.6,2),'#f2efe8',[yard.x+.6,2.3,-3]);b.add(new T.ConeGeometry(2.4,1.4,4),'#3a3f45',[yard.x+.6,5.3,-3],[0,Math.PI/4,0]);for(let i=0;i<14;i++)b.add(new T.BoxGeometry(.5,.45,1.4),'#9a5038',[yard.x-3+i*1.1,3.82,-5.5]);},5);
  // Market stalls under the signs, palms along the river and moored boats.
  built(staticRoot,'market-stalls',(b,rr)=>{const m=level.platforms.find(p=>p.id==='sr-market')!;for(let i=0;i<5;i++){const x=m.x+1.4+i*2.6;b.add(new T.BoxGeometry(2,.9,1.2),'#7a5a3e',[x,.65,-2]);const roof=new T.BoxGeometry(2.3,.06,1.6);b.add(roof,['#ffd04a','#377e3f','#c4272f','#f4f1ea','#e67e22'][i],[x,1.6,-1.9],[.25,0,0]);for(let k=0;k<4;k++)b.add(new T.SphereGeometry(.13,8,6),['#f5a623','#e85a3a','#8ac43f'][k%3],[x-.6+k*.4,1.18,-1.8+rr()*.2]);}},7);
  const palms:Placement[]=[];for(let x=-8;x<finish+8;x+=5+r()*3)palms.push({x,y:0,z:-3.4-r()*.6,scale:.9+r()*.3,rotation:r()*6});
  plantGrove(staticRoot,'coconut-palm',palms,{low,name:'royal-palms'});
  for(let i=0;i<4;i++)built(staticRoot,'moored-boat',bb=>{bb.add(new T.CylinderGeometry(.9,.6,4,10,1,false,0,Math.PI).rotateZ(Math.PI/2).rotateX(Math.PI),i%2?'#c4272f':'#377e3f',[0,0,0],[0,0,0],[1,.6,.6]);bb.add(new T.BoxGeometry(1.4,.7,1),'#f4f1ea',[.4,.4,0]);},i).position.set(58+i*7+r()*2,riverTop-.1,-8-r()*6);
  const egrets=createFlock(root,{count:low?3:7,centre:[finish*.55,7,-14],radius:[finish*.35,2,6],speed:.05,size:.9,color:'#f4f1ea',wing:'#e9e4da',seed:6,glide:true,name:'egrets'});
  const haze=createDrift(root,{kind:'mist',count:low?8:20,colors:['#f2f2ec'],x:[50,90],y:[-1,2],z:[-20,-4],fall:0,sway:2,size:3,seed:2,name:'river-haze'});
  shell.animate({update:t=>{river.update(t);egrets.update(t);}});
  shell.animate({update:t=>haze.update(t),setVisible:v=>haze.setVisible(v),motion:true});
  return shell.finish();
 },
 dressPlatform(root,definition,context){
  const low=context.low,w=definition.width,style=definition.style,seed=definition.id.length*37+Math.round(definition.x);
  if(style==='river-boat'){dressDeck(root,definition,'dock',deck);built(root,'boat-hull',b=>{b.add(new T.CylinderGeometry(1.25,.85,w+.8,12,1,false,0,Math.PI).rotateZ(Math.PI/2).rotateX(Math.PI),seed%2?'#c4272f':'#377e3f',[0,-.2,0],[0,0,0],[1,.55,1.25]);b.add(new T.BoxGeometry(1,.9,1.6),'#f4f1ea',[-w/2+.6,.45,-1.9]);},seed);return;}
  if(style==='jetty'||style==='pontoon'){dressDeck(root,definition,'dock',deck,{below:2.5});return;}
  if(style==='cargo-hoist'){dressDeck(root,definition,'lift',deck);built(root,'hoist-chains',b=>{for(const x of [-w/2+.15,w/2-.15])b.strut(v3(x,0,-1.1),v3(x,6,-1.1),.03,'#3e4650',4);},seed);return;}
  const fortStyle=style==='fort-yard'||style==='market';
  const details=dressLandmass(root,definition,fortStyle?brick:timber,{low,kind:definition.terrain==='stairs'?'stairs':definition.terrain==='rooftop'?'block':'ground'});
  if(definition.terrain==='rooftop')built(details,'gallery-railing',(b,rr)=>{const d=Math.max(2,definition.depth)/2;for(let i=0;i<=Math.round(w/.5);i++)b.add(new T.BoxGeometry(.05,.7,.05),'#f4f1ea',[-w/2+i*w/Math.round(w/.5),.35,-d+.15]);b.add(new T.BoxGeometry(w,.06,.08),'#f4f1ea',[0,.72,-d+.15]);if(style==='shop-sign')b.add(new T.BoxGeometry(w*.9,.6,.08),['#ffd04a','#c4272f'][Math.floor(rr()*2)],[0,-.5,d+.06]);},seed);
  if(style==='waterkant')built(details,'quay-bollards',b=>{for(let x=-w/2+1;x<w/2;x+=3)b.add(new T.CylinderGeometry(.14,.18,.5,8),'#3e4650',[x,.25,-2.4]);},seed);
 },
 createEnemy:parent=>roundCreature(parent,{name:'suriname-mango-beetle',height:.8,shell:'#e67e22',belly:'#ffd04a',foot:'#5a3a20',crest:(_rig,b)=>{const leaf=new T.Mesh(new T.ConeGeometry(.12,.4,4),new T.MeshStandardMaterial({color:'#377e3f'}));leaf.position.set(0,.78,0);leaf.rotation.z=.4;b.add(leaf);}}),
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'wood',color:'#f2efe8',trim:'#377e3f',glyph:'#c4272f'}),
 decorateCheckpoint(marker){const banner=createBannerPost(marker,{pole:'#3e4650',cloth:'#377e3f',accent:'#ecc81d',height:2.1,cap:'#b40a2d'});banner.position.set(-.45,0,-.2);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'timber',width:3.4,height:3.2,stone:'#f2efe8',trim:'#377e3f'});arch.position.set(0,0,-1.55);},
};
