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
import {facadeCourses} from './asia-landscape-art';
import {eastAsiaTerrain,naturalRockMaterial} from './east-asia-terrain';
import type {CountryEnvironment} from './types';

const themes={
 CHN:{id:'china-wulingyuan',sky:'#559cd6',haze:'#bed5d4',top:'#51783d',stone:'#aaa28a',dark:'#50644e',sun:'#ffdfb5',accent:'#e1b470',exposure:1.05},
 MNG:{id:'mongolia-orkhon',sky:'#4195d6',haze:'#d2e2d1',top:'#91a34f',stone:'#b0a177',dark:'#6d7d46',sun:'#fff0c9',accent:'#d8a450',exposure:1.02},
 PRK:{id:'north-korea-paektu',sky:'#579cd3',haze:'#c4d8e2',top:'#849578',stone:'#8d98a2',dark:'#536b7b',sun:'#e7f3ff',accent:'#80d0d5',exposure:1.06},
 KOR:{id:'south-korea-seoul',sky:'#759bc8',haze:'#ecdac4',top:'#a9bcc0',stone:'#aab7bf',dark:'#415d73',sun:'#ffd9aa',accent:'#edbc76',exposure:1.04},
} as const;

function spire(b:Builder,x:number,z:number,height:number,width:number,index:number,base=-16){
 const g=new T.CylinderGeometry(width*.38,width*.7,height,16,18),p=g.getAttribute('position');
 const lean=Math.sin(index*2.7)*width*.12;
 for(let i=0;i<p.count;i++){const yy=p.getY(i)/height+.5,a=Math.atan2(p.getZ(i),p.getX(i)),r=1+Math.sin(a*5+index)*.12+Math.sin(yy*27+index)*.045+(fbm(a*2,yy*11,index,3)-.5)*.25-.12*Math.pow(Math.max(0,Math.sin(a*9+index)),8),ledge=1+Math.floor(yy*6)%2*.025;p.setX(i,p.getX(i)*r*ledge+lean*yy*yy);p.setZ(i,p.getZ(i)*r*(.75+(index%4)*.12));if(yy>.94)p.setY(i,p.getY(i)+Math.sin(a*3+index)*width*.12);}g.computeVertexNormals();
 b.add(g,index%3?'#b3aa91':'#9ba38c',[x,base+height/2,z],[0,index*.27,0],[1,1,1],.16);
 // Broken moss patches rather than a uniform round lid on every pillar.
 for(let j=0;j<3;j++)b.add(new T.DodecahedronGeometry(1,0),'#496d3d',[x+lean+Math.cos(j*2.1)*width*.14,base+height-.03,z+Math.sin(j*2.1)*width*.13],[0,j,0],[width*.22,.12,width*.17],.12);
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
 if(index%3===0){b.add(new T.BoxGeometry(width*.68,height*.22,d*.76),'#7993a5',[x,base+height*1.11,z]);b.add(new T.CylinderGeometry(.03,.04,2.4,5),'#a7bdc9',[x,base+height*1.22+1.2,z]);}
 if(index%4===1)b.add(new T.BoxGeometry(width*.4,.65,d*.6),'#445b72',[x,base+height+.35,z]);
 for(const side of [-1,1]){b.add(new T.BoxGeometry(.065,height,.12),'#a8bfc9',[x+side*width*.43,base+height/2,z+d/2+.06]);for(let floor=2;floor<height;floor+=3)b.add(new T.BoxGeometry(width,.08,.16),'#96adb6',[x,base+floor,z+d/2+.06]);}
 const cols=Math.max(2,Math.floor(width/.8)),rows=Math.floor(height/1.2);
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)b.add(new T.BoxGeometry(width/cols*.6,.64,.035),(row+col+index)%6===0?'#f2d4a0':'#35596e',[x-width*.43+col*width*.86/(cols-1),base+.75+row*1.2,z+d/2+.025]);
}

/** Original scene composition for each East Asian setting. Physics, saves and
 * controller behavior remain in the shared engine. No whole-scene image is used. */
export function createEastAsiaEnvironment(code:NewEastAsiaCode):CountryEnvironment{
 const t=themes[code],place=eastAsiaPlaces[code];
 return{
  id:t.id,info:{title:place.title,landmarkSource:place.source,license:'Original procedural models and textures for SocialU; existing CC0 assets retain materials/LICENSES.md.',representation:`A fictional platform route inspired by ${place.landmark}; compressed scenery is not a measured reconstruction or visitor route.`,assets:[`${code}-organic-landforms`,`${code}-regional-vegetation`,`${code}-landmark-study`]},
  lighting:{background:t.sky,exposure:code==='KOR'?.98:t.exposure,sun:code==='KOR'?'#ffc18d':t.sun,sunIntensity:code==='KOR'?2.7:3.3,sky:code==='KOR'?'#9eb6df':'#d9edff',ground:'#536147',hemisphere:code==='KOR'?.85:1.25,rim:'#b8d6ec',rimIntensity:.85,pixelRatio:1.15},
  mount(context){
   const {scene,finish,low}=context,root=new T.Group();root.name=`${code}-country-environment`;root.userData={environmentId:t.id,landmark:place.landmark,source:place.source,geography:code,layers:['foreground','gameplay-context','near-background','far-landmark','atmosphere'],decorative:true};scene.add(root);
   const previousBackground=scene.background,previousFog=scene.fog;scene.background=new T.Color(t.sky);scene.fog=new T.Fog(t.haze,65,235);
   const sky=createSkyDome(root,{zenith:t.sky,horizon:t.haze,glow:t.sun,sun:[-.5,.7,-.8],band:code==='KOR'?'#f2dfc7':t.haze});
   createCloudBanks(root,{finish,low,seed:hash(code),groups:code==='CHN'?14:8,depth:[-48,-110],high:code==='CHN'?[8,23]:[18,31],flat:code==='MNG'?.3:.7,opacity:.78});
   const b=new Builder(code==='CHN'?.3:0),trees:Placement[]=[],animations:((time:number)=>void)[]=[],randomize=random(hash(code));
   if(code==='CHN'){
    root.userData.landform='fractured-sandstone-spires-and-natural-arches';
    for(let band=0;band<3;band++)for(let i=0;i<(low?10:14);i++){
     const seed=i+band*17,x=-23+i*9+(band%2)*4+(randomize()-.5)*6,z=-20-band*27-randomize()*11,height=14+randomize()*24+band*2,width=1.8+randomize()**1.5*5.2;spire(b,x,z,height,width,seed);
     if(i%4!==0)trees.push({x:x+Math.sin(seed*2.7)*width*.12,y:height-16,z,scale:[.45+randomize()*.4,.5+randomize()*.4,.45+randomize()*.4],rotation:randomize()*6.28});
     if(i%3===0)spire(b,x+width*.5,z-1,height*.68,width*.65,seed+70);
    }
    // A single irregular stone span joins real abutments, rather than repeating torus rings.
    const arch=new T.Shape();arch.moveTo(-6,0);arch.bezierCurveTo(-5,8,5,8,6,0);arch.lineTo(4.7,0);arch.bezierCurveTo(3.8,5.9,-3.8,5.9,-4.7,0);arch.closePath();
    b.add(new T.ExtrudeGeometry(arch,{depth:1.8,bevelEnabled:true,bevelSize:.18,bevelThickness:.15,bevelSegments:2,curveSegments:24}),'#aba48b',[29,1,-46]);for(const side of [-1,1])spire(b,29+side*5.3,-45.1,17,2.7,side+18);
    const valley=createHeightfield(root,{name:'forested-valley-floor',x:finish/2,y:-16,z:-58,width:finish+150,depth:90,segments:[low?36:60,24],height:(u,v)=>fbm(u*8,v*7,15,4)*5,color:()=>new T.Color('#54765a')});valley.updateMatrixWorld(true);
    const falls=createWaterfall(root,{x:47,top:5,z:-33,width:1.2,height:19,seed:13,low,tint:'#c8e4e8'});animations.push(time=>falls.update(time));
    plantGrove(root,'plane',trees.filter((_,i)=>i%3!==0),{low,name:'wulingyuan-broadleaf-canopies',shadows:false});plantGrove(root,'conifer',trees.filter((_,i)=>i%3===0).map(p=>({...p,scale:.4})),{low,name:'wulingyuan-exposed-ridge-conifers',shadows:false});
    const thickets:Placement[]=[];for(let i=0;i<(low?45:90);i++){const x=-15+randomize()*(finish+35),z=-17-randomize()*31,hit=new T.Raycaster(new T.Vector3(x,20,z),new T.Vector3(0,-1,0)).intersectObject(valley)[0];if(hit)thickets.push({x,y:hit.point.y,z,scale:.7+randomize()*.8});}plantGrove(root,'plane',thickets,{low,name:'wulingyuan-valley-forest',shadows:false});
   }else if(code==='MNG'){
    root.userData.landform='open-rolling-steppe-and-river';
    createHeightfield(root,{name:'orkhon-rolling-pasture',x:finish/2,y:-3.2,z:-49,width:finish+160,depth:90,segments:[low?45:80,low?24:40],height:(u,v)=>Math.sin(u*10+v*3)*.85+Math.sin(v*6)*1.1,color:(h,_s,u,v)=>new T.Color('#94a658').lerp(new T.Color('#b2b969'),fbm(u*22,v*18,71,3)*.7)});
    for(let i=0;i<4;i++)ger(b,10+i*17,-2.5,-17-(i%2)*9,1.1+(i%2)*.15);
    // Sparse outcrops and grasses preserve the steppe's open horizon.
    const tufts:Placement[]=[],rocks:Placement[]=[];for(let i=0;i<(low?90:180);i++){const x=-12+randomize()*(finish+40),z=-8-randomize()*26;tufts.push({x,y:-2.3,z,scale:.45+randomize()*.5});if(i%10===0)rocks.push({x,y:-2.3,z,scale:[.45+randomize(),.18+randomize()*.25,.5]});}
    plantGrove(root,'golden-tuft',tufts,{low,name:'steppe-grass-islands'});scatter(root,new T.DodecahedronGeometry(1,0),matte('#a39c7f'),rocks,'steppe-eroded-outcrops');
    const river=createWaterSurface(root,{x:finish/2,y:-2.55,z:-6.2,width:finish+80,depth:5,shallow:'#7caa99',deep:'#355f74',segments:64,name:'orkhon-river',edge:'near'});
    const rp=river.surface.geometry.getAttribute('position');for(let i=0;i<rp.count;i++)rp.setY(i,rp.getY(i)+Math.sin(rp.getX(i)*.047)*2.2);river.surface.geometry.computeVertexNormals();animations.push(time=>river.update(time));
    createHeightfield(root,{name:'orkhon-continuous-near-bank',x:finish/2,y:-3,z:-10,width:finish+110,depth:9,segments:[64,12],height:(u,v)=>.25+Math.sin(u*8)*.16+Math.pow(v,2)*.2,color:()=>new T.Color('#89945a')});
    // The apron starts beneath the flared bank foot, outside the z=0 walking
    // lane. Its raised rear edge closes the sky-colored slit in both camera
    // aspects; it grades down into the existing foreground grass.
    createHeightfield(root,{name:'orkhon-foreground-ground-transition',x:finish/2,y:-3.45,z:8,width:finish+110,depth:14,segments:[64,12],height:(u,v)=>Math.sin(u*11)*.08+(1-v)*1.1+v*.12,color:(_h,_s,_u,v)=>new T.Color('#8f9865').lerp(new T.Color('#7f8e57'),v)});
   }else if(code==='PRK'){
    root.userData.landform='paektu-volcanic-caldera-and-lava-terraces';
    // The near side is a low scenic cutaway. It exposes the lake instead of
    // hiding it behind an opaque full-height foreground rim.
    createHeightfield(root,{name:'paektu-caldera-rim',x:finish*.53,y:-3.7,z:-65,width:108,depth:82,segments:[low?64:100,low?40:64],height:(u,v)=>{const r=Math.hypot((u-.5)*2.4,(v-.5)*2.6),a=Math.atan2(v-.5,u-.5),crest=.82+Math.sin(a*5)*.035+Math.sin(a*11)*.02,rim=Math.exp(-((r-crest)**2)/.031),front=1-T.MathUtils.smoothstep(v,.53,.8)*.88;return rim*(20+Math.sin(a*7)*3+Math.sin(a*13)*1.2+Math.sin(a*23)*.65)*front+fbm(u*28,v*24,9,4)*1.7;},color:mountainColor({snowLine:23,rock:'#596575',forest:'#657666',snow:'#dce7ed',treeLine:2})});
    const lake=createWaterSurface(root,{x:finish*.53,y:-.6,z:-65,width:40,depth:28,shallow:'#7ec5ce',deep:'#285d83',segments:24,roughness:.22,name:'paektu-caldera-lake'});
    const old=lake.surface.geometry,geometry=new T.CircleGeometry(1,80);geometry.scale(20,14,1);const count=geometry.getAttribute('position').count,color=new Float32Array(count*3),deep=new T.Color('#20576e'),shoreColor=new T.Color('#558d98');for(let i=0;i<count;i++){const c=i===0?deep:shoreColor;color[i*3]=c.r;color[i*3+1]=c.g;color[i*3+2]=c.b;}geometry.setAttribute('color',new T.BufferAttribute(color,3));lake.surface.geometry=geometry;old.dispose();animations.push(time=>lake.update(time));
    const lakeMaterial=lake.surface.material as T.MeshStandardMaterial;lakeMaterial.normalScale.set(.13,.13);lakeMaterial.roughness=.3;
    const shore=new T.Mesh(new T.RingGeometry(.99,1.09,80,3),matte('#58616b'));shore.name='paektu-basalt-shoreline';shore.rotation.x=-Math.PI/2;shore.scale.set(20,14,1);shore.position.set(finish*.53,-.64,-65);root.add(shore);
    for(let i=0;i<28;i++){const x=-8+i*4.4,z=-8-(i%3)*6,h=1+(i%4)*.7; b.add(new T.CylinderGeometry(.7,1,h,6),'#7c8993',[x,-5+h/2,z],[.07,i*.4,.08],[1,1,1],.18);if(i%5===0)trees.push({x,y:-4.7,z:-22,scale:.65});}
    plantGrove(root,'conifer',trees,{low,name:'paektu-lower-highland-conifers',shadows:false});
   }else{
    root.userData.landform='seoul-urban-rooftops-namsan-and-river';
    createHeightfield(root,{name:'namsan-forested-hill',x:46,y:-14,z:-94,width:72,depth:55,segments:[low?32:50,22],height:(u,v)=>22*Math.exp(-((u-.5)**2*13+(v-.5)**2*11)),color:mountainColor({snowLine:60,rock:'#637c73',forest:'#46775b',snow:'#ffffff',treeLine:35})});
    const tower=new Builder();tower.add(new T.CylinderGeometry(.4,.75,16,14),'#d9e0df',[46,15,-94]);tower.add(new T.CylinderGeometry(2.2,1.5,1.8,24),'#58778c',[46,22.1,-94]);tower.add(new T.CylinderGeometry(2.25,2.1,.32,24),'#e3e7dd',[46,23.16,-94]);tower.add(new T.CylinderGeometry(.06,.18,7,8),'#dde1db',[46,26.8,-94]);tower.mesh(root,vertexMaterial(.6),'namsan-seoul-tower');
    for(let band=0;band<3;band++)for(let i=0;i<(low?10:14);i++)district(b,-16+i*9+band*3,-20-band*18,5+(hash('seoul'+band+i)%20),3.5+(i%4)*.6,i+band);
    for(let i=0;i<14;i++){b.add(new T.BoxGeometry(7,.35,1.8),'#b6c4c8',[-12+i*7,-6.8,-58]);b.add(new T.CylinderGeometry(.35,.45,7,8),'#8398a5',[-12+i*7,-10.5,-58]);}
    const river=createWaterSurface(root,{x:finish/2,y:-11,z:-57,width:finish+110,depth:15,shallow:'#7babb8',deep:'#486e86',segments:24,name:'seoul-river'});animations.push(time=>river.update(time));
    // Trees and planters share the pavement top instead of floating over water.
    const pavementTop=-6.5;b.add(new T.BoxGeometry(finish+50,5,7),'#73808a',[finish/2,pavementTop-2.5,-10]);b.add(new T.BoxGeometry(finish+50,.16,.28),'#c2c6bd',[finish/2,pavementTop+.08,-6.6]);
    const glow=new Builder();for(let i=0;i<17;i++){const x=-8+i*6;trees.push({x,y:pavementTop,z:-10,scale:.55});b.add(new T.BoxGeometry(1.6,.22,1.4),'#4c5d61',[x,pavementTop-.11,-10]);if(i%2===0){b.add(new T.CylinderGeometry(.04,.06,2,6),'#344351',[x+2,pavementTop+1,-7.3]);glow.add(new T.BoxGeometry(.26,.12,.26),'#ffd69a',[x+2,pavementTop+2,-7.3]);}}
    const sidewalk=b.mesh(root,vertexMaterial(.9),'seoul-grounded-riverfront-pavement');sidewalk.userData.pavementTop=pavementTop;glow.mesh(root,vertexMaterial(.6,{emissive:'#ffba63',emissiveIntensity:.7}),'seoul-riverfront-lights');
    plantGrove(root,'plane',trees,{low,name:'seoul-street-trees',shadows:false});
   }
   for(let band=0;band<2;band++)createHeightfield(root,{name:`${code}-distant-range-${band}`,x:finish/2,y:-13-band*2,z:-105-band*35,width:finish+210,depth:42,segments:[low?38:64,12],height:ridgedRange(hash(code)+band,{peaks:code==='MNG'?3:6,height:code==='MNG'?5:code==='PRK'?13:9}),color:()=>new T.Color(band===0?'#8ba6af':'#b1c5cc')});
   if(b.parts.length)b.mesh(root,code==='CHN'?naturalRockMaterial('CHN'):vertexMaterial(.91),`${code}-regional-scene-geometry`);
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
