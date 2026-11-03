import * as T from 'three';
import {Builder,hexRgb,matte,pixelTexture,random,scatter,standard,v3,valueNoise,vertexMaterial,type Placement} from '../kit/common';
import {createHeightfield,mountainColor,ridgedRange} from '../kit/landform';
import {createWaterSurface} from '../kit/water';
import {plantGrove} from '../kit/vegetation';
import {createDrift} from '../kit/particles';
import {createFlock} from '../kit/wildlife';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {dressLandmass,localSurface,rearSpots,type LandmassPalette} from '../kit/landmass';
import type {EnvironmentSignals} from './types';
import {Reflector} from 'three/addons/objects/Reflector.js';
import type {PlatformDefinition} from '../../../lib/world-explorer/game-types';
import type {CountryEnvironment} from './types';
import {built,mountShell,roundCreature} from './south-america/shell';

/** Bolivia — Salar de Uyuni: The Salt Mirror. A fictional puzzle course on
 * a stylized salt flat: polygon salt crust, a thin brine mirror, harvested
 * salt piles, a salt-brick hotel, rusting locomotives and a coral-rock island
 * of giant cacti, with Andean volcanoes on the horizon. */
const info={
 id:'bolivia-uyuni-salt-flat',title:'Salar de Uyuni: The Salt Mirror',
 license:'Original procedural geometry; CC0 Poly Haven rock surface maps (see materials/LICENSES.md).',
 representation:'A fictional salt-flat course inspired by the Salar de Uyuni, the train cemetery near Uyuni and Isla Incahuasi. Distances between them are compressed; the raised salt blocks are a game mechanism, not a real feature.',
 landmarkSource:'https://www.guinnessworldrecords.com/world-records/82679-largest-salt-flat',
 assets:['salt-polygon-crust','salt-mirror-horizon','brine-pools','salt-piles','salt-brick-hotel','train-cemetery-locomotives','isla-incahuasi-with-giant-cacti','andean-volcano-skyline','andean-flamingos','salt-glints'],
};
const salt:LandmassPalette={top:'#efebe1',topAlt:'#ddd7c9',edge:'#fbfaf5',face:'#e3ddcf',faceDark:'#b9b09b',band:'#d2cab8',rough:.05,strata:.35};
const saltBrick:LandmassPalette={top:'#f4efe2',topAlt:'#e6dfcd',edge:'#fbf8f0',face:'#ece4d0',faceDark:'#cdc2a8',band:'#ddd2ba',rough:.02,strata:.42};
const coral:LandmassPalette={top:'#cfc4ae',topAlt:'#b8ad94',edge:'#e2d9c6',face:'#d4c9b2',faceDark:'#9a8f7a',band:'#bfb39b',maps:{set:'limestone',tint:'#fffaf0',repeat:.5},rough:.32,strata:.5};
const rust=['#8a4b2a','#6f3a22','#9c5a33','#5d3b2a'];

/** One giant cardón cactus: a ribbed column with upturned arms. */
function cactusGeometry(seed:number){
 const b=new Builder(),r=random(seed),h=3.4+r()*1.6,rib=(height:number,radius:number)=>{const g=new T.CylinderGeometry(radius*.92,radius,height,12,4);const p=g.getAttribute('position');for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i)),k=1+Math.cos(a*12)*.06;p.setX(i,p.getX(i)*k);p.setZ(i,p.getZ(i)*k);}g.computeVertexNormals();return g;};
 b.add(rib(h,.32),'#6f8a4e',[0,h/2,0],[0,0,0],[1,1,1],.05);b.add(new T.SphereGeometry(.3,10,6),'#7d9a58',[0,h,0]);
 for(let i=0;i<2+Math.floor(r()*2);i++){const side=i%2?1:-1,y=1.2+r()*1.4,len=.9+r()*.9;b.add(rib(.6,.22),'#6f8a4e',[side*.42,y,0],[0,0,side*Math.PI/2]);b.add(rib(len,.22),'#6f8a4e',[side*.72,y+len/2,0]);b.add(new T.SphereGeometry(.21,8,5),'#7d9a58',[side*.72,y+len,0]);}
 return b.geometry();
}
/** A rusting steam locomotive of the kind left near Uyuni: boiler, cab, stack. */
function locomotive(b:Builder,x:number,y:number,z:number,r:()=>number,tilt=0){
 const c=rust[Math.floor(r()*rust.length)],dark='#3b2c24';
 const boiler=new T.CylinderGeometry(.85,.85,5,16);boiler.rotateZ(Math.PI/2);b.add(boiler,c,[x,y+1.9,z],[0,0,tilt],[1,1,1],.12);
 b.add(new T.BoxGeometry(2,2.4,2.1),rust[(Math.floor(r()*4)+1)%4],[x+3.2,y+2.2,z],[0,0,tilt],[1,1,1],.1);b.add(new T.BoxGeometry(2.3,.2,2.4),dark,[x+3.2,y+3.5,z]);
 b.add(new T.CylinderGeometry(.28,.38,1.2,10),dark,[x-1.9,y+3.2,z]);b.add(new T.BoxGeometry(6.6,.3,1.9),dark,[x+.6,y+.9,z]);
 for(let i=0;i<4;i++)for(const s of [-1,1]){const w=new T.CylinderGeometry(.55,.55,.16,14);w.rotateX(Math.PI/2);b.add(w,dark,[x-1.8+i*1.3,y+.55,z+s*.95]);}
 b.add(new T.ConeGeometry(.5,1,4),dark,[x-2.9,y+.6,z],[0,Math.PI/4,Math.PI/2]);
}
/** Polygonal salt crust: irregular hexagonal plates with raised white ridges,
 * as a repeating colour and bump texture (one texture shared by every salt surface). */
let crustTexture:T.DataTexture|null=null;
function saltCrustTexture(){
 if(crustTexture)return crustTexture;
 const size=256,cells:[number,number][]=[];for(let y=0;y<6;y++)for(let x=0;x<6;x++)cells.push([(x+(y%2)*.5+(valueNoise(x*3.1,y*2.7,5)-.5)*.5)/6,(y+(valueNoise(x*1.7,y*3.3,9)-.5)*.5)/6]);
 const plate=hexRgb('#e6dfcf'),plateAlt=hexRgb('#dbd3c1'),ridge=hexRgb('#ffffff');
 crustTexture=pixelTexture(size,(u,v)=>{let d1=9,d2=9;for(const [cx,cy] of cells)for(const ox of [-1,0,1])for(const oy of [-1,0,1]){const d=Math.hypot(u-cx-ox,v-cy-oy);if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}
  const edge=Math.max(0,1-(d2-d1)*55),grain=valueNoise(u*90,v*90,3)*.06,base=valueNoise(u*12,v*12,7)<.5?plate:plateAlt;
  return[base[0]*(1-grain)+(ridge[0]-base[0])*edge,base[1]*(1-grain)+(ridge[1]-base[1])*edge,base[2]*(1-grain)+(ridge[2]-base[2])*edge];});
 return crustTexture;
}
function crustMaterial(repeat:number){const map=saltCrustTexture().clone();map.repeat.set(repeat,repeat);map.needsUpdate=true;return new T.MeshStandardMaterial({color:'#ffffff',map,bumpMap:map,bumpScale:1.1,roughness:.72});}

/** Brine-stained rims and a shadowed lip on a salt platform's edges, so its
 * ends and front read clearly against the bright flat when landing. The rims
 * lie a few millimetres above the walking cap; the lips sit on the faces. */
function landingEdges(parent:T.Object3D,definition:PlatformDefinition,seed:number){
 const w=definition.width,d=Math.max(2,definition.depth)/2,surface=localSurface(definition),r=random(seed),b=new Builder(),stairs=definition.terrain==='stairs';
 const tilt=(x:number)=>Math.atan2(surface(Math.min(w/2,x+.05))-surface(Math.max(-w/2,x-.05)),.1);
 // The ends, where the player lands: a dark outer line, a stained band and a shadowed lip.
 for(const side of [-1,1]){const x=side*w/2,y=surface(x-side*.1);
  b.add(new T.BoxGeometry(.06,.014,d*2-.04),'#6a6052',[x-side*.03,y+.007,0]);
  b.add(new T.BoxGeometry(.22,.01,d*2-.12),'#a39274',[x-side*.17,y+.005,0]);
  b.add(new T.BoxGeometry(.03,.3,d*2),'#8a7e6a',[x+side*.012,y-.16,0]);}
 // The front edge: a stained rim following the surface, a dark lip below it, and seep stains running down the face.
 if(!stairs)for(let x=-w/2+.05;x<w/2-.05;x+=.9){const len=Math.min(.9,w/2-.05-x),cx=x+len/2,y=surface(cx),a=tilt(cx);
  b.add(new T.BoxGeometry(len,.014,.05),'#7a6e5c',[cx,y+.007,d-.025],[0,0,a]);
  b.add(new T.BoxGeometry(len,.01,.22),'#ab9c80',[cx,y+.005,d-.16],[0,0,a]);
  b.add(new T.BoxGeometry(len,.22,.03),'#8a7e6a',[cx,y-.13,d+.012],[0,0,a]);
  if(r()<.5)b.add(new T.BoxGeometry(.12+r()*.2,.5+r()*.5,.02),'#b8ab92',[cx+(r()-.5)*.5,y-.6,d+.02]);}
 return b.mesh(parent,vertexMaterial(.8),'brine-stained-landing-edges');
}
/** The polygon pattern of a dry salt crust: low ridges just proud of the cap,
 * never higher than the walking surface tolerance. */
function hexCrust(parent:T.Object3D,definition:PlatformDefinition,seed:number,low:boolean){
 if(low)return;const w=definition.width,d=Math.max(2,definition.depth),r=random(seed),b=new Builder(),size=.85;
 for(let gx=-w/2+.4;gx<w/2;gx+=size*1.5)for(let gz=-d/2+.4,row=0;gz<d/2;gz+=size*1.73,row++){
  const cx=gx+(row%2?size*.75:0)+(r()-.5)*.15,cz=gz+(r()-.5)*.15;if(Math.abs(cx)>w/2-.3)continue;
  for(let k=0;k<6;k++){const a=k/6*Math.PI*2,a2=(k+1)/6*Math.PI*2,p=v3(cx+Math.cos(a)*size*.55,0,cz+Math.sin(a)*size*.55),q=v3(cx+Math.cos(a2)*size*.55,0,cz+Math.sin(a2)*size*.55);if(Math.abs(p.x)>w/2-.05||Math.abs(q.x)>w/2-.05)continue;const g=new T.BoxGeometry(p.distanceTo(q),.025,.045);b.add(g,'#ffffff',[(p.x+q.x)/2,.025,(p.z+q.z)/2],[0,-Math.atan2(q.z-p.z,q.x-p.x),0]);}
 }
 b.mesh(parent,vertexMaterial(.55),'salt-polygon-crust');
}

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#6fa6e0',exposure:.86,sun:'#fff6e6',sunIntensity:3.1,sky:'#cfe0f5',ground:'#b9b2a2',hemisphere:1.1,rim:'#cfe6ff',rimIntensity:.5,pixelRatio:1.25,reflections:{zenith:'#2f6fc4',horizon:'#cfe3f7',ground:'#efece4',intensity:.45}},
 mechanisms:{stone:'#efe9da',stoneDark:'#cfc6b0',trim:'#8a7f6a',glow:'#5fd0e4',metal:'#5b5f66'},
 hazardPalette:{column:'#f4f9fb',base:'#d9d2c1',warning:'#5fd0e4'},
 mount(context){
  const {finish,low,level}=context,shell=mountShell(context,{id:info.id,name:'bolivia-uyuni-environment',background:'#6fa6e0',fog:['#c4d8f0',120,420],overviewFog:[260,600],sky:{zenith:'#2a63bd',horizon:'#d8e8f8',band:'#bcd6f2',glow:'#fffaf0',sun:[.3,.55,-.75],glowPower:30},clouds:{opacity:.85,high:[24,40],groups:9,flat:.5,shade:'#d6e2f0'},layers:['playable-salt-crust-and-blocks','salt-piles-and-hotel','train-cemetery','salt-mirror-plain','isla-incahuasi','andean-volcano-skyline','sky']});
  const {root,staticRoot,features}=shell,r=random(420);
  // The plain: endless white crust, with a thin film of water near the horizon
  // that mirrors the sky, and Andean volcanoes beyond.
  createHeightfield(features,{name:'salt-polygon-plain',x:finish/2,y:-.4,z:-70,width:finish+420,depth:140,segments:[low?40:90,low?14:28],height:(u,v)=>valueNoise(u*80,v*30,5)*.08,color:(_h,_s,u,v)=>new T.Color('#f3f0e8').multiplyScalar(.93+valueNoise(u*160,v*60,8)*.09)});
  // The salt mirror: beyond the dry crust the flat is under a film of water
  // that reflects the sky and volcanoes (a real planar reflection, one extra
  // pass on the lightest scene). The landing crust in front stays dry.
  const mirrorPlane=new Reflector(new T.PlaneGeometry(finish+520,176),{textureWidth:low?256:768,textureHeight:low?128:384,color:new T.Color('#aebfd2'),clipBias:.003});
  mirrorPlane.rotation.x=-Math.PI/2;mirrorPlane.position.set(finish/2,-.32,-118);mirrorPlane.name='salt-mirror-horizon';features.add(mirrorPlane);shell.onDispose(()=>mirrorPlane.dispose());
  const mirror={update:(_t:number)=>{}};
  const skyline=createHeightfield(features,{name:'andean-volcano-skyline',x:finish/2,y:-.5,z:-175,width:finish+520,depth:50,segments:[low?70:150,low?14:26],height:ridgedRange(33,{peaks:7,height:22,sharpness:1.6,width:.8}),color:mountainColor({snowLine:16,rock:'#8a6b58',forest:'#a08066',snow:'#f4f2ee',treeLine:4,grass:'#b39a7a'})});
  // Brine pools along the course: the hazards read as turquoise water rimmed by crust.
  // In front of the lane the crust runs on toward the camera as one flat; each
  // gap opens into a turquoise brine pool so it never reads as walkable salt.
  const pools=level.hazards.map(h=>createWaterSurface(features,{x:h.x+h.width/2,y:h.y+h.height-.05,z:12,width:h.width+.1,depth:30,shallow:'#7fc9c4',deep:'#3f8f9a',roughness:.1,segments:10,name:h.id+'-pool',flow:[.006,.002],repeat:.2}));
  const apron=new Builder(),edges=[-60,...level.hazards.flatMap(h=>[h.x,h.x+h.width]),finish+60].sort((a,b)=>a-b);
  for(let i=0;i<edges.length;i+=2)if(edges[i+1]>edges[i])apron.add(new T.BoxGeometry(edges[i+1]-edges[i],.4,30),'#ece7dc',[(edges[i]+edges[i+1])/2,-.24,18]);
  const apronMesh=apron.mesh(features,crustMaterial(1),'salt-crust-foreground');apronMesh.geometry.computeBoundingBox();
  // World-scale UVs on the apron top so the crust plates keep their size.
  {const g=apronMesh.geometry,pos=g.getAttribute('position'),uv=new Float32Array(pos.count*2);for(let i=0;i<pos.count;i++){uv[i*2]=pos.getX(i)*.16;uv[i*2+1]=pos.getZ(i)*.16;}g.setAttribute('uv',new T.BufferAttribute(uv,2));}
  // Harvested salt piles in rows behind the lane.
  const piles:Placement[]=[];for(let x=-10;x<70;x+=1.8+r()*1.4)for(const z of [-6,-9]){if(r()<.3)continue;piles.push({x:x+r(),y:-.35,z:z-r()*2,scale:[.9+r()*.4,.7+r()*.3,.9+r()*.4]});}
  scatter(staticRoot,new T.ConeGeometry(.75,1.05,10,2).translate(0,.5,0),standard('#f6f3eb',.7),piles,'salt-piles');
  // Train cemetery: rusting locomotives and wagons, some tilted into the salt.
  const yard=level.platforms.find(p=>p.id==='bo-yard'),trains=new Builder(.4);
  if(yard)for(let i=0;i<5;i++)locomotive(trains,yard.x-6+i*7.5,-.4,-7-(i%2)*4.5,r,(r()-.5)*.08);
  trains.mesh(features,vertexMaterial(.8,{metalness:.25}),'train-cemetery-locomotives');
  // Isla Incahuasi: a coral-rock island of giant cacti beyond the summit.
  const summit=level.platforms.find(p=>p.id==='bo-summit')!,islandRoot=new T.Group();islandRoot.name='isla-incahuasi-with-giant-cacti';features.add(islandRoot);
  createHeightfield(islandRoot,{name:'incahuasi-rock',x:summit.x+2,y:-.5,z:-16,width:44,depth:22,segments:[low?30:60,low?14:26],height:(u,v)=>Math.max(0,1-Math.hypot((u-.5)*1.8,(v-.55)*2.2))**1.2*9+valueNoise(u*20,v*14,4)*1.4,color:(h)=>new T.Color(h>1?'#a3957c':'#d9d2c2').multiplyScalar(.85+valueNoise(h,1,2)*.2)});
  const cactusSpots:Placement[]=[];for(let i=0;i<(low?14:34);i++){const u=r(),v=r();const h=Math.max(0,1-Math.hypot((u-.5)*1.8,(v-.55)*2.2))**1.2*9;if(h<.6)continue;cactusSpots.push({x:summit.x+2+(u-.5)*44,y:-.5+h-.2,z:-16+(v-.5)*22,scale:.8+r()*.5,rotation:r()*6});}
  scatter(islandRoot,cactusGeometry(5),vertexMaterial(.85),cactusSpots,'giant-cardon-cacti');
  const flamingos=createFlock(root,{count:low?5:11,centre:[finish*.45,6,-40],radius:[finish*.3,1.5,8],speed:.05,size:.9,color:'#f2a0b0',wing:'#d9475f',seed:3,glide:true,name:'andean-flamingos'});
  const glints=createDrift(root,{kind:'spark',count:low?14:40,colors:['#ffffff','#e6f6ff'],x:[-6,finish+6],y:[-.2,1.2],z:[-8,2],fall:-.02,sway:.4,size:.05,seed:9,name:'salt-glints'});
  const burstCount=low?40:90,dust=new T.InstancedMesh(new T.BoxGeometry(.09,.09,.09),new T.MeshStandardMaterial({color:'#fbfaf5',roughness:.6,transparent:true,opacity:.85}),burstCount);dust.name='rising-salt-dust';dust.frustumCulled=false;dust.castShadow=false;root.add(dust);
  const ripple=new T.InstancedMesh(new T.RingGeometry(.9,1,32).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:'#e8fbff',transparent:true,opacity:.5,depthWrite:false,side:T.DoubleSide}),8);ripple.name='brine-ripples';ripple.frustumCulled=false;root.add(ripple);
  const bursts:{x:number;y:number;start:number}[]=[],seen=new Map<string,number>(),dummy=new T.Object3D(),seedDust=Array.from({length:burstCount},()=>[r()-.5,r(),r()-.5]);
  const animateBursts=(t:number,signals?:EnvironmentSignals)=>{
   for(const p of signals?.platforms||[]){if(!p.raise)continue;const before=seen.get(p.id)??0,now=p.raised??0;if(before<.05&&now>=.05)bursts.push({x:p.x+p.width/2,y:p.baseY,start:t});seen.set(p.id,now);}
   while(bursts.length&&t-bursts[0].start>1.6)bursts.shift();
   for(let i=0;i<burstCount;i++){const b=bursts[i%Math.max(1,bursts.length)],age=b?t-b.start:9,[sx,sy,sz]=seedDust[i];if(!b||age>1.4){dummy.scale.setScalar(0);}else{dummy.position.set(b.x+sx*2.6*(.4+age),b.y-.2+sy*2.4*age-age*age*1.4,sz*2.2*(.4+age));dummy.scale.setScalar(1-age/1.4);dummy.rotation.set(age*5+sx,age*4,sz);}dummy.updateMatrix();dust.setMatrixAt(i,dummy.matrix);}
   for(let i=0;i<8;i++){const b=bursts[i%Math.max(1,bursts.length)],age=b?t-b.start:9;if(!b||age>1.6){dummy.scale.setScalar(0);}else{dummy.position.set(b.x,-.68,0);dummy.rotation.set(0,0,0);dummy.scale.set(1+age*2.2,1,1+age*1.6);}dummy.updateMatrix();ripple.setMatrixAt(i,dummy.matrix);}
   dust.instanceMatrix.needsUpdate=ripple.instanceMatrix.needsUpdate=true;
  };
  shell.animate({update:(t,signals)=>{mirror.update(t);for(const p of pools)p.update(t);flamingos.update(t);animateBursts(t,signals);}});
  shell.animate({update:t=>glints.update(t),setVisible:v=>glints.setVisible(v),motion:true});
  return shell.finish();
 },
 dressPlatform(root,definition,context){
  const low=context.low,w=definition.width,style=definition.style,seed=definition.id.length*31+Math.round(definition.x);
  if(style==='salt-block'){
   const details=dressLandmass(root,definition,saltBrick,{low,kind:'block'});
   landingEdges(details,definition,seed);
   built(details,'salt-crystal-crown',(b,rr)=>{for(let i=0;i<5;i++){const s=.14+rr()*.16;b.add(new T.OctahedronGeometry(s,0),i%2?'#ffffff':'#e8f4f8',[-w/2+.25+rr()*(w-.5),s*.6,-1.15-rr()*1.1],[rr(),rr()*3,rr()],[.8,1.6,.8]);}},seed,.25);
   // Coursed salt bricks on the front face.
   built(details,'salt-brick-courses',b=>{const d=Math.max(2,definition.depth)/2+.01;for(let y=-.3;y>-definition.thickness;y-=.36)b.add(new T.BoxGeometry(w,.035,.02),'#cfc4aa',[0,y,d]);for(let y=-.15,row=0;y>-definition.thickness;y-=.36,row++)for(let x=-w/2+(row%2?.35:.7);x<w/2;x+=.7)b.add(new T.BoxGeometry(.03,.33,.02),'#d6ccb3',[x,y,d]);},seed,.6);
   return;
  }
  if(style==='salt-hotel'){
   const details=dressLandmass(root,definition,saltBrick,{low,kind:'block'});
   built(details,'salt-brick-hotel',b=>{const d=Math.max(2,definition.depth)/2;b.add(new T.BoxGeometry(.9,1.5,.06),'#6a4b33',[-w*.2,-1.4,d+.03]);for(const x of [w*.15,w*.35])b.add(new T.BoxGeometry(.55,.5,.06),'#5d7894',[x,-.9,d+.03]);b.add(new T.BoxGeometry(w+.1,.12,.12),'#e9e1cc',[0,-.06,d+.06]);for(let i=0;i<5;i++)b.add(new T.BoxGeometry(.3,.4,.3),'#f2ecdc',[-w/2+.4+i*(w-.8)/4,.2,-1.4]);},seed,.6);
   return;
  }
  if(style==='rusted-boxcar'||style==='rusted-locomotive'){
   // A low wagon on rails: the ground runs beneath; the deck is the cap.
   const details=dressLandmass(root,{...definition,y:0},salt,{low,kind:'ground'});for(const name of ['country-platform-cliff','country-platform-cap'])root.getObjectByName(name)!.position.y=-definition.y;
   built(details,'rusted-wagon',(b,rr)=>{const c=rust[seed%rust.length],y=definition.y;b.add(new T.BoxGeometry(w,.12,2.6),c,[0,-.06,0],[0,0,0],[1,1,1],.1);b.add(new T.BoxGeometry(w-.2,Math.max(.2,y-.6),2.2),rust[(seed+1)%4],[0,-(y-.6)/2-.12,0],[0,0,0],[1,1,1],.12);
    for(const x of [-w/2+.9,w/2-.9])for(const s of [-1,1]){const wh=new T.CylinderGeometry(.42,.42,.14,14);wh.rotateX(Math.PI/2);b.add(wh,'#3b2c24',[x,-y+.42,s*1.05]);}
    for(const s of [-1,1])b.add(new T.BoxGeometry(w+1.6,.08,.08),'#5d5650',[0,-y+.04,s*.75]);
    if(style==='rusted-locomotive'){for(let i=0;i<4;i++)b.add(new T.BoxGeometry(.06,.5,2.3),'#4a3328',[-w/2+.6+i*1.1,.25,-1.25]);}
    for(let i=0;i<3;i++)b.add(new T.DodecahedronGeometry(.18,0),'#7a4a30',[(rr()-.5)*w,-y+.15,1.6+rr()*.4]);
   },seed,.75);
   return;
  }
  const coralStyle=style==='coral-rock'||style==='island-summit';
  // Every salt and island body widens into the flat just below the crust apron.
  const details=dressLandmass(root,definition,coralStyle?coral:salt,{low,kind:definition.terrain==='stairs'?'stairs':style==='salt-pile'?'cliff':'ground',profile:'mass',visualDepth:Math.max(1,definition.y+(definition.slope||0)*.5+.6)});
  if(!coralStyle)landingEdges(details,definition,seed);
  if(!coralStyle&&definition.terrain==='salt-flat'){const cap=root.getObjectByName('country-platform-cap') as T.Mesh|undefined;if(cap){const old=cap.material as T.Material;cap.material=crustMaterial(1);old.dispose();}}
  if(style==='rail-yard')built(details,'rails',b=>{for(const z of [-1.1,-1.9])b.add(new T.BoxGeometry(w,.07,.08),'#5d5650',[0,.035,z]);for(let x=-w/2+.3;x<w/2;x+=.7)b.add(new T.BoxGeometry(.2,.04,1.3),'#6b5a4a',[x,.02,-1.5]);},seed);
  if(coralStyle){const spots=rearSpots(definition,Math.max(1,Math.floor(w/3.5)),seed).map(s=>({x:s.x,y:s.y-.05,z:Math.min(-1.3,s.z),scale:.55+s.r*.35,rotation:s.r*6}));scatter(details,cactusGeometry(seed),vertexMaterial(.85),spots,'island-cacti');plantGrove(details,'golden-tuft',rearSpots(definition,4,seed+3).map(s=>({x:s.x,y:s.y,z:Math.min(-.9,s.z),scale:.8})),{low});}
 },
 createEnemy:parent=>roundCreature(parent,{name:'bolivia-crust-roller',height:.85,shell:'#e8e2d4',belly:'#cfe7ef',foot:'#9a8f7c',crest:(_rig,b)=>{for(let i=0;i<5;i++){const spike=new T.Mesh(new T.OctahedronGeometry(.11,0),standard('#f7fbff',.25,{metalness:.1}));spike.position.set(-.2+i*.1,.72+Math.sin(i)*.05,-.05);spike.scale.set(.7,1.6,.7);spike.rotation.z=(i-2)*.25;b.add(spike);}},animate:(rig,time,_state,moving)=>{rig.body.rotation.x=moving?Math.sin(time*6)*.08:0;}}),
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'stone',color:'#f4efe2',trim:'#3f8f9a',glyph:'#2a63bd'}),
 decorateCheckpoint(marker){const banner=createBannerPost(marker,{pole:'#6b5a4a',cloth:'#d52b1e',accent:'#f9e300',height:2.1,cap:'#007934'});banner.position.set(-.45,0,-.2);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'stone',width:3.4,height:3.2,stone:'#a99b84',trim:'#f4efe2'});arch.position.set(0,0,-1.55);plantGrove(gate,'golden-tuft',[{x:-2.3,y:0,z:-1.4,scale:1},{x:2.4,y:0,z:-1.3,scale:.9}]);void matte;},
};
