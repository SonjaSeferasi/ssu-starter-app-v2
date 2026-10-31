import * as T from 'three';
import {Builder,disposeTree,matte,vertexMaterial,pixelTexture,scatter,hash,type Placement} from '../kit/common';
import {dressLandmass,localSurface,type LandmassPalette} from '../kit/landmass';
import {createHeightfield} from '../kit/landform';
import {createSkyDome,createCloudBanks} from '../kit/sky';
import {plantGrove} from '../kit/vegetation';
import {createWaterSurface} from '../kit/water';
import {woodenDeck} from '../kit/wooden-deck';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {createCreatureRig,finishCreature} from '../kit/creature';
import {loadSurfaceMaps,markSurface} from '../kit/surface-maps';
import {eastAsiaPlaces,type NewEastAsiaCode} from '../../../lib/world-explorer/east-asia';
import type {CountryEnvironment} from './types';

const themes={
 CHN:{id:'china-wulingyuan',sky:'#7eb9d6',fog:'#c2d6d4',top:'#527f39',rock:'#a99c80',dark:'#635e52',accent:'#da9a4c'},
 MNG:{id:'mongolia-orkhon',sky:'#6baade',fog:'#d1ddca',top:'#8eaa57',rock:'#a48f69',dark:'#79674b',accent:'#438bb9'},
 PRK:{id:'north-korea-paektu',sky:'#88b4d5',fog:'#c1d0d3',top:'#7f8869',rock:'#727a79',dark:'#424b51',accent:'#76c3cb'},
 KOR:{id:'south-korea-seoul',sky:'#7fa9cf',fog:'#d4dfdf',top:'#aeb5b8',rock:'#b0bac0',dark:'#586776',accent:'#dd9661'},
} as const;

/** The shared vocabulary is timber joinery and tiled roofs, not a Japanese
 * pagoda. Kaesong gets low courtyards; Suwon gets fortified stone bases and
 * two-storey gatehouses. All are clearly labelled stylized studies. */
function koreanGate(b:Builder,x:number,y:number,z:number,fortress:boolean,scale=1){
 const base=fortress?3.4:1.1,w=fortress?8:7,d=4.4;
 b.add(new T.BoxGeometry(w*scale,base*scale,d*scale),fortress?'#b2aa96':'#a7a99a',[x,y+base*scale/2,z]);
 const stories=fortress?2:1;
 for(let f=0;f<stories;f++){
  const yy=y+(base+f*2.05)*scale,ww=(w-f*.7)*scale,dd=(d-f*.35)*scale;
  for(const side of [-1,1])for(const row of [-1,1])b.add(new T.CylinderGeometry(.13*scale,.16*scale,1.9*scale,8),'#874c3c',[x+side*ww*.38,yy+.95*scale,z+row*dd*.35]);
  b.add(new T.BoxGeometry(ww,1.3*scale,.14*scale),'#e1d8c3',[x,yy+.85*scale,z-dd*.28]);
  b.add(new T.BoxGeometry(ww+.4*scale,.18*scale,dd+.3*scale),'#5a7f68',[x,yy+1.78*scale,z]);
  for(const side of [-1,1]){
   const roof=new T.BoxGeometry(ww+1.15*scale,.16*scale,dd*.65),p=roof.getAttribute('position');
   for(let i=0;i<p.count;i++){const xx=p.getX(i)/(ww*.5),zz=p.getZ(i)/(dd*.4);p.setY(i,p.getY(i)+Math.pow(Math.abs(xx),3)*.3*scale+Math.max(0,zz*side)*.2*scale);}roof.computeVertexNormals();
   b.add(roof,'#3e4e56',[x,yy+2.02*scale,z+side*dd*.25],[side*.27,0,0]);
  }
 }
 // The dark opening is a scenic recess, not a collision doorway.
 b.add(new T.BoxGeometry(2.1*scale,base*.85*scale,.1),'#434b48',[x,y+base*.42*scale,z+d*.5*scale+.02]);
}

function sandstoneSpire(b:Builder,x:number,base:number,z:number,height:number,width:number,index:number){
 const g=new T.CylinderGeometry(width*.47,width*.66,height,12,10),p=g.getAttribute('position');
 for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i)),yy=p.getY(i)/height,edge=1+.11*Math.sin(a*5+index)+.065*Math.sin(yy*23+index);p.setX(i,p.getX(i)*edge);p.setZ(i,p.getZ(i)*edge);if(yy>.4)p.setY(i,p.getY(i)+Math.sin(a*3+index)*.35);}g.computeVertexNormals();
 b.add(g,index%3?'#aca18b':'#969985',[x,base+height/2,z],[0,index*.37,0],[1,1,1],.08);
 b.add(new T.CylinderGeometry(width*.48,width*.5,.27,12),'#52723b',[x,base+height+.1,z]);
}

function ger(b:Builder,x:number,y:number,z:number,size:number){
 b.add(new T.CylinderGeometry(size,size,size*.95,20),'#e6e1cb',[x,y+size*.48,z]);
 b.add(new T.ConeGeometry(size*1.08,size*.7,20),'#eee8d6',[x,y+size*1.29,z]);
 for(const yy of [.27,.72])b.add(new T.TorusGeometry(size*1.01,.025,5,20),'#8b654b',[x,y+size*yy,z],[Math.PI/2,0,0]);
 b.add(new T.BoxGeometry(size*.47,size*.63,.06),'#946842',[x,y+size*.32,z+size]);
}

function bellSentinel(parent:T.Object3D){
 const rig=createCreatureRig(parent,{name:'suwon-original-bronze-bell-sentinel',height:.85,feet:[-.11,.11],footColor:'#474f4a',stride:6});
 const body=new T.Mesh(new T.CylinderGeometry(.22,.29,.45,12),matte('#b29964'));body.position.y=.42;rig.body.add(body);
 const cap=new T.Mesh(new T.ConeGeometry(.24,.18,12),matte('#526f65'));cap.position.y=.75;rig.head.add(cap);
 for(const side of [-1,1]){const eye=new T.Mesh(new T.SphereGeometry(.038,8,6),matte('#f8e8b5'));eye.position.set(side*.08,.51,.235);rig.head.add(eye);}
 return finishCreature(rig);
}

export function createEastAsiaEnvironment(code:NewEastAsiaCode):CountryEnvironment{
 const t=themes[code],place=eastAsiaPlaces[code];
 const palette:LandmassPalette={top:t.top,topAlt:code==='MNG'?'#a7b970':code==='KOR'?'#d2d7d8':'#a6b296',edge:t.rock,face:t.rock,faceDark:t.dark,band:code==='CHN'?'#c0ad8e':'#938c78',rough:code==='CHN'?.26:code==='KOR'?.025:.12,strata:code==='CHN'?.8:.3,maps:code==='KOR'?undefined:{set:code==='MNG'?'savanna-rock':code==='CHN'?'sandstone-cliff':'gneiss',repeat:1}};
 return{
  id:t.id,info:{title:place.title,landmarkSource:place.source,license:'Original procedural geometry; existing CC0 surface maps, see materials/LICENSES.md.',representation:`Fictional platform adventure in a single setting inspired by ${place.landmark}; stylized studies, not measured reconstruction or a visitor route.`,assets:[`${code}-landscape`,`${code}-architectural-study`,`${code}-route-furniture`]},
  lighting:{background:t.sky,exposure:1.03,sun:'#ffe5bb',sunIntensity:3,sky:'#e0ecf1',ground:t.top,hemisphere:1.2,pixelRatio:1.15},
  mount(context){
   const {scene,finish,low}=context;const root=new T.Group();root.name=`${code}-country-environment`;root.userData={environmentId:t.id,landmark:place.landmark,source:place.source,layers:['playable-context','near-scenery','landmark','far-landscape','sky'],geography:code,decorative:true};scene.add(root);
   const previousBackground=scene.background,previousFog=scene.fog;scene.background=new T.Color(t.sky);scene.fog=new T.Fog(t.fog,50,230);
   const sky=createSkyDome(root,{zenith:t.sky,horizon:t.fog,glow:'#ffe2b1',sun:[-.5,.6,-.8]});createCloudBanks(root,{finish,low,seed:code.charCodeAt(0),groups:low?6:10,depth:[-80,-130],high:[18,32],flat:code==='MNG'?.35:.65});
   const sceneGeometry=new Builder(code==='CHN'?.3:0),trees:Placement[]=[];
   if(code==='CHN'){
    root.userData.landform='fractured-sandstone-spires-and-natural-arches';
    for(let i=0;i<17;i++){const x=-15+i*7.7,z=-24-(i%3)*17,h=15+(i%5)*3.1,base=-14; sandstoneSpire(sceneGeometry,x,base,z,h,2.8+(i%3)*.7,i);trees.push({x,y:base+h+.3,z,scale:.7+(i%3)*.2});}
    // Natural bridges have abutments down into the valley; no detached half-rings.
    for(const [x,z] of [[25,-35],[63,-52]]){const arch=new T.TorusGeometry(6,.85,8,30,Math.PI);sceneGeometry.add(arch,'#a9a18d',[x,4,z]);for(const side of [-1,1])sandstoneSpire(sceneGeometry,x+side*6,-16,z,20,2.4,side+7);}
    createHeightfield(root,{name:'wulingyuan-forested-valley',x:finish/2,y:-16,z:-68,width:finish+160,depth:140,segments:[low?35:65,low?18:30],height:(u,v)=>Math.sin(u*18)*Math.sin(v*12)*3,color:(h)=>new T.Color(h>0?'#4f7752':'#668567')});
   }else if(code==='MNG'){
    root.userData.landform='open-rolling-steppe-and-river';
    createHeightfield(root,{name:'orkhon-open-steppe',x:finish/2,y:-3,z:-48,width:finish+180,depth:140,segments:[low?40:75,low?18:35],height:(u,v)=>Math.sin(u*13+v*4)*1.3+Math.sin(v*7)*1.8,color:(h,s,u,v)=>new T.Color(Math.sin(u*65+v*21)>.4?'#a1b66e':'#829b52')});
    for(let i=0;i<5;i++)ger(sceneGeometry,17+i*9,-1.7,-25-(i%2)*6,.9+(i%3)*.2);
    // A restrained settlement wall represents archaeological context in the
    // valley; no distant Mongolian landmark is moved beside this camp.
    for(let i=0;i<12;i++)sceneGeometry.add(new T.BoxGeometry(1.8,.6+(i%3)*.3,.8),'#a9a28b',[54+i*1.9,-1.6,-44]);
    for(let i=0;i<30;i++)trees.push({x:i*3.3,y:-2,z:-12-(i%3)*6,scale:.3+(i%3)*.1});
   }else if(code==='PRK'){
    root.userData.landform='paektu-volcanic-caldera-and-lava-terraces';
    createHeightfield(root,{name:'paektu-caldera-rim',x:finish*.55,y:-10,z:-68,width:120,depth:100,segments:[low?50:85,low?40:65],height:(u,v)=>{const r=Math.hypot((u-.5)*2.4,(v-.5)*2.5),rim=Math.exp(-((r-.78)**2)/.065);return rim*(23+Math.sin(u*44+v*23)*2)+Math.max(0,r-.8)*2;},color:(h)=>new T.Color(h>18?'#cad0cb':h>8?'#7c8586':'#64756c')});
    for(let i=0;i<24;i++){const x=-5+i*4.6,z=-13-(i%3)*6,height=3+(i%5)*.8;sceneGeometry.add(new T.CylinderGeometry(.8,1.15,height,6,2),'#667071',[x,-7+height/2,z],[0,i*.37,0],[1,1,1],.14);if(i%3===0)trees.push({x,y:-6,z:-24,scale:.7});}
   }else{
    root.userData.landform='seoul-urban-rooftops-namsan-and-river';
    createHeightfield(root,{name:'namsan-forested-hill',x:48,y:-15,z:-85,width:75,depth:60,segments:[low?30:50,20],height:(u,v)=>22*Math.exp(-((u-.5)**2*12+(v-.5)**2*10)),color:()=>new T.Color('#547861')});
    const tower=new Builder();tower.add(new T.CylinderGeometry(.44,.7,18,14),'#d7dfdb',[48,15,-85]);tower.add(new T.CylinderGeometry(2.5,1.8,2.2,20),'#546a7b',[48,23,-85]);tower.add(new T.CylinderGeometry(2.4,2.4,.28,20),'#c6d8d8',[48,24.2,-85]);tower.add(new T.CylinderGeometry(.08,.21,8,8),'#d5d9d5',[48,28,-85]);tower.mesh(root,vertexMaterial(.7),'namsan-seoul-tower');
    for(let i=0;i<26;i++){const x=-20+i*5.5,z=-23-(i%3)*12,h=4+(hash('seoul'+i)%13),w=3+(i%3)*.7;sceneGeometry.add(new T.BoxGeometry(w,h,3),'#889aa8',[x,-12+h/2,z]);for(let row=0;row<Math.floor(h/1.2);row++)for(let col=0;col<3;col++)sceneGeometry.add(new T.BoxGeometry(.47,.56,.05),i%3?'#b5d7dc':'#e9d8a0',[x-w*.3+col*w*.3,-11.5+row*1.2,z+1.53]);}
    for(let i=0;i<12;i++){sceneGeometry.add(new T.BoxGeometry(7.1,.5,2),'#b6bcc0',[-10+i*7,-7,-57]);sceneGeometry.add(new T.CylinderGeometry(.4,.5,7,8),'#8c999f',[-10+i*7,-10.5,-57]);}
   }
   // Three real distance layers; their shapes belong to the setting rather
   // than copying Japan's Fuji, blossom canopy or floating-rock staircase.
   for(let band=0;band<3;band++)createHeightfield(root,{name:`${code}-range-${band}`,x:finish/2,y:-14-band*2,z:-75-band*38,width:finish+230,depth:55,segments:[low?36:64,10],height:(u,v)=>Math.sin(v*Math.PI)*(6+Math.sin(u*18+band)*4+Math.cos(u*31-band)*2),color:()=>new T.Color(band===0?'#69816f':band===1?'#8ea3a1':'#b3bfc1')});
   const landmarkMaterial=vertexMaterial(.92);if(code==='CHN')markSurface(landmarkMaterial,'sandstone-cliff','#e3d5bd',.7);
   sceneGeometry.mesh(root,landmarkMaterial,`${code}-landmark-geometry`);
   plantGrove(root,code==='CHN'?'understory':code==='MNG'?'golden-tuft':'stone-pine',trees,{low,name:`${code}-setting-vegetation`,shadows:false});
   const water=code==='MNG'?createWaterSurface(root,{x:finish/2,y:-2.7,z:-12,width:finish+130,depth:5,shallow:'#789f9c',deep:'#466f79',segments:12,name:'orkhon-river',edge:'near'}):code==='PRK'?createWaterSurface(root,{x:finish*.55,y:-5,z:-68,width:45,depth:37,shallow:'#83b9bd',deep:'#245f80',segments:20,name:'paektu-caldera-lake'}):code==='KOR'?createWaterSurface(root,{x:finish/2,y:-13,z:-57,width:finish+120,depth:15,shallow:'#709fa9',deep:'#466d83',segments:14,name:'seoul-river'}):null;
   let windsock:T.Group|undefined;
   if(code==='MNG'){
    const pole=new Builder();pole.add(new T.CylinderGeometry(.055,.07,3.3,7),'#8a704f',[21,1.65,-1.25]);pole.mesh(root,vertexMaterial(.9),'steppe-wind-indicator-pole');
    windsock=new T.Group();windsock.name='wind-corridor-windsock';windsock.position.set(21,3.2,-1.25);root.add(windsock);
    const cloth=new T.Mesh(new T.CylinderGeometry(.16,.3,1.3,10,1,true),new T.MeshStandardMaterial({color:'#d79545',side:T.DoubleSide,roughness:.95}));cloth.rotation.z=-Math.PI/2;cloth.position.x=.65;windsock.add(cloth);
   }
   let disposed=false;return{root,frame:(x)=>sky.follow(x),update:(time,_dt,signals)=>{water?.update(context.reducedMotion?0:time);if(windsock){const force=signals.wind[0]?.strength||0;windsock.rotation.z=context.reducedMotion?-.15:-.45+force*.4+Math.sin(time*4)*force*.05;}},setReducedMotion:()=>{},setView:()=>{},finalize:(target,onReady)=>loadSurfaceMaps(target,low,onReady),dispose:()=>{if(disposed)return;disposed=true;disposeTree(root);scene.background=previousBackground;scene.fog=previousFog;}};
  },
  dressPlatform(root,p,context){
   if(p.motion){woodenDeck(root,p);if(code==='KOR'){root.traverse(o=>{if(o instanceof T.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof T.MeshStandardMaterial){m.color.set('#7d909a');m.metalness=.25;}});}return;}
   // Grounded countries descend below the scenic floor. This is visual-only:
   // authored top surfaces, headroom, jumps and all collision coordinates stay fixed.
   const thin=p.route==='bonus'||p.route==='upper',visual={...p,thickness:thin?p.thickness:Math.max(p.thickness,p.y+26)};
   const details=dressLandmass(root,visual,palette,{low:context.low,kind:thin?'block':p.terrain==='stairs'?'stairs':p.terrain==='cliff'?'cliff':'ground'});
   const cap=root.getObjectByName('country-platform-cap') as T.Mesh;
   const material=cap.material as T.MeshStandardMaterial;
   material.map=pixelTexture(64,(u,v,x,y)=>{const grain=.76+.18*Math.sin(x*1.7+y*.63)+.06*Math.sin(x*7.3-y*4.1);return[grain*255,grain*255,grain*255];});material.map.repeat.set(p.width*.3,1.2);material.needsUpdate=true;
   if(code==='KOR'){
    const facade=new Builder();for(let row=0;row<6;row++)for(let col=0;col<Math.floor(p.width/1.2);col++)facade.add(new T.BoxGeometry(.65,.7,.05),row%3?'#a9ced7':'#d5cca4',[-p.width/2+.7+col*1.2,-1.2-row*1.4,p.depth/2+.08]);facade.add(new T.BoxGeometry(1.1,.6,.8),'#87959a',[0,(p.slope||0)/2+.32,-1.1]);facade.mesh(details,vertexMaterial(.75),'seoul-rooftop-facade-and-service-unit');
   }else if(!thin){
    const surface=localSurface(p),count=Math.min(context.low?70:140,Math.ceil(p.width*5)),placements:Placement[]=[];
    for(let i=0;i<count;i++){const x=-p.width*.48+p.width*.96*i/Math.max(1,count-1),z=i%2?-.95:Math.max(.95,p.depth*.48),s=.1+((hash(p.id+String(i))%100)/100)*.15;placements.push({x,y:surface(x)+.07,z,scale:[s,.09+s,s],color:i%3?t.top:code==='MNG'?'#b5bd70':'#75964c'});}
    scatter(details,new T.ConeGeometry(1,1,4),matte('#ffffff'),placements,'country-grass-and-eroded-rim');
   }
   if(p.climbable){const ladder=new Builder();for(let i=0;i<7;i++)ladder.add(new T.BoxGeometry(.5,.06,.08),'#8c7553',[-p.width/2-.06,-1.7+i*.26,.4]);ladder.mesh(root,vertexMaterial(.8),'optional-wall-climb-rungs');}
   if(p.width>8&&code!=='KOR')plantGrove(root,code==='MNG'?'golden-tuft':code==='CHN'?'shrub':'stone-pine',[{x:p.width*.28,y:0,z:-1.4,scale:code==='MNG'?.3:.5}],{low:context.low,shadows:false});
  },
  createEnemy:bellSentinel,
  createDiscoveryBlock:(parent,w,h)=>createDiscoveryCrate(parent,w,h,{body:'stone',color:t.rock,trim:t.accent,glyph:'#f5deb0'}),
  decorateCheckpoint:(marker)=>{const post=createBannerPost(marker,{pole:'#695c44',cloth:t.accent,accent:'#f4d28b',height:1.7});post.position.set(-.5,0,-.3);},
  decorateFinish:(gate)=>{const arch=createArchway(gate,{style:code==='MNG'?'timber':'stone',width:3.2,height:3.0,stone:t.rock,trim:t.accent});arch.position.z=-1.5;},
 };
}
