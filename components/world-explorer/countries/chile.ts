import * as T from 'three';
import {Builder,matte,random,scatter,standard,valueNoise,vertexMaterial,type Placement} from '../kit/common';
import {createHeightfield,mountainColor,ridgedRange} from '../kit/landform';
import {plantGrove} from '../kit/vegetation';
import {createDrift} from '../kit/particles';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {createRockMass,dressLandmass,rearSpots,type LandmassPalette} from '../kit/landmass';
import type {CountryEnvironment} from './types';
import {built,mountShell,roundCreature} from './south-america/shell';

/** Chile — El Tatio: Geysers at Dawn. A fictional route across the El Tatio
 * geyser field, high in the Andes of the Antofagasta Region: pale siliceous
 * sinter, steaming vents and boiling pools with mineral-stained runoff, a
 * basin of paja brava and llareta, and volcanoes around the rim, in the cold
 * light of early morning when the steam is strongest. */
const info={
 id:'chile-el-tatio',title:'El Tatio: Geysers at Dawn',
 license:'Original procedural geometry; CC0 Poly Haven sandstone surface maps (see materials/LICENSES.md).',
 representation:'A fictional course inspired by the El Tatio geyser field (about 4,300 m, Antofagasta Region). Vents, terraces and distances are stylized; the geysers are a timed game hazard drawn from their real early-morning behaviour. Visitors must keep to marked paths there.',
 landmarkSource:'https://en.wikipedia.org/wiki/El_Tatio',
 assets:['el-tatio-geyser-field','geyser-steam','sinter-terraces','boiling-pools','mineral-runoff','tatio-volcanoes','altiplano-basin','ignimbrite-outcrop','paja-brava-tufts','llareta-cushions','path-cairns'],
};
/** Volcanic rock, pinkish ignimbrite, pale sinter and loose scree. */
const lava:LandmassPalette={top:'#6a5a50',topAlt:'#7a6a4a',edge:'#9a8a7a',face:'#7a6458',faceDark:'#4e3e36',band:'#8a6a58',maps:{set:'sandstone-cliff',tint:'#e2d4c8',repeat:.55},rough:.32,strata:.45};
const ignimbrite:LandmassPalette={top:'#b39a7e',topAlt:'#a08a62',edge:'#d6c2a8',face:'#b8907a',faceDark:'#7a5a4a',band:'#c9a88e',maps:{set:'sandstone-cliff',tint:'#ffe6d6',repeat:.5},rough:.28,strata:.7};
const sinter:LandmassPalette={top:'#dcd6c8',topAlt:'#c9bfa6',edge:'#f2eee4',face:'#cfc4ae',faceDark:'#9a8e78',band:'#e6dcc6',rough:.12,strata:.35};
const scree:LandmassPalette={top:'#8a7a6a',topAlt:'#9a8460',edge:'#a8988a',face:'#7a6a5c',faceDark:'#4a3e36',band:'#8a6a52',rough:.18,strata:.8};

/** Rising steam from many vents in one instanced draw: puffs swell and fade
 * (shrink) as they climb, each vent on its own rhythm. */
function ventSteam(parent:T.Object3D,vents:[number,number,number,number][],low:boolean){
 const per=low?4:9,count=vents.length*per,material=new T.MeshStandardMaterial({color:'#ffffff',emissive:'#e8eef4',emissiveIntensity:.35,roughness:1,transparent:true,opacity:.38,depthWrite:false});
 const puffs=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),material,count),dummy=new T.Object3D();puffs.name='geyser-steam';puffs.frustumCulled=false;puffs.castShadow=false;parent.add(puffs);
 const update=(time:number)=>{vents.forEach(([x,y,z,strength],v)=>{for(let k=0;k<per;k++){const age=((time*.16*(.8+strength*.3)+k/per+v*.37)%1),rise=age*(3.5+strength*4.5),size=(.3+age*2.4)*strength*Math.sin(Math.PI*Math.min(1,age*1.1));
  dummy.position.set(x+Math.sin(time*.4+v*1.7+k*2.1)*.9*age+age*2.2,y+rise,z+Math.cos(time*.3+k*1.3)*.7*age);dummy.scale.set(size*1.3,size*.7,size);dummy.updateMatrix();puffs.setMatrixAt(v*per+k,dummy.matrix);}});puffs.instanceMatrix.needsUpdate=true;};
 update(0);return{update,setVisible:(value:boolean)=>{puffs.visible=value;}};
}

/** The volcanoes around the basin: concave stratovolcano cones with snow on
 * the summits, in front of the foothill skyline. */
function stratovolcanoes(parent:T.Object3D,finish:number,low:boolean){
 const b=new Builder(),r=random(5604),seg=low?12:24;
 for(const [x,z,h,rad] of [[finish*.18,-150,44,40],[finish*.55,-170,56,48],[finish*.9,-145,38,34]] as const){
  const pts=Array.from({length:9},(_,i)=>{const t=i/8;return new T.Vector2(rad*Math.pow(1-t,1.7)+3*(1-t)+1.2,t*h);});
  b.add(new T.LatheGeometry(pts,seg),r()<.5?'#6a5048':'#5f4a44',[x,-2,z],[0,r()*3,0],[1,1,.9],.08);
  const cap=Array.from({length:5},(_,i)=>{const t=.62+i/4*.38;return new T.Vector2((rad*Math.pow(1-t,1.7)+3*(1-t)+1.2)*1.03,t*h);});
  b.add(new T.LatheGeometry(cap,seg),'#f2efea',[x,-2.1,z],[0,r()*3,0],[1,1,.9],.04);
 }
 const mesh=b.mesh(parent,vertexMaterial(.95),'tatio-stratovolcanoes');mesh.castShadow=false;return mesh;
}

export const environment:CountryEnvironment={
 id:info.id,info,
 lighting:{background:'#9fb6d6',exposure:.98,sun:'#ffcfa0',sunIntensity:2.9,sky:'#d6e0f2',ground:'#8a7060',hemisphere:1.6,rim:'#ffb68a',rimIntensity:.65,pixelRatio:1.25,reflections:{zenith:'#3d5f9e',horizon:'#f0cdb0',ground:'#6a5444',intensity:.3}},
 hazardPalette:{column:'#f6f8fa',base:'#c9bfa6',warning:'#ff9a3c'},
 mount(context){
  const {finish,low,level}=context,shell=mountShell(context,{id:info.id,name:'chile-el-tatio-environment',background:'#9fb6d6',fog:['#dcccc4',80,290],overviewFog:[200,520],sky:{zenith:'#33589a',horizon:'#f3cba8',band:'#e9bca2',glow:'#ffe0bc',sun:[.6,.16,-.78],glowPower:10},clouds:{opacity:.55,high:[26,40],groups:8,shade:'#e6c4b4',flat:.6},layers:['playable-sinter-and-volcanic-rock','geyser-steam','el-tatio-geyser-field','sinter-terraces','altiplano-basin','tatio-volcanoes','sky']});
  const {root,staticRoot,features}=shell,r=random(4320);
  // The high basin: ochre and rust volcanic ground with golden grass, rising to the volcanoes.
  createHeightfield(features,{name:'altiplano-basin',x:finish/2,y:-1.2,z:-46,width:finish+260,depth:70,segments:[low?50:130,low?16:34],height:(u,v)=>valueNoise(u*24,v*14,3)*2.2*(1-v)+Math.pow(1-v,2.2)*9,color:(h,_s,u,v)=>new T.Color(valueNoise(u*60,v*30,8)>.6?'#b8a060':valueNoise(u*30,v*12,5)>.55?'#9a6a4a':'#8a7a62').multiplyScalar(.88+h*.012)});
  stratovolcanoes(features,finish,low);
  createHeightfield(features,{name:'tatio-volcanoes',x:finish*.55,y:-2,z:-160,width:finish+480,depth:70,segments:[low?60:140,low?16:30],height:(u,v)=>Math.max(0,1-Math.hypot((u-.3)*4.6,(v-.55)*2.4))**.9*44+Math.max(0,1-Math.hypot((u-.72)*3.8,(v-.5)*2.2))**.9*52+ridgedRange(77,{peaks:7,height:22,width:.6})(u,v),color:mountainColor({snowLine:40,rock:'#6a5048',forest:'#8a6a52',snow:'#f4f0ec',treeLine:0,grass:'#9a8060'})});
  // The sinter flat between the lane and the basin: pale crust, grey ash and ochre seeps.
  createHeightfield(features,{name:'sinter-flat',x:finish/2,y:-1.1,z:-6,width:finish+200,depth:24,segments:[low?40:110,low?8:16],height:(u,v)=>valueNoise(u*70,v*10,12)*.35*v,color:(_h,_s,u,v)=>new T.Color(valueNoise(u*120,v*14,21)>.62?'#c49a62':valueNoise(u*40,v*8,22)>.55?'#9a948a':'#d6cfbf')});
  // El Tatio: sinter mounds with vents, boiling pools and mineral-stained runoff across the field.
  const field=new T.Group();field.name='el-tatio-geyser-field';features.add(field);
  // Background vents only: the playable geysers keep their own warning and
  // jet, so constant steam never blurs their timing.
  const mounds:Placement[]=[],pools:Placement[]=[],mats:Placement[]=[],vents:[number,number,number,number][]=[];
  for(let i=0;i<(low?14:34);i++){const x=-10+r()*(finish+20),z=-5-r()*30,y=-.9+Math.max(0,(-z-12)*.05);mounds.push({x,y,z,scale:[.8+r()*1.4,.35+r()*.5,.8+r()*1.2],rotation:r()*6});if(r()<.6)vents.push([x,y+.4,z,.6+r()*.9]);
   if(r()<.7){pools.push({x:x+1.6+r(),y:y+.06,z:z+.8,scale:[.7+r()*.9,1,.6+r()*.7]});mats.push({x:x+2.6+r()*1.6,y:y+.04,z:z+1.2,scale:[1.4+r()*2,1,.8+r()*1.2],rotation:r()*6,color:r()<.5?'#d0843e':r()<.5?'#8aa04a':'#b8603a'});}}
  scatter(field,new T.ConeGeometry(1.4,1,14,2),standard('#ffffff',.8),mounds.map(m=>({...m,color:r()<.5?'#e2dccf':'#cfc3a8'})),'sinter-mounds');
  scatter(field,new T.CylinderGeometry(1,1.08,.06,18),standard('#6fc4c8',.08,{metalness:.05}),pools,'boiling-pools');
  scatter(field,new T.CylinderGeometry(1,1,.03,12),standard('#ffffff',.7),mats,'mineral-runoff');
  const steam=ventSteam(field,vents,low);
  // Sinter terraces: scalloped pale steps stained orange where the warm water runs.
  built(features,'sinter-terraces',(b,rr)=>{for(const cx of [finish*.62,finish*.84,finish+6])for(let k=0;k<5;k++){const rad=3.4-k*.55;b.add(new T.CylinderGeometry(rad,rad+.25,.32,16,1),k%2?'#e4dccb':'#d8ceb6',[cx+k*.2,-1+k*.3,-9-k*.3-rr()*.4],[0,rr()*3,0],[1.5,1,.8],.06);b.add(new T.CylinderGeometry(rad*.9,rad*.9,.04,16),rr()<.5?'#c97a3e':'#9aa84e',[cx+k*.2,-.82+k*.3,-8.4-k*.3],[0,0,0],[1.5,1,.25]);}},31,.6);
  // A weathered ignimbrite outcrop behind the ledges and the rock arch.
  const arch=level.platforms.find(p=>p.style==='ignimbrite-arch')!;
  createRockMass(features,{name:'ignimbrite-outcrop',x:arch.x+arch.width/2-2,y:arch.y+2.2,z:-6.2,width:11,depth:5,height:arch.y+3.4,palette:ignimbrite,profile:'mass',seed:13,low});
  built(staticRoot,'ignimbrite-window',b=>{const cx=arch.x+arch.width/2;b.add(new T.TorusGeometry(2.4,.8,8,20,Math.PI),'#b8907a',[cx,arch.y-.4,-3.4],[0,0,0],[1,1.1,1],.1);for(const s of [-1,1])b.add(new T.CylinderGeometry(.8,1.1,4.4,8),'#a8806a',[cx+s*2.4,arch.y-2.6,-3.4],[0,0,0],[1,1,1],.1);},9);
  // Paja brava, llareta cushions and stone path cairns, kept behind the lane.
  const tufts:Placement[]=[],cushions=new Builder();for(let i=0;i<(low?30:80);i++){const x=-6+r()*(finish+12);tufts.push({x,y:-.8,z:-4-r()*12,scale:.6+r()*.5});}
  plantGrove(staticRoot,'golden-tuft',tufts,{low,name:'paja-brava-tufts'});
  for(let i=0;i<(low?10:26);i++){const x=-6+r()*(finish+12),z=-4.5-r()*10,s=.5+r()*.7;for(let k=0;k<4;k++)cushions.add(new T.IcosahedronGeometry(s*(.6+r()*.3),1),k%2?'#7fa63a':'#94b84a',[x+(r()-.5)*s,-.85+s*.2,z+(r()-.5)*s],[0,r()*3,0],[1.3,.5,1.1],.1);}
  cushions.mesh(staticRoot,vertexMaterial(.75),'llareta-cushions');
  built(staticRoot,'path-cairns',(b,rr)=>{for(let x=-4;x<finish+6;x+=7+rr()*4)for(let k=0;k<3;k++)b.add(new T.DodecahedronGeometry(.26-k*.06,0),k%2?'#6a5a50':'#7a6a5a',[x,-.7+k*.32,-3.4],[rr(),rr()*3,0],[1.2,.7,1]);},17);
  const frost=createDrift(root,{kind:'mist',count:low?10:26,colors:['#fbf6f2'],x:[-10,finish+10],y:[-1,2],z:[-26,-4],fall:-.04,sway:2,size:3.4,seed:7,name:'cold-dawn-haze'});
  shell.animate({update:t=>steam.update(t),setVisible:v=>steam.setVisible(v),motion:true});
  shell.animate({update:t=>frost.update(t),setVisible:v=>frost.setVisible(v),motion:true});
  return shell.finish();
 },
 dressPlatform(root,definition,context){
  const low=context.low,w=definition.width,style=definition.style,seed=definition.id.length*19+Math.round(definition.x);
  const palette=style==='sinter-crust'||style==='sinter-mound'||style==='geyser-sinter'||style==='sinter-terrace'?sinter:style==='ignimbrite-arch'||style==='ignimbrite-pinnacle'?ignimbrite:definition.terrain==='dune'?scree:lava;
  // Ground-level sinter and rock widen down to the basin floor; the high
  // ignimbrite pinnacles stand on rock columns (scenery under the collider).
  const pinnacle=style==='ignimbrite-pinnacle',ground=-1.1;
  const details=dressLandmass(root,definition,palette,{low,kind:definition.terrain==='cliff'||definition.terrain==='arch'||pinnacle?'cliff':'ground',profile:pinnacle?'island':'mass',visualDepth:pinnacle?Math.min(.5,definition.thickness):Math.max(.8,Math.min(definition.thickness,definition.y+(definition.slope||0)*.5-ground+.4))});
  if(pinnacle){const h=definition.y-ground-.3;built(details,'ignimbrite-column',(b,rr)=>{b.add(new T.CylinderGeometry(w*.32,w*.5,h,7,4),'#a8806a',[0,-.3-h/2,-.2],[0,rr()*3,0],[1,1,.8],.1);b.add(new T.CylinderGeometry(w*.36,w*.36,.3,7),'#c9a88e',[0,-.6,-.2],[0,rr()*3,0],[1,1,.8],.06);},seed,.9);}
  if(style==='sinter-crust')built(details,'crust-cracks',(b,rr)=>{for(let i=0;i<5;i++)b.add(new T.BoxGeometry(.04,.02,1+rr()*1.2),'#8a7a62',[-w/2+.3+rr()*(w-.6),.012,(rr()-.5)*1.4],[0,rr()*2,0]);b.add(new T.BoxGeometry(w*.8,.012,.5),'#c98a4a',[0,.008,-1.2]);},seed);
  if(style==='geyser-sinter')built(details,'sinter-rims',(b,rr)=>{for(let i=0;i<8;i++)b.add(new T.TorusGeometry(.5+rr()*.4,.06,5,16),'#ece4d2',[-w/2+rr()*w,.02,-1.2-rr()*1.5],[Math.PI/2,0,0]);for(let i=0;i<4;i++)b.add(new T.BoxGeometry(1.4+rr()*1.4,.012,.35),rr()<.5?'#c97a3e':'#9aa84e',[-w/2+1+rr()*(w-2),.008,-1.6-rr()*.6],[0,(rr()-.5)*.6,0]);},seed);
  if(style==='sinter-terrace')built(details,'terrace-scallops',(b,rr)=>{const d=Math.max(2,definition.depth)/2;for(let x=-w/2+.3;x<w/2;x+=.6)b.add(new T.CylinderGeometry(.34,.34,.18,10,1,false,0,Math.PI),rr()<.5?'#e6dccb':'#d6a46a',[x,-.12,d],[0,Math.PI/2,0]);},seed);
  if(w>=6)plantGrove(details,'golden-tuft',rearSpots(definition,Math.floor(w/3),seed).map(s=>({x:s.x,y:s.y,z:Math.min(-1,s.z),scale:.75})),{low});
 },
 createEnemy:parent=>roundCreature(parent,{name:'chile-sinter-scuttler',height:.8,shell:'#7a6a5c',belly:'#e6dcc6',foot:'#3a2e28',crest:(_rig,b)=>{for(let i=0;i<3;i++){const plate=new T.Mesh(new T.BoxGeometry(.5-i*.1,.06,.3),matte('#5a4a44'));plate.position.set(0,.72-i*.12,-.18);b.add(plate);}},animate:(rig,time,_s,moving)=>{rig.body.position.y=moving?Math.abs(Math.sin(time*14))*.02:0;}}),
 createDiscoveryBlock:(parent,width,height)=>createDiscoveryCrate(parent,width,height,{body:'stone',color:'#d6ccb8',trim:'#d52b1e',glyph:'#0039a6'}),
 decorateCheckpoint(marker){const banner=createBannerPost(marker,{pole:'#4a3e36',cloth:'#d52b1e',accent:'#ffffff',height:2.1,cap:'#0039a6'});banner.position.set(-.45,0,-.2);},
 decorateFinish(gate){const arch=createArchway(gate,{style:'stone',width:3.4,height:3.2,stone:'#7a6a5c',trim:'#dcd6c8'});arch.position.set(0,0,-1.55);},
};
