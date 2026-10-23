import * as T from 'three';
import type {Course,Platform} from './levels';
import {landingHeight} from './landing-geometry';
import {bridge,clearSceneTextures,island,terrainMaterials,tree} from './scene-3d';
import {Batch,Mushrooms,Puffs,at,bannerPole,bonsaiPine,canopyDeck,carvedMountain,cloud,cloudMaterial,domeHouse,fairyCastle,foliageMaterial,glowPoints,hangingGarden,house,karstPillars,mistSheets,pagoda,paperLantern,pillHills,planet,propKit,ringArch,roundTree,stoneBridge,timberStrut,torii,waterSurface,waterfall,waterfallMaterial,type Kit} from './toon-props';
import {clearToonTextures,mapleLeafTexture,rng,waterfallTexture} from './toon-textures';

/** Sky, light and atmosphere for each world. `glow` is where the sun glows in the sky;
 * `sunOffset` is the shadow-casting light relative to the hero (kept in front for readability). */
type Look={sky:[string,string,string];fog:string;near:number;far:number;hemi:[string,string,number];sun:[string,number];sunOffset:[number,number,number];rim:[string,number];glow:[number,number,number]};
export const looks:Record<number,Look>={
 1:{sky:['#2c83df','#7fbdf2','#dff2ff'],fog:'#d4ecfa',near:42,far:250,hemi:['#eef7ff','#a9cf6c',1.15],sun:['#fff0d2',3.2],sunOffset:[-8,16,12],rim:['#d4e8ff',.45],glow:[-.35,.42,-.84]},
 2:{sky:['#1d72da','#6cb1f0','#d9f0ff'],fog:'#d6eefb',near:55,far:300,hemi:['#eaf5ff','#d4bf94',1.15],sun:['#fff4de',3.2],sunOffset:[-8,16,12],rim:['#d8ecff',.45],glow:[-.4,.5,-.77]},
 3:{sky:['#438ed2','#9bc4e7','#f1e7c8'],fog:'#dbe2d1',near:48,far:250,hemi:['#e2eddf','#728247',.95],sun:['#ffdc9e',3],sunOffset:[9,12,10],rim:['#ffbd72',.7],glow:[.55,.32,-.82]},
};
function applyLook(scene:T.Scene,look:Look){
 scene.background=new T.Color(look.sky[2]);scene.fog=new T.Fog(look.fog,look.near,look.far);
 scene.traverse(o=>{
  if(o instanceof T.HemisphereLight){o.color.set(look.hemi[0]);o.groundColor.set(look.hemi[1]);o.intensity=look.hemi[2];}
  else if(o instanceof T.DirectionalLight){if(o.castShadow){o.color.set(look.sun[0]);o.intensity=look.sun[1];o.userData.offset=look.sunOffset;}else{o.color.set(look.rim[0]);o.intensity=look.rim[1];}}
 });
 const material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,
  uniforms:{top:{value:new T.Color(look.sky[0])},middle:{value:new T.Color(look.sky[1])},bottom:{value:new T.Color(look.sky[2])},glow:{value:new T.Vector3(...look.glow).normalize()},sun:{value:new T.Color(look.sun[0])}},
  vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec3 v;uniform vec3 top;uniform vec3 middle;uniform vec3 bottom;uniform vec3 glow;uniform vec3 sun;
void main(){vec3 d=normalize(v);vec3 c=mix(bottom,middle,smoothstep(-.03,.2,d.y));c=mix(c,top,smoothstep(.16,.72,d.y));
float s=max(dot(d,glow),0.);c+=sun*(pow(s,10.)*.32+pow(s,420.)*1.4);
gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
 const sky=new T.Mesh(new T.SphereGeometry(170,32,20),material);sky.renderOrder=-20;sky.frustumCulled=false;scene.add(sky);return sky;
}

type Glow={position:T.Vector3;size:number;color:string};
type Ctx={world:number;width:number;look:Look;r:()=>number;root:T.Group;kit:Kit;batch:Batch;leaves:Puffs;clouds:Puffs;foam:Puffs;mushrooms:Mushrooms;glows:Glow[];falls:T.Material;mats:ReturnType<typeof terrainMaterials>;water?:T.ShaderMaterial;updates:((time:number,camera?:T.Camera)=>void)[]};
const pick=<V>(list:readonly V[],r:()=>number)=>list[Math.floor(r()*list.length)];
/** A decorative landform; returns its top height at a world x. */
function land(c:Ctx,x:number,top:number,z:number,w:number,depth:number,seed:number,options:{grounded?:boolean;bottom?:number;detail?:'near'|'far'}={}){
 const p:Platform={x:x*100,y:-top*100,width:w*100,depth,kind:'rock'};
 const grounded=options.grounded??true,bottom=options.bottom??(grounded?1600:-top*100+200+w*30),detail=options.detail??'far';
 if(detail==='far'){
  const temporary=new T.Group(),built=island(temporary,p,c.world,c.mats,seed,grounded,bottom,'far');built.position.z=z;temporary.updateMatrixWorld(true);
  built.traverse(o=>{if(o instanceof T.Mesh&&!(o instanceof T.InstancedMesh)){c.batch.add(o.material as T.Material,o.geometry,o.matrixWorld);o.geometry.dispose();}});
 }else island(c.root,p,c.world,c.mats,seed,grounded,bottom,detail).position.z=z;
 return(gx:number)=>-landingHeight(p,p.x+Math.max(0,Math.min(w,gx-x))*100)/100;
}

/** Far and middle scenery for a course; the near layer lives in biome-details.ts. */
export function worldScenery(scene:T.Scene,course:Course){
 const world=course.number,look=looks[world]||looks[1],sky=applyLook(scene,look);
 const root=new T.Group();root.name='layered-world-vista';scene.add(root);
 const c:Ctx={world,width:course.width/100,look,r:rng(world*7919+3),root,kit:propKit(world),batch:new Batch(),leaves:new Puffs(),clouds:new Puffs(),foam:new Puffs(),mushrooms:new Mushrooms(),glows:[],falls:waterfallMaterial(),mats:terrainMaterials(world),updates:[]};
 if(world===1)meadow(c);else if(world===2)skyIslands(c);else village(c);
 c.batch.build(root,false);c.leaves.build(root,foliageMaterial());c.clouds.build(root,cloudMaterial());c.foam.build(root,cloudMaterial());c.mushrooms.build(root,false);
 glowPoints(root,c.glows);const falls=waterfallTexture();
 return{
  update(time:number,camera?:T.Camera){
   if(camera)sky.position.copy(camera.position);
   falls.offset.y=-time*.00045;if(c.water)c.water.uniforms.time.value=time*.001;
   for(const u of c.updates)u(time,camera);
  },
  dispose(){clearToonTextures();clearSceneTextures();},
 };
}

// ---- World 1: Mushroom Cliffs ----
function meadow(c:Ctx){
 const {r,width,root,kit,batch,leaves,clouds,mushrooms}=c,greens=['#5fb83a','#74c843','#4ea52f','#86d24c'];
 c.water=waterSurface(root,width/2,-12.6,-55,width+300,150,{deep:'#1b93b6',shallow:'#5ad2d6',horizon:'#cdeefa',fog:c.look.fog,near:c.look.near,far:c.look.far});
 // Candy-coloured pill hills fill the horizon.
 const pastel=['#9fe3a0','#7dd06e','#8fcaf5','#f6a9c9','#f8e08e','#c7b2f2','#ffc59c','#a8e6d9'],hills=[];
 for(let x=-95;x<width+100;x+=6+r()*5)hills.push({x,y:-15,z:-92-r()*22,radius:4.5+r()*5,height:18+r()*16,color:pick(pastel,r)});
 for(let x=-80;x<width+90;x+=8+r()*7)hills.push({x,y:-15,z:-64-r()*12,radius:3.2+r()*3.4,height:12+r()*10,color:pick(pastel,r)});
 pillHills(root,hills);
 // The castle rises from a real eroded terrace, with waterfalls and cypresses,
 // rather than sitting on an oversized smooth canopy sphere.
 const castleX=width*.72,castleCrest=land(c,castleX-9,2.9,-61,18,11,251,{bottom:1600});
 fairyCastle(batch,kit,at(castleX,castleCrest(castleX),-62,0,-.12,0,1.6));
 for(const side of [-1,1]){
  const px=castleX+side*6.2;roundTree(batch,leaves,kit,px,castleCrest(px),-59,2.2,r,greens);
  waterfall(root,c.falls,px+side*.7,castleCrest(px)-.12,-12.6,-53.8,1.4,c.foam);
 }
 // Two rows of waterfall cliffs above the river.
 const cliffs=(z0:number,spread:number,low:number,high:number,minW:number,maxW:number,falls:number,seed:number,gap:number)=>{
  for(let x=-18;x<width+20;){
   const w=minW+r()*(maxW-minW),top=low+r()*(high-low),z=z0-r()*spread,depth=4+r()*4,crest=land(c,x,top,z,w,depth,seed+Math.floor(x*7));
   for(let i=0;i<Math.max(1,Math.floor(w/2.6));i++){
    const px=x+.8+r()*(w-1.6),pz=z+(r()-.5)*depth*.5;
    if(r()<.55)roundTree(batch,leaves,kit,px,crest(px),pz,1.5+r()*1.5,r,greens);else mushrooms.add(px,crest(px),pz,.9+r()*1.3);
   }
   if(r()<falls){const fx=x+w*(.3+r()*.4);waterfall(root,c.falls,fx,crest(fx)-.12,-12.6,z+depth*.62+.12,.8+r()*.9,c.foam);}
   x+=w+gap*(.4+r());
  }
 };
 cliffs(-21,5,-3.4,-.6,4,8,.45,300,2.2);
 cliffs(-37,6,-1.6,2.2,6,10,.5,600,5);
 bridge(root,width*.2,width*.2+8,-5.3,-12.6);
 // An arched bridge with star banners crosses the river.
 stoneBridge(batch,kit,at(width*.46,1.2,-30,0,0,0,1),11,3,13.8);
 // Little floating islands drift above the cliffs.
 for(let i=0;i<5;i++){
  const x=width*(.08+i*.21)+(r()-.5)*4,top=3.6+r()*3.8,z=-17-r()*13,w=2.4+r()*1.8;
  const crest=land(c,x,top,z,w,2.2+r()*1.4,500+i,{grounded:false,bottom:-top*100+190+r()*120,detail:'near'});
  if(i%2)roundTree(batch,leaves,kit,x+w/2,crest(x+w/2),z,1.2+r()*.6,r,greens);else mushrooms.add(x+w/2,crest(x+w/2),z,.8+r()*.5);
 }
 for(let i=0;i<16;i++)cloud(clouds,-60+r()*(width+140),7+r()*10,-48-r()*78,2.6+r()*3.6,r);
 const mist=[];for(let i=0;i<14;i++)mist.push({x:-10+r()*(width+20),y:-11.6+r()*.8,z:-16-r()*26,width:9+r()*8,height:2.4,opacity:.45+r()*.3});mistSheets(root,mist);
}

// ---- World 2: Islands of the Dragon ----
function skyIslands(c:Ctx){
 const {r,width,root,kit,batch,leaves,clouds}=c;
 c.water=waterSurface(root,width/2,-24,-95,width+340,230,{deep:'#1386b6',shallow:'#5ed6e2',horizon:'#d6eefb',fog:c.look.fog,near:c.look.near,far:c.look.far});
 planet(root,width*.64,30,-150,34);
 // Limestone pillars rise out of a turquoise sea all the way to the horizon.
 const pillars=[];
 for(let i=0;i<72;i++){const z=-30-Math.pow(r(),.7)*140,far=(-z-30)/140;pillars.push({x:-110+r()*(width+220),y:-24,z,radius:1.4+r()*2.4+far*1.6,height:(9+r()*13+far*16)/1.05});}
 karstPillars(root,c.mats.rock,pillars,leaves,r);
 // Broad, stepped mesas break up the thin pillars and make the far valley feel
 // inhabited. Their silhouettes remain readable through the moving cloud banks.
 for(let i=0;i<3;i++){
  const x=-22+i*(width+36)/2,w=11+r()*5,top=7+r()*5,z=-82-r()*12,crest=land(c,x,top,z,w,9,660+i,{bottom:2400});
  pagoda(batch,kit,at(x+w*.54,crest(x+w*.54),z,0,-.2+i*.25,0,1.3));
  for(const f of [.16,.8])bonsaiPine(batch,leaves,kit,x+w*f,crest(x+w*f),z+1.8,2.1+r(),r);
  waterfall(root,c.falls,x+w*.27,crest(x+w*.27)-.15,-24,z+5.8,1.7,c.foam);
 }
 // A sea of cloud wraps around the floating islands.
 const sheets=[];for(let i=0;i<34;i++)sheets.push({x:-40+r()*(width+80),y:-13+r()*4,z:-6-r()*55,width:14+r()*14,height:4+r()*3,opacity:.35+r()*.35});mistSheets(root,sheets);
 for(let i=0;i<24;i++)cloud(clouds,-50+r()*(width+100),-15+r()*6,-14-r()*46,2+r()*3,r);
 for(let i=0;i<14;i++){const x=-60+r()*(width+120),y=9+r()*12;if(y>11&&Math.abs(x-width*.64)<26)continue;cloud(clouds,x,y,-46-r()*80,3+r()*4,r);}
 // A temple mesa greets the start; more mesas carry dome houses.
 const temple=land(c,-12,4.4,-44,11,8,701,{bottom:2400});
 pagoda(batch,kit,at(-6.5,temple(-6.5)-.05,-44,0,.35,0,1.25));roundTree(batch,leaves,kit,-9.6,temple(-9.6),-43,1.6,r,['#3f8f48','#5aa75a']);
 waterfall(root,c.falls,-3.2,temple(-3.2)-.15,-24,-44+5.2,1.2,c.foam);
 for(let k=0;k<4;k++){
  const x=width*(.22+k*.24)+(r()-.5)*5,w=7+r()*5,top=1+r()*5,z=-50-r()*16,crest=land(c,x,top,z,w,7,720+k,{bottom:2400});
  domeHouse(batch,kit,at(x+w*.35,crest(x+w*.35),z+1,0,r()-.5,0,1));bonsaiPine(batch,leaves,kit,x+w*.7,crest(x+w*.7),z,2+r(),r);
  if(k%2===0)waterfall(root,c.falls,x+w*.55,crest(x+w*.55)-.15,-24,z+4.6,1,c.foam);
 }
 // Floating islands in the middle distance, joined by rope bridges.
 const kinds=['dome','pines','arch','dome','pines','temple','arch','pines','dome','pines'],tops:{x:number;w:number;top:number;z:number}[]=[];
 for(let i=0;i<kinds.length;i++){
  const x=-6+i*(width+12)/kinds.length+(r()-.5)*3,top=-2+r()*7,z=-13-r()*18,w=3+r()*3.5,depth=3+r()*2.5;
  const crest=land(c,x,top,z,w,depth,800+i,{grounded:false,detail:'near'}),cx=x+w/2;tops.push({x,w,top:crest(cx),z});
  if(kinds[i]==='dome')domeHouse(batch,kit,at(cx,crest(cx)-.05,z,0,r()-.5,0,.85));
  else if(kinds[i]==='arch')ringArch(batch,kit,at(cx,crest(cx)-.1,z,0,(r()-.5)*.3,0,1));
  else if(kinds[i]==='temple')pagoda(batch,kit,at(cx,crest(cx)-.05,z,0,.4,0,.7));
  else for(let k=0;k<2;k++)bonsaiPine(batch,leaves,kit,x+w*(.3+k*.4),crest(x+w*(.3+k*.4)),z+(r()-.5),1.4+r()*.8,r);
  hangingGarden(batch,kit,cx,crest(cx)-.15,z+depth*.46,w*.75,r,1.8);
  if(i%3===1)waterfall(root,c.falls,x+w*.72,crest(x+w*.72)-.12,-11,z+depth*.5+.15,.55);
 }
 for(let i=1;i<tops.length;i+=3){const a=tops[i-1],b=tops[i];if(b.x-(a.x+a.w)>1.2&&Math.abs(a.z-b.z)<6&&Math.abs(a.top-b.top)<2.5)bridge(root,a.x+a.w-.2,b.x+.2,(a.top+b.top)/2,(a.z+b.z)/2);}
}

// ---- World 3: Shinobi Treetop Trail ----
function village(c:Ctx){
 const {r,width,root,kit,batch,leaves,clouds}=c,greens=['#6fae3a','#86c044','#5c9a33','#9dcb52'],maples=['#d9532c','#e8742f','#c9402a','#f0a03c'];
 c.water=waterSurface(root,width/2,-15,-60,width+300,160,{deep:'#2b7d86',shallow:'#73c6b6',horizon:'#f2d8ad',fog:c.look.fog,near:c.look.near,far:c.look.far});
 const light=(p:T.Vector3,size:number)=>c.glows.push({position:p,size:size*1.4,color:'#ff9a3c'});
 // Keep the relief above the distant roofs, in the upper-right opening from
 // the trailhead camera. A lower/further ridge disappeared into the valley.
 const ridgeX=width*.61,ridgeY=10,ridgeZ=-85,ridgeScale=2.2;
 carvedMountain(batch,kit,at(ridgeX,ridgeY,ridgeZ,0,-.08,0,ridgeScale));
 for(let i=0;i<8;i++){
  const px=ridgeX-16.8+i*4.8;bonsaiPine(batch,leaves,kit,px,ridgeY+ridgeScale*4.9+Math.sin(i*1.8)*.4,ridgeZ,2.1+r()*1.3,r);
 }
 // A hilltop village lines the far skyline.
 for(let x=-70;x<width+80;){
  const w=8+r()*10,top=1+r()*7,z=-72-r()*24,depth=6+r()*4,crest=land(c,x,top,z,w,depth,900+Math.floor(x),{bottom:1500});
  for(let hx=x+1.6;hx<x+w-1.4;hx+=2.8+r()*.8){
   if(r()<.22)pagoda(batch,kit,at(hx,crest(hx)-.1,z,0,r()-.5,0,.95));
   else house(batch,kit,at(hx,crest(hx)-.05,z+(r()-.5)*2,0,(r()-.5)*.5,0,1),2.2+r(),1.6+r()*.5,2,r()<.4?2:1).forEach(p=>light(p,2.2));
  }
  if(r()<.5){const fx=x+w*.5;waterfall(root,c.falls,fx,crest(fx)-.2,-15,z+depth*.62+.12,1+r(),c.foam);}
  x+=w+2+r()*5;
 }
 // Terraced streets with houses, torii gates, banners and maples.
 for(let x=-14;x<width+16;){
  const w=6+r()*7,top=-6.4+r()*3.4,z=-24-r()*9,depth=5+r()*3,crest=land(c,x,top,z,w,depth,960+Math.floor(x*3));
  for(let cursor=x+.8;cursor<x+w-1.2;){
   const roll=r(),gx=cursor+1.4;
   if(roll<.32){house(batch,kit,at(gx,crest(gx)-.05,z-.6,0,(r()-.5)*.4,0,.9),2.8,1.9,2.2,r()<.5?2:1).forEach(p=>light(p,1.5));cursor+=3.5;}
   else if(roll<.45){torii(batch,kit,at(gx,crest(gx),z+depth*.22,0,0,0,.85));cursor+=3.3;}
   else if(roll<.72){roundTree(batch,leaves,kit,cursor+.8,crest(cursor+.8),z+(r()-.5)*2,1.8+r()*1.2,r,r()<.6?maples:greens);cursor+=1.9;}
   else{const bx=cursor+.3,by=crest(bx);bannerPole(batch,kit,bx,by,z+depth*.3,'leaf',2.6+r()*.8);light(paperLantern(batch,kit,bx+.95,by+2.25,z+depth*.3,.3),1.2);cursor+=1.5;}
  }
  if(r()<.4){const fx=x+w*(.3+r()*.4);waterfall(root,c.falls,fx,crest(fx)-.15,-15,z+depth*.62+.12,.8+r()*.8,c.foam);}
  x+=w+1+r()*3;
 }
 // Giant cedars with lantern-lit rope bridges between them.
 const trunks:{x:number;z:number}[]=[];
 for(let x=-6;x<width+10;x+=23+r()*5){
  const z=-11-r()*4,height=31+r()*5;tree(root,x,-17,z,height);trunks.push({x,z});
  const y=-2.3+r()*1.9;
  canopyDeck(batch,kit,x+.4,y,z+1.3,4.5+r(),2.2);
  hangingGarden(batch,kit,x+.4,y-.15,z+2.5,4.2,r,2.3);
  light(paperLantern(batch,kit,x+1.7,y+1.1,z+2.2,.3),1.3);
  bannerPole(batch,kit,x-1.6,y,z+1.35,'leaf',3.1);
  // Bark-covered boughs, rope slings and a cut log frame the upper canopy.
  const by=3.3+r()*1.3;
  timberStrut(batch,kit.trunk,new T.Vector3(x-.1,by-.55,z),new T.Vector3(x+5.2,by+.5,z+.5),.2);
  if(trunks.length%2===0){
   const a=new T.Vector3(x+2.6,by,z+1.3),logA=new T.Vector3(x+1.6,by-2.55,z+1.65),logB=new T.Vector3(x+3.5,by-2.75,z+1.65);
   timberStrut(batch,kit.trunk,logA,logB,.26);timberStrut(batch,kit.rope,a,logA,.024);timberStrut(batch,kit.rope,new T.Vector3(x+4,by+.25,z+1.3),logB,.024);
  }
 }
 for(let i=1;i<trunks.length;i+=2){
  const a=trunks[i-1].x+.7,b=trunks[i].x-.7,y=-1+r()*1.4,z=(trunks[i-1].z+trunks[i].z)/2+1.2;bridge(root,a,b,y,z);
  for(let x=a+.8;x<b-.4;x+=1.6){const sag=Math.sin((x-a)/(b-a)*Math.PI)*.22;light(paperLantern(batch,kit,x,y-sag-.55,z+1.15,.3),1.2);}
 }
 // A low chain of red gates recedes toward the waterfall valley.
 for(let i=0;i<4;i++)torii(batch,kit,at(width*(.12+i*.26),-9+i*.2,-42-i*3,0,(i-1.5)*.08,0,1.05));
 for(let i=0;i<8;i++)cloud(clouds,-50+r()*(width+100),11+r()*6,-60-r()*55,3+r()*3,r);
 // Maple leaves drift down through the scene around the camera.
 const count=70,leafMesh=new T.InstancedMesh(new T.PlaneGeometry(.2,.2),new T.MeshStandardMaterial({map:mapleLeafTexture(),side:T.DoubleSide,alphaTest:.4,roughness:.8}),count);
 const drift=Array.from({length:count},()=>({x:r()*30-12,y:r()*14,z:-4+r()*7,speed:.3+r()*.45,spin:.5+r()*2,phase:r()*6}));
 const dummy=new T.Object3D();leafMesh.frustumCulled=false;root.add(leafMesh);
 c.updates.push((time,camera)=>{
  if(!camera)return;const t=time*.001;
  drift.forEach((d,i)=>{
   const fall=(d.y+t*d.speed)%14;dummy.position.set(camera.position.x+d.x+Math.sin(t*.7+d.phase)*.6,camera.position.y+6.5-fall,d.z);
   dummy.rotation.set(t*d.spin+d.phase,t*.8+d.phase,Math.sin(t+d.phase));dummy.updateMatrix();leafMesh.setMatrixAt(i,dummy.matrix);
  });
  leafMesh.instanceMatrix.needsUpdate=true;
 });
}
