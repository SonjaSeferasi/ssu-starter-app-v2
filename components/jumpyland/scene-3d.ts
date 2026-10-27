import * as T from 'three';
import type {Platform} from './levels';
import {cliffGeometry,fringeMaterials,grassLip,hangingVines,meadowFringe,type FringeDetail} from './terrain-model';
import {MUSHROOM_PROFILE} from './landing-geometry';
import {Batch,Puffs,at,fairyCastle,foliageMaterial,propKit,unit as shapes} from './toon-props';

// Collision-aligned 3D landscape meshes. world-scenery.ts builds the layered vista behind them.
export const unit=100;
export function seeded(seed:number){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function mesh(g:T.BufferGeometry,m:T.Material|T.Material[],parent:T.Object3D,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
export const material=(color:T.ColorRepresentation,roughness=.9)=>new T.MeshStandardMaterial({color,roughness});
export function box(parent:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,color:T.ColorRepresentation){return mesh(new T.BoxGeometry(w,h,d),material(color),parent,x,y,z);}
export function cylinder(parent:T.Object3D,x:number,y:number,z:number,r:number,h:number,color:T.ColorRepresentation,top=r){return mesh(new T.CylinderGeometry(top,r,h,12),material(color),parent,x,y,z);}
export function link(parent:T.Object3D,a:T.Vector3,b:T.Vector3,r:number,color:T.ColorRepresentation){const o=cylinder(parent,0,0,0,r,a.distanceTo(b),color);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());return o;}
const atlasCache=new Map<number|string,T.Texture>();
function atlas(part:number){let texture=atlasCache.get(part);if(!texture){texture=new T.TextureLoader().load('/jumpyland/terrain-materials-v1.png');texture.colorSpace=T.SRGBColorSpace;texture.repeat.set(.495,.495);texture.offset.set(part%2*.5,part<2?.5:0);texture.anisotropy=8;atlasCache.set(part,texture);}return texture;}
function pbr(name:string,srgb=false){const key=name+(srgb?':srgb':':linear');let texture=atlasCache.get(key);if(!texture){texture=new T.TextureLoader().load('/jumpyland/pbr/'+name+'.jpg');texture.wrapS=texture.wrapT=T.RepeatWrapping;if(srgb)texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;atlasCache.set(key,texture);}return texture;}
export function clearSceneTextures(){atlasCache.clear();}
export function clayMaterial(color:string){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d')!,r=seeded(514);c.fillStyle='#ccbba2';c.fillRect(0,0,256,256);
 for(let i=0;i<16000;i++){c.fillStyle=i%3?'#593a2720':'#fff0d422';c.fillRect(r()*256,r()*256,.4+r()*2,.4+r()*2);}
 const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;
 const mat=new T.MeshStandardMaterial({color,map:t,bumpMap:t,bumpScale:.016,roughness:.97});return mat;
}
// Scanned fractured rock with moss below the turf; silhouettes remain real meshes.
const mossTint:Record<number,[number,number,number]>={1:[.82,1.12,.62],2:[.8,1.08,.6],3:[.78,1.05,.64]};
export function terrainMaterials(world:number){
 const rock=new T.MeshStandardMaterial({map:pbr('mossy_rock-Diffuse',true),normalMap:pbr('mossy_rock-nor_gl'),roughnessMap:pbr('mossy_rock-Rough'),color:world===2?'#ebc49c':world===3?'#c9c4ab':'#e4d6bd',vertexColors:true,roughness:.96});
 rock.normalScale.set(.48,.48);
 rock.color.multiplyScalar(1.55);
 return{rock,...fringeMaterials(world)};
}
export function island(parent:T.Object3D,p:Platform,world:number,mats:ReturnType<typeof terrainMaterials>,seed=1,grounded=false,bottom?:number,detail:FringeDetail='lane'){
 const root=new T.Group();root.position.set(p.x/100,0,0);parent.add(root);
 const shapes=cliffGeometry(p,bottom??(grounded?1600:p.y+150+p.width*.2),seed,mossTint[world],detail==='far'?.38:1);
 mesh(shapes.rock,mats.rock,root);mesh(shapes.cap,mats.turf,root);
 if(detail!=='far')root.add(meadowFringe(p,seed+91,world,detail,mats));
 root.add(grassLip(shapes.edge,mats.lip,seed));
 if(detail==='lane'||(detail==='near'&&!grounded)){
  const w=p.width/100;root.add(hangingVines(shapes.edge,mats.vine,seed,Math.floor(w*(world===2?3.2:world===1?1.8:1.2)),grounded?1.3:2.2,grounded?.16:.1));
 }
 return root;
}
export function deck(parent:T.Object3D,p:Platform,bamboo=false){
 const root=new T.Group();root.position.x=p.x/100;parent.add(root);const w=p.width/100,y=-p.y/100,d=p.depth||2.5;
 const wood=material(bamboo?'#a6a16a':'#c8ab80');wood.map=timberTexture();wood.bumpMap=wood.map;wood.bumpScale=.035;
 const n=Math.ceil(w/.18),geo=bamboo?new T.CylinderGeometry(.095,.105,d,14):new T.BoxGeometry(w/n-.006,.12,d),planks=new T.InstancedMesh(geo,wood,n),dummy=new T.Object3D(),r=seeded(p.x+21);
 planks.castShadow=planks.receiveShadow=true;
 for(let i=0;i<n;i++){dummy.position.set((i+.5)*w/n,y-(bamboo?.105:.06),0);dummy.rotation.set(bamboo?Math.PI/2:0,0,0);dummy.updateMatrix();planks.setMatrixAt(i,dummy.matrix);planks.setColorAt(i,new T.Color().setScalar(.76+r()*.24));}root.add(planks);
 for(const z of [-d*.38,d*.38]){const beam=box(root,w/2,y-.24,z,w,.16,.16,'#807052');(beam.material as T.MeshStandardMaterial).map=atlas(3);}
 if(bamboo){
  const joints=new T.InstancedMesh(new T.TorusGeometry(.101,.009,5,12),material('#667c36'),n*3),holes=new T.InstancedMesh(new T.CircleGeometry(.066,12),material('#3f5126'),n),joint=new T.Object3D();
  for(let i=0;i<n;i++){
   for(let j=0;j<3;j++){joint.position.set((i+.5)*w/n,y-.105,(j-1)*d*.32);joint.rotation.set(0,0,0);joint.updateMatrix();joints.setMatrixAt(i*3+j,joint.matrix);}
   joint.position.set((i+.5)*w/n,y-.105,d/2+.001);joint.updateMatrix();holes.setMatrixAt(i,joint.matrix);
  }root.add(joints,holes);
 }
 // Rope lashings wrap both support beams. Their fibers catch the side light.
 const rope=material('#bbaa7b'),lashing=new T.TorusGeometry(.14,.014,6,24),parts=new Batch();
 for(const x of [.16,w-.16])for(let i=0;i<4;i++)parts.add(rope,lashing,at(x+i*.025,y-.13,0,0,Math.PI/2,0,d/(.28)+.1,1,1));
 lashing.dispose();
 if(!bamboo){
  const bolt=material('#34392e');for(const x of [.08,w-.08])for(const z of [-d*.38,d*.38])parts.add(bolt,shapes.cylinder,at(x,y+.002,z,0,0,0,.036,.008,.036));
  // A post-and-rope railing runs along the back edge, out of the walking line.
  const rail=new Batch(),post=material('#7b5a3a'),line=material('#cdb68a'),posts=Math.max(2,Math.round(w/.85));
  for(let i=0;i<=posts;i++){const x=.1+i*(w-.2)/posts;rail.add(post,shapes.cylinder,at(x,y+.3,-d*.46,0,0,0,.07,.62,.07));}
  for(const h of [.55,.3])rail.add(line,shapes.cylinder,at(w/2,y+h,-d*.46,0,0,Math.PI/2,.035,w-.2,.035));
  rail.build(root);
 }
 parts.build(root);
 return root;
}
function timberTexture(){
 const key='timber-grain';let t=atlasCache.get(key);if(t)return t;
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=512;const c=canvas.getContext('2d')!,r=seeded(731);c.fillStyle='#c8ad7d';c.fillRect(0,0,128,512);
 for(let i=0;i<170;i++){const x=r()*128;c.strokeStyle=i%3?'#6e4e2c30':'#f2d7a84a';c.lineWidth=.4+r()*1.3;c.beginPath();c.moveTo(x,0);for(let y=0;y<=512;y+=16)c.lineTo(x+Math.sin(y*.014+i)*1.6,y);c.stroke();}
 for(let j=0;j<3;j++){c.strokeStyle='#7b593d55';c.lineWidth=.7;c.beginPath();c.ellipse(20+r()*88,r()*512,2+r()*3,9+r()*18,0,0,Math.PI*2);c.stroke();}
 t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;atlasCache.set(key,t);return t;
}
/** Bark trunk with roots and branches, crowned by rounded leafy clusters. */
/** A cylinder from a to b, for merging into a Batch. */
function strut(b:Batch,m:T.Material,from:T.Vector3,to:T.Vector3,radius:number){
 const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),to.clone().sub(from).normalize());
 b.add(m,shapes.cylinder,new T.Matrix4().compose(from.clone().add(to).multiplyScalar(.5),q,new T.Vector3(radius*2,from.distanceTo(to),radius*2)));
}
export function tree(parent:T.Object3D,x:number,y:number,z:number,height=6,blue=false){
 const root=new T.Group();root.position.set(x,y,z);parent.add(root);const r=seeded(Math.round(x*91+z*41+height*71));
 const bark=material('#e3d3b9');bark.map=pbr('japanese_cedar_bark-Diffuse',true);bark.normalMap=pbr('japanese_cedar_bark-nor_gl');bark.roughnessMap=pbr('japanese_cedar_bark-Rough');bark.normalScale.set(.8,.8);
 const points:T.Vector2[]=[];for(let i=0;i<=14;i++){const t=i/14;points.push(new T.Vector2(height*(.009+(height>10?.072:.039)*Math.pow(1-t,1.6))*(1+Math.sin(t*18)*.07),t*height*.9));}
 const lathe=new T.LatheGeometry(points,14),positions=lathe.getAttribute('position');for(let i=0;i<positions.count;i++){const yy=positions.getY(i)/height;positions.setX(i,positions.getX(i)+Math.sin(yy*4.5)*height*.018);}lathe.computeVertexNormals();
 // Trunk, roots and branches merge into one mesh.
 const wood=new Batch(),roots=material('#7d7450');wood.add(bark,lathe,new T.Matrix4());lathe.dispose();
 for(let j=0;j<4;j++){const a=j*1.57+height;strut(wood,roots,new T.Vector3(0,height*.13,0),new T.Vector3(Math.cos(a)*height*.09,0,Math.sin(a)*height*.09),height*.014);}
 const greens=blue?['#3f8f48','#4f9f52','#5aa75a','#2f7a3e']:height>10?['#6fae3a','#86c044','#5c9a33','#9dcb52','#78b33e']:['#5fb83a','#74c843','#4ea52f','#86d24c'];
 const crown=new Puffs(),large=height>10;
 for(let j=0;j<9;j++){
  const a=j*2.4,end=new T.Vector3(Math.cos(a)*height*(large?.12:.17),height*((large?.9:.73)+r()*(large?.12:.21)),Math.sin(a)*height*(large?.11:.14));
  strut(wood,bark,new T.Vector3(0,height*(large?.8:.63),0),end,height*(large?.011:.004));
  const s=height*(large?.105:.15);
  for(let k=0;k<3;k++)crown.add(end.x+(r()-.5)*s*1.3,end.y+(r()-.35)*s*.8,end.z+(r()-.5)*s*1.1,s*(.75+r()*.45),s*(.62+r()*.3),s*(.75+r()*.45),greens[Math.floor(r()*greens.length)],r()*6);
 }
 crown.build(root,foliageMaterial(),true);
 if(large)ivy(root,height,wood,bark,r);wood.build(root);return root;
}
export const mushroomCrownHeight=1.47;
function ivy(root:T.Group,height:number,wood:Batch,bark:T.Material,r:()=>number){
 const leaf=new T.BufferGeometry();leaf.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-.055,.07,.025,0,.15,.05,.055,.07,.025,0,.07,.055],3));leaf.setIndex([0,1,4,1,2,4,2,3,4,3,0,4]);leaf.computeVertexNormals();
 const leaves=new T.InstancedMesh(leaf,new T.MeshStandardMaterial({color:'#7a9a42',roughness:.9,side:T.DoubleSide}),Math.floor(height*22)),dummy=new T.Object3D();leaves.castShadow=leaves.receiveShadow=true;
 for(let i=0;i<leaves.count;i++){const t=r()*.7,a=t*20+i%4*1.57,rad=height*(.009+.072*Math.pow(1-t,1.6))+.025;dummy.position.set(Math.cos(a)*rad,t*height,Math.sin(a)*rad);dummy.rotation.set((r()-.5)*.8,-a,Math.sin(i)*.4);dummy.scale.setScalar(.8+r()*1.6);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);leaves.setColorAt(i,new T.Color().setHSL(.22+r()*.05,.5,.32+r()*.16));}root.add(leaves);
 for(let i=0;i<6;i++){const a=i*Math.PI/3,end=new T.Vector3(Math.cos(a)*height*.16,.01,Math.sin(a)*height*.16);strut(wood,bark,new T.Vector3(0,height*.14,0),end,height*.023);}
}
export function mushroom(parent:T.Object3D,x:number,y:number,z:number,size=1){
 const root=new T.Group();root.position.set(x,y,z);root.scale.setScalar(size);parent.add(root);
 const r=seeded(Math.round(x*71+z*23+321)),canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d')!;
 const red=c.createLinearGradient(0,0,0,256);red.addColorStop(0,'#f5503d');red.addColorStop(.7,'#e23a2c');red.addColorStop(1,'#f06a4a');c.fillStyle=red;c.fillRect(0,0,256,256);
 c.fillStyle='#fffaf0';for(let i=0;i<13;i++){const xx=r()*256,yy=20+r()*215,rr=8+r()*11;c.beginPath();c.ellipse(xx,yy,rr,rr*.72,0,0,Math.PI*2);c.fill();}
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;const capmat=new T.MeshPhysicalMaterial({map:tex,roughness:.42,clearcoat:.3,clearcoatRoughness:.35});
 mesh(new T.LatheGeometry([new T.Vector2(.2,0),new T.Vector2(.22,.1),new T.Vector2(.15,.35),new T.Vector2(.12,.7),new T.Vector2(.16,.95),new T.Vector2(.24,1.05)],28),material('#f4e8c9'),root);
 mesh(new T.LatheGeometry([new T.Vector2(.81,1.04),...[...MUSHROOM_PROFILE].reverse().map(([x,y])=>new T.Vector2(x,y))],56),capmat,root);
 const underside=mesh(new T.CircleGeometry(.8,48),material('#e9d4a8'),root,0,1.04,0);underside.rotation.x=Math.PI/2;
 const gills=new T.InstancedMesh(new T.BoxGeometry(.58,.012,.008),material('#f2e2bd'),64),dummy=new T.Object3D();for(let i=0;i<64;i++){const a=i/64*Math.PI*2;dummy.position.set(Math.cos(a)*.48,1.035,Math.sin(a)*.48);dummy.rotation.y=-a;dummy.updateMatrix();gills.setMatrixAt(i,dummy.matrix);}root.add(gills);root.userData.crownHeight=mushroomCrownHeight;return root;
}
export function pipe(parent:T.Object3D,x:number,y:number,z:number){const root=new T.Group();root.position.set(x,y,z);parent.add(root);const m=new T.MeshStandardMaterial({color:'#2fb64a',metalness:.2,roughness:.3});mesh(new T.CylinderGeometry(.42,.42,.9,32,1,true),m,root,0,.45,0);mesh(new T.CylinderGeometry(.5,.5,.2,32,1,true),m,root,0,.95,0);const rim=mesh(new T.TorusGeometry(.455,.055,10,32),m,root,0,.995,0);rim.rotation.x=Math.PI/2;const hole=mesh(new T.CircleGeometry(.4,32),material('#123d1d'),root,0,.86,0);hole.rotation.x=-Math.PI/2;return root;}
/** The fairy-tale castle that marks the end of the Mushroom Cliffs. */
export function castle(parent:T.Object3D,x:number,y:number,z:number){const root=new T.Group();root.position.set(x,y,z);parent.add(root);const b=new Batch();fairyCastle(b,propKit(1),at(0,0,0,0,0,0,.78));b.build(root);return root;}
export function bridge(parent:T.Object3D,x1:number,x2:number,y:number,z=0){
 const root=new T.Group();parent.add(root);const n=Math.ceil((x2-x1)/.18),wood=material('#c3a579');wood.map=timberTexture();wood.bumpMap=wood.map;wood.bumpScale=.035;
 const parts=new Batch(),rope=material('#c5b18a'),postWood=material('#978260');postWood.map=atlas(3);const knot=new T.TorusGeometry(.054,.012,6,12);
 const planks=new T.InstancedMesh(new T.BoxGeometry((x2-x1)/n-.006,.12,2.3),wood,n+1),dummy=new T.Object3D();planks.castShadow=planks.receiveShadow=true;
 for(let i=0;i<=n;i++){const t=i/n,x=x1+(x2-x1)*t,drop=Math.sin(t*Math.PI)*.22;dummy.position.set(x,y-drop-.06,z);dummy.rotation.set(0,0,0);dummy.updateMatrix();planks.setMatrixAt(i,dummy.matrix);planks.setColorAt(i,new T.Color().setScalar(.82+Math.sin(i*4.1)*.13));}root.add(planks);
 for(const zz of [-1.1,1.1]){let prev=new T.Vector3(x1,y+.8,z+zz);for(let i=0;i<=18;i++){const t=i/18,x=x1+(x2-x1)*t,drop=Math.sin(t*Math.PI)*.22,next=new T.Vector3(x,y+.8-drop,z+zz);if(i)strut(parts,rope,prev,next,.023);if(i%3===0){strut(parts,postWood,new T.Vector3(x,y-drop-.25,z+zz),new T.Vector3(x,y-drop+.84,z+zz),.045);for(const yy of [.12,.18])parts.add(rope,knot,at(x,y-drop+yy+.5,z+zz,Math.PI/2));}prev=next;}}
 knot.dispose();parts.build(root);return root;
}
export function createStage(canvas?:HTMLCanvasElement){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;
 // Filmic highlight roll-off keeps stone, leaves and sunlit water in a natural range.
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.domElement.dataset.renderer='three-webgl';
 const scene=new T.Scene();scene.background=new T.Color('#cfe9ff');scene.add(new T.HemisphereLight('#eef7ff','#a7cf6a',1.4));
 const sun=new T.DirectionalLight('#fff1d6',2.7);sun.position.set(-8,20,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-14;sun.shadow.camera.right=14;sun.shadow.camera.top=14;sun.shadow.camera.bottom=-14;sun.shadow.camera.far=90;sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;sun.shadow.radius=2;scene.add(sun,sun.target);
 const rim=new T.DirectionalLight('#d4e8ff',.45);rim.position.set(4,5,-12);scene.add(rim);return{renderer,scene,sun};
}
export function disposeStage(renderer:T.WebGLRenderer,scene:T.Scene){const textures=new Set<T.Texture>(),materials=new Set<T.Material>(),geometries=new Set<T.BufferGeometry>();scene.traverse(o=>{const m=o as T.Mesh;if(m.geometry)geometries.add(m.geometry);if(m.material)for(const mat of Array.isArray(m.material)?m.material:[m.material]){materials.add(mat);for(const val of Object.values(mat))if(val instanceof T.Texture)textures.add(val);}});textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());renderer.dispose();renderer.forceContextLoss();}
