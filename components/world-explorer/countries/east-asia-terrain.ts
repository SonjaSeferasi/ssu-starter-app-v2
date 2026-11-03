import * as T from 'three';
import {Builder,fbm,hash,matte,pixelTexture,random,scatter,vertexMaterial,type Placement} from '../kit/common';
import {clearPlatformRoot,dressLandmass,localSurface} from '../kit/landmass';
import {woodenDeck} from '../kit/wooden-deck';
import {plantGrove} from '../kit/vegetation';
import {markSurface} from '../kit/surface-maps';
import {platformSurfaceY} from '../../../lib/world-explorer/platform-surface';
import type {PlatformDefinition} from '../../../lib/world-explorer/game-types';
import type {NewEastAsiaCode} from '../../../lib/world-explorer/east-asia';

const palette={CHN:{top:'#658e42',rock:'#a89e82',deep:'#6c715d',edge:'#74934b'},MNG:{top:'#a4b658',rock:'#ab956a',deep:'#7d7655',edge:'#91a64d'},PRK:{top:'#8c9b7c',rock:'#8c939b',deep:'#586671',edge:'#71866c'},KOR:{top:'#bac6cb',rock:'#8a9dab',deep:'#566b7a',edge:'#cad6d9'}};

export function naturalRockMaterial(code:'CHN'|'PRK'){
 const material=vertexMaterial(.88);markSurface(material,code==='CHN'?'sandstone-cliff':'gneiss','#ffffff',.75);
 material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
 vec4 rockSample=texture2D(map,vMapUv);
 float rockValue=dot(rockSample.rgb,vec3(0.299,0.587,0.114));
 diffuseColor.rgb*=vec3(0.12+sqrt(max(0.0,rockValue))*0.92);
 diffuseColor.a*=rockSample.a;
 #endif`);};material.customProgramCacheKey=()=> 'east-asia-natural-rock-v1';return material;
}

/** Original rounded, fractured bank/spire volumes. Decoration never changes
 * the collision manifest: x extents and the central walking lane keep the
 * exact authored surface height, including slope and stair interpolation. */
export function eastAsiaTerrain(root:T.Group,p:PlatformDefinition,code:NewEastAsiaCode,low:boolean){
 const colors=palette[code],seed=hash(p.id),r=random(seed),thin=p.route==='bonus'||p.route==='upper',surface=localSurface(p);
 if(p.motion){
  clearPlatformRoot(root);
  if(code==='MNG'){woodenDeck(root,p);return;}
  const b=new Builder();
  b.add(new T.BoxGeometry(p.width,.24,p.depth),code==='CHN'?'#9b9a87':'#657b88',[0,-.12,0]);
  for(const z of [-p.depth*.47,p.depth*.47]){b.add(new T.BoxGeometry(p.width,.075,.065),'#b7c5c9',[0,.78,z]);for(let i=0;i<=Math.ceil(p.width);i++)b.add(new T.BoxGeometry(.045,.8,.045),'#6e8490',[-p.width/2+p.width*i/Math.ceil(p.width),.4,z]);}
  for(const x of [-p.width*.38,p.width*.38])b.add(new T.CylinderGeometry(.035,.035,4.2,5),'#576d77',[x,2.85,-p.depth*.48]);
  if(code==='KOR'&&p.style==='roof-garden-lift'){
   for(const x of [-p.width*.32,p.width*.32]){b.add(new T.BoxGeometry(.36,.25,.6),'#77715d',[x,.12,-p.depth*.3]);plantGrove(root,'flowering-shrub',[{x,y:.25,z:-p.depth*.3,scale:.45}],{low,shadows:false});}
   root.userData.optionalRoofGarden=true;
  }
  b.mesh(root,vertexMaterial(.75),'country-moving-lift');root.userData.surface=p.type;return;
 }
 if(code==='KOR'){
  // A deliberately architectural silhouette: roof terraces and recessed
  // window strips, not a rock body recolored gray.
  dressLandmass(root,{...p,thickness:12}, {top:colors.top,topAlt:'#d6dddf',edge:colors.edge,face:colors.rock,faceDark:colors.deep,band:colors.rock,rough:.025,strata:2.5},{low,kind:p.steps?'stairs':'ground'});
  const b=new Builder(),glass=new Builder(),d=p.depth/2+.05;
  for(let row=0;row<7;row++){
   const yy=-1.15-row*1.4;
   glass.add(new T.BoxGeometry(p.width-.2,.86,.05),'#304c61',[0,yy,d]);
   for(let col=0;col<Math.ceil(p.width/.95);col++)b.add(new T.BoxGeometry(.075,.9,.12),'#b1c1c8',[-p.width/2+.2+col*.95,yy,d+.04]);
  }
  b.add(new T.BoxGeometry(p.width,.15,.16),'#d1dce0',[0,-.12,d+.05]);
  for(const x of [-p.width*.25,p.width*.28]){
   b.add(new T.BoxGeometry(.85,.42,.72),'#7f959f',[x,surface(x)+.23,-1.1]);
   b.add(new T.CylinderGeometry(.28,.28,.045,10),'#344b59',[x,surface(x)+.46,-1.1]);
  }
  // Planter boxes sit outside the clear player lane.
  if(p.width>7){b.add(new T.BoxGeometry(2,.28,.55),'#616f6e',[p.width*.2,surface(p.width*.2)+.13,-1.15]);plantGrove(root,'shrub',[{x:p.width*.2,y:surface(p.width*.2)+.3,z:-1.15,scale:.45}],{low,shadows:false});}
  glass.mesh(root,vertexMaterial(.24,{metalness:.3,envMapIntensity:.8}),'seoul-glass-window-strips');
  b.mesh(root,vertexMaterial(.82),'seoul-recessed-facade-and-rooftop-services');return;
 }
 if(p.steps){
  dressLandmass(root,{...p,thickness:code==='MNG'?3:5},{top:colors.top,topAlt:colors.edge,edge:colors.edge,face:colors.rock,faceDark:colors.deep,band:colors.rock,rough:.2,strata:.8},{low,kind:'stairs'});
 }else{
  clearPlatformRoot(root);
  const w=p.width,d=Math.max(p.depth,code==='CHN'?4.3:3.6),height=thin?p.thickness:code==='MNG'?3.4:code==='PRK'?5.8:7.5+(seed%4),segments=low?32:48,rings=low?7:11;
  const positions:number[]=[],uv:number[]=[],indices:number[]=[],vertexColors:number[]=[],base=new T.Color(colors.rock),deep=new T.Color(colors.deep);
  const outline=(a:number,t:number)=>{const c=Math.cos(a),s=Math.sin(a),end=1-Math.pow(t,1.7)*(code==='MNG'?-.13:.34),fracture=Math.sin(a*9+seed+Math.floor(t*6)*.7)*.12+Math.sin(a*17-seed+Math.floor(t*9))*.065;
   return{x:Math.sign(c)*Math.pow(Math.abs(c),.43)*w*.5*end*(1+fracture*Math.sin(t*Math.PI)),z:Math.sign(s)*Math.pow(Math.abs(s),.55)*d*.5*end*(1+fracture*(.5+Math.sin(t*Math.PI)*.5))};};
  for(let row=0;row<=rings;row++)for(let i=0;i<=segments;i++){
   const a=i/segments*Math.PI*2,t=row/rings,v=outline(a,t),top=surface(Math.max(-w/2,Math.min(w/2,v.x))),fold=fbm(v.x*.8,t*7,seed,3);
   const y=top-height*t-(thin?0:Math.sin(a*5+seed)*.14*Math.sin(t*Math.PI));positions.push(v.x,y,v.z);uv.push(i/segments*w*.45,t*height*.6);
   const shade=.83+fold*.34-Math.pow(t,1.4)*.17,c=base.clone().lerp(deep,t*.4).multiplyScalar(shade);if(t<.12)c.lerp(new T.Color(colors.edge),(.12-t)/.12);vertexColors.push(c.r,c.g,c.b);
  }
  for(let row=0;row<rings;row++)for(let i=0;i<segments;i++){const a=row*(segments+1)+i,b=a+1,c=a+segments+1;indices.push(a,b,c,b,c+1,c);}
  const centre=positions.length/3;positions.push(0,-height,0);uv.push(0,0);vertexColors.push(deep.r,deep.g,deep.b);for(let i=0;i<segments;i++){const a=rings*(segments+1)+i;indices.push(centre,a,a+1);}
  const bodyGeometry=new T.BufferGeometry();bodyGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));bodyGeometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));bodyGeometry.setAttribute('color',new T.Float32BufferAttribute(vertexColors,3));bodyGeometry.setIndex(indices);bodyGeometry.computeVertexNormals();
  const relief=pixelTexture(96,(u,v,x,y)=>{const n=fbm(u*14,v*12,seed,4),crack=Math.pow(Math.max(0,1-Math.abs(Math.sin(v*61+n*2))),10),grain=175+n*72-crack*32;return[grain,grain,grain];},false);
  const material=code==='CHN'||code==='PRK'?naturalRockMaterial(code):vertexMaterial(.94,{bumpMap:relief,bumpScale:.25});
  if(code==='CHN'||code==='PRK'){relief.dispose();material.flatShading=true;}
  const body=new T.Mesh(bodyGeometry,material);body.name='organic-country-terrain-body';body.castShadow=body.receiveShadow=true;root.add(body);
  const capPositions=[0,surface(0)+.012,0],capUV=[.5,.5],capIndices:number[]=[];
  for(let i=0;i<segments;i++){const v=outline(i/segments*Math.PI*2,0);capPositions.push(v.x,surface(v.x)+.012,v.z);capUV.push(v.x*.3,v.z*.4);}
  for(let i=0;i<segments;i++)capIndices.push(0,(i+1)%segments+1,i+1);
  const capGeometry=new T.BufferGeometry();capGeometry.setAttribute('position',new T.Float32BufferAttribute(capPositions,3));capGeometry.setAttribute('uv',new T.Float32BufferAttribute(capUV,2));capGeometry.setIndex(capIndices);capGeometry.computeVertexNormals();
  const capMap=pixelTexture(128,(u,v)=>{const n=fbm(u*48,v*48,seed+11,3),line=Math.sin(u*180+v*35)*.06,grain=175+60*n+line*50;return[grain,grain,grain];});
  const cap=new T.Mesh(capGeometry,new T.MeshStandardMaterial({color:colors.top,map:capMap,bumpMap:capMap,bumpScale:.055,roughness:.98}));cap.name='organic-country-terrain-cap';cap.receiveShadow=true;root.add(cap);
  root.userData.landmass='organic-'+code;root.userData.collisionUnchanged=true;
 }
 // Thin cutout ledges deliberately get no bulky dressing under the low route.
 if(thin)return;
 const placements:Placement[]=[],count=Math.min(low?70:130,Math.ceil(p.width*(code==='MNG'?8:6)));
 for(let i=0;i<count;i++){const x=(r()-.5)*p.width*.91,z=(i%3?1:-1)*(.8+r()*.6),h=(code==='MNG'?.2:.14)+r()*.18;placements.push({x,y:surface(x)+.015,z,scale:[.55+r()*.45,h,.55+r()*.45],rotation:r()*6.28,color:i%3?colors.top:colors.edge});}
 const blades=new T.BufferGeometry();blades.setAttribute('position',new T.Float32BufferAttribute([-.05,0,0,.05,0,0,.02,1,.05,0,0,-.05,0,0,.05,.04,.85,.015],3));blades.setIndex([0,1,2,3,4,5]);blades.computeVertexNormals();
 scatter(root,blades,new T.MeshStandardMaterial({color:'#ffffff',side:T.DoubleSide,roughness:1}),placements,'fine-grass-rim');
 if(code==='CHN'){
  plantGrove(root,'shrub',[{x:-p.width*.28,y:surface(-p.width*.28),z:-1.1,scale:.7},{x:p.width*.25,y:surface(p.width*.25),z:-1.2,scale:.8}],{low,shadows:false});
  const vines=new Builder();for(let i=0;i<Math.min(6,Math.ceil(p.width));i++){const x=-p.width*.4+p.width*.8*i/Math.max(1,Math.ceil(p.width)-1),y=surface(x),length=.7+r()*.9;for(let k=0;k<4;k++)vines.strut(new T.Vector3(x+Math.sin(k)*.08,y-k*length/4,p.depth*.5),new T.Vector3(x+Math.sin(k+1)*.08,y-(k+1)*length/4,p.depth*.5+.05),.025,'#567849',5);}vines.mesh(root,vertexMaterial(.95),'hanging-cliff-roots');
 }
 if(code==='PRK')plantGrove(root,'tuft',[{x:p.width*.25,y:surface(p.width*.25),z:-1.1,scale:.5}],{low,shadows:false});
}
