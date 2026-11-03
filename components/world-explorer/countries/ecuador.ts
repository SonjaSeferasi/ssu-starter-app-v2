import * as T from 'three';
import {Builder,matte,random,scatter,standard,valueNoise,vertexMaterial,type Placement} from '../kit/common';
import {createHeightfield,gradientColor} from '../kit/landform';
import {createWaterSurface,createShoreFoam} from '../kit/water';
import {plantGrove} from '../kit/vegetation';
import {createDrift} from '../kit/particles';
import {createFlock} from '../kit/wildlife';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {dressLandmass,rearSpots,type LandmassPalette} from '../kit/landmass';
import type {CountryEnvironment} from './types';
import {built,mountShell,roundCreature} from './south-america/shell';

/** Ecuador — Galápagos: Lava Coast. A fictional shoreline inspired by the
 * Galápagos: black ropy lava, tide shelves washed by Pacific surf, candelabra
 * cacti, tuff cones on the skyline and seabirds over the water. */
const info={
 id:'ecuador-galapagos-lava-coast',title:'Galápagos: Lava Coast',
 license:'Original procedural geometry; CC0 Poly Haven coastal rock surface maps (see materials/LICENSES.md).',
 representation:'A fictional coast inspired by volcanic shorelines of the Galápagos Islands. No single island or visitor site is mapped; wildlife is scenery and never an enemy.',
 landmarkSource:'https://whc.unesco.org/en/list/1/',
 assets:['galapagos-lava-shore','volcanic-cone-skyline','pacific-surf','candelabra-cacti','opuntia-tree-cacti','palo-santo-trees','tuff-cone','tuff-pinnacle','pahoehoe-folds','marine-iguanas','sally-lightfoot-crabs','sea-lion','lava-tube','frigatebirds','sea-spray'],
};
const lava:LandmassPalette={top:'#3a3533',topAlt:'#4a4440',edge:'#5a524c',face:'#3f3936',faceDark:'#1f1c1b',band:'#2f2a28',maps:{set:'coastal-rock',tint:'#9a918a',repeat:.6},rough:.34,strata:.5};
const tuff:LandmassPalette={top:'#9a7a5a',topAlt:'#8a6a4a',edge:'#b39373',face:'#a3825f',faceDark:'#6a5038',band:'#8f6f4f',maps:{set:'sandstone-cliff',tint:'#e9d6c2',repeat:.5},rough:.22,strata:.45};
const tide:LandmassPalette={...lava,top:'#2a2826',topAlt:'#3f4a3a',edge:'#6f7a5a'};

/** A tuff cone: layered ochre ash rising to a crater rim, eroded on its sea side. */
function tuffCone(b:Builder,x:number,y:number,z:number,h:number,rad:number,seg:number){
 const outer=Array.from({length:8},(_,i)=>{const t=i/7;return new T.Vector2(rad*(1-t*.62)+Math.sin(t*14)*.25,t*h);});
 b.add(new T.LatheGeometry([...outer,new T.Vector2(rad*.3,h*.82)],seg),'#9a7a5a',[x,y,z],[0,0,0],[1,1,.85],.1);
 // Ash beds show as darker and paler bands up the flank.
 for(let i=1;i<5;i++){const t=i/7,t2=(i+.45)/7;b.add(new T.CylinderGeometry(rad*(1-t2*.62)+.04,rad*(1-t*.62)+.04,h*.45/7,seg,1,true),i%2?'#b3906a':'#80654a',[x,y+(t+t2)/2*h,z],[0,0,0],[1,1,.85]);}
}
/** An Opuntia tree cactus: a scaly trunk carrying a crown of flat pads. */
function opuntia(b:Builder,x:number,y:number,z:number,h:number,r:()=>number){
 b.add(new T.CylinderGeometry(.14,.2,h,7),'#8a6a4a',[x,y+h/2,z]);
 for(let i=0;i<7;i++){const a=r()*Math.PI*2,d=.3+r()*.5;b.add(new T.CylinderGeometry(.32,.32,.07,10),i%2?'#5f8a3f':'#4f7a35',[x+Math.cos(a)*d,y+h+.1+r()*.9,z+Math.sin(a)*d*.6],[Math.PI/2+(r()-.5)*.6,a,(r()-.5)*.6],[1,1,1.35]);}
}

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#8fc1e0',exposure:1,sun:'#fff3dc',sunIntensity:3.2,sky:'#e2f0f8',ground:'#3a3533',hemisphere:1.4,rim:'#d8f2ff',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#3f86c4',horizon:'#e2eef2',ground:'#2f2a28',intensity:.4}},
 hazardPalette:{column:'#e9f6fa',base:'#2f2a28',warning:'#ffd04a'},
 mount(context){
  const {finish,low,level}=context,shell=mountShell(context,{id:info.id,name:'ecuador-galapagos-environment',background:'#8fc1e0',fog:['#d2e6ef',70,240],sky:{zenith:'#2f7fc4',horizon:'#e6f2f6',band:'#cfe4ee',glow:'#fff6e0',sun:[-.5,.55,-.6],glowPower:20},clouds:{opacity:.85,high:[20,32],groups:16,shade:'#cfdde6'},layers:['playable-lava-and-tide-shelves','pacific-surf','galapagos-lava-shore','volcanic-cone-skyline','sea-horizon','sky']});
  const {root,staticRoot,features}=shell,r=random(208);
  // The Pacific fills the foreground and every gap; its surface sits on the sea hazard.
  const seaTop=Math.max(...level.hazards.filter(h=>!h.cycle).map(h=>h.y+h.height))-.05;
  const sea=createWaterSurface(features,{x:finish/2,y:seaTop,z:10,width:finish+300,depth:120,shallow:'#4fb0c6',deep:'#1f6f9a',roughness:.12,segments:44,name:'pacific-surf',flow:[.02,.012],repeat:.06});
  const shore=new T.Group();shore.name='galapagos-lava-shore';features.add(shore);
  createHeightfield(shore,{name:'lava-flow-field',x:finish/2,y:-1.6,z:-22,width:finish+160,depth:26,segments:[low?60:130,low?12:22],height:(u,v)=>v*3+valueNoise(u*60,v*20,4)*1.4+valueNoise(u*200,v*60,8)*.4,color:gradientColor([[0,'#2a2624'],[2,'#3f3936'],[4,'#5a524c']])});
  createHeightfield(features,{name:'volcanic-cone-skyline',x:finish/2,y:-2,z:-110,width:finish+400,depth:60,segments:[low?50:110,low?14:24],height:(u,v)=>[.2,.5,.83].reduce((h,c,i)=>Math.max(h,Math.max(0,1-Math.hypot((u-c)*6,(v-.5)*2.4))**1.2*(20+i*6)),0)+valueNoise(u*20,v*10,6)*2,color:gradientColor([[0,'#6a5a45'],[10,'#8a7a5a'],[22,'#5f6a45']])});
  const foam=createShoreFoam(root,level.platforms.filter(p=>p.y<.6&&!p.route).map(p=>({x:p.x+p.width/2,y:seaTop+.03,z:Math.max(2,p.depth/2+.4),size:p.width*.6})),low,'#f4fbfd');
  // Candelabra cacti and saltbush on the lava; a tuff cone behind the overlook.
  const cacti=new Builder();for(let i=0;i<(low?10:24);i++){const x=-6+r()*(finish+10),z=-6-r()*12,h=2+r()*2.2;cacti.add(new T.CylinderGeometry(.14,.18,h,8),'#6f8a4e',[x,h/2-.6,z]);for(const s of [-1,1])if(r()<.7){const y=h*.5+r()*h*.3;cacti.add(new T.CylinderGeometry(.1,.1,.5,6),'#6f8a4e',[x+s*.3,y-.6,z],[0,0,Math.PI/2]);cacti.add(new T.CylinderGeometry(.1,.11,h*.4,6),'#7d9a58',[x+s*.55,y-.6+h*.2,z]);}}
  cacti.mesh(staticRoot,vertexMaterial(.85),'candelabra-cacti');
  // A tuff cone behind the overlook, more on the skyline, and a tuff pinnacle at sea.
  const overlook=level.platforms.find(p=>p.id==='ec-overlook')!,seg=low?14:28;
  built(staticRoot,'tuff-cone',b=>{tuffCone(b,overlook.x+overlook.width-2,overlook.y-1.6,-15,10,9,seg);tuffCone(b,finish*.3,-1.8,-62,16,16,seg);tuffCone(b,finish*.75,-1.8,-74,12,13,seg);},4);
  built(features,'tuff-pinnacle',b=>{const x=finish*.48;b.add(new T.CylinderGeometry(.9,2.4,12,6,4),'#7a6a58',[x,4.4,-34],[0,.4,.14],[1,1,.75],.18);b.add(new T.ConeGeometry(1.1,5,6,2),'#8a7a66',[x+.9,12.6,-34],[0,.8,.2],[1,1,.8],.14);b.add(new T.CylinderGeometry(2.4,4.8,4,7,2),'#5a4e44',[x+.4,-.6,-34],[0,.2,0],[1,1,.8],.12);},7);
  // Opuntia tree cacti and pale, leafless palo santo trees on the lava.
  const trees=new Builder();for(let i=0;i<(low?6:16);i++){const x=-6+r()*(finish+10);opuntia(trees,x,-.5,-5.5-r()*10,1.6+r()*1.4,r);}
  for(let i=0;i<(low?6:14);i++){const x=-6+r()*(finish+10),z=-7-r()*12,h=2+r()*1.2;trees.add(new T.CylinderGeometry(.08,.14,h,6),'#c9c2b6',[x,h/2-.5,z]);for(let k=0;k<4;k++){const a=k*1.6+r();trees.strut(new T.Vector3(x,h*.7-.5,z),new T.Vector3(x+Math.cos(a)*.9,h+.3-.5+r()*.4,z+Math.sin(a)*.6),.035,'#d6d0c4',4);}}
  trees.mesh(staticRoot,vertexMaterial(.85),'opuntia-and-palo-santo');
  // Wildlife, all scenery: marine iguanas basking on the lava, Sally
  // Lightfoot crabs on the tide rocks, a sea lion on the black sand.
  const fauna=new Builder();
  for(let i=0;i<(low?4:9);i++){const p=level.platforms.filter(q=>q.style==='pahoehoe'||q.style==='tide-shelf'||q.style==='black-sand')[i%3],x=p.x+.8+r()*(p.width-1.6),y=p.y+.02,z=-1.5-r()*.6,a=r()*.8-.4;
   fauna.add(new T.CapsuleGeometry(.12,.55,4,8),'#3a3836',[x,y+.1,z],[0,a,Math.PI/2],[1,1,.8]);fauna.add(new T.ConeGeometry(.07,.6,6),'#3a3836',[x-Math.cos(a)*.55,y+.06,z+Math.sin(a)*.55],[0,a,Math.PI/2]);fauna.add(new T.SphereGeometry(.1,8,6),'#4a4440',[x+Math.cos(a)*.4,y+.14,z-Math.sin(a)*.4]);}
  for(const p of level.platforms.filter(q=>q.style==='tide-rock'||q.style==='tide-shelf'))for(let i=0;i<3;i++){const x=p.x+.4+r()*(p.width-.8),d=Math.max(2,p.depth)/2;fauna.add(new T.SphereGeometry(.12,8,6),'#e8452a',[x,p.y-.25-r()*.3,d+.08],[0,0,0],[1.3,.45,1]);for(const s of [-1,1])fauna.add(new T.BoxGeometry(.18,.03,.03),'#f2a03a',[x+s*.12,p.y-.28-r()*.3,d+.12],[0,0,s*.4]);}
  const beach=level.platforms.find(q=>q.style==='black-sand')!;fauna.add(new T.CapsuleGeometry(.32,1,4,10),'#6a5a4a',[beach.x+beach.width-3,beach.y+.3,-2],[0,.3,Math.PI/2],[1,.8,1]);fauna.add(new T.SphereGeometry(.24,10,8),'#6a5a4a',[beach.x+beach.width-2.2,beach.y+.55,-2.2]);
  fauna.mesh(staticRoot,vertexMaterial(.7),'galapagos-wildlife');
  const bush:Placement[]=[];for(let i=0;i<(low?12:30);i++)bush.push({x:-6+r()*(finish+10),y:-.4,z:-4-r()*8,scale:.8+r()*.5,color:'#c9b98a'});
  plantGrove(staticRoot,'shrub',bush,{low,name:'saltbush'});
  const tube=level.platforms.find(p=>p.id==='ec-lava-tube')!;built(staticRoot,'lava-tube-arch',b=>{const shape=new T.Shape();shape.absarc(0,0,3.4,0,Math.PI,false);shape.lineTo(-2.6,0);shape.absarc(0,0,2.6,Math.PI,0,true);shape.closePath();b.add(new T.ExtrudeGeometry(shape,{depth:2,bevelEnabled:false,curveSegments:14}),'#2f2a28',[tube.x+tube.width/2,tube.y,-3.4],[0,0,0],[1.4,1,1]);},6);
  const birds=createFlock(root,{count:low?4:9,centre:[finish*.5,12,-20],radius:[finish*.4,3,10],speed:.06,size:1.4,color:'#1f1d1c',wing:'#2a2726',seed:8,glide:true,name:'frigatebirds'});
  const spray=createDrift(root,{kind:'mist',count:low?10:26,colors:['#f4fbfd'],x:[-6,finish+6],y:[-1,2.5],z:[0,6],fall:-.2,sway:1.6,size:1.2,seed:3,name:'sea-spray'});
  void scatter;void standard;
  shell.animate({update:t=>{sea.update(t);foam.update(t);birds.update(t);}});
  shell.animate({update:t=>spray.update(t),setVisible:v=>spray.setVisible(v),motion:true});
  return shell.finish();
 },
 dressPlatform(root,definition,context){
  const low=context.low,w=definition.width,style=definition.style,seed=definition.id.length*29+Math.round(definition.x);
  const palette=style==='tuff'||style==='tuff-overlook'?tuff:style==='tide-shelf'||style==='tide-rock'?tide:lava;
  // Shore lava, tide shelves and tuff widen down into the sea; the high
  // spatter cones are slabs on cone-shaped bodies.
  const seaTop=-1.35,cone=style==='spatter-cone';
  const details=dressLandmass(root,definition,palette,{low,kind:definition.terrain==='rock'||cone?'cliff':'ground',profile:cone?'island':'mass',visualDepth:cone?Math.min(.5,definition.thickness):Math.max(.8,Math.min(definition.thickness,definition.y-seaTop+.6))});
  if(cone){const h=definition.y-seaTop;built(details,'spatter-cone-body',b=>{b.add(new T.CylinderGeometry(w*.42,w*.9,h,9,3),'#3f3532',[0,-.35-h/2,-.2],[0,0,0],[1,1,.8],.14);b.add(new T.TorusGeometry(w*.36,.1,4,10),'#7a3a28',[0,-.4,-.2],[Math.PI/2,0,0],[1,.8,1]);},seed,.9);}
  // Ropy pahoehoe folds traced on the lava, a few millimetres above the walking cap.
  if(style==='pahoehoe'||style==='black-sand'&&w>8||style==='lava-tube')built(details,'pahoehoe-folds',(b,rr)=>{for(let k=0;k<Math.max(2,Math.round(w/3));k++){const cx=-w/2+1+rr()*(w-2),cz=(rr()-.5)*1.2;for(let i=0;i<7;i++){const a=-1.2+i*.4,rad=.7+k%2*.2;b.add(new T.BoxGeometry(.32,.012,.05),'#26221f',[cx+Math.cos(a)*rad,.007,cz+Math.sin(a)*rad*.6],[0,-a,0]);}}},seed,.6);
  if(style==='lava-crust')built(details,'crust-glow-cracks',(b,rr)=>{for(let i=0;i<4;i++)b.add(new T.BoxGeometry(.05,.02,.9+rr()),'#c9542a',[-w/2+.3+rr()*(w-.6),.012,(rr()-.5)*1.2],[0,rr()*2,0]);},seed,.5);
  if(style==='tide-shelf')built(details,'tide-pools',(b,rr)=>{for(let i=0;i<Math.floor(w/2.5);i++)b.add(new T.CylinderGeometry(.5+rr()*.3,.5,.03,12),'#2f7f9a',[-w/2+1+rr()*(w-2),.005,-1.4-rr()*1.2]);},seed,.1);
  if(style==='black-sand'||style==='tuff-overlook')plantGrove(details,'shrub',rearSpots(definition,Math.floor(w/3),seed).map(s=>({x:s.x,y:s.y,z:Math.min(-1.2,s.z),scale:.7,color:'#c9b98a'})),{low});
 },
 createEnemy:parent=>roundCreature(parent,{name:'ecuador-lava-crab',height:.75,shell:'#c43c2f',belly:'#f2b33d',foot:'#7a2a20',eye:'#102030',crest:(_rig,b)=>{for(const s of [-1,1]){const claw=new T.Mesh(new T.SphereGeometry(.13,10,8),matte('#d9532f'));claw.position.set(s*.33,.33,.14);claw.scale.set(1.3,.8,1);b.add(claw);}}}),
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'stone',color:'#5a524c',trim:'#ffd100',glyph:'#ffd100'}),
 decorateCheckpoint(marker){const banner=createBannerPost(marker,{pole:'#3a3533',cloth:'#ffd100',accent:'#034ea2',height:2.1,cap:'#ed1c24'});banner.position.set(-.45,0,-.2);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'stone',width:3.4,height:3.2,stone:'#5a524c',trim:'#9a7a5a'});arch.position.set(0,0,-1.55);},
};
