import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {bannerTexture,dotsTexture,foliageTexture,glowTexture,lanternTexture,mistTexture,mushroomGillsTexture,roofTexture,stoneTextures,waterfallTexture,bokehTexture,planetTexture,vineTexture,woodTexture} from './toon-textures';

// Stylized props for the layered worlds. Static props are merged per material
// (Batch) and repeated rounded shapes are instanced (Puffs, mushrooms, flowers),
// so a whole world costs a few hundred draw calls at most.
const dummy=new T.Object3D();
export function at(x:number,y:number,z:number,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx){
 dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,rz);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();return dummy.matrix.clone();
}
function curvedRoof(){
 const positions:number[]=[],uvs:number[]=[],indices:number[]=[],sides=4,steps=10;
 for(let face=0;face<sides;face++)for(let row=0;row<=4;row++)for(let i=0;i<=steps;i++){
  const t=row/4,u=i/steps*2-1,half=.5*(1-t)+.1*t,px=u*half,pz=half;
  const y=-.5+t+Math.pow(1-t,3)*(.16*Math.pow(Math.abs(u),4)+.06);
  const a=face*Math.PI/2;positions.push(px*Math.cos(a)+pz*Math.sin(a),y,pz*Math.cos(a)-px*Math.sin(a));uvs.push(i/steps,row/4);
 }
 const count=(steps+1)*5;
 for(let f=0;f<4;f++)for(let row=0;row<4;row++)for(let i=0;i<steps;i++){const a=f*count+row*(steps+1)+i,b=a+1,c=a+steps+1,d=c+1;indices.push(a,b,c,b,d,c);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function starGeometry(){
 const shape=new T.Shape();
 for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,radius=i%2?.21:.5;if(i)shape.lineTo(Math.cos(a)*radius,Math.sin(a)*radius);else shape.moveTo(Math.cos(a)*radius,Math.sin(a)*radius);}
 shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:true,bevelSize:.03,bevelThickness:.03,bevelSegments:2});g.center();return g;
}
// Unit-sized building blocks, cloned and transformed into batches.
export const unit={
 box:new T.BoxGeometry(1,1,1),
 cylinder:new T.CylinderGeometry(.5,.5,1,18),
 disc:new T.CylinderGeometry(.5,.5,1,20).rotateX(Math.PI/2),
 cone:new T.ConeGeometry(.5,1,22),
 sphere:new T.SphereGeometry(.5,18,12),
 dome:new T.SphereGeometry(.5,26,12,0,Math.PI*2,0,Math.PI/2),
 torus:new T.TorusGeometry(.5,.06,8,40),
 arc:new T.TorusGeometry(1,.16,8,24,Math.PI),
 plane:new T.PlaneGeometry(1,1),
 roof:curvedRoof(),
 star:starGeometry(),
};

/** Collects static parts and merges them into one mesh per material. */
export class Batch{
 private groups=new Map<T.Material,T.BufferGeometry[]>();
 add(material:T.Material,geometry:T.BufferGeometry,matrix:T.Matrix4){
  const g=(geometry.index?geometry.toNonIndexed():geometry.clone()).applyMatrix4(matrix);
  for(const name of Object.keys(g.attributes))if(name!=='position'&&name!=='normal'&&name!=='uv'&&name!=='color')g.deleteAttribute(name);
  let list=this.groups.get(material);if(!list)this.groups.set(material,list=[]);list.push(g);
 }
 build(parent:T.Object3D,shadows=true){
  for(const [material,list] of this.groups){
   if(list.some(g=>g.getAttribute('color')))for(const g of list)if(!g.getAttribute('color'))g.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count*3).fill(1),3));
   const merged=mergeGeometries(list,false);list.forEach(g=>g.dispose());if(!merged)continue;
   const mesh=new T.Mesh(merged,material);mesh.castShadow=shadows;mesh.receiveShadow=true;parent.add(mesh);
  }
  this.groups.clear();
 }
}
type Adder=(material:T.Material,geometry:T.BufferGeometry,x:number,y:number,z:number,sx:number,sy:number,sz:number,rx?:number,ry?:number,rz?:number)=>void;
const adder=(b:Batch,origin:T.Matrix4):Adder=>(material,geometry,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0)=>b.add(material,geometry,origin.clone().multiply(at(x,y,z,rx,ry,rz,sx,sy,sz)));

export type Kit=ReturnType<typeof propKit>;
export function propKit(world:number){
 const m=(color:string,roughness=.85,extra:T.MeshStandardMaterialParameters={})=>new T.MeshStandardMaterial({color,roughness,...extra});
 const stone=stoneTextures(world),timber=woodTexture(),bark=woodTexture(true),lantern=lanternTexture();
 return{
  wall:m('#f8f2e6',.9),roofRed:m('#e23c2f',.5),gold:m('#ffc531',.32,{metalness:.35,emissive:'#704600',emissiveIntensity:.35}),
  glass:m('#2f4a6b',.35),door:m('#7a4b2a',.8),stone:m('#ffffff',.95,{map:stone.map,bumpMap:stone.bump,bumpScale:.24}),
  trunk:m('#b99b75',.95,{map:bark,bumpMap:bark,bumpScale:.09}),vermilion:m('#b93e28',.66,{map:timber,bumpMap:timber,bumpScale:.018}),ink:m('#2c2723',.7),plaster:m('#e8d4ae',.92),timber:m('#94764e',.92,{map:timber,bumpMap:timber,bumpScale:.04}),
  tiles:m('#ffffff',.7,{map:roofTexture(world===2?'#c95436':'#4a5462')}),
  paper:m('#ffc675',.85,{map:lantern,emissiveMap:lantern,emissive:'#ff8b2a',emissiveIntensity:.65}),litWindow:m('#ffe2a2',.5,{emissive:'#ffb048',emissiveIntensity:1.15}),
  dome:m('#f5f4f0',.45),domeBand:m('#f39b2c',.5),domeWindow:m('#2f5fa8',.35),pipe:m('#2fb64a',.3,{metalness:.2}),
  plank:m('#b9905f',.9,{map:timber,bumpMap:timber,bumpScale:.035}),rope:m('#bda579',.95),
  vine:new T.MeshStandardMaterial({map:vineTexture(world),side:T.DoubleSide,alphaTest:.45,roughness:.95}),
  bannerStar:new T.MeshStandardMaterial({map:bannerTexture('star'),side:T.DoubleSide,alphaTest:.5,roughness:.9}),
  bannerLeaf:new T.MeshStandardMaterial({map:bannerTexture('leaf'),side:T.DoubleSide,alphaTest:.5,roughness:.9}),
 };
}

// ---- Rounded instanced shapes: tree canopies, bushes, clouds ----
let blob:T.BufferGeometry|null=null;
/** A lumpy sphere with baked soft shading (lighter on top). */
export function blobGeometry(){
 if(blob)return blob;
 let g:T.BufferGeometry=new T.SphereGeometry(1,24,16);g.deleteAttribute('normal');g=mergeVertices(g);
 const p=g.getAttribute('position'),colors:number[]=[];
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),bump=1+.06*Math.sin(x*3.1+y*2.3)+.045*Math.sin(z*3.7-y*1.9);
  p.setXYZ(i,x*bump,y*bump,z*bump);const shade=.6+.4*Math.min(1,Math.max(0,y*.55+.5));colors.push(shade,shade,shade);
 }
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return blob=g;
}
let leafyCrown:T.BufferGeometry|null=null;
/** A dense interior with individually curved leaves breaking the outer edge.
 * Every canopy instance shares this geometry, so the extra edge detail adds no
 * draw calls and clouds can keep their softer shape. */
function crownGeometry(){
 if(leafyCrown)return leafyCrown;
 const core=blobGeometry().clone().scale(.86,.84,.86),parts=[core.index?core.toNonIndexed():core];
 const leaf=new T.BufferGeometry();leaf.setAttribute('position',new T.Float32BufferAttribute([-.15,0,0,0,.07,.025,.17,0,0,0,-.07,.025,0,0,.065],3));leaf.setAttribute('uv',new T.Float32BufferAttribute([0,.5,.5,1,1,.5,.5,0,.5,.5],2));leaf.setIndex([0,1,4,1,2,4,2,3,4,3,0,4]);leaf.computeVertexNormals();
 const count=88,goldenAngle=Math.PI*(3-Math.sqrt(5));
 for(let i=0;i<count;i++){
  const y=1-(i+.5)/count*2,r=Math.sqrt(1-y*y),angle=i*goldenAngle,normal=new T.Vector3(Math.cos(angle)*r,y,Math.sin(angle)*r),tangent=new T.Vector3(-Math.sin(angle),0,Math.cos(angle)),bitangent=new T.Vector3().crossVectors(normal,tangent);
  const frame=new T.Matrix4().makeBasis(tangent,bitangent,normal),size=.78+(Math.sin(i*7.4)+1)*.22;
  frame.scale(new T.Vector3(size,size,size));frame.setPosition(normal.clone().multiplyScalar(.86+.055*Math.sin(i*2.7)));
  const g=leaf.toNonIndexed().applyMatrix4(frame),shade=.72+(normal.y*.5+.5)*.28;g.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count*3).fill(shade),3));parts.push(g);
 }
 leaf.dispose();leafyCrown=mergeGeometries(parts,false)!;parts.forEach(g=>g.dispose());return leafyCrown;
}
export class Puffs{
 private list:{matrix:T.Matrix4;color:T.Color}[]=[];
 add(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:T.ColorRepresentation,ry=0){this.list.push({matrix:at(x,y,z,0,ry,0,sx,sy,sz),color:new T.Color(color)});return this;}
 build(parent:T.Object3D,material:T.Material,shadows=false){
  if(!this.list.length)return null;
  const mesh=new T.InstancedMesh(material.userData.leafCrown?crownGeometry():blobGeometry(),material,this.list.length);
  this.list.forEach((p,i)=>{mesh.setMatrixAt(i,p.matrix);mesh.setColorAt(i,p.color);});
  mesh.castShadow=shadows;mesh.receiveShadow=true;parent.add(mesh);this.list=[];return mesh;
 }
}
export function foliageMaterial(){
 const material=new T.MeshStandardMaterial({map:foliageTexture(),bumpMap:foliageTexture(),bumpScale:.045,vertexColors:true,roughness:.94,side:T.DoubleSide});material.userData.leafCrown=true;return material;
}
export const cloudMaterial=()=>new T.MeshStandardMaterial({vertexColors:true,roughness:1,emissive:'#ffffff',emissiveIntensity:.34});
const pick=<V>(list:readonly V[],r:()=>number)=>list[Math.floor(r()*list.length)];

export function roundTree(b:Batch,leaves:Puffs,kit:Kit,x:number,y:number,z:number,size:number,r:()=>number,greens:readonly string[]){
 const trunk=size*.85;
 b.add(kit.trunk,unit.cylinder,at(x,y+trunk/2,z,0,0,0,size*.15,trunk,size*.15));
 const top=y+trunk;leaves.add(x-size*.08,top+size*.35,z,size*.37,size*.38,size*.4,pick(greens,r),r()*6);leaves.add(x+size*.19,top+size*.22,z-size*.15,size*.36,size*.32,size*.37,pick(greens,r),r()*6);
 for(let i=0;i<7;i++){
  const a=i*2.4+r()*.5,s=size*(.24+r()*.095),px=x+Math.cos(a)*size*.38,py=top+size*(.05+r()*.28),pz=z+Math.sin(a)*size*.34;
  timberStrut(b,kit.trunk,new T.Vector3(x,top-size*.25,z),new T.Vector3(px,py,pz),size*.025);
  leaves.add(px,py,pz,s,s*(.75+r()*.22),s,pick(greens,r),r()*6);
 }
}
/** Cloud-pruned pine with tiers of flattened foliage pads. */
export function bonsaiPine(b:Batch,leaves:Puffs,kit:Kit,x:number,y:number,z:number,size:number,r:()=>number){
 const lean=(r()-.5)*.5;b.add(kit.trunk,unit.cylinder,at(x+lean*size*.25,y+size*.42,z,0,0,lean,size*.12,size*.85,size*.12));
 for(let i=0;i<4;i++){
  const s=size*(.44-i*.065),side=i%2?1:-1,px=x+lean*size*.5+side*size*(.32-i*.06),py=y+size*(.55+i*.24),pz=z+(r()-.5)*size*.2;
  timberStrut(b,kit.trunk,new T.Vector3(x+lean*size*.25,py-size*.16,z),new T.Vector3(px,py,pz),size*.025);
  leaves.add(px,py,pz,s,s*.33,s*.72,pick(['#376f3b','#487e42','#2d6234','#5b8b4c'],r));
  leaves.add(px-side*s*.38,py+s*.08,pz+s*.25,s*.61,s*.26,s*.53,pick(['#477b40','#5b8b4c','#376f3b'],r));
 }
}
export function cloud(p:Puffs,x:number,y:number,z:number,size:number,r:()=>number){
 p.add(x,y,z,size*1.15,size*.72,size*.8,'#ffffff');
 for(let i=0;i<6;i++){const s=size*(.42+r()*.38),dx=(i-2.5)*size*.5+(r()-.5)*size*.25;p.add(x+dx,y-size*.12+s*.3+r()*size*.12,z+(r()-.5)*size*.35,s,s*.78,s*.8,'#ffffff');}
}

// ---- Mushrooms (instanced caps and stems, shared spotted texture) ----
let spots:T.Texture|null=null;
function spotTexture(){
 if(spots&&spots.image)return spots;
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const c=canvas.getContext('2d')!;
 const g=c.createLinearGradient(0,0,0,256);g.addColorStop(0,'#f24d3c');g.addColorStop(1,'#d83a2c');c.fillStyle=g;c.fillRect(0,0,512,256);
 let seed=11;const r=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 c.fillStyle='#fffaf0';
 for(let i=0;i<34;i++){const y=40+r()*190,x=r()*512,radius=10+r()*16;for(const ox of [0,512,-512]){c.beginPath();c.ellipse(x+ox,y,radius*(1.3-y/400),radius*.75,0,0,Math.PI*2);c.fill();}}
 spots=new T.CanvasTexture(canvas);spots.colorSpace=T.SRGBColorSpace;spots.wrapS=T.RepeatWrapping;return spots;
}
export class Mushrooms{
 private list:{x:number;y:number;z:number;size:number;tint:string}[]=[];
 add(x:number,y:number,z:number,size:number,tint='#ffffff'){this.list.push({x,y,z,size,tint});return this;}
 build(parent:T.Object3D,shadows=true){
  if(!this.list.length)return;const n=this.list.length;
  const stemGeometry=new T.LatheGeometry([new T.Vector2(.2,0),new T.Vector2(.23,.12),new T.Vector2(.17,.45),new T.Vector2(.15,.8),new T.Vector2(.19,1)],18);
  const capGeometry=new T.SphereGeometry(1,28,12,0,Math.PI*2,0,Math.PI/2),underGeometry=new T.CircleGeometry(.98,24).rotateX(Math.PI/2);
  const stems=new T.InstancedMesh(stemGeometry,new T.MeshStandardMaterial({color:'#f5e9cc',roughness:.8}),n);
  const caps=new T.InstancedMesh(capGeometry,new T.MeshPhysicalMaterial({map:spotTexture(),roughness:.42,clearcoat:.3,clearcoatRoughness:.35}),n);
  const unders=new T.InstancedMesh(underGeometry,new T.MeshStandardMaterial({map:mushroomGillsTexture(),roughness:.92,side:T.DoubleSide}),n);
  this.list.forEach((s,i)=>{
   const stem=s.size*1.05;stems.setMatrixAt(i,at(s.x,s.y,s.z,0,0,0,s.size,stem,s.size));
   caps.setMatrixAt(i,at(s.x,s.y+stem*.94,s.z,0,i*1.7,0,s.size*.82,s.size*.55,s.size*.82));caps.setColorAt(i,new T.Color(s.tint));
   unders.setMatrixAt(i,at(s.x,s.y+stem*.94,s.z,0,0,0,s.size*.82,1,s.size*.82));
  });
  for(const mesh of [stems,caps,unders]){mesh.castShadow=shadows;mesh.receiveShadow=true;parent.add(mesh);}
 }
}

// ---- Flowers (petals face the camera, which looks along -z) ----
let flowerParts:{petals:T.BufferGeometry;center:T.BufferGeometry}|null=null;
export type Flower={x:number;y:number;z:number;color:string;size:number;stem:number;yaw:number};
/** Flower heads stand just above the turf; the grass hides where their stems would be. */
export function flowerBed(parent:T.Object3D,flowers:Flower[],materials:{petals:T.Material;center:T.Material}){
 if(!flowers.length)return;
 if(!flowerParts){
  const shapes:T.Shape[]=[];for(let i=0;i<5;i++){const a=i/5*Math.PI*2,s=new T.Shape();s.absellipse(Math.cos(a)*.044,Math.sin(a)*.044,.04,.025,0,Math.PI*2,false,a);shapes.push(s);}
  flowerParts={petals:new T.ShapeGeometry(shapes,3),center:new T.CircleGeometry(.025,12).translate(0,0,.004)};
 }
 const n=flowers.length;
 const petals=new T.InstancedMesh(flowerParts.petals,materials.petals,n);
 const centers=new T.InstancedMesh(flowerParts.center,materials.center,n);
 flowers.forEach((f,i)=>{
  const head=at(f.x,f.y+f.stem,f.z,-.22,f.yaw,0,f.size);petals.setMatrixAt(i,head);centers.setMatrixAt(i,head);petals.setColorAt(i,new T.Color(f.color));
 });
 petals.receiveShadow=centers.receiveShadow=true;parent.add(petals,centers);
}

// ---- Architecture ----
export function fairyCastle(b:Batch,kit:Kit,origin:T.Matrix4){
 const add=adder(b,origin);
 add(kit.wall,unit.box,0,1.3,0,3.2,2.6,2.2);
 for(let i=-3;i<=3;i++)for(const z of [-1.02,1.02])add(kit.wall,unit.box,i*.5,2.75,z,.3,.32,.26);
 add(kit.door,unit.box,0,.62,1.11,.86,1.24,.1);add(kit.door,unit.disc,0,1.24,1.11,.86,.86,.1);
 add(kit.gold,unit.star,0,2.04,1.14,.6,.6,.6);
 for(const x of [-.95,.95]){add(kit.glass,unit.box,x,1.55,1.11,.3,.52,.06);add(kit.glass,unit.disc,x,1.81,1.11,.3,.3,.06);}
 for(const x of [-1.38,1.38])add(kit.bannerStar,unit.plane,x,1.5,1.13,.5,1.05,1);
 add(kit.wall,unit.cylinder,0,3.1,-.3,1.5,4.6,1.5);add(kit.roofRed,unit.cone,0,6.4,-.3,2.05,2.05,2.05);
 add(kit.glass,unit.box,0,4.3,.46,.26,.46,.06);add(kit.glass,unit.disc,0,4.53,.46,.26,.26,.06);
 add(kit.ink,unit.cylinder,0,7.75,-.3,.05,.8,.05);add(kit.roofRed,unit.box,.3,7.95,-.3,.55,.32,.03);
 for(const [x,z] of [[-1.8,.95],[1.8,.95],[-1.8,-.95],[1.8,-.95]]){
  add(kit.wall,unit.cylinder,x,1.85,z,1.1,3.7,1.1);add(kit.roofRed,unit.cone,x,4.5,z,1.55,1.6,1.55);
  if(z>0){add(kit.glass,unit.box,x,2.7,z+.56,.22,.42,.05);add(kit.glass,unit.disc,x,2.91,z+.56,.22,.22,.05);}
  add(kit.ink,unit.cylinder,x,5.6,z,.04,.6,.04);add(kit.roofRed,unit.box,x+.22,5.75,z,.4,.24,.03);
 }
 for(const x of [-2.75,2.75]){add(kit.wall,unit.cylinder,x,1.35,.25,.9,2.7,.9);add(kit.roofRed,unit.cone,x,3.35,.25,1.25,1.3,1.25);}
}
export function pagoda(b:Batch,kit:Kit,origin:T.Matrix4,tiers=3){
 const add=adder(b,origin);add(kit.stone,unit.box,0,.18,0,3.4,.36,3.4);let y=.36;
 for(let i=0;i<tiers;i++){
  const s=2.3-i*.45,h=i?.8:1;add(kit.plaster,unit.box,0,y+h/2,0,s,h,s);
  for(const [x,z] of [[1,1],[1,-1],[-1,1],[-1,-1]])add(kit.vermilion,unit.cylinder,x*s*.5,y+h/2,z*s*.5,.13,h,.13);
  add(kit.vermilion,unit.box,0,y+h-.06,0,s+.08,.12,s+.08);add(kit.ink,unit.box,0,y+h*.42,s/2+.01,s*.3,h*.55,.04);
  y+=h;add(kit.tiles,unit.roof,0,y+.2,0,s*1.8,.42,s*1.8);y+=.4;
 }
 add(kit.gold,unit.cylinder,0,y+.5,0,.08,1,.08);for(let i=0;i<3;i++){const s=.22-i*.04;add(kit.gold,unit.sphere,0,y+.18+i*.28,0,s,s,s);}
}
export function domeHouse(b:Batch,kit:Kit,origin:T.Matrix4){
 const add=adder(b,origin);add(kit.dome,unit.dome,0,0,0,2.4,2.4,2.4);
 add(kit.domeBand,unit.torus,0,.1,0,2.42,2.42,2.42,Math.PI/2);add(kit.domeWindow,unit.torus,0,.62,0,2.08,2.08,2.08,Math.PI/2);
 add(kit.domeWindow,unit.box,0,.34,1.15,.5,.66,.12);
 for(const a of [-.8,.8])add(kit.domeWindow,unit.disc,Math.sin(a)*1.06,.9,Math.cos(a)*1.06,.3,.3,.08,0,a);
 add(kit.domeBand,unit.sphere,0,1.22,0,.2,.2,.2);
}
export function ringArch(b:Batch,kit:Kit,origin:T.Matrix4){
 const add=adder(b,origin);
 for(let i=0;i<20;i++){
  const a=i/20*Math.PI*2,x=Math.cos(a)*1.4,y=1.78+Math.sin(a)*1.4;
  add(kit.stone,unit.box,x,y,0,.48,.48,.66,0,0,a+Math.PI/2);
  // Recessed geometric carvings follow the voussoirs, on both sides of the gate.
  if(i%2===0){add(kit.ink,unit.box,x,y,.342,.19,.16,.012,0,0,a);add(kit.stone,unit.box,x,y,.35,.115,.085,.018,0,0,a);}
 }
 add(kit.stone,unit.box,0,.18,0,2.3,.36,.95);add(kit.stone,unit.box,0,.04,.3,2.8,.15,1.5);
 for(const s of [-1,1]){add(kit.stone,unit.box,s*1.38,.53,0,.7,.68,.82);add(kit.gold,unit.box,s*1.38,.88,.02,.8,.07,.86);}
}

/** A weathered branch or diagonal timber; all such pieces share the same batch. */
export function timberStrut(b:Batch,material:T.Material,a:T.Vector3,z:T.Vector3,radius:number){
 const difference=z.clone().sub(a),rotation=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),difference.clone().normalize());
 b.add(material,unit.cylinder,new T.Matrix4().compose(a.clone().add(z).multiplyScalar(.5),rotation,new T.Vector3(radius*2,difference.length(),radius*2)));
}

/** Solid walkways and their braces wrap the ancient trunks in the middle layer. */
export function canopyDeck(b:Batch,kit:Kit,x:number,y:number,z:number,width=4.5,depth=2){
 const count=Math.ceil(width/.28);
 for(let i=0;i<count;i++)b.add(kit.plank,unit.box,at(x-width/2+(i+.5)*width/count,y,z,0,0,Math.sin(i*3)*.008,width/count-.012,.17,depth));
 for(const side of [-1,1]){
  timberStrut(b,kit.timber,new T.Vector3(x+side*width*.42,y-.16,z-depth*.36),new T.Vector3(x,y-2.1,z),.13);
  timberStrut(b,kit.timber,new T.Vector3(x+side*width*.42,y-.16,z+depth*.36),new T.Vector3(x,y-2.1,z),.13);
 }
 for(let i=0;i<=Math.ceil(width/1.3);i++){
  const px=x-width/2+i*width/Math.ceil(width/1.3);b.add(kit.vermilion,unit.cylinder,at(px,y+.48,z-depth*.45,0,0,0,.09,.9,.09));
 }
 for(const h of [.45,.82])b.add(kit.vermilion,unit.box,at(x,y+h,z-depth*.45,0,0,0,width,.075,.075));
}

/** Strips of ivy trail from masonry and branches; geometry stays behind the lane. */
export function hangingGarden(b:Batch,kit:Kit,x:number,y:number,z:number,width:number,r:()=>number,drop=2){
 for(let i=0;i<Math.max(3,Math.ceil(width*1.7));i++){
  const px=x+(r()-.5)*width,h=drop*(.35+r()*.65);b.add(kit.vine,unit.plane,at(px,y-h/2,z+r()*.06,0,(r()-.5)*.3,(r()-.5)*.12,.24+r()*.16,h,1));
 }
}

/** Sculpted relief heads project from a craggy ridge, rather than flat face decals. */
export function carvedMountain(b:Batch,kit:Kit,origin:T.Matrix4,heads=5){
 const add=adder(b,origin),shadow=kit.stone.clone();shadow.color.set('#7e705d');
 const ridge=new T.BufferGeometry(),vertices:number[]=[],indices:number[]=[],uv:number[]=[];
 const columns=heads*5;
 for(let row=0;row<=6;row++)for(let i=0;i<=columns;i++){
  const x=(i/columns-.5)*heads*3.3,y=-5+row*1.65+Math.sin(i*1.2)*.2,z=-.7+Math.sin(i*.8)*.45-Math.cos(row*1.1+i*.2)*.15;
  vertices.push(x,y,z);uv.push(x*.23,y*.23);
 }
 for(let row=0;row<6;row++)for(let i=0;i<columns;i++){const a=row*(columns+1)+i;indices.push(a,a+1,a+columns+1,a+1,a+columns+2,a+columns+1);}
 ridge.setAttribute('position',new T.Float32BufferAttribute(vertices,3));ridge.setAttribute('uv',new T.Float32BufferAttribute(uv,2));ridge.setIndex(indices);ridge.computeVertexNormals();b.add(kit.stone,ridge,origin);ridge.dispose();
 for(let i=0;i<heads;i++){
  const x=(i-(heads-1)/2)*3.1,tilt=(i%2?1:-1)*.035;
  add(kit.stone,unit.sphere,x,2.1,.05,2.6,4.15,1.9,0,0,tilt);
  add(kit.stone,unit.sphere,x,1.13,.51,1.86,1.42,1.16);
  // An angular nose bridge, sockets under a continuous stone brow, and jaw.
  add(kit.stone,unit.box,x,2.14,1.02,.26,.95,.35,.13,0,0);
  add(kit.stone,unit.sphere,x,1.91,1.25,.42,.33,.42);
  for(const side of [-1,1]){
   add(shadow,unit.sphere,x+side*.49,2.36,.84,.69,.23,.15);
   add(kit.stone,unit.sphere,x+side*.5,2.53,.96,.89,.28,.4,0,0,side*-.12);
   add(kit.stone,unit.sphere,x+side*.64,1.86,.78,.68,.63,.42);
  }
  add(shadow,unit.box,x,1.39,1.03,.67,.045,.035);add(kit.stone,unit.sphere,x,1.1,.96,.87,.48,.35);
  // Five different crowns: band, swept hair, high crest, cap, pointed hair.
  add(kit.stone,unit.box,x,3.2,.79,2.13,.43,.27);
  if(i===3)add(kit.stone,unit.cone,x,4.26,.1,2.95,1.4,1.9);
  else for(let j=0;j<8;j++){
   const a=(j/7-.5)*Math.PI*.92,px=x+Math.sin(a)*1.04,py=3.56+Math.cos(a)*.56;
   add(kit.stone,i%2?unit.sphere:unit.cone,px,py,.26,.6,.78+(j%3)*.18,.8,0,0,-a*.48);
  }
 }
}
export function torii(b:Batch,kit:Kit,origin:T.Matrix4){
 const add=adder(b,origin);
 for(const x of [-1.3,1.3]){add(kit.vermilion,unit.cylinder,x,1.65,0,.3,3.3,.3);add(kit.ink,unit.cylinder,x,.16,0,.4,.32,.4);}
 add(kit.vermilion,unit.box,0,2.55,0,3.3,.22,.24);add(kit.vermilion,unit.box,0,2.98,0,3.75,.2,.3);add(kit.ink,unit.box,0,3.18,0,3.9,.24,.4);
 for(const s of [-1,1])add(kit.ink,unit.box,s*2.1,3.26,0,.62,.22,.38,0,0,s*.22);
 add(kit.ink,unit.box,0,2.77,.13,.42,.36,.06);
}
/** A timber-framed village house; returns world positions of its warm lights. */
export function house(b:Batch,kit:Kit,origin:T.Matrix4,w=3,h=2,d=2.2,floors=1){
 const add=adder(b,origin),lights:T.Vector3[]=[];
 const story=(y0:number,width:number,height:number,depth:number)=>{
  add(kit.plaster,unit.box,0,y0+height/2,0,width,height,depth);
  for(const x of [-width/2,width/2])for(const z of [-depth/2,depth/2])add(kit.timber,unit.box,x,y0+height/2,z,.14,height+.02,.14);
  add(kit.timber,unit.box,0,y0+height*.52,depth/2+.01,width,.1,.05);
  const n=Math.max(1,Math.round(width/1.25));
  for(let i=0;i<n;i++){const x=(i-(n-1)/2)*width/n;add(kit.litWindow,unit.box,x,y0+height*.76,depth/2+.02,.44,.34,.04);lights.push(new T.Vector3(x,y0+height*.76,depth/2+.3).applyMatrix4(origin));}
  add(kit.vermilion,unit.box,0,y0+height+.06,0,width+.26,.12,depth+.26);add(kit.tiles,unit.roof,0,y0+height+.6,0,width*1.42,.95,depth*1.5);
  add(kit.ink,unit.box,0,y0+height+1.1,0,width*.34,.1,.14);
 };
 story(0,w,h,d);add(kit.timber,unit.box,w*.28,h*.3,d/2+.02,.5,h*.6,.04);
 if(floors>1)story(h+.35,w*.62,h*.72,d*.7);
 return lights;
}
export function paperLantern(b:Batch,kit:Kit,x:number,y:number,z:number,string=.45){
 const add=adder(b,new T.Matrix4());
 add(kit.paper,unit.sphere,x,y,z,.3,.4,.3);add(kit.ink,unit.cylinder,x,y+.21,z,.15,.06,.15);add(kit.ink,unit.cylinder,x,y-.21,z,.15,.06,.15);
 if(string>0)add(kit.ink,unit.cylinder,x,y+.24+string/2,z,.018,string,.018);
 return new T.Vector3(x,y,z);
}
export function bannerPole(b:Batch,kit:Kit,x:number,y:number,z:number,kind:'star'|'leaf',height=3){
 const add=adder(b,new T.Matrix4());
 add(kit.timber,unit.cylinder,x,y+height/2,z,.1,height,.1);add(kit.timber,unit.cylinder,x+.42,y+height-.08,z,.06,.95,.06,0,0,Math.PI/2);
 add(kind==='star'?kit.bannerStar:kit.bannerLeaf,unit.plane,x+.42,y+height-.9,z+.03,.72,1.5,1);
}
export function stoneBridge(b:Batch,kit:Kit,origin:T.Matrix4,span=12,arches=3,drop=7){
 const add=adder(b,origin),step=span/arches;
 add(kit.stone,unit.box,0,0,0,span+.6,.55,1.7);for(const z of [-.76,.76])add(kit.stone,unit.box,0,.42,z,span+.6,.32,.2);
 for(let i=0;i<=arches;i++)add(kit.stone,unit.box,-span/2+i*step,-drop/2,0,.95,drop,1.6);
 for(let j=0;j<arches;j++){
  const x=-span/2+(j+.5)*step,radius=(step-.95)/2;
  add(kit.stone,unit.arc,x,-.28-radius,0,radius,radius,4);
  add(kit.bannerStar,unit.plane,x,-1.05,.9,.62,1.25,1);
 }
}

// ---- Landscape ----
export function pillHills(parent:T.Object3D,items:{x:number;y:number;z:number;radius:number;height:number;color:string}[]){
 if(!items.length)return;
 const map=dotsTexture();map.repeat.set(2,1);
 const material=new T.MeshStandardMaterial({map,roughness:.92});
 const body=new T.InstancedMesh(new T.CylinderGeometry(1,1,1,30,1,true).translate(0,.5,0),material,items.length);
 const cap=new T.InstancedMesh(new T.SphereGeometry(1,30,14,0,Math.PI*2,0,Math.PI/2),material,items.length);
 items.forEach((h,i)=>{
  body.setMatrixAt(i,at(h.x,h.y,h.z,0,i,0,h.radius,h.height,h.radius));cap.setMatrixAt(i,at(h.x,h.y+h.height,h.z,0,i,0,h.radius,h.radius,h.radius));
  const color=new T.Color(h.color);body.setColorAt(i,color);cap.setColorAt(i,color);
 });
 body.receiveShadow=cap.receiveShadow=true;parent.add(body,cap);
}
export function waterfallMaterial(){return new T.MeshBasicMaterial({map:waterfallTexture(),color:'#f4ffff',transparent:true,depthWrite:false,side:T.DoubleSide});}
export function waterfall(parent:T.Object3D,material:T.Material,x:number,top:number,bottom:number,z:number,width:number,foam?:Puffs){
 const height=top-bottom,geometry=new T.PlaneGeometry(width,height),uv=geometry.getAttribute('uv');
 for(let i=0;i<uv.count;i++)uv.setY(i,uv.getY(i)*height/2.6);
 const sheet=new T.Mesh(geometry,material);sheet.position.set(x,bottom+height/2,z);sheet.renderOrder=2;parent.add(sheet);
 if(foam)for(let i=0;i<4;i++)foam.add(x+(i-1.5)*width*.45,bottom+.15,z+.1,width*.55,width*.32,width*.45,'#ffffff');
 return sheet;
}
export type WaterLook={deep:string;shallow:string;horizon:string;fog:string;near:number;far:number};
export function waterSurface(parent:T.Object3D,x:number,y:number,z:number,width:number,depth:number,look:WaterLook){
 const material=new T.ShaderMaterial({
  uniforms:{time:{value:0},deep:{value:new T.Color(look.deep)},shallow:{value:new T.Color(look.shallow)},horizon:{value:new T.Color(look.horizon)},fogColor:{value:new T.Color(look.fog)},fogNear:{value:look.near},fogFar:{value:look.far},sunDir:{value:new T.Vector3(-.35,.75,.55).normalize()}},
  vertexShader:'varying vec3 world;void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
  fragmentShader:`varying vec3 world;uniform float time;uniform vec3 deep;uniform vec3 shallow;uniform vec3 horizon;uniform vec3 fogColor;uniform float fogNear;uniform float fogFar;uniform vec3 sunDir;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
 float a=sin(world.x*1.3+time*.8)+sin(world.z*1.7-time*.6)+.5*sin((world.x+world.z)*3.1+time*1.3);
 vec3 n=normalize(vec3(.07*cos(world.x*1.3+time*.8),1.,.07*cos(world.z*1.7-time*.6)));
 vec3 eye=normalize(cameraPosition-world);float fres=pow(1.-max(dot(n,eye),0.),3.);
 vec3 c=mix(deep,shallow,.45+.12*a);c=mix(c,horizon,fres*.7);
 float sun=pow(max(dot(reflect(-sunDir,n),eye),0.),160.);
 vec2 cell=floor(world.xz*5.);float twinkle=step(.992,hash(cell))*max(0.,sin(time*3.+hash(cell+3.)*40.));
 c+=vec3(1.,.97,.85)*(sun*.9+twinkle*.8);
 c=mix(c,fogColor,smoothstep(fogNear,fogFar,distance(cameraPosition,world)));
 gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`});
 const water=new T.Mesh(new T.PlaneGeometry(width,depth),material);water.rotation.x=-Math.PI/2;water.position.set(x,y,z);water.receiveShadow=false;parent.add(water);
 return material;
}
let pillarVariants:T.BufferGeometry[]|null=null;
/** Craggy limestone columns, darker at the base and mossy near the top. */
function pillarGeometry(seed:number){
 let s=seed;const r=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};const points:T.Vector2[]=[];
 for(let i=0;i<=16;i++){const t=i/16;points.push(new T.Vector2((1.05-.25*t+.09*Math.sin(t*11+seed)+.05*(r()-.5))*(t>.96?.85:1),t));}
 points.push(new T.Vector2(.55,1.03),new T.Vector2(0,1.05));
 const g=new T.LatheGeometry(points,14),p=g.getAttribute('position'),uv=g.getAttribute('uv'),colors:number[]=[];
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x),k=1+.11*Math.sin(a*5+y*9+seed)+.06*Math.sin(a*13-y*17);p.setX(i,x*k);p.setZ(i,z*k);
  const light=.55+.45*Math.min(1,y*1.3),moss=y>.85?(y-.85)/.2:0;colors.push(light*(1-moss*.3),light*(1+moss*.05),light*(1-moss*.45));
  uv.setXY(i,uv.getX(i)*3,uv.getY(i)*5);
 }
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
export function karstPillars(parent:T.Object3D,material:T.Material,items:{x:number;y:number;z:number;radius:number;height:number}[],tufts:Puffs,r:()=>number){
 pillarVariants??=[pillarGeometry(3),pillarGeometry(17),pillarGeometry(29)];
 const groups=pillarVariants.map(()=>[] as T.Matrix4[]);
 items.forEach((p,i)=>{
  groups[i%groups.length].push(at(p.x,p.y,p.z,0,r()*6,0,p.radius,p.height,p.radius));
  const top=p.y+p.height*1.04;
  tufts.add(p.x,top,p.z,p.radius*.8,p.radius*.3,p.radius*.8,pick(['#5f9f45','#6fae4c','#4f8f3f'],r));
  if(i%3===0)tufts.add(p.x+p.radius*.3,top+p.radius*.35,p.z,p.radius*.35,p.radius*.3,p.radius*.35,'#3f8a46');
 });
 groups.forEach((list,v)=>{if(!list.length)return;const mesh=new T.InstancedMesh(pillarVariants![v],material,list.length);list.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.receiveShadow=true;parent.add(mesh);});
}
export function mistSheets(parent:T.Object3D,items:{x:number;y:number;z:number;width:number;height:number;opacity:number}[]){
 const map=mistTexture();
 for(const s of items){const sheet=new T.Mesh(unit.plane,new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,opacity:s.opacity,color:'#ffffff'}));sheet.scale.set(s.width,s.height,1);sheet.position.set(s.x,s.y,s.z);sheet.renderOrder=3;parent.add(sheet);}
}
/** Out-of-focus foreground framing, kept below the lane so it never hides the hero. */
export function bokehLayer(parent:T.Object3D,world:number,items:{x:number;y:number;z:number;size:number}[]){
 const material=new T.MeshBasicMaterial({map:bokehTexture(world),transparent:true,depthWrite:false,fog:false,opacity:.92});
 for(const s of items){const sprite=new T.Mesh(unit.plane,material);sprite.scale.set(s.size,s.size,1);sprite.position.set(s.x,s.y,s.z);sprite.renderOrder=5;parent.add(sprite);}
}
/** Additive glow halos for lanterns and lit windows (one draw call). */
export function glowPoints(parent:T.Object3D,items:{position:T.Vector3;size:number;color:string}[]){
 if(!items.length)return null;
 const positions:number[]=[],tints:number[]=[],sizes:number[]=[];
 for(const g of items){positions.push(g.position.x,g.position.y,g.position.z);const c=new T.Color(g.color);tints.push(c.r,c.g,c.b);sizes.push(g.size);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('tint',new T.Float32BufferAttribute(tints,3));geometry.setAttribute('size',new T.Float32BufferAttribute(sizes,1));
 const material=new T.ShaderMaterial({uniforms:{map:{value:glowTexture()},scale:{value:450}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
  vertexShader:'attribute float size;attribute vec3 tint;varying vec3 vTint;uniform float scale;void main(){vTint=tint;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*scale/-mv.z;gl_Position=projectionMatrix*mv;}',
  fragmentShader:'uniform sampler2D map;varying vec3 vTint;void main(){float a=texture2D(map,gl_PointCoord).a;gl_FragColor=vec4(vTint,a);\n#include <colorspace_fragment>\n}'});
 const points=new T.Points(geometry,material);points.frustumCulled=false;points.renderOrder=4;parent.add(points);
 // Size halos from the real drawing buffer, so they look the same on every screen and pixel ratio.
 const buffer=new T.Vector2();points.onBeforeRender=renderer=>{material.uniforms.scale.value=renderer.getDrawingBufferSize(buffer).y*.5;};
 return material;
}
export function planet(parent:T.Object3D,x:number,y:number,z:number,radius:number){
 const material=new T.MeshStandardMaterial({map:planetTexture(),roughness:1,emissive:'#8bbacb',emissiveIntensity:.22,fog:false});
 const sphere=new T.Mesh(new T.SphereGeometry(radius,48,32),material);sphere.position.set(x,y,z);sphere.rotation.set(.3,0,.25);parent.add(sphere);
 const atmosphere=new T.Mesh(new T.SphereGeometry(radius*1.018,40,24),new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{tint:{value:new T.Color('#73ddff')}},vertexShader:'varying vec3 n;varying vec3 eye;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);eye=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n;varying vec3 eye;uniform vec3 tint;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(eye))),3.5);gl_FragColor=vec4(tint,rim*.55);\n#include <colorspace_fragment>\n}'}));atmosphere.position.copy(sphere.position);parent.add(atmosphere);
 const moon=new T.Mesh(new T.SphereGeometry(radius*.18,32,20),new T.MeshStandardMaterial({map:planetTexture(),color:'#edbbf1',roughness:1,emissive:'#b17ab8',emissiveIntensity:.23,fog:false}));moon.position.set(x+radius*1.55,y+radius*.45,z+4);moon.rotation.set(.7,2.1,.2);parent.add(moon);
 return sphere;
}
