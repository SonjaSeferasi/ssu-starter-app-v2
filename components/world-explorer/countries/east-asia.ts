import * as T from 'three';
import {Builder,disposeTree,fbm,hash,matte,random,scatter,vertexMaterial,type Placement} from '../kit/common';
import {createHeightfield,ridgedRange,mountainColor} from '../kit/landform';
import {createSkyDome,createCloudBanks} from '../kit/sky';
import {plantGrove} from '../kit/vegetation';
import {createWaterSurface,createWaterfall} from '../kit/water';
import {createArchway,createBannerPost,createDiscoveryCrate} from '../kit/markers';
import {createCreatureRig,finishCreature} from '../kit/creature';
import {loadSurfaceMaps} from '../kit/surface-maps';
import {eastAsiaPlaces,type NewEastAsiaCode} from '../../../lib/world-explorer/east-asia';
import {eastAsiaTerrain,naturalRockMaterial} from './east-asia-terrain';
import type {CountryEnvironment} from './types';

const themes={
 CHN:{id:'china-wulingyuan',sky:'#559cd6',haze:'#bed5d4',top:'#51783d',stone:'#aaa28a',dark:'#50644e',sun:'#ffdfb5',accent:'#e1b470',exposure:1.05},
 MNG:{id:'mongolia-orkhon',sky:'#4195d6',haze:'#d2e2d1',top:'#91a34f',stone:'#b0a177',dark:'#6d7d46',sun:'#fff0c9',accent:'#d8a450',exposure:1.02},
 PRK:{id:'north-korea-paektu',sky:'#579cd3',haze:'#c4d8e2',top:'#849578',stone:'#8d98a2',dark:'#536b7b',sun:'#e7f3ff',accent:'#80d0d5',exposure:1.06},
 KOR:{id:'south-korea-seoul',sky:'#759bc8',haze:'#ecdac4',top:'#a9bcc0',stone:'#aab7bf',dark:'#415d73',sun:'#ffd9aa',accent:'#edbc76',exposure:1.04},
} as const;

function spire(b:Builder,x:number,z:number,height:number,width:number,index:number,base=-16){
 const g=new T.CylinderGeometry(width*.45,width*.66,height,14,16),p=g.getAttribute('position');
 for(let i=0;i<p.count;i++){const yy=p.getY(i)/height+.5,a=Math.atan2(p.getZ(i),p.getX(i)),r=1+Math.sin(a*7+index)*.1+Math.sin(yy*44+index)*.035+fbm(a*2,yy*14,index,3)*.08;p.setX(i,p.getX(i)*r);p.setZ(i,p.getZ(i)*r);if(yy>.94)p.setY(i,p.getY(i)+Math.sin(a*5+index)*.15);}g.computeVertexNormals();
 b.add(g,index%3?'#b3aa91':'#9ba38c',[x,base+height/2,z],[0,index*.27,0],[1,1,1],.16);
 b.add(new T.CylinderGeometry(width*.47,width*.48,.24,14),'#527f46',[x,base+height+.04,z]);
}
function ger(b:Builder,x:number,y:number,z:number,size:number){
 b.add(new T.CylinderGeometry(size,size,size*.8,20),'#dfddca',[x,y+size*.4,z]);b.add(new T.ConeGeometry(size*1.07,size*.65,20),'#eee6ce',[x,y+size*1.12,z]);
 for(const yy of [.2,.6])b.add(new T.TorusGeometry(size*1.01,.026,4,20),'#906c49',[x,y+size*yy,z],[Math.PI/2,0,0]);b.add(new T.BoxGeometry(size*.46,size*.58,.055),'#936441',[x,y+size*.3,z+size]);
}
function serviceDrone(parent:T.Object3D){
 const rig=createCreatureRig(parent,{name:'original-survey-service-robot',height:.85,feet:[-.11,.11],footColor:'#456071',stride:6});
 const m=new T.Mesh(new T.BoxGeometry(.42,.45,.3),matte('#d2b670'));m.position.y=.45;rig.body.add(m);return finishCreature(rig);
}
function district(b:Builder,x:number,z:number,height:number,width:number,index:number){
 const base=-12,d=3.5+(index%3),color=['#7d97a7','#9baeb6','#6e8b9e','#bcc7c8'][index%4];
 b.add(new T.BoxGeometry(width,height,d),color,[x,base+height/2,z]);
 b.add(new T.BoxGeometry(width+.15,.17,d+.15),'#bfcccf',[x,base+height,z]);
 const cols=Math.max(2,Math.floor(width/.8)),rows=Math.floor(height/1.2);
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)b.add(new T.BoxGeometry(width/cols*.6,.64,.035),(row+col+index)%6===0?'#f2d4a0':'#35596e',[x-width*.43+col*width*.86/(cols-1),base+.75+row*1.2,z+d/2+.025]);
}

/** Original scene composition for each East Asian setting. Physics, saves and
 * controller behavior remain in the shared engine. No whole-scene image is used. */
export function createEastAsiaEnvironment(code:NewEastAsiaCode):CountryEnvironment{
 const t=themes[code],place=eastAsiaPlaces[code];
 return{
  id:t.id,info:{title:place.title,landmarkSource:place.source,license:'Original procedural models and textures for SocialU; existing CC0 assets retain materials/LICENSES.md.',representation:`A fictional platform route inspired by ${place.landmark}; compressed scenery is not a measured reconstruction or visitor route.`,assets:[`${code}-organic-landforms`,`${code}-regional-vegetation`,`${code}-landmark-study`]},
  lighting:{background:t.sky,exposure:t.exposure,sun:t.sun,sunIntensity:3.3,sky:'#d9edff',ground:'#77846a',hemisphere:1.6,rim:'#b8d6ec',rimIntensity:.85,pixelRatio:1.15},
  mount(context){
   const {scene,finish,low}=context,root=new T.Group();root.name=`${code}-country-environment`;root.userData={environmentId:t.id,landmark:place.landmark,source:place.source,geography:code,layers:['foreground','gameplay-context','near-background','far-landmark','atmosphere'],decorative:true};scene.add(root);
   const previousBackground=scene.background,previousFog=scene.fog;scene.background=new T.Color(t.sky);scene.fog=new T.Fog(t.haze,65,235);
   const sky=createSkyDome(root,{zenith:t.sky,horizon:t.haze,glow:t.sun,sun:[-.5,.7,-.8],band:code==='KOR'?'#f2dfc7':t.haze});
   createCloudBanks(root,{finish,low,seed:hash(code),groups:code==='CHN'?14:8,depth:[-48,-110],high:code==='CHN'?[8,23]:[18,31],flat:code==='MNG'?.3:.7,opacity:.78});
   const b=new Builder(code==='CHN'?.3:0),trees:Placement[]=[],animations:((time:number)=>void)[]=[],randomize=random(hash(code));
   if(code==='CHN'){
    root.userData.landform='fractured-sandstone-spires-and-natural-arches';
    for(let band=0;band<3;band++)for(let i=0;i<(low?10:14);i++){
     const x=-23+i*9+(band%2)*4,z=-19-band*27-(i%3)*3,height=18+(i%5)*3.5+band*2,width=3+(i%3)*.65;spire(b,x,z,height,width,i+band*17);
     trees.push({x,y:height-15.7,z,scale:.85+(i%3)*.13});
    }
    // A single irregular stone span joins real abutments, rather than repeating torus rings.
    const arch=new T.Shape();arch.moveTo(-6,0);arch.bezierCurveTo(-5,8,5,8,6,0);arch.lineTo(4.7,0);arch.bezierCurveTo(3.8,5.9,-3.8,5.9,-4.7,0);arch.closePath();
    b.add(new T.ExtrudeGeometry(arch,{depth:1.8,bevelEnabled:true,bevelSize:.18,bevelThickness:.15,bevelSegments:2,curveSegments:24}),'#aba48b',[29,1,-46]);for(const side of [-1,1])spire(b,29+side*5.3,-45.1,17,2.7,side+18);
    createHeightfield(root,{name:'forested-valley-floor',x:finish/2,y:-16,z:-58,width:finish+150,depth:90,segments:[low?36:60,24],height:(u,v)=>fbm(u*8,v*7,15,4)*5,color:()=>new T.Color('#54765a')});
    const falls=createWaterfall(root,{x:47,top:5,z:-33,width:1.2,height:19,seed:13,low,tint:'#c8e4e8'});animations.push(time=>falls.update(time));
    plantGrove(root,'plane',trees,{low,name:'wulingyuan-broadleaf-canopies',shadows:false});
   }else if(code==='MNG'){
    root.userData.landform='open-rolling-steppe-and-river';
    createHeightfield(root,{name:'orkhon-rolling-pasture',x:finish/2,y:-3.2,z:-49,width:finish+160,depth:90,segments:[low?45:80,low?24:40],height:(u,v)=>Math.sin(u*10+v*3)*.85+Math.sin(v*6)*1.1,color:(h,_s,u,v)=>new T.Color('#94a658').lerp(new T.Color('#b2b969'),fbm(u*22,v*18,71,3)*.7)});
    for(let i=0;i<4;i++)ger(b,10+i*17,-2.5,-17-(i%2)*9,1.1+(i%2)*.15);
    // Sparse outcrops and grasses preserve the steppe's open horizon.
    const tufts:Placement[]=[],rocks:Placement[]=[];for(let i=0;i<(low?90:180);i++){const x=-12+randomize()*(finish+40),z=-8-randomize()*26;tufts.push({x,y:-2.3,z,scale:.45+randomize()*.5});if(i%10===0)rocks.push({x,y:-2.3,z,scale:[.45+randomize(),.18+randomize()*.25,.5]});}
    plantGrove(root,'golden-tuft',tufts,{low,name:'steppe-grass-islands'});scatter(root,new T.DodecahedronGeometry(1,0),matte('#a39c7f'),rocks,'steppe-eroded-outcrops');
    const river=createWaterSurface(root,{x:finish/2,y:-2.55,z:-6.2,width:finish+80,depth:4,shallow:'#91bbad',deep:'#467e8e',segments:24,name:'orkhon-river',edge:'near'});animations.push(time=>river.update(time));
   }else if(code==='PRK'){
    root.userData.landform='paektu-volcanic-caldera-and-lava-terraces';
    // The near side is a low scenic cutaway. It exposes the lake instead of
    // hiding it behind an opaque full-height foreground rim.
    createHeightfield(root,{name:'paektu-caldera-rim',x:finish*.53,y:-3.7,z:-65,width:108,depth:82,segments:[low?55:90,low?36:56],height:(u,v)=>{const r=Math.hypot((u-.5)*2.4,(v-.5)*2.6),rim=Math.exp(-((r-.83)**2)/.052),front=1-T.MathUtils.smoothstep(v,.53,.78)*.9;return rim*(22+Math.sin(u*46+v*17)*2.6)*front+fbm(u*17,v*11,9,3)*1.6;},color:mountainColor({snowLine:17,rock:'#8794a2',forest:'#788b79',snow:'#e6edf1',treeLine:3})});
    const lake=createWaterSurface(root,{x:finish*.53,y:-.6,z:-65,width:40,depth:28,shallow:'#7ec5ce',deep:'#285d83',segments:24,roughness:.22,name:'paektu-caldera-lake'});
    const old=lake.surface.geometry,geometry=new T.CircleGeometry(1,64);geometry.scale(20,14,1);const count=geometry.getAttribute('position').count,color=new Float32Array(count*3);for(let i=0;i<count;i++){color[i*3]=.45;color[i*3+1]=.78;color[i*3+2]=.88;}geometry.setAttribute('color',new T.BufferAttribute(color,3));lake.surface.geometry=geometry;old.dispose();animations.push(time=>lake.update(time));
    for(let i=0;i<28;i++){const x=-8+i*4.4,z=-8-(i%3)*6,h=1+(i%4)*.7; b.add(new T.CylinderGeometry(.7,1,h,6),'#7c8993',[x,-5+h/2,z],[.07,i*.4,.08],[1,1,1],.18);if(i%5===0)trees.push({x,y:-4.7,z:-22,scale:.65});}
    plantGrove(root,'conifer',trees,{low,name:'paektu-lower-highland-conifers',shadows:false});
   }else{
    root.userData.landform='seoul-urban-rooftops-namsan-and-river';
    createHeightfield(root,{name:'namsan-forested-hill',x:46,y:-14,z:-94,width:72,depth:55,segments:[low?32:50,22],height:(u,v)=>22*Math.exp(-((u-.5)**2*13+(v-.5)**2*11)),color:mountainColor({snowLine:60,rock:'#637c73',forest:'#46775b',snow:'#ffffff',treeLine:35})});
    const tower=new Builder();tower.add(new T.CylinderGeometry(.4,.75,16,14),'#d9e0df',[46,15,-94]);tower.add(new T.CylinderGeometry(2.2,1.5,1.8,24),'#58778c',[46,22.1,-94]);tower.add(new T.CylinderGeometry(2.25,2.1,.32,24),'#e3e7dd',[46,23.16,-94]);tower.add(new T.CylinderGeometry(.06,.18,7,8),'#dde1db',[46,26.8,-94]);tower.mesh(root,vertexMaterial(.6),'namsan-seoul-tower');
    for(let band=0;band<2;band++)for(let i=0;i<(low?12:17);i++)district(b,-16+i*7.5+band*3,-17-band*20,5+(hash('seoul'+band+i)%15),3.5+(i%4)*.6,i+band);
    for(let i=0;i<14;i++){b.add(new T.BoxGeometry(7,.35,1.8),'#b6c4c8',[-12+i*7,-6.8,-58]);b.add(new T.CylinderGeometry(.35,.45,7,8),'#8398a5',[-12+i*7,-10.5,-58]);}
    const river=createWaterSurface(root,{x:finish/2,y:-11,z:-57,width:finish+110,depth:15,shallow:'#7babb8',deep:'#486e86',segments:24,name:'seoul-river'});animations.push(time=>river.update(time));
    for(let i=0;i<17;i++)trees.push({x:-8+i*6,y:-6.5,z:-10,scale:.55});plantGrove(root,'plane',trees,{low,name:'seoul-street-trees',shadows:false});
   }
   for(let band=0;band<2;band++)createHeightfield(root,{name:`${code}-distant-range-${band}`,x:finish/2,y:-13-band*2,z:-105-band*35,width:finish+210,depth:42,segments:[low?38:64,12],height:ridgedRange(hash(code)+band,{peaks:code==='MNG'?3:6,height:code==='MNG'?5:code==='PRK'?13:9}),color:()=>new T.Color(band===0?'#8ba6af':'#b1c5cc')});
   b.mesh(root,code==='CHN'?naturalRockMaterial('CHN'):vertexMaterial(.91),`${code}-regional-scene-geometry`);
   let windsock:T.Group|undefined;
   if(code==='MNG'){
    const pole=new Builder();pole.add(new T.CylinderGeometry(.05,.07,3.1,7),'#977b54',[21,1.55,-1.3]);pole.mesh(root,vertexMaterial(.9),'steppe-wind-indicator-pole');windsock=new T.Group();windsock.name='wind-corridor-windsock';windsock.position.set(21,3,-1.3);root.add(windsock);const cloth=new T.Mesh(new T.CylinderGeometry(.12,.27,1.2,10,1,true),new T.MeshStandardMaterial({color:'#dfab56',side:T.DoubleSide,roughness:1}));cloth.rotation.z=-Math.PI/2;cloth.position.x=.6;windsock.add(cloth);
   }
   let disposed=false;return{root,frame:x=>sky.follow(x),update:(time,_dt,signals)=>{const visual=context.reducedMotion?0:time;animations.forEach(update=>update(visual));if(windsock){const force=signals.wind[0]?.strength||0;windsock.rotation.z=context.reducedMotion?-.1:-.38+force*.36+Math.sin(time*5)*force*.04;}},setReducedMotion:()=>{},setView:view=>{const fog=scene.fog;if(fog instanceof T.Fog){fog.near=view==='overview'?115:65;fog.far=view==='overview'?310:235;}},finalize:(target,onReady)=>loadSurfaceMaps(target,low,onReady),dispose:()=>{if(disposed)return;disposed=true;disposeTree(root);scene.background=previousBackground;scene.fog=previousFog;}};
  },
  dressPlatform:(root,p,context)=>eastAsiaTerrain(root,p,code,context.low),
  createEnemy:serviceDrone,
  createDiscoveryBlock:(parent,w,h)=>createDiscoveryCrate(parent,w,h,{body:'stone',color:t.stone,trim:t.accent,glyph:'#fff1d1'}),
  decorateCheckpoint:marker=>{createBannerPost(marker,{pole:'#7c705a',cloth:t.accent,accent:'#ffe0a0',height:1.6}).position.set(-.5,0,-.35);},
  decorateFinish:gate=>{createArchway(gate,{style:code==='MNG'?'timber':'stone',width:3.1,height:3,stone:t.stone,trim:t.accent}).position.z=-1.5;},
 };
}
