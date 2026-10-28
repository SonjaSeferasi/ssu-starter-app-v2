import * as T from 'three';
import {hash,random,matte,mesh} from './scenic-kit';

export type JapanTerrainDefinition={id:string;x:number;y:number;width:number;depth:number;thickness:number;type:string};
export type JapanTerrainOptions={quality?:'standard'|'low'};
export type JapanScenicCliffOptions={x:number;y:number;z:number;width:number;depth:number;thickness:number;seed?:number;quality?:'standard'|'low'};

const palette={granite:'#c3c0ae',darkRock:'#a8a693',moss:'#638c45',grass:'#629540',fern:'#3e7b46',vine:'#4b753b',pink:'#edacca',white:'#faf1df',pollen:'#e4c574'};
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
export const japanTerrainInfo={id:'japan-mossy-stone-terraces',license:'Original procedural geometry and textures created for SocialU; no external assets.',representation:'Fictional Japanese mountain-garden terraces, not a geological reconstruction of the Mount Fuji trail.',capHeight:.015,clearCorridorHalfDepth:.55,maximumEffectiveVertices:{standard:22000,low:6000},rockTextures:{standard:256,low:128,kind:'cellular-granite-with-layered-fissures'}};

/** Local perimeter of a rounded terrace. The cap remains exactly flat, and
 * its z=0 endpoints stay at +/-width/2, matching the existing walking collider. */
function perimeter(angle:number,width:number,depth:number,t=0){
 const c=Math.cos(angle),s=Math.sin(angle),scale=1-.11*t-.32*t*t*t;
 return new T.Vector3(Math.sign(c)*Math.pow(Math.abs(c),.69)*width*.5*scale,0,Math.sign(s)*Math.pow(Math.abs(s),.69)*depth*.5*scale);
}

function graniteGeometry(width:number,depth:number,thickness:number,seed:number,low:boolean){
 const segments=low?36:52,rings=low?8:11,positions:number[]=[],colors:number[]=[],uv:number[]=[],indices:number[]=[];
 const base=new T.Color('#ffffff'),dark=new T.Color('#dddacb'),moss=new T.Color('#a8b78d');
 for(let row=0;row<=rings;row++)for(let i=0;i<=segments;i++){
  const a=i/segments*Math.PI*2,t=row/rings,point=perimeter(a,width,depth,t),edge=Math.sin(t*Math.PI);
  const strata=Math.sin(t*23+Math.sin(a*3+seed)*.6),fissure=Math.sin(a*13+Math.floor(t*5)*1.7+seed),bulge=(strata*.055+fissure*.045)*edge;
  point.x*=1+bulge;point.z*=1+bulge;point.y=-thickness*t+Math.sin(a*8+row*.9+seed)*.045*edge;
  positions.push(point.x,point.y,point.z);uv.push(i/segments*width*.3,t*thickness*.42);
  const seam=Math.abs(Math.sin(t*12+Math.sin(a*2.2)*.18)),shade=.96+.035*Math.sin(a*2+seed)+.025*strata-(seam<.12?.055:0);
  const color=base.clone().lerp(dark,.06+t*.12).multiplyScalar(shade);
  const drip=(Math.sin(a*7+seed)+Math.sin(a*17+seed*.2))*.5,mossDepth=.1+Math.max(0,drip)*.33;
  if(t<mossDepth)color.lerp(moss,clamp((mossDepth-t)/Math.max(.05,mossDepth)*.48,0,.5));
  colors.push(color.r,color.g,color.b);
 }
 for(let row=0;row<rings;row++)for(let i=0;i<segments;i++){const a=row*(segments+1)+i,b=a+1,c=a+segments+1;indices.push(a,b,c,b,c+1,c);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

function capGeometry(low:boolean){
 const n=low?48:72,positions=[0,0,0],uv=[.5,.5],indices:number[]=[];
 for(let i=0;i<n;i++){const p=perimeter(i/n*Math.PI*2,2,2);positions.push(p.x,p.z,0);uv.push(p.x*.5+.5,p.z*.5+.5);}
 for(let i=0;i<n;i++)indices.push(0,i+1,(i+1)%n+1);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

/** Original procedural moss, earth and granular relief; no remote images or
 * sampled photographs are required to build the playable terrace material. */
function surfaceTextures(seed:number,depth:number,low:boolean){
 const size=low?64:128,r=random(seed),colour=new Uint8Array(size*size*4),relief=new Uint8Array(size*size*4);
 const earth=[133,122,82],green=[89,133,52],pale=[146,161,84];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,z=(v-.5)*depth,path=.38+.1*Math.sin(u*10+seed),edge=Math.abs(z),patch=Math.sin(u*22+Math.sin(v*17))*Math.cos(v*24+u*7),grain=r();
  const grassMix=clamp((edge-path)*2.5,0,1),base=earth.map((channel,i)=>channel*(1-grassMix)+green[i]*grassMix),fleck=patch>.42&&grassMix>.3?.22:0;
  const i=(y*size+x)*4;for(let channel=0;channel<3;channel++)colour[i+channel]=clamp(Math.round((base[channel]*(1-fleck)+pale[channel]*fleck)*(.84+grain*.27)),0,255);colour[i+3]=255;
  const height=Math.round(100+grain*80+patch*25+(grassMix>.6?20:0));relief[i]=relief[i+1]=relief[i+2]=height;relief[i+3]=255;
 }
 const map=new T.DataTexture(colour,size,size,T.RGBAFormat);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.ClampToEdgeWrapping;map.minFilter=map.magFilter=T.LinearFilter;map.needsUpdate=true;
 const bump=new T.DataTexture(relief,size,size,T.RGBAFormat);bump.wrapS=bump.wrapT=T.RepeatWrapping;bump.minFilter=bump.magFilter=T.LinearFilter;bump.needsUpdate=true;
 return{map,bump};
}

type RockPixels={size:number;color:Uint8Array;relief:Uint8Array;roughness:Uint8Array};
type RockTextures={map:T.DataTexture;bump:T.DataTexture;roughness:T.DataTexture};
// Cache immutable CPU pixels, never live Texture instances. Each terrace owns
// its Texture objects, so disposing a scene cannot invalidate another scene.
const rockPixelCache=new Map<string,RockPixels>();
function noise(x:number,y:number,seed:number){let h=(Math.imul(x,374761393)+Math.imul(y,668265263)+seed)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295;}
const smooth=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function rockPixels(seed:number,low:boolean):RockPixels{
 const variant=seed%4,key=(low?'low':'standard')+variant,found=rockPixelCache.get(key);if(found)return found;
 const size=low?128:256,color=new Uint8Array(size*size*4),relief=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4),cols=5,rows=4,phase=variant*.83,twoPi=Math.PI*2;
 const cells=Array.from({length:rows},(_,y)=>Array.from({length:cols},(_,x)=>({x:(noise(x,y,7919+variant)-.5)*.68,y:(noise(x,y,1327+variant)-.5)*.58,tone:noise(x,y,977+variant)})));
 for(let py=0;py<size;py++)for(let px=0;px<size;px++){
  const u=px/size,v=py/size,uu=u+.016*Math.sin(v*twoPi*2+phase)+.008*Math.sin(u*twoPi*3),vv=v+.024*Math.sin(u*twoPi+phase),cx=Math.floor(uu*cols),cy=Math.floor(vv*rows);
  let first=Infinity,second=Infinity,nearestTone=0,nearestDX=0,nearestDY=0;
  for(let yy=cy-1;yy<=cy+1;yy++)for(let xx=cx-1;xx<=cx+1;xx++){
   const cell=cells[(yy%rows+rows)%rows][(xx%cols+cols)%cols],dx=uu*cols-(xx+.5+cell.x),dy=vv*rows-(yy+.5+cell.y),distance=dx*dx+dy*dy;
   if(distance<first){second=first;first=distance;nearestTone=cell.tone;nearestDX=dx;nearestDY=dy;}else if(distance<second)second=distance;
  }
  const boundary=Math.sqrt(second)-Math.sqrt(first),crack=1-smooth(.016,.075,boundary),weatheredEdge=smooth(.07,.105,boundary)*(1-smooth(.105,.18,boundary));
  const layer=v*4+Math.sin(u*twoPi)*.12+Math.sin(u*twoPi*3+phase)*.025,layerDistance=Math.abs((layer-Math.floor(layer))-.5),layerSeam=1-smooth(.006,.032,layerDistance);
  const grain=noise(px,py,variant+3721),mottle=Math.sin(u*twoPi*9+Math.sin(v*twoPi*5))*Math.cos(v*twoPi*7+u*3),planeSlope=(nearestDX*.05-nearestDY*.035),tone=.91+nearestTone*.15+planeSlope+mottle*.035+(grain-.5)*.09-crack*.59-layerSeam*.13+weatheredEdge*.065;
  const quartz=grain>.95?22:grain<.035?-27:0,stain=mottle>.52?.1:0,index=(py*size+px)*4,base=[191+nearestTone*11,186+nearestTone*10,169+nearestTone*13];
  for(let channel=0;channel<3;channel++)color[index+channel]=clamp(Math.round(base[channel]*tone+quartz-(channel===2?stain*35:stain*10)),0,255);color[index+3]=255;
  const height=clamp(Math.round(186+nearestTone*25+planeSlope*50+mottle*12+(grain-.5)*32-crack*139-layerSeam*39+weatheredEdge*13),0,255),rough=clamp(Math.round(238+(grain-.5)*24+crack*12),0,255);
  for(let channel=0;channel<3;channel++){relief[index+channel]=height;roughness[index+channel]=rough;}relief[index+3]=roughness[index+3]=255;
 }
 const pixels={size,color,relief,roughness};rockPixelCache.set(key,pixels);return pixels;
}
function rockTextures(seed:number,low:boolean):RockTextures{
 const pixels=rockPixels(seed,low),offsetX=(seed%97)/97,offsetY=(seed%53)/53;
 const make=(data:Uint8Array,color=false)=>{const texture=new T.DataTexture(data,pixels.size,pixels.size,T.RGBAFormat);texture.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.anisotropy=low?2:4;texture.offset.set(offsetX,offsetY);texture.needsUpdate=true;return texture;};
 return{map:make(pixels.color,true),bump:make(pixels.relief),roughness:make(pixels.roughness)};
}

function replaceGeometry(object:T.Mesh,geometry:T.BufferGeometry){object.geometry.dispose();object.geometry=geometry;}
function materialFor(object:T.Mesh){
 if(object.material instanceof T.MeshStandardMaterial)return object.material;
 const material=new T.MeshStandardMaterial({roughness:.94});for(const previous of Array.isArray(object.material)?object.material:[object.material])previous.dispose();object.material=material;return material;
}
function replaceTexture(material:T.MeshStandardMaterial,key:'map'|'bumpMap'|'roughnessMap',texture:T.Texture){const previous=material[key];if(previous&&previous!==texture)previous.dispose();material[key]=texture;}

function bladeGeometry(low:boolean){
 const positions:number[]=[],indices:number[]=[],count=low?3:5;
 for(let blade=0;blade<count;blade++){
  const angle=blade*2.4,scale=.7+(blade%3)*.17,c=Math.cos(angle),s=Math.sin(angle),base=blade*5;
  for(const [x,y,z] of [[-.028,0,0],[.028,0,0],[-.018,.16,.015],[.018,.16,.015],[.009,.29,.055]])positions.push((x*c+z*s)*scale,y*scale,(-x*s+z*c)*scale);
  indices.push(base,base+1,base+2,base+1,base+3,base+2,base+2,base+3,base+4);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function flowerGeometry(){
 const shape=new T.Shape();for(let i=0;i<=40;i++){const a=i/40*Math.PI*2,r=.076*(.76+.24*Math.cos(a*5));if(!i)shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);else shape.lineTo(Math.cos(a)*r,Math.sin(a)*r);}shape.closePath();return new T.ShapeGeometry(shape);
}
function vineLeafGeometry(){const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute([0,.03,0,.055,0,0,-.055,0,0,0,-.03,0],3));geometry.setIndex([0,2,1,2,3,1]);geometry.computeVertexNormals();return geometry;}
function fernGeometry(){
 const positions:number[]=[];
 const triangle=(a:T.Vector3,b:T.Vector3,c:T.Vector3)=>positions.push(...a.toArray(),...b.toArray(),...c.toArray());
 for(let frond=0;frond<5;frond++){
  const angle=frond*Math.PI*2/5,point=(t:number)=>new T.Vector3(Math.sin(angle)*t*.42,Math.sin(t*Math.PI*.64)*.42,Math.cos(angle)*t*.42),side=new T.Vector3(Math.cos(angle),0,-Math.sin(angle));
  for(let i=0;i<8;i++){
   const t=i/8,a=point(t),b=point((i+1)/8),stem=.007;triangle(a.clone().addScaledVector(side,-stem),a.clone().addScaledVector(side,stem),b);
   if(i===0)continue;const leafWidth=.085*(1-t)+.018;
   for(const direction of [-1,1]){const tip=a.clone().addScaledVector(side,leafWidth*direction).addScaledVector(b.clone().sub(a),.6);triangle(a.clone().addScaledVector(side,-.009),tip,b.clone().addScaledVector(side,.006));}
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();return g;
}

function addRim(root:T.Group,width:number,depth:number,r:()=>number,low:boolean){
 const dummy=new T.Object3D(),count=Math.min(low?20:42,Math.ceil(width*(low?2.8:6.3)));
 const moss=new T.InstancedMesh(new T.SphereGeometry(1,6,low?3:4),new T.MeshStandardMaterial({color:'#ffffff',roughness:1}),count);moss.name='japan-irregular-moss-rim';moss.castShadow=false;root.add(moss);
 for(let i=0;i<count;i++){
  const a=i/count*Math.PI*2,point=perimeter(a,width,depth),s=.1+r()*.12,sy=.035+r()*.045;dummy.position.set(point.x*.98,Math.abs(point.z)<.9?-sy-.02:.012,point.z*.98);dummy.scale.set(s*(1.4+r()),sy,s);dummy.rotation.set(0,a,0);dummy.updateMatrix();moss.setMatrixAt(i,dummy.matrix);moss.setColorAt(i,new T.Color(i%3?palette.moss:palette.grass).multiplyScalar(.82+r()*.35));
 }
 const bladesCount=Math.min(low?40:135,Math.ceil(width*depth*(low?1.1:4.8))),blades=new T.InstancedMesh(bladeGeometry(low),new T.MeshStandardMaterial({color:'#ffffff',roughness:1,side:T.DoubleSide}),bladesCount);blades.name='japan-instanced-grass-blades';blades.castShadow=false;root.add(blades);
 for(let i=0;i<bladesCount;i++){
  const a=r()*Math.PI*2,edge=perimeter(a,width,depth),point=edge.multiplyScalar(.8+r()*.15);if(Math.abs(point.z)<.84)point.z=Math.sign(point.z||1)*.84;
  const remaining=clamp(1-Math.pow(Math.abs(point.z)/(depth*.5),2/.69),0,1),edgeX=width*.5*Math.pow(remaining,.69/2);point.x=clamp(point.x,-edgeX*.97,edgeX*.97);
  dummy.position.set(point.x,.025,point.z);dummy.scale.setScalar(.45+r()*.6);dummy.rotation.set(0,r()*Math.PI*2,(r()-.5)*.35);dummy.updateMatrix();blades.setMatrixAt(i,dummy.matrix);blades.setColorAt(i,new T.Color(i%3?palette.grass:'#90ad54').multiplyScalar(.85+r()*.25));
 }
}

function addRockChunks(root:T.Group,width:number,depth:number,thickness:number,r:()=>number,low:boolean,textures:RockTextures){
 const geometry=new T.SphereGeometry(1,low?8:14,low?6:10),position=geometry.getAttribute('position'),colors:number[]=[];
 for(let i=0;i<position.count;i++){
  const v=new T.Vector3().fromBufferAttribute(position,i),jitter=1+Math.sin(v.x*13+v.y*19+v.z*17)*.035,round=(value:number)=>Math.sign(value)*Math.pow(Math.abs(value),.6);
  position.setXYZ(i,round(v.x)*jitter,round(v.y)*jitter,round(v.z)*jitter);
  const tone=.91+.055*Math.sin(v.x*8+v.y*5)+.035*Math.cos(v.z*11+v.y*3),color=new T.Color('#ffffff').multiplyScalar(tone);if(v.y>.5&&v.x<-.25)color.lerp(new T.Color('#cbd4b7'),.24);colors.push(color.r,color.g,color.b);
 }
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
 const material=new T.MeshStandardMaterial({color:'#ffffff',roughness:.95,vertexColors:true,map:textures.map,bumpMap:textures.bump,bumpScale:.13,roughnessMap:textures.roughness});
 const count=Math.min(low?6:16,Math.ceil(width*(low?.85:1.8))),rocks=new T.InstancedMesh(geometry,material,count),dummy=new T.Object3D();rocks.name='japan-weathered-granite-slabs';rocks.receiveShadow=rocks.castShadow=true;root.add(rocks);
 for(let i=0;i<count;i++){
  const a=.08*Math.PI+r()*.84*Math.PI,t=.12+r()*.64,point=perimeter(a,width,depth,t);point.y=-.44-t*Math.max(.7,thickness-.5);point.z+=.035;
  dummy.position.copy(point);dummy.scale.set(.29+r()*.4,.18+r()*.16,.15+r()*.17);dummy.rotation.set((r()-.5)*.3,r()*.8,(r()-.5)*.3);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);rocks.setColorAt(i,new T.Color(i%4===0?'#d7dfc4':'#ffffff').multiplyScalar(.93+r()*.11));
 }
}

function addFlowersAndFerns(root:T.Group,width:number,depth:number,r:()=>number,low:boolean){
 const count=Math.min(low?8:26,Math.ceil(width*(low?.9:3))),flowers=new T.InstancedMesh(flowerGeometry(),new T.MeshStandardMaterial({color:'#ffffff',roughness:.95,side:T.DoubleSide}),count),centers=new T.InstancedMesh(new T.SphereGeometry(.018,6,4),matte(palette.pollen),count),stems=new T.InstancedMesh(new T.CylinderGeometry(.006,.009,.18,5),matte(palette.fern),count),dummy=new T.Object3D();
 flowers.name='japan-pink-and-white-flowers';flowers.castShadow=false;centers.name='japan-flower-centres';centers.castShadow=false;stems.name='japan-flower-stems';stems.castShadow=false;root.add(flowers,centers,stems);
 for(let i=0;i<count;i++){
  const a=(i%4===0?.2:.64)*Math.PI+r()*.28*Math.PI,point=perimeter(a,width,depth).multiplyScalar(.77+r()*.1);if(i%4!==0)point.z=-Math.abs(point.z);point.z=Math.sign(point.z)*Math.max(.82,Math.abs(point.z));
  const size=.65+r()*.65,height=.18*size;dummy.position.set(point.x,height+.025,point.z);dummy.rotation.set((r()-.5)*.7,(r()-.5)*.5,r()*Math.PI);dummy.scale.setScalar(size);dummy.updateMatrix();flowers.setMatrixAt(i,dummy.matrix);flowers.setColorAt(i,new T.Color(i%3?palette.white:palette.pink));
  dummy.position.z+=.006;dummy.rotation.set(0,0,0);dummy.updateMatrix();centers.setMatrixAt(i,dummy.matrix);dummy.position.set(point.x,height*.5+.02,point.z);dummy.scale.set(1,size,1);dummy.updateMatrix();stems.setMatrixAt(i,dummy.matrix);
 }
 const fernCount=Math.min(low?2:7,Math.max(2,Math.ceil(width/(low?3.5:1.4)))),ferns=new T.InstancedMesh(fernGeometry(),new T.MeshStandardMaterial({color:'#ffffff',side:T.DoubleSide,roughness:1}),fernCount);ferns.name='japan-rear-terrace-ferns';ferns.castShadow=false;root.add(ferns);
 for(let i=0;i<fernCount;i++){const size=Math.min(.7+r()*.4,Math.max(.3,(depth*.5-.12-.66)/.52));dummy.position.set((i+.5)/fernCount*width*.76-width*.38,.03,-(.66+.52*size));dummy.scale.setScalar(size);dummy.rotation.set(0,r()*Math.PI*2,0);dummy.updateMatrix();ferns.setMatrixAt(i,dummy.matrix);ferns.setColorAt(i,new T.Color(i%2?palette.fern:'#568e48'));}
}

function addVines(root:T.Group,width:number,depth:number,thickness:number,r:()=>number,low:boolean){
 const count=Math.min(low?3:6,Math.max(2,Math.ceil(width/(low?2.5:1.2)))),leafCount=count*(low?5:9),leaves=new T.InstancedMesh(vineLeafGeometry(),new T.MeshStandardMaterial({color:'#698a46',roughness:1,side:T.DoubleSide}),leafCount),dummy=new T.Object3D();leaves.name='japan-hanging-vine-leaves';leaves.castShadow=false;root.add(leaves);
 const stemMaterial=matte(palette.vine);let leafIndex=0;
 for(let i=0;i<count;i++){
  const a=(.14+.72*(i+.5)/count)*Math.PI,point=perimeter(a,width,depth),length=Math.min(thickness*.72,.65+r()*1.05),curve=new T.CatmullRomCurve3([new T.Vector3(point.x,-.04,point.z+.025),new T.Vector3(point.x+.08,-length*.33,point.z*.92+.05),new T.Vector3(point.x-.1,-length*.7,point.z*.8+.1),new T.Vector3(point.x+.02,-length,point.z*.7+.12)]);
  const stem=mesh(root,new T.TubeGeometry(curve,low?7:11,.012,4,false),stemMaterial);stem.name='japan-draping-vine';stem.castShadow=false;
  for(let j=0;j<(low?5:9);j++){const t=(j+.5)/(low?5:9),p=curve.getPoint(t),side=j%2?1:-1;dummy.position.set(p.x+side*.045,p.y,p.z+.012);dummy.rotation.set(-.15,side*.25,side*.55);dummy.scale.setScalar(.8+r()*.35);dummy.updateMatrix();leaves.setMatrixAt(leafIndex++,dummy.matrix);}
 }
}

/** root is already centered at (definition.x+width/2,definition.y,0).
 * All additions use local coordinates. The existing cap stays at y=.015 and
 * no plant above the cap enters the |z|<.55 walking/readability corridor. */
export function dressJapanPlatform(root:T.Group,definition:JapanTerrainDefinition,options:JapanTerrainOptions={}){
 if(![definition.width,definition.depth,definition.thickness].every(value=>Number.isFinite(value)&&value>0))throw new Error('Japan terrace dimensions must be finite and positive.');
 const previous=root.getObjectByName('japan-platform-dressing');if(previous instanceof T.Group)return previous;
 // island() starts with smooth green pebble clumps. Replace those defaults
 // rather than layering detailed vegetation over the old oval patches.
 for(const object of [...root.children]){
  if(!(object instanceof T.Mesh)||object.name||object.geometry.type!=='SphereGeometry'||Math.abs(object.position.y-.025)>.000001||object.scale.y>.14)continue;
  object.geometry.dispose();for(const material of Array.isArray(object.material)?object.material:[object.material])material.dispose();object.removeFromParent();
 }
 const low=options.quality==='low',seed=hash(definition.id),r=random(seed),width=clamp(definition.width,2.8,30),depth=clamp(definition.depth,2,15),thickness=clamp(definition.thickness,.3,30);
 const details=new T.Group();details.name='japan-platform-dressing';details.userData.quality=low?'low':'standard';details.userData.nonColliding=true;details.userData.walkingCorridor=.55;root.add(details);
 if(definition.type!=='stone'){addVines(details,width,depth,Math.max(.6,thickness*.45),r,low);details.userData.style='wood-and-trailing-vines';return details;}
 const cliff=root.getObjectByName('country-platform-cliff') as T.Mesh|undefined,cap=root.getObjectByName('country-platform-cap') as T.Mesh|undefined;
 const rocks=rockTextures(seed,low);
 if(cliff){replaceGeometry(cliff,graniteGeometry(width,depth,thickness,seed,low));const material=materialFor(cliff);material.color.set('#ffffff');material.vertexColors=true;material.roughness=.95;material.metalness=0;replaceTexture(material,'map',rocks.map);replaceTexture(material,'bumpMap',rocks.bump);replaceTexture(material,'roughnessMap',rocks.roughness);material.bumpScale=.2;material.needsUpdate=true;}
 if(cap){replaceGeometry(cap,capGeometry(low));const material=materialFor(cap),textures=surfaceTextures(seed,depth,low);material.color.set('#ffffff');material.vertexColors=false;material.roughness=.94;material.metalness=0;replaceTexture(material,'map',textures.map);replaceTexture(material,'bumpMap',textures.bump);material.bumpScale=.025;material.needsUpdate=true;}
 addRockChunks(details,width,depth,thickness,r,low,rocks);addRim(details,width,depth,r,low);addFlowersAndFerns(details,width,depth,r,low);addVines(details,width,depth,thickness,r,low);
 details.userData.style='mossy-weathered-granite-terrace';details.userData.originalProceduralArt=true;return details;
}

/** Decorative counterpart for the near-background cliffs. x/z are the
 * terrace centre and y is its top surface. This helper never adds colliders. */
export function createJapanScenicCliff(parent:T.Object3D,options:JapanScenicCliffOptions){
 if(![options.x,options.y,options.z,options.width,options.depth,options.thickness].every(Number.isFinite)||options.width<=0||options.depth<=0||options.thickness<=0)throw new Error('Invalid Japan scenic cliff dimensions.');
 const root=new T.Group();root.name='japan-scenic-granite-cliff';root.position.set(options.x,options.y,options.z);root.userData.nonColliding=true;parent.add(root);
 const cliff=mesh(root,new T.CylinderGeometry(1,1,1,8),matte(palette.granite));cliff.name='country-platform-cliff';const cap=mesh(root,new T.CircleGeometry(1,8),matte(palette.moss),0,.015,0);cap.name='country-platform-cap';cap.rotation.x=-Math.PI/2;cap.scale.set(options.width/2,options.depth/2,1);
 dressJapanPlatform(root,{id:'scenic-'+(options.seed??hash(`${options.x}:${options.z}`)),x:options.x-options.width/2,y:options.y,width:options.width,depth:options.depth,thickness:options.thickness,type:'stone'},{quality:options.quality});return root;
}
